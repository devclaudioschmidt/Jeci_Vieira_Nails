# Jeci Vieira Nails — WebApp de Agendamento

Sistema de agendamento para salão de nail design com painel administrativo, fluxo do cliente e integração com WhatsApp.

## Stack

- **Core:** HTML5, CSS3, JavaScript (ES6+) puros — sem frameworks
- **Backend:** Firebase (Firestore, Authentication)
- **Ícones:** Emoji nativos — sem dependências externas
- **PWA:** Suporte a instalação na tela inicial (Android e iOS)

## Estrutura de Pastas

```
/
├── index.html                 # Página inicial (cliente)
├── manifest.json              # Config PWA
├── sw.js                      # Service Worker
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
│   ├── global.js              # Funções compartilhadas (máscara, toast, WhatsApp)
│   ├── firebase/
│   │   └── config.js          # Configuração do Firebase
│   └── pages/
│       ├── index.js
│       ├── agendamento.js
│       ├── confirmacao.js
│       └── admin.js
└── assets/
    └── img/
        ├── logoJeciVieira.svg
        └── favicon.png           # Ícone PWA
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
  - Modal para cadastro com nome, preço e duração
- **Configurações:**
  - Telefone, endereço e aviso
  - Horários: abertura/fechamento (seg-sex e sábado)
  - Intervalo de almoço
  - Layout em 2 colunas para campos de horário

### PWA
- Service Worker com cache dos arquivos principais
- Ícone SVG + favicon PNG para PWA
- `start_url` e `scope` relativos
- Compatível com instalação em Android e iOS

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

## Fluxo Git

```
beta  →  (desenvolvimento e commits)
  ↓
main  →  (merge autorizado após testes)
```

## Configuração do Firebase

O projeto utiliza:
- **Firestore** — `configuracoes/salao`, `agendamentos`, `procedimentos`, `admins`
- **Authentication** — email/senha para admin
- **Security Rules** — baseadas em `request.auth.uid`

O SDK é importado via CDN com tree-shaking (apenas os módulos necessários).
