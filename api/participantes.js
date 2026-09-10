// GET /api/participantes?token=…
// Devuelve [{ nombre, celular, creado_en, whatsapp_en }] ordenado por fecha.
// Sin token válido responde 401.

import { createHash, timingSafeEqual } from 'node:crypto';
import { rest, json } from './_supabase.js';

// Comparación en tiempo constante. Se hashean ambos lados para que la
// longitud no filtre información y timingSafeEqual reciba buffers iguales.
function tokenValido(recibido) {
  const esperado = process.env.ADMIN_TOKEN || '';
  if (!esperado || typeof recibido !== 'string' || !recibido) return false;
  const a = createHash('sha256').update(recibido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

function leerToken(req) {
  const auth = req.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  const q = req.query?.token;
  if (typeof q === 'string') return q.trim();
  try {
    const u = new URL(req.url, 'http://localhost');
    return (u.searchParams.get('token') || '').trim();
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Método no permitido' });
  }

  if (!tokenValido(leerToken(req))) {
    return json(res, 401, { error: 'No autorizado' });
  }

  try {
    let r = await rest(
      'registros?select=nombre,celular,creado_en,whatsapp_en&permiso=eq.true&order=creado_en.asc&limit=5000',
    );
    // Si todavía no se corrió la migración 2 (columna whatsapp_en), devolvemos la lista sin ella.
    if (!r.ok && r.data?.code === '42703') {
      r = await rest('registros?select=nombre,celular,creado_en&permiso=eq.true&order=creado_en.asc&limit=5000');
    }
    if (!r.ok || !Array.isArray(r.data)) {
      console.error('Supabase respondió', r.status, r.data);
      return json(res, 502, { error: 'No se pudo leer la lista' });
    }
    return json(res, 200, r.data);
  } catch (err) {
    console.error('Error en /api/participantes', err);
    return json(res, 502, { error: 'No se pudo leer la lista' });
  }
}
