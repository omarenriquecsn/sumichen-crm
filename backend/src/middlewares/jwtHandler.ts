import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { AppDataSource } from '../config/dataBaseConfig';
import { Vendedor } from '../entities/Vendedores';

dotenv.config();
export type SupabaseUser = {
  id: string;
  // El JWT de Supabase identifica al usuario con `sub`, no con `id`.
  // `verificarToken` lo normaliza y lo deja en `id` (ver abajo).
  sub?: string;
  email: string;
  role: string;
  aud: string;
  created_at: string;
  updated_at: string;
  app_metadata: {
    provider: string;
    roles?: string[];
  };
  user_metadata: {
    nombre?: string;
    empresaId?: string;
    telefono?: string;
    rol?: 'admin' | 'vendedor';
  };
  // ⚠ Punto 5: rol AUTORITATIVO. Se lee de la tabla `vendedores` en cada
  // request (ver verificarToken). El `user_metadata.rol` del JWT es
  // auto-reportado en el signup y NO se debe usar para autorización.
  rol?: 'admin' | 'vendedor';
  // ⚠ Marketing/Leads: `vendedor_db_id` es el id de la tabla `vendedores`
  // (PK uuid propio del Postgres), NO el supabase_id. Los FKs de leads,
  // conversaciones, mensajes y reasignaciones apuntan al id de tabla, así que
  // para filtrar/asignar por vendedor hay que usar SIEMPRE este campo.
  // (ver AGENTS.md §3.4: req.user.id = supabase_id, vendedor_db_id = id de tabla)
  vendedor_db_id?: string;
};

const verificarToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acceso denegado' });

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Error de clave secreta' });

  try {
    const decoded = jwt.verify(token, secret) as SupabaseUser;

    // Los JWT de Supabase NO traen un claim `id`: la identidad real del usuario
    // vive en `sub` (el UUID de Supabase Auth, que coincide con el campo
    // `supabase_id` de la tabla `vendedores`). Lo normalizamos aquí para que
    // `req.user.id` siempre esté disponible (ej. comparación "propio perfil").
    req.user = decoded;
    req.user.id = decoded.sub ?? decoded.id;

    // Punto 5: el rol para autorizar se lee de la tabla `vendedores` (fuente de
    // verdad), NO del JWT. Si el perfil no existe aún (ej. signup en proceso) o
    // la consulta falla, `rol` queda undefined → el usuario se trata como
    // vendedor (fail-safe: nunca se otorga admin por error).
    try {
      const vendedor = await AppDataSource.getRepository(Vendedor).findOneBy({
        supabase_id: req.user.id,
      });
      req.user.rol = vendedor?.rol;
      req.user.vendedor_db_id = vendedor?.id;
    } catch (dbErr) {
      console.error('No se pudo leer el rol del vendedor:', dbErr);
      req.user.rol = undefined;
      req.user.vendedor_db_id = undefined;
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: 'Acceso denegado' });
  }
};

export default verificarToken;