export function guardarEstadoVista(clave: string, estado: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(clave, JSON.stringify(estado));
  } catch (error) {
    console.error('Error guardando en sessionStorage', error);
  }
}

export function recuperarEstadoVista<T>(clave: string, defaults: T): T {
  const item = sessionStorage.getItem(clave);
  if (!item) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(item) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch (error) {
    console.error('Error parseando sessionStorage', error);
    return defaults;
  }
}

export function getContenedorScroll(): Element | Window {
  return document.querySelector('main') || window;
}

export function guardarScroll(clave: string): void {
  const contenedor = getContenedorScroll();
  let scrollTop = 0;
  if (contenedor instanceof HTMLElement) {
    scrollTop = contenedor.scrollTop;
  } else if (contenedor === window) {
    scrollTop = window.scrollY;
  }
  guardarEstadoVista(clave, { scrollTop });
}

export function restaurarScroll(clave: string): void {
  const { scrollTop } = recuperarEstadoVista<{ scrollTop: number }>(clave, {
    scrollTop: 0,
  });
  const contenedor = getContenedorScroll();
  if (contenedor instanceof HTMLElement) {
    contenedor.scrollTop = scrollTop;
  } else if (contenedor === window) {
    window.scrollTo(0, scrollTop);
  }
}
