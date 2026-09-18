// Minimal wiring example using Node's built-in http module — deliberately not tied to any
// framework, since handleSendEmailWebhook() is a plain function. Adapting this to your real
// backend is a few lines wherever it lives:
//
//   Express:   app.post('/auth-email-hook', express.text({ type: '*/*' }), async (req, res) => {
//                const r = await handleSendEmailWebhook(req.body, req.headers);
//                res.status(r.status).send(r.body);
//              });
//
//   Fastify:   fastify.post('/auth-email-hook', { config: { rawBody: true } }, async (req, reply) => {
//                const r = await handleSendEmailWebhook(req.rawBody, req.headers);
//                reply.code(r.status).send(r.body);
//              });
//
//   Next.js (route handler, app router):
//     export async function POST(req) {
//       const raw = await req.text();
//       const r = await handleSendEmailWebhook(raw, Object.fromEntries(req.headers));
//       return new Response(r.body, { status: r.status });
//     }
//
// The one thing every adapter must get right: pass the RAW, unparsed request body string to
// handleSendEmailWebhook — signature verification runs over the exact bytes Supabase sent,
// so a framework that auto-parses JSON before you can grab the raw body will break it (in
// Express that's why `express.text()`/`express.raw()` is used above instead of `express.json()`).

import http from 'node:http';
import { handleSendEmailWebhook } from './email-webhook-core.mjs';

// This is a server-to-server JSON endpoint, never rendered in a browser, so the usual
// Helmet-style CSP/clickjacking headers don't really apply here — the real hardening for a
// webhook like this is the signature verification handleSendEmailWebhook already does. These
// are cheap, standard defense-in-depth regardless (and give any framework this gets adapted
// into — see the wiring examples above — the same headers Helmet's defaults would set).
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/auth-email-hook') {
    res.writeHead(404, SECURITY_HEADERS).end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const result = await handleSendEmailWebhook(rawBody, req.headers);
  res.writeHead(result.status, { 'Content-Type': 'application/json', ...SECURITY_HEADERS }).end(result.body);
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Email webhook listening on :${port}/auth-email-hook`));
