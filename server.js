const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');

// Import routes
const analyzeRoutes = require('./src/routes/analyze');
const generateRoutes = require('./src/routes/generate');
const historyRoutes = require('./src/routes/history');
const authRoutes = require('./src/routes/auth');

// Import database initialization
const { initDB } = require('./src/db/database');

// Import AI analyzer
const aiAnalyzer = require('./src/engines/ai-analyzer');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Initialize database
initDB();

// Initialize AI if API key is in environment
if (process.env.GROQ_API_KEY) {
  aiAnalyzer.initGroq(process.env.GROQ_API_KEY);
} else if (process.env.GEMINI_API_KEY) {
  aiAnalyzer.initGemini(process.env.GEMINI_API_KEY);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://accounts.google.com",
        "https://apis.google.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://accounts.google.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
      frameSrc: ["https://accounts.google.com"],
      workerSrc: ["'self'", "blob:"],
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'codelens-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true with HTTPS in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ── Google Client ID endpoint ──
app.get('/api/config/google-client-id', (req, res) => {
  res.json({ clientId: GOOGLE_CLIENT_ID });
});

// ── API Key configuration endpoint ──
app.post('/api/config/apikey', (req, res) => {
  const { apiKey, provider } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required.' });
  }
  const success = aiAnalyzer.initAI(apiKey, provider || 'groq');
  if (success) {
    res.json({ success: true, message: `${aiAnalyzer.getProviderName()} activated!` });
  } else {
    res.status(400).json({ error: 'Failed to initialize AI with that API key.' });
  }
});

app.get('/api/config/status', (req, res) => {
  res.json({
    aiEnabled: aiAnalyzer.isAvailable(),
    engine: aiAnalyzer.getProviderName()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/history', historyRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   🔍 CodeLens Server Running         ║`);
  console.log(`  ║   http://localhost:${PORT}              ║`);
  console.log(`  ║   AI: ${aiAnalyzer.isAvailable() ? '✅ ' + aiAnalyzer.getProviderName() : '⚠️  Set API key in UI'}       ║`);
  console.log(`  ║   Auth: ${GOOGLE_CLIENT_ID ? '✅ Google OAuth' : '⚠️  Set GOOGLE_CLIENT_ID'}   ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
