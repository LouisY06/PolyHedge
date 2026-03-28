const { callK2Think } = require('../k2think');

// Mock global fetch
global.fetch = jest.fn();

describe('callK2Think', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetch.mockReset();
    process.env.K2THINK_API_KEY = 'test-key';
  });

  afterEach(() => {
    jest.useRealTimers();
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

    const resultPromise = callK2Think([{ role: 'user', content: 'hi' }]);
    // Advance past the first retry delay and flush microtasks
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('recovered');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('throws after 3 failed attempts', async () => {
    fetch.mockRejectedValue(new Error('network error'));

    // Attach rejection handler immediately before advancing timers
    const assertion = expect(
      callK2Think([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('K2Think API failed after 3 attempts');

    await jest.runAllTimersAsync();
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('throws on non-ok HTTP response after retries', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const assertion = expect(
      callK2Think([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow('K2Think API failed after 3 attempts');

    await jest.runAllTimersAsync();
    await assertion;

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
