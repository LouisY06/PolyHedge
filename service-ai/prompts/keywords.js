function buildKeywordsPrompt(ticker) {
  return [
    {
      role: 'user',
      content: `You are a financial analyst. Given the stock ticker "${ticker}", identify the company and generate 4 to 6 keywords that represent the major themes, events, and risk factors that affect this company's stock price.

These keywords will be used to search a prediction market platform (like Polymarket) for relevant markets. Choose keywords that are:
- Broad enough to match active prediction markets (e.g., "war" not "Q3 defense contract renewal")
- Tied to macro events, geopolitical risks, industry trends, or regulatory actions
- Relevant to what moves this specific stock

Return ONLY a JSON array of keyword strings. No explanation, no numbering, no markdown. Example format:
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
