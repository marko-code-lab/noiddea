'use client';

import { signupUser, validateEmail } from '@/app/actions/auth-actions';
import { validateBusinessName } from '@/app/actions/business-actions';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '../ui/input-group';
import { Tooltip } from '../ui/tooltip';
import { useDebounce } from '@/src/hooks/use-debounce';
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";

interface SignupFormProps
  extends Omit<React.ComponentProps<'div'>, 'onSubmit'> {
  onSubmitSuccess?: () => void;
}

export function SignupForm({
  className,
  onSubmitSuccess,
  ...props
}: SignupFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('business');
  const [businessName, setBusinessName] = useState('');
  const [businessNameValidating, setBusinessNameValidating] = useState(false);
  const [businessNameAvailable, setBusinessNameAvailable] = useState<boolean | null>(null);
  const [emailName, setEmailName] = useState(''); // Solo el nombre del email (sin @mail.com)
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Función helper para construir el dominio del negocio
  const getBusinessDomain = (businessName: string) => {
    if (!businessName.trim()) return '';
    return `${businessName.trim().toLowerCase().replace(/ /g, '')}.app`;
  };

  // Email completo para validación y envío
  const fullEmail = emailName.trim() && businessName.trim()
    ? `${emailName.trim()}@${getBusinessDomain(businessName)}`
    : '';

  // Debounce para validar nombre del negocio
  const debouncedBusinessName = useDebounce(businessName, 500);

  useEffect(() => {
    if (debouncedBusinessName.trim().length >= 3) {
      setBusinessNameValidating(true);
      validateBusinessName(debouncedBusinessName)
        .then((result) => {
          setBusinessNameAvailable(result.success && result.available === true);
          setBusinessNameValidating(false);
        })
        .catch(() => {
          setBusinessNameAvailable(null);
          setBusinessNameValidating(false);
        });
    } else if (debouncedBusinessName.trim().length > 0) {
      setBusinessNameAvailable(null);
      setBusinessNameValidating(false);
    } else {
      setBusinessNameAvailable(null);
      setBusinessNameValidating(false);
    }
  }, [debouncedBusinessName]);

  // Debounce para validar email
  const debouncedEmailName = useDebounce(emailName, 500);
  const debouncedBusinessNameForEmail = useDebounce(businessName, 500);

  useEffect(() => {
    // Solo validar si tenemos tanto el nombre de usuario como el nombre del negocio
    if (!debouncedBusinessNameForEmail.trim() || !debouncedEmailName.trim()) {
      setEmailAvailable(null);
      setEmailValidating(false);
      return;
    }

    const emailToValidate = `${debouncedEmailName.trim()}@${getBusinessDomain(debouncedBusinessNameForEmail)}`;

    if (debouncedEmailName.trim().length >= 3) {
      setEmailValidating(true);
      validateEmail(emailToValidate)
        .then((result) => {
          setEmailAvailable(result.success);
          setEmailValidating(false);
        })
        .catch(() => {
          setEmailAvailable(null);
          setEmailValidating(false);
        });
    } else if (debouncedEmailName.trim().length > 0) {
      setEmailAvailable(null);
      setEmailValidating(false);
    } else {
      setEmailAvailable(null);
      setEmailValidating(false);
    }
  }, [debouncedEmailName, debouncedBusinessNameForEmail]);

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) {
      toast.error('El nombre del negocio es requerido');
      return;
    }

    if (businessName.trim().length < 3) {
      toast.error('El nombre del negocio debe tener al menos 3 caracteres');
      return;
    }

    // Validar que el nombre esté disponible
    if (businessNameAvailable === false) {
      toast.error('Este nombre de negocio ya está en uso');
      return;
    }

    if (businessNameValidating) {
      toast.info('Validando nombre del negocio...');
      return;
    }

    // Si aún no se ha validado, validar ahora
    if (businessNameAvailable === null) {
      setBusinessNameValidating(true);
      const result = await validateBusinessName(businessName);
      setBusinessNameValidating(false);

      if (!result.success || !result.available) {
        toast.error(result.error || 'Este nombre de negocio ya está en uso');
        return;
      }
      setBusinessNameAvailable(true);
    }

    setActiveTab('user-info');
  };

  const handleUserInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre completo es requerido');
      return;
    }

    if (!phone.trim()) {
      toast.error('El teléfono es requerido');
      return;
    }

    if (!emailName.trim()) {
      toast.error('El nombre de usuario del correo es requerido');
      return;
    }

    if (emailName.trim().length < 3) {
      toast.error('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!businessName.trim()) {
      toast.error('El nombre del negocio es requerido');
      return;
    }

    const emailToValidate = `${emailName.trim()}@${getBusinessDomain(businessName)}`;

    // Validar que el email esté disponible
    if (emailAvailable === false) {
      toast.error('Este correo ya está registrado');
      return;
    }

    if (emailValidating) {
      toast.info('Validando correo electrónico...');
      return;
    }

    // Si aún no se ha validado, validar ahora
    if (emailAvailable === null) {
      setEmailValidating(true);
      const result = await validateEmail(emailToValidate);
      setEmailValidating(false);

      if (!result.success) {
        toast.error(result.error || 'Este correo ya está registrado');
        return;
      }
      setEmailAvailable(true);
    }

    // Validación de contraseña
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    // Si todo está válido, proceder con el registro
    setIsLoading(true);

    try {
      const result = await signupUser({
        email: fullEmail,
        name: name.trim(),
        phone: phone.trim(),
        password,
        businessName: businessName.trim(),
      });

      if (result.success) {
        toast.success('¡Cuenta creada exitosamente! Por favor inicia sesión.');

        // Llamar al callback si existe
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }

        // Redirigir al login después de un breve delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast.error(result.error || 'Error creando cuenta');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error creando cuenta. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <FieldSet className='w-sm'>
      <FieldLegend className='text-xl!'>Crear cuenta</FieldLegend>
      <FieldDescription>
        Unete a la plataforma de manera gratuita
      </FieldDescription>
      <div className={cn('w-full', className)} {...props}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full'
        >
          <TabsContent value='email'>
            <form>
              <Field>
                <FieldLabel>Correo electronico</FieldLabel>
                <Input
                  type='email'
                  placeholder='marko@noiddea.com'
                  required
                  disabled={isLoading}
                  autoFocus
                  className={cn(
                    emailAvailable === true && 'border-green-500',
                    emailAvailable === false && 'border-red-500'
                  )}
                />
              </Field>
            </form>
          </TabsContent>
          <TabsContent value='business' className='space-y-6'>
            <form onSubmit={handleBusinessSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor='business-name'>Nombre de negocio</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id='business-name'
                      type='text'
                      placeholder='Acme Inc.'
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      required
                      disabled={isLoading}
                      autoFocus
                      className={cn(
                        businessNameAvailable === true && 'border-green-500',
                        businessNameAvailable === false && 'border-red-500'
                      )}
                    />
                    {businessName.trim().length > 0 && (
                      <InputGroupAddon align="inline-end">
                        {businessNameValidating ? (
                          <Spinner />
                        ) : businessNameAvailable === true ? (
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                        ) : businessNameAvailable === false ? (
                          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                        ) : null}
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                </Field>
                <Field>
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={businessNameValidating || businessNameAvailable === false || !businessName.trim()}
                  >
                    Continuar
                  </Button>
                </Field>
                <FieldSeparator>Ya tienes cuenta</FieldSeparator>
                <Field>
                  <Link href='/login'>
                    <Button className='w-full' variant='outline'>
                      Iniciar sesión
                    </Button>
                  </Link>
                </Field>
              </FieldGroup>
            </form>
          </TabsContent>

          <TabsContent value='user-info' className='space-y-6'>
            <form onSubmit={handleUserInfoSubmit}>
              <FieldGroup>
                <Field>
                  <div className='flex items-center'>
                    <FieldLabel htmlFor='business-name-display'>
                      Nombre de negocio
                    </FieldLabel>
                    <a
                      onClick={() => setActiveTab('business')}
                      className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                    >
                      Cambiar
                    </a>
                  </div>
                  <Input
                    id='business-name-display'
                    type='text'
                    value={businessName}
                    disabled
                    className='bg-muted'
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='name'>Nombre completo</FieldLabel>
                  <Input
                    id='name'
                    type='text'
                    placeholder='Juan Pérez'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='phone'>Teléfono</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>+51</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="000 000 000"
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <Tooltip>
                        <TooltipTrigger>
                          <InputGroupButton
                            variant="ghost"
                            aria-label="Info"
                            size="icon-xs"
                          >
                            <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                          </InputGroupButton>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>El número de teléfono del usuario</p>
                        </TooltipContent>
                      </Tooltip>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor='email-name'>Nombre de usuario</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id='email-name'
                      type='text'
                      placeholder='usuario'
                      value={emailName}
                      onChange={e => setEmailName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>@{businessName.trim().toLowerCase().replace(/ /g, '')}.app</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor='password'>Contraseña</FieldLabel>
                  <Input
                    id='password'
                    type='password'
                    placeholder='••••••••'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='confirm-password'>Confirmar contraseña</FieldLabel>
                  <Input
                    id='confirm-password'
                    type='password'
                    placeholder='••••••••'
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isLoading || !name.trim() || !phone.trim() || !emailName.trim() || emailName.trim().length < 3 || emailAvailable === false || emailValidating || !password || !confirmPassword}
                  >
                    {isLoading ? <Spinner /> : 'Crear cuenta'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </FieldSet>
  );
}
