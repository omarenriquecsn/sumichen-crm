/**
 * Serializa un arreglo de filas (objetos) a CSV.
 * Escapa comillas, comas y saltos de línea; los objetos/fechas se serializan.
 */
export const filasACsv = (filas: Record<string, unknown>[]): string => {
  if (!filas || filas.length === 0) return '';

  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    let s: string;
    if (v instanceof Date) s = v.toISOString();
    else if (typeof v === 'object') s = JSON.stringify(v);
    else s = String(v);
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = Object.keys(filas[0]);
  const lines = [headers.join(',')];
  for (const fila of filas) {
    lines.push(headers.map((h) => esc(fila[h])).join(','));
  }
  return lines.join('\n');
};
