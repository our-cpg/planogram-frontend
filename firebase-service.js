// Firebase Data Service for Store Planner Pro
// Handles all data persistence, auto-save, and synchronization

class StorePlannerFirebaseService {
  constructor() {
    this.db = null;
    this.auth = null;
    this.userId = null;
    this.autoSaveInterval = null;
    this.isInitialized = false;
    this.pendingSave = false;
  }

  // Initialize Firebase connection
  async initialize() {
    try {
      const { db, auth } = window.FirebaseConfig.initialize();
      this.db = db;
      this.auth = auth;
      
      // Set up authentication state listener
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          this.userId = user.uid;
          console.log('User authenticated:', user.email);
          this.loadAllData();
        } else {
          this.userId = null;
          console.log('User not authenticated');
        }
      });
      
      this.isInitialized = true;
      console.log('Firebase service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase service:', error);
      return false;
    }
  }

  // Anonymous authentication for quick start
  async signInAnonymously() {
    try {
      const userCredential = await this.auth.signInAnonymously();
      this.userId = userCredential.user.uid;
      console.log('Signed in anonymously');
      return true;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      return false;
    }
  }

  // Email/password authentication
  async signInWithEmail(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      this.userId = userCredential.user.uid;
      console.log('Signed in with email:', email);
      return true;
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    }
  }

  async createAccount(email, password) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      this.userId = userCredential.user.uid;
      console.log('Account created:', email);
      return true;
    } catch (error) {
      console.error('Account creation failed:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      this.userId = null;
      this.stopAutoSave();
      console.log('Signed out');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.userId !== null;
  }

  // Get database reference for user's data
  getUserRef(path = '') {
    if (!this.userId) {
      throw new Error('User not authenticated');
    }
    return this.db.ref(`users/${this.userId}/${path}`);
  }

  // ============= PLANOGRAM OPERATIONS =============

  // Save complete planogram
  async savePlanogram(planogramData) {
    if (!this.isAuthenticated()) {
      console.error('Cannot save: User not authenticated');
      return false;
    }

    try {
      const planogramId = planogramData.id || `planogram_${Date.now()}`;
      const dataToSave = {
        ...planogramData,
        id: planogramId,
        lastModified: firebase.database.ServerValue.TIMESTAMP,
        version: planogramData.version || 1
      };

      await this.getUserRef(`planograms/${planogramId}`).set(dataToSave);
      console.log('Planogram saved:', planogramId);
      return planogramId;
    } catch (error) {
      console.error('Failed to save planogram:', error);
      return false;
    }
  }

  // Load specific planogram
  async loadPlanogram(planogramId) {
    if (!this.isAuthenticated()) {
      console.error('Cannot load: User not authenticated');
      return null;
    }

    try {
      const snapshot = await this.getUserRef(`planograms/${planogramId}`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Failed to load planogram:', error);
      return null;
    }
  }

  // List all planograms
  async listPlanograms() {
    if (!this.isAuthenticated()) {
      console.error('Cannot list: User not authenticated');
      return [];
    }

    try {
      const snapshot = await this.getUserRef('planograms').once('value');
      const planograms = [];
      snapshot.forEach((child) => {
        planograms.push({
          id: child.key,
          ...child.val()
        });
      });
      return planograms;
    } catch (error) {
      console.error('Failed to list planograms:', error);
      return [];
    }
  }

  // Delete planogram
  async deletePlanogram(planogramId) {
    if (!this.isAuthenticated()) {
      console.error('Cannot delete: User not authenticated');
      return false;
    }

    try {
      await this.getUserRef(`planograms/${planogramId}`).remove();
      console.log('Planogram deleted:', planogramId);
      return true;
    } catch (error) {
      console.error('Failed to delete planogram:', error);
      return false;
    }
  }

  // ============= FIXTURE LIBRARY OPERATIONS =============

  async saveFixture(fixtureData) {
    if (!this.isAuthenticated()) return false;

    try {
      const fixtureId = fixtureData.id || `fixture_${Date.now()}`;
      const dataToSave = {
        ...fixtureData,
        id: fixtureId,
        lastModified: firebase.database.ServerValue.TIMESTAMP
      };

      await this.getUserRef(`fixtures/${fixtureId}`).set(dataToSave);
      console.log('Fixture saved:', fixtureId);
      return fixtureId;
    } catch (error) {
      console.error('Failed to save fixture:', error);
      return false;
    }
  }

  async loadFixtures() {
    if (!this.isAuthenticated()) return [];

    try {
      const snapshot = await this.getUserRef('fixtures').once('value');
      const fixtures = [];
      snapshot.forEach((child) => {
        fixtures.push({
          id: child.key,
          ...child.val()
        });
      });
      return fixtures;
    } catch (error) {
      console.error('Failed to load fixtures:', error);
      return [];
    }
  }

  async deleteFixture(fixtureId) {
    if (!this.isAuthenticated()) return false;

    try {
      await this.getUserRef(`fixtures/${fixtureId}`).remove();
      console.log('Fixture deleted:', fixtureId);
      return true;
    } catch (error) {
      console.error('Failed to delete fixture:', error);
      return false;
    }
  }

  // ============= PRODUCT DATA OPERATIONS =============

  async saveProductCache(products) {
    if (!this.isAuthenticated()) return false;

    try {
      await this.getUserRef('productCache').set({
        products: products,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP,
        count: products.length
      });
      console.log('Product cache saved:', products.length, 'products');
      return true;
    } catch (error) {
      console.error('Failed to save product cache:', error);
      return false;
    }
  }

  async loadProductCache() {
    if (!this.isAuthenticated()) return null;

    try {
      const snapshot = await this.getUserRef('productCache').once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Failed to load product cache:', error);
      return null;
    }
  }

  // ============= STORE SETTINGS =============

  async saveStoreSettings(settings) {
    if (!this.isAuthenticated()) return false;

    try {
      await this.getUserRef('storeSettings').set({
        ...settings,
        lastModified: firebase.database.ServerValue.TIMESTAMP
      });
      console.log('Store settings saved');
      return true;
    } catch (error) {
      console.error('Failed to save store settings:', error);
      return false;
    }
  }

  async loadStoreSettings() {
    if (!this.isAuthenticated()) return null;

    try {
      const snapshot = await this.getUserRef('storeSettings').once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Failed to load store settings:', error);
      return null;
    }
  }

  // ============= AUTO-SAVE FUNCTIONALITY =============

  startAutoSave(saveCallback, intervalMinutes = 2) {
    this.stopAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(() => {
      if (this.isAuthenticated() && typeof saveCallback === 'function') {
        console.log('Auto-saving...');
        saveCallback();
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`Auto-save enabled (every ${intervalMinutes} minutes)`);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('Auto-save disabled');
    }
  }

  // ============= BACKUP & EXPORT =============

  async exportAllData() {
    if (!this.isAuthenticated()) return null;

    try {
      const snapshot = await this.getUserRef().once('value');
      const allData = snapshot.val();
      return {
        exportDate: new Date().toISOString(),
        userId: this.userId,
        data: allData
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  async importData(importedData) {
    if (!this.isAuthenticated()) return false;

    try {
      if (importedData.data) {
        await this.getUserRef().set(importedData.data);
        console.log('Data imported successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Download backup as JSON file
  async downloadBackup() {
    const data = await this.exportAllData();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============= LOAD ALL DATA =============

  async loadAllData() {
    if (!this.isAuthenticated()) {
      console.error('Cannot load: User not authenticated');
      return null;
    }

    try {
      const [planograms, fixtures, productCache, settings] = await Promise.all([
        this.listPlanograms(),
        this.loadFixtures(),
        this.loadProductCache(),
        this.loadStoreSettings()
      ]);

      return {
        planograms,
        fixtures,
        productCache,
        settings
      };
    } catch (error) {
      console.error('Failed to load all data:', error);
      return null;
    }
  }

  // ============= REAL-TIME SYNC (Optional) =============

  listenToPlanogramChanges(planogramId, callback) {
    if (!this.isAuthenticated()) return null;

    const ref = this.getUserRef(`planograms/${planogramId}`);
    ref.on('value', (snapshot) => {
      callback(snapshot.val());
    });

    // Return function to stop listening
    return () => ref.off('value');
  }
}

// Create global instance
window.firebaseService = new StorePlannerFirebaseService();
