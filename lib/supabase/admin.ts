import { createClient } from '@supabase/supabase-js';
import { Database } from '@/src/types/supabase';

/**
 * Cliente de Supabase con Service Role Key
 *
 * ⚠️ ADVERTENCIA DE SEGURIDAD ⚠️
 * Este cliente bypasea todas las políticas de Row Level Security (RLS).
 * Solo debe usarse en:
 * - Server Actions
 * - API Routes
 * - Server Components
 * - Scripts de servidor
 *
 * NUNCA exponer este cliente al navegador o cliente.
 * NUNCA usar en Client Components.
 */

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Crea un cliente de Supabase con permisos de administrador
 * Usa el service role key que bypasea RLS
 */
export function createAdminClient() {
  // Validar que las variables de entorno estén configuradas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurado');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado');
  }

  // Validar que estamos en el servidor
  if (typeof window !== 'undefined') {
    throw new Error(
      '⚠️ PELIGRO: createAdminClient() solo puede usarse en el servidor. ' +
      'Esto podría exponer tu service role key al cliente.'
    );
  }

  // Usar singleton pattern para reutilizar la conexión
  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

/**
 * Alias más descriptivo para el cliente admin
 */
export const getAdminClient = createAdminClient;

/**
 * Ejecuta una operación con el cliente admin y proporciona mejor manejo de errores
 */
export async function executeAsAdmin<T>(
  operation: (client: ReturnType<typeof createAdminClient>) => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const client = createAdminClient();
    const data = await operation(client);
    return { data, error: null };
  } catch (error) {
    console.error('Error en operación admin:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Error desconocido'),
    };
  }
}
