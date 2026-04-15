/**
 * CodeLens — AI-Powered Code Analyzer
 * Uses Groq API (free, open-source Llama models) for code analysis.
 * Also supports Google Gemini as an alternative.
 */
const Groq = require('groq-sdk');

let groqClient = null;
let currentProvider = null; // 'groq' or 'gemini'
let geminiGenAI = null;

function initGroq(apiKey) {
  if (!apiKey) return false;
  try {
    groqClient = new Groq({ apiKey });
    currentProvider = 'groq';
    console.log('  ✓ Groq AI initialized (Llama 3)');
    return true;
  } catch (err) {
    console.error('  ✗ Groq init failed:', err.message);
    groqClient = null;
    return false;
  }
}

function initGemini(apiKey) {
  if (!apiKey) return false;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    geminiGenAI = new GoogleGenerativeAI(apiKey);
    currentProvider = 'gemini';
    console.log('  ✓ Gemini AI initialized');
    return true;
  } catch (err) {
    console.error('  ✗ Gemini init failed:', err.message);
    geminiGenAI = null;
    return false;
  }
}

function initAI(apiKey, provider) {
  if (provider === 'gemini') return initGemini(apiKey);
  return initGroq(apiKey); // default to Groq
}

function isAvailable() {
  return groqClient !== null || geminiGenAI !== null;
}

function getProviderName() {
  if (currentProvider === 'gemini') return 'Google Gemini';
  if (currentProvider === 'groq') return 'Groq (Llama 3)';
  return 'None';
}

// ── Core API call with retries ──
async function callAI(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (currentProvider === 'groq' && groqClient) {
        const completion = await groqClient.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a code analysis expert. Always respond with valid JSON only, no markdown fences or extra text.' },
            { role: 'user', content: prompt }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        });
        return completion.choices[0]?.message?.content || '';
      }

      if (currentProvider === 'gemini' && geminiGenAI) {
        const model = geminiGenAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      }

      throw new Error('No AI provider configured');
    } catch (err) {
      const isRateLimit = err.message && (
        err.message.includes('429') ||
        err.message.includes('Too Many Requests') ||
        err.message.includes('rate_limit') ||
        err.message.includes('RESOURCE_EXHAUSTED')
      );

      if (isRateLimit && attempt < retries) {
        const waitMs = 3000 * (attempt + 1);
        console.log(`  ⏳ Rate limited — waiting ${waitMs / 1000}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (isRateLimit) {
        throw new Error('Rate limit reached. Please wait a minute and try again.');
      }
      throw err;
    }
  }
}

async function analyzeWithAI(code, language) {
  if (!isAvailable()) throw new Error('AI not initialized');

  const prompt = `Analyze the following code. The user claims the language is "${language}".

IMPORTANT STEP 1 — LANGUAGE DETECTION:
First, detect the ACTUAL programming language of the code. Compare it with the claimed language "${language}".
- If the actual language does NOT match "${language}", set "detectedLanguage" to the actual language and "languageMismatch" to true.
- If the languages match, set "detectedLanguage" to "${language}" and "languageMismatch" to false.
- ALWAYS analyze the code in its ACTUAL language, not the claimed one.

IMPORTANT STEP 2 — OPTIMIZED CODE:
For "optimizedCode", you MUST provide a FULLY REWRITTEN, WORKING, OPTIMIZED version of the code. 
DO NOT just add comments to the original code. Actually apply the optimizations:
- Replace inefficient algorithms (e.g., bubble sort → merge sort)
- Use better data structures (e.g., list → set for lookups)
- Remove redundant code and dead code
- Apply language-specific best practices
- The optimized code must be COMPILABLE/RUNNABLE and produce the correct output
- If the code is already optimal, return it as-is with minor style improvements

Return a JSON response with EXACTLY this structure:

{
  "detectedLanguage": "the actual language of the code",
  "languageMismatch": true/false,
  "complexity": {
    "timeComplexity": "O(...)",
    "timeLabel": "e.g. Linear, Quadratic, Logarithmic, etc.",
    "timeExplanation": "Brief explanation of why this time complexity",
    "spaceComplexity": "O(...)",
    "spaceLabel": "e.g. Constant, Linear, etc.",
    "spaceExplanation": "Brief explanation of why this space complexity",
    "details": [
      {"label": "Total Lines", "value": <number>},
      {"label": "Loops", "value": <number>},
      {"label": "Functions", "value": <number>},
      {"label": "Conditionals", "value": <number>}
    ]
  },
  "deadCode": {
    "issues": [
      {
        "type": "unused-variable|unreachable-code|unused-import|empty-block|redundant-condition",
        "severity": "error|warning|info",
        "line": <line_number>,
        "message": "description of the issue",
        "suggestion": "how to fix it",
        "lineContent": "the actual line of code"
      }
    ],
    "issueCount": <number>,
    "cleanedCode": "the code with dead code removed",
    "deadCodePercentage": <number>
  },
  "optimization": {
    "suggestions": [
      {
        "type": "performance|readability|data-structure|algorithm",
        "severity": "performance|optimization|readability|cleanup",
        "line": <line_number>,
        "message": "what the issue is",
        "suggestion": "how to optimize",
        "lineContent": "the actual line of code"
      }
    ],
    "count": <number>,
    "optimizedCode": "FULLY REWRITTEN optimized version of the code with ALL improvements applied. Must be working code, NOT just comments."
  },
  "rating": {
    "overall": <number 0-10>,
    "breakdown": {
      "complexity": {"score": <number 0-10>, "label": "description", "detail": "explanation", "weight": "35%"},
      "deadCode": {"score": <number 0-10>, "label": "description", "detail": "explanation", "weight": "20%"},
      "optimization": {"score": <number 0-10>, "label": "description", "detail": "explanation", "weight": "25%"},
      "style": {"score": <number 0-10>, "label": "description", "detail": "explanation", "weight": "20%"}
    },
    "grade": "A+|A|B+|B|C|D|F",
    "feedback": "Overall feedback message"
  }
}

Rules:
- Be accurate with complexity. Binary search = O(log n), Bubble sort = O(n²), Merge sort = O(n log n), DFS/BFS = O(V+E)
- Report genuine dead code only (unused vars, unreachable code, unused imports)
- The optimizedCode MUST be actual working code with optimizations applied, NOT the original code with comments
- Rate fairly on 0-10 scale
- cleanedCode = code with dead code removed
- Return ONLY valid JSON

Code:
\`\`\`${language}
${code}
\`\`\``;

  let text = await callAI(prompt);

  // Strip markdown fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const parsed = JSON.parse(text);

  if (!parsed.complexity || !parsed.deadCode || !parsed.optimization || !parsed.rating) {
    throw new Error('Incomplete AI response');
  }

  return parsed;
}

async function generateWithAI(description, language) {
  if (!isAvailable()) throw new Error('AI not initialized');

  const prompt = `Generate clean, well-commented ${language} code for: ${description}

Requirements:
- Write clean, idiomatic ${language} code
- Add comments explaining the logic
- Include example usage
- Return ONLY the code, no explanations, no markdown fences, no JSON wrapping`;

  let text = await callAI(prompt);

  // Strip markdown code fences
  text = text.replace(/^```(?:\w+)?\s*\n?/i, '').replace(/\n?\s*```$/i, '').trim();

  return {
    code: text,
    language: language,
    name: description,
    category: 'AI Generated',
    description: `Generated from: "${description}"`
  };
}

module.exports = { initAI, initGroq, initGemini, isAvailable, getProviderName, analyzeWithAI, generateWithAI };
