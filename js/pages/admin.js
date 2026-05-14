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
import { showToast, formatDatePTBR, getGreeting, buildWhatsAppUrl } from '../global.js';

// ---- Referências DOM ----
const loginScreen  = document.getElementById('login-screen');
const adminPanel   = document.getElementById('admin-panel');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');
const btnLogout    = document.getElementById('btn-logout');

// Views
const navBtns      = document.querySelectorAll('.nav-btn');
const adminViews   = document.querySelectorAll('.admin-view');

// ---- Estado do cancelamento pendente ----
let pendingCancel = null;

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
// NAVEGAÇÃO ENTRE VIEWS
// ================================================
navBtns.forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

function showView(viewName) {
  navBtns.forEach(b    => b.classList.toggle('active', b.dataset.view === viewName));
  adminViews.forEach(v => v.classList.toggle('hidden',  v.id !== `view-${viewName}`));

  if (viewName === 'procedimentos') loadProceduresAdmin();
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
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const dateStr = `${year}-${pad(m + 1)}-${pad(d)}`;
    const hasAppt = datesWithAppts.has(dateStr);

    let classes = 'cal-day';
    if (isSelected) classes += ' selected';
    if (hasAppt)    classes += ' has-appointment';

    html += `<button class="${classes}"
                     data-date="${date.toISOString()}"
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

    if (snapshot.empty) {
      list.innerHTML = `<li class="empty-state-msg slide-up-anim">Nenhum agendamento para este dia.</li>`;
      return;
    }

    list.innerHTML = '';
    const template = document.getElementById('tpl-appointment');
    
    // Ordenação em memória (JavaScript) para evitar a necessidade de Índice Composto no Firestore
    const results = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      results.push(data);
    });
    
    results.sort((a, b) => {
      return a.time > b.time ? 1 : -1; // Mais cedo primeiro
    });

    results.forEach(d => {
      const clone = template.content.cloneNode(true);
      clone.querySelector('[data-appointment-id]').dataset.appointmentId = d.id;
      clone.querySelector('.appointment-time').textContent = d.time;
      clone.querySelector('.appointment-client').textContent = d.clientName;
      clone.querySelector('.appointment-procedure').textContent = d.procedureName;
      clone.querySelector('.appointment-phone').textContent = d.clientPhone;

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

          window.open(buildWhatsAppUrl(d.clientPhone, message), '_blank');
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
    document.getElementById('config-phone').value        = d.phone        || '';
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

    window.open(buildWhatsAppUrl(pendingCancel.clientPhone, cancelMessage), '_blank');
  } catch (err) {
    console.error('[admin.js] Erro ao cancelar agendamento:', err);
    showToast('Erro ao cancelar.', 'error');
  } finally {
    btnCancelYes.disabled = false;
    btnCancelYes.textContent = 'Sim, cancelar';
    closeCancelModal();
  }
});
