const K2THINK_URL = 'https://api.k2think.ai/v1/chat/completions';
const K2THINK_MODEL = 'MBZUAI-IFM/K2-Think-v2';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const TIMEOUT_MS = 120000;

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

      // K2Think is a "thinking" model — it outputs <think>...</think> reasoning
      // before the final answer. Strip the thinking block.
      let content = data.choices[0].message.content;
      const thinkEnd = content.indexOf('</think>');
      if (thinkEnd !== -1) {
        content = content.slice(thinkEnd + '</think>'.length).trim();
      }
      return content;
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
