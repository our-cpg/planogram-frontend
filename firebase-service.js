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

  // Save planogram to GLOBAL shared location (not per-user)
  async savePlanogram(data) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const planogramId = `planogram_${Date.now()}`;
      const planogramData = {
        ...data,
        id: planogramId,
        lastModified: Date.now(),
        version: 1
      };

      // Save to global shared location: /planograms/{planogramId}
      await this.db.ref(`planograms/${planogramId}`).set(planogramData);
      
      console.log('Planogram saved:', planogramId);
      return planogramId;
    } catch (error) {
      console.error('Save planogram error:', error);
      throw error;
    }
  },

  // Load specific planogram from GLOBAL shared location
  async loadPlanogram(planogramId) {
    try {
      const snapshot = await this.db.ref(`planograms/${planogramId}`).once('value');
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      
      return null;
    } catch (error) {
      console.error('Load planogram error:', error);
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
        const data = child.val();
        planograms.push({
          id: child.key,
          name: data.name || 'Untitled',
          lastModified: data.lastModified || Date.now()
        });
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
