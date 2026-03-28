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
  const match = responseText.match(/\[[\s\S]*?\]/);
  if (!match) {
    throw new Error('Failed to parse keywords from K2Think response');
  }
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Failed to parse keywords from K2Think response');
    }
    return parsed;
  } catch (e) {
    if (e.message.startsWith('Failed to parse keywords')) throw e;
    throw new Error('Failed to parse keywords from K2Think response');
  }
}

module.exports = { buildKeywordsPrompt, parseKeywordsResponse };
