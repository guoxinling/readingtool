#!/usr/bin/env node

import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

function readArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const host = process.env.HOST || readArg('--host', '127.0.0.1');
const port = Number(process.env.PORT || readArg('--port', '8787'));
const timeoutMs = Number(process.env.TIMEOUT_MS || readArg('--timeout', '28000'));
const headed = process.env.HEADED === '1';
const profileDir = process.env.PW_PROFILE_DIR || path.resolve(process.cwd(), '.cache/readingtool-profile');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('[bridge] Missing dependency: playwright');
  console.error('[bridge] Install with: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

let browserContext = null;
try {
  browserContext = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    viewport: { width: 1440, height: 960 },
    locale: 'en-US',
  });
} catch (error) {
  console.error(`[bridge] Failed to launch browser: ${error.message || error}`);
  console.error('[bridge] Try: npx playwright install chromium');
  process.exit(1);
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

async function extractPage(url) {
  const page = await browserContext.newPage();
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    try {
      await page.waitForLoadState('networkidle', { timeout: 4500 });
    } catch {
      // Ignore network-idle timeout, DOM content is already available.
    }

    return await page.evaluate(() => {
      const pickNode = () =>
        document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('main') ||
        document.body;

      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        document.title ||
        '';

      const node = pickNode();
      const clone = node.cloneNode(true);
      clone
        .querySelectorAll('script,style,noscript,svg,button,input,textarea,form,aside,nav,footer,header')
        .forEach((el) => el.remove());

      const text = (clone.innerText || '')
        .replace(/\u00A0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        url: location.href,
        title,
        siteName: location.hostname.replace(/^www\./i, ''),
        text,
        byline: document.querySelector('meta[name="author"]')?.getAttribute('content') || '',
      };
    });
  } finally {
    await page.close();
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === 'GET' && requestUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      headless: !headed,
      profileDir,
      now: new Date().toISOString(),
    });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/open') {
    const target = requestUrl.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      sendJson(res, 400, { error: 'Missing or invalid url query param' });
      return;
    }

    const page = await browserContext.newPage();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    sendJson(res, 200, { ok: true, opened: target });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/extract') {
    try {
      const body = await parseRequestBody(req);
      const targetUrl = body?.url;
      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        sendJson(res, 400, { error: 'Body must include a valid http/https url' });
        return;
      }

      const result = await extractPage(targetUrl);
      if (!result.text || result.text.length < 120) {
        sendJson(res, 422, {
          error: 'Extracted text is too short. Try headed login mode first.',
          title: result.title || '',
          siteName: result.siteName || '',
        });
        return;
      }

      sendJson(res, 200, result);
      return;
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Unknown extraction error' });
      return;
    }
  }

  sendJson(res, 404, {
    error: 'Not Found',
    routes: ['GET /health', 'GET /open?url=https://...', 'POST /extract'],
  });
});

server.listen(port, host, () => {
  console.log(`[bridge] Listening at http://${host}:${port}`);
  console.log(`[bridge] Extract endpoint: http://${host}:${port}/extract`);
  console.log(`[bridge] Browser mode: ${headed ? 'headed' : 'headless'}`);
  console.log(`[bridge] Profile dir: ${profileDir}`);
  if (headed) {
    console.log('[bridge] Need login? Open the site first: GET /open?url=https://www.wsj.com/');
  }
});

async function shutdown() {
  console.log('\n[bridge] shutting down...');
  try {
    await browserContext?.close();
  } catch {
    // ignore close errors
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
