/**
 * Genera un par de llaves VAPID para Web Push (PWA).
 *
 * Uso: node backend/scripts/generarVapid.js
 * Imprime las llaves para copiar a:
 *   backend/.env  -> VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   project/.env  -> VITE_VAPID_PUBLIC_KEY (solo la pública)
 */
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=== Llaves VAPID generadas ===\n');
console.log('BACKEND (.env)');
console.log('----------------');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@crmsumichen.com');
console.log('\nFRONTEND (project/.env)');
console.log('-----------------------');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n⚠ Guarda estas llaves en .env (NUNCA las comitees).');
