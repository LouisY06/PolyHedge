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
