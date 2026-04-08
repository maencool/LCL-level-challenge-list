import Storage from './storage.js';
import Auth from './auth.js';

// Main Application Logic
const App = {
    // Translation dictionary
    translations: {
        en: {
            'home': 'Home',
            'sendLevel': 'Send Level',
            'rules': 'Rules',
            'settings': 'Settings',
            'login': 'Log In',
            'register': 'Register',
            'logout': 'Log Out',
            'admin': 'Admin Panel',
            'leaderboard': 'Leaderboard',
            'submitLevel': 'Submit a Level',
            'menuTitle': 'Menu',
            'noLevels': 'No levels yet. Be the first to submit one!',
            'noImage': 'No Image'
        },
        // ... (keep your other translations)
    },

    t(key) {
        const language = Storage.getLanguage() || 'en';
        return (this.translations[language] && this.translations[language][key]) || 
               (this.translations.en && this.translations.en[key]) || key;
    },

    getYouTubeVideoId(url) {
        if (!url) return null;
        let videoId = null;
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split('?')[0];
        }
        return videoId;
    },

    getYouTubeThumbnail(youtubeUrl) {
        const videoId = this.getYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%234a90e2%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
        }
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    },

    init() {
        console.log('🚀 App.init() starting...');
        this.setupEventListeners();
        this.updateUI();
        this.loadSettings();
        this.renderLeaderboard();
        this.startAutoRefresh();
        
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshDataFromServer();
            }
        });
        console.log('✅ App.init() complete!');
    },

    refreshDataFromServer() {
        const timestamp = new Date().getTime();
        fetch(`${Storage.API_URL}?t=${timestamp}`)
            .then(res => res.json())
            .then(data => {
                Storage.cachedData = data;
                localStorage.setItem(Storage.DATA_KEY, JSON.stringify(data));
                this.renderLeaderboard();
                this.renderPendingLevels();
                this.renderManageLevels();
            })
            .catch(err => console.warn('⚠️ Could not refresh from server'));
    },

    startAutoRefresh() {
        setInterval(() => {
            this.refreshDataFromServer();
        }, 2000);
    },

    setupEventListeners() {
        const menuBtn = document.getElementById('menuBtn');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const overlay = document.getElementById('overlay');
        
        if (menuBtn) menuBtn.addEventListener('click', () => this.toggleMenu());
        if (closeMenuBtn) closeMenuBtn.addEventListener('click', () => this.toggleMenu());
        if (overlay) overlay.addEventListener('click', () => this.toggleMenu());

        document.querySelectorAll('[data-action]').forEach(element => {
            element.addEventListener('click', (e) => {
                const href = element.getAttribute('href');
                if (href && href.startsWith('http')) return;
                e.preventDefault();
                this.navigateTo(element.getAttribute('data-action'));
            });
        });

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const sendLevelForm = document.getElementById('sendLevelForm');
        
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (registerForm) registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        if (sendLevelForm) sendLevelForm.addEventListener('submit', (e) => this.handleSendLevel(e));

        const themeSelect = document.getElementById('themeSelect');
        const backgroundToggle = document.getElementById('backgroundToggle');
        
        if (themeSelect) themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));
        if (backgroundToggle) backgroundToggle.addEventListener('change', (e) => this.toggleDarkBackground(e.target.checked));

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => e.target.closest('.modal').classList.add('hidden'));
        });
    },

    toggleMenu() {
        document.getElementById('menu').classList.toggle('hidden');
        document.getElementById('overlay').classList.toggle('hidden');
    },

    navigateTo(page) {
        const menu = document.getElementById('menu');
        if (menu && !menu.classList.contains('hidden')) this.toggleMenu();

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        const pageMap = {
            'home': 'homePage', 'sendLevel': 'sendLevelPage', 'rules': 'rulesPage',
            'login': 'loginPage', 'register': 'registerPage', 'settings': 'settingsPage',
            'admin': 'adminPage', 'logout': 'logout'
        };

        if (page === 'logout') {
            this.handleLogout();
            return;
        }

        const pageId = pageMap[page];
        if (pageId) {
            document.getElementById(pageId).classList.add('active');
            if (page === 'admin') this.loadAdminPanel();
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const result = await Auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        if (result.success) {
            this.updateUI();
            this.navigateTo('home');
        } else {
            alert(result.message);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const result = await Auth.register(
            document.getElementById('registerEmail').value,
            document.getElementById('displayName').value,
            document.getElementById('registerPassword').value
        );
        if (result.success) {
            this.navigateTo('login');
        } else {
            alert(result.message);
        }
    },

    handleSendLevel(e) {
        e.preventDefault();
        if (!Auth.isLoggedIn()) {
            this.navigateTo('login');
            return;
        }
        const youtubeUrl = document.getElementById('youtubeUrl').value;
        const levelData = {
            name: document.getElementById('levelName').value,
            levelId: document.getElementById('levelId').value,
            url: youtubeUrl,
            youtubeUrl: youtubeUrl,
            thumbnail: youtubeUrl,
            difficulty: 'Unknown',
            submittedBy: Auth.currentUser.displayName
        };
        Storage.addPendingLevel(levelData, Auth.currentUser.displayName);
        alert('Level submitted!');
        this.navigateTo('home');
    },

    handleLogout() {
        Auth.logout();
        this.updateUI();
        this.navigateTo('home');
    },

    updateUI() {
        const authItems = document.getElementById('authMenuItems');
        const loggedInItems = document.getElementById('loggedInItems');
        const userDisplay = document.getElementById('userDisplayName');

        if (Auth.isLoggedIn()) {
            authItems.classList.add('hidden');
            loggedInItems.classList.remove('hidden');
            userDisplay.textContent = `👤 ${Auth.currentUser.displayName}`;
            document.querySelector('.admin-link').classList.toggle('hidden', !Auth.isAdmin());
        } else {
            authItems.classList.remove('hidden');
            loggedInItems.classList.add('hidden');
            document.querySelector('.admin-link').classList.add('hidden');
        }
    },

    renderLeaderboard() {
        const levels = Storage.getAllLevels();
        const levelsList = document.getElementById('levelsList');
        if (levels.length === 0) {
            levelsList.innerHTML = '<p class="empty-state">No levels yet.</p>';
            return;
        }
        levelsList.innerHTML = levels.map((level, index) => {
            const thumbnailUrl = level.youtubeUrl ? this.getYouTubeThumbnail(level.youtubeUrl) : (level.thumbnail || '');
            return `
            <div class="level-card" onclick="App.showLevelModal('${level.id}')">
                <div class="level-rank rank-${index + 1}">#${index + 1}</div>
                <div class="level-thumbnail"><img src="${thumbnailUrl}"></div>
                <div class="level-info">
                    <div class="level-name">${level.name}</div>
                    <div class="level-id">Level ID: ${level.levelId}</div>
                </div>
            </div>`;
        }).join('');
    },

    showLevelModal(levelId) {
        levelId = isNaN(levelId) ? levelId : parseInt(levelId);
        const level = Storage.getAllLevels().find(l => l.id === levelId);
        if (!level) return;

        document.getElementById('modalLevelName').textContent = level.name;
        document.getElementById('modalLevelId').textContent = level.levelId;
        document.getElementById('modalDifficulty').textContent = level.difficulty || 'Unknown';
        document.getElementById('modalThumbnail').src = level.youtubeUrl ? this.getYouTubeThumbnail(level.youtubeUrl) : '';
        document.getElementById('modalYoutubeLink').href = level.youtubeUrl;
        document.getElementById('levelModal').classList.remove('hidden');
    },

    loadAdminPanel() {
        if (!Auth.isAdmin()) return this.navigateTo('home');
        this.renderPendingLevels();
        this.renderManageLevels();
    },

    renderPendingLevels() {
        const pending = Storage.getPendingLevels();
        const list = document.getElementById('pendingLevelsList');
        list.innerHTML = pending.length === 0 ? '<p>No pending</p>' : pending.map(level => `
            <div class="admin-card">
                <div><strong>${level.name}</strong></div>
                <button onclick="App.approvePendingLevel('${level.id}')">Approve</button>
            </div>`).join('');
    },

    renderManageLevels() {
        const levels = Storage.getAllLevels();
        const list = document.getElementById('manageLevelsList');
        list.innerHTML = levels.length === 0 ? '<p>No levels</p>' : levels.map(level => `
            <div class="admin-card">
                <div><strong>${level.name}</strong></div>
                <button onclick="App.deleteLevel('${level.id}')">Delete</button>
            </div>`).join('');
    },

    approvePendingLevel(id) {
        if (Storage.approvePendingLevel(id)) {
            this.renderLeaderboard();
            this.renderPendingLevels();
        }
    },

    deleteLevel(id) {
        id = isNaN(id) ? id : parseInt(id);
        if (confirm('Delete level?') && Storage.deleteLevel(id)) {
            this.renderLeaderboard();
            this.renderManageLevels();
        }
    },

    changeTheme(theme) {
        Storage.setTheme(theme);
        this.applyTheme();
    },

    applyTheme() {
        const theme = Storage.getTheme();
        document.body.classList.toggle('light-theme', theme === 'light');
    },

    toggleDarkBackground(isDark) {
        Storage.setDarkBackground(isDark);
        document.body.style.backgroundColor = isDark ? '#0a0a0a' : '#1a1a1a';
    },

    loadSettings() {
        const settings = Storage.getSettings();
        if (document.getElementById('themeSelect')) document.getElementById('themeSelect').value = settings.theme;
        if (document.getElementById('backgroundToggle')) document.getElementById('backgroundToggle').checked = settings.darkBackground;
        this.applyTheme();
        this.toggleDarkBackground(settings.darkBackground);
    }
};

// Make App global so HTML onclick works
window.App = App;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

export default App;