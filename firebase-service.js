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

  // Save planogram to user-specific location
  async savePlanogram(data) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const userId = this.currentUser.uid;
      const planogramId = data.id || `planogram_${Date.now()}`;
      
      // Split data into metadata and sections
      const metadata = {
        id: planogramId,
        name: data.name || 'Untitled Planogram',
        storeName: data.storeName || 'My Store',
        lastModified: Date.now(),
        version: 2,
        fixturesCount: data.fixtures ? data.fixtures.length : 0,
        sectionsCount: data.sections ? data.sections.length : 0
      };

      // Save to user-specific path: /users/{userId}/planograms/{planogramId}
      const basePath = `users/${userId}/planograms/${planogramId}`;

      // Save metadata first
      await this.db.ref(`${basePath}/metadata`).set(metadata);

      // Save fixtures separately
      if (data.fixtures && data.fixtures.length > 0) {
        await this.db.ref(`${basePath}/fixtures`).set(data.fixtures);
      }

      // Save sections in smaller chunks to avoid payload limit
      if (data.sections && data.sections.length > 0) {
        // Save each section individually
        for (let i = 0; i < data.sections.length; i++) {
          // Clean undefined values
          const cleanSection = JSON.parse(JSON.stringify(data.sections[i], (key, value) => {
            return value === undefined ? null : value;
          }));
          await this.db.ref(`${basePath}/sections/${i}`).set(cleanSection);
        }
      }

      // Save other configuration data
      if (data.shopifyConfig) {
        await this.db.ref(`${basePath}/shopifyConfig`).set(data.shopifyConfig);
      }

      if (data.unknownProducts) {
        await this.db.ref(`${basePath}/unknownProducts`).set(data.unknownProducts);
      }
      
      console.log('Planogram saved successfully:', planogramId);
      return planogramId;
    } catch (error) {
      console.error('Save planogram error:', error);
      throw error;
    }
  },

  // Load specific planogram from user-specific location or root (temporary fix)
  async loadPlanogram(planogramId) {
    try {
      // If it's the special root planogram, load from root
      if (planogramId === 'root_planogram') {
        const rootSnapshot = await this.db.ref('/').once('value');
        if (rootSnapshot.exists()) {
          const data = rootSnapshot.val();
          // Clean up the data structure to match expected format
          return {
            id: 'root_planogram',
            name: data.storeName || 'My Store Layout',
            storeName: data.storeName || 'My Store Layout', 
            fixtures: data.fixtures || [],
            sections: data.sections || [],
            shopifyConfig: data.shopifyConfig || null,
            unknownProducts: data.unknownProducts || [],
            lastModified: Date.now()
          };
        }
        return null;
      }

      // Original per-user loading logic
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const userId = this.currentUser.uid;
      const basePath = `users/${userId}/planograms/${planogramId}`;

      // Load metadata first
      const metadataSnapshot = await this.db.ref(`${basePath}/metadata`).once('value');
      
      if (!metadataSnapshot.exists()) {
        console.warn('Planogram not found at user-specific path');
        return null;
      }
      
      const metadata = metadataSnapshot.val();
      
      // Load fixtures
      const fixturesSnapshot = await this.db.ref(`${basePath}/fixtures`).once('value');
      const fixtures = fixturesSnapshot.exists() ? fixturesSnapshot.val() : [];
      
      // Load sections individually to avoid payload limit
      const sectionsSnapshot = await this.db.ref(`${basePath}/sections`).once('value');
      const sections = [];
      
      if (sectionsSnapshot.exists()) {
        sectionsSnapshot.forEach((child) => {
          sections.push(child.val());
        });
      }
      
      // Load other config
      const shopifyConfigSnapshot = await this.db.ref(`${basePath}/shopifyConfig`).once('value');
      const shopifyConfig = shopifyConfigSnapshot.exists() ? shopifyConfigSnapshot.val() : null;
      
      const unknownProductsSnapshot = await this.db.ref(`${basePath}/unknownProducts`).once('value');
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

  // List all planograms from root level (temporary fix)
  async listPlanograms() {
    try {
      // Check if there's a planogram directly at root level
      const rootSnapshot = await this.db.ref('/').once('value');
      
      if (rootSnapshot.exists()) {
        const rootData = rootSnapshot.val();
        
        // Check if this looks like a planogram (has fixtures, sections, etc.)
        if (rootData.fixtures && rootData.sections) {
          return [{
            id: 'root_planogram',
            name: rootData.storeName || 'My Store Layout',
            lastModified: Date.now(),
            sectionsCount: rootData.sections ? rootData.sections.length : 0,
            fixturesCount: rootData.fixtures ? rootData.fixtures.length : 0
          }];
        }
      }
      
      // Fallback to user-specific location
      if (!this.isAuthenticated()) {
        return [];
      }

      const userId = this.currentUser.uid;
      const snapshot = await this.db.ref(`users/${userId}/planograms`).once('value');
      
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

  // Delete planogram from user-specific location
  async deletePlanogram(planogramId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const userId = this.currentUser.uid;
      await this.db.ref(`users/${userId}/planograms/${planogramId}`).remove();
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
