// ================================================
// admin.js — Painel Administrativo (Role Admin B)
// ================================================
import { db, auth }                                          from '../firebase/config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged }
                                                             from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc, setDoc,
  query, where, orderBy, serverTimestamp, limit
}                                                            from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { showToast, formatDatePTBR, getGreeting, buildWhatsAppUrl, buildCalNavHTML, applyPhoneMask, formatPhoneNumber } from '../global.js';

// ---- Referências DOM ----
const loginScreen  = document.getElementById('login-screen');
const adminPanel   = document.getElementById('admin-panel');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');
const btnLogout    = document.getElementById('btn-logout');

// Sidebar e Hamburger
const adminSidebar   = document.getElementById('admin-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnMenuToggle  = document.getElementById('btn-menu-toggle');
const btnMenuClose   = document.getElementById('btn-menu-close');

// Views
const navBtns      = document.querySelectorAll('.nav-btn');
const adminViews   = document.querySelectorAll('.admin-view');

// ---- Referências do modal de bloqueio ----
const modalBlockBooking = document.getElementById('modal-block-booking');
const btnOpenBlock      = document.getElementById('btn-add-block');
const btnCloseBlock     = document.getElementById('btn-close-block-modal');
const btnCancelBlock    = document.getElementById('btn-cancel-block');
const formBlock         = document.getElementById('form-block');

// ---- Estado do agendamento manual (Admin) ----
let adminCalendarMonth = new Date(); // Mês exibido no calendário do modal

const adminBooking = {
  procedure: null,
  date: null,
  time: null,
  name: '',
  phone: '',
};

// ---- Estado do cancelamento pendente ----
let pendingCancel = null;

// ---- Estado do bloqueio pendente de exclusão ----
let pendingDeleteBlock = null;

// ---- Estado do reagendamento de cliente ----
let rescheduleData = null; // Armazena os dados do agendamento que está sendo reagendado

// ================================================
// AUTENTICAÇÃO
// ================================================
onAuthStateChanged(auth, async user => {
  if (user) {
    try {
      const docSnap = await getDoc(doc(db, 'admins', user.uid));
      if (docSnap.exists()) {
        loginScreen.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        document.getElementById('admin-greeting').textContent = getGreeting();
        showView('agenda');
        await loadAgenda(new Date());
      } else {
        await signOut(auth);
        loginError.textContent = 'Acesso negado. Você não é administrador.';
      }
    } catch {
      await signOut(auth);
      loginError.textContent = 'Erro ao verificar credenciais.';
    }
  } else {
    loginScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email    = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn      = document.getElementById('btn-login');

  btn.disabled    = true;
  btn.textContent = 'Entrando…';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = 'E-mail ou senha inválidos.';
    console.error('[admin.js] Login:', err.code);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
});

btnLogout.addEventListener('click', async () => {
  await signOut(auth);
});

// ================================================
// NAVEGAÇÃO E CONTROLE DO MENU LATERAL
// ================================================
const originalNavTexts = {
  agenda: 'Agenda',
  procedimentos: 'Procedimentos',
  bloqueios: 'Bloqueios',
  configuracoes: 'Configurações'
};

function updateNavTexts(activeView) {
  navBtns.forEach(btn => {
    const view = btn.dataset.view;
    const baseText = originalNavTexts[view] || btn.textContent;
    if (view === activeView) {
      btn.textContent = `< ${baseText}`;
    } else {
      btn.textContent = baseText;
    }
  });
}

function openSidebar() {
  adminSidebar?.classList.add('open');
  sidebarOverlay?.classList.add('open');
}

function closeSidebar() {
  adminSidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('open');
}

btnMenuToggle?.addEventListener('click', openSidebar);
btnMenuClose?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closeSidebar();
    showView(btn.dataset.view);
  });
});

function showView(viewName) {
  navBtns.forEach(b    => b.classList.toggle('active', b.dataset.view === viewName));
  adminViews.forEach(v => v.classList.toggle('hidden',  v.id !== `view-${viewName}`));

  updateNavTexts(viewName);

  if (viewName === 'procedimentos') loadProceduresAdmin();
  if (viewName === 'bloqueios') loadBlockedSlots();
  if (viewName === 'configuracoes') loadConfig();
}

// ================================================
// VIEW: AGENDA (B2)
// ================================================
let selectedDate = new Date();

/**
 * Constrói o calendário do admin e carrega agendamentos da data selecionada.
 * @param {Date} month  — primeiro dia do mês exibido
 */
async function buildAdminCalendar(month) {
  const cal       = document.getElementById('admin-calendar');
  const year      = month.getFullYear();
  const m         = month.getMonth();
  const today     = new Date(); today.setHours(0,0,0,0);
  const firstDay  = new Date(year, m, 1).getDay();
  const daysIn    = new Date(year, m + 1, 0).getDate();
  const label     = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Buscar datas com agendamento neste mês
  const pad = (n) => String(n).padStart(2, '0');
  const monthStart = `${year}-${pad(m + 1)}-01`;
  const monthEnd   = `${year}-${pad(m + 1)}-${pad(daysIn)}`;

  let datesWithAppts = new Set();
  try {
    const apptQuery = query(
      collection(db, 'agendamentos'),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd),
      limit(150)
    );
    const apptSnap = await getDocs(apptQuery);
    apptSnap.forEach(doc => datesWithAppts.add(doc.data().date));
  } catch (err) {
    console.error('[admin.js] Erro ao buscar datas com agendamento:', err);
  }

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

  const weekDays  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  let html = `
    <div class="cal-nav">
      <button id="cal-prev" aria-label="Mês anterior">&#8592;</button>
      <span class="calendar-month">${label}</span>
      <button id="cal-next" aria-label="Próximo mês">&#8594;</button>
    </div>
    <div class="calendar-grid">
      ${weekDays.map(d => `<span class="cal-header">${d}</span>`).join('')}
      ${Array(firstDay).fill('<span></span>').join('')}`;

  for (let d = 1; d <= daysIn; d++) {
    const date    = new Date(year, m, d);
    const isPast  = date < today;
    const isSunday = date.getDay() === 0;
    const isDisabled = isPast || isSunday;
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const dateStr = `${year}-${pad(m + 1)}-${pad(d)}`;
    const hasAppt = datesWithAppts.has(dateStr);

    const hasBlock = datesWithBlocks.has(dateStr);

    let classes = 'cal-day';
    if (isDisabled)  classes += ' disabled';
    if (isSelected)  classes += ' selected';
    if (hasAppt)     classes += ' has-appointment';
    if (hasBlock)    classes += ' has-block';

    html += `<button class="${classes}"
                     data-date="${date.toISOString()}"
                     ${isDisabled ? 'disabled' : ''}
                     aria-label="${formatDatePTBR(date)}">${d}</button>`;
  }

  html += '</div>';
  cal.innerHTML = html;

  // Eventos de navegação de mês
  cal.querySelector('#cal-prev').addEventListener('click', async () => {
    await buildAdminCalendar(new Date(year, m - 1, 1));
  });
  cal.querySelector('#cal-next').addEventListener('click', async () => {
    await buildAdminCalendar(new Date(year, m + 1, 1));
  });

  // Seleção de dia
  cal.querySelectorAll('.cal-day').forEach(btn => {
    btn.addEventListener('click', async () => {
      selectedDate = new Date(btn.dataset.date);
      await buildAdminCalendar(new Date(year, m, 1));
      loadAgenda(selectedDate);
    });
  });
}

/**
 * Carrega e renderiza a lista de agendamentos do dia selecionado.
 * @param {Date} date
 */
async function loadAgenda(date) {
  await buildAdminCalendar(date);

  const list    = document.getElementById('appointments-list');
  const dateStr = date.toISOString().split('T')[0];

  list.innerHTML = '<li class="skeleton-card slide-up-anim"></li>'.repeat(3);

  try {
    const q        = query(
      collection(db, 'agendamentos'),
      where('date', '==', dateStr),
      limit(50)
    );
    const snapshot = await getDocs(q);

    list.innerHTML = '';
    const template = document.getElementById('tpl-appointment');
    const blockTemplate = document.getElementById('tpl-block-appointment');
    
    // Ordenação em memória (JavaScript) para evitar a necessidade de Índice Composto no Firestore
    const results = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      results.push(data);
    });

    // Buscar bloqueios do dia e adicionar como cartões na lista
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
        });
      });
    } catch (err) {
      console.error('[admin.js] Erro ao buscar bloqueios para agenda:', err);
    }
    
    results.sort((a, b) => {
      if (a.isBlock && b.isBlock) return a.time > b.time ? 1 : -1;
      return a.time > b.time ? 1 : -1;
    });

    if (results.length === 0) {
      list.innerHTML = `<li class="empty-state-msg slide-up-anim">Nenhum agendamento para este dia.</li>`;
      return;
    }

    results.forEach(d => {
      if (d.isBlock) {
        // Renderizar cartão de bloqueio
        const clone = blockTemplate.content.cloneNode(true);
        clone.querySelector('[data-block-id]').dataset.blockId = d.id;
        clone.querySelector('.block-time-slot').textContent = `${d.time} - ${d.blockEnd}`;
        clone.querySelector('.block-motive-text').textContent = d.blockText;

        const btnDelete = clone.querySelector('.btn-delete-block-agenda');
        btnDelete.addEventListener('click', () => {
          pendingDeleteBlock = { id: d.id };
          document.getElementById('delete-block-date').textContent = formatDatePTBR(new Date(dateStr + 'T00:00:00'));
          document.getElementById('delete-block-time').textContent = `${d.time} às ${d.blockEnd}`;
          document.getElementById('delete-block-motive').textContent = d.blockText;
          modalDeleteBlock.showModal();
        });

        list.appendChild(clone);
        return;
      }

      const clone = template.content.cloneNode(true);
      clone.querySelector('[data-appointment-id]').dataset.appointmentId = d.id;
      clone.querySelector('.appointment-time').textContent = d.time;
      clone.querySelector('.appointment-client').textContent = d.clientName;
      clone.querySelector('.appointment-procedure').textContent = d.procedureName;
      clone.querySelector('.appointment-phone').textContent = formatPhoneNumber(d.clientPhone);

      // Botão WhatsApp: montar mensagem de lembrete para o cliente
      const btnWpp = clone.querySelector('.btn-whatsapp-client');
      if (btnWpp) {
        btnWpp.addEventListener('click', () => {
          const dateObj = new Date(d.date + 'T00:00:00'); // Evitar bugs de TimeZone
          const dateFormatted = formatDatePTBR(dateObj);
          const message =
            `Olá, ${d.clientName}! 😊\n\n` +
            `Passando para lembrar do seu agendamento:\n` +
            `📌 Procedimento: *${d.procedureName}*\n` +
            `📅 Data: *${dateFormatted}*\n` +
            `🕐 Horário: *${d.time}*\n\n` +
            `Qualquer dúvida, me chame aqui. Te espero! 💅 — Jeci Vieira Nails`;

          window.location.href = buildWhatsAppUrl(d.clientPhone, message);
        });
      }

      // Botão Reagendar: abre o modal de reagendamento e pré-seleciona os dados
      const btnReschedule = clone.querySelector('.btn-reschedule-appointment');
      if (btnReschedule) {
        btnReschedule.addEventListener('click', () => {
          resetAdminBooking(); // Limpa estados anteriores
          
          rescheduleData = {
            id: d.id,
            clientName: d.clientName,
            clientPhone: d.clientPhone,
            procedureId: d.procedureId,
            procedureName: d.procedureName,
            procedureDuration: d.procedureDuration,
            price: d.price,
            date: d.date,
            time: d.time,
          };
          
          // Altera o título do modal
          const modalTitle = document.getElementById('modal-booking-title');
          if (modalTitle) {
            modalTitle.textContent = 'Reagendar Cliente';
          }
          
          // Preenche os campos do Passo 4
          document.getElementById('admin-client-name-input').value = d.clientName;
          document.getElementById('admin-client-phone-input').value = formatPhoneNumber(d.clientPhone);
          
          // Abre o modal
          modalAdminBooking.showModal();
          adminLoadProcedures();
        });
      }

      // Botão Cancelar: abre o modal de confirmação
      const btnCancel = clone.querySelector('.btn-cancel-appointment');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          pendingCancel = {
            id: d.id,
            clientName: d.clientName,
            procedureName: d.procedureName,
            date: d.date,
            time: d.time,
            clientPhone: d.clientPhone,
          };

          document.getElementById('cancel-client-name').textContent = d.clientName;
          document.getElementById('cancel-procedure-name').textContent = d.procedureName;
          const dateObj = new Date(d.date + 'T00:00:00');
          document.getElementById('cancel-date').textContent = formatDatePTBR(dateObj);
          document.getElementById('cancel-time').textContent = d.time;

          document.getElementById('modal-cancel-appointment').showModal();
        });
      }

      list.appendChild(clone);
    });

  } catch (err) {
    console.error('[admin.js] Erro ao carregar agenda:', err);
    showToast('Erro ao carregar agendamentos.', 'error');
  }
}

// ================================================
// VIEW: PROCEDIMENTOS
// ================================================
async function loadProceduresAdmin() {
  const list = document.getElementById('procedures-admin-list');
  list.innerHTML = '<li class="skeleton-card small slide-up-anim"></li>'.repeat(4);

  try {
    const q        = query(collection(db, 'procedimentos'), orderBy('name'), limit(100));
    const snapshot = await getDocs(q);

    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = `<li class="empty-state-msg slide-up-anim">Nenhum procedimento cadastrado.</li>`;
      return;
    }

    const template = document.getElementById('tpl-procedure');
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const clone = template.content.cloneNode(true);
      clone.querySelector('.procedure-name').textContent = d.name;
      clone.querySelector('.procedure-price').textContent = d.price ? `R$ ${Number(d.price).toFixed(2)}` : '';
      clone.querySelector('.procedure-duration').textContent = d.duration ? `${d.duration} min` : '';
      
      const editBtn = clone.querySelector('.edit');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          document.getElementById('procedure-id').value = docSnap.id;
          document.getElementById('procedure-name').value = d.name;
          document.getElementById('procedure-category').value = d.category || 'Manicure e Pedicure';
          document.getElementById('procedure-price').value = d.price || '';
          document.getElementById('procedure-duration').value = d.duration || 60;
          document.getElementById('modal-title').textContent = 'Editar Procedimento';
          document.getElementById('modal-procedure').showModal();
        });
      }

      clone.querySelector('.delete').addEventListener('click', () => deleteProcedure(docSnap.id));
      list.appendChild(clone);
    });

  } catch (err) {
    console.error('[admin.js] Erro ao listar procedimentos:', err);
    showToast('Erro ao carregar procedimentos.', 'error');
  }
}

// --- Modal Actions ---
const modalProcedure = document.getElementById('modal-procedure');
const formProcedure  = document.getElementById('form-procedure');
const btnCloseModal  = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

document.getElementById('btn-add-procedure').addEventListener('click', () => {
  formProcedure.reset();
  document.getElementById('procedure-id').value = '';
  document.getElementById('procedure-category').value = 'Manicure e Pedicure';
  document.getElementById('modal-title').textContent = 'Novo Procedimento';
  modalProcedure.showModal();
});

const closeModal = () => modalProcedure.close();
btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

formProcedure.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id       = document.getElementById('procedure-id').value;
  const name     = document.getElementById('procedure-name').value.trim();
  const category = document.getElementById('procedure-category').value;
  const price    = document.getElementById('procedure-price').value;
  const duration = document.getElementById('procedure-duration').value;

  const data = {
    name,
    category,
    price:    price    ? parseFloat(price)    : null,
    duration: duration ? parseInt(duration)   : 60,
    updatedAt: serverTimestamp(),
  };

  const btn = document.getElementById('btn-save-procedure');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    if (id) {
      await setDoc(doc(db, 'procedimentos', id), data, { merge: true });
      showToast(`"${name}" atualizado!`, 'success');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'procedimentos'), data);
      showToast(`"${name}" adicionado!`, 'success');
    }
    closeModal();
    loadProceduresAdmin();
  } catch (err) {
    console.error('[admin.js] Erro ao salvar procedimento:', err);
    showToast('Erro ao salvar procedimento.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

async function deleteProcedure(id) {
  if (!confirm('Deseja excluir este procedimento?')) return;
  try {
    await deleteDoc(doc(db, 'procedimentos', id));
    showToast('Procedimento excluído.', 'info');
    loadProceduresAdmin();
  } catch (err) {
    console.error('[admin.js] Erro ao excluir procedimento:', err);
    showToast('Erro ao excluir.', 'error');
  }
}

// ================================================
// VIEW: CONFIGURAÇÕES
// ================================================
async function loadConfig() {
  try {
    const docSnap = await getDoc(doc(db, 'configuracoes', 'salao'));
    if (!docSnap.exists()) return;
    const d = docSnap.data();
    document.getElementById('config-phone').value        = formatPhoneNumber(d.phone)   || '';
    document.getElementById('config-address').value      = d.address      || '';
    document.getElementById('config-notice').value       = d.notice       || '';
    document.getElementById('config-hours-start').value  = d.hoursStart   || '09:00';
    document.getElementById('config-hours-end').value    = d.hoursEnd     || '18:00';
    document.getElementById('config-hours-interval-start').value = d.hoursIntervalStart || '12:00';
    document.getElementById('config-hours-interval-end').value   = d.hoursIntervalEnd   || '13:00';
    document.getElementById('config-hours-saturday-start').value = d.hoursSaturdayStart  || '09:00';
    document.getElementById('config-hours-saturday-end').value   = d.hoursSaturdayEnd    || '13:00';
  } catch (err) {
    console.error('[admin.js] Erro ao carregar configurações:', err);
  }
}

document.getElementById('salon-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-save-config');
  btn.disabled    = true;
  btn.textContent = 'Salvando…';

  try {
    await setDoc(doc(db, 'configuracoes', 'salao'), {
      phone:      document.getElementById('config-phone').value.trim(),
      address:    document.getElementById('config-address').value.trim(),
      notice:     document.getElementById('config-notice').value.trim(),
      hoursStart:          document.getElementById('config-hours-start').value,
      hoursEnd:            document.getElementById('config-hours-end').value,
      hoursIntervalStart:  document.getElementById('config-hours-interval-start').value,
      hoursIntervalEnd:    document.getElementById('config-hours-interval-end').value,
      hoursSaturdayStart:  document.getElementById('config-hours-saturday-start').value,
      hoursSaturdayEnd:    document.getElementById('config-hours-saturday-end').value,
      updatedAt:           serverTimestamp(),
    });
    showToast('Configurações salvas!', 'success');
  } catch (err) {
    console.error('[admin.js] Erro ao salvar configurações:', err);
    showToast('Erro ao salvar configurações.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Salvar';
  }
});

// ================================================
// BLOQUEIO DE HORÁRIOS (VIEW)
// ================================================

/**
 * Carrega e renderiza a lista de horários bloqueados.
 */
async function loadBlockedSlots() {
  const list = document.getElementById('blocked-list');
  list.innerHTML = '<li class="skeleton-card slide-up-anim"></li>'.repeat(3);

  try {
    const q = query(collection(db, 'horariosBloqueados'), limit(100));
    const snap = await getDocs(q);

    list.innerHTML = '';
    if (snap.empty) {
      list.innerHTML = '<li class="empty-state-msg slide-up-anim">Nenhum horário bloqueado.</li>';
      return;
    }

    // Ordenar em memória (mais recente primeiro)
    const results = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      d.id = docSnap.id;
      results.push(d);
    });
    results.sort((a, b) => a.blockDate > b.blockDate ? -1 : 1);

    const template = document.getElementById('tpl-block');
    results.forEach(d => {
      const clone = template.content.cloneNode(true);
      clone.querySelector('[data-block-id]').dataset.blockId = d.id;

      const dateObj = new Date(d.blockDate + 'T00:00:00');
      clone.querySelector('.block-date').textContent = dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      clone.querySelector('.block-time').textContent = `${d.blockInit} às ${d.blockEnd}`;
      clone.querySelector('.block-motive').textContent = d.blockText;

      const btnDelete = clone.querySelector('.btn-delete-block');
      btnDelete.addEventListener('click', () => deleteBlock(d.id));

      list.appendChild(clone);
    });
  } catch (err) {
    console.error('[admin.js] Erro ao carregar bloqueios:', err);
    showToast('Erro ao carregar bloqueios.', 'error');
  }
}

/**
 * Exclui um bloqueio do Firestore.
 * @param {string} id
 */
async function deleteBlock(id) {
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

// --- Eventos do modal de bloqueio ---
// ---- Referências do modal de exclusão de bloqueio ----
const modalDeleteBlock = document.getElementById('modal-delete-block');
const btnCloseDeleteBlock = document.getElementById('btn-close-delete-block-modal');
const btnDeleteBlockNo = document.getElementById('btn-delete-block-no');
const btnDeleteBlockYes = document.getElementById('btn-delete-block-yes');

// ---- Referências do modal de conflito de bloqueio ----
const modalBlockConflict = document.getElementById('modal-block-conflict');
const btnCloseConflict = document.getElementById('btn-close-conflict-modal');
const btnConflictOk = document.getElementById('btn-conflict-ok');

btnOpenBlock.addEventListener('click', () => {
  formBlock.reset();
  modalBlockBooking.showModal();
});

const closeBlockModal = () => modalBlockBooking.close();
btnCloseBlock.addEventListener('click', closeBlockModal);
btnCancelBlock.addEventListener('click', closeBlockModal);

// Eventos do modal de exclusão de bloqueio
const closeDeleteBlockModal = () => {
  pendingDeleteBlock = null;
  modalDeleteBlock.close();
};
btnCloseDeleteBlock.addEventListener('click', closeDeleteBlockModal);
btnDeleteBlockNo.addEventListener('click', closeDeleteBlockModal);

// Eventos do modal de conflito de bloqueio
btnCloseConflict.addEventListener('click', () => modalBlockConflict.close());
btnConflictOk.addEventListener('click', () => modalBlockConflict.close());

btnDeleteBlockYes.addEventListener('click', async () => {
  if (!pendingDeleteBlock) return;
  btnDeleteBlockYes.disabled = true;
  btnDeleteBlockYes.textContent = 'Removendo…';
  try {
    await deleteDoc(doc(db, 'horariosBloqueados', pendingDeleteBlock.id));
    showToast('Bloqueio removido.', 'success');
    closeDeleteBlockModal();
    loadBlockedSlots();
    // Se estiver na view agenda, recarregar
    const agendaView = document.getElementById('view-agenda');
    if (!agendaView.classList.contains('hidden')) {
      loadAgenda(selectedDate);
    }
  } catch (err) {
    console.error('[admin.js] Erro ao excluir bloqueio:', err);
    showToast('Erro ao excluir bloqueio.', 'error');
  } finally {
    btnDeleteBlockYes.disabled = false;
    btnDeleteBlockYes.textContent = 'Sim, remover';
  }
});

formBlock.addEventListener('submit', async (e) => {
  e.preventDefault();
  const blockDate = document.getElementById('block-date').value;
  const blockInit = document.getElementById('block-init').value;
  const blockEnd  = document.getElementById('block-end').value;
  const blockText = document.getElementById('block-text').value.trim();

  const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  // Validar horário
  if (toMin(blockInit) >= toMin(blockEnd)) {
    return showToast('Horário de término deve ser após o início.', 'error');
  }

  // Validar contra configurações do salão
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const blockDateObj = new Date(blockDate + 'T00:00:00');

  if (blockDateObj < today) {
    return showToast('Não é possível bloquear uma data passada.', 'error');
  }
  if (blockDateObj.getDay() === 0) {
    return showToast('Não é possível bloquear horário em um domingo (dia fechado).', 'error');
  }

  let config;
  try {
    const configSnap = await getDoc(doc(db, 'configuracoes', 'salao'));
    config = configSnap.exists() ? configSnap.data() : {};
  } catch (err) {
    console.error('[admin.js] Erro ao buscar config:', err);
    return showToast('Erro ao validar horário.', 'error');
  }

  const isSaturday = blockDateObj.getDay() === 6;
  let hStart, hEnd;
  if (isSaturday) {
    hStart = config.hoursSaturdayStart || '09:00';
    hEnd   = config.hoursSaturdayEnd   || '13:00';
  } else {
    hStart = config.hoursStart || '09:00';
    hEnd   = config.hoursEnd   || '18:00';
  }

  const dayStart = toMin(hStart);
  const dayEnd   = toMin(hEnd);
  const bStart   = toMin(blockInit);
  const bEnd     = toMin(blockEnd);

  if (bStart < dayStart || bEnd > dayEnd) {
    const dayType = isSaturday ? 'sábado' : 'dias úteis';
    return showToast(`Horário fora do expediente (${dayType}: ${hStart} às ${hEnd}).`, 'error');
  }

  // Verificar se já existem agendamentos conflitantes
  try {
    const apptQ = query(collection(db, 'agendamentos'), where('date', '==', blockDate));
    const apptSnap = await getDocs(apptQ);
    const conflictingAppts = [];
    apptSnap.forEach(docSnap => {
      const a = docSnap.data();
      const aStart = toMin(a.time);
      const aEnd = aStart + (a.procedureDuration || 60);
      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        conflictingAppts.push(`${a.time} — ${a.clientName} (${a.procedureName})`);
      }
    });

    if (conflictingAppts.length > 0) {
      const conflictList = document.getElementById('conflict-appointments-list');
      conflictList.innerHTML = conflictingAppts.map(a =>
        `<li style="padding:6px 0;border-bottom:1px solid var(--color-border);font-size:var(--fs-sm);color:var(--color-text);">${a}</li>`
      ).join('');
      showToast('Conflito com agendamentos existentes!', 'error');
      modalBlockConflict.showModal();
      return;
    }
  } catch (err) {
    console.error('[admin.js] Erro ao verificar agendamentos conflitantes:', err);
    return showToast('Erro ao verificar agendamentos.', 'error');
  }

  const btn = document.getElementById('btn-save-block');
  btn.disabled = true;
  btn.textContent = 'Bloqueando…';

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

// ================================================
// MODAL DE CANCELAMENTO DE AGENDAMENTO
// ================================================
const modalCancel    = document.getElementById('modal-cancel-appointment');
const btnCloseCancel = document.getElementById('btn-close-cancel-modal');
const btnCancelNo    = document.getElementById('btn-cancel-no');
const btnCancelYes   = document.getElementById('btn-cancel-yes');

/** Fecha o modal e limpa o estado do cancelamento pendente */
const closeCancelModal = () => {
  pendingCancel = null;
  modalCancel.close();
};

btnCloseCancel.addEventListener('click', closeCancelModal);
btnCancelNo.addEventListener('click', closeCancelModal);

// Confirma o cancelamento: deleta do Firestore e notifica o cliente via WhatsApp
btnCancelYes.addEventListener('click', async () => {
  if (!pendingCancel) return;

  btnCancelYes.disabled = true;
  btnCancelYes.textContent = 'Cancelando...';

  try {
    await deleteDoc(doc(db, 'agendamentos', pendingCancel.id));

    // Remove o card da lista pelo data-appointment-id
    document.querySelector(`[data-appointment-id="${pendingCancel.id}"]`)?.remove();
    await buildAdminCalendar(selectedDate);
    showToast('Agendamento cancelado.', 'success');

    // Abrir WhatsApp com mensagem de cancelamento
    const dateObj = new Date(pendingCancel.date + 'T00:00:00');
    const cancelMessage =
      `Olá, ${pendingCancel.clientName}.\n\n` +
      `Infelizmente precisei *cancelar* o seu agendamento:\n` +
      `📌 Procedimento: *${pendingCancel.procedureName}*\n` +
      `📅 Data: *${formatDatePTBR(dateObj)}*\n` +
      `🕐 Horário: *${pendingCancel.time}*\n\n` +
      `Por favor, acesse o nosso aplicativo para reagendar ou me chame aqui! 💅`;

    window.location.href = buildWhatsAppUrl(pendingCancel.clientPhone, cancelMessage);
  } catch (err) {
    console.error('[admin.js] Erro ao cancelar agendamento:', err);
    showToast('Erro ao cancelar.', 'error');
  } finally {
    btnCancelYes.disabled = false;
    btnCancelYes.textContent = 'Sim, cancelar';
    closeCancelModal();
  }
});

// ================================================
// AGENDAMENTO MANUAL (ADMIN)
// ================================================
const modalAdminBooking = document.getElementById('modal-admin-booking');
const btnOpenBooking    = document.getElementById('btn-admin-booking');
const btnCloseBooking   = document.getElementById('btn-close-booking-modal');
const adminStepDots     = document.querySelectorAll('.admin-step');
const adminSteps        = document.querySelectorAll('.admin-booking-step');

// Botões de navegação
const btnAdminStep1Next = document.getElementById('btn-admin-step1-next');
const btnAdminStep2Back = document.getElementById('btn-admin-step2-back');
const btnAdminStep2Next = document.getElementById('btn-admin-step2-next');
const btnAdminStep3Back = document.getElementById('btn-admin-step3-back');
const btnAdminStep3Next = document.getElementById('btn-admin-step3-next');
const btnAdminStep4Back = document.getElementById('btn-admin-step4-back');
const adminClientForm   = document.getElementById('admin-client-form');

let adminCurrentStep = 1;

function goToAdminStep(n) {
  adminSteps.forEach((s, i) => s.classList.toggle('active', i + 1 === n));
  adminStepDots.forEach((d, i) => {
    d.classList.toggle('active', i + 1 === n);
    d.classList.toggle('done', i + 1 < n);
  });
  adminCurrentStep = n;
}

// Abrir Modal
btnOpenBooking.addEventListener('click', () => {
  resetAdminBooking();
  modalAdminBooking.showModal();
  adminLoadProcedures();
});

btnCloseBooking.addEventListener('click', () => modalAdminBooking.close());

function resetAdminBooking() {
  adminCalendarMonth = new Date();
  adminBooking.procedure = null;
  adminBooking.date = null;
  adminBooking.time = null;
  adminBooking.name = '';
  adminBooking.phone = '';
  
  rescheduleData = null; // Limpa os dados de reagendamento anterior
  
  // Reseta o título padrão do modal
  const modalTitle = document.getElementById('modal-booking-title');
  if (modalTitle) {
    modalTitle.textContent = 'Agendamento Manual';
  }
  
  adminClientForm.reset();
  btnAdminStep1Next.disabled = true;
  btnAdminStep2Next.disabled = true;
  btnAdminStep3Next.disabled = true;
  
  goToAdminStep(1);
}

// STEP 1: Procedimentos
async function adminLoadProcedures() {
  const list = document.getElementById('admin-procedure-list');
  list.innerHTML = '<li class="skeleton" style="height:48px;border-radius:8px;"></li>'.repeat(3);

  try {
    const q = query(collection(db, 'procedimentos'), orderBy('name'));
    const snap = await getDocs(q);
    list.innerHTML = '';

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement('li');
      li.className = 'procedure-item';
      li.innerHTML = `
        <span class="procedure-name">${data.name}</span>
        ${data.price ? `<span class="procedure-price">R$ ${Number(data.price).toFixed(2)}</span>` : ''}
      `;
      // Se estiver no modo de reagendamento, pré-seleciona o procedimento correspondente
      if (rescheduleData && docSnap.id === rescheduleData.procedureId) {
        li.classList.add('selected');
        adminBooking.procedure = { id: docSnap.id, ...data };
        btnAdminStep1Next.disabled = false;
      }

      li.addEventListener('click', () => {
        list.querySelectorAll('.procedure-item').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected');
        adminBooking.procedure = { id: docSnap.id, ...data };
        btnAdminStep1Next.disabled = false;
      });
      list.appendChild(li);
    });
  } catch (err) {
    console.error('[admin.js] Erro ao carregar procedimentos:', err);
  }
}

btnAdminStep1Next.addEventListener('click', () => {
  goToAdminStep(2);
  adminBuildCalendar();
});

// STEP 2: Calendário
function adminBuildCalendar() {
  const container = document.getElementById('admin-date-picker');
  const today = new Date(); today.setHours(0,0,0,0);
  const year = adminCalendarMonth.getFullYear();
  const month = adminCalendarMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const monthLabel = adminCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let html = buildCalNavHTML(monthLabel) + `
    <div class="calendar-grid">
      ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<span class="cal-header">${d}</span>`).join('')}
      ${Array(firstDay).fill('<span></span>').join('')}`;

  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(year, month, d);
    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const disabled = isPast || isSunday;
    
    html += `<button class="cal-day${disabled ? ' disabled' : ''}" 
                     data-year="${year}" data-month="${month}" data-day="${d}"
                     ${disabled ? 'disabled' : ''}>${d}</button>`;
  }
  html += '</div>';
  container.innerHTML = html;

  // Navegação entre meses
  container.querySelector('.cal-prev').addEventListener('click', () => {
    adminCalendarMonth.setMonth(adminCalendarMonth.getMonth() - 1);
    adminBuildCalendar();
  });
  container.querySelector('.cal-next').addEventListener('click', () => {
    adminCalendarMonth.setMonth(adminCalendarMonth.getMonth() + 1);
    adminBuildCalendar();
  });

  // Seleção de dia
  container.querySelectorAll('.cal-day:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cal-day').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      adminBooking.date = new Date(btn.dataset.year, btn.dataset.month, btn.dataset.day);
      btnAdminStep2Next.disabled = false;
    });
  });
}

btnAdminStep2Back.addEventListener('click', () => goToAdminStep(1));
btnAdminStep2Next.addEventListener('click', async () => {
  btnAdminStep2Next.disabled = true;
  btnAdminStep2Next.textContent = 'Carregando...';
  await adminBuildTimeSlots();
  btnAdminStep2Next.disabled = false;
  btnAdminStep2Next.textContent = 'Próximo';
  goToAdminStep(3);
});

// STEP 3: Horários
async function adminBuildTimeSlots() {
  const list = document.getElementById('admin-time-slot-list');
  list.innerHTML = '<li class="skeleton" style="height:40px;border-radius:8px;"></li>'.repeat(3);

  try {
    const configSnap = await getDoc(doc(db, 'configuracoes', 'salao'));
    const config = configSnap.exists() ? configSnap.data() : {};
    
    const isSaturday = adminBooking.date.getDay() === 6;
    let hStart, hEnd, iStart, iEnd;

    if (isSaturday) {
      hStart = config.hoursSaturdayStart || '09:00';
      hEnd   = config.hoursSaturdayEnd   || '13:00';
      iStart = null; iEnd = null;
    } else {
      hStart = config.hoursStart || '09:00';
      hEnd   = config.hoursEnd   || '18:00';
      iStart = config.hoursIntervalStart || '12:00';
      iEnd   = config.hoursIntervalEnd   || '13:00';
    }

    const toMin = t => { if(!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };
    const toStr = m => { const h=Math.floor(m/60).toString().padStart(2,'0'); const min=(m%60).toString().padStart(2,'0'); return `${h}:${min}`; };

    const startMin = toMin(hStart);
    const endMin   = toMin(hEnd);
    const intStart = iStart ? toMin(iStart) : null;
    const intEnd   = iEnd ? toMin(iEnd) : null;

    const y = adminBooking.date.getFullYear();
    const m = String(adminBooking.date.getMonth() + 1).padStart(2, '0');
    const d = String(adminBooking.date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const q = query(collection(db, 'agendamentos'), where('date', '==', dateStr));
    const snap = await getDocs(q);
    const appointments = [];
    snap.forEach(doc => {
      const data = doc.data();
      const s = toMin(data.time);
      const dur = data.procedureDuration || 60;
      appointments.push({ start: s, end: s + dur });
    });

    // Buscar bloqueios do admin para esta data
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

    const duration = adminBooking.procedure.duration || 60;
    const slots = [];

    for (let curr = startMin; curr <= endMin - duration; curr += 30) {
      const sEnd = curr + duration;
      if (sEnd > endMin) continue;
      if (intStart !== null && Math.max(curr, intStart) < Math.min(sEnd, intEnd)) continue;
      
      let conflict = false;
      for (const appt of appointments) {
        if (Math.max(curr, appt.start) < Math.min(sEnd, appt.end)) { conflict = true; break; }
      }

      // Verificar conflito com bloqueios admin
      if (!conflict) {
        for (const block of blockSlots) {
          if (Math.max(curr, block.start) < Math.min(sEnd, block.end)) { conflict = true; break; }
        }
      }

      // Validação de horário passado (hoje)
      const now = new Date();
      if (dateStr === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (curr <= nowMin) conflict = true;
      }

      if (!conflict) slots.push(toStr(curr));
    }

    list.innerHTML = slots.length ? slots.map(t => `<li class="time-slot" data-time="${t}">${t}</li>`).join('') 
                                  : '<li style="grid-column: 1/-1; text-align:center; color:var(--color-text-muted);">Sem horários disponíveis.</li>';

    list.querySelectorAll('.time-slot').forEach(el => {
      el.addEventListener('click', () => {
        list.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        adminBooking.time = el.dataset.time;
        btnAdminStep3Next.disabled = false;
      });
    });
  } catch (err) {
    console.error('[admin.js] Erro slots:', err);
  }
}

btnAdminStep3Back.addEventListener('click', () => goToAdminStep(2));
btnAdminStep3Next.addEventListener('click', () => {
  goToAdminStep(4);
  import('../global.js').then(m => m.applyPhoneMask(document.getElementById('admin-client-phone-input')));
  const btn = document.getElementById('btn-admin-confirm');
  if (btn) {
    btn.textContent = rescheduleData ? '📱 Reagendar' : '📱 Agendar';
  }
});

// STEP 4: Confirmação
btnAdminStep4Back.addEventListener('click', () => goToAdminStep(3));

adminClientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('admin-client-name-input').value.trim();
  const phone = document.getElementById('admin-client-phone-input').value.trim();
  const btn = document.getElementById('btn-admin-confirm');

  if (name.length < 3) return showToast('Nome muito curto', 'error');
  if (phone.replace(/\D/g,'').length < 10) return showToast('Telefone inválido', 'error');

  btn.disabled = true;
  btn.textContent = rescheduleData ? 'Reagendando...' : 'Agendando...';

  try {
    const y = adminBooking.date.getFullYear();
    const m = String(adminBooking.date.getMonth() + 1).padStart(2, '0');
    const d = String(adminBooking.date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // 1. Cria o novo agendamento
    await addDoc(collection(db, 'agendamentos'), {
      procedureId: adminBooking.procedure.id,
      procedureName: adminBooking.procedure.name,
      procedureDuration: adminBooking.procedure.duration,
      price: adminBooking.procedure.price,
      date: dateStr,
      time: adminBooking.time,
      clientName: name,
      clientPhone: phone.replace(/\D/g, ''),
      status: 'confirmado',
      bookedBy: 'admin',
      createdAt: serverTimestamp()
    });

    // 2. Se for reagendamento, exclui o agendamento antigo
    if (rescheduleData) {
      await deleteDoc(doc(db, 'agendamentos', rescheduleData.id));
      showToast('Agendamento reagendado com sucesso!', 'success');
    } else {
      showToast('Agendamento realizado!', 'success');
    }

    modalAdminBooking.close();
    loadAgenda(selectedDate); // Recarrega a lista do dia selecionado no painel

    // 3. Notificar cliente via WhatsApp com mensagem correspondente
    const dateFormatted = formatDatePTBR(adminBooking.date);
    let message = '';
    
    if (rescheduleData) {
      const oldDateObj = new Date(rescheduleData.date + 'T00:00:00');
      const oldDateFormatted = formatDatePTBR(oldDateObj);
      message = `Olá, ${name}! 😊\n\nSeu agendamento foi *reagendado*:\n📌 Procedimento: *${adminBooking.procedure.name}*\n📅 Nova Data: *${dateFormatted}*\n🕐 Novo Horário: *${adminBooking.time}*\n\n(Horário anterior: ${oldDateFormatted} às ${rescheduleData.time})\n\nTe espero! 💅 — Jeci Vieira Nails`;
    } else {
      message = `Olá, ${name}! 😊\n\nSeu agendamento foi confirmado:\n📌 Procedimento: *${adminBooking.procedure.name}*\n📅 Data: *${dateFormatted}*\n🕐 Horário: *${adminBooking.time}*\n\nTe espero! 💅 — Jeci Vieira Nails`;
    }
    
    window.location.href = buildWhatsAppUrl(phone, message);

  } catch (err) {
    console.error('[admin.js] Erro ao agendar/reagendar admin:', err);
    showToast(rescheduleData ? 'Erro ao realizar reagendamento' : 'Erro ao realizar agendamento', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = rescheduleData ? '📱 Reagendar' : '📱 Agendar';
  }
});

// Aplicar máscara no input do telefone do salão em configurações
applyPhoneMask(document.getElementById('config-phone'));
