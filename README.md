# Rifa Monarch · Bebes OPEN VIII Edición

Registro y sorteo del reloj que **Monarch Timepieces** rifa en la premiación del torneo
Bebes OPEN (Terralta Country Club, Monterrey).

Flujo:

1. El jugador escanea el QR y abre `/` (index.html).
2. Deja nombre y celular, acepta el aviso de privacidad y envía.
3. El registro se guarda en Supabase con la hora exacta.
4. Ve un botón para unirse al grupo de WhatsApp de Monarch (lo toca él; WhatsApp no
   permite agregar gente automáticamente).
5. En la premiación se abre `/sorteo.html` en la laptop del proyector y se sortea
   solo entre los registros del día.

## Estructura

```
index.html              formulario de registro (público)
sorteo.html             herramienta del sorteo (privada, pide ADMIN_TOKEN)
monarch.png             logo
api/registro.js         POST: guarda un registro
api/participantes.js    GET: lista de participantes, protegido por token
api/_supabase.js        helper compartido (no es endpoint)
supabase/migration.sql  tabla `registros`
vercel.json             cabeceras de seguridad
.env.example            variables necesarias
```

Sin framework ni dependencias: HTML + JS vanilla y funciones serverless de Node 22 en Vercel.

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto, p. ej. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave `service_role`. Solo la usan las funciones serverless; nunca llega al navegador. |
| `ADMIN_TOKEN` | Token para abrir el sorteo y consultar `/api/participantes`. Genera uno con `openssl rand -hex 24`. |

Se configuran en Vercel → Project → Settings → Environment Variables (Production).
Para desarrollo local copia `.env.example` a `.env` y corre `npx vercel dev`.

## Base de datos

Ejecuta `supabase/migration.sql` una vez en Supabase → SQL Editor. Crea la tabla
`registros` con `celular` único, índice por fecha y RLS activado sin policies: la tabla
solo se toca con `service_role` desde el servidor.

## Endpoints

### `POST /api/registro`

Body JSON: `{ "nombre": "Juan Pérez", "celular": "81 1234 5678", "permiso": true }`

- `201 { ok: true, repetido: false, creado_en }` registro nuevo
- `200 { ok: true, repetido: true }` el celular ya existía (no es error)
- `400 { ok: false, error }` datos inválidos (nombre < 3, celular ≠ 10 dígitos, permiso ≠ true)
- `502 { ok: false, error }` Supabase no respondió

### `GET /api/participantes?token=…`

También acepta `Authorization: Bearer …`. Compara contra `ADMIN_TOKEN` en tiempo constante.

- `200 [{ nombre, celular, creado_en }]` ordenado por fecha
- `401` sin token o token incorrecto

## Sorteo (`/sorteo.html`)

- Pide el token una vez, lo guarda en `sessionStorage` y carga la lista.
- Filtro por rango de fecha y hora (por defecto, hoy). Casilla para ignorar el filtro.
- **Sortear** (botón o barra espaciadora): el segundero de la carátula gira y desacelera
  mientras los nombres pasan por la ventanilla, hasta parar en el ganador.
  Con `prefers-reduced-motion` la animación se acorta.
- **No está presente** (botón o tecla `N`): descarta a la persona, queda registrada como
  descartada y sortea de nuevo.
- Nadie puede ganar dos veces. El nombre del premio es editable (reloj, tequila,
  membresías…).
- El teléfono del ganador se muestra solo con los últimos 4 dígitos.
- `F` pantalla completa, `Esc` muestra/oculta el panel.
- La lista, los ganadores y los descartados se guardan en `localStorage`: si se cae el
  internet después de cargar, el sorteo sigue funcionando. También se puede pegar una lista
  a mano (`Nombre, 8112345678` por línea) como respaldo.
- **Copiar ganadores** copia premio, nombre, celular completo y hora, para entregarlos a Monarch.

## Pruebas rápidas

```bash
SITIO=https://tu-proyecto.vercel.app
TOKEN=tu_admin_token

# registro nuevo → 201
curl -s -X POST $SITIO/api/registro -H 'Content-Type: application/json' \
  -d '{"nombre":"Prueba Staff","celular":"81 0000 0000","permiso":true}'

# mismo celular → 200 { repetido: true }
curl -s -X POST $SITIO/api/registro -H 'Content-Type: application/json' \
  -d '{"nombre":"Prueba Staff","celular":"8100000000","permiso":true}'

# sin token → 401
curl -s -o /dev/null -w '%{http_code}\n' $SITIO/api/participantes

# con token → lista
curl -s "$SITIO/api/participantes?token=$TOKEN"
```

Borra el registro de prueba antes del torneo:
`delete from registros where celular = '8100000000';`

## Privacidad

Los datos son de Monarch Timepieces. El formulario incluye el consentimiento que pide la
LFPDPPP (quién trata los datos y para qué). Para borrar a alguien:
`delete from registros where celular = '…';`
