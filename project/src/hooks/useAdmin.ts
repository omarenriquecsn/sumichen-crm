// Alias del hook unificado (ver useApi.ts).
// useAdmin es el modo "admin": los sub-hooks aceptan un vendedorId opcional
// para acotar los datos al vendedor seleccionado (ej. VendedorPanel).
export { useApi as useAdmin } from "./useApi";