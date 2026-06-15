import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with a high limit (15MB) for base64 encoded photo uploads
  app.use(express.json({ limit: '15mb' }));

  // Endpoint to check environment configuration state
  app.get('/api/config', (req, res) => {
    res.json({
      hasRemoveBgKey: !!process.env.REMOVE_BG_API_KEY
    });
  });

  // Proxy endpoint to perform Remove.bg background removal
  app.post('/api/remove-bg', async (req, res) => {
    try {
      const { image, customApiKey } = req.body;
      
      // Use custom key if supplied in UI, otherwise fall back to environment key
      const apiKey = customApiKey || process.env.REMOVE_BG_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: 'API_KEY_MISSING',
          message: 'Remove.bg API Key is missing. Please provide it in the input block or add REMOVE_BG_API_KEY to your environment variables.'
        });
      }

      if (!image) {
        return res.status(400).json({
          error: 'IMAGE_MISSING',
          message: 'Please select and upload an image.'
        });
      }

      // Extract raw base64 data without data-URI prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

      // Send to official Remove.bg API
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
          // ignore parsing error
        }
        return res.status(status).json({
          error: 'REMOVE_BG_API_ERROR',
          message: `Remove.bg API Error [Status ${status}]: ${errorMessage}`
        });
      }

      // Read binary buffer and encode as Base64 PNG
      const arrayBuffer = await response.arrayBuffer();
      const base64Png = Buffer.from(arrayBuffer).toString('base64');

      return res.json({
        success: true,
        image: `data:image/png;base64,${base64Png}`
      });
    } catch (err: any) {
      console.error('Server error removing background:', err);
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred.'
      });
    }
  });

  // Vite middleware for development or serving index.html in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
