function buildBundleSummaryPrompt(ticker, markets) {
  const marketList = markets
    .map((m, i) => `${i + 1}. "${m.title}" (current confidence: ${m.confidence}%)`)
    .join('\n');

  return [
    {
      role: 'user',
      content: `You are a financial educator explaining an investment strategy to a beginner investor who is new to both stocks and prediction markets.

A user holds stock in "${ticker}" and has selected the following prediction markets as part of a hedging bundle (like a personal index fund):

${marketList}

Write a short, beginner-friendly summary (under 100 words, plain text, no markdown or tables) that:
- Says what "${ticker}" does in one sentence
- Briefly explains how each market connects to the stock
- Explains why this bundle hedges risk

Use plain English. No jargon without a brief explanation. Be concise.`
    }
  ];
}

module.exports = { buildBundleSummaryPrompt };
