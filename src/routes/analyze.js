const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { saveSubmission } = require('../db/database');
const aiAnalyzer = require('../engines/ai-analyzer');

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase().trim();
  if (value === 'cpp') return 'c++';
  return value;
}

function detectLikelyLanguage(code) {
  const text = String(code || '');
  const scores = {
    python: 0,
    javascript: 0,
    java: 0,
    'c++': 0,
    c: 0
  };

  // Python
  if (/\bdef\s+\w+\s*\(/.test(text)) scores.python += 3;
  if (/\bimport\s+\w+/.test(text)) scores.python += 1;
  if (/^\s*if\s+.*:\s*$/m.test(text)) scores.python += 1;
  if (/\bprint\s*\(/.test(text)) scores.python += 1;

  // JavaScript
  if (/\b(const|let|var)\s+\w+/.test(text)) scores.javascript += 2;
  if (/\bfunction\s+\w+\s*\(/.test(text) || /=>/.test(text)) scores.javascript += 2;
  if (/\bconsole\.log\s*\(/.test(text)) scores.javascript += 2;

  // Java
  if (/\bpublic\s+class\s+\w+/.test(text)) scores.java += 3;
  if (/\bSystem\.out\.println\s*\(/.test(text)) scores.java += 2;
  if (/^\s*import\s+java\./m.test(text)) scores.java += 2;

  // C++
  if (/#include\s*<iostream>/.test(text)) scores['c++'] += 3;
  if (/\bstd::/.test(text) || /\busing\s+namespace\s+std\b/.test(text)) scores['c++'] += 2;
  if (/\bcout\s*<</.test(text) || /\bcin\s*>>/.test(text)) scores['c++'] += 2;
  if (/#include\s*<vector>/.test(text)) scores['c++'] += 1;

  // C
  if (/#include\s*<stdio\.h>/.test(text)) scores.c += 3;
  if (/\bprintf\s*\(/.test(text) || /\bscanf\s*\(/.test(text)) scores.c += 2;
  if (/\bmalloc\s*\(/.test(text) || /\bfree\s*\(/.test(text)) scores.c += 1;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 2) return null;
  return best[0];
}

// POST /api/analyze — AI-only analysis
router.post('/', async (req, res) => {
  try {
    const { code, language, sessionId } = req.body;
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required.' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }
    if (code.length > 50000) {
      return res.status(400).json({ error: 'Code exceeds maximum length (50,000 chars).' });
    }

    // Enforce selected language so users don't accidentally analyze under the wrong language.
    const detectedLanguage = detectLikelyLanguage(code);
    if (detectedLanguage && normalizeLanguage(detectedLanguage) !== normalizeLanguage(language)) {
      return res.status(400).json({
        error: `Language mismatch: selected "${language}", but code looks like "${detectedLanguage}". Please switch language and re-run.`,
        languageMismatch: true,
        selectedLanguage: language,
        detectedLanguage
      });
    }

    // Require AI
    if (!aiAnalyzer.isAvailable()) {
      return res.status(400).json({
        error: 'API key not configured. Click the ⚙️ icon to add your free Google Gemini API key.',
        needsApiKey: true
      });
    }

    const startTime = Date.now();

    console.log('  → Analyzing with Gemini AI...');
    const aiResult = await aiAnalyzer.analyzeWithAI(code, language);
    const analysisTime = Date.now() - startTime;
    console.log(`  ✓ AI analysis completed in ${analysisTime}ms`);

    const result = {
      id: uuidv4(),
      language,
      selectedLanguage: language,
      detectedLanguage: language,
      languageMismatch: false,
      complexity: aiResult.complexity,
      deadCode: aiResult.deadCode,
      optimization: aiResult.optimization,
      rating: aiResult.rating,
      analysisTime: `${analysisTime}ms`,
      timestamp: new Date().toISOString(),
      engine: aiAnalyzer.getProviderName()
    };

    // Save to history
    try {
      saveSubmission({
        id: result.id,
        session_id: sessionId,
        user_id: req.session?.userId || null,
        code: code,
        language: result.language,
        original_code: code,
        optimized_code: aiResult.optimization?.optimizedCode || aiResult.deadCode?.cleanedCode || code,
        time_complexity: result.complexity?.timeComplexity || '',
        space_complexity: result.complexity?.spaceComplexity || '',
        dead_code_items: result.deadCode?.issues || [],
        optimization_suggestions: result.optimization?.suggestions || [],
        efficiency_rating: result.rating?.overall || 0,
        rating_breakdown: result.rating?.breakdown || {}
      });
    } catch (dbErr) {
      console.error('DB save error:', dbErr.message);
    }

    res.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

module.exports = router;
