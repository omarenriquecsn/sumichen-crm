// Alias del hook unificado (ver useApi.ts).
// useSupabase es el modo "vendedor": los sub-hooks se llaman SIN argumento y
// usan como alcance el id del usuario autenticado.
export { useApi as useSupabase } from "./useApi";