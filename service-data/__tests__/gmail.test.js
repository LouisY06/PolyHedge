const { parseTradeEmails, computeNetPositions } = require("../gmail");

// ---------------------------------------------------------------------------
// parseTradeEmails
// ---------------------------------------------------------------------------

describe("parseTradeEmails", () => {
  test('parses "You bought 10 shares of AAPL at $175.50"', () => {
    const trades = parseTradeEmails([
      { subject: "Your order has been executed", body: "You bought 10 shares of AAPL at $175.50" },
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ action: "buy", ticker: "AAPL", shares: 10, price: 175.50 });
  });

  test('parses "You sold 5 shares of TSLA at $242.30"', () => {
    const trades = parseTradeEmails([
      { subject: "", body: "You sold 5 shares of TSLA at $242.30" },
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ action: "sell", ticker: "TSLA", shares: 5, price: 242.30 });
  });

  test('parses "market order to buy 3 shares of MSFT was executed at $415.20"', () => {
    const trades = parseTradeEmails([
      { subject: "", body: "Your market order to buy 3 shares of MSFT was executed at $415.20" },
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ action: "buy", ticker: "MSFT", shares: 3, price: 415.20 });
  });

  test('parses "limit order to sell 20 shares of NVDA was executed at $890.00"', () => {
    const trades = parseTradeEmails([
      { subject: "", body: "Your limit order to sell 20 shares of NVDA was executed at $890.00" },
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ action: "sell", ticker: "NVDA", shares: 20, price: 890.00 });
  });

  test("parses multiple trades from multiple emails", () => {
    const emails = [
      { subject: "Order executed", body: "You bought 10 shares of AAPL at $175.50" },
      { subject: "Order executed", body: "You sold 5 shares of TSLA at $242.30" },
      { subject: "Order executed", body: "Your market order to buy 3 shares of MSFT was executed at $415.20" },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toHaveLength(3);
    expect(trades.map((t) => t.ticker)).toEqual(["AAPL", "TSLA", "MSFT"]);
  });

  test("ignores emails with no trade info (welcome emails, dividends)", () => {
    const emails = [
      { subject: "Welcome to Robinhood!", body: "Thanks for signing up. Start investing today." },
      { subject: "Dividend received", body: "You received a $1.23 dividend from AAPL." },
      { subject: "Account statement", body: "Your monthly statement is ready to view." },
    ];
    const trades = parseTradeEmails(emails);
    expect(trades).toHaveLength(0);
  });

  test('handles fractional shares ("0.5 shares of AMZN at $3,400.00")', () => {
    const trades = parseTradeEmails([
      { subject: "", body: "You bought 0.5 shares of AMZN at $3,400.00" },
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toEqual({ action: "buy", ticker: "AMZN", shares: 0.5, price: 3400.00 });
  });
});

// ---------------------------------------------------------------------------
// computeNetPositions
// ---------------------------------------------------------------------------

describe("computeNetPositions", () => {
  test("computes net positions from buys and sells (10 @ 175, 5 @ 180, sell 3 = 12 shares, avg 176.67)", () => {
    const trades = [
      { action: "buy", ticker: "AAPL", shares: 10, price: 175 },
      { action: "buy", ticker: "AAPL", shares: 5, price: 180 },
      { action: "sell", ticker: "AAPL", shares: 3, price: 200 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toHaveLength(1);
    expect(positions[0].ticker).toBe("AAPL");
    expect(positions[0].shares).toBe(12);
    expect(positions[0].averageCost).toBe(176.67);
  });

  test("excludes fully sold positions", () => {
    const trades = [
      { action: "buy", ticker: "TSLA", shares: 5, price: 250 },
      { action: "sell", ticker: "TSLA", shares: 5, price: 300 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toHaveLength(0);
  });

  test("handles multiple tickers", () => {
    const trades = [
      { action: "buy", ticker: "AAPL", shares: 10, price: 175 },
      { action: "buy", ticker: "MSFT", shares: 4, price: 400 },
      { action: "sell", ticker: "AAPL", shares: 2, price: 200 },
    ];
    const positions = computeNetPositions(trades);
    expect(positions).toHaveLength(2);
    const aaplPos = positions.find((p) => p.ticker === "AAPL");
    const msftPos = positions.find((p) => p.ticker === "MSFT");
    expect(aaplPos).toBeDefined();
    expect(aaplPos.shares).toBe(8);
    expect(msftPos).toBeDefined();
    expect(msftPos.shares).toBe(4);
  });

  test("returns empty array for no trades", () => {
    const positions = computeNetPositions([]);
    expect(positions).toEqual([]);
  });
});
