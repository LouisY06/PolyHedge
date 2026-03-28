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

Write a clear, beginner-friendly summary that covers:

1. **What the company does** — explain "${ticker}" in simple terms (1-2 sentences)
2. **Why each market relates to the stock** — for each prediction market above, explain the cause-and-effect link to "${ticker}". Include directional reasoning where appropriate (e.g., "historically, defense stocks tend to rise during active conflicts").
3. **Why hedging with these markets is a good idea** — explain what specific risk each market covers, and how betting on these prediction markets can offset potential losses in the stock. Help the user understand why this combination protects them.
4. **How this bundle works together** — frame these selections as a unified strategy. Explain why these pieces complement each other as a hedge.

Use plain English. If you use a financial term, briefly explain it. Keep the total response under 300 words.`
    }
  ];
}

module.exports = { buildBundleSummaryPrompt };
