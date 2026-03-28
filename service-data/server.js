require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { searchMarketsByKeyword } = require("./polymarket");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/markets", async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: "Missing required query parameter: keyword" });
  }

  try {
    const markets = await searchMarketsByKeyword(keyword.trim());

    if (markets.length === 0) {
      return res.status(200).json({ keyword, markets: [], message: "No active markets found" });
    }

    return res.json({ keyword, markets });
  } catch (err) {
    console.error(`[/markets] Failed for keyword="${keyword}":`, err.message);

    if (err.response) {
      return res.status(502).json({ error: "Upstream Polymarket API error", detail: err.message });
    }
    if (err.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Polymarket API timeout" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`service-data listening on http://localhost:${PORT}`);
});
