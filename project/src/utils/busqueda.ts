/**
 * Búsqueda difusa sencilla (sin dependencias) para ordenar listas por
 * "mejores coincidencias". Normaliza mayúsculas y tildes, y es tolerante al
 * orden de las palabras y a caracteres intercalados.
 */

export const normalizarTexto = (texto: string): string =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ¿Los caracteres de `consulta` aparecen en `texto` en el mismo orden?
const esSubsecuencia = (texto: string, consulta: string): boolean => {
  if (!consulta) return true;
  let i = 0;
  for (const ch of texto) {
    if (ch === consulta[i]) i++;
    if (i === consulta.length) return true;
  }
  return false;
};

/**
 * Puntaje de coincidencia entre un texto y la consulta (0 = no coincide).
 * Mayor puntaje = mejor coincidencia.
 */
export const puntuarCoincidencia = (texto: string, consulta: string): number => {
  const t = normalizarTexto(texto);
  const q = normalizarTexto(consulta);
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800;
  if (t.includes(q)) return 600;

  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((tk) => t.includes(tk))) return 400;

  // Coincidencia por subsecuencia (tolera caracteres intercalados u omitidos),
  // con penalización por lo que sobra del nombre.
  if (tokens.every((tk) => esSubsecuencia(t, tk))) {
    const sobrante = Math.max(0, t.length - q.replace(/\s/g, "").length);
    return Math.max(150, 300 - sobrante * 5);
  }

  return 0;
};

/**
 * Filtra y ordena `items` de mejor a peor coincidencia con `consulta`.
 * Sin consulta devuelve la lista original intacta.
 */
export const ordenarPorCoincidencia = <T,>(
  items: T[],
  consulta: string,
  getTexto: (item: T) => string
): T[] => {
  const q = normalizarTexto(consulta);
  if (!q) return items;
  return items
    .map((item, index) => ({
      item,
      index,
      puntaje: puntuarCoincidencia(getTexto(item), q),
    }))
    .filter((x) => x.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.index - b.index)
    .map((x) => x.item);
};
