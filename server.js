// Node.js server with Supabase backend (ES Module Version)
import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'default-secret-change-me';
const PORT = process.env.PORT || 3000;

console.log('📦 Server starting...');
console.log('🔌 PORT:', PORT);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client initialized');
} else {
    console.warn('⚠️  Supabase credentials missing - database features disabled');
}

// Initialize Supabase tables
async function initializeDatabase() {
    try {
        if (!supabase) return;
        const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
        if (usersError) {
            console.log('📝 Database tables may not exist yet. Run SUPABASE_SETUP.sql');
            return;
        }
        console.log('✅ Database tables ready');
    } catch (error) {
        console.error('⚠️  Database initialization warning:', error.message);
    }
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Admin authentication check
function isAdminAuthorized(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    return authHeader.slice(7) === ADMIN_SECRET;
}

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get(['/api/data', '/api/public-data'], async (req, res) => {
    try {
        if (!supabase) return res.status(503).json({ error: 'Database not configured' });
        const [users, levels, pending, settings] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('levels').select('*').eq('status', 'approved').order('id'),
            supabase.from('levels').select('*').eq('status', 'pending').order('submitted_date'),
            supabase.from('settings').select('*').limit(1).single()
        ]);
        res.json({
            users: users.data || [],
            levels: levels.data || [],
            pendingLevels: pending.data || [],
            settings: settings.data || { theme: 'dark' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

initializeDatabase();