const { buildBundleSummaryPrompt } = require('../../prompts/bundle-summary');

describe('buildBundleSummaryPrompt', () => {
  const markets = [
    { title: 'Will Iran war escalate?', confidence: 65 },
    { title: 'Will oil prices exceed $100?', confidence: 42 }
  ];

  test('returns messages array with ticker interpolated', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('LMT');
  });

  test('includes all market titles in prompt', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toContain('Will Iran war escalate?');
    expect(content).toContain('Will oil prices exceed $100?');
  });

  test('includes confidence percentages in prompt', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toContain('65');
    expect(content).toContain('42');
  });

  test('prompt asks for beginner-friendly explanation', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toMatch(/beginner|new investor|simple/i);
  });

  test('prompt asks about hedging', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toMatch(/hedge|hedging|protect/i);
  });
});
