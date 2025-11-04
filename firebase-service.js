// Firebase Service for Store Planner Pro
// Handles all Firebase Realtime Database operations

window.firebaseService = {
  db: null,
  auth: null,
  currentUser: null,
  autoSaveInterval: null,

  // Initialize Firebase connection
  async initialize() {
    try {
      if (!firebase.apps.length) {
        console.error('Firebase not initialized. Make sure firebase-config.js runs first.');
        return false;
      }

      this.db = firebase.database();
      this.auth = firebase.auth();
      
      console.log('Firebase service initialized');
      return true;
    } catch (error) {
      console.error('Firebase service initialization error:', error);
      return false;
    }
  },

  // Sign in anonymously
  async signInAnonymously() {
    try {
      const result = await this.auth.signInAnonymously();
      this.currentUser = result.user;
      console.log('User authenticated:', this.currentUser.uid);
      console.log('Signed in anonymously');
      return this.currentUser;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  },

  // Save planogram to GLOBAL shared location (optimized for large datasets)
  async savePlanogram(data) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const planogramId = data.id || `planogram_${Date.now()}`;
      
      // Split data into metadata and sections
      const metadata = {
        id: planogramId,
        name: data.name || 'Untitled Planogram',
        storeName: data.storeName,
        lastModified: Date.now(),
        version: 1,
        fixturesCount: data.fixtures ? data.fixtures.length : 0,
        sectionsCount: data.sections ? data.sections.length : 0
      };

      // Save metadata first
      await this.db.ref(`planograms/${planogramId}/metadata`).set(metadata);

      // Save fixtures separately
      if (data.fixtures && data.fixtures.length > 0) {
        await this.db.ref(`planograms/${planogramId}/fixtures`).set(data.fixtures);
      }

      // Save sections in smaller chunks to avoid payload limit
      if (data.sections && data.sections.length > 0) {
        // Save each section individually
        for (let i = 0; i < data.sections.length; i++) {
          const section = data.sections[i];
          await this.db.ref(`planograms/${planogramId}/sections/${i}`).set(section);
        }
      }

      // Save other configuration data
      if (data.shopifyConfig) {
        await this.db.ref(`planograms/${planogramId}/shopifyConfig`).set(data.shopifyConfig);
      }

      if (data.unknownProducts) {
        await this.db.ref(`planograms/${planogramId}/unknownProducts`).set(data.unknownProducts);
      }
      
      console.log('Planogram saved successfully:', planogramId);
      return planogramId;
    } catch (error) {
      console.error('Save planogram error:', error);
      throw error;
    }
  },

  // Load specific planogram from GLOBAL shared location (chunked loading)
  async loadPlanogram(planogramId) {
    try {
      // Load metadata first
      const metadataSnapshot = await this.db.ref(`planograms/${planogramId}/metadata`).once('value');
      
      if (!metadataSnapshot.exists()) {
        // Fallback: try old structure for backwards compatibility
        const oldSnapshot = await this.db.ref(`planograms/${planogramId}`).once('value');
        if (oldSnapshot.exists()) {
          console.warn('Loading planogram using old structure - consider re-saving');
          return oldSnapshot.val();
        }
        return null;
      }
      
      const metadata = metadataSnapshot.val();
      
      // Load fixtures
      const fixturesSnapshot = await this.db.ref(`planograms/${planogramId}/fixtures`).once('value');
      const fixtures = fixturesSnapshot.exists() ? fixturesSnapshot.val() : [];
      
      // Load sections individually to avoid payload limit
      const sectionsSnapshot = await this.db.ref(`planograms/${planogramId}/sections`).once('value');
      const sections = [];
      
      if (sectionsSnapshot.exists()) {
        sectionsSnapshot.forEach((child) => {
          sections.push(child.val());
        });
      }
      
      // Load other config
      const shopifyConfigSnapshot = await this.db.ref(`planograms/${planogramId}/shopifyConfig`).once('value');
      const shopifyConfig = shopifyConfigSnapshot.exists() ? shopifyConfigSnapshot.val() : null;
      
      const unknownProductsSnapshot = await this.db.ref(`planograms/${planogramId}/unknownProducts`).once('value');
      const unknownProducts = unknownProductsSnapshot.exists() ? unknownProductsSnapshot.val() : [];
      
      return {
        ...metadata,
        fixtures,
        sections,
        shopifyConfig,
        unknownProducts
      };
    } catch (error) {
      console.error('Load planogram error:', error);
      
      if (error.message && error.message.includes('payload')) {
        console.error('Payload too large! Data structure needs optimization.');
        alert('Your planogram data is too large. Please contact support or reduce the number of products.');
      }
      
      throw error;
    }
  },

  // List all planograms from GLOBAL shared location
  async listPlanograms() {
    try {
      const snapshot = await this.db.ref('planograms').once('value');
      
      if (!snapshot.exists()) {
        return [];
      }

      const planograms = [];
      snapshot.forEach((child) => {
        const planogramId = child.key;
        
        // Check if using new structure (has metadata child)
        if (child.hasChild('metadata')) {
          const metadata = child.child('metadata').val();
          planograms.push({
            id: planogramId,
            name: metadata.name || 'Untitled',
            lastModified: metadata.lastModified || Date.now(),
            sectionsCount: metadata.sectionsCount || 0,
            fixturesCount: metadata.fixturesCount || 0
          });
        } else {
          // Old structure - just get basic info
          const data = child.val();
          planograms.push({
            id: planogramId,
            name: data.name || 'Untitled',
            lastModified: data.lastModified || Date.now()
          });
        }
      });

      // Sort by most recent first
      planograms.sort((a, b) => b.lastModified - a.lastModified);
      
      return planograms;
    } catch (error) {
      console.error('List planograms error:', error);
      throw error;
    }
  },

  // Delete planogram from GLOBAL shared location
  async deletePlanogram(planogramId) {
    try {
      await this.db.ref(`planograms/${planogramId}`).remove();
      console.log('Planogram deleted:', planogramId);
      return true;
    } catch (error) {
      console.error('Delete planogram error:', error);
      throw error;
    }
  },

  // Auto-save functionality
  startAutoSave(saveFunction, intervalMinutes = 2) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      console.log('Auto-saving...');
      saveFunction();
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto-save enabled (every ${intervalMinutes} minutes)`);
  },

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('Auto-save disabled');
    }
  }
};

// Initialize when script loads
console.log('Firebase ready');
