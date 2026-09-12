import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

// Clave de rate limit estable detrás de proxies (Cloudflare/nginx).
// Extraemos la primera IP (la del cliente real) de X-Forwarded-For y la
// normalizamos con `ipKeyGenerator` (express-rate-limit v8), que maneja IPv6
// correctamente y evita ERR_ERL_KEY_GEN_IPV6.
const keyGenerator = (req: Request): string => {
  const fwd = req.headers['x-forwarded-for'];
  const ip =
    typeof fwd === 'string' && fwd
      ? fwd.split(',')[0].trim()
      : req.ip || 'unknown';
  return ipKeyGenerator(ip);
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
