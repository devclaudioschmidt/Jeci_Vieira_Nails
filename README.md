# Jeci Vieira Nails — Documentação do Agendamento Manual (Admin)

Este documento descreve as implementações realizadas para permitir o agendamento manual de clientes através do painel administrativo.

## 1. Visão Geral
O administrador agora possui um botão **"+ Agendamento Manual"** na aba Agenda. Este botão abre um fluxo de 4 passos dentro de um modal, permitindo selecionar o procedimento, a data, o horário e preencher os dados da cliente.

## 2. Fluxo de Trabalho (Steps)
1.  **Procedimento:** Lista todos os procedimentos cadastrados no banco de dados.
2.  **Data:** Calendário interativo que bloqueia datas passadas e domingos.
3.  **Horário:** Slots de tempo gerados dinamicamente com base nas configurações do salão (horário de abertura, fechamento e intervalo) e respeitando agendamentos já existentes para evitar conflitos.
4.  **Dados da Cliente:** Formulário para nome e WhatsApp (com máscara automática).

## 3. Alterações Técnicas

### 3.1 Banco de Dados (Firestore)
Os agendamentos manuais são salvos na mesma coleção `agendamentos` utilizada pelo fluxo do cliente, mantendo a integridade dos dados.
-   **Novo Campo:** `bookedBy` (valor: `'admin'`). Este campo permite identificar se o agendamento foi feito pela cliente ou pelo salão.
-   **Campos Mantidos:** `procedureId`, `procedureName`, `procedureDuration`, `price`, `date` (YYYY-MM-DD), `time` (HH:MM), `clientName`, `clientPhone`, `status` ('confirmado'), `createdAt`.

### 3.2 Integração com WhatsApp
Ao finalizar o agendamento no painel admin, o sistema:
1.  Salva os dados no Firestore.
2.  Atualiza a lista de agendamentos e o calendário do painel admin.
3.  Abre o WhatsApp da Jeci direcionado ao número da cliente com uma mensagem pré-formatada de confirmação.

**Mensagem Padrão:**
> Olá, [Nome]! 😊
>
> Seu agendamento foi confirmado:
> 📌 Procedimento: *[Procedimento]*
> 📅 Data: *[Data]*
> 🕐 Horário: *[Horário]*
>
> Te espero! 💅 — Jeci Vieira Nails

## 4. Arquivos Modificados
-   `pages/admin.html`: Adição do botão e do modal de agendamento.
-   `css/pages/admin.css`: Estilização do modal e componentes do fluxo.
-   `js/pages/admin.js`: Implementação de toda a lógica de navegação, busca de dados e persistência.

---
*Documentação gerada por Antigravity AI.*
