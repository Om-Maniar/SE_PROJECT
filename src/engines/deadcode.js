/**
 * CodeLens — Dead Code Detector Engine
 * Detects unused variables, unreachable code, empty blocks, and redundant conditions.
 */

class DeadCodeDetector {
  constructor(code, language) {
    this.code = code;
    this.language = language.toLowerCase();
    this.lines = code.split('\n');
    this.issues = [];
  }

  analyze() {
    this.detectUnusedVariables();
    this.detectUnreachableCode();
    this.detectEmptyBlocks();
    this.detectRedundantConditions();
    this.detectUnusedImports();
    this.detectCommentedOutCode();

    const cleanedCode = this.generateCleanedCode();

    return {
      issues: this.issues,
      issueCount: this.issues.length,
      cleanedCode,
      deadCodePercentage: this.calculateDeadCodePercentage()
    };
  }

  detectUnusedVariables() {
    let varDeclarations = [];

    if (this.language === 'python') {
      const assignPattern = /^(\s*)(\w+)\s*=\s*(.+)$/;
      this.lines.forEach((line, idx) => {
        const match = line.match(assignPattern);
        if (match && !line.trim().startsWith('#') && !line.trim().startsWith('self.')) {
          const varName = match[2];
          // Skip keywords, loop vars used implicitly, common names
          const skipNames = ['if', 'else', 'elif', 'for', 'while', 'def', 'class',
            'return', 'import', 'from', 'True', 'False', 'None', '_',
            'self', 'cls', 'result', 'ans', 'res', 'output', 'dp', 'memo'];
          if (!skipNames.includes(varName) && varName.length > 1) {
            varDeclarations.push({ name: varName, line: idx + 1, lineContent: line });
          }
        }
      });
    } else {
      const varPatterns = [
        /(?:const|let|var|int|float|double|char|String|long|boolean|bool|auto)\s+(\w+)\s*[=;]/g,
      ];

      for (const pattern of varPatterns) {
        this.lines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
          // Skip function parameter lines
          if (/^\s*(public|private|protected|static|void|int|String|boolean|char|float|double|long)\s+\w+\s*\(/.test(line)) return;

          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const varName = match[1];
            // Skip common var names that are likely used intentionally
            const skipNames = ['i', 'j', 'k', 'n', 'm', 'x', 'result', 'ans', 'res',
              'output', 'temp', 'tmp', 'dp', 'memo', 'arr', 'args', 'data', 'node'];
            if (varName && varName.length > 1 && !skipNames.includes(varName)) {
              varDeclarations.push({ name: varName, line: idx + 1, lineContent: line });
            }
          }
        });
      }
    }

    // Check usage of each variable (excluding declaration line)
    for (const decl of varDeclarations) {
      let usageCount = 0;
      const varRegex = new RegExp(`\\b${decl.name}\\b`, 'g');

      this.lines.forEach((line, idx) => {
        if (idx + 1 === decl.line) return;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        const matches = line.match(varRegex);
        if (matches) usageCount += matches.length;
      });

      if (usageCount === 0) {
        this.issues.push({
          type: 'unused-variable',
          severity: 'warning',
          line: decl.line,
          message: `Variable "${decl.name}" is declared but never used.`,
          suggestion: `Remove the unused variable "${decl.name}".`,
          lineContent: decl.lineContent.trim()
        });
      }
    }
  }

  detectUnreachableCode() {
    const terminators = /^\s*(return|break|continue|throw|exit|sys\.exit|process\.exit)\b/;
    let braceDepth = 0;
    let afterTerminator = false;
    let terminatorLine = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        continue;
      }

      if (this.language === 'python') {
        if (terminators.test(line) && !afterTerminator) {
          afterTerminator = true;
          terminatorLine = i + 1;
          continue;
        }

        if (afterTerminator) {
          const currentIndent = line.length - line.trimStart().length;
          const termIndent = this.lines[terminatorLine - 1].length - this.lines[terminatorLine - 1].trimStart().length;

          if (currentIndent > termIndent && trimmed !== '') {
            this.issues.push({
              type: 'unreachable-code',
              severity: 'error',
              line: i + 1,
              message: `Unreachable code after line ${terminatorLine}.`,
              suggestion: 'Remove this code — it will never execute.',
              lineContent: trimmed
            });
          } else {
            afterTerminator = false;
          }
        }
      } else {
        if (terminators.test(trimmed) && !afterTerminator) {
          afterTerminator = true;
          terminatorLine = i + 1;
        }

        for (const ch of trimmed) {
          if (ch === '{') braceDepth++;
          if (ch === '}') {
            braceDepth--;
            afterTerminator = false;
          }
        }

        if (afterTerminator && i + 1 > terminatorLine) {
          if (trimmed !== '}' && trimmed !== '{' && !trimmed.startsWith('case') &&
              !trimmed.startsWith('default') && !trimmed.startsWith('else') &&
              !trimmed.startsWith('elif') && !trimmed.startsWith('} else')) {
            this.issues.push({
              type: 'unreachable-code',
              severity: 'error',
              line: i + 1,
              message: `Unreachable code after line ${terminatorLine}.`,
              suggestion: 'Remove this code — it will never execute.',
              lineContent: trimmed
            });
            afterTerminator = false;
          }
        }
      }
    }
  }

  detectEmptyBlocks() {
    if (this.language === 'python') {
      for (let i = 0; i < this.lines.length; i++) {
        const trimmed = this.lines[i].trim();
        if (/^(if|else|elif|for|while|try|except|finally|def|class)\b.*:\s*$/.test(trimmed)) {
          const nextLine = i + 1 < this.lines.length ? this.lines[i + 1].trim() : '';
          if (nextLine === 'pass') {
            this.issues.push({
              type: 'empty-block',
              severity: 'info',
              line: i + 1,
              message: 'Empty code block — contains only `pass`.',
              suggestion: 'Add implementation or remove the empty block.',
              lineContent: trimmed
            });
          }
        }
      }
    } else {
      // Detect empty catch/except blocks specifically
      for (let i = 0; i < this.lines.length; i++) {
        if (/\bcatch\b/.test(this.lines[i])) {
          for (let j = i + 1; j < this.lines.length; j++) {
            const t = this.lines[j].trim();
            if (t === '') continue;
            if (t === '}') {
              this.issues.push({
                type: 'empty-catch',
                severity: 'warning',
                line: i + 1,
                message: 'Empty catch block — errors are silently swallowed.',
                suggestion: 'Log the exception or handle it explicitly.',
                lineContent: this.lines[i].trim()
              });
            }
            break;
          }
        }
      }
    }

    if (this.language === 'python') {
      for (let i = 0; i < this.lines.length; i++) {
        if (/^\s*except\b/.test(this.lines[i])) {
          const nextLine = i + 1 < this.lines.length ? this.lines[i + 1].trim() : '';
          if (nextLine === 'pass' || nextLine === '') {
            this.issues.push({
              type: 'empty-catch',
              severity: 'warning',
              line: i + 1,
              message: 'Empty except block — errors are silently swallowed.',
              suggestion: 'Log the exception or handle it explicitly.',
              lineContent: this.lines[i].trim()
            });
          }
        }
      }
    }
  }

  detectRedundantConditions() {
    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();

      // if (true), if (false)
      if (/\bif\s*\(\s*(true|True|1)\s*\)/.test(trimmed) || /\bif\s+(True|1)\s*:/.test(trimmed)) {
        this.issues.push({
          type: 'redundant-condition',
          severity: 'warning',
          line: i + 1,
          message: 'Condition is always true — block will always execute.',
          suggestion: 'Remove the condition and keep the block body.',
          lineContent: trimmed
        });
      }

      if (/\bif\s*\(\s*(false|False|0)\s*\)/.test(trimmed) || /\bif\s+(False|0)\s*:/.test(trimmed)) {
        this.issues.push({
          type: 'redundant-condition',
          severity: 'error',
          line: i + 1,
          message: 'Condition is always false — block will never execute.',
          suggestion: 'Remove this dead code block entirely.',
          lineContent: trimmed
        });
      }

      // x == x self-comparison (must be exactly word == same_word with nothing between)
      // Must NOT match arr[mid] == target or similar
      const selfCompare = trimmed.match(/\b([a-zA-Z_]\w*)\s*===?\s*\1\b/);
      if (selfCompare) {
        // Make sure it's a simple variable, not arr[x] == arr[something]
        const varName = selfCompare[1];
        // Check there's no bracket/dot access before the second occurrence
        const fullContext = trimmed.substring(trimmed.indexOf(selfCompare[0]));
        if (!/\[|\.\w/.test(fullContext.substring(0, fullContext.indexOf('==')))) {
          this.issues.push({
            type: 'redundant-condition',
            severity: 'warning',
            line: i + 1,
            message: `Comparing "${varName}" to itself — always true.`,
            suggestion: 'This comparison is redundant. Simplify the logic.',
            lineContent: trimmed
          });
        }
      }
    }
  }

  detectUnusedImports() {
    const importNames = [];

    if (this.language === 'python') {
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i].trim();
        let match = line.match(/^import\s+(\w+)/);
        if (match) {
          importNames.push({ name: match[1], line: i + 1, lineContent: line });
        }
        match = line.match(/^from\s+\w+\s+import\s+(.+)/);
        if (match) {
          const names = match[1].split(',').map(n => n.trim().split(' as ').pop().trim());
          names.forEach(name => {
            if (name !== '*') {
              importNames.push({ name, line: i + 1, lineContent: line });
            }
          });
        }
      }
    } else if (this.language === 'javascript') {
      for (let i = 0; i < this.lines.length; i++) {
        const line = this.lines[i].trim();
        const match = line.match(/import\s+(?:{([^}]+)}|(\w+))/);
        if (match) {
          const names = match[1] ? match[1].split(',').map(n => n.trim().split(' as ').pop().trim()) : [match[2]];
          names.forEach(name => {
            importNames.push({ name, line: i + 1, lineContent: line });
          });
        }
      }
    } else if (this.language === 'java') {
      for (let i = 0; i < this.lines.length; i++) {
        const match = this.lines[i].match(/^import\s+[\w.]+\.(\w+)\s*;/);
        if (match) {
          importNames.push({ name: match[1], line: i + 1, lineContent: this.lines[i].trim() });
        }
      }
    }

    for (const imp of importNames) {
      const regex = new RegExp(`\\b${imp.name}\\b`, 'g');
      let count = 0;
      this.lines.forEach((line, idx) => {
        if (idx + 1 === imp.line) return;
        if (regex.test(line)) count++;
        regex.lastIndex = 0;
      });

      if (count === 0) {
        this.issues.push({
          type: 'unused-import',
          severity: 'warning',
          line: imp.line,
          message: `Import "${imp.name}" is never used.`,
          suggestion: `Remove the unused import.`,
          lineContent: imp.lineContent
        });
      }
    }
  }

  detectCommentedOutCode() {
    let consecutiveComments = 0;
    let startLine = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      const isCommentedCode = (
        (trimmed.startsWith('//') && /[;{}()=]/.test(trimmed)) ||
        (trimmed.startsWith('#') && /[=\[\]{}():]/.test(trimmed) && !/^#\s*(TODO|FIXME|NOTE|HACK|XXX|type:|noqa|Example|Usage)/i.test(trimmed))
      );

      if (isCommentedCode) {
        if (consecutiveComments === 0) startLine = i + 1;
        consecutiveComments++;
      } else {
        if (consecutiveComments >= 3) {
          this.issues.push({
            type: 'commented-code',
            severity: 'info',
            line: startLine,
            message: `${consecutiveComments} consecutive lines of commented-out code (lines ${startLine}–${startLine + consecutiveComments - 1}).`,
            suggestion: 'Remove commented-out code. Use version control to track old code.',
            lineContent: this.lines[startLine - 1].trim()
          });
        }
        consecutiveComments = 0;
      }
    }
  }

  generateCleanedCode() {
    const linesToRemove = new Set();
    for (const issue of this.issues) {
      if (issue.type === 'unused-variable' || issue.type === 'unreachable-code' || issue.type === 'unused-import') {
        linesToRemove.add(issue.line - 1);
      }
      if (issue.type === 'redundant-condition' && issue.message.includes('always false')) {
        linesToRemove.add(issue.line - 1);
      }
    }

    const cleanedLines = this.lines.filter((_, idx) => !linesToRemove.has(idx));
    return cleanedLines.join('\n');
  }

  calculateDeadCodePercentage() {
    const nonEmptyLines = this.lines.filter(l => l.trim().length > 0).length;
    if (nonEmptyLines === 0) return 0;
    const deadLines = this.issues.filter(i =>
      ['unused-variable', 'unreachable-code', 'unused-import'].includes(i.type)
    ).length;
    return Math.round((deadLines / nonEmptyLines) * 100);
  }
}

module.exports = DeadCodeDetector;
