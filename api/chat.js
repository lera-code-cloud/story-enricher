// Vercel serverless proxy to the Anthropic API.
// The API key AND the Amo ES MCP url stay on the server — never in the browser.
//
// Required Environment Variables (Vercel → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  — your Anthropic key
//   AMO_ES_MCP_URL     — https://amo-es-mcp-prod.amomama.xyz/<secret>/mcp
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: { message: 'ANTHROPIC_API_KEY is not set in this project\'s Environment Variables.' }
    });
  }
  try {
    const { use_amo_es, ...payload } = req.body || {};

    // Beta flags are collected in a list and sent as one comma-separated header.
    // web-fetch is needed by the enrichment call, which uses the web_fetch tool
    // to open an article and read the links inside it — that is how the tool
    // reaches the original source instead of whoever repeated it.
    const betas = ['web-fetch-2025-09-10'];

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };

    // Attach the Elasticsearch MCP server only for the archive lookup call.
    if (use_amo_es) {
      if (!process.env.AMO_ES_MCP_URL) {
        return res.status(500).json({
          error: { message: 'AMO_ES_MCP_URL is not set in this project\'s Environment Variables.' }
        });
      }
      payload.mcp_servers = [
        { type: 'url', url: process.env.AMO_ES_MCP_URL, name: 'amo-es' }
      ];
      betas.push('mcp-client-2025-04-04');
    }

    headers['anthropic-beta'] = betas.join(',');

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
