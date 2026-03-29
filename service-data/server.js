require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { searchMarketsByKeyword, browseMarkets } = require("./polymarket");
const { getQuote, getQuotes } = require("./yahoo-finance");
const {
  normalizeManualPosition,
  parseCSV,
  parseExcel,
  enrichPositions,
} = require("./positions");
const { handler: portfolioMarketsHandler } = require("./routes/portfolio-markets");
const { handler: analyzeHandler } = require("./routes/analyze");
const { handler: authGoogleHandler } = require("./routes/auth-google");

// service-ai routes (mounted directly instead of a separate server)
const keywordsRouter = require("../service-ai/routes/keywords");
const bundleSummaryRouter = require("../service-ai/routes/bundle-summary");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve frontend static build
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(FRONTEND_DIST));

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
// GET /markets/browse?q=&limit=
// Browse/search all active Polymarket markets. No query → top by volume.
// ---------------------------------------------------------------------------
app.get("/markets/browse", async (req, res) => {
  const { q, limit } = req.query;

  try {
    const markets = await browseMarkets({
      query: q || "",
      limit: Math.min(Number(limit) || 100, 500),
    });

    return res.json({
      query: q || null,
      count: markets.length,
      markets,
    });
  } catch (err) {
    console.error(`[/markets/browse] Failed:`, err.message);
    if (err.response) return res.status(502).json({ error: "Upstream Polymarket API error", detail: err.message });
    if (err.code === "ECONNABORTED") return res.status(504).json({ error: "Polymarket API timeout" });
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /markets/for-positions
// Given position tickers, find relevant Polymarket markets and tag each
// with relatedTickers for the frontend.
// Body: { tickers: ["AAPL","TSLA",...], limit?: number }
// ---------------------------------------------------------------------------
app.post("/markets/for-positions", async (req, res) => {
  const { tickers, limit = 5 } = req.body || {};

  if (!Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: "Body must be { tickers: [\"AAPL\",...] }" });
  }

  try {
    const { resolveKeywordsForHolding } = require("./ticker-keywords");
    const seen = new Map(); // marketId → { market, relatedTickers }

    await Promise.all(
      tickers.map(async (ticker) => {
        const t = String(ticker).trim().toUpperCase();
        const keywords = await resolveKeywordsForHolding({ ticker: t, companyName: t });

        for (const kw of keywords) {
          const markets = await searchMarketsByKeyword(kw, { limit });
          for (const m of markets) {
            if (seen.has(m.id)) {
              const entry = seen.get(m.id);
              if (!entry.relatedTickers.includes(t)) entry.relatedTickers.push(t);
            } else {
              seen.set(m.id, { market: m, relatedTickers: [t] });
            }
          }
        }
      })
    );

    // Convert to frontend Market shape with relatedTickers
    const markets = Array.from(seen.values()).map(({ market, relatedTickers }) => ({
      id: market.id,
      title: market.title,
      image: market.image || "",
      confidence: market.probability ?? 50,
      volume: market.volume || 0,
      endDate: market.endDate || "",
      category: inferCategory(market.title),
      url: market.url || "#",
      relatedTickers,
    }));

    // Sort by volume descending
    markets.sort((a, b) => b.volume - a.volume);

    return res.json({ count: markets.length, markets });
  } catch (err) {
    console.error("[/markets/for-positions] Failed:", err.message);
    if (err.response) return res.status(502).json({ error: "Upstream Polymarket API error", detail: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Infer a category from a market title (best-effort heuristic).
 */
function inferCategory(title) {
  const t = title.toLowerCase();
  if (/\b(bitcoin|crypto|ethereum|btc|eth|solana|nft)\b/.test(t)) return "Crypto";
  if (/\b(trump|biden|congress|senate|election|president|democrat|republican|governor)\b/.test(t)) return "Politics";
  if (/\b(ai|gpt|llm|artificial intelligence|machine learning|openai|anthropic)\b/.test(t)) return "AI";
  if (/\b(nba|nfl|nhl|mlb|fifa|ufc|boxing|premier league|world cup)\b/.test(t)) return "Sports";
  if (/\b(fed|interest rate|inflation|gdp|recession|tariff)\b/.test(t)) return "Economics";
  if (/\b(apple|google|nvidia|tesla|microsoft|meta|amazon)\b/.test(t)) return "Tech";
  if (/\b(ipo|stock|market cap|revenue|profit|earnings)\b/.test(t)) return "Business";
  return "Other";
}

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
// POST /analyze — full K2Think pipeline
// ---------------------------------------------------------------------------
app.post("/analyze", analyzeHandler);

// ---------------------------------------------------------------------------
// POST /auth/google — Gmail portfolio import
// ---------------------------------------------------------------------------
app.post("/auth/google", authGoogleHandler);


// ---------------------------------------------------------------------------
// GET /chart?ticker=AAPL
// ---------------------------------------------------------------------------
app.get("/chart", async (req, res) => {
  const { ticker, range = "5d", interval = "15m" } = req.query;
  if (!ticker || !ticker.trim()) {
    return res.status(400).json({ error: "Missing required query parameter: ticker" });
  }
  try {
    const { getChart } = require("./yahoo-finance");
    const data = await getChart(ticker.trim(), { range, interval });
    if (!data) return res.status(404).json({ error: `No chart data for "${ticker}"` });
    return res.json(data);
  } catch (err) {
    console.error(`[/chart] Failed for ticker="${ticker}":`, err.message);
    return res.status(502).json({ error: "Yahoo Finance error", detail: err.message });
  }
});

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

// ---------------------------------------------------------------------------
// service-ai routes
// ---------------------------------------------------------------------------
app.use("/keywords", keywordsRouter);
app.use("/bundle-summary", bundleSummaryRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ---------------------------------------------------------------------------
// Frontend catch-all — serve index.html for client-side routing
// ---------------------------------------------------------------------------
app.get("*", (_req, res, next) => {
  const indexPath = path.join(FRONTEND_DIST, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) next(); // no frontend build yet, fall through
  });
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
