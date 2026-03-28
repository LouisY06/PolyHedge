require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { searchMarketsByKeyword } = require("./polymarket");
const { getQuote, getQuotes } = require("./yahoo-finance");
const {
  normalizeManualPosition,
  parseCSV,
  parseExcel,
  enrichPositions,
} = require("./positions");
const { handler: portfolioMarketsHandler } = require("./routes/portfolio-markets");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Multer: accept CSV and Excel files up to 5 MB, stored in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (allowed.includes(file.mimetype) || ["csv", "xls", "xlsx"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are accepted"));
    }
  },
});

// ---------------------------------------------------------------------------
// GET /markets?keyword=
// ---------------------------------------------------------------------------
app.get("/markets", async (req, res) => {
  const { keyword } = req.query;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: "Missing required query parameter: keyword" });
  }

  try {
    const markets = await searchMarketsByKeyword(keyword.trim());

    return res.json({
      keyword,
      count: markets.length,
      markets,
      ...(markets.length === 0 && { message: "No active markets found" }),
    });
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

// ---------------------------------------------------------------------------
// POST /portfolio-markets
// ---------------------------------------------------------------------------
app.post("/portfolio-markets", portfolioMarketsHandler);

// ---------------------------------------------------------------------------
// GET /quote?ticker=AAPL
// ---------------------------------------------------------------------------
app.get("/quote", async (req, res) => {
  const { ticker } = req.query;
  if (!ticker || !ticker.trim()) {
    return res.status(400).json({ error: "Missing required query parameter: ticker" });
  }

  try {
    const quote = await getQuote(ticker.trim());
    if (!quote) {
      return res.status(404).json({ error: `No data found for ticker "${ticker}"` });
    }
    return res.json(quote);
  } catch (err) {
    console.error(`[/quote] Failed for ticker="${ticker}":`, err.message);
    return res.status(502).json({ error: "Yahoo Finance error", detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /positions/manual
// Body: { positions: [{ ticker, shares, averageCost? }] }
// ---------------------------------------------------------------------------
app.post("/positions/manual", async (req, res) => {
  const raw = req.body?.positions;

  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: "Body must be { positions: [...] } with at least one entry" });
  }

  let parsed;
  try {
    parsed = raw.map(normalizeManualPosition);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const tickers = [...new Set(parsed.map((p) => p.ticker))];
    const quoteMap = await getQuotes(tickers);
    const positions = enrichPositions(parsed, quoteMap);
    return res.json({ positions });
  } catch (err) {
    console.error("[/positions/manual] Yahoo Finance error:", err.message);
    // Return positions without enrichment rather than failing completely
    return res.json({ positions: parsed, warning: "Could not fetch live prices from Yahoo Finance" });
  }
});

// ---------------------------------------------------------------------------
// POST /positions/upload
// Multipart form field name: "file" (CSV or Excel)
// ---------------------------------------------------------------------------
app.post("/positions/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded. Send a CSV or Excel file in the 'file' field." });
  }

  const ext = req.file.originalname.split(".").pop().toLowerCase();
  let parsed;

  try {
    if (ext === "csv" || req.file.mimetype === "text/csv") {
      parsed = parseCSV(req.file.buffer);
    } else if (["xls", "xlsx"].includes(ext)) {
      parsed = await parseExcel(req.file.buffer);
    } else {
      // Try CSV as fallback
      parsed = parseCSV(req.file.buffer);
    }
  } catch (err) {
    return res.status(422).json({ error: "Could not parse file", detail: err.message });
  }

  if (parsed.length === 0) {
    return res.status(422).json({ error: "No valid positions found in the uploaded file" });
  }

  try {
    const tickers = [...new Set(parsed.map((p) => p.ticker))];
    const quoteMap = await getQuotes(tickers);
    const positions = enrichPositions(parsed, quoteMap);
    return res.json({ positions, parsedCount: positions.length });
  } catch (err) {
    console.error("[/positions/upload] Yahoo Finance error:", err.message);
    return res.json({
      positions: parsed,
      parsedCount: parsed.length,
      warning: "Could not fetch live prices from Yahoo Finance",
    });
  }
});

// Multer error handler
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message?.includes("Only CSV")) {
    return res.status(400).json({ error: err.message });
  }
  console.error("[unhandled]", err.message);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`service-data listening on http://localhost:${PORT}`);
});
