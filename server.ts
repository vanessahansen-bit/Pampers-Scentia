import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function extractGoogleSheetId(input: string): { id: string; gid?: string } | null {
  const trimmed = input.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch) {
    const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
    return { id: idMatch[1], gid: gidMatch?.[1] };
  }
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return { id: trimmed };
  }
  return null;
}

function isAppsScriptUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//i.test(trimmed);
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.post('/api/fetch-sheet', async (req, res) => {
    try {
      const { url, sheetName } = req.body as { url?: string; sheetName?: string };
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Ingresá una URL de Google Apps Script o de Google Sheets.' });
        return;
      }

      const trimmedUrl = url.trim();

      // 1. Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec)
      if (isAppsScriptUrl(trimmedUrl)) {
        const targetUrl = new URL(trimmedUrl);
        if (sheetName && sheetName.trim()) {
          targetUrl.searchParams.set('sheet', sheetName.trim());
        }

        const scriptResp = await fetch(targetUrl.toString(), {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PampersScentiaDashboard/1.0)',
            Accept: 'application/json, text/plain, */*',
          },
        });

        const rawText = await scriptResp.text();
        const trimmedBody = rawText.trimStart();

        if (
          !scriptResp.ok ||
          trimmedBody.startsWith('<!DOCTYPE') ||
          trimmedBody.startsWith('<html')
        ) {
          res.status(403).json({
            error:
              'El Web App de Apps Script requiere permisos públicos. En Apps Script → Implementar → Gestionar implementaciones, configurá "Quién tiene acceso" en "Cualquier usuario" (Anyone).',
          });
          return;
        }

        try {
          const json = JSON.parse(rawText);
          res.json({
            format: 'apps-script',
            payload: json,
            url: trimmedUrl,
          });
          return;
        } catch {
          // If Apps Script returned plain CSV text instead of JSON
          res.json({
            format: 'csv',
            text: rawText,
            spreadsheetId: 'AppsScript',
          });
          return;
        }
      }

      // 2. Direct Google Sheets URL or ID
      const parsed = extractGoogleSheetId(trimmedUrl);
      if (!parsed) {
        res.status(400).json({
          error:
            'URL no reconocida. Pegá la URL de implementación de Apps Script (https://script.google.com/macros/s/.../exec) o el enlace del Google Sheet.',
        });
        return;
      }

      // First try XLSX export so all tabs (Pañales, Toallitas, etc.) are preserved
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=xlsx`;
      const xlsxResp = await fetch(xlsxUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PampersScentiaDashboard/1.0)',
        },
      });

      const contentType = xlsxResp.headers.get('content-type') || '';
      if (
        xlsxResp.ok &&
        (contentType.includes('spreadsheetml') ||
          contentType.includes('octet-stream') ||
          contentType.includes('zip'))
      ) {
        const buffer = Buffer.from(await xlsxResp.arrayBuffer());
        res.json({
          format: 'xlsx',
          base64: buffer.toString('base64'),
          spreadsheetId: parsed.id,
        });
        return;
      }

      // Fallback to CSV export (handles published-to-web or single-gid public sheets)
      const gidParam = parsed.gid ? `&gid=${parsed.gid}` : '';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv${gidParam}`;
      const csvResp = await fetch(csvUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PampersScentiaDashboard/1.0)',
        },
      });

      const csvType = csvResp.headers.get('content-type') || '';
      const csvText = await csvResp.text();

      if (csvResp.ok && !csvType.includes('text/html') && !csvText.trimStart().startsWith('<!DOCTYPE')) {
        res.json({
          format: 'csv',
          text: csvText,
          spreadsheetId: parsed.id,
        });
        return;
      }

      res.status(403).json({
        error:
          'Este Google Sheet es privado o corporativo. Vinculalo usando la URL de Google Apps Script (ver guía paso a paso abajo) o habilitá el acceso con enlace.',
      });
    } catch (err) {
      console.error('Error fetching sheet:', err);
      res.status(500).json({
        error: 'Error al conectar con Google Sheets / Apps Script. Verificá que la URL sea accesible.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

createServer();
