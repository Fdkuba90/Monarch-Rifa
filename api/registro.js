// POST /api/registro
// Body: { nombre, celular, permiso }
// Guarda un registro. Si el celular ya existe responde { ok: true, repetido: true }.

import { rest, json, readBody } from './_supabase.js';

const MAX_NOMBRE = 80;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Método no permitido' });
  }

  const body = readBody(req);
  if (!body) {
    return json(res, 400, { ok: false, error: 'Cuerpo inválido' });
  }

  const nombre = String(body.nombre ?? '').replace(/\s+/g, ' ').trim();
  const celular = String(body.celular ?? '').replace(/\D/g, '');
  const permiso = body.permiso === true;

  if (nombre.length < 3) {
    return json(res, 400, { ok: false, error: 'Escribe tu nombre completo (mínimo 3 letras).' });
  }
  if (nombre.length > MAX_NOMBRE) {
    return json(res, 400, { ok: false, error: `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.` });
  }
  if (celular.length !== 10) {
    return json(res, 400, { ok: false, error: 'El celular debe tener exactamente 10 dígitos.' });
  }
  if (!permiso) {
    return json(res, 400, { ok: false, error: 'Necesitamos tu autorización para registrarte.' });
  }

  try {
    const r = await rest('registros', {
      method: 'POST',
      body: { nombre, celular, permiso: true },
      prefer: 'return=representation',
    });

    if (r.ok) {
      const fila = Array.isArray(r.data) ? r.data[0] : null;
      return json(res, 201, { ok: true, repetido: false, creado_en: fila?.creado_en ?? null });
    }

    // 23505 = unique_violation en Postgres: ya estaba registrado. No es error.
    if (r.status === 409 || r.data?.code === '23505') {
      return json(res, 200, { ok: true, repetido: true });
    }

    console.error('Supabase respondió', r.status, r.data);
    return json(res, 502, { ok: false, error: 'No pudimos guardar tu registro.' });
  } catch (err) {
    console.error('Error en /api/registro', err);
    return json(res, 502, { ok: false, error: 'No pudimos guardar tu registro.' });
  }
}
