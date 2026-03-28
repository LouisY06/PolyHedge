# Service-AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Express.js service that wraps K2ThinkV2 to generate stock-related keywords and beginner-friendly hedge bundle summaries.

**Architecture:** Direct fetch() calls to K2Think's OpenAI-compatible API. Prompts as pure functions, in-memory TTL cache for keywords, Express routes for two POST endpoints. No cross-service communication — frontend orchestrates.

**Tech Stack:** Node.js 18+, Express, dotenv, Jest for testing

---

## File Map

| File | Responsibility |
|---|---|
| `service-ai/package.json` | Dependencies, scripts |
| `service-ai/.env` | K2THINK_API_KEY (gitignored) |
| `service-ai/.gitignore` | Ignore node_modules, .env |
| `service-ai/server.js` | Express app setup, mount routes, listen on 3002 |
| `service-ai/k2think.js` | fetch() wrapper — auth, retries, timeout |
| `service-ai/cache.js` | In-memory Map with TTL |
| `service-ai/prompts/keywords.js` | Prompt template: ticker → keywords |
| `service-ai/prompts/bundle-summary.js` | Prompt template: ticker + markets → summary |
| `service-ai/routes/keywords.js` | POST /keywords handler |
| `service-ai/routes/bundle-summary.js` | POST /bundle-summary handler |
| `service-ai/__tests__/cache.test.js` | Cache unit tests |
| `service-ai/__tests__/prompts/keywords.test.js` | Keywords prompt unit tests |
| `service-ai/__tests__/prompts/bundle-summary.test.js` | Bundle summary prompt unit tests |
| `service-ai/__tests__/k2think.test.js` | K2Think client unit tests (mocked fetch) |
| `service-ai/__tests__/routes/keywords.test.js` | Keywords route integration tests |
| `service-ai/__tests__/routes/bundle-summary.test.js` | Bundle summary route integration tests |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `service-ai/package.json`
- Create: `service-ai/.env`
- Create: `service-ai/.gitignore`
- Create: `service-ai/server.js`

- [ ] **Step 1: Initialize package.json**

```bash
cd service-ai
npm init -y
```

Then edit `service-ai/package.json` to set:

```json
{
  "name": "service-ai",
  "version": "1.0.0",
  "description": "K2Think LLM service for keyword generation and bundle summaries",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "keywords": [],
  "license": "ISC"
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd service-ai
npm install express dotenv
npm install --save-dev jest
```

- [ ] **Step 3: Create .gitignore**

Write `service-ai/.gitignore`:

```
node_modules/
.env
```

- [ ] **Step 4: Create .env**

Write `service-ai/.env`:

```
K2THINK_API_KEY=IFM-iyQEUagzfT7CnOao
PORT=3002
```

- [ ] **Step 5: Create minimal server.js**

Write `service-ai/server.js`:

```js
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
```

- [ ] **Step 6: Verify server starts**

```bash
cd service-ai
node server.js &
curl http://localhost:3002/health
# Expected: {"status":"ok"}
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add service-ai/package.json service-ai/package-lock.json service-ai/.gitignore service-ai/server.js
git commit -m "feat(service-ai): scaffold Express server on port 3002"
```

---

### Task 2: Cache Module

**Files:**
- Create: `service-ai/cache.js`
- Create: `service-ai/__tests__/cache.test.js`

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/cache.test.js`:

```js
const { Cache } = require('../cache');

describe('Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new Cache(1000); // 1 second TTL for testing
  });

  test('get returns null for missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  test('set and get returns cached value', () => {
    cache.set('AAPL', ['tech', 'earnings']);
    expect(cache.get('AAPL')).toEqual(['tech', 'earnings']);
  });

  test('returns null for expired entry', async () => {
    cache = new Cache(50); // 50ms TTL
    cache.set('AAPL', ['tech']);
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(cache.get('AAPL')).toBeNull();
  });

  test('clear removes all entries', () => {
    cache.set('AAPL', ['tech']);
    cache.set('LMT', ['defense']);
    cache.clear();
    expect(cache.get('AAPL')).toBeNull();
    expect(cache.get('LMT')).toBeNull();
  });

  test('set overwrites existing entry', () => {
    cache.set('AAPL', ['tech']);
    cache.set('AAPL', ['tech', 'AI']);
    expect(cache.get('AAPL')).toEqual(['tech', 'AI']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd service-ai
npx jest __tests__/cache.test.js
# Expected: FAIL — Cannot find module '../cache'
```

- [ ] **Step 3: Implement cache.js**

Write `service-ai/cache.js`:

```js
class Cache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.store.clear();
  }
}

module.exports = { Cache };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/cache.test.js
# Expected: PASS — 5 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add service-ai/cache.js service-ai/__tests__/cache.test.js
git commit -m "feat(service-ai): add in-memory cache with TTL"
```

---

### Task 3: K2Think Client

**Files:**
- Create: `service-ai/k2think.js`
- Create: `service-ai/__tests__/k2think.test.js`

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/k2think.test.js`:

```js
const { callK2Think } = require('../k2think');

// Mock global fetch
global.fetch = jest.fn();

describe('callK2Think', () => {
  beforeEach(() => {
    fetch.mockReset();
    process.env.K2THINK_API_KEY = 'test-key';
  });

  test('sends correct request and returns content', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello world' } }]
      })
    });

    const messages = [{ role: 'user', content: 'hi' }];
    const result = await callK2Think(messages);

    expect(result).toBe('hello world');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.k2think.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer test-key'
        },
        body: JSON.stringify({
          model: 'MBZUAI-IFM/K2-Think-v2',
          messages,
          stream: false
        })
      })
    );
  });

  test('retries on failure and succeeds', async () => {
    fetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'recovered' } }]
        })
      });

    const result = await callK2Think([{ role: 'user', content: 'hi' }]);
    expect(result).toBe('recovered');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    fetch.mockRejectedValue(new Error('network error'));

    await expect(
      callK2Think([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('K2Think API failed after 3 attempts');

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('throws on non-ok HTTP response after retries', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(
      callK2Think([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('K2Think API failed after 3 attempts');

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('throws if response has no choices', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] })
    });

    await expect(
      callK2Think([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('K2Think returned empty response');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd service-ai
npx jest __tests__/k2think.test.js
# Expected: FAIL — Cannot find module '../k2think'
```

- [ ] **Step 3: Implement k2think.js**

Write `service-ai/k2think.js`:

```js
const K2THINK_URL = 'https://api.k2think.ai/v1/chat/completions';
const K2THINK_MODEL = 'MBZUAI-IFM/K2-Think-v2';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callK2Think(messages) {
  const apiKey = process.env.K2THINK_API_KEY;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(K2THINK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: K2THINK_MODEL,
          messages,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('K2Think returned empty response');
      }

      return data.choices[0].message.content;
    } catch (error) {
      lastError = error;
      if (error.message === 'K2Think returned empty response') {
        throw error;
      }
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw new Error(`K2Think API failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

module.exports = { callK2Think };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/k2think.test.js
# Expected: PASS — 5 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add service-ai/k2think.js service-ai/__tests__/k2think.test.js
git commit -m "feat(service-ai): add K2Think API client with retry logic"
```

---

### Task 4: Keywords Prompt Template

**Files:**
- Create: `service-ai/prompts/keywords.js`
- Create: `service-ai/__tests__/prompts/keywords.test.js`

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/prompts/keywords.test.js`:

```js
const { buildKeywordsPrompt, parseKeywordsResponse } = require('../../prompts/keywords');

describe('buildKeywordsPrompt', () => {
  test('returns messages array with ticker interpolated', () => {
    const messages = buildKeywordsPrompt('LMT');
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('LMT');
  });

  test('prompt asks for JSON array output', () => {
    const messages = buildKeywordsPrompt('AAPL');
    expect(messages[0].content).toContain('JSON');
  });

  test('prompt asks for 4-6 keywords', () => {
    const messages = buildKeywordsPrompt('AAPL');
    const content = messages[0].content;
    expect(content).toMatch(/4.*6|four.*six/i);
  });
});

describe('parseKeywordsResponse', () => {
  test('parses JSON array from response', () => {
    const response = '["war", "defense spending", "oil prices", "geopolitics"]';
    expect(parseKeywordsResponse(response)).toEqual([
      'war', 'defense spending', 'oil prices', 'geopolitics'
    ]);
  });

  test('extracts JSON array embedded in text', () => {
    const response = 'Here are the keywords:\n["tech", "earnings", "regulation"]\nThese are relevant.';
    expect(parseKeywordsResponse(response)).toEqual([
      'tech', 'earnings', 'regulation'
    ]);
  });

  test('throws on unparseable response', () => {
    expect(() => parseKeywordsResponse('no json here')).toThrow('Failed to parse keywords');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd service-ai
npx jest __tests__/prompts/keywords.test.js
# Expected: FAIL — Cannot find module '../../prompts/keywords'
```

- [ ] **Step 3: Implement prompts/keywords.js**

Write `service-ai/prompts/keywords.js`:

```js
function buildKeywordsPrompt(ticker) {
  return [
    {
      role: 'user',
      content: `You are a financial analyst. Given the stock ticker "${ticker}", identify the company and generate 4 to 6 keywords that represent the major themes, events, and risk factors that affect this company's stock price.

These keywords will be used to search a prediction market platform (like Polymarket) for relevant markets. Choose keywords that are:
- Broad enough to match active prediction markets (e.g., "war" not "Q3 defense contract renewal")
- Tied to macro events, geopolitical risks, industry trends, or regulatory actions
- Relevant to what moves this specific stock

Return ONLY a JSON array of keyword strings. No explanation, no numbering, no markdown. Example format:
["keyword1", "keyword2", "keyword3", "keyword4"]`
    }
  ];
}

function parseKeywordsResponse(responseText) {
  const match = responseText.match(/\[[\s\S]*?\]/);
  if (!match) {
    throw new Error('Failed to parse keywords from K2Think response');
  }
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Failed to parse keywords from K2Think response');
    }
    return parsed;
  } catch (e) {
    if (e.message.startsWith('Failed to parse keywords')) throw e;
    throw new Error('Failed to parse keywords from K2Think response');
  }
}

module.exports = { buildKeywordsPrompt, parseKeywordsResponse };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/prompts/keywords.test.js
# Expected: PASS — 6 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add service-ai/prompts/keywords.js service-ai/__tests__/prompts/keywords.test.js
git commit -m "feat(service-ai): add keywords prompt template and parser"
```

---

### Task 5: Bundle Summary Prompt Template

**Files:**
- Create: `service-ai/prompts/bundle-summary.js`
- Create: `service-ai/__tests__/prompts/bundle-summary.test.js`

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/prompts/bundle-summary.test.js`:

```js
const { buildBundleSummaryPrompt } = require('../../prompts/bundle-summary');

describe('buildBundleSummaryPrompt', () => {
  const markets = [
    { title: 'Will Iran war escalate?', confidence: 65 },
    { title: 'Will oil prices exceed $100?', confidence: 42 }
  ];

  test('returns messages array with ticker interpolated', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('LMT');
  });

  test('includes all market titles in prompt', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toContain('Will Iran war escalate?');
    expect(content).toContain('Will oil prices exceed $100?');
  });

  test('includes confidence percentages in prompt', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toContain('65');
    expect(content).toContain('42');
  });

  test('prompt asks for beginner-friendly explanation', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toMatch(/beginner|new investor|simple/i);
  });

  test('prompt asks about hedging', () => {
    const messages = buildBundleSummaryPrompt('LMT', markets);
    const content = messages[0].content;
    expect(content).toMatch(/hedge|hedging|protect/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd service-ai
npx jest __tests__/prompts/bundle-summary.test.js
# Expected: FAIL — Cannot find module '../../prompts/bundle-summary'
```

- [ ] **Step 3: Implement prompts/bundle-summary.js**

Write `service-ai/prompts/bundle-summary.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/prompts/bundle-summary.test.js
# Expected: PASS — 5 tests passed
```

- [ ] **Step 5: Commit**

```bash
git add service-ai/prompts/bundle-summary.js service-ai/__tests__/prompts/bundle-summary.test.js
git commit -m "feat(service-ai): add bundle summary prompt template"
```

---

### Task 6: Keywords Route

**Files:**
- Create: `service-ai/routes/keywords.js`
- Create: `service-ai/__tests__/routes/keywords.test.js`
- Modify: `service-ai/server.js` — mount the route

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/routes/keywords.test.js`:

```js
const request = require('supertest');
const app = require('../server');
const { callK2Think } = require('../k2think');
const { Cache } = require('../cache');

jest.mock('../k2think');

describe('POST /keywords', () => {
  beforeEach(() => {
    callK2Think.mockReset();
    // Clear the cache between tests
    const { keywordsCache } = require('../routes/keywords');
    keywordsCache.clear();
  });

  test('returns keywords for a valid ticker', async () => {
    callK2Think.mockResolvedValueOnce('["war", "defense", "oil", "geopolitics"]');

    const res = await request(app)
      .post('/keywords')
      .send({ ticker: 'LMT' });

    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe('LMT');
    expect(res.body.keywords).toEqual(['war', 'defense', 'oil', 'geopolitics']);
  });

  test('returns 400 when ticker is missing', async () => {
    const res = await request(app)
      .post('/keywords')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request');
  });

  test('returns cached result on second call', async () => {
    callK2Think.mockResolvedValueOnce('["tech", "earnings"]');

    await request(app).post('/keywords').send({ ticker: 'AAPL' });
    const res = await request(app).post('/keywords').send({ ticker: 'AAPL' });

    expect(res.status).toBe(200);
    expect(res.body.keywords).toEqual(['tech', 'earnings']);
    expect(callK2Think).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when K2Think fails', async () => {
    callK2Think.mockRejectedValueOnce(new Error('API down'));

    const res = await request(app)
      .post('/keywords')
      .send({ ticker: 'LMT' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('AI service unavailable');
  });
});
```

- [ ] **Step 2: Install supertest and run tests to verify they fail**

```bash
cd service-ai
npm install --save-dev supertest
npx jest __tests__/routes/keywords.test.js
# Expected: FAIL — Cannot find module '../routes/keywords'
```

- [ ] **Step 3: Implement routes/keywords.js**

Write `service-ai/routes/keywords.js`:

```js
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
```

- [ ] **Step 4: Mount the route in server.js**

Update `service-ai/server.js` to:

```js
const express = require('express');
require('dotenv').config();

const keywordsRouter = require('./routes/keywords');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/keywords', keywordsRouter);

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/routes/keywords.test.js
# Expected: PASS — 4 tests passed
```

- [ ] **Step 6: Commit**

```bash
git add service-ai/routes/keywords.js service-ai/__tests__/routes/keywords.test.js service-ai/server.js
git commit -m "feat(service-ai): add POST /keywords route with caching"
```

---

### Task 7: Bundle Summary Route

**Files:**
- Create: `service-ai/routes/bundle-summary.js`
- Create: `service-ai/__tests__/routes/bundle-summary.test.js`
- Modify: `service-ai/server.js` — mount the route

- [ ] **Step 1: Write the failing tests**

Write `service-ai/__tests__/routes/bundle-summary.test.js`:

```js
const request = require('supertest');
const app = require('../server');
const { callK2Think } = require('../k2think');

jest.mock('../k2think');

describe('POST /bundle-summary', () => {
  beforeEach(() => {
    callK2Think.mockReset();
  });

  const validBody = {
    ticker: 'LMT',
    markets: [
      { title: 'Will Iran war escalate?', confidence: 65 },
      { title: 'Will oil prices exceed $100?', confidence: 42 }
    ]
  };

  test('returns summary for valid input', async () => {
    callK2Think.mockResolvedValueOnce('Lockheed Martin earns most of its revenue from defense contracts...');

    const res = await request(app)
      .post('/bundle-summary')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.ticker).toBe('LMT');
    expect(res.body.summary).toContain('Lockheed Martin');
  });

  test('returns 400 when ticker is missing', async () => {
    const res = await request(app)
      .post('/bundle-summary')
      .send({ markets: validBody.markets });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request');
  });

  test('returns 400 when markets is missing', async () => {
    const res = await request(app)
      .post('/bundle-summary')
      .send({ ticker: 'LMT' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request');
  });

  test('returns 400 when markets is empty', async () => {
    const res = await request(app)
      .post('/bundle-summary')
      .send({ ticker: 'LMT', markets: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request');
  });

  test('returns 500 when K2Think fails', async () => {
    callK2Think.mockRejectedValueOnce(new Error('API down'));

    const res = await request(app)
      .post('/bundle-summary')
      .send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('AI service unavailable');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd service-ai
npx jest __tests__/routes/bundle-summary.test.js
# Expected: FAIL — Cannot find module '../routes/bundle-summary' or route not mounted
```

- [ ] **Step 3: Implement routes/bundle-summary.js**

Write `service-ai/routes/bundle-summary.js`:

```js
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
```

- [ ] **Step 4: Mount the route in server.js**

Update `service-ai/server.js` to:

```js
const express = require('express');
require('dotenv').config();

const keywordsRouter = require('./routes/keywords');
const bundleSummaryRouter = require('./routes/bundle-summary');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/keywords', keywordsRouter);
app.use('/bundle-summary', bundleSummaryRouter);

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd service-ai
npx jest __tests__/routes/bundle-summary.test.js
# Expected: PASS — 5 tests passed
```

- [ ] **Step 6: Commit**

```bash
git add service-ai/routes/bundle-summary.js service-ai/__tests__/routes/bundle-summary.test.js service-ai/server.js
git commit -m "feat(service-ai): add POST /bundle-summary route"
```

---

### Task 8: CORS and Full Integration Test

**Files:**
- Modify: `service-ai/server.js` — add CORS
- Modify: `service-ai/package.json` — add cors dependency

- [ ] **Step 1: Install cors**

```bash
cd service-ai
npm install cors
```

- [ ] **Step 2: Add CORS to server.js**

Update `service-ai/server.js` to:

```js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const keywordsRouter = require('./routes/keywords');
const bundleSummaryRouter = require('./routes/bundle-summary');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/keywords', keywordsRouter);
app.use('/bundle-summary', bundleSummaryRouter);

app.listen(PORT, () => {
  console.log(`service-ai running on port ${PORT}`);
});

module.exports = app;
```

- [ ] **Step 3: Run all tests**

```bash
cd service-ai
npx jest --verbose
# Expected: ALL PASS — cache (5), k2think (5), prompts/keywords (6), prompts/bundle-summary (5), routes/keywords (4), routes/bundle-summary (5) = 30 tests
```

- [ ] **Step 4: Commit**

```bash
git add service-ai/server.js service-ai/package.json service-ai/package-lock.json
git commit -m "feat(service-ai): add CORS support for frontend access"
```

---

### Task 9: Update spec.md and Write Shared API Contracts

**Files:**
- Modify: `spec.md` — mark Dev 2 tasks complete
- Create: `shared/api-contracts.md` — add service-ai endpoint contracts

- [ ] **Step 1: Update spec.md**

Add checkmarks to completed Dev 2 tasks in `spec.md` (all 7 tasks).

- [ ] **Step 2: Create shared/api-contracts.md**

```bash
mkdir -p shared
```

Write `shared/api-contracts.md` with the service-ai endpoint contracts (request/response shapes for `POST /keywords` and `POST /bundle-summary`) so Devs 3 and 4 can code against them.

```markdown
# API Contracts

## Service-AI (http://localhost:3002)

### POST /keywords

**Request:**
| Field | Type | Required | Description |
|---|---|---|---|
| ticker | string | yes | Stock ticker symbol (e.g., "LMT", "AAPL") |

**Response (200):**
| Field | Type | Description |
|---|---|---|
| ticker | string | Uppercase ticker |
| keywords | string[] | 4-6 thematic keywords for Polymarket search |

**Error (400):** `{ "error": "Invalid request", "message": "..." }`
**Error (500):** `{ "error": "AI service unavailable", "message": "..." }`

### POST /bundle-summary

**Request:**
| Field | Type | Required | Description |
|---|---|---|---|
| ticker | string | yes | Stock ticker symbol |
| markets | array | yes | Non-empty array of market objects |
| markets[].title | string | yes | Prediction market title |
| markets[].confidence | number | yes | Confidence percentage (0-100) |

**Response (200):**
| Field | Type | Description |
|---|---|---|
| ticker | string | Uppercase ticker |
| summary | string | Beginner-friendly AI-generated explanation |

**Error (400):** `{ "error": "Invalid request", "message": "..." }`
**Error (500):** `{ "error": "AI service unavailable", "message": "..." }`

### GET /health

**Response (200):** `{ "status": "ok" }`
```

- [ ] **Step 3: Commit**

```bash
git add spec.md shared/api-contracts.md
git commit -m "docs: update spec with Dev 2 progress, add shared API contracts"
```

---

## Execution Order Summary

| Task | Depends On | What It Produces |
|---|---|---|
| 1. Project Scaffolding | — | Working Express server on port 3002 |
| 2. Cache Module | — | Reusable in-memory TTL cache |
| 3. K2Think Client | — | fetch() wrapper with retries |
| 4. Keywords Prompt | — | Prompt template + response parser |
| 5. Bundle Summary Prompt | — | Prompt template |
| 6. Keywords Route | 1, 2, 3, 4 | POST /keywords endpoint |
| 7. Bundle Summary Route | 1, 3, 5 | POST /bundle-summary endpoint |
| 8. CORS + Integration | 6, 7 | Frontend-ready service |
| 9. Docs Update | 8 | Updated spec + shared contracts |

Tasks 2, 3, 4, 5 can be built in parallel. Tasks 6 and 7 can be built in parallel once their deps are done.
