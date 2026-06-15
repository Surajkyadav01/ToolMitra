export default async function handler(req: any, res: any) {
  // CORS setup for versatility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, customApiKey } = req.body || {};
    const apiKey = customApiKey || process.env.REMOVE_BG_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'API_KEY_MISSING',
        message: 'Remove.bg API Key is missing. Please provide it in Vercel Environment Variables as REMOVE_BG_API_KEY.'
      });
    }

    if (!image) {
      return res.status(400).json({
        error: 'IMAGE_MISSING',
        message: 'Please select and upload an image.'
      });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_file_b64: base64Data,
        size: 'auto'
      })
    });

    if (!response.ok) {
      const status = response.status;
      let errorMessage = 'Failed to connect to background removal service.';
      try {
        const errData = await response.json();
        if (errData && errData.errors && errData.errors[0]) {
          errorMessage = errData.errors[0].title || errorMessage;
        }
      } catch {
        // ignore
      }
      return res.status(status).json({
        error: 'REMOVE_BG_API_ERROR',
        message: `Remove.bg API Error [Status ${status}]: ${errorMessage}`
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Png = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      image: `data:image/png;base64,${base64Png}`
    });
  } catch (err: any) {
    console.error('Vercel serverless function error removing background:', err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'An unexpected serverless function error occurred.'
    });
  }
}
