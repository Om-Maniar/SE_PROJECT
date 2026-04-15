/**
 * CodeLens — Main Application Controller
 */
(function () {
  'use strict';

  const state = {
    sessionId: localStorage.getItem('codelens_session') || generateId(),
    currentTab: 'editor',
    editor: null,
    lastAnalysis: null,
    algorithms: [],
    selectedAlgorithm: null,
    generatedCode: '',
    aiEnabled: false,
    user: null,
    googleClientId: null
  };
  localStorage.setItem('codelens_session', state.sessionId);

  document.addEventListener('DOMContentLoaded', async () => {
    initMonaco();
    initTabs();
    initButtons();
    loadAlgorithms();
    checkAIStatus();
    await initAuth();

    const savedKey = localStorage.getItem('codelens_api_key');
    const savedProvider = localStorage.getItem('codelens_provider');
    if (savedKey) activateAI(savedKey, savedProvider || 'groq', true);

    // Ask mode on first load for unauthenticated users.
    if (!state.user) {
      showEntryChoiceModal();
    }
  });

  // ── Monaco Editor Setup ──
  function initMonaco() {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('codelens-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
          { token: 'comment', foreground: '5a6577', fontStyle: 'italic' },
          { token: 'keyword', foreground: '22d3ee' },
          { token: 'string', foreground: '34d399' },
          { token: 'number', foreground: 'fbbf24' },
          { token: 'type', foreground: '8b5cf6' },
        ],
        colors: {
          'editor.background': '#080b11',
          'editor.foreground': '#e6edf3',
          'editorLineNumber.foreground': '#2a3040',
          'editorLineNumber.activeForeground': '#22d3ee',
          'editor.selectionBackground': '#1e3a5f',
          'editor.lineHighlightBackground': '#0c1018',
          'editorCursor.foreground': '#22d3ee',
        }
      });

      state.editor = monaco.editor.create(document.getElementById('editor-wrapper'), {
        value: getSampleCode('python'), language: 'python', theme: 'codelens-dark',
        fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontLigatures: true,
        minimap: { enabled: false }, padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false, renderLineHighlight: 'line', smoothScrolling: true,
        cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true }, automaticLayout: true,
        tabSize: 4, wordWrap: 'on', lineNumbers: 'on', roundedSelection: true,
        scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 }
      });

      document.getElementById('language-select').addEventListener('change', function () {
        const lang = this.value;
        monaco.editor.setModelLanguage(state.editor.getModel(), lang === 'c++' ? 'cpp' : lang);
        updateFilename(lang);
      });
    });
  }

  function updateFilename(lang) {
    const exts = { python: 'main.py', javascript: 'main.js', java: 'Main.java', 'c++': 'main.cpp', c: 'main.c' };
    document.getElementById('editor-filename').textContent = exts[lang] || 'main.txt';
  }

  // ── Auth ──
  let authMode = 'login'; // 'login' or 'signup'

  async function initAuth() {
    // Check current session
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        state.user = data.user;
        updateAuthUI();
      }
    } catch (e) {}
  }

  function updateAuthUI() {
    const guest = document.getElementById('user-menu-guest');
    const auth = document.getElementById('user-menu-auth');
    const historyAuth = document.getElementById('history-auth-required');
    const historyContent = document.getElementById('history-content');

    if (state.user) {
      guest.style.display = 'none';
      auth.style.display = 'flex';
      auth.classList.remove('hidden');
      document.getElementById('user-display-name').textContent = state.user.name;
      const avatar = document.getElementById('user-avatar');
      if (state.user.avatar) { avatar.src = state.user.avatar; avatar.style.display = 'block'; }
      else { avatar.style.display = 'none'; }
      historyAuth.style.display = 'none';
      historyContent.style.display = 'block';
      historyContent.classList.remove('hidden');
    } else {
      guest.style.display = 'block';
      auth.style.display = 'none';
      historyAuth.style.display = 'flex';
      historyContent.style.display = 'none';
    }
  }

  function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
    setAuthMode('login');
  }

  function showEntryChoiceModal() {
    const modal = document.getElementById('login-modal');
    const title = document.getElementById('login-modal-title');
    const subtitle = document.getElementById('login-modal-subtitle');
    title.textContent = 'Choose How To Continue';
    subtitle.textContent = 'Sign in for saved history, or continue as guest for quick use.';
    modal.classList.remove('hidden');
    setAuthMode('login');
  }

  function continueAsGuest() {
    document.getElementById('login-modal').classList.add('hidden');
    showToast('Using guest mode. Sign in anytime to save history.', 'info');
  }

  function setAuthMode(mode) {
    authMode = mode;
    const nameField = document.getElementById('auth-name-field');
    const title = document.getElementById('login-modal-title');
    const subtitle = document.getElementById('login-modal-subtitle');
    const btn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (mode === 'signup') {
      nameField.classList.remove('hidden');
      title.textContent = 'Create Account';
      subtitle.textContent = 'Sign up to save your analysis history';
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Sign In';
    } else {
      nameField.classList.add('hidden');
      title.textContent = 'Welcome Back';
      subtitle.textContent = 'Sign in to access your analysis history';
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign Up';
    }
    document.getElementById('auth-error').classList.add('hidden');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit-btn');

    if (!email || !password) { errorEl.textContent = 'Please fill in all fields.'; errorEl.classList.remove('hidden'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';

    try {
      const url = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body = { email, password, sessionId: state.sessionId };
      if (authMode === 'signup') body.name = document.getElementById('auth-name').value.trim() || email.split('@')[0];

      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (data.success) {
        state.user = data.user;
        updateAuthUI();
        document.getElementById('login-modal').classList.add('hidden');
        showToast('Welcome, ' + data.user.name + '! 🎉', 'success');
        if (state.currentTab === 'history') loadHistory();
        // Clear form
        document.getElementById('auth-form').reset();
      } else {
        errorEl.textContent = data.error || 'Authentication failed';
        errorEl.classList.remove('hidden');
      }
    } catch (err) {
      errorEl.textContent = 'Connection error. Is the server running?';
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.innerHTML = authMode === 'signup'
        ? '<i class="fa-solid fa-user-plus"></i> Create Account'
        : '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    }
  }

  // ── Tab Navigation ──
  function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const panel = tab.dataset.tab;
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + panel).classList.add('active');
        state.currentTab = panel;
        if (panel === 'history' && state.user) loadHistory();
      });
    });
  }

  // ── Button Handlers ──
  function initButtons() {
    document.getElementById('btn-analyze').addEventListener('click', analyzeCode);
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (!state.editor) return;
      const current = state.editor.getValue();
      if (!current.trim() || confirm('Clear the editor?')) {
        state.editor.setValue('');
      }
    });
    document.getElementById('btn-copy-generated').addEventListener('click', () => {
      if (state.generatedCode) { navigator.clipboard.writeText(state.generatedCode); showToast('Copied!', 'success'); }
    });
    document.getElementById('btn-analyze-generated').addEventListener('click', () => {
      if (state.generatedCode) { state.editor.setValue(state.generatedCode); document.querySelector('.nav-tab[data-tab="editor"]').click(); setTimeout(analyzeCode, 300); }
    });
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
    document.getElementById('btn-settings').addEventListener('click', toggleSettingsModal);
    document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
    document.getElementById('btn-close-settings').addEventListener('click', () => document.getElementById('settings-modal').classList.add('hidden'));
    document.getElementById('ai-provider-select').addEventListener('change', updateProviderHints);
    document.getElementById('btn-ai-generate').addEventListener('click', aiGenerate);

    // Auth buttons
    document.getElementById('btn-show-login').addEventListener('click', showLoginModal);
    document.getElementById('login-close').addEventListener('click', continueAsGuest);
    document.getElementById('login-skip-link').addEventListener('click', continueAsGuest);
    document.getElementById('btn-history-login').addEventListener('click', showLoginModal);
    document.getElementById('btn-logout').addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        state.user = null;
        updateAuthUI();
        showToast('Logged out', 'info');
      } catch (e) { showToast('Logout failed', 'error'); }
    });

    // Auth form
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('auth-toggle-link').addEventListener('click', () => {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
    });

    // Use optimized code
    document.getElementById('btn-use-optimized').addEventListener('click', () => {
      if (state.lastAnalysis) {
        const opt = state.lastAnalysis.optimization?.optimizedCode || state.lastAnalysis.deadCode?.cleanedCode;
        if (opt && state.editor) { state.editor.setValue(opt); document.querySelector('.nav-tab[data-tab="editor"]').click(); showToast('Optimized code loaded into editor!', 'success'); }
      }
    });
    document.getElementById('btn-copy-optimized').addEventListener('click', () => {
      if (state.lastAnalysis) {
        const opt = state.lastAnalysis.optimization?.optimizedCode || state.lastAnalysis.deadCode?.cleanedCode;
        if (opt) { navigator.clipboard.writeText(opt); showToast('Optimized code copied!', 'success'); }
      }
    });

    // Language fix button
    document.getElementById('btn-fix-language').addEventListener('click', () => {
      if (state.lastAnalysis?.detectedLanguage) {
        const det = state.lastAnalysis.detectedLanguage.toLowerCase();
        const sel = document.getElementById('language-select');
        const match = Array.from(sel.options).find(o => o.value.toLowerCase() === det || o.value === det);
        if (match) { sel.value = match.value; updateFilename(match.value); monaco.editor.setModelLanguage(state.editor.getModel(), match.value === 'c++' ? 'cpp' : match.value); }
        document.getElementById('language-warning').classList.add('hidden');
        showToast('Language updated! Re-analyze for accurate results.', 'info');
      }
    });

    // Keyboard shortcut: Ctrl/Cmd + Enter to analyze.
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        analyzeCode();
      }
    });
  }

  // ── AI Status ──
  async function checkAIStatus() {
    try {
      const res = await fetch('/api/config/status');
      const data = await res.json();
      state.aiEnabled = data.aiEnabled;
      updateAIBadge();
    } catch (err) {}
  }

  function updateAIBadge() {
    const badge = document.getElementById('ai-status-badge');
    if (state.aiEnabled) {
      badge.className = 'ai-badge active';
      badge.innerHTML = '<i class="fa-solid fa-brain"></i> AI Active';
      badge.title = 'AI is powering your analysis';
    } else {
      badge.className = 'ai-badge needs-key';
      badge.innerHTML = '<i class="fa-solid fa-key"></i> Set API Key';
      badge.title = 'Click ⚙️ to add your free API key';
      badge.style.cursor = 'pointer';
      badge.onclick = () => toggleSettingsModal();
    }
  }

  // ── Settings ──
  function updateProviderHints() {
    const provider = document.getElementById('ai-provider-select').value;
    const hint = document.getElementById('api-key-hint');
    const desc = document.getElementById('api-key-desc');
    const input = document.getElementById('api-key-input');
    if (provider === 'groq') {
      hint.innerHTML = '(100% Free — <a href="https://console.groq.com/keys" target="_blank">Get key</a>)';
      desc.innerHTML = 'Groq is free. Get your key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a>';
      input.placeholder = 'gsk_...';
    } else {
      hint.innerHTML = '(<a href="https://aistudio.google.com/apikey" target="_blank">Get Gemini key</a>)';
      desc.innerHTML = 'Get your key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>';
      input.placeholder = 'AIzaSy...';
    }
  }

  function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');
    const saved = localStorage.getItem('codelens_api_key');
    if (saved) document.getElementById('api-key-input').value = saved;
    const savedP = localStorage.getItem('codelens_provider');
    if (savedP) document.getElementById('ai-provider-select').value = savedP;
    updateProviderHints();
  }

  async function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { showToast('Please enter an API key', 'error'); return; }
    await activateAI(key, document.getElementById('ai-provider-select').value, false);
  }

  async function activateAI(key, provider, silent) {
    try {
      const res = await fetch('/api/config/apikey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key, provider: provider || 'groq' }) });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('codelens_api_key', key);
        localStorage.setItem('codelens_provider', provider || 'groq');
        state.aiEnabled = true;
        updateAIBadge();
        if (!silent) { showToast('🧠 ' + data.message, 'success'); document.getElementById('settings-modal').classList.add('hidden'); }
      } else { if (!silent) showToast(data.error || 'Failed', 'error'); }
    } catch (err) { if (!silent) showToast('Connection failed', 'error'); }
  }

  // ── Analyze Code ──
  async function analyzeCode() {
    const code = state.editor ? state.editor.getValue() : '';
    if (!code.trim()) { showToast('Enter some code to analyze.', 'error'); return; }
    const language = document.getElementById('language-select').value;
    const spinner = document.getElementById('analyze-spinner');
    const btn = document.getElementById('btn-analyze');
    spinner.classList.add('active');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    document.getElementById('language-warning').classList.add('hidden');

    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, language, sessionId: state.sessionId }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.languageMismatch && data.detectedLanguage) {
          state.lastAnalysis = {
            detectedLanguage: data.detectedLanguage,
            selectedLanguage: data.selectedLanguage || language
          };
          const warn = document.getElementById('language-warning');
          document.getElementById('language-warning-text').textContent = `Selected ${data.selectedLanguage || language}, but code looks like ${data.detectedLanguage}. Click "Fix it" and run again.`;
          warn.classList.remove('hidden');
        }
        if (data.needsApiKey) { toggleSettingsModal(); showToast('Add your API key first.', 'error'); return; }
        throw new Error(data.error || 'Analysis failed');
      }
      state.lastAnalysis = data;
      renderAnalysisResults(data, code);

      // Language mismatch warning
      if (data.languageMismatch) {
        const warn = document.getElementById('language-warning');
        document.getElementById('language-warning-text').textContent = `Code appears to be ${data.detectedLanguage}, not ${data.selectedLanguage}. Results are based on the detected language.`;
        warn.classList.remove('hidden');
      }
      showToast(`Analysis complete in ${data.analysisTime}`, 'success');
    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      spinner.classList.remove('active'); btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Analyze Code';
    }
  }

  // ── AI Generate ──
  async function aiGenerate() {
    const desc = document.getElementById('ai-description-input').value.trim();
    if (!desc) { showToast('Enter a description', 'error'); return; }
    const language = document.getElementById('language-select').value;
    const btn = document.getElementById('btn-ai-generate');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: desc, language }) });
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      state.generatedCode = data.code;
      document.getElementById('generated-algo-title').textContent = `${data.name} — ${language}`;
      document.getElementById('generated-code-display').textContent = data.code;
      showToast('Code generated!', 'success');
    } catch (err) { showToast('Generation failed: ' + err.message, 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate'; }
  }

  // ── Render Analysis Results ──
  function renderAnalysisResults(result, originalCode) {
    renderGauge(result.rating);
    renderComplexity(result.complexity);
    const allIssues = [...(result.deadCode?.issues || []), ...(result.optimization?.suggestions || [])];
    renderIssues(allIssues);
    renderStats(result);
    renderComparison(originalCode, result.deadCode?.cleanedCode, result.optimization?.optimizedCode);
  }

  function renderGauge(rating) {
    const container = document.getElementById('gauge-container');
    if (!rating || rating.overall === undefined) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-desc">Rating unavailable</div></div>'; return; }
    const score = rating.overall;
    const color = score >= 8 ? '#34d399' : score >= 6 ? '#fbbf24' : score >= 4 ? '#f97316' : '#f87171';
    const radius = 60, circumference = Math.PI * radius, offset = circumference - (score / 10) * circumference;
    container.innerHTML = `
      <svg class="gauge-svg" viewBox="0 0 160 100">
        <path class="gauge-bg" d="M 20 90 A 60 60 0 0 1 140 90" />
        <path class="gauge-fill" d="M 20 90 A 60 60 0 0 1 140 90" stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" style="filter:drop-shadow(0 0 8px ${color}40)" />
        <text x="80" y="78" class="gauge-value">${score}</text>
        <text x="80" y="94" class="gauge-label">out of 10</text>
      </svg>
      <div class="gauge-grade" style="color:${color}">${rating.grade}</div>
      <div class="gauge-feedback">${rating.feedback || ''}</div>
      <div class="rating-breakdown">
        ${Object.entries(rating.breakdown || {}).map(([key, val]) => `
          <div class="breakdown-item"><div class="breakdown-label">${key}</div>
          <div class="breakdown-score" style="color:${val.score >= 7 ? '#34d399' : val.score >= 4 ? '#fbbf24' : '#f87171'}">${val.score}/10</div>
          <div class="breakdown-weight">${val.weight || ''}</div></div>`).join('')}
      </div>`;
    requestAnimationFrame(() => {
      const fill = container.querySelector('.gauge-fill');
      if (fill) requestAnimationFrame(() => { fill.style.strokeDashoffset = offset; });
    });
  }

  function renderComplexity(c) {
    const el = document.getElementById('complexity-display');
    if (!c) { el.innerHTML = '<div class="empty-state"><div class="empty-desc">No complexity data</div></div>'; return; }
    el.innerHTML = `
      <div class="complexity-row"><span class="complexity-badge time">${c.timeComplexity || '?'}</span><div class="complexity-info"><div class="complexity-label">Time — ${c.timeLabel || ''}</div><div class="complexity-explanation">${c.timeExplanation || ''}</div></div></div>
      <div class="complexity-row"><span class="complexity-badge space">${c.spaceComplexity || '?'}</span><div class="complexity-info"><div class="complexity-label">Space — ${c.spaceLabel || ''}</div><div class="complexity-explanation">${c.spaceExplanation || ''}</div></div></div>
      ${c.details ? `<div class="details-grid">${c.details.map(d => `<div class="detail-item"><span class="detail-label">${d.label}</span><span class="detail-value">${d.value}</span></div>`).join('')}</div>` : ''}`;
  }

  function renderIssues(issues) {
    const list = document.getElementById('issues-list');
    const chip = document.getElementById('issue-count-chip');
    if (!issues || !issues.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Looking good!</div><div class="empty-desc">No issues found.</div></div>';
      chip.style.display = 'none'; return;
    }
    chip.style.display = 'flex'; document.getElementById('issue-count').textContent = issues.length;
    const icons = { error: '❌', warning: '⚠️', info: 'ℹ️', performance: '⚡', optimization: '🔧', readability: '📖', cleanup: '🧹' };
    list.innerHTML = issues.map(i => `<div class="issue-item"><div class="issue-icon ${i.severity || 'info'}">${icons[i.severity] || 'ℹ️'}</div><div class="issue-body"><div class="issue-message">${esc(i.message || '')}</div><div class="issue-suggestion">${esc(i.suggestion || '')}</div>${i.line ? `<div class="issue-line">Line ${i.line}</div>` : ''}${i.lineContent ? `<div class="issue-code">${esc(i.lineContent)}</div>` : ''}</div></div>`).join('');
  }

  function renderStats(r) {
    document.getElementById('stats-bar').style.display = 'flex';
    document.getElementById('stat-time').textContent = r.analysisTime;
    const d = r.complexity?.details || [];
    document.getElementById('stat-lines').textContent = (d.find(x => x.label === 'Total Lines') || {}).value || '—';
    document.getElementById('stat-funcs').textContent = (d.find(x => x.label === 'Functions') || {}).value || '—';
    document.getElementById('stat-loops').textContent = (d.find(x => x.label === 'Loops') || {}).value || '—';
    document.getElementById('stat-engine').textContent = r.engine || 'AI';
  }

  function renderComparison(original, cleaned, optimized) {
    document.getElementById('comparison-original').textContent = original;
    const opt = optimized || cleaned || original;
    document.getElementById('comparison-optimized').textContent = opt;
    const container = document.getElementById('use-optimized-container');
    container.style.display = (opt !== original) ? 'flex' : 'none';
  }

  // ── Algorithms ──
  async function loadAlgorithms() {
    try { const res = await fetch('/api/generate'); const data = await res.json(); state.algorithms = data.algorithms || []; renderAlgorithmList(); } catch (e) {}
  }

  function renderAlgorithmList() {
    const list = document.getElementById('algorithm-list');
    const cats = {};
    state.algorithms.forEach(a => { if (!cats[a.category]) cats[a.category] = []; cats[a.category].push(a); });
    let html = '';
    for (const [cat, algos] of Object.entries(cats)) {
      html += `<div class="algorithm-category">${cat}</div>`;
      algos.forEach(a => { html += `<div class="algorithm-item" data-id="${a.id}"><div class="algo-name">${a.name}</div><div class="algo-desc">${a.description}</div></div>`; });
    }
    list.innerHTML = html;
    list.querySelectorAll('.algorithm-item').forEach(item => {
      item.addEventListener('click', () => { list.querySelectorAll('.algorithm-item').forEach(i => i.classList.remove('selected')); item.classList.add('selected'); generateAlgorithmCode(item.dataset.id); });
    });
  }

  async function generateAlgorithmCode(id) {
    const lang = document.getElementById('language-select').value;
    try { const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ algorithmId: id, language: lang }) }); const data = await res.json(); if (data.error) { showToast(data.error, 'error'); return; } state.selectedAlgorithm = id; state.generatedCode = data.code; document.getElementById('generated-algo-title').textContent = `${data.name} — ${lang}`; document.getElementById('generated-code-display').textContent = data.code; } catch (e) { showToast('Generation failed', 'error'); }
  }

  // ── History ──
  async function loadHistory() {
    if (!state.user) return;
    try {
      const res = await fetch(`/api/history?sessionId=${state.sessionId}`);
      if (res.status === 401) return;
      const data = await res.json();
      renderHistory(data.history || []);
    } catch (e) {}
  }

  function renderHistory(history) {
    const grid = document.getElementById('history-grid');
    const empty = document.getElementById('history-empty');
    if (!history.length) { grid.innerHTML = ''; grid.appendChild(empty); empty.style.display = 'flex'; return; }
    empty.style.display = 'none';
    grid.innerHTML = history.map(item => {
      const date = new Date(item.created_at + 'Z');
      const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const preview = (item.code || '').split('\n').slice(0, 4).join('\n');
      const rc = item.efficiency_rating >= 7 ? '#34d399' : item.efficiency_rating >= 4 ? '#fbbf24' : '#f87171';
      return `<div class="card history-card" data-id="${item.id}"><div class="history-meta"><span class="history-lang">${item.language}</span><span class="history-time">${timeStr}</span></div><div class="history-preview">${esc(preview)}</div><div class="history-rating"><span style="color:${rc}">★ ${item.efficiency_rating}/10</span><span style="color:var(--text-muted);font-size:0.72rem;font-weight:400">${item.time_complexity || ''}</span></div><div class="history-actions"><button class="btn btn-sm" onclick="window.CodeLens.loadSubmission('${item.id}')"><i class="fa-solid fa-eye"></i> View</button><button class="btn btn-sm btn-danger" onclick="window.CodeLens.deleteSubmission('${item.id}')"><i class="fa-solid fa-trash"></i></button></div></div>`;
    }).join('');
  }

  async function loadSubmission(id) {
    try {
      const res = await fetch(`/api/history/${id}?sessionId=${state.sessionId}`);
      if (res.status === 401) { showLoginModal(); return; }
      const data = await res.json();
      if (data.error) { showToast(data.error, 'error'); return; }
      document.getElementById('language-select').value = data.language;
      if (state.editor) { state.editor.setValue(data.code); monaco.editor.setModelLanguage(state.editor.getModel(), data.language === 'c++' ? 'cpp' : data.language); updateFilename(data.language); }
      document.querySelector('.nav-tab[data-tab="editor"]').click();
      showToast('Submission loaded', 'success');
    } catch (e) { showToast('Failed to load', 'error'); }
  }

  async function deleteSubmission(id) {
    try { await fetch(`/api/history/${id}?sessionId=${state.sessionId}`, { method: 'DELETE' }); showToast('Deleted', 'success'); loadHistory(); } catch (e) { showToast('Failed', 'error'); }
  }

  async function clearHistory() {
    if (!confirm('Clear all history?')) return;
    try { await fetch(`/api/history?sessionId=${state.sessionId}`, { method: 'DELETE' }); showToast('History cleared', 'success'); loadHistory(); } catch (e) { showToast('Failed', 'error'); }
  }

  // ── Toast ──
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${esc(message)}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3500);
  }

  // ── Helpers ──
  function generateId() { return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36); }
  function esc(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function getSampleCode(lang) {
    const s = {
      python: `def find_duplicates(arr):\n    """Find all duplicate elements in an array."""\n    seen = set()\n    duplicates = []\n    unused_var = 42\n    \n    for item in arr:\n        if item in seen:\n            duplicates.append(item)\n        seen.add(item)\n    \n    result = ""\n    for d in duplicates:\n        result += str(d) + ", "\n    \n    return duplicates\n\ndata = [1, 2, 3, 4, 2, 5, 3, 6, 7, 8, 8]\nprint(find_duplicates(data))`,
      javascript: `function findDuplicates(arr) {\n  const seen = new Set();\n  const duplicates = [];\n  let unusedVar = 42;\n  \n  arr.forEach(item => {\n    if (seen.has(item)) duplicates.push(item);\n    seen.add(item);\n  });\n  \n  let result = "";\n  for (let i = 0; i < duplicates.length; i++) {\n    result += duplicates[i] + ", ";\n  }\n  \n  return duplicates;\n}\n\nconst data = [1, 2, 3, 4, 2, 5, 3, 6, 7, 8, 8];\nconsole.log(findDuplicates(data));`,
      java: `import java.util.*;\n\npublic class Main {\n    public static ArrayList<Integer> findDuplicates(int[] arr) {\n        HashSet<Integer> seen = new HashSet<>();\n        ArrayList<Integer> duplicates = new ArrayList<>();\n        int unusedVar = 42;\n        \n        for (int item : arr) {\n            if (seen.contains(item)) duplicates.add(item);\n            seen.add(item);\n        }\n        \n        String result = "";\n        for (int d : duplicates) result += d + ", ";\n        \n        return duplicates;\n    }\n}`,
      'c++': `#include <iostream>\n#include <vector>\n#include <set>\nusing namespace std;\n\nvector<int> findDuplicates(vector<int>& arr) {\n    set<int> seen;\n    vector<int> duplicates;\n    int unusedVar = 42;\n    \n    for (int item : arr) {\n        if (seen.count(item)) duplicates.push_back(item);\n        seen.insert(item);\n    }\n    return duplicates;\n}\n\nint main() {\n    vector<int> data = {1, 2, 3, 4, 2, 5, 3};\n    auto result = findDuplicates(data);\n    for (int x : result) cout << x << " ";\n    return 0;\n}`,
      c: `#include <stdio.h>\n\nvoid findDuplicates(int arr[], int n) {\n    int unusedVar = 42;\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            if (arr[i] == arr[j]) {\n                printf("%d ", arr[i]);\n                break;\n            }\n        }\n    }\n}\n\nint main() {\n    int data[] = {1, 2, 3, 4, 2, 5, 3};\n    findDuplicates(data, 7);\n    return 0;\n}`
    };
    return s[lang] || s.python;
  }

  window.CodeLens = { loadSubmission, deleteSubmission };
})();
