# Plano de Revisão — Bloqueio de Horários

## 1. admin.html — Campo data com mesmo estilo de horários

**Localização:** Modal `modal-block-booking`

**O que mudar:** Envolver o campo `input[type=date]` em `.config-field` para alinhar visualmente com os campos `type=time` abaixo.

**Antes:**
```html
<label for="block-date">Data do bloqueio</label>
<input type="date" id="block-date" name="blockDate" required />
```

**Depois:**
```html
<div class="config-field">
  <label for="block-date">Data do bloqueio</label>
  <input type="date" id="block-date" name="blockDate" required />
</div>
```

---

## 2. admin.js + admin.html — Bloqueios na lista de agendamentos do dia

### 2.1 HTML — Template para bloqueio na agenda

Adicionar em `admin.html`, após template `tpl-block`:

```html
<template id="tpl-block-appointment">
  <li class="appointment-card slide-up-anim block-appointment-card" data-block-id="">
    <span class="appointment-time block-time-slot"></span>
    <div class="appointment-info">
      <p class="appointment-client">🔒 Bloqueado</p>
      <p class="appointment-procedure block-motive-text"></p>
    </div>
    <div class="appointment-actions">
      <button class="btn-icon btn-action-client btn-delete-block-agenda" aria-label="Excluir bloqueio">🗑️</button>
    </div>
  </li>
</template>
```

### 2.2 CSS — admin.css

Adicionar ao final:
```css
/* Cartão de bloqueio na lista de agendamentos do dia */
.block-appointment-card {
  border-left: 4px solid var(--color-error);
  opacity: 0.85;
}

.block-appointment-card .appointment-time {
  color: var(--color-error);
}

.block-appointment-card .appointment-client {
  color: var(--color-error);
}

.block-appointment-card .block-motive-text {
  font-style: italic;
}
```

### 2.3 JS — admin.js

Na função `loadAgenda()`, após `results.sort(...)` e antes do loop `results.forEach(...)`, adicionar busca de bloqueios do dia e inserir como cartões:

```js
// Buscar bloqueios do dia e adicionar como cartões
try {
  const blockQ = query(collection(db, 'horariosBloqueados'), where('blockDate', '==', dateStr));
  const blockSnap = await getDocs(blockQ);
  blockSnap.forEach(docSnap => {
    const d = docSnap.data();
    results.push({
      id: docSnap.id,
      isBlock: true,
      time: d.blockInit,
      blockEnd: d.blockEnd,
      blockText: d.blockText,
      blockDate: d.blockDate,
    });
  });
} catch (err) {
  console.error('[admin.js] Erro ao buscar bloqueios para agenda:', err);
}
```

No loop `results.forEach(d => { ... })`, adicionar condicional:

```js
if (d.isBlock) {
  // Renderizar cartão de bloqueio
  const blockTemplate = document.getElementById('tpl-block-appointment');
  const clone = blockTemplate.content.cloneNode(true);
  clone.querySelector('[data-block-id]').dataset.blockId = d.id;
  clone.querySelector('.block-time-slot').textContent = `${d.time} - ${d.blockEnd}`;
  clone.querySelector('.block-motive-text').textContent = d.blockText;

  const btnDelete = clone.querySelector('.btn-delete-block-agenda');
  btnDelete.addEventListener('click', () => {
    if (confirm('Deseja remover este bloqueio?')) {
      deleteDoc(doc(db, 'horariosBloqueados', d.id)).then(() => {
        showToast('Bloqueio removido.', 'success');
        loadAgenda(selectedDate);
      });
    }
  });

  list.appendChild(clone);
  return;
}

// (código existente para appointment normal)
```

**IMPORTANTE:** A ordenação por `time` continuará funcionando pois `d.time` é `blockInit`.

---

## 3. admin.html + admin.js — Modal de confirmação de exclusão

Substituir `confirm()` nativo por modal estilizado.

### 3.1 HTML — Modal de confirmação de exclusão de bloqueio

Adicionar em `admin.html`:

```html
<!-- ===== MODAL DE EXCLUSÃO DE BLOQUEIO ===== -->
<dialog id="modal-delete-block" class="app-modal" aria-labelledby="modal-delete-block-title">
  <div class="modal-content">
    <header class="modal-header">
      <h3 id="modal-delete-block-title">Remover Bloqueio</h3>
      <button id="btn-close-delete-block-modal" class="btn-icon" aria-label="Fechar modal">&times;</button>
    </header>
    <div class="modal-body">
      <p class="modal-cancel-text">Tem certeza que deseja remover este bloqueio?</p>
      <div class="cancel-details">
        <p><strong>Data:</strong> <span id="delete-block-date"></span></p>
        <p><strong>Horário:</strong> <span id="delete-block-time"></span></p>
        <p><strong>Motivo:</strong> <span id="delete-block-motive"></span></p>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" id="btn-delete-block-no" class="btn-secondary">Voltar</button>
      <button type="button" id="btn-delete-block-yes" class="btn-primary" style="background:var(--color-error);color:#fff;">Sim, remover</button>
    </div>
  </div>
</dialog>
```

### 3.2 JS — admin.js

Variáveis globais:
```js
// Estado do bloqueio pendente de exclusão
let pendingDeleteBlock = null;

// Referências DOM
const modalDeleteBlock = document.getElementById('modal-delete-block');
const btnCloseDeleteBlock = document.getElementById('btn-close-delete-block-modal');
const btnDeleteBlockNo = document.getElementById('btn-delete-block-no');
const btnDeleteBlockYes = document.getElementById('btn-delete-block-yes');
```

Eventos:
```js
btnCloseDeleteBlock.addEventListener('click', () => { pendingDeleteBlock = null; modalDeleteBlock.close(); });
btnDeleteBlockNo.addEventListener('click', () => { pendingDeleteBlock = null; modalDeleteBlock.close(); });
btnDeleteBlockYes.addEventListener('click', async () => {
  if (!pendingDeleteBlock) return;
  btnDeleteBlockYes.disabled = true;
  btnDeleteBlockYes.textContent = 'Removendo...';
  try {
    await deleteDoc(doc(db, 'horariosBloqueados', pendingDeleteBlock.id));
    showToast('Bloqueio removido.', 'success');
    modalDeleteBlock.close();
    pendingDeleteBlock = null;
    loadBlockedSlots(); // Recarrega view bloqueios
    if (!document.getElementById('view-bloqueios').classList.contains('hidden')) {
      // já está na view bloqueios, loadBlockedSlots foi chamado
    }
  } catch (err) {
    console.error('[admin.js] Erro ao excluir bloqueio:', err);
    showToast('Erro ao excluir bloqueio.', 'error');
  } finally {
    btnDeleteBlockYes.disabled = false;
    btnDeleteBlockYes.textContent = 'Sim, remover';
  }
});
```

Modificar `deleteBlock()`:
```js
async function deleteBlock(id) {
  // Buscar dados do bloqueio para exibir no modal
  try {
    const docSnap = await getDoc(doc(db, 'horariosBloqueados', id));
    if (!docSnap.exists()) return;
    const d = docSnap.data();
    const dateObj = new Date(d.blockDate + 'T00:00:00');
    document.getElementById('delete-block-date').textContent = dateObj.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('delete-block-time').textContent = `${d.blockInit} às ${d.blockEnd}`;
    document.getElementById('delete-block-motive').textContent = d.blockText;
    pendingDeleteBlock = { id, ...d };
    modalDeleteBlock.showModal();
  } catch (err) {
    console.error('[admin.js] Erro ao buscar bloqueio:', err);
  }
}
```

---

## 4. admin.js — Validar conflito com agendamentos ao criar bloqueio

Modificar handler `formBlock.addEventListener('submit', ...)`. Após obter `blockDate`, `blockInit`, `blockEnd`:

```js
// Verificar se já existem agendamentos no horário do bloqueio
try {
  const apptQ = query(collection(db, 'agendamentos'), where('date', '==', blockDate));
  const apptSnap = await getDocs(apptQ);
  const conflictingAppts = [];
  apptSnap.forEach(docSnap => {
    const a = docSnap.data();
    const aStart = toMin(a.time);
    const aEnd = aStart + (a.procedureDuration || 60);
    const bStart = toMin(blockInit);
    const bEnd = toMin(blockEnd);
    if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
      conflictingAppts.push(`${a.time} — ${a.clientName} (${a.procedureName})`);
    }
  });

  if (conflictingAppts.length > 0) {
    const msg = 'Não é possível bloquear este horário. Existem agendamentos conflitantes:\n\n' +
      conflictingAppts.join('\n');
    showToast('Conflito com agendamentos existentes!', 'error');
    alert(msg); // ou modal estilizado
    return;
  }
} catch (err) {
  console.error('[admin.js] Erro ao verificar agendamentos conflitantes:', err);
}
```

**OBS:** Se quiser, podemos substituir o `alert()` por um modal estilizado de aviso (reaproveitando o design do modal de cancelamento).

---

## 5. admin.js — Validar data/horário contra config do salão

No submit handler, antes de verificar conflitos com agendamentos:

```js
// Validar contra configurações do salão
const today = new Date();
today.setHours(0, 0, 0, 0);
const blockDateObj = new Date(blockDate + 'T00:00:00');

// 5.1 Data não pode ser passada
if (blockDateObj < today) {
  return showToast('Não é possível bloquear uma data passada.', 'error');
}

// 5.2 Não pode ser domingo
if (blockDateObj.getDay() === 0) {
  return showToast('Não é possível bloquear horário em um domingo (dia fechado).', 'error');
}

// 5.3 Horário deve estar dentro do expediente
const configSnap = await getDoc(doc(db, 'configuracoes', 'salao'));
const config = configSnap.exists() ? configSnap.data() : {};
const isSaturday = blockDateObj.getDay() === 6;

const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

let hStart, hEnd;
if (isSaturday) {
  hStart = config.hoursSaturdayStart || '09:00';
  hEnd   = config.hoursSaturdayEnd   || '13:00';
} else {
  hStart = config.hoursStart || '09:00';
  hEnd   = config.hoursEnd   || '18:00';
}

const bStart = toMin(blockInit);
const bEnd   = toMin(blockEnd);
const dayStart = toMin(hStart);
const dayEnd   = toMin(hEnd);

if (bStart < dayStart || bEnd > dayEnd) {
  const dayType = isSaturday ? 'sábado' : 'dias úteis';
  return showToast(`Horário fora do expediente (${dayType}: ${hStart} às ${hEnd}).`, 'error');
}

if (bStart >= bEnd) {
  return showToast('Horário de término deve ser após o início.', 'error');
}
```

---

## 6. Helper `toMin`

A função `toMin()` já existe dentro de `adminBuildTimeSlots()`. Para reutilizar na validação do formulário, precisamos declará-la em um escopo acessível ou duplicá-la no handler.

**Sugestão:** Declarar `toMin` como função auxiliar no início do bloco de bloqueio (fora de qualquer função), ou simplesmente duplicar as 2 linhas dentro do handler (mais simples e não quebra nada).

---

## Resumo das Modificações

| Item | Arquivo | Tipo |
|---|---|---|
| 1. Estilo campo date | `pages/admin.html` | edição |
| 2. Bloqueios na agenda | `pages/admin.html` + `css/pages/admin.css` + `js/pages/admin.js` | adição |
| 3. Modal exclusão | `pages/admin.html` + `js/pages/admin.js` | adição |
| 4. Validar conflito agendamentos | `js/pages/admin.js` | edição |
| 5. Validar data/horário config | `js/pages/admin.js` | edição |
