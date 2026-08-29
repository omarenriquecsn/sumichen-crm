/**
 * Genera los PNG del icono PWA a partir de project/public/icons/icon-source.svg
 * usando sharp (dependencia del backend).
 *
 * Uso: node backend/scripts/generarIconosPwa.js
 * Salidas (project/public/icons/): icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
 *
 * Si en el futuro se quiere cambiar el logo: reemplazar icon-source.svg y volver a ejecutar.
 */
const path = require('path');
const sharp = require('sharp');

const src = path.join(__dirname, '../../project/public/icons/icon-source.svg');
const outDir = path.join(__dirname, '../../project/public/icons');

const outputs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

(async () => {
  for (const o of outputs) {
    await sharp(src)
      .resize(o.size, o.size)
      .png()
      .toFile(path.join(outDir, o.name));
    console.log(`✔ ${o.name} (${o.size}x${o.size})`);
  }
  console.log('Iconos PWA generados correctamente.');
})().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
