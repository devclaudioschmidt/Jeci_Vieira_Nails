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

// ---- Estado do agendamento manual (Admin) ----
const adminBooking = {
  procedure: null,
  date: null,
  time: null,
  name: '',
  phone: '',
};

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
    const isPast  = date < today;
    const isSunday = date.getDay() === 0;
    const isDisabled = isPast || isSunday;
    const isSelected = date.toDateString() === selectedDate.toDateString();
    const dateStr = `${year}-${pad(m + 1)}-${pad(d)}`;
    const hasAppt = datesWithAppts.has(dateStr);

    let classes = 'cal-day';
    if (isDisabled)  classes += ' disabled';
    if (isSelected)  classes += ' selected';
    if (hasAppt)     classes += ' has-appointment';

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

          window.location.href = buildWhatsAppUrl(d.clientPhone, message);
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
  adminBooking.procedure = null;
  adminBooking.date = null;
  adminBooking.time = null;
  adminBooking.name = '';
  adminBooking.phone = '';
  
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
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const monthLabel = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let html = `<p class="calendar-month">${monthLabel}</p>
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
  btn.textContent = 'Agendando...';

  try {
    const y = adminBooking.date.getFullYear();
    const m = String(adminBooking.date.getMonth() + 1).padStart(2, '0');
    const d = String(adminBooking.date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

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

    showToast('Agendamento realizado!', 'success');
    modalAdminBooking.close();
    loadAgenda(selectedDate); // Recarrega a lista do dia selecionado no painel

    // Notificar cliente via WhatsApp
    const dateFormatted = formatDatePTBR(adminBooking.date);
    const message = `Olá, ${name}! 😊\n\nSeu agendamento foi confirmado:\n📌 Procedimento: *${adminBooking.procedure.name}*\n📅 Data: *${dateFormatted}*\n🕐 Horário: *${adminBooking.time}*\n\nTe espero! 💅 — Jeci Vieira Nails`;
    
    window.location.href = buildWhatsAppUrl(phone, message);

  } catch (err) {
    console.error('[admin.js] Erro ao agendar admin:', err);
    showToast('Erro ao realizar agendamento', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📱 Agendar e Avisar Cliente';
  }
});
