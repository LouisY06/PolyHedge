const { buildKeywordsPrompt, parseKeywordsResponse } = require('../../prompts/keywords');

describe('buildKeywordsPrompt', () => {
  test('returns messages array with ticker interpolated', () => {
    const messages = buildKeywordsPrompt('LMT');
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('LMT');
  });

  test('prompt asks for JSON array output', () => {
    const messages = buildKeywordsPrompt('AAPL');
    expect(messages[0].content).toContain('JSON');
  });

  test('prompt asks for 4-6 keywords', () => {
    const messages = buildKeywordsPrompt('AAPL');
    const content = messages[0].content;
    expect(content).toMatch(/4.*6|four.*six/i);
  });
});

describe('parseKeywordsResponse', () => {
  test('parses JSON array from response', () => {
    const response = '["war", "defense spending", "oil prices", "geopolitics"]';
    expect(parseKeywordsResponse(response)).toEqual([
      'war', 'defense spending', 'oil prices', 'geopolitics'
    ]);
  });

  test('extracts JSON array embedded in text', () => {
    const response = 'Here are the keywords:\n["tech", "earnings", "regulation"]\nThese are relevant.';
    expect(parseKeywordsResponse(response)).toEqual([
      'tech', 'earnings', 'regulation'
    ]);
  });

  test('throws on unparseable response', () => {
    expect(() => parseKeywordsResponse('no json here')).toThrow('Failed to parse keywords');
  });
});
