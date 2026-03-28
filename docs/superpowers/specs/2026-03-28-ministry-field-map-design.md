# MinistryFieldMap — Design Spec

**Data:** 2026-03-28
**Status:** Aprovado

---

## Visão Geral

App mobile para ajudar irmãos de congregação a controlar territórios. O MVP foca em visualizar territórios no mapa e marcar endereços como visitados.

**Plataformas:** Android e iOS
**Stack principal:** Expo (managed workflow) + Expo Router + React Native Maps + Supabase + TypeScript

---

## Arquitetura

### Stack

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK (managed workflow) |
| Navegação | Expo Router (file-based) |
| Mapa | react-native-maps |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Linguagem | TypeScript |
| Auth | Supabase Auth via expo-auth-session |
| Sessão | expo-secure-store |

### Estrutura de Pastas

```
app/
  (auth)/
    login.tsx           # Tela de login (Google / Apple)
  (app)/
    index.tsx           # Mapa principal com todos os territórios
    territory/
      [id].tsx          # Mapa focado + endereços do território
    profile.tsx         # Perfil do usuário
components/
  MapView/              # Wrapper do mapa com territórios
  AddressPin/           # Pin de endereço com status de visita
  TerritoryPolygon/     # Polígono colorido de território
lib/
  supabase.ts           # Cliente Supabase inicializado
  types.ts              # Tipos TypeScript globais
  auth-context.tsx      # Contexto de autenticação global
assets/
  fonts/
  images/
app.config.ts           # Configuração Expo + variáveis de ambiente
.env                    # Credenciais Supabase (não commitar)
```

---

## Modelo de Dados (Supabase)

### `territories`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador |
| name | text | Nome do território |
| coordinates | jsonb | GeoJSON do polígono |
| status | enum | `available`, `in_use`, `completed` |
| created_at | timestamptz | Data de criação |

### `addresses`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | Identificador |
| territory_id | uuid (FK) | Território pai |
| lat | float8 | Latitude |
| lng | float8 | Longitude |
| status | enum | `not_visited`, `visited`, `no_contact` |
| notes | text | Observações opcionais |
| visited_at | timestamptz | Data da última visita |
| visited_by | uuid (FK → auth.users) | Usuário que marcou |

### Segurança
- Row Level Security (RLS) habilitado em todas as tabelas desde o início
- Realtime habilitado em `addresses` para atualizações ao vivo entre publicadores
- Papéis de usuário (admin vs publicador) serão definidos e implementados em fase posterior

---

## Fluxo de Navegação

```
Splash Screen
├── Não autenticado → /auth/login
│     └── Login com Google ou Apple
└── Autenticado → /(app)/
      ├── / (index) — Mapa Principal
      │     ├── Polígonos coloridos por status
      │     ├── Tap em território → /territory/[id]
      │     └── Botão de perfil → /profile
      └── /territory/[id]
            ├── Mapa focado no território
            ├── Pins de endereços (coloridos por status)
            └── Tap em pin → modal para marcar visita + nota
```

### Cores de status dos territórios
- `available` → verde
- `in_use` → amarelo
- `completed` → cinza

---

## Autenticação

- Provider: Supabase Auth
- Métodos: Google OAuth + Apple Sign-In
- Biblioteca: `expo-auth-session` + `@supabase/supabase-js`
- Persistência da sessão: `expo-secure-store`
- Proteção de rotas: middleware no Expo Router verificando sessão ativa

---

## Limitações do MVP

- **Sem suporte offline** — requer conexão para todas as operações
- **Sem gestão de papéis** — todos os usuários autenticados têm acesso de leitura/escrita (RLS preparado para evolução)
- **Sem criação de territórios no app** — territórios serão inseridos diretamente no Supabase inicialmente

---

## Fora do Escopo (MVP)

- Criação/edição de territórios pela interface
- Sistema de papéis (admin / publicador)
- Modo offline com sincronização
- Notificações push
- Histórico de visitas por endereço
