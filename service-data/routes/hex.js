const { runAndWait } = require("../hex");

async function handler(req, res) {
  const { holdings, markets } = req.body;

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ error: "Missing required field: holdings" });
  }

  const projectId = process.env.HEX_PROJECT_ID;
  if (!projectId || projectId === "PLACEHOLDER") {
    return res.status(503).json({ error: "Hex project not configured" });
  }

  try {
    const inputParams = {
      holdings_json: JSON.stringify(holdings),
      markets_json: JSON.stringify(markets || []),
    };

    const result = await runAndWait(projectId, inputParams);
    return res.json(result);
  } catch (err) {
    console.error("[/hex/run] Error:", err.message);

    if (err.message.includes("timed out")) {
      return res.status(504).json({ error: "Backtest timed out", detail: err.message });
    }
    if (err.message.includes("ERRORED")) {
      return res.status(502).json({ error: "Backtest failed", detail: err.message });
    }

    return res.status(500).json({ error: "Failed to run backtest", detail: err.message });
  }
}

module.exports = { handler };
