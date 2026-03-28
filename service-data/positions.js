const { parse } = require("csv-parse/sync");
const ExcelJS = require("exceljs");

/**
 * Validate and normalize a single manually-entered position.
 * Input shape: { ticker, shares, averageCost? }
 * Returns normalized position or throws on invalid input.
 */
function normalizeManualPosition(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Position must be an object");

  const ticker = (raw.ticker || raw.symbol || "").toString().trim().toUpperCase();
  if (!ticker) throw new Error("Each position requires a ticker/symbol");

  const shares = parseFloat(raw.shares ?? raw.quantity ?? 0);
  if (isNaN(shares) || shares < 0) throw new Error(`Invalid shares for ${ticker}`);

  const averageCost = raw.averageCost != null ? parseFloat(raw.averageCost) : null;

  return { ticker, shares, averageCost: isNaN(averageCost) ? null : averageCost };
}

/**
 * Parse a Robinhood CSV export (or generic stock CSV) into positions.
 *
 * Robinhood CSV columns (as of 2024):
 *   Name, Symbol, Shares, Average Cost, Equity, Percent Change, Equity Change, Type, Currency
 *
 * We also accept generic CSVs with headers: symbol/ticker, shares/quantity, averageCost/average_cost/avg_cost/price
 */
function parseCSV(buffer) {
  const text = buffer.toString("utf-8").trim();

  // Remove BOM if present
  const cleaned = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const rows = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows.map(parseRow).filter(Boolean);
}

/**
 * Parse a Robinhood or generic Excel file into positions.
 * ExcelJS reads streams, so we use a buffer-based workaround via the xlsx loader.
 */
async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Excel file contains no sheets");

  const rows = [];
  let headers = null;

  sheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // ExcelJS row.values is 1-indexed with a leading undefined
    if (rowNumber === 1) {
      headers = values.map((v) => (v != null ? v.toString() : ""));
    } else {
      if (!headers) return;
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] != null ? values[i].toString() : "";
      });
      rows.push(obj);
    }
  });

  return rows.map(parseRow).filter(Boolean);
}

/**
 * Map a raw CSV/Excel row (with arbitrary header names) to a position.
 * Returns null for rows that can't be interpreted as a position (e.g. totals rows).
 */
function parseRow(row) {
  // Normalize keys: lowercase + strip spaces/underscores for fuzzy matching
  const norm = {};
  for (const [k, v] of Object.entries(row)) {
    norm[k.toLowerCase().replace(/[\s_]/g, "")] = v;
  }

  // Ticker: "symbol", "ticker", "instrument" (brokerage CSV format)
  const ticker = (norm["symbol"] || norm["ticker"] || norm["instrument"] || "").toString().trim().toUpperCase();
  if (!ticker || ticker.length > 10) return null; // skip totals/empty rows

  // Company name: "description", "name", "companyname"
  const name = (norm["description"] || norm["name"] || norm["companyname"] || "").toString().trim() || null;

  // Shares: "shares", "quantity", "qty"
  const sharesRaw = norm["shares"] || norm["quantity"] || norm["qty"] || "0";
  const shares = parseFloat(sharesRaw.toString().replace(/,/g, ""));
  if (isNaN(shares) || shares <= 0) return null;

  // Average cost: "averagecost", "avgcost", "averageprice", "price", "costbasis"
  const costRaw =
    norm["averagecost"] ||
    norm["avgcost"] ||
    norm["averageprice"] ||
    norm["costbasis"] ||
    norm["price"] ||
    null;
  let averageCost = null;
  if (costRaw != null) {
    averageCost = parseFloat(costRaw.toString().replace(/[$,]/g, ""));
    if (isNaN(averageCost)) averageCost = null;
  }

  return { ticker, name, shares, averageCost };
}

/**
 * Enrich a list of parsed positions with live Yahoo Finance quote data.
 * Adds: name, currentPrice, marketValue, gainLoss, gainLossPercent, changePercent, marketCap, etc.
 */
function enrichPositions(positions, quoteMap) {
  return positions.map((pos) => {
    const quote = quoteMap[pos.ticker] || null;
    const currentPrice = quote?.currentPrice ?? null;

    let marketValue = null;
    let gainLoss = null;
    let gainLossPercent = null;

    if (currentPrice != null && pos.shares != null) {
      marketValue = Math.round(currentPrice * pos.shares * 100) / 100;
    }

    if (currentPrice != null && pos.averageCost != null && pos.shares != null) {
      gainLoss = Math.round((currentPrice - pos.averageCost) * pos.shares * 100) / 100;
      gainLossPercent =
        Math.round(((currentPrice - pos.averageCost) / pos.averageCost) * 10000) / 100;
    }

    return {
      ticker: pos.ticker,
      shares: pos.shares,
      averageCost: pos.averageCost,
      name: quote?.name || pos.name || pos.ticker,
      currentPrice,
      marketValue,
      gainLoss,
      gainLossPercent,
      changePercent: quote?.changePercent ?? null,
      marketCap: quote?.marketCap ?? null,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
      currency: quote?.currency || "USD",
    };
  });
}

module.exports = { normalizeManualPosition, parseCSV, parseExcel, enrichPositions };
