// Storage Management - Server + localStorage backup
const Storage = {
    DATA_KEY: 'lcl_data',
    API_URL: '/api/data',
    cachedData: null,
    
    // Default data structure
    getDefaultData() {
        return {
            users: [],
            levels: [
                {
                    id: 1,
                    name: 'Stereo Madness',
                    levelId: 1,
                    url: 'https://example.com/level1',
                    youtubeUrl: '', // Fixed missing quote here
                    thumbnail: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%234a90e2%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2220%22%3EStereo Madness%3C/text%3E%3C/svg%3E',
                    difficulty: 'Easy',
                    submittedBy: 'Admin',
                    submittedDate: new Date().toISOString(),
                    status: 'approved'
                }
            ],
            pendingLevels: [],
            settings: {
                theme: 'dark',
                language: 'en',
                darkBackground: true
            }
        };
    },

    // Initialize - Load from server
    async init() {
        console.log('🔧 Initializing Storage system...');
        
        const timestamp = new Date().getTime();
        try {
            const res = await fetch(`${this.API_URL}?t=${timestamp}`);
            const data = await res.json();
            this.cachedData = data;
            localStorage.setItem(this.DATA_KEY, JSON.stringify(data));
            console.log('✅ Loaded data from server');
            return data;
        } catch (err) {
            console.warn('⚠️ Server unavailable, using localStorage');
            const localData = localStorage.getItem(this.DATA_KEY);
            if (localData) {
                this.cachedData = JSON.parse(localData);
                console.log('✅ Using localStorage (offline mode)');
            } else {
                this.cachedData = this.getDefaultData();
                localStorage.setItem(this.DATA_KEY, JSON.stringify(this.cachedData));
                console.log('📝 Created new localStorage data');
            }
            return this.cachedData;
        }
    },

    getData() {
        if (this.cachedData) return this.cachedData;
        const localData = localStorage.getItem(this.DATA_KEY);
        if (localData) {
            try {
                this.cachedData = JSON.parse(localData);
                return this.cachedData;
            } catch (err) {
                this.cachedData = this.getDefaultData();
                return this.cachedData;
            }
        }
        return this.getDefaultData();
    },

    saveData(data) {
        this.cachedData = data;
        localStorage.setItem(this.DATA_KEY, JSON.stringify(data));

        fetch(this.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(() => console.log('✅ Saved to server'))
        .catch(err => console.warn('⚠️ Server save failed:', err.message));
    },

    getUserByEmail(email) {
        const data = this.getData();
        if (!data.users) return null;
        return data.users.find(u => u.email === email) || null;
    },

    // ... (Keep your other helper methods like addUser, addLevel, etc. here)
};

// Initialize right away
Storage.init();

// Allow other files to use this
export default Storage;