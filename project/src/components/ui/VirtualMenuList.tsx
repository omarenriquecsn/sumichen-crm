import { useEffect, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import type { GroupBase, MenuListProps } from "react-select";

const ROW_HEIGHT = 35;
const ALTURA_POR_DEFECTO = 320;

/**
 * MenuList virtualizado para react-select. Sin esto, react-select monta TODAS
 * las opciones como nodos DOM (con miles de clientes o productos el desplegable
 * se vuelve muy lento). Con react-window solo se renderizan las filas visibles.
 *
 * Uso: <Select components={{ MenuList: VirtualMenuList }} maxMenuHeight={320} />
 */
export function VirtualMenuList<Option>(
  props: MenuListProps<Option, false, GroupBase<Option>>,
) {
  const { children, maxHeight, focusedOption, getValue } = props;
  const options = props.options as readonly Option[];
  const childrenArray = Array.isArray(children) ? children : [children];

  const listRef = useRef<List>(null);

  const [value] = getValue();
  const indiceSeleccionado = value ? options.indexOf(value) : -1;
  // El índice del foco cambia con la búsqueda y las flechas del teclado.
  const indiceFoco = focusedOption ? options.indexOf(focusedOption) : -1;

  useEffect(() => {
    const objetivo = indiceFoco >= 0 ? indiceFoco : indiceSeleccionado;
    if (objetivo >= 0) listRef.current?.scrollToItem(objetivo, "auto");
  }, [indiceFoco, indiceSeleccionado]);

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
      {({ index, style }) => <div style={style}>{childrenArray[index]}</div>}
    </List>
  );
}

export default VirtualMenuList;
