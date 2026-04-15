/**
 * CodeLens — Efficiency Rater
 * Composite score 0-10 based on complexity, dead code, optimization opportunities, and code style.
 */
class EfficiencyRater {
  constructor(complexityResult, deadCodeResult, optimizerResult, code, language) {
    this.complexity = complexityResult;
    this.deadCode = deadCodeResult;
    this.optimizer = optimizerResult;
    this.code = code;
    this.language = language;
    this.lines = code.split('\n');
  }

  rate() {
    const complexityScore = this.rateComplexity();
    const deadCodeScore = this.rateDeadCode();
    const optimizationScore = this.rateOptimization();
    const styleScore = this.rateStyle();

    const overall = Math.round(
      (complexityScore.score * 0.35 +
       deadCodeScore.score * 0.20 +
       optimizationScore.score * 0.25 +
       styleScore.score * 0.20) * 10
    ) / 10;

    return {
      overall: Math.min(10, Math.max(0, overall)),
      breakdown: {
        complexity: { ...complexityScore, weight: '35%' },
        deadCode: { ...deadCodeScore, weight: '20%' },
        optimization: { ...optimizationScore, weight: '25%' },
        style: { ...styleScore, weight: '20%' }
      },
      grade: this.getGrade(overall),
      feedback: this.getFeedback(overall)
    };
  }

  rateComplexity() {
    const complexityScores = {
      'O(1)': 10, 'O(log n)': 9, 'O(n)': 8, 'O(n log n)': 7,
      'O(n²)': 5, 'O(n³)': 3, 'O(2^n)': 1, 'O(n!)': 0
    };
    const notation = this.complexity.timeComplexity;
    let score = complexityScores[notation] ?? 6;

    // Bonus for small code with appropriate complexity
    const lineCount = this.lines.filter(l => l.trim()).length;
    if (lineCount < 20 && score >= 7) score = Math.min(10, score + 0.5);

    return {
      score: Math.round(score * 10) / 10,
      label: `Time: ${notation}`,
      detail: this.complexity.timeExplanation
    };
  }

  rateDeadCode() {
    const issueCount = this.deadCode.issueCount;
    let score = 10;
    // Deduct for each issue by severity
    for (const issue of this.deadCode.issues) {
      if (issue.severity === 'error') score -= 1.5;
      else if (issue.severity === 'warning') score -= 1;
      else score -= 0.5;
    }
    return {
      score: Math.max(0, Math.round(score * 10) / 10),
      label: `${issueCount} issue${issueCount !== 1 ? 's' : ''} found`,
      detail: issueCount === 0 ? 'Clean code — no dead code detected!' : `Found ${issueCount} dead code issues.`
    };
  }

  rateOptimization() {
    const count = this.optimizer.count;
    let score = 10;
    for (const s of this.optimizer.suggestions) {
      if (s.severity === 'performance') score -= 1.5;
      else if (s.severity === 'optimization') score -= 1;
      else score -= 0.5;
    }
    return {
      score: Math.max(0, Math.round(score * 10) / 10),
      label: `${count} suggestion${count !== 1 ? 's' : ''}`,
      detail: count === 0 ? 'No optimization issues found!' : `${count} optimization opportunities.`
    };
  }

  rateStyle() {
    let score = 10;
    const nonEmpty = this.lines.filter(l => l.trim().length > 0);

    // Check for consistent indentation
    const indents = nonEmpty.map(l => l.match(/^(\s*)/)[1]);
    const hasTabs = indents.some(i => i.includes('\t'));
    const hasSpaces = indents.some(i => i.includes(' '));
    if (hasTabs && hasSpaces) score -= 1.5;

    // Check for very long lines
    const longLines = nonEmpty.filter(l => l.length > 120).length;
    if (longLines > 0) score -= Math.min(2, longLines * 0.3);

    // Check for function/method length
    const funcLines = this.estimateMaxFunctionLength();
    if (funcLines > 50) score -= 1;
    else if (funcLines > 30) score -= 0.5;

    // Check for comments ratio
    const commentLines = this.lines.filter(l => {
      const t = l.trim();
      return t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*');
    }).length;
    const commentRatio = commentLines / Math.max(1, nonEmpty.length);
    if (commentRatio < 0.05 && nonEmpty.length > 10) score -= 0.5;

    return {
      score: Math.max(0, Math.round(score * 10) / 10),
      label: 'Code style',
      detail: score >= 8 ? 'Good coding style!' : 'Some style improvements recommended.'
    };
  }

  estimateMaxFunctionLength() {
    let maxLen = 0, current = 0, inFunc = false;
    for (const line of this.lines) {
      const t = line.trim();
      if (/\b(def |function |public |private |protected )/.test(t)) {
        if (inFunc) maxLen = Math.max(maxLen, current);
        inFunc = true; current = 0;
      }
      if (inFunc) current++;
    }
    if (inFunc) maxLen = Math.max(maxLen, current);
    return maxLen;
  }

  getGrade(score) {
    if (score >= 9) return 'A+';
    if (score >= 8) return 'A';
    if (score >= 7) return 'B+';
    if (score >= 6) return 'B';
    if (score >= 5) return 'C';
    if (score >= 4) return 'D';
    return 'F';
  }

  getFeedback(score) {
    if (score >= 9) return 'Excellent! Your code is highly efficient and well-structured.';
    if (score >= 7) return 'Good job! Minor improvements could make this code even better.';
    if (score >= 5) return 'Decent code, but there are significant optimization opportunities.';
    if (score >= 3) return 'Needs work. Consider refactoring for better performance.';
    return 'Critical issues detected. Major refactoring recommended.';
  }
}
module.exports = EfficiencyRater;
