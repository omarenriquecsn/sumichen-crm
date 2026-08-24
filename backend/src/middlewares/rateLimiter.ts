import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Clave de rate limit estable detrás de proxies (Cloudflare/nginx).
// El validador por defecto de express-rate-limit lanza
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR si llega el header X-Forwarded-For
// con más de una IP y no hay `trust proxy` configurado. Extraemos la
// primera IP (la del cliente real) de forma segura.
const keyGenerator = (req: Request): string => {
  const fwd = req.headers['x-forwarded-for'];
  let ip: string;
  if (typeof fwd === 'string' && fwd) {
    ip = fwd.split(',')[0].trim();
  } else {
    ip = req.ip || 'unknown';
  }
  // Express-rate-limit rechaza claves con formato IPv6 (ERR_ERL_KEY_GEN_IPV6);
  // prefijamos para que no parezca una IP.
  return ip.includes(':') ? `ip:${ip}` : ip;
};

// Rate limit para endpoints públicos (formulario web / captura de leads).
// Previene spam y abuso del endpoint sin JWT.
export const limiterPublico = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // máx 30 requests por ventana por IP
  message: { message: 'Demasiadas solicitudes, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

// Rate limit más estricto para webhooks entrantes (Meta/WhatsApp/Instagram),
// que deberían llegar solo del proveedor, no del público general.
export const limiterWebhook = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Demasiadas solicitudes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});
