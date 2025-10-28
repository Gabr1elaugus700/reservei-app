export interface TenantTheme {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
}

export const defaultThemes: Record<string, TenantTheme> = {
  default: {
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    secondary: '#f1f5f9',
    secondaryForeground: '#0f172a',
    accent: '#f1f5f9',
    accentForeground: '#0f172a',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#3b82f6',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    success: '#10b981',
    successForeground: '#ffffff',
    warning: '#f59e0b',
    warningForeground: '#ffffff',
  },
  blue: {
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    secondary: '#dbeafe',
    secondaryForeground: '#1e3a8a',
    accent: '#dbeafe',
    accentForeground: '#1e3a8a',
    background: '#ffffff',
    foreground: '#1e3a8a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#2563eb',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    success: '#059669',
    successForeground: '#ffffff',
    warning: '#d97706',
    warningForeground: '#ffffff',
  },
  green: {
    primary: '#059669',
    primaryForeground: '#ffffff',
    secondary: '#dcfce7',
    secondaryForeground: '#14532d',
    accent: '#dcfce7',
    accentForeground: '#14532d',
    background: '#ffffff',
    foreground: '#14532d',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#059669',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    success: '#059669',
    successForeground: '#ffffff',
    warning: '#d97706',
    warningForeground: '#ffffff',
  },
  purple: {
    primary: '#7c3aed',
    primaryForeground: '#ffffff',
    secondary: '#ede9fe',
    secondaryForeground: '#581c87',
    accent: '#ede9fe',
    accentForeground: '#581c87',
    background: '#ffffff',
    foreground: '#581c87',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#7c3aed',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    success: '#059669',
    successForeground: '#ffffff',
    warning: '#d97706',
    warningForeground: '#ffffff',
  },
  dark: {
    primary: '#f8fafc',
    primaryForeground: '#0f172a',
    secondary: '#1e293b',
    secondaryForeground: '#f8fafc',
    accent: '#1e293b',
    accentForeground: '#f8fafc',
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    border: '#1e293b',
    input: '#1e293b',
    ring: '#f8fafc',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    success: '#22c55e',
    successForeground: '#ffffff',
    warning: '#eab308',
    warningForeground: '#000000',
  },
};

export function applyTenantTheme(theme: TenantTheme) {
  const root = document.documentElement;
  
  // Aplicar todas as CSS variables do tema
  Object.entries(theme).forEach(([key, value]) => {
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
}

export function getTenantTheme(tenantSlug: string, customTheme?: Partial<TenantTheme>): TenantTheme {
  const baseTheme = defaultThemes[tenantSlug] || defaultThemes.default;
  
  if (customTheme) {
    return { ...baseTheme, ...customTheme };
  }
  
  return baseTheme;
}

export function generateThemeCSS(theme: TenantTheme): string {
  const cssVars = Object.entries(theme)
    .map(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      return `  ${cssVarName}: ${value};`;
    })
    .join('\n');

  return `:root {\n${cssVars}\n}`;
}