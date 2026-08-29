export const formatCurrency = (
  valor: number | string | null | undefined,
  decimales = 2
): string => {
  const numero = Number(valor || 0);
  return (
    "$" +
    numero.toLocaleString("en-US", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
  );
};

export const formatCurrencyCompacto = (
  valor: number | string | null | undefined
): string => {
  const numero = Number(valor || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(numero);
};

export const formatNumero = (
  valor: number | string | null | undefined,
  decimales = 2
): string => {
  const numero = Number(valor || 0);
  return numero.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
};
