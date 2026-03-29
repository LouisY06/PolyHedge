const HEX_BASE_URL = "https://app.hex.tech/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // 3 minutes max

async function triggerRun(projectId, inputParams) {
  const token = process.env.HEX_API_TOKEN;
  if (!token) throw new Error("HEX_API_TOKEN not configured");

  const response = await fetch(`${HEX_BASE_URL}/projects/${projectId}/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputParams }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hex API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function pollRunStatus(projectId, runId) {
  const token = process.env.HEX_API_TOKEN;

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const response = await fetch(
      `${HEX_BASE_URL}/projects/${projectId}/runs/${runId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Hex status poll failed: ${response.status}`);
    }

    const data = await response.json();
    const status = data.status;

    if (status === "COMPLETED") return data;
    if (status === "ERRORED" || status === "KILLED") {
      throw new Error(`Hex run ${status}: ${data.statusMessage || "unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Hex run timed out after 3 minutes");
}

async function runAndWait(projectId, inputParams) {
  console.log(`[hex] Triggering run for project ${projectId}...`);
  const { runId } = await triggerRun(projectId, inputParams);
  console.log(`[hex] Run started: ${runId}, polling...`);
  const result = await pollRunStatus(projectId, runId);
  console.log(`[hex] Run completed: ${runId}`);
  return result;
}

module.exports = { triggerRun, pollRunStatus, runAndWait };
