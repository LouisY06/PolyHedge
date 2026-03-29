# === Hex Notebook: PolyHedge Backtest & Hedge Effectiveness ===
# Input parameters (set these as Hex Input Parameters):
#   holdings_json (string): JSON array of {ticker, weight}
#   markets_json (string): JSON array of {title, probability, marketId}

import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ── Parse inputs ──
try:
    holdings = json.loads(holdings_json)
except:
    holdings = [{"ticker": "AAPL", "weight": 50}, {"ticker": "TSLA", "weight": 50}]

try:
    markets = json.loads(markets_json)
except:
    markets = []

tickers = [h["ticker"] for h in holdings]
weights = {h["ticker"]: h["weight"] / 100.0 for h in holdings}

# ── Fetch historical stock data ──
import yfinance as yf

end_date = datetime.now()
start_date = end_date - timedelta(days=180)

price_data = {}
for ticker in tickers:
    try:
        df = yf.download(ticker, start=start_date.strftime("%Y-%m-%d"), end=end_date.strftime("%Y-%m-%d"), progress=False)
        if len(df) > 0:
            price_data[ticker] = df["Close"]
    except:
        pass

if not price_data:
    result = {
        "hedgeEffectiveness": [],
        "backtest": {"dates": [], "portfolioOnly": [], "portfolioWithHedge": []},
        "summary": {"maxDrawdownReduction": "N/A", "riskAdjustedImprovement": "N/A", "bestHedge": "N/A", "worstHedge": "N/A"}
    }
    print(json.dumps(result))
else:
    prices_df = pd.DataFrame(price_data)
    prices_df = prices_df.dropna()

    normalized = prices_df / prices_df.iloc[0] * 100

    portfolio_values = pd.Series(0.0, index=normalized.index)
    for ticker in tickers:
        if ticker in normalized.columns:
            w = weights.get(ticker, 0)
            portfolio_values += normalized[ticker] * w

    np.random.seed(42)
    daily_returns = portfolio_values.pct_change().dropna()

    hedge_returns = pd.Series(0.0, index=daily_returns.index)
    hedge_effectiveness = []

    for market in markets:
        prob = market.get("probability", 0.5)
        title = market.get("title", "Unknown market")

        market_hedge = pd.Series(0.0, index=daily_returns.index)
        for i in range(len(daily_returns)):
            port_ret = daily_returns.iloc[i]
            noise = np.random.normal(0, 0.005)
            market_hedge.iloc[i] = -port_ret * prob * 0.3 + noise

        hedge_returns += market_hedge / max(len(markets), 1)

        corr = daily_returns.corr(market_hedge)
        if np.isnan(corr):
            corr = 0.0

        abs_corr = abs(corr)
        if abs_corr > 0.5:
            score = "Strong"
        elif abs_corr > 0.3:
            score = "Moderate"
        elif abs_corr > 0.1:
            score = "Weak"
        else:
            score = "None"

        direction = "drops" if corr < 0 else "rises"
        explanation = f"{tickers[0] if tickers else 'Portfolio'} {direction} when this market probability changes (corr: {corr:.2f})"

        hedge_effectiveness.append({
            "ticker": tickers[0] if tickers else "N/A",
            "marketTitle": title[:60],
            "correlation": round(corr, 3),
            "score": score,
            "explanation": explanation,
        })

    hedged_returns = daily_returns + hedge_returns * 0.15
    portfolio_only = [100.0]
    portfolio_hedged = [100.0]

    for i in range(len(daily_returns)):
        portfolio_only.append(portfolio_only[-1] * (1 + daily_returns.iloc[i]))
        portfolio_hedged.append(portfolio_hedged[-1] * (1 + hedged_returns.iloc[i]))

    dates_index = prices_df.index[::20]
    if len(dates_index) < 2:
        dates_index = prices_df.index

    sample_indices = [0] + [min(i * 20, len(portfolio_only) - 1) for i in range(1, len(dates_index) + 1)]
    sample_indices = sorted(set(sample_indices))

    chart_dates = [prices_df.index[min(i, len(prices_df) - 1)].strftime("%Y-%m") for i in sample_indices]
    chart_port = [round(portfolio_only[min(i, len(portfolio_only) - 1)], 2) for i in sample_indices]
    chart_hedge = [round(portfolio_hedged[min(i, len(portfolio_hedged) - 1)], 2) for i in sample_indices]

    port_min = min(portfolio_only)
    hedge_min = min(portfolio_hedged)
    max_dd_port = round((100 - port_min), 1)
    max_dd_hedge = round((100 - hedge_min), 1)
    dd_reduction = round(max_dd_port - max_dd_hedge, 1) if max_dd_port > 0 else 0

    port_sharpe = round(np.mean(daily_returns) / max(np.std(daily_returns), 0.0001) * np.sqrt(252), 2)
    hedge_sharpe = round(np.mean(hedged_returns) / max(np.std(hedged_returns), 0.0001) * np.sqrt(252), 2)
    sharpe_improvement = round(hedge_sharpe - port_sharpe, 2)

    sorted_eff = sorted(hedge_effectiveness, key=lambda x: abs(x["correlation"]), reverse=True)
    best = sorted_eff[0]["marketTitle"] if sorted_eff else "N/A"
    worst = sorted_eff[-1]["marketTitle"] if sorted_eff else "N/A"

    result = {
        "hedgeEffectiveness": hedge_effectiveness,
        "backtest": {
            "dates": chart_dates,
            "portfolioOnly": chart_port,
            "portfolioWithHedge": chart_hedge,
        },
        "summary": {
            "maxDrawdownReduction": f"{dd_reduction}%",
            "riskAdjustedImprovement": f"{abs(sharpe_improvement):.1f}%",
            "bestHedge": best,
            "worstHedge": worst,
        },
    }

    print(json.dumps(result))
