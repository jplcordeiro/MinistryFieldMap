# MinistryFieldMap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um app React Native com Expo que permite visualizar territórios de congregação no mapa e marcar endereços como visitados, com autenticação social via Supabase.

**Architecture:** Expo Router (file-based) organiza as rotas em grupos `(auth)` e `(app)`, com um contexto de autenticação global. O Supabase serve como backend único (banco de dados, auth e realtime). Componentes de mapa são encapsulados para isolar a dependência do `react-native-maps`.

**Tech Stack:** Expo SDK 52+, Expo Router v4, TypeScript, react-native-maps, @supabase/supabase-js, expo-auth-session, expo-secure-store, @testing-library/react-native, jest-expo

---

## Mapa de Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app.config.ts` | Configuração do Expo + variáveis de ambiente |
| `.env` | Credenciais Supabase (não commitado) |
| `lib/types.ts` | Tipos TypeScript globais (Territory, Address, etc.) |
| `lib/supabase.ts` | Cliente Supabase singleton |
| `lib/auth-context.tsx` | Contexto React de autenticação + hooks |
| `app/_layout.tsx` | Root layout: provê AuthContext, redireciona por estado de auth |
| `app/(auth)/_layout.tsx` | Layout do grupo de auth |
| `app/(auth)/login.tsx` | Tela de login (Google + Apple) |
| `app/(app)/_layout.tsx` | Layout protegido (tab bar ou stack) |
| `app/(app)/index.tsx` | Mapa principal com todos os territórios |
| `app/(app)/territory/[id].tsx` | Mapa focado + endereços + modal de visita |
| `app/(app)/profile.tsx` | Perfil do usuário + logout |
| `components/TerritoryPolygon.tsx` | Polígono colorido por status no mapa |
| `components/AddressPin.tsx` | Pin de endereço colorido por status |
| `components/VisitModal.tsx` | Modal para marcar visita com nota |
| `supabase/migrations/001_initial.sql` | SQL de criação das tabelas e RLS |

---

## Task 1: Scaffolding do projeto Expo

**Files:**
- Create: `app.config.ts`
- Create: `.env.example`
- Create: `.gitignore` (atualizado)

- [ ] **Step 1: Inicializar projeto Expo com template TypeScript**

No terminal, dentro de `/home/joao/Documents/Projetos/MinistryFieldMap`:

```bash
npx create-expo-app@latest . --template blank-typescript
```

Quando perguntar sobre conflitos com arquivos existentes (README.md, LICENSE), escolha manter os arquivos existentes (`n`).

- [ ] **Step 2: Instalar dependências principais**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install react-native-maps
npx expo install @supabase/supabase-js expo-auth-session expo-secure-store expo-crypto expo-web-browser
npx expo install @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Substituir app.json por app.config.ts**

Remover `app.json` e criar `app.config.ts`:

```typescript
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MinistryFieldMap',
  slug: 'ministry-field-map',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'ministryfieldmap',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.ministryfieldmap.app',
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.ministryfieldmap.app',
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
```

- [ ] **Step 4: Criar .env.example**

```bash
# .env.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_MAPS_API_KEY_ANDROID=your-android-key
GOOGLE_MAPS_API_KEY_IOS=your-ios-key
```

Copiar para `.env` e preencher depois:
```bash
cp .env.example .env
```

- [ ] **Step 5: Atualizar .gitignore**

Adicionar ao final do `.gitignore` existente:
```
.env
*.env.local
```

- [ ] **Step 6: Verificar que o projeto compila**

```bash
npx expo export --platform web --output-dir /tmp/expo-check 2>&1 | tail -5
```

Expected: sem erros de TypeScript ou módulos faltando.

- [ ] **Step 7: Commit**

```bash
git add app.config.ts .env.example .gitignore package.json package-lock.json tsconfig.json
git commit -m "feat: scaffold Expo project with TypeScript and core dependencies"
```

---

## Task 2: Tipos globais e cliente Supabase

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase.ts`
- Create: `lib/__tests__/supabase.test.ts`

- [ ] **Step 1: Criar lib/types.ts**

```typescript
export type TerritoryStatus = 'available' | 'in_use' | 'completed';
export type AddressStatus = 'not_visited' | 'visited' | 'no_contact';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Territory {
  id: string;
  name: string;
  coordinates: GeoJSONPolygon;
  status: TerritoryStatus;
  created_at: string;
}

export interface Address {
  id: string;
  territory_id: string;
  lat: number;
  lng: number;
  status: AddressStatus;
  notes: string | null;
  visited_at: string | null;
  visited_by: string | null;
}

export const TERRITORY_STATUS_COLORS: Record<TerritoryStatus, string> = {
  available: '#22c55e',   // green-500
  in_use: '#eab308',      // yellow-500
  completed: '#9ca3af',   // gray-400
};

export const ADDRESS_STATUS_COLORS: Record<AddressStatus, string> = {
  not_visited: '#3b82f6', // blue-500
  visited: '#22c55e',     // green-500
  no_contact: '#ef4444',  // red-500
};
```

- [ ] **Step 2: Escrever teste de tipos**

Criar `lib/__tests__/supabase.test.ts`:

```typescript
import { TERRITORY_STATUS_COLORS, ADDRESS_STATUS_COLORS } from '../types';

describe('TERRITORY_STATUS_COLORS', () => {
  it('has a color for every status', () => {
    expect(TERRITORY_STATUS_COLORS.available).toBeDefined();
    expect(TERRITORY_STATUS_COLORS.in_use).toBeDefined();
    expect(TERRITORY_STATUS_COLORS.completed).toBeDefined();
  });
});

describe('ADDRESS_STATUS_COLORS', () => {
  it('has a color for every status', () => {
    expect(ADDRESS_STATUS_COLORS.not_visited).toBeDefined();
    expect(ADDRESS_STATUS_COLORS.visited).toBeDefined();
    expect(ADDRESS_STATUS_COLORS.no_contact).toBeDefined();
  });
});
```

- [ ] **Step 3: Rodar teste para verificar que falha (módulo não existe ainda)**

```bash
npx jest lib/__tests__/supabase.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../types'`

- [ ] **Step 4: Criar lib/supabase.ts**

```typescript
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 5: Instalar polyfill de URL necessário**

```bash
npx expo install react-native-url-polyfill
```

- [ ] **Step 6: Rodar testes para verificar que passam**

```bash
npx jest lib/__tests__/supabase.test.ts --no-coverage 2>&1 | tail -10
```

Expected: PASS — 2 tests passed

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/supabase.ts lib/__tests__/supabase.test.ts package.json package-lock.json
git commit -m "feat: add global types and Supabase client"
```

---

## Task 3: Contexto de autenticação

**Files:**
- Create: `lib/auth-context.tsx`
- Create: `lib/__tests__/auth-context.test.tsx`

- [ ] **Step 1: Escrever testes do contexto de auth**

Criar `lib/__tests__/auth-context.test.tsx`:

```typescript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../auth-context';

// Mock do supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signInWithIdToken: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  it('starts with loading=true and no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it('sets loading=false after session check completes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.loading).toBe(false);
  });

  it('throws if used outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest lib/__tests__/auth-context.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../auth-context'`

- [ ] **Step 3: Criar lib/auth-context.tsx**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
npx jest lib/__tests__/auth-context.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS — 3 tests passed

- [ ] **Step 5: Commit**

```bash
git add lib/auth-context.tsx lib/__tests__/auth-context.test.tsx
git commit -m "feat: add authentication context with Supabase session management"
```

---

## Task 4: Migração SQL do Supabase

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Criar arquivo de migração**

Criar `supabase/migrations/001_initial.sql`:

```sql
-- Enum types
CREATE TYPE territory_status AS ENUM ('available', 'in_use', 'completed');
CREATE TYPE address_status AS ENUM ('not_visited', 'visited', 'no_contact');

-- Territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  status territory_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  status address_status NOT NULL DEFAULT 'not_visited',
  notes TEXT,
  visited_at TIMESTAMPTZ,
  visited_by UUID REFERENCES auth.users(id)
);

-- Row Level Security
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all territories and addresses
CREATE POLICY "Authenticated users can read territories"
  ON territories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (true);

-- Policies: authenticated users can update address status
CREATE POLICY "Authenticated users can update addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime for addresses
ALTER PUBLICATION supabase_realtime ADD TABLE addresses;
```

- [ ] **Step 2: Executar migração no Supabase**

No painel do Supabase (SQL Editor), executar o conteúdo do arquivo acima. Verificar que todas as tabelas foram criadas sem erros.

- [ ] **Step 3: Inserir dados de teste no Supabase**

No SQL Editor do Supabase:

```sql
INSERT INTO territories (name, coordinates, status) VALUES
(
  'Território 01',
  '{"type": "Polygon", "coordinates": [[[-46.635, -23.545], [-46.630, -23.545], [-46.630, -23.540], [-46.635, -23.540], [-46.635, -23.545]]]}',
  'available'
),
(
  'Território 02',
  '{"type": "Polygon", "coordinates": [[[-46.625, -23.545], [-46.620, -23.545], [-46.620, -23.540], [-46.625, -23.540], [-46.625, -23.545]]]}',
  'in_use'
);

-- Inserir endereços para Território 01 (use o id retornado acima)
INSERT INTO addresses (territory_id, lat, lng, status) VALUES
((SELECT id FROM territories WHERE name = 'Território 01'), -23.542, -46.633, 'not_visited'),
((SELECT id FROM territories WHERE name = 'Território 01'), -23.543, -46.632, 'visited');
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial.sql
git commit -m "feat: add Supabase migration for territories and addresses with RLS"
```

---

## Task 5: Root layout e proteção de rotas

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(app)/_layout.tsx`

- [ ] **Step 1: Criar app/_layout.tsx**

```typescript
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../lib/auth-context';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/');
    }
  }, [session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Criar app/(auth)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
```

- [ ] **Step 3: Criar app/(app)/_layout.tsx**

```typescript
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Territórios' }} />
      <Stack.Screen name="territory/[id]" options={{ title: 'Território' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
```

- [ ] **Step 4: Verificar que o app inicia sem erros**

```bash
npx expo start --no-dev 2>&1 | head -20
```

Expected: Metro bundler inicia sem erros de módulo.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx app/\(auth\)/_layout.tsx app/\(app\)/_layout.tsx
git commit -m "feat: add root layout with auth-based routing protection"
```

---

## Task 6: Tela de login

**Files:**
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: Escrever teste da tela de login**

Criar `app/(auth)/__tests__/login.test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from '../login';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    performRequest: jest.fn(),
    Operation: { LOGIN: 0 },
    Scope: { FULL_NAME: 0, EMAIL: 1 },
  },
}));

describe('LoginScreen', () => {
  it('renders login title', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Ministry Field Map')).toBeTruthy();
  });

  it('renders Google sign-in button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Entrar com Google')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Instalar dependência de Apple Auth**

```bash
npx expo install @invertase/react-native-apple-authentication
```

- [ ] **Step 3: Rodar teste para verificar falha**

```bash
npx jest app/\(auth\)/__tests__/login.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../login'`

- [ ] **Step 4: Criar app/(auth)/login.tsx**

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = React.useState(false);

  const [_request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setLoading(true);
      supabase.auth
        .signInWithIdToken({ provider: 'google', token: id_token })
        .finally(() => setLoading(false));
    }
  }, [response]);

  const handleGoogleSignIn = () => promptAsync();

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const { identityToken } = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      if (identityToken) {
        await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ministry Field Map</Text>
      <Text style={styles.subtitle}>Controle de Territórios</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
            <Text style={styles.buttonText}>Entrar com Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.button, styles.appleButton]}
              onPress={handleAppleSignIn}
            >
              <Text style={[styles.buttonText, styles.appleButtonText]}>
                Entrar com Apple
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e3a5f',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
  },
});
```

- [ ] **Step 5: Adicionar variáveis Google ao .env.example**

Adicionar ao `.env.example`:
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
```

- [ ] **Step 6: Rodar testes**

```bash
npx jest app/\(auth\)/__tests__/login.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS — 2 tests passed

- [ ] **Step 7: Commit**

```bash
git add app/\(auth\)/login.tsx app/\(auth\)/__tests__/login.test.tsx .env.example package.json package-lock.json
git commit -m "feat: add login screen with Google and Apple sign-in"
```

---

## Task 7: Componentes de mapa

**Files:**
- Create: `components/TerritoryPolygon.tsx`
- Create: `components/AddressPin.tsx`
- Create: `components/__tests__/TerritoryPolygon.test.tsx`
- Create: `components/__tests__/AddressPin.test.tsx`

- [ ] **Step 1: Escrever testes dos componentes de mapa**

Criar `components/__tests__/TerritoryPolygon.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { TerritoryPolygon } from '../TerritoryPolygon';
import { TERRITORY_STATUS_COLORS } from '../../lib/types';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    Polygon: (props: any) => <View testID="polygon" {...props} />,
  };
});

const coords = [
  { latitude: -23.545, longitude: -46.635 },
  { latitude: -23.540, longitude: -46.635 },
  { latitude: -23.540, longitude: -46.630 },
];

describe('TerritoryPolygon', () => {
  it('renders with correct fill color for available status', () => {
    const { getByTestId } = render(
      <TerritoryPolygon coordinates={coords} status="available" onPress={() => {}} />
    );
    const polygon = getByTestId('polygon');
    expect(polygon.props.fillColor).toBe(TERRITORY_STATUS_COLORS.available + '80');
  });

  it('renders with correct fill color for in_use status', () => {
    const { getByTestId } = render(
      <TerritoryPolygon coordinates={coords} status="in_use" onPress={() => {}} />
    );
    const polygon = getByTestId('polygon');
    expect(polygon.props.fillColor).toBe(TERRITORY_STATUS_COLORS.in_use + '80');
  });
});
```

Criar `components/__tests__/AddressPin.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { AddressPin } from '../AddressPin';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    Marker: (props: any) => <View testID="marker" {...props} />,
  };
});

describe('AddressPin', () => {
  it('renders marker at correct coordinate', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AddressPin
        id="1"
        lat={-23.542}
        lng={-46.633}
        status="not_visited"
        onPress={onPress}
      />
    );
    const marker = getByTestId('marker');
    expect(marker.props.coordinate).toEqual({ latitude: -23.542, longitude: -46.633 });
  });
});
```

- [ ] **Step 2: Rodar testes para verificar falha**

```bash
npx jest components/__tests__/ --no-coverage 2>&1 | tail -10
```

Expected: FAIL — módulos não existem

- [ ] **Step 3: Criar components/TerritoryPolygon.tsx**

```typescript
import React from 'react';
import { Polygon } from 'react-native-maps';
import { TerritoryStatus, TERRITORY_STATUS_COLORS } from '../lib/types';

interface Props {
  coordinates: { latitude: number; longitude: number }[];
  status: TerritoryStatus;
  onPress: () => void;
}

export function TerritoryPolygon({ coordinates, status, onPress }: Props) {
  const color = TERRITORY_STATUS_COLORS[status];
  return (
    <Polygon
      coordinates={coordinates}
      fillColor={`${color}80`}
      strokeColor={color}
      strokeWidth={2}
      tappable
      onPress={onPress}
    />
  );
}
```

- [ ] **Step 4: Criar components/AddressPin.tsx**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { AddressStatus, ADDRESS_STATUS_COLORS } from '../lib/types';

interface Props {
  id: string;
  lat: number;
  lng: number;
  status: AddressStatus;
  onPress: () => void;
}

export function AddressPin({ id, lat, lng, status, onPress }: Props) {
  const color = ADDRESS_STATUS_COLORS[status];
  return (
    <Marker
      key={id}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
    >
      <View style={[styles.pin, { backgroundColor: color }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
```

- [ ] **Step 5: Rodar testes para verificar que passam**

```bash
npx jest components/__tests__/ --no-coverage 2>&1 | tail -10
```

Expected: PASS — 3 tests passed

- [ ] **Step 6: Commit**

```bash
git add components/TerritoryPolygon.tsx components/AddressPin.tsx components/__tests__/TerritoryPolygon.test.tsx components/__tests__/AddressPin.test.tsx
git commit -m "feat: add TerritoryPolygon and AddressPin map components"
```

---

## Task 8: Mapa principal

**Files:**
- Create: `app/(app)/index.tsx`

- [ ] **Step 1: Escrever teste da tela de mapa principal**

Criar `app/(app)/__tests__/index.test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MainMapScreen from '../index';

jest.mock('../../../lib/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({ session: { user: { id: '1' } }, signOut: jest.fn() }),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map" {...props} />,
    Polygon: (props: any) => <View testID="polygon" {...props} />,
  };
});

describe('MainMapScreen', () => {
  it('renders the map', async () => {
    render(<MainMapScreen />);
    expect(screen.getByTestId('map')).toBeTruthy();
  });

  it('renders profile button', () => {
    render(<MainMapScreen />);
    expect(screen.getByTestId('profile-button')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest "app/\(app\)/__tests__/index.test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: Criar app/(app)/index.tsx**

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Territory, GeoJSONPolygon } from '../../lib/types';
import { TerritoryPolygon } from '../../components/TerritoryPolygon';

function geoJsonToLatLng(polygon: GeoJSONPolygon) {
  return polygon.coordinates[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function MainMapScreen() {
  const router = useRouter();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('territories')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) setTerritories(data as Territory[]);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        testID="map"
        style={styles.map}
        initialRegion={{
          latitude: -23.543,
          longitude: -46.632,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {territories.map((t) => (
          <TerritoryPolygon
            key={t.id}
            coordinates={geoJsonToLatLng(t.coordinates)}
            status={t.status}
            onPress={() => router.push(`/(app)/territory/${t.id}`)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      <TouchableOpacity
        testID="profile-button"
        style={styles.profileButton}
        onPress={() => router.push('/(app)/profile')}
      >
        <Text style={styles.profileButtonText}>Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  profileButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
});
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest "app/\(app\)/__tests__/index.test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/index.tsx" "app/(app)/__tests__/index.test.tsx"
git commit -m "feat: add main map screen with territory polygons"
```

---

## Task 9: Modal de visita

**Files:**
- Create: `components/VisitModal.tsx`
- Create: `components/__tests__/VisitModal.test.tsx`

- [ ] **Step 1: Escrever teste do modal**

Criar `components/__tests__/VisitModal.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VisitModal } from '../VisitModal';

const mockAddress = {
  id: 'addr-1',
  territory_id: 'terr-1',
  lat: -23.542,
  lng: -46.633,
  status: 'not_visited' as const,
  notes: null,
  visited_at: null,
  visited_by: null,
};

describe('VisitModal', () => {
  it('renders address status options', () => {
    render(
      <VisitModal
        visible={true}
        address={mockAddress}
        onClose={() => {}}
        onSave={() => Promise.resolve()}
      />
    );
    expect(screen.getByText('Visitado')).toBeTruthy();
    expect(screen.getByText('Sem contato')).toBeTruthy();
    expect(screen.getByText('Não visitado')).toBeTruthy();
  });

  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    render(
      <VisitModal
        visible={true}
        address={mockAddress}
        onClose={onClose}
        onSave={() => Promise.resolve()}
      />
    );
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest components/__tests__/VisitModal.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../VisitModal'`

- [ ] **Step 3: Criar components/VisitModal.tsx**

```typescript
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Address, AddressStatus } from '../lib/types';

interface Props {
  visible: boolean;
  address: Address;
  onClose: () => void;
  onSave: (status: AddressStatus, notes: string) => Promise<void>;
}

const STATUS_OPTIONS: { value: AddressStatus; label: string }[] = [
  { value: 'visited', label: 'Visitado' },
  { value: 'no_contact', label: 'Sem contato' },
  { value: 'not_visited', label: 'Não visitado' },
];

export function VisitModal({ visible, address, onClose, onSave }: Props) {
  const [status, setStatus] = useState<AddressStatus>(address.status);
  const [notes, setNotes] = useState(address.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(status, notes);
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Registrar Visita</Text>

          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusBtn, status === opt.value && styles.statusBtnActive]}
                onPress={() => setStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    status === opt.value && styles.statusBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Observações (opcional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  statusBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  statusBtnText: { fontSize: 13, color: '#374151' },
  statusBtnTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest components/__tests__/VisitModal.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Commit**

```bash
git add components/VisitModal.tsx components/__tests__/VisitModal.test.tsx
git commit -m "feat: add VisitModal component for recording address visits"
```

---

## Task 10: Tela de território com endereços

**Files:**
- Create: `app/(app)/territory/[id].tsx`

- [ ] **Step 1: Escrever teste da tela**

Criar `app/(app)/territory/__tests__/[id].test.tsx`:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TerritoryScreen from '../[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn().mockReturnValue({ id: 'terr-1' }),
  useRouter: jest.fn().mockReturnValue({ back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View testID="map" {...props} />,
    Marker: (props: any) => <View testID="marker" {...props} />,
  };
});

describe('TerritoryScreen', () => {
  it('renders the map', () => {
    render(<TerritoryScreen />);
    expect(screen.getByTestId('map')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest "app/\(app\)/territory/__tests__/\[id\].test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../[id]'`

- [ ] **Step 3: Criar app/(app)/territory/[id].tsx**

```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Address, AddressStatus } from '../../../lib/types';
import { AddressPin } from '../../../components/AddressPin';
import { VisitModal } from '../../../components/VisitModal';

export default function TerritoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    supabase
      .from('addresses')
      .select('*')
      .eq('territory_id', id)
      .then(({ data, error }) => {
        if (!error && data) setAddresses(data as Address[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`addresses:territory_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'addresses', filter: `territory_id=eq.${id}` },
        (payload) => {
          setAddresses((prev) =>
            prev.map((a) => (a.id === payload.new.id ? (payload.new as Address) : a))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleSave = async (status: AddressStatus, notes: string) => {
    if (!selectedAddress) return;
    await supabase
      .from('addresses')
      .update({ status, notes, visited_at: new Date().toISOString() })
      .eq('id', selectedAddress.id);
    setAddresses((prev) =>
      prev.map((a) =>
        a.id === selectedAddress.id ? { ...a, status, notes } : a
      )
    );
    setSelectedAddress(null);
  };

  const initialRegion = addresses.length > 0
    ? {
        latitude: addresses[0].lat,
        longitude: addresses[0].lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : { latitude: -23.543, longitude: -46.632, latitudeDelta: 0.005, longitudeDelta: 0.005 };

  return (
    <View style={styles.container}>
      <MapView testID="map" style={styles.map} initialRegion={initialRegion}>
        {addresses.map((addr) => (
          <AddressPin
            key={addr.id}
            id={addr.id}
            lat={addr.lat}
            lng={addr.lng}
            status={addr.status}
            onPress={() => setSelectedAddress(addr)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {selectedAddress && (
        <VisitModal
          visible={true}
          address={selectedAddress}
          onClose={() => setSelectedAddress(null)}
          onSave={handleSave}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest "app/\(app\)/territory/__tests__/\[id\].test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: PASS — 1 test passed

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/territory/[id].tsx" "app/(app)/territory/__tests__/[id].test.tsx"
git commit -m "feat: add territory screen with address pins, visit modal and realtime updates"
```

---

## Task 11: Tela de perfil

**Files:**
- Create: `app/(app)/profile.tsx`

- [ ] **Step 1: Escrever teste da tela de perfil**

Criar `app/(app)/__tests__/profile.test.tsx`:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProfileScreen from '../profile';

const mockSignOut = jest.fn();

jest.mock('../../../lib/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({
    session: { user: { email: 'test@example.com', id: '1' } },
    signOut: mockSignOut,
  }),
}));

describe('ProfileScreen', () => {
  it('renders user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('calls signOut when logout button is pressed', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText('Sair'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest "app/\(app\)/__tests__/profile.test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../profile'`

- [ ] **Step 3: Criar app/(app)/profile.tsx**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? 'Usuário';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutBtnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  email: { fontSize: 16, color: '#111827', fontWeight: '500' },
  logoutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest "app/\(app\)/__tests__/profile.test.tsx" --no-coverage 2>&1 | tail -10
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Rodar toda a suíte de testes**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: todos os testes passando, sem falhas.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/profile.tsx" "app/(app)/__tests__/profile.test.tsx"
git commit -m "feat: add profile screen with user info and logout"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ Expo managed workflow com TypeScript
- ✅ Expo Router com grupos `(auth)` e `(app)`
- ✅ Supabase (cliente, tipos, migração SQL com RLS)
- ✅ Auth social (Google + Apple) via `expo-auth-session`
- ✅ Sessão persistida com `expo-secure-store`
- ✅ Proteção de rotas no root layout
- ✅ Mapa principal com polígonos coloridos por status
- ✅ Tap em território navega para tela de detalhes
- ✅ Tela de território com pins de endereços
- ✅ Modal de marcação de visita com nota
- ✅ Realtime no Supabase para updates ao vivo
- ✅ Tela de perfil com logout
- ✅ Dados de teste SQL incluídos

**Sem placeholders:** verificado — todos os passos têm código completo.

**Consistência de tipos:** `Territory`, `Address`, `TerritoryStatus`, `AddressStatus` definidos em `lib/types.ts` e usados de forma consistente em todos os arquivos.
