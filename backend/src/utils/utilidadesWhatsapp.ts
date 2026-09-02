import fs from 'fs';
import path from 'path';
import { sendWhatsAppImage } from './sendWhatsapp';

/**
 * Utilidades de WhatsApp: documentos de la carpeta `uploads/utilidades`.
 *
 * - La carpeta contiene imágenes que el equipo de ventas recibe automáticamente
 *   al escribir al número de la API con ciertas palabras clave (horario,
 *   condiciones de despacho). Esos mensajes NO generan leads.
 * - `UTILIDADES_CONFIG` define el mapeo palabra clave → archivo (fijo en código).
 * - `getCarpetaUtilidades()` resuelve la ruta de la carpeta (configurable con
 *   `UTILIDADES_UPLOAD_PATH`; default: `backend/uploads/utilidades`).
 */

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface UtilidadWhatsapp {
  palabrasClave: string[];
  archivo: string;
  caption: string;
}

// Mapeo fijo palabra clave → archivo. Para agregar un documento nuevo, coloca
// el archivo en `uploads/utilidades` y añade una entrada aquí.
export const UTILIDADES_CONFIG: UtilidadWhatsapp[] = [
  {
    palabrasClave: ['horario'],
    archivo: 'horario.jpeg',
    caption: 'Horario de atención Sumichem',
  },
  {
    palabrasClave: ['condiciones de despacho', 'despacho'],
    archivo: 'condiciones de despacho.png',
    caption: 'Condiciones de despacho Sumichem',
  },
];

export const getCarpetaUtilidades = () =>
  process.env.UTILIDADES_UPLOAD_PATH || path.resolve(__dirname, '../../uploads/utilidades');

/**
 * Resuelve qué utilidad corresponde a un mensaje entrante según sus palabras
 * clave (comparación "contiene", normalizada a minúsculas y sin tildes).
 */
export const resolverUtilidad = (cuerpo: string): UtilidadWhatsapp | null => {
  const c = normalizar(cuerpo.trim());
  if (!c) return null;
  return (
    UTILIDADES_CONFIG.find((u) =>
      u.palabrasClave.some((palabra) => {
        const p = normalizar(palabra);
        return c.includes(p) || p.includes(c);
      })
    ) || null
  );
};

/**
 * Envía la imagen de una utilidad por WhatsApp. No bloquea: si la API de Meta
 * falla (ventana de 24h cerrada, token, etc.) solo se loguea el error.
 */
export const enviarUtilidadPorWhatsApp = async (
  telefono: string,
  utilidad: UtilidadWhatsapp,
  phoneNumberId?: string
) => {
  try {
    const filePath = path.join(getCarpetaUtilidades(), utilidad.archivo);
    if (!fs.existsSync(filePath)) {
      console.error('[Utilidades] Archivo no encontrado:', filePath);
      return false;
    }
    const buffer = fs.readFileSync(filePath);
    await sendWhatsAppImage(telefono, buffer, utilidad.archivo, utilidad.caption, phoneNumberId);
    return true;
  } catch (err) {
    console.error(
      '[Utilidades] Error enviando imagen WhatsApp:',
      err instanceof Error ? err.message : err
    );
    return false;
  }
};
