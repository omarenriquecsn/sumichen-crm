/**
 * Genera los PNG del icono PWA, el favicon y el logo recortado del proyecto.
 *
 * - Iconos PWA (icon-192, icon-512, maskable-512, apple-touch-icon) y favicon.png:
 *   a partir de project/public/icons/Logo Perfil_Mesa de trabajo 1-02-03.png (embrión/moleculas).
 *   Los iconos PWA se componen sobre fondo blanco para que iOS/Android no los pinten sobre negro;
 *   el favicon queda transparente ("solo las moleculas") para la pestana del navegador.
 * - logo-sumichem.png: recorte (trim) de project/public/icons/logo - Letras negras.png,
 *   eliminando el margen transparente para que el logo llene su contenedor en Login/Register/Sidebar.
 *
 * Uso: node backend/scripts/generarIconosPwa.js
 * Salidas (project/public/icons/): icon-192.png, icon-512.png, maskable-512.png,
 * apple-touch-icon.png, favicon.png, logo-sumichem.png
 */
const path = require('path');
const sharp = require('sharp');

const iconDir = path.join(__dirname, '../../project/public/icons');
const perfilSrc = path.join(iconDir, 'Logo Perfil_Mesa de trabajo 1-02-03.png');
const letrasSrc = path.join(iconDir, 'logo - Letras negras.png');

const outputs = [
  { name: 'icon-192.png', size: 192, source: perfilSrc, background: '#ffffff' },
  { name: 'icon-512.png', size: 512, source: perfilSrc, background: '#ffffff' },
  { name: 'maskable-512.png', size: 512, source: perfilSrc, background: '#ffffff' },
  { name: 'apple-touch-icon.png', size: 180, source: perfilSrc, background: '#ffffff' },
  { name: 'favicon.png', size: 96, source: perfilSrc, background: null },
];

(async () => {
  for (const o of outputs) {
    let pipeline = sharp(o.source).trim();
    if (o.background) {
      pipeline = pipeline.flatten({ background: o.background });
    }
    await pipeline
      .resize(o.size, o.size, {
        fit: 'cover',
        background: o.background ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(iconDir, o.name));
    console.log(`✔ ${o.name} (${o.size}x${o.size})`);
  }

  // Logo recortado (sin márgenes transparentes) para Login/Register/Sidebar
  await sharp(letrasSrc)
    .trim()
    .png()
    .toFile(path.join(iconDir, 'logo-sumichem.png'));
  console.log('✔ logo-sumichem.png (recorte de logo - Letras negras.png)');

  console.log('Assets de iconos generados correctamente.');
})().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
