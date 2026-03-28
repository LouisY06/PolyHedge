function buildKeywordsPrompt(ticker) {
  return [
    {
      role: 'user',
      content: `You are a financial analyst. Given the stock ticker "${ticker}", generate 4 to 6 single-word keywords that represent the major themes and risk factors that affect this company's stock price.

Rules:
- Each keyword must be exactly ONE word (e.g., "war", "oil", "tariffs", "inflation", "semiconductors")
- Never use multi-word phrases
- Keywords will be used to search Polymarket for prediction markets
- Choose words tied to macro events, geopolitics, industry trends, or regulations that move this stock

Return ONLY a JSON array of single-word strings. No explanation, no markdown.
["keyword1", "keyword2", "keyword3", "keyword4"]`
    }
  ];
}

function parseKeywordsResponse(responseText) {
  // K2Think is a "thinking" model that outputs chain-of-thought reasoning
  // before the final answer. Find all JSON arrays and try from the last one
  // (most likely to be the final answer).
  const matches = responseText.match(/\[[^\[\]]*\]/g);
  if (!matches) {
    throw new Error('Failed to parse keywords from K2Think response');
  }
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(matches[i]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(k => typeof k === 'string')) {
        return parsed;
      }
    } catch (e) {
      // not valid JSON, try next
    }
  }
  throw new Error('Failed to parse keywords from K2Think response');
}

module.exports = { buildKeywordsPrompt, parseKeywordsResponse };
