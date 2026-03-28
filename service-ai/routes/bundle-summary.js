const express = require('express');
const { callK2Think } = require('../k2think');
const { buildBundleSummaryPrompt } = require('../prompts/bundle-summary');

const router = express.Router();

router.post('/', async (req, res) => {
  const { ticker, markets } = req.body;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Missing required field: ticker'
    });
  }

  if (!markets || !Array.isArray(markets) || markets.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Missing required field: markets (must be a non-empty array)'
    });
  }

  const upperTicker = ticker.toUpperCase().trim();

  try {
    const messages = buildBundleSummaryPrompt(upperTicker, markets);
    const summary = await callK2Think(messages);

    return res.json({ ticker: upperTicker, summary });
  } catch (error) {
    console.error(`Bundle summary failed for ${upperTicker}:`, error.message);
    return res.status(500).json({
      error: 'AI service unavailable',
      message: 'Unable to generate bundle summary. Please try again later.'
    });
  }
});

module.exports = router;
