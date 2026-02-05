'use client';

import { loginUser } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Obtener la ruta de redirección si existe
  const redirectTo = searchParams.get('redirect');
  const error = searchParams.get('error');

  // Mostrar error si viene del middleware
  useEffect(() => {
    if (error === 'unauthorized') {
      toast.error('No tienes permisos para acceder al sistema web. Los cajeros deben usar el sistema POS.');
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 [LOGIN] Formulario enviado');

    // Validación básica
    if (!email.trim() || !password) {
      console.log('❌ [LOGIN] Validación falló: campos vacíos');
      toast.error('Email y contraseña son requeridos');
      return;
    }

    console.log('🔍 [LOGIN] Intentando login con:', email);
    setIsLoading(true);

    try {
      console.log('🔍 [LOGIN] Llamando a loginUser...');
      const result = await loginUser({
        email: email.trim(),
        password,
      });

      console.log('🔍 [LOGIN] Resultado:', result);

      if (result.success) {
        console.log('✅ [LOGIN] Login exitoso!');
        toast.success('Bienvenido');

        // Redirigir según el rol del usuario o a la ruta solicitada
        if ('hasBusiness' in result && result.hasBusiness) {
          // Verificar si es cashier (no permitido en web)
          if ('role' in result && result.role === 'cashier') {
            console.log('❌ [LOGIN] Usuario es cajero - no permitido');
            toast.error('Los cajeros deben usar el sistema POS');
            setIsLoading(false);
            return;
          }

          // Si hay una ruta de redirección y el usuario tiene acceso, usarla
          if (redirectTo && redirectTo !== '/') {
            console.log('→ [LOGIN] Redirigiendo a ruta solicitada:', redirectTo);
            router.push(redirectTo);
            router.refresh();
            return;
          }

          // Redirigir según el rol del usuario
          if ('isManager' in result && result.isManager && 'branchId' in result) {
            console.log(
              '→ [LOGIN] Usuario es manager, redirigiendo a dashboard...'
            );
            // Guardar el branch_id del manager en localStorage
            if (result.branchId) {
              localStorage.setItem('selected-branch-id', result.branchId);
            }
            router.push('/dashboard');
            router.refresh();
          } else if (
            'role' in result &&
            (result.role === 'admin' || result.role === 'owner')
          ) {
            console.log(
              '→ [LOGIN] Usuario es admin/owner, redirigiendo a /business...'
            );
            router.push('/dashboard');
            router.refresh();
          } else {
            console.log('→ [LOGIN] Rol desconocido, redirigiendo a business...');
            router.push('/dashboard');
            router.refresh();
          }
        } else {
          console.log(
            '→ [LOGIN] Sin negocio/sucursal asignada, redirigiendo a business/create...'
          );
          router.push('/business/create');
        }
      } else {
        console.log(
          '❌ [LOGIN] Login falló:',
          'error' in result ? result.error : 'Error desconocido'
        );
        toast.error(
          'error' in result ? result.error : 'Error al iniciar sesión'
        );
      }
    } catch (error) {
      console.error('❌ [LOGIN] Excepción capturada:', error);
      toast.error('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      console.log('🔍 [LOGIN] Finalizando...');
      setIsLoading(false);
    }
  };

  return (
    <FieldSet className='w-sm'>
      <FieldLegend className='text-xl!'>Inicio de sesión</FieldLegend>
      <FieldDescription>
        Ingresa tus credenciales para acceder a tu cuenta
      </FieldDescription>
      <form
        className={cn('flex flex-col gap-5', className)}
        onSubmit={handleSubmit}
        {...props}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor='email'>Correo electrónico</FieldLabel>
            <Input
              id='email'
              type='email'
              placeholder='tu@ejemplo.com'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='password'>Contraseña</FieldLabel>
            <Input
              id='password'
              type='password'
              value={password}
              placeholder='••••••••••••••••'
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </Field>
          <Field>
            <Button type='submit' size={'lg'} disabled={isLoading}>
              {isLoading ? <Spinner /> : 'Ingresar'}
            </Button>
          </Field>
          <FieldSeparator>Aun no tienes una cuenta</FieldSeparator>
          <Field>
            <Link href='/signup'>
              <Button className='w-full' size={'lg'} variant='outline'>
                Registrarse
              </Button>
            </Link>
          </Field>
        </FieldGroup>
      </form>
    </FieldSet>
  );
}
