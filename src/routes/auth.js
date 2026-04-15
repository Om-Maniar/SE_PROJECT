const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { createUser, getUserByEmail, migrateGuestSubmissions } = require('../db/database');

// POST /api/auth/signup — create account
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    // Check if email already exists
    const existing = getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Try logging in.' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    createUser({
      id: userId,
      email,
      name,
      passwordHash,
      avatar: null
    });

    // Migrate guest submissions
    const { sessionId } = req.body;
    if (sessionId) {
      migrateGuestSubmissions(sessionId, userId);
    }

    // Set session
    req.session.userId = userId;
    req.session.user = { id: userId, email, name, avatar: null };

    res.json({
      success: true,
      user: { id: userId, email, name, avatar: null }
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Signup failed: ' + err.message });
  }
});

// POST /api/auth/login — login with email/password
router.post('/login', async (req, res) => {
  try {
    const { email, password, sessionId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Migrate guest submissions
    if (sessionId) {
      migrateGuestSubmissions(sessionId, user.id);
    }

    // Set session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me — get current user info
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false, user: null });
  }
});

// POST /api/auth/logout — destroy session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
