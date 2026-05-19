# Plano de Implementação — Bloqueio de Horários (Admin)

## 1. Firestore — Nova Collection `horariosBloqueados`

Criar documentos com a estrutura:
```
horariosBloqueados/{id}
  blockDate: "2026-06-15"     // string (formato YYYY-MM-DD)
  blockInit: "09:00"          // string (formato HH:MM)
  blockEnd: "10:30"           // string (formato HH:MM)
  blockText: "Médico"         // string (motivo do bloqueio)
  createdAt: Timestamp
  createdBy: "admin-uid"
```

---

## 2. admin.html — Alterações

### 2.1 Nav — Adicionar botão "Bloqueios"

Localização: dentro de `<nav class="admin-nav">`, após o botão Procedimentos.

```html
<button id="nav-bloqueios" class="nav-btn" data-view="bloqueios">Bloqueios</button>
```

### 2.2 View Bloqueios

Inserir antes do fechamento de `</section>` do admin-panel, após view-configuracoes:

```html
<!-- VIEW: Bloqueios -->
<div id="view-bloqueios" class="admin-view hidden">
  <div class="view-toolbar">
    <h3>Horários Bloqueados</h3>
    <button id="btn-add-block" class="btn-primary btn-sm">+ Novo Bloqueio</button>
  </div>
  <ul id="blocked-list" class="blocked-list">
    <!-- Populado via JS -->
  </ul>
</div>
```

### 2.3 Modal de Bloqueio

Inserir após o modal de agendamento manual (`modal-admin-booking`):

```html
<!-- ===== MODAL DE BLOQUEIO DE HORÁRIO ===== -->
<dialog id="modal-block-booking" class="app-modal" aria-labelledby="modal-block-title">
  <div class="modal-content">
    <header class="modal-header">
      <h3 id="modal-block-title">Bloquear Horário</h3>
      <button id="btn-close-block-modal" class="btn-icon" aria-label="Fechar modal">&times;</button>
    </header>
    <form id="form-block">
      <label for="block-date">Data do bloqueio</label>
      <input type="date" id="block-date" name="blockDate" required />

      <div class="config-row">
        <h4 class="config-row-title">Período</h4>
        <div class="config-field">
          <label for="block-init">Início</label>
          <input type="time" id="block-init" name="blockInit" required />
        </div>
        <div class="config-field">
          <label for="block-end">Fim</label>
          <input type="time" id="block-end" name="blockEnd" required />
        </div>
      </div>

      <label for="block-text">Motivo do bloqueio</label>
      <textarea id="block-text" name="blockText" rows="2" placeholder="Ex.: Compromisso pessoal, feriado, etc." required></textarea>

      <div class="modal-actions">
        <button type="button" id="btn-cancel-block" class="btn-secondary">Cancelar</button>
        <button type="submit" id="btn-save-block" class="btn-primary">Bloquear Horário</button>
      </div>
    </form>
  </div>
</dialog>
```

### 2.4 Template para lista de bloqueios

Inserir após o template `tpl-procedure`:

```html
<template id="tpl-block">
  <li class="block-item slide-up-anim" data-block-id="">
    <div class="block-info">
      <strong class="block-date"></strong>
      <span class="block-time"></span>
      <p class="block-motive"></p>
    </div>
    <div class="block-actions">
      <button class="btn-icon btn-delete-block" aria-label="Excluir bloqueio">🗑️</button>
    </div>
  </li>
</template>
```

---

## 3. css/pages/admin.css — Adicionar ao final do arquivo

```css
/* ---- Bloqueio de Horários ---- */
.blocked-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.block-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-error);
}

.block-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.block-date {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--color-text);
}

.block-time {
  font-size: var(--fs-sm);
  color: var(--color-error);
  font-weight: 600;
}

.block-motive {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.block-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-delete-block:hover {
  color: var(--color-error);
}

/* Dia com bloqueio no calendário admin */
.cal-day.has-block {
  position: relative;
}

.cal-day.has-block::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-error);
}
```

---

## 4. js/pages/admin.js — Lógica CRUD Bloqueios + Integração

### 4.1 Imports (já existem — `addDoc`, `deleteDoc`, `query`, `where`, `collection`, `getDocs`, `serverTimestamp`)

### 4.2 Navegação — Adicionar no `showView()`

No final da função, adicionar:
```js
if (viewName === 'bloqueios') loadBlockedSlots();
```

### 4.3 Variáveis e referências DOM

Adicionar no bloco de referências (após `const btnLogout`):
```js
const modalBlockBooking = document.getElementById('modal-block-booking');
const btnOpenBlock      = document.getElementById('btn-add-block');
const btnCloseBlock     = document.getElementById('btn-close-block-modal');
const btnCancelBlock    = document.getElementById('btn-cancel-block');
const formBlock         = document.getElementById('form-block');
```

### 4.4 Função `loadBlockedSlots()`

```js
async function loadBlockedSlots() {
  const list = document.getElementById('blocked-list');
  list.innerHTML = '<li class="skeleton-card slide-up-anim"></li>'.repeat(3);

  try {
    const q = query(collection(db, 'horariosBloqueados'), orderBy('blockDate', 'desc'), limit(100));
    const snap = await getDocs(q);

    list.innerHTML = '';
    if (snap.empty) {
      list.innerHTML = '<li class="empty-state-msg slide-up-anim">Nenhum horário bloqueado.</li>';
      return;
    }

    const template = document.getElementById('tpl-block');
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const clone = template.content.cloneNode(true);
      clone.querySelector('[data-block-id]').dataset.blockId = docSnap.id;

      // Formatar data para exibição
      const dateObj = new Date(d.blockDate + 'T00:00:00');
      clone.querySelector('.block-date').textContent = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      clone.querySelector('.block-time').textContent = `${d.blockInit} às ${d.blockEnd}`;
      clone.querySelector('.block-motive').textContent = d.blockText;

      const btnDelete = clone.querySelector('.btn-delete-block');
      btnDelete.addEventListener('click', () => deleteBlock(docSnap.id));

      list.appendChild(clone);
    });
  } catch (err) {
    console.error('[admin.js] Erro ao carregar bloqueios:', err);
    showToast('Erro ao carregar bloqueios.', 'error');
  }
}

async function deleteBlock(id) {
  if (!confirm('Deseja remover este bloqueio?')) return;
  try {
    await deleteDoc(doc(db, 'horariosBloqueados', id));
    showToast('Bloqueio removido.', 'success');
    loadBlockedSlots();
  } catch (err) {
    console.error('[admin.js] Erro ao excluir bloqueio:', err);
    showToast('Erro ao excluir bloqueio.', 'error');
  }
}
```

### 4.5 Eventos do modal de bloqueio

```js
btnOpenBlock.addEventListener('click', () => {
  formBlock.reset();
  modalBlockBooking.showModal();
});

const closeBlockModal = () => modalBlockBooking.close();
btnCloseBlock.addEventListener('click', closeBlockModal);
btnCancelBlock.addEventListener('click', closeBlockModal);

formBlock.addEventListener('submit', async (e) => {
  e.preventDefault();
  const blockDate = document.getElementById('block-date').value;
  const blockInit = document.getElementById('block-init').value;
  const blockEnd  = document.getElementById('block-end').value;
  const blockText = document.getElementById('block-text').value.trim();

  if (blockInit >= blockEnd) {
    return showToast('Horário de término deve ser após o início.', 'error');
  }

  const btn = document.getElementById('btn-save-block');
  btn.disabled = true;
  btn.textContent = 'Bloqueando...';

  try {
    await addDoc(collection(db, 'horariosBloqueados'), {
      blockDate,
      blockInit,
      blockEnd,
      blockText,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid || 'unknown',
    });
    showToast('Horário bloqueado com sucesso!', 'success');
    closeBlockModal();
    loadBlockedSlots();
  } catch (err) {
    console.error('[admin.js] Erro ao bloquear horário:', err);
    showToast('Erro ao bloquear horário.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bloquear Horário';
  }
});
```

### 4.6 Buscar bloqueios para datas no calendário admin

No `buildAdminCalendar()`, após buscar `datesWithAppts`, adicionar busca de bloqueios:

```js
// Buscar datas com bloqueio neste mês
let datesWithBlocks = new Set();
try {
  const blockQuery = query(
    collection(db, 'horariosBloqueados'),
    where('blockDate', '>=', monthStart),
    where('blockDate', '<=', monthEnd),
    limit(150)
  );
  const blockSnap = await getDocs(blockQuery);
  blockSnap.forEach(doc => datesWithBlocks.add(doc.data().blockDate));
} catch (err) {
  console.error('[admin.js] Erro ao buscar datas com bloqueio:', err);
}
```

E no loop de dias, adicionar:
```js
const hasBlock = datesWithBlocks.has(dateStr);
if (hasBlock) classes += ' has-block';
```

### 4.7 Integrar bloqueios nos slots do agendamento manual admin

Na função `adminBuildTimeSlots()`, após buscar `appointments`, adicionar busca de bloqueios:

```js
// Buscar bloqueios para esta data
const blockSlots = [];
try {
  const blockQ = query(collection(db, 'horariosBloqueados'), where('blockDate', '==', dateStr));
  const blockSnap = await getDocs(blockQ);
  blockSnap.forEach(doc => {
    const data = doc.data();
    blockSlots.push({ start: toMin(data.blockInit), end: toMin(data.blockEnd) });
  });
} catch (err) {
  console.error('[admin.js] Erro ao buscar bloqueios:', err);
}
```

No loop de `slots`, dentro da verificação de `conflict`, adicionar:
```js
// Verificar conflito com bloqueios
for (const block of blockSlots) {
  if (Math.max(curr, block.start) < Math.min(sEnd, block.end)) { conflict = true; break; }
}
```

---

## 5. js/pages/agendamento.js — Verificar bloqueios no cliente

### 5.1 Localizar função `generateTimeSlots()` (aproximadamente linha 230+)

Após buscar `appointments`, adicionar busca de bloqueios:

```js
// Buscar bloqueios do admin para esta data
let blockSlots = [];
try {
  const blockQ = query(collection(db, 'horariosBloqueados'), where('blockDate', '==', dateStr));
  const blockSnap = await getDocs(blockQ);
  blockSnap.forEach(doc => {
    const data = doc.data();
    blockSlots.push({ start: toMin(data.blockInit), end: toMin(data.blockEnd) });
  });
} catch (err) {
  console.error('[agendamento.js] Erro ao buscar bloqueios:', err);
}
```

No loop de `slots`, dentro da verificação de `conflict`, adicionar:
```js
// Verificar conflito com bloqueios admin
for (const block of blockSlots) {
  if (Math.max(curr, block.start) < Math.min(sEnd, block.end)) { conflict = true; break; }
}
```

---

## 6. Dependências

- `loadBlockedSlots()` usa `orderBy('blockDate', 'desc')` → requer índice composto no Firestore:
  - Collection: `horariosBloqueados`
  - Fields: `blockDate` (Descending), `__name__` (Descending)
  - Ou criar query sem `orderBy` e ordenar em memória (recomendado para evitar índice)

**Recomendação:** Usar ordenação em memória (mesmo padrão do `loadAgenda`) para evitar criar índice composto:

```js
const q = query(collection(db, 'horariosBloqueados'), limit(100));
const snap = await getDocs(q);
const results = [];
snap.forEach(doc => { const d = doc.data(); d.id = docSnap.id; results.push(d); });
results.sort((a, b) => a.blockDate > b.blockDate ? -1 : 1); // Mais recente primeiro
```

---

## 7. Documentação

### 7.1 `.documents/bloqueioHorarios.md`

```markdown
# Bloqueio de Horários (Admin)

## Descrição
Recurso que permite ao administrador bloquear horários na agenda para
compromissos pessoais, feriados ou qualquer outra necessidade.

## Funcionalidades
- Nova view "Bloqueios" no painel administrativo
- Lista de horários bloqueados com data, período e motivo
- Criar bloqueio: data, horário início/fim, motivo
- Excluir bloqueio
- Bloqueios refletem na agenda:
  - Cliente: horários bloqueados não aparecem como disponíveis
  - Admin: horários bloqueados não aparecem no agendamento manual
  - Calendário: dias com bloqueio têm indicador visual (círculo vermelho)

## Firestore Collection
`horariosBloqueados/{id}`
- blockDate (string, YYYY-MM-DD)
- blockInit (string, HH:MM)
- blockEnd (string, HH:MM)
- blockText (string)
- createdAt (Timestamp)
- createdBy (string, uid do admin)

## Arquivos Modificados
- pages/admin.html — nova view, modal, template, nav button
- css/pages/admin.css — estilos da view e indicador no calendário
- js/pages/admin.js — CRUD bloqueios + integração admin slots + calendário
- js/pages/agendamento.js — verificação de bloqueios nos slots do cliente
```

### 7.2 README.md — Adicionar seção

```markdown
### Bloqueio de Horários (Admin)
- View "Bloqueios" no painel administrativo
- Criar/Excluir bloqueios por data, período e motivo
- Horários bloqueados ficam indisponíveis para clientes e agendamento manual
- Indicador visual no calendário da agenda (círculo vermelho)
- Dados armazenados no Firestore (collection `horariosBloqueados`)
```

---

## 8. Testes

1. **Criar bloqueio:** Acessar view Bloqueios → + Novo Bloqueio → preencher data, horário 10:00-11:00, motivo → Salvar → verificar se aparece na lista
2. **Verificar calendário admin:** Navegar para Agenda → mês com bloqueio → verificar se o dia tem o círculo vermelho
3. **Verificar slots admin:** Agendamento Manual → selecionar data bloqueada → verificar se horários 10:00-11:00 estão indisponíveis
4. **Verificar slots cliente:** Abrir agendamento.html → selecionar procedimento e data bloqueada → verificar se horários 10:00-11:00 não aparecem
5. **Excluir bloqueio:** Botão 🗑️ na lista → confirmar → verificar se removeu e slots voltaram a ficar disponíveis
6. **Bloqueio parcial:** Bloquear 10:00-10:30 → verificar se apenas esse slot de 30min fica indisponível
