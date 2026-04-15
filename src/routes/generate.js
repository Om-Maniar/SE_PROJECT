const express = require('express');
const router = express.Router();
const { getAlgorithmList, generateCode } = require('../engines/generator');
const aiAnalyzer = require('../engines/ai-analyzer');

// GET /api/generate — list available algorithms
router.get('/', (req, res) => {
  res.json({
    algorithms: getAlgorithmList(),
    aiAvailable: aiAnalyzer.isAvailable()
  });
});

// POST /api/generate — generate code for an algorithm
router.post('/', async (req, res) => {
  try {
    const { algorithmId, language, description } = req.body;

    // AI-powered generation from free-text description
    if (description && aiAnalyzer.isAvailable()) {
      try {
        console.log('  → AI generating code for:', description);
        const result = await aiAnalyzer.generateWithAI(description, language || 'python');
        return res.json(result);
      } catch (aiErr) {
        console.error('  ⚠ AI generation failed:', aiErr.message);
        return res.status(500).json({ error: 'AI generation failed: ' + aiErr.message });
      }
    }

    // Template-based generation fallback
    if (!algorithmId || !language) {
      return res.status(400).json({ error: 'algorithmId and language are required (or description with AI enabled).' });
    }

    const result = generateCode(algorithmId, language);
    if (result.error) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
});

module.exports = router;
