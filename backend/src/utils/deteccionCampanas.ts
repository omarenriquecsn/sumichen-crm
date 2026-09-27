import { Campana } from '../entities/Campana';
import { OrigenLeadEnum } from '../entities/Lead';

/**
 * Detección de origen y campaña a partir del texto del primer mensaje de un
 * lead de WhatsApp.
 *
 * - Origen (prioridad Instagram > Web > Desconocido):
 *     contiene "instagram"        → instagram
 *     contiene "https"/"www"/"web" → web
 *     ninguna de las anteriores    → desconocido
 * - Palabra clave de campaña: primera campaña activa cuya palabra clave aparezca
 *   en el texto (se priorizan las palabras más largas para evitar matches
 *   parciales).
 */

export const normalizarTexto = (texto: string): string =>
  (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const detectarOrigenPorPalabras = (texto: string): OrigenLeadEnum => {
  const s = normalizarTexto(texto);
  if (s.includes('instagram')) return OrigenLeadEnum.INSTAGRAM;
  // `web` con límite de palabra para no capturar "webinar"/"weblog"; https/www
  // sí se buscan como subcadena (los enlaces las incluyen siempre).
  if (s.includes('https') || s.includes('www.') || /\bweb\b/.test(s)) {
    return OrigenLeadEnum.WEB;
  }
  return OrigenLeadEnum.DESCONOCIDO;
};

export const detectarPalabraClave = (texto: string, campanas: Campana[]): string | null => {
  const s = normalizarTexto(texto);
  if (!s) return null;

  const ordenadas = [...campanas]
    .filter((c) => c.activa && c.palabra_clave)
    .sort((a, b) => b.palabra_clave.length - a.palabra_clave.length);

  for (const campana of ordenadas) {
    const palabra = normalizarTexto(campana.palabra_clave).trim();
    if (palabra && s.includes(palabra)) return campana.palabra_clave;
  }
  return null;
};
