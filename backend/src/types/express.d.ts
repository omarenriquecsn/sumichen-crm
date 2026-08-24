import { SupabaseUser } from './SupabaseUser'; // ajusta según tu ruta real

declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUser;
    }
  }
}
