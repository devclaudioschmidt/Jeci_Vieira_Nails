# Jeci Vieira Nails — WebApp de Agendamento

Sistema de agendamento para salão de nail design com painel administrativo, fluxo do cliente e integração com WhatsApp.

## Stack

- **Core:** HTML5, CSS3, JavaScript (ES6+) puros — sem frameworks
- **Backend:** Firebase (Firestore, Authentication)
- **Ícones:** Emoji nativos — sem dependências externas
- **PWA:** Manifest JSON + Service Worker pass-through (modo standalone sem barras do navegador)

## Estrutura de Pastas

```
/
├── index.html                 # Página inicial (cliente)
├── pages/
│   ├── agendamento.html       # Fluxo de agendamento (cliente)
│   ├── confirmacao.html       # Tela de confirmação
│   └── admin.html             # Painel administrativo
├── css/
│   ├── global.css             # Reset, design system, componentes compartilhados
│   └── pages/
│       ├── index.css
│       ├── agendamento.css
│       ├── confirmacao.css
│       └── admin.css
├── js/
│   ├── global.js              # Funções compartilhadas (máscaras de entrada, formatação de exibição, toast, WhatsApp)
│   ├── firebase/
│   │   └── config.js          # Configuração do Firebase
│   └── pages/
│       ├── index.js
│       ├── agendamento.js
│       ├── confirmacao.js
│       └── admin.js
├── manifest-client.json       # Manifest PWA do cliente (display: standalone)
├── manifest-admin.json        # Manifest PWA do admin (display: standalone)
├── sw-client.js               # Service Worker do cliente (pass-through, sem cache)
├── sw-admin.js                # Service Worker do admin (pass-through, sem cache)
└── assets/
    └── img/
        ├── logoJeciVieira.svg
        ├── favicon.png           # Ícone do site
        ├── icon-192x192.png      # Ícone PWA cliente 192x192px
        ├── icon-512x512.png      # Ícone PWA cliente 512x512px
        ├── icon-admin-192x192.png # Ícone PWA admin 192x192px (com badge)
        └── icon-admin-512x512.png # Ícone PWA admin 512x512px (com badge)
```

## Funcionalidades

### Cliente (`index.html`)
- Página inicial com informações do salão (carregadas do Firestore)
- Saudação dinâmica (Bom dia / Boa tarde / Boa noite)
- Consulta de agendamentos por telefone (modal de busca)
- Link para agendamento
- Rodapé com telefone (link direto para WhatsApp) e endereço (link para Google Maps)

### Fluxo de Agendamento (`agendamento.html`)
- 4 passos com indicador de progresso:
  1. **Procedimento** — categorias e itens com nome e preço
  2. **Data** — calendário com navegação entre meses (← →)
  3. **Horário** — slots gerados dinamicamente conforme configurações
  4. **Dados** — nome e WhatsApp do cliente
- Calendário bloqueia datas passadas e domingos
- Slots consideram horário de funcionamento, intervalo de almoço, agendamentos existentes e duração do procedimento
- Persistência no Firestore e redirecionamento para WhatsApp

### Confirmação (`confirmacao.html`)
- Resumo completo do agendamento
- Salvamento no Firestore com `procedureDuration` e `price`
- Feedback visual com toast e botão "✅ Agendado"

### Painel Administrativo (`admin.html`)
- **Autenticação** — login com email/senha via Firebase Auth
- **Navegação** — Menu lateral "Hamburger" que desliza a partir da direita com indicador dinâmico de aba ativa (prefixo `<`)
- **Agenda:**
  - Calendário com navegação entre meses
  - Datas com agendamento destacadas com borda
  - Datas passadas e domingos desabilitados
  - Lista de agendamentos do dia selecionado
  - Botão WhatsApp para lembrete ao cliente
  - Botão Cancelar com modal de confirmação
  - **Agendamento Manual** — modal em 4 passos para agendar em nome do cliente
- **Procedimentos:**
  - CRUD completo (criar, listar, editar, excluir)
  - Modal para cadastro e edição com nome, preço e duração
- **Bloqueios:**
  - View "Bloqueios" no painel administrativo
  - Criar/Excluir bloqueios por data, período e motivo
  - Horários bloqueados ficam indisponíveis para clientes e agendamento manual
  - Indicador visual no calendário da agenda (círculo vermelho)
  - Dados armazenados no Firestore (collection `horariosBloqueados`)
- **Configurações:**
  - Telefone, endereço e aviso
  - Horários: abertura/fechamento (seg-sex e sábado)
  - Intervalo de almoço
  - Layout em 2 colunas para campos de horário

## Design System (Variáveis CSS)

Todas as cores, espaçamentos e tipografia usam variáveis CSS definidas em `global.css`:

- `--color-bg` — fundo escuro principal
- `--color-surface` — superfícies de cards
- `--color-primary` — tom rosado de destaque
- `--color-error` — vermelho para alertas e cancelamento
- `--color-text` / `--color-text-muted` — cores de texto
- `--space-1` a `--space-16` — escala de espaçamento
- `--fs-xs` a `--fs-lg` — escala tipográfica
- `--radius-sm` a `--radius-full` — bordas arredondadas

## Convenções (Skill)

- **Comentários em português** em todo o código
- **Nomes de arquivos e funções em inglês**
- **Zero CSS inline** — tudo em arquivos `.css`
- **Separação de escopo** — `global.css` para o comum, `pages/*.css` para o específico
- **Mobile-first** — desenvolvimento começa pela menor tela
- **Design System** — variáveis CSS para consistência visual
- **Firebase:** `limit()` em consultas, `serverTimestamp()`, estrutura flat

## Progressive Web App (PWA)

O webapp possui **dois PWAs independentes**, um para clientes e outro para o administrador, que podem ser instalados lado a lado no celular.

### PWAs disponíveis

| PWA | Nome | Instalar a partir de | Manifest |
|---|---|---|---|
| **Cliente** (público) | Jeci Vieira Nails | `index.html`, `agendamento.html`, `confirmacao.html` | `manifest-client.json` |
| **Admin** (restrito) | Admin - Jeci Nails | `pages/admin.html` | `manifest-admin.json` |

### Como instalar

- **iPhone (Safari):** Acesse a página desejada → Compartilhar → "Adicionar à Tela de Início" → o app abrirá em modo standalone (sem barra do Safari)
- **Android (Chrome):** O banner "Adicionar à tela inicial" aparecerá automaticamente na página correspondente. Ao instalar, abrirá sem a barra de navegação
- **Desktop:** Chrome exibirá o botão de instalação na barra de endereço

> **Dica:** O admin pode acessar rapidamente `pages/admin.html` pelo easter egg de 5 toques no logo na tela inicial.

### O que foi implementado

- `manifest-client.json` — manifesto do PWA cliente (`id: "jeci-nails-client"`, `start_url: "index.html"`)
- `manifest-admin.json` — manifesto do PWA admin (`id: "jeci-nails-admin"`, `start_url: "pages/admin.html"`)
- `sw-client.js` e `sw-admin.js` — Service Workers pass-through (sem cache), um para cada PWA
- Meta tags iOS — `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` — essenciais para o Safari abrir em modo standalone
- `viewport-fit=cover` — permite que o app use a tela inteira em iPhones com notch
- `env(safe-area-inset-*)` no `global.css` — padding automático para proteger conteúdo do notch e barra de status
- Ícones PWA do cliente (192x192 e 512x512) gerados a partir do `logoJeciVieira.svg`
- Ícones PWA do admin (192x192 e 512x512) com badge "A" no canto para diferenciar visualmente

### Cache

Os Service Workers **não fazem cache** de nenhum recurso. Toda requisição continua indo diretamente para a rede, preservando o comportamento original do webapp.

## Fluxo Git

```
beta  →  (desenvolvimento e commits)
  ↓
main  →  (merge autorizado após testes)
```

## Configuração do Firebase

O projeto utiliza:
- **Firestore** — `configuracoes/salao`, `agendamentos`, `procedimentos`, `admins`, `horariosBloqueados`
- **Authentication** — email/senha para admin
- **Security Rules** — baseadas em `request.auth.uid`

O SDK é importado via CDN com tree-shaking (apenas os módulos necessários).
