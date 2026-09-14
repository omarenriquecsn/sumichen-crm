import { User, Session } from "@supabase/supabase-js";
import { QueryObserverResult } from "@tanstack/react-query";

export interface UserData {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "vendedor" | "admin";
  activo: boolean;
  telefono?: string;
  avatar?: string;
  sidebar_oculto?: string[];
  firma_url?: string;
  google_email?: string | null;
}

export interface AuthContextType {
  // `currentUser` viene de `useCurrentUser` → `GET /usuarios/:id`, que devuelve
  // el perfil de la tabla `vendedores` (no el `User` crudo de Supabase). En
  // runtime incluye `rol` (autoritativo) y `supabase_id`; lo tipamos aquí para
  // no acceder a propiedades inexistentes del tipo `User`.
  currentUser:
    | (User & { rol?: "vendedor" | "admin"; supabase_id?: string })
    | null
    | undefined;
  session: Session | null | undefined;
  userData: UserData | null | undefined;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: { nombre: string; apellido: string; rol?: string }
  ) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<QueryObserverResult<UserData | null, Error>>;
}
