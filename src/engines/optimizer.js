/**
 * CodeLens — Optimization Suggestion Engine
 * Suggests performance improvements WITHOUT changing logic.
 */
class Optimizer {
  constructor(code, language) {
    this.code = code;
    this.language = language.toLowerCase();
    this.lines = code.split('\n');
    this.suggestions = [];
  }

  analyze() {
    this.checkStringConcatInLoop();
    this.checkRepeatedFunctionCalls();
    this.checkManualLoopToBuiltin();
    this.checkIneffiecientDataStructure();
    this.checkNestedLoopOptimization();
    this.checkMagicNumbers();
    this.checkUnoptimizedListOps();
    return {
      suggestions: this.suggestions,
      count: this.suggestions.length,
      optimizedCode: this.generateOptimizedCode()
    };
  }

  checkStringConcatInLoop() {
    const loopStarts = [];
    this.lines.forEach((line, i) => { if (/\b(for|while)\b/.test(line)) loopStarts.push(i); });
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (/\w+\s*\+=\s*["']/.test(trimmed) || /\w+\s*=\s*\w+\s*\+\s*["']/.test(trimmed)) {
        if (loopStarts.some(ls => i > ls && i - ls < 20)) {
          const tip = this.language === 'python' ? 'Use list + join().' :
            this.language === 'java' ? 'Use StringBuilder.' : 'Use array + join().';
          this.suggestions.push({ type: 'string-concat', severity: 'performance', line: i + 1,
            message: 'String concatenation inside a loop is O(n²).', suggestion: tip, lineContent: trimmed });
        }
      }
    }
  }

  checkRepeatedFunctionCalls() {
    const callPattern = /(\w+\.\w+\([^)]*\)|\w+\([^)]*\))/g;
    const callCounts = {};
    this.lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;
      let match; callPattern.lastIndex = 0;
      while ((match = callPattern.exec(line)) !== null) {
        const call = match[1];
        // Skip common non-cacheable calls
        if (/^(print|console|System|log|require|import|return|if|while|for|def|function)/.test(call)) continue;
        if (/\.(append|push|add|put|set|get|pop|insert|remove|contains|has)\(/.test(call)) continue;
        if (!callCounts[call]) callCounts[call] = [];
        callCounts[call].push(idx + 1);
      }
    });
    for (const [call, lines] of Object.entries(callCounts)) {
      if (lines.length >= 3) {
        this.suggestions.push({ type: 'repeated-call', severity: 'performance', line: lines[0],
          message: `\`${call}\` repeated ${lines.length} times.`,
          suggestion: 'Cache result in a variable.', lineContent: this.lines[lines[0] - 1].trim() });
      }
    }
  }

  checkManualLoopToBuiltin() {
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (this.language === 'python' && /\w+\s*\+=\s*\w+/.test(trimmed) && i > 0 && /\bfor\b/.test(this.lines[i-1])) {
        // Make sure it's an accumulation, not mid = low + high etc.
        if (!/\bmid\b|\blow\b|\bhigh\b|\bleft\b|\bright\b/.test(trimmed)) {
          this.suggestions.push({ type: 'builtin', severity: 'optimization', line: i + 1,
            message: 'Manual accumulation can use built-in.', suggestion: 'Consider sum(), min(), max(), or comprehension.',
            lineContent: trimmed });
        }
      }
      if (this.language === 'javascript' && /\.forEach\s*\(/.test(trimmed)) {
        this.suggestions.push({ type: 'builtin', severity: 'optimization', line: i + 1,
          message: 'forEach cannot be broken out of.',
          suggestion: 'Consider .find(), .filter(), .some(), or .map().', lineContent: trimmed });
      }
    }
  }

  checkIneffiecientDataStructure() {
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (this.language === 'python' && /\bin\s+\[/.test(trimmed)) {
        this.suggestions.push({ type: 'data-structure', severity: 'performance', line: i + 1,
          message: 'Membership check on list is O(n).', suggestion: 'Use a set for O(1) lookup.',
          lineContent: trimmed });
      }
      if (this.language === 'javascript' && /\.includes\s*\(/.test(trimmed)) {
        const prev = this.lines.slice(Math.max(0, i - 5), i).join('\n');
        if (/\b(for|while|\.forEach|\.map)\b/.test(prev)) {
          this.suggestions.push({ type: 'data-structure', severity: 'performance', line: i + 1,
            message: '.includes() in loop is O(n²).', suggestion: 'Use a Set for O(1) lookups.',
            lineContent: trimmed });
        }
      }
    }
  }

  checkNestedLoopOptimization() {
    // Only flag truly nested loops (depth >= 2), NOT binary search / divide-and-conquer
    let loopLines = [];
    let depth = 0;

    // Check if this looks like binary search — if so skip entirely
    const isBinarySearch = /\bmid\b\s*=/.test(this.code) && /\/\s*2|\/\/\s*2|>>\s*1/.test(this.code);
    if (isBinarySearch) return;

    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (/\b(for|while)\b/.test(trimmed) && !/\bwhile\s*\(\s*(true|1)\s*\)/.test(trimmed)) {
        depth++;
        if (depth >= 2) {
          const inner = this.lines.slice(i, Math.min(i + 10, this.lines.length)).join('\n');
          // Only flag if there's a comparison that suggests searching
          if (/==|===|\.equals\(/.test(inner) && !/\bmid\b/.test(inner)) {
            this.suggestions.push({ type: 'nested-loop', severity: 'performance', line: i + 1,
              message: 'Nested loop with comparison — O(n²) possible.',
              suggestion: 'Pre-build a hash map/set for O(1) lookups.', lineContent: trimmed });
          }
        }
      }
      if (this.language !== 'python' && trimmed === '}') depth = Math.max(0, depth - 1);
    }
  }

  checkMagicNumbers() {
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
      if (/^(const|let|var|int|float|double|#define)\b/.test(trimmed)) continue;
      const m = trimmed.match(/[^0-9.](\d{3,})[^0-9.]/);
      if (m && /\b(for|while|if)\b/.test(trimmed)) {
        this.suggestions.push({ type: 'magic-number', severity: 'readability', line: i + 1,
          message: `Magic number ${m[1]}.`, suggestion: 'Extract to a named constant.',
          lineContent: trimmed });
      }
    }
  }

  checkUnoptimizedListOps() {
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (this.language === 'python' && /\.insert\s*\(\s*0\s*,/.test(trimmed)) {
        this.suggestions.push({ type: 'list-op', severity: 'performance', line: i + 1,
          message: 'list.insert(0, …) is O(n).', suggestion: 'Use collections.deque for O(1) left insert.',
          lineContent: trimmed });
      }
      if (this.language === 'javascript' && /\.unshift\s*\(/.test(trimmed)) {
        this.suggestions.push({ type: 'list-op', severity: 'performance', line: i + 1,
          message: '.unshift() is O(n).', suggestion: 'Consider .push() or different data structure.',
          lineContent: trimmed });
      }
    }
  }

  generateOptimizedCode() {
    const lineAnnotations = {};
    for (const s of this.suggestions) {
      if (!lineAnnotations[s.line]) lineAnnotations[s.line] = [];
      lineAnnotations[s.line].push(s.suggestion);
    }
    const prefix = this.language === 'python' ? '#' : '//';
    return this.lines.map((line, idx) => {
      const ann = lineAnnotations[idx + 1];
      return ann ? line + `  ${prefix} ⚡ ${ann[0]}` : line;
    }).join('\n');
  }
}
module.exports = Optimizer;
