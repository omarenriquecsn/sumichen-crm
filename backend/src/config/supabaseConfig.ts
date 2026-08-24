// ...existing code...
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const BUCKET = process.env.SUPABASE_CLEANUP_BUCKET || 'evidencias';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

export const getUsuarioDesdeToken = async (accessToken: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase no configurado: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY');
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) throw new Error(`Token inválido: ${error.message}`);
  return data;
};

export async function deleteOldEvidencias(days = 60) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('deleteOldEvidencias: Supabase no configurado, operación omitida');
    return { message: 'Supabase not configured', attempted: 0, deleted: 0 };
  }

  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const toDelete: string[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit, offset, sortBy: { column: 'created_at', order: 'asc' } as any });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const createdAtStr = (item as any).created_at ?? (item as any).updated_at ?? (item as any).last_modified;
      if (!createdAtStr) continue;
      const createdAt = new Date(createdAtStr);
      if (isNaN(createdAt.getTime())) continue;
      if (createdAt < threshold) toDelete.push(item.name);
    }

    if (data.length < limit) break;
    offset += data.length;
  }

  if (toDelete.length === 0) return { message: 'No old files to delete', deleted: 0, attempted: 0 };

  const chunkSize = 100;
  let deleted = 0;
  const errors: any[] = [];

  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) errors.push({ chunkCount: chunk.length, message: error.message });
    else deleted += chunk.length;
  }

  return { message: 'Cleanup finished', attempted: toDelete.length, deleted, errors };
}
// ...existing code...