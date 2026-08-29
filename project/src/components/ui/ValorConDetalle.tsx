import React, { useEffect, useRef, useState } from "react";

interface ValorConDetalleProps {
  visible: string;
  exacto?: string;
  className?: string;
}

export const ValorConDetalle: React.FC<ValorConDetalleProps> = ({
  visible,
  exacto,
  className,
}) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cerrarAlTocarFuera = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("pointerdown", cerrarAlTocarFuera);
    return () => document.removeEventListener("pointerdown", cerrarAlTocarFuera);
  }, []);

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center cursor-help ${
        className ?? ""
      }`}
      onPointerEnter={() => setAbierto(true)}
      onPointerLeave={() => setAbierto(false)}
    >
      <span>{visible}</span>
      {abierto && exacto ? (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs font-medium px-3 py-1.5 shadow-lg pointer-events-none">
          {exacto}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </span>
      ) : null}
    </span>
  );
};
