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
      
      // CRITICAL: Preserve all metadata fields
      const planogramData = {
        id: planogramId,
        name: data.name || 'Untitled Planogram',
        storeName: data.storeName || 'My Store',
        lastModified: Date.now(),
        version: 2,
        fixturesCount: data.fixtures ? data.fixtures.length : 0,
        sectionsCount: data.sections ? data.sections.length : 0,
        
        // PRESERVE SECTION VERSION MARKERS
        isSectionVersion: data.isSectionVersion || false,
        isSavedLayout: data.isSavedLayout || false,
        sectionName: data.sectionName || null,
        versionName: data.versionName || null,
        timestamp: data.timestamp || new Date().toISOString(),
        
        // Include actual data
        fixtures: data.fixtures || [],
        sections: data.sections || [],
        metadata: data.metadata || {},
        shopifyConfig: data.shopifyConfig || null,
        unknownProducts: data.unknownProducts || []
      };

      // Save to /users/{userId}/planograms/{planogramId}
      const basePath = `users/${userId}/planograms/${planogramId}`;
      
      await this.db.ref(basePath).set(planogramData);
      
      console.log('Planogram saved successfully:', planogramId);
      return planogramId;
    } catch (error) {
      console.error('Save planogram error:', error);
      throw error;
    }
  },

  // Load specific planogram
  async loadPlanogram(planogramId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const userId = this.currentUser.uid;
      const basePath = `users/${userId}/planograms/${planogramId}`;

      const snapshot = await this.db.ref(basePath).once('value');
      
      if (!snapshot.exists()) {
        console.warn('Planogram not found:', planogramId);
        return null;
      }
      
      const data = snapshot.val();
      
      return {
        id: planogramId,
        ...data
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

  // List all planograms from user-specific location
  async listPlanograms() {
    try {
      if (!this.isAuthenticated()) {
        console.warn('Not authenticated, returning empty list');
        return [];
      }

      const userId = this.currentUser.uid;
      console.log('🔍 Listing planograms for user:', userId);
      
      // Query the /users/{userId}/planograms/ path
      const planogramsSnapshot = await this.db.ref(`users/${userId}/planograms`).once('value');
      
      if (!planogramsSnapshot.exists()) {
        console.log('📂 No planograms found in /users/' + userId + '/planograms/');
        return [];
      }

      const planograms = [];
      const planogramsData = planogramsSnapshot.val();
      
      // Convert object to array
      Object.entries(planogramsData).forEach(([id, data]) => {
        planograms.push({
          id: id,
          name: data.name || 'Untitled',
          storeName: data.storeName || 'My Store',
          lastModified: data.lastModified || Date.now(),
          sectionsCount: data.sectionsCount || (data.sections ? data.sections.length : 0),
          fixturesCount: data.fixturesCount || (data.fixtures ? data.fixtures.length : 0),
          timestamp: data.timestamp || null,
          isSectionVersion: data.isSectionVersion || false,
          isSavedLayout: data.isSavedLayout || false,
          sectionName: data.sectionName || null,
          versionName: data.versionName || null,
          metadata: data.metadata || {}
        });
      });

      // Sort by most recent first
      planograms.sort((a, b) => {
        const timeA = a.lastModified || 0;
        const timeB = b.lastModified || 0;
        return timeB - timeA;
      });
      
      console.log(`📂 Found ${planograms.length} planograms`);
      return planograms;
    } catch (error) {
      console.error('List planograms error:', error);
      throw error;
    }
  },

  // Delete planogram
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
