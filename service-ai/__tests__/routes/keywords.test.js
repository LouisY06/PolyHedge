const request = require('supertest');
const app = require('../../server');
const { callK2Think } = require('../../k2think');

jest.mock('../../k2think');

describe('POST /keywords', () => {
  beforeEach(() => {
    callK2Think.mockReset();
    const { keywordsCache } = require('../../routes/keywords');
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
