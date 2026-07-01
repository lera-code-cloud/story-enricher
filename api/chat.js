export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-No-Search');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const noSearch = req.headers['x-no-search'] === 'true';
  const body = { ...req.body };

  if (noSearch) {
    delete body.tools;
    delete body.tool_choice;
  } else if (!body.tools) {
    // Fallback only if the client didn't specify its own tool config
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  // If body.tools was already sent by the client (with allowed_domains,
  // max_uses, etc.), we leave it untouched instead of overwriting it.

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  res.status(200).json(data);
}
