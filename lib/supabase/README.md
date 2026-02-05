# Supabase Clients - Guía de Uso

Esta carpeta contiene los diferentes clientes de Supabase para usar en diferentes contextos de tu aplicación.

## 📁 Archivos

### `client.ts` - Cliente del Navegador

**Uso:** Client Components, operaciones del lado del cliente

```tsx
'use client';
import { createClient } from '@/lib/supabase/client';

export function MyComponent() {
  const supabase = createClient();
  // Usar para operaciones del usuario autenticado
}
```

### `server.ts` - Cliente del Servidor con Cookies

**Uso:** Server Components, Server Actions con autenticación de usuario

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  // Las políticas RLS se aplican con el usuario autenticado
}
```

### `admin.ts` - Cliente Administrativo ⚠️

**Uso:** Operaciones administrativas que requieren bypass de RLS

```tsx
import { createAdminClient } from '@/lib/supabase/admin';

// Solo en Server Actions o API Routes
export async function serverAction() {
  const admin = createAdminClient();
  // Bypasea RLS - úsalo con cuidado
}
```

## 🔐 Variables de Entorno Requeridas

Crea un archivo `.env.local` con las siguientes variables:

```bash
# Públicas (se pueden exponer al cliente)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# ⚠️ PRIVADA - NUNCA exponer al cliente
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Dónde obtener las credenciales:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → API
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️

## 🎯 Cuándo usar cada cliente

### Use `client.ts` cuando:

- ✅ Estás en un Client Component (`'use client'`)
- ✅ El usuario necesita autenticarse
- ✅ Las operaciones son del usuario actual
- ✅ RLS protege los datos correctamente

### Use `server.ts` cuando:

- ✅ Estás en un Server Component o Server Action
- ✅ Necesitas el contexto del usuario autenticado
- ✅ Las operaciones respetan RLS
- ✅ Quieres validar datos del lado del servidor

### Use `admin.ts` cuando:

- ⚠️ Necesitas bypassear Row Level Security
- ⚠️ Operaciones administrativas (crear usuarios, asignar roles)
- ⚠️ Scripts de migración o mantenimiento
- ⚠️ Operaciones de auditoría o reportes globales

## 🚨 Advertencias de Seguridad

### Service Role Key

La `SUPABASE_SERVICE_ROLE_KEY` tiene **permisos totales** sobre tu base de datos:

- ❌ **NUNCA** la expongas al cliente
- ❌ **NUNCA** la uses en Client Components
- ❌ **NUNCA** la incluyas en código público
- ❌ **NUNCA** la envíes en responses al cliente
- ✅ **SOLO** úsala en el servidor
- ✅ **SIEMPRE** valida permisos en tu código
- ✅ **AGREGA** al `.gitignore` tu `.env.local`

## 📝 Ejemplos de Uso

### Ejemplo 1: Consulta básica del usuario (Client Component)

```tsx
'use client';
import { createClient } from '@/lib/supabase/client';

export function UserProfile() {
  const supabase = createClient();

  const fetchProfile = async () => {
    const { data } = await supabase.from('users').select('*').single();

    return data;
  };
}
```

### Ejemplo 2: Server Component con autenticación

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: businesses } = await supabase.from('businesses').select('*');

  return <div>{/* render */}</div>;
}
```

### Ejemplo 3: Operación administrativa (Server Action)

```tsx
'use server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createBusinessWithOwner(
  businessData: any,
  ownerEmail: string
) {
  const admin = createAdminClient();

  // Crear usuario en auth
  const { data: authData } = await admin.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
  });

  // Crear negocio
  const { data: business } = await admin
    .from('businesses')
    .insert(businessData)
    .select()
    .single();

  // Asignar owner
  await admin.from('businesses_users').insert({
    user_id: authData.user!.id,
    business_id: business.id,
    role: 'owner',
  });

  return business;
}
```

## 🔒 Mejores Prácticas

1. **Validación siempre**: Aunque uses el admin client, valida permisos en tu código
2. **Principio de menor privilegio**: Usa el cliente con menos permisos posible
3. **Logging**: Registra operaciones administrativas para auditoría
4. **Error handling**: Maneja errores adecuadamente
5. **Testing**: Prueba operaciones admin en ambiente de desarrollo primero

## 📚 Recursos Adicionales

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Service Role vs Anon Key](https://supabase.com/docs/guides/api/api-keys)

## 🐛 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY no está configurado"

- Verifica que `.env.local` existe y tiene la variable
- Reinicia el servidor de desarrollo después de agregar variables

### Error: "createAdminClient() solo puede usarse en el servidor"

- No uses el admin client en Client Components
- Mueve la lógica a un Server Action o API Route

### Errores de permisos con client/server

- Verifica tus políticas RLS en Supabase
- Asegúrate de que el usuario esté autenticado
- Revisa que el token de sesión sea válido
