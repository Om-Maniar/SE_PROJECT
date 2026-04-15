const express = require('express');
const router = express.Router();
const { getHistory, getSubmissionById, deleteSubmission, clearHistory } = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /api/history?sessionId=xxx
// Requires authentication - guest users cannot access history
router.get('/', requireAuth, (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.session?.userId || null;
    const history = getHistory(sessionId, userId);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history: ' + err.message });
  }
});

// GET /api/history/:id?sessionId=xxx
router.get('/:id', requireAuth, (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.session?.userId || null;
    const submission = getSubmissionById(req.params.id, sessionId, userId);
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id?sessionId=xxx
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.session?.userId || null;
    deleteSubmission(req.params.id, sessionId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history?sessionId=xxx  (clear all)
router.delete('/', requireAuth, (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.session?.userId || null;
    clearHistory(sessionId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
