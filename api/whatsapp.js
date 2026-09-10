// POST /api/whatsapp
// Body: { celular }
// Marca la hora en que la persona tocó el botón del grupo de WhatsApp.
// Idempotente: solo escribe la primera vez. Nunca falla hacia el usuario.

import { rest, json, readBody } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false });
  }
  const body = readBody(req);
  const celular = String(body?.celular ?? '').replace(/\D/g, '');
  if (celular.length !== 10) return json(res, 400, { ok: false });

  try {
    await rest(`registros?celular=eq.${celular}&whatsapp_en=is.null`, {
      method: 'PATCH',
      body: { whatsapp_en: new Date().toISOString() },
      prefer: 'return=minimal',
    });
  } catch (err) {
    console.error('Error en /api/whatsapp', err);
  }
  return json(res, 200, { ok: true });
}
