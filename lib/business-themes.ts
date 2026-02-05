/**
 * Diccionario de temas y colores para negocios
 * Este archivo centraliza la definición de temas para evitar duplicación de código
 */

export interface ThemeColor {
  primary: string;
  primaryForeground: string;
}

export interface ThemeOption {
  name: string;
  color: string; // Color de Tailwind para el botón de selección
}

/**
 * Lista de temas disponibles para selección
 */
export const businessThemes: ThemeOption[] = [
  {
    name: 'neutral',
    color: 'neutral-50',
  },
  {
    name: 'green',
    color: 'green-500',
  },
  {
    name: 'red',
    color: 'red-500',
  },
  {
    name: 'blue',
    color: 'blue-500',
  },
  {
    name: 'violet',
    color: 'violet-500',
  },
  {
    name: 'orange',
    color: 'orange-500',
  },
];

/**
 * Mapeo de temas a colores en formato oklch para modo light
 */
export const themeColors: Record<string, ThemeColor> = {
  neutral: {
    primary: 'oklch(0 0 0)', // Negro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  green: {
    primary: 'oklch(0.5000 0.2000 145.0000)', // Verde
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  red: {
    primary: 'oklch(0.5500 0.2200 25.0000)', // Rojo
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  blue: {
    primary: 'oklch(0.5000 0.2000 250.0000)', // Azul
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  violet: {
    primary: 'oklch(0.5000 0.2000 300.0000)', // Violeta
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  orange: {
    primary: 'oklch(0.6500 0.2000 65.0000)', // Naranja
    primaryForeground: 'oklch(1 0 0)', // Negro (mejor contraste)
  },
};

/**
 * Mapeo de temas a colores en formato oklch para modo dark
 */
export const themeColorsDark: Record<string, ThemeColor> = {
  neutral: {
    primary: 'oklch(1 0 0)', // Blanco
    primaryForeground: 'oklch(0 0 0)', // Negro
  },
  green: {
    primary: 'oklch(0.6000 0.2000 145.0000)', // Verde más claro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  red: {
    primary: 'oklch(0.6500 0.2200 25.0000)', // Rojo más claro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  blue: {
    primary: 'oklch(0.6000 0.2000 250.0000)', // Azul más claro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  violet: {
    primary: 'oklch(0.6000 0.2000 300.0000)', // Violeta más claro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
  orange: {
    primary: 'oklch(0.7000 0.2000 65.0000)', // Naranja más claro
    primaryForeground: 'oklch(1 0 0)', // Blanco
  },
};

/**
 * Tema por defecto
 */
export const DEFAULT_THEME = 'neutral';

/**
 * Obtiene los colores de un tema según el modo dark/light
 */
export function getThemeColors(themeName: string | null | undefined, isDark: boolean): ThemeColor | null {
  const theme = themeName || DEFAULT_THEME;
  const colors = isDark ? themeColorsDark[theme] : themeColors[theme];
  return colors || null;
}

/**
 * Aplica un tema al documento
 */
export function applyThemeToDocument(themeName: string | null | undefined, isDark: boolean): void {
  if (typeof document === 'undefined') return;

  const colors = getThemeColors(themeName, isDark);
  if (colors) {
    document.documentElement.style.setProperty('--primary', colors.primary);
    document.documentElement.style.setProperty('--primary-foreground', colors.primaryForeground);
  }
}

