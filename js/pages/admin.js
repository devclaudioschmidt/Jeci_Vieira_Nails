// ================================================
// admin.js — Painel Administrativo (Role Admin B)
// ================================================
import { db, auth }                                          from '../firebase/config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged }
                                                             from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc, setDoc,
  query, where, orderBy, serverTimestamp
}                                                            from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { showToast, formatDatePTBR }                         from '../global.js';

// ---- Referências DOM ----
const loginScreen  = document.getElementById('login-screen');
const adminPanel   = document.getElementById('admin-panel');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');
const btnLogout    = document.getElementById('btn-logout');

// Views
const navBtns      = document.querySelectorAll('.nav-btn');
const adminViews   = document.querySelectorAll('.admin-view');

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
        showView('agenda');
        loadAgenda(new Date());
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
function buildAdminCalendar(month) {
  const cal       = document.getElementById('admin-calendar');
  const year      = month.getFullYear();
  const m         = month.getMonth();
  const today     = new Date(); today.setHours(0,0,0,0);
  const firstDay  = new Date(year, m, 1).getDay();
  const daysIn    = new Date(year, m + 1, 0).getDate();
  const label     = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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
    const date = new Date(year, m, d);
    const isSelected = date.toDateString() === selectedDate.toDateString();
    html += `<button class="cal-day${isSelected ? ' selected' : ''}"
                     data-date="${date.toISOString()}"
                     aria-label="${formatDatePTBR(date)}">${d}</button>`;
  }

  html += '</div>';
  cal.innerHTML = html;

  // Eventos de navegação de mês
  cal.querySelector('#cal-prev').addEventListener('click', () => {
    buildAdminCalendar(new Date(year, m - 1, 1));
  });
  cal.querySelector('#cal-next').addEventListener('click', () => {
    buildAdminCalendar(new Date(year, m + 1, 1));
  });

  // Seleção de dia
  cal.querySelectorAll('.cal-day').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDate = new Date(btn.dataset.date);
      buildAdminCalendar(new Date(year, m, 1));
      loadAgenda(selectedDate);
    });
  });
}

/**
 * Carrega e renderiza a lista de agendamentos do dia selecionado.
 * @param {Date} date
 */
async function loadAgenda(date) {
  buildAdminCalendar(date);

  const list    = document.getElementById('appointments-list');
  const dateStr = date.toISOString().split('T')[0];

  list.innerHTML = '<li class="skeleton" style="height:72px;border-radius:12px;margin-bottom:12px;"></li>'.repeat(3);

  try {
    const q        = query(
      collection(db, 'agendamentos'),
      where('date', '==', dateStr),
      orderBy('time')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      list.innerHTML = `<li style="text-align:center;color:var(--color-text-muted);padding:2rem 0;">
                          Nenhum agendamento para este dia.
                        </li>`;
      return;
    }

    list.innerHTML = '';
    snapshot.forEach(docSnap => {
      const d  = docSnap.data();
      const li = document.createElement('li');
      li.className = 'appointment-card';
      li.innerHTML = `
        <span class="appointment-time">${d.time}</span>
        <div class="appointment-info">
          <p class="appointment-client">${d.clientName}</p>
          <p class="appointment-procedure">${d.procedureName}</p>
          <p class="appointment-phone">${d.clientPhone}</p>
        </div>
      `;
      list.appendChild(li);
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
  list.innerHTML = '<li class="skeleton" style="height:56px;border-radius:12px;margin-bottom:8px;"></li>'.repeat(4);

  try {
    const q        = query(collection(db, 'procedimentos'), orderBy('name'));
    const snapshot = await getDocs(q);

    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = `<li style="text-align:center;color:var(--color-text-muted);padding:1.5rem 0;">
                          Nenhum procedimento cadastrado.
                        </li>`;
    }

    snapshot.forEach(docSnap => {
      const d  = docSnap.data();
      const li = document.createElement('li');
      li.className = 'procedure-admin-item';
      li.innerHTML = `
        <div>
          <strong>${d.name}</strong>
          ${d.price    ? `<span style="color:var(--color-primary);margin-left:8px;">R$ ${Number(d.price).toFixed(2)}</span>` : ''}
          ${d.duration ? `<span style="color:var(--color-text-muted);margin-left:8px;font-size:.8rem;">${d.duration} min</span>` : ''}
        </div>
        <div class="procedure-admin-actions">
          <button class="btn-icon delete" data-id="${docSnap.id}" aria-label="Excluir ${d.name}">🗑️</button>
        </div>
      `;
      li.querySelector('.delete').addEventListener('click', () => deleteProcedure(docSnap.id));
      list.appendChild(li);
    });

  } catch (err) {
    console.error('[admin.js] Erro ao listar procedimentos:', err);
    showToast('Erro ao carregar procedimentos.', 'error');
  }
}

document.getElementById('btn-add-procedure').addEventListener('click', () => {
  const name     = prompt('Nome do procedimento:');
  if (!name?.trim()) return;
  const price    = prompt('Preço (ex.: 45.00):');
  const duration = prompt('Duração em minutos (ex.: 60):');
  addProcedure(name.trim(), price, duration);
});

async function addProcedure(name, price, duration) {
  try {
    await addDoc(collection(db, 'procedimentos'), {
      name,
      price:    price    ? parseFloat(price)    : null,
      duration: duration ? parseInt(duration)   : 60,
      createdAt: serverTimestamp(),
    });
    showToast(`"${name}" adicionado!`, 'success');
    loadProceduresAdmin();
  } catch (err) {
    console.error('[admin.js] Erro ao adicionar procedimento:', err);
    showToast('Erro ao adicionar procedimento.', 'error');
  }
}

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
      hoursStart: document.getElementById('config-hours-start').value,
      hoursEnd:   document.getElementById('config-hours-end').value,
      updatedAt:  serverTimestamp(),
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
