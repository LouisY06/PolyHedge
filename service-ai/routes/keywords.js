const express = require('express');
const { callK2Think } = require('../k2think');
const { buildKeywordsPrompt, parseKeywordsResponse } = require('../prompts/keywords');
const { Cache } = require('../cache');

const router = express.Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const keywordsCache = new Cache(SEVEN_DAYS_MS);

router.post('/', async (req, res) => {
  const { ticker } = req.body;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Missing required field: ticker'
    });
  }

  const upperTicker = ticker.toUpperCase().trim();

  const cached = keywordsCache.get(upperTicker);
  if (cached) {
    return res.json({ ticker: upperTicker, keywords: cached });
  }

  try {
    const messages = buildKeywordsPrompt(upperTicker);
    const responseText = await callK2Think(messages);
    const keywords = parseKeywordsResponse(responseText);

    keywordsCache.set(upperTicker, keywords);

    return res.json({ ticker: upperTicker, keywords });
  } catch (error) {
    console.error(`Keywords generation failed for ${upperTicker}:`, error.message);
    return res.status(500).json({
      error: 'AI service unavailable',
      message: 'Unable to generate keywords. Please try again later.'
    });
  }
});

module.exports = router;
module.exports.keywordsCache = keywordsCache;
