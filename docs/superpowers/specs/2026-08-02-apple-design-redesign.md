# Design: Redesign Apple-style do Frontend (Dashboard-Autocarros)

Data: 2026-08-02
Estado: aprovado pelo utilizador

## Objetivo

Redesenhar **toda a aplicação frontend** (React 18 + Vite + Tailwind + Recharts) com um
sistema de design inspirado no Apple HIG (skill `apple-design`): mais moderno e profissional,
com tema claro **e** escuro, sidebar estilo macOS, e animações com springs via biblioteca Motion.

## Âmbito (aprovado)

- App inteira: shell/navegação, login/registo/recuperação, e todas as páginas
  (Dashboard, Autocarros, Motoristas, Quilometragem, Horários, Relatórios, Definições).
- Tema claro e escuro com toggle manual + `prefers-color-scheme`, persistido em localStorage.
- Nova dependência: `motion` (Framer Motion) para springs físicos.
- **Fora de âmbito:** alterações ao backend, APIs, serviços (`src/services/*`) e lógica de dados.
  Apenas camada visual/interação.

## Arquitetura

```
frontend/src/
├── design/
│   ├── tokens.css        # variáveis CSS: cores light/dark, sombras, raios, blur, spacing
│   └── base.css          # tipografia (system stack, tracking por tamanho, leading), resets
├── components/
│   ├── ui/               # primitivos: Button, Card, GlassPanel, Sheet/Modal, Input,
│   │                     #   Badge, Tabs, Toggle, EmptyState, Spinner
│   ├── layout/
│   │   ├── AppShell.tsx      # sidebar macOS translúcida + toolbar de vidro + conteúdo
│   │   ├── Sidebar.tsx       # itens com labels específicos, ativo/hover, colapsa em mobile
│   │   └── ThemeToggle.tsx
│   └── (páginas existentes reestilizadas)
├── hooks/
│   ├── useTheme.ts       # light/dark/system + localStorage
│   └── useToast.ts       # existente, reestilizado via Toast.tsx
```

## Sistema de design (tokens)

- **Cores:** azul de sistema (`#0A84FF` dark / `#007AFF` light), cinzas Apple
  (`#F5F5F7` fundo light, `#000`/`#1C1C1E` dark), semânticos (verde/âmbar/vermelho de sistema).
  Definidos como CSS custom properties com `[data-theme="dark"]`.
- **Materiais:** superfícies translúcidas com `backdrop-filter: blur(20px) saturate(180%)`.
  Sidebar = material mais pesado/escuro (estrutural); cartões e botões = material leve.
  Nunca empilhar vidro claro sobre vidro claro.
- **Tipografia:** system font stack; títulos com `letter-spacing` negativo e `line-height`
  apertado; corpo com tracking ~0 e leading 1.5; hierarquia por peso+tamanho+leading.
- **Raios/sombras:** cartões 12–16px radius; sombras contextuais (maiores em superfícies grandes).

## Motion (via Motion)

- Spring padrão: criticamente amortecido — `bounce: 0`, `duration ~0.35–0.4` (equiv. damping 1.0).
- Bounce (`bounce ~0.2`) apenas em interações com momentum (sheets arrastáveis, se aplicável).
- Feedback em `:active`/pointer-down: `scale(0.97)`, 100ms — instantâneo, nunca só no release.
- Páginas entram com fade+rise subtil (y: 8→0, opacity), respeitando a rota.
- Modais/sheets entram e saem pelo **mesmo caminho**, com `transform-origin` no elemento origem.
- `prefers-reduced-motion`: substituir springs/slides por cross-fades de 200ms.
- `prefers-reduced-transparency`: superfícies tornam-se sólidas (sem blur).
- Animar apenas `transform` e `opacity`.

## Páginas

- **Dashboard:** cartões KPI com material leve, ícones, micro-tendência; Recharts reestilizado
  (cores de sistema, sem grelhas duras, tooltips de vidro); alertas como banners inline discretos.
- **Autocarros / Motoristas / Quilometragem / Horários:** tabelas limpas (hover de linha,
  tipografia tabular), ações com botões táteis; formulários em sheets/modais de vidro.
- **Relatórios:** mesma linguagem de cartões e gráficos.
- **Definições:** lista agrupada estilo iOS Settings (grupos com fundo de cartão, separadores finos).
- **Login / Registo / Forgot / Reset:** ecrã centrado, cartão de vidro sobre fundo suave com gradiente.
- **Toast:** redesenhado como notificação estilo iOS (vidro, entra de cima com spring).

## Error handling / estados

- Estados de loading com skeletons (opacity pulse) em vez de spinners onde possível.
- Empty states com ícone + mensagem + ação primária.
- Erros de API mantêm o fluxo atual (Toast), apenas com novo visual.

## Testes / verificação

- O projeto não tem testes automatizados; verificação via `npm run build` (tsc + vite)
  e revisão visual manual em light/dark, desktop e mobile.

## Decisões (YAGNI)

- Sem gestos de drag 1:1 nem rubber-banding custom nesta fase — sem caso de uso real nas páginas atuais.
- Sem som/haptics.
- Sem refactor de lógica de dados — camada visual apenas.
