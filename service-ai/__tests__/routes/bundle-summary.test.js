const request = require('supertest');
const app = require('../../server');
const { callK2Think } = require('../../k2think');

jest.mock('../../k2think');

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
