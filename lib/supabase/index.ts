/**
 * Supabase Clients - Punto de entrada centralizado
 *
 * Este archivo exporta todos los clientes de Supabase disponibles.
 * Ver README.md para guías de uso detalladas.
 */

// Cliente del navegador (Client Components)
export { createClient } from './client';

// Cliente del servidor con cookies (Server Components/Actions)
export { createServerSupabaseClient } from './server';

// Cliente administrativo con service role (Solo servidor, operaciones admin)
export { createAdminClient, getAdminClient, executeAsAdmin } from './admin';

// Middleware
export { updateSession } from './middleware';
