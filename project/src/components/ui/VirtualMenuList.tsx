import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FixedSizeList as List } from "react-window";
import type { GroupBase, MenuListProps } from "react-select";

const ROW_HEIGHT = 38;
const ALTURA_POR_DEFECTO = 320;
const CONSULTA_MOVIL = "(max-width: 639px)";

/**
 * Detecta si el viewport está en tamaño móvil.
 *
 * En móvil NO se virtualiza: las etiquetas largas (clientes/productos) se
 * envuelven en varias líneas y con una altura de fila fija se superpondrían
 * unas con otras. Sin virtualizar, react-select calcula la altura de cada fila
 * automáticamente.
 */
function useEsMovil() {
  const [esMovil, setEsMovil] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia(CONSULTA_MOVIL).matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_MOVIL);
    const onChange = (e: MediaQueryListEvent) => setEsMovil(e.matches);
    setEsMovil(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return esMovil;
}

/**
 * MenuList para react-select.
 *
 * - Escritorio: virtualiza con react-window (solo se renderizan las filas
 *   visibles; con miles de clientes/productos el desplegable se volvería muy
 *   lento). La altura de fila es fija, así que en el wrapper se recorta
 *   (`overflow: hidden`) para que nada se superponga.
 * - Móvil: usa el menú estándar de react-select para que cada opción crezca
 *   según su contenido (texto completo, sin solapes).
 *
 * Uso: <Select components={{ MenuList: VirtualMenuList }} maxMenuHeight={320} />
 */
export function VirtualMenuList<Option>(
  props: MenuListProps<Option, false, GroupBase<Option>>,
) {
  const {
    children,
    maxHeight,
    focusedOption,
    getValue,
    innerProps,
    innerRef,
    getStyles,
  } = props;
  const esMovil = useEsMovil();

  const listRef = useRef<List>(null);
  const options = props.options as readonly Option[];
  const childrenArray = Array.isArray(children) ? children : [children];

  const [value] = getValue();
  const indiceSeleccionado = value ? options.indexOf(value) : -1;
  // El índice del foco cambia con la búsqueda y las flechas del teclado.
  const indiceFoco = focusedOption ? options.indexOf(focusedOption) : -1;

  useEffect(() => {
    if (esMovil) return;
    const objetivo = indiceFoco >= 0 ? indiceFoco : indiceSeleccionado;
    if (objetivo >= 0) listRef.current?.scrollToItem(objetivo, "auto");
  }, [esMovil, indiceFoco, indiceSeleccionado]);

  // Móvil: menú estándar (altura de fila automática, texto completo).
  if (esMovil) {
    return (
      <div
        {...innerProps}
        ref={innerRef}
        style={getStyles("menuList", props) as CSSProperties}
      >
        {children}
      </div>
    );
  }

  return (
    <List
      ref={listRef}
      height={maxHeight || ALTURA_POR_DEFECTO}
      itemCount={childrenArray.length}
      itemSize={ROW_HEIGHT}
      initialScrollOffset={
        indiceSeleccionado > 0 ? indiceSeleccionado * ROW_HEIGHT : 0
      }
      width="100%"
    >
      {({ index, style }) => (
        <div style={{ ...style, overflow: "hidden" }}>
          {childrenArray[index]}
        </div>
      )}
    </List>
  );
}

export default VirtualMenuList;
