/**
 * CodeLens — Complexity Analyzer Engine
 * Detects Time and Space complexity using pattern-based analysis.
 * Supports: Python, JavaScript, Java, C++, C
 */

class ComplexityAnalyzer {
  constructor(code, language) {
    this.code = code;
    this.language = language.toLowerCase();
    this.lines = code.split('\n');
  }

  analyze() {
    const timeComplexity = this.detectTimeComplexity();
    const spaceComplexity = this.detectSpaceComplexity();
    const details = this.getDetails();

    return {
      timeComplexity: timeComplexity.notation,
      timeLabel: timeComplexity.label,
      timeExplanation: timeComplexity.explanation,
      spaceComplexity: spaceComplexity.notation,
      spaceLabel: spaceComplexity.label,
      spaceExplanation: spaceComplexity.explanation,
      details
    };
  }

  detectTimeComplexity() {
    const scores = [];

    // Check for recursive patterns first (often highest complexity)
    const recursion = this.detectRecursion();
    if (recursion) scores.push(recursion);

    // Check for divide and conquer patterns BEFORE loop depth
    // (binary search has a while loop but is O(log n), not O(n))
    const divideConquer = this.detectDivideAndConquer();
    if (divideConquer) scores.push(divideConquer);

    // Check for sorting operations
    const sorting = this.detectSorting();
    if (sorting) scores.push(sorting);

    // Check nested loop depth — BUT skip if divide-and-conquer was detected
    // (a binary search while loop is not O(n))
    if (!divideConquer) {
      const loopDepth = this.detectLoopDepth();
      if (loopDepth) scores.push(loopDepth);
    }

    // Default to O(n) for single pass or O(1) if no loops
    if (scores.length === 0) {
      const hasLoop = this.hasAnyLoop();
      if (hasLoop) {
        scores.push({
          notation: 'O(n)',
          label: 'Linear',
          explanation: 'Single loop or linear traversal detected.',
          priority: 2
        });
      } else {
        scores.push({
          notation: 'O(1)',
          label: 'Constant',
          explanation: 'No loops or recursion detected — constant time operations.',
          priority: 1
        });
      }
    }

    // Return highest complexity
    scores.sort((a, b) => b.priority - a.priority);
    return scores[0];
  }

  detectSpaceComplexity() {
    const scores = [];

    // Check for 2D array/matrix allocation
    const matrix = this.detect2DArray();
    if (matrix) scores.push(matrix);

    // Check for array/list creation proportional to input
    const arrays = this.detectArrayAllocation();
    if (arrays) scores.push(arrays);

    // Check for recursive call stack
    const recursiveSpace = this.detectRecursiveSpace();
    if (recursiveSpace) scores.push(recursiveSpace);

    // Check for hash map/set usage
    const hashSpace = this.detectHashSpace();
    if (hashSpace) scores.push(hashSpace);

    if (scores.length === 0) {
      scores.push({
        notation: 'O(1)',
        label: 'Constant',
        explanation: 'No significant dynamic memory allocation detected.',
        priority: 1
      });
    }

    scores.sort((a, b) => b.priority - a.priority);
    return scores[0];
  }

  detectRecursion() {
    const funcPatterns = {
      python: /def\s+(\w+)\s*\(/g,
      javascript: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|function))/g,
      java: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(/g,
      'c++': /[\w<>\[\]:]+\s+(\w+)\s*\([^)]*\)\s*\{/g,
      c: /[\w\*]+\s+(\w+)\s*\([^)]*\)\s*\{/g,
    };

    const pattern = funcPatterns[this.language] || funcPatterns.javascript;
    let match;
    const functions = [];

    while ((match = pattern.exec(this.code)) !== null) {
      const name = match[1] || match[2];
      if (name && !['if', 'for', 'while', 'switch', 'catch', 'main', 'print', 'console', 'return'].includes(name)) {
        functions.push(name);
      }
    }

    for (const funcName of functions) {
      const funcRegex = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
      const calls = this.code.match(funcRegex);
      if (calls && calls.length >= 2) {
        // Check for double recursion (like fibonacci)
        const doubleRecursion = new RegExp(
          `${funcName}\\s*\\([^)]*\\)\\s*[+\\-*|&]\\s*${funcName}\\s*\\(`
        );
        if (doubleRecursion.test(this.code)) {
          return {
            notation: 'O(2^n)',
            label: 'Exponential',
            explanation: `Double recursive calls detected in function "${funcName}" — exponential time.`,
            priority: 7
          };
        }

        // Check if it's a divide-and-conquer recursion (merge sort, quick sort)
        // These call themselves but also split the problem
        const hasMidSplit = /mid|pivot|half|\/\s*2/i.test(this.code);
        if (hasMidSplit) {
          return {
            notation: 'O(n log n)',
            label: 'Linearithmic (Recursive)',
            explanation: `Recursive divide-and-conquer detected in "${funcName}" — O(n log n).`,
            priority: 4
          };
        }

        return {
          notation: 'O(n)',
          label: 'Linear (Recursive)',
          explanation: `Recursive function "${funcName}" detected — linear recursion.`,
          priority: 2
        };
      }
    }
    return null;
  }

  detectLoopDepth() {
    let maxDepth = 0;
    let currentDepth = 0;

    if (this.language === 'python') {
      const loopKeywords = /^\s*(for|while)\s+/;
      let loopIndents = [];

      for (const line of this.lines) {
        const trimmed = line.trimStart();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const indent = line.length - line.trimStart().length;

        if (loopKeywords.test(line)) {
          if (loopIndents.length === 0 || indent > loopIndents[loopIndents.length - 1]) {
            loopIndents.push(indent);
          } else {
            while (loopIndents.length > 0 && loopIndents[loopIndents.length - 1] >= indent) {
              loopIndents.pop();
            }
            loopIndents.push(indent);
          }
          maxDepth = Math.max(maxDepth, loopIndents.length);
        } else {
          while (loopIndents.length > 0 && indent <= loopIndents[loopIndents.length - 1]) {
            loopIndents.pop();
          }
        }
      }
    } else {
      // Brace-based languages
      const loopPattern = /\b(for|while|do)\s*[\({]/;
      let braceDepth = 0;
      let loopBraceStarts = [];

      for (const line of this.lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

        if (loopPattern.test(trimmed)) {
          loopBraceStarts.push(braceDepth);
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        }

        for (const ch of trimmed) {
          if (ch === '{') braceDepth++;
          if (ch === '}') {
            braceDepth--;
            if (loopBraceStarts.length > 0 && braceDepth <= loopBraceStarts[loopBraceStarts.length - 1]) {
              loopBraceStarts.pop();
              currentDepth = Math.max(0, currentDepth - 1);
            }
          }
        }
      }
    }

    const complexityMap = {
      0: null,
      1: { notation: 'O(n)', label: 'Linear', explanation: 'Single loop detected.', priority: 2 },
      2: { notation: 'O(n²)', label: 'Quadratic', explanation: 'Nested loops (depth 2) detected — quadratic time.', priority: 4 },
      3: { notation: 'O(n³)', label: 'Cubic', explanation: 'Triple nested loops detected — cubic time.', priority: 5 },
    };

    if (maxDepth >= 4) {
      return {
        notation: `O(n^${maxDepth})`,
        label: 'Polynomial',
        explanation: `${maxDepth}-level nested loops detected.`,
        priority: maxDepth + 1
      };
    }

    return complexityMap[maxDepth] || null;
  }

  detectSorting() {
    const sortPatterns = [
      /\.sort\s*\(/,
      /sorted\s*\(/,
      /Arrays\.sort\s*\(/,
      /Collections\.sort\s*\(/,
      /std::sort\s*\(/,
      /qsort\s*\(/,
    ];

    for (const pattern of sortPatterns) {
      if (pattern.test(this.code)) {
        return {
          notation: 'O(n log n)',
          label: 'Linearithmic',
          explanation: 'Built-in sort function detected — O(n log n) average case.',
          priority: 3
        };
      }
    }
    return null;
  }

  detectDivideAndConquer() {
    const code = this.code;

    // ── Binary search patterns (comprehensive) ──
    const binarySearchPatterns = [
      // mid = (low + high) / 2  or  mid = (lo + hi) // 2  etc.
      /\bmid\b\s*=\s*[\w\s(]*(?:low|lo|left|l|start|begin|first)\s*[+]\s*(?:high|hi|right|r|end|last)\s*[)]*\s*(?:\/\/?\s*2|\>\>\s*1|\)\s*\/\/?\s*2)/i,
      // mid = low + (high - low) / 2
      /\bmid\b\s*=\s*(?:low|lo|left|l|start)\s*\+\s*\(?\s*(?:high|hi|right|r|end)\s*-\s*(?:low|lo|left|l|start)\s*\)?\s*(?:\/\/?\s*2|\>\>\s*1)/i,
      // mid = (left + right) / 2
      /\bmid\b\s*=\s*\(\s*\w+\s*\+\s*\w+\s*\)\s*(?:\/\/?\s*2|\>\>\s*1)/,
      // Math.floor((low + high) / 2)
      /Math\.floor\s*\(\s*\(\s*\w+\s*\+\s*\w+\s*\)\s*\/\s*2\s*\)/,
      // while low <= high  or  while (left < right)  — with mid calculation nearby
      /(?:while\s*(?:\(?\s*)?(?:low|lo|left|l|start)\s*<[=]?\s*(?:high|hi|right|r|end))/i,
    ];

    // Check for binary search: need BOTH a mid calculation AND a converging loop
    const hasMidCalc = /\bmid\b\s*=/i.test(code);
    const hasConvergingLoop = /(?:low|lo|left|l|start)\s*(?:<[=]?)\s*(?:high|hi|right|r|end)/i.test(code);
    const hasHalving = /\/\s*2|\/\/\s*2|>>\s*1/i.test(code);

    if (hasMidCalc && hasConvergingLoop && hasHalving) {
      return {
        notation: 'O(log n)',
        label: 'Logarithmic',
        explanation: 'Binary search pattern detected — halving search space each iteration.',
        priority: 3  // Higher than O(n) so it wins
      };
    }

    // Also try each individual pattern
    for (const pattern of binarySearchPatterns) {
      if (pattern.test(code)) {
        // Verify there's also some kind of halving/mid logic
        if (hasMidCalc || hasHalving) {
          return {
            notation: 'O(log n)',
            label: 'Logarithmic',
            explanation: 'Divide and conquer / binary search pattern detected.',
            priority: 3
          };
        }
      }
    }

    // Generic divide and conquer: recursive function that halves the input
    const hasRecursiveHalving = /\b\w+\s*\([^)]*(?:\/\s*2|>>\s*1|mid)[^)]*\)/i.test(code);
    const hasBaseCase = /\bif\s*[\(]?\s*(?:\w+\s*[<>=!]+\s*\w+|len\s*\(\s*\w+\s*\)\s*[<>=!]+)/i.test(code);

    if (hasRecursiveHalving && hasBaseCase && hasHalving && !hasMidCalc) {
      return {
        notation: 'O(log n)',
        label: 'Logarithmic',
        explanation: 'Recursive halving pattern detected — logarithmic time.',
        priority: 3
      };
    }

    return null;
  }

  hasAnyLoop() {
    return /\b(for|while|do)\b/.test(this.code);
  }

  detect2DArray() {
    const patterns = [
      /\[\s*\[/,
      /new\s+\w+\s*\[\w+\]\s*\[\w+\]/,
      /vector\s*<\s*vector/,
      /\[\s*\[.*\]\s*for\s+/,
      /Array\(\w+\)\.fill.*\.map/,
      /Array\.from\s*\(\s*\{.*length/,
    ];

    for (const p of patterns) {
      if (p.test(this.code)) {
        return {
          notation: 'O(n²)',
          label: 'Quadratic',
          explanation: '2D array/matrix allocation detected.',
          priority: 4
        };
      }
    }
    return null;
  }

  detectArrayAllocation() {
    const patterns = [
      /new\s+(Array|int|float|double|char|String)\s*\[/,
      /=\s*\[\s*\]\s*$/m,
      /\.push\(|\.append\(|\.add\(/,
      /list\s*\(\s*\)|deque\s*\(/,
      /new\s+Array\s*\(/,
    ];

    for (const p of patterns) {
      if (p.test(this.code)) {
        return {
          notation: 'O(n)',
          label: 'Linear',
          explanation: 'Dynamic array/list allocation grows with input size.',
          priority: 2
        };
      }
    }
    return null;
  }

  detectRecursiveSpace() {
    const recursion = this.detectRecursion();
    if (recursion) {
      if (recursion.notation === 'O(2^n)') {
        return {
          notation: 'O(n)',
          label: 'Linear',
          explanation: 'Recursive call stack depth proportional to input size.',
          priority: 2
        };
      }
      if (recursion.notation === 'O(n log n)') {
        return {
          notation: 'O(n)',
          label: 'Linear',
          explanation: 'Recursive divide-and-conquer uses O(n) auxiliary space.',
          priority: 2
        };
      }
      return {
        notation: 'O(n)',
        label: 'Linear',
        explanation: 'Recursive call stack depth proportional to input size.',
        priority: 2
      };
    }
    return null;
  }

  detectHashSpace() {
    const patterns = [
      /new\s+(Map|Set|HashMap|HashSet|TreeMap|dict)\b/,
      /\bdict\s*\(|{}\s*$/m,
      /unordered_map|unordered_set/,
      /=\s*set\s*\(\)/,
      /new\s+Set\s*\(/,
      /new\s+Map\s*\(/,
    ];
    for (const p of patterns) {
      if (p.test(this.code)) {
        return {
          notation: 'O(n)',
          label: 'Linear',
          explanation: 'Hash map/set grows proportionally to input.',
          priority: 2
        };
      }
    }
    return null;
  }

  getDetails() {
    const details = [];
    const lineCount = this.lines.length;
    const loopCount = (this.code.match(/\b(for|while)\b/g) || []).length;
    const funcCount = this.countFunctions();
    const condCount = (this.code.match(/\b(if|elif|else\s+if|switch|case)\b/g) || []).length;

    details.push({ label: 'Total Lines', value: lineCount });
    details.push({ label: 'Loops', value: loopCount });
    details.push({ label: 'Functions', value: funcCount });
    details.push({ label: 'Conditionals', value: condCount });

    return details;
  }

  countFunctions() {
    const patterns = {
      python: /\bdef\s+\w+/g,
      javascript: /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?function)/g,
      java: /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+\w+\s*\(/g,
      'c++': /[\w<>\[\]:]+\s+\w+\s*\([^)]*\)\s*\{/g,
      c: /[\w\*]+\s+\w+\s*\([^)]*\)\s*\{/g,
    };

    const pattern = patterns[this.language] || patterns.javascript;
    const matches = this.code.match(pattern) || [];
    return matches.length;
  }
}

module.exports = ComplexityAnalyzer;
