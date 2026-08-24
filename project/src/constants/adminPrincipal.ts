// Identidad del admin PRINCIPAL (Omar Contreras) en Supabase Auth.
// Es el único usuario autorizado para registrar nuevos vendedores/admins
// desde la sección "Registrar Usuarios" (gated también en el backend:
// ver OMAR_SUPABASE_ID en backend/src/controllers/usuariosControllers.ts).
export const OMAR_SUPABASE_ID = "c0794db2-460a-4ec7-b89a-c1243c544b65";

// El `currentUser` de useAuth() es el perfil de `vendedores` (GET /usuarios/:id):
// su `.id` es el id de la tabla y el id de Supabase Auth (auth.users.id) viaja en
// `.supabase_id` (aunque la interfaz User no lo declare). Este helper devuelve
// true si CUALQUIERA de los ids recibidos coincide con el supabase_id de Omar.
export const esAdminPrincipal = (
  ...supabaseIds: (string | undefined)[]
): boolean => supabaseIds.some((id) => id === OMAR_SUPABASE_ID);