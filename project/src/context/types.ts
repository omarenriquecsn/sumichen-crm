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
}

export interface AuthContextType {
  currentUser: User | null | undefined;
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
