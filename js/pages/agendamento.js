// ================================================
// agendamento.js — Fluxo de Agendamento (A5.1–A5.4)
// ================================================
import { db } from '../firebase/config.js';
import { collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { applyPhoneMask, formatDatePTBR, showToast } from '../global.js';

// ---- Estado da sessão de agendamento ----
const booking = {
  procedure: null,   // { id, name, price, duration }
  date: null,   // Date object
  time: null,   // string "HH:MM"
  name: '',
  phone: '',
};

// ---- Referências ao DOM ----
const steps = document.querySelectorAll('.booking-step');
const stepDots = document.querySelectorAll('.step-indicator .step');

// Step 1
const procedureList = document.getElementById('procedure-list');
const btnStep1Next = document.getElementById('btn-step1-next');

// Step 2
const datePicker = document.getElementById('date-picker');
const btnStep2Next = document.getElementById('btn-step2-next');
const btnStep2Back = document.getElementById('btn-step2-back');

// Step 3
const timeSlotList = document.getElementById('time-slot-list');
const btnStep3Next = document.getElementById('btn-step3-next');
const btnStep3Back = document.getElementById('btn-step3-back');

// Step 4
const clientForm = document.getElementById('client-form');
const inputName = document.getElementById('client-name');
const inputPhone = document.getElementById('client-phone');
const btnStep4Back = document.getElementById('btn-step4-back');

// ---- Navegação entre steps ----
let currentStep = 1;

function goToStep(n) {
  steps.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === n);
  });
  stepDots.forEach((d, i) => {
    d.classList.toggle('active', i + 1 === n);
    d.classList.toggle('done', i + 1 < n);
  });
  currentStep = n;
}

// ---- STEP 1: Carregar procedimentos do Firestore ----
async function loadProcedures() {
  procedureList.innerHTML = '<li class="skeleton" style="height:56px;border-radius:12px;"></li>'.repeat(3);

  try {
    const q = query(collection(db, 'procedimentos'), orderBy('name'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      procedureList.innerHTML = '<li style="color:var(--color-text-muted);text-align:center;padding:1rem;">Nenhum procedimento cadastrado.</li>';
      return;
    }

    procedureList.innerHTML = '';

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement('li');
      li.className = 'procedure-item';
      li.dataset.id = docSnap.id;
      li.dataset.name = data.name;
      li.dataset.price = data.price ?? '';
      li.dataset.duration = data.duration ?? 60;
      li.innerHTML = `
        <span class="procedure-name">${data.name}</span>
        ${data.price ? `<span class="procedure-price">R$ ${Number(data.price).toFixed(2)}</span>` : ''}
      `;
      li.addEventListener('click', () => selectProcedure(li));
      procedureList.appendChild(li);
    });

  } catch (err) {
    console.error('[agendamento.js] Erro ao carregar procedimentos:', err);
    showToast('Erro ao carregar procedimentos.', 'error');
  }
}

function selectProcedure(item) {
  document.querySelectorAll('.procedure-item').forEach(el => el.classList.remove('selected'));
  item.classList.add('selected');
  booking.procedure = {
    id: item.dataset.id,
    name: item.dataset.name,
    price: item.dataset.price,
    duration: Number(item.dataset.duration),
  };
  btnStep1Next.disabled = false;
}

btnStep1Next.addEventListener('click', () => goToStep(2));

// ---- STEP 2: Calendário simples ----
function buildCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthLabel = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let html = `<p class="calendar-month">${monthLabel}</p>
    <div class="calendar-grid">
      ${weekDays.map(d => `<span class="cal-header">${d}</span>`).join('')}
      ${Array(firstDay).fill('<span></span>').join('')}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const disabled = isPast || isSunday;
    html += `<button class="cal-day${disabled ? ' disabled' : ''}"
                     data-date="${date.toISOString()}"
                     ${disabled ? 'disabled' : ''}
                     aria-label="${formatDatePTBR(date)}">
               ${d}
             </button>`;
  }

  html += '</div>';
  datePicker.innerHTML = html;

  datePicker.querySelectorAll('.cal-day:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      datePicker.querySelectorAll('.cal-day').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      booking.date = new Date(btn.dataset.date);
      btnStep2Next.disabled = false;
    });
  });
}

btnStep2Next.addEventListener('click', () => { buildTimeSlots(); goToStep(3); });
btnStep2Back.addEventListener('click', () => goToStep(1));

// ---- STEP 3: Horários disponíveis ----
function buildTimeSlots() {
  // Horários padrão — futuramente virão das configurações do salão
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

  timeSlotList.innerHTML = slots.map(t =>
    `<li class="time-slot" data-time="${t}">${t}</li>`
  ).join('');

  timeSlotList.querySelectorAll('.time-slot').forEach(el => {
    el.addEventListener('click', () => {
      timeSlotList.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
      booking.time = el.dataset.time;
      btnStep3Next.disabled = false;
    });
  });
}

btnStep3Next.addEventListener('click', () => goToStep(4));
btnStep3Back.addEventListener('click', () => goToStep(2));

// ---- STEP 4: Dados do cliente ----
applyPhoneMask(inputPhone);

btnStep4Back.addEventListener('click', () => goToStep(3));

clientForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = inputName.value.trim();
  const phone = inputPhone.value.trim();

  if (!name || name.length < 3) {
    showToast('Por favor, informe seu nome completo.', 'error');
    inputName.focus();
    return;
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    showToast('Informe um WhatsApp válido com DDD.', 'error');
    inputPhone.focus();
    return;
  }

  booking.name = name;
  booking.phone = phone;

  // Salvar no sessionStorage para recuperar na tela de confirmação
  sessionStorage.setItem('booking', JSON.stringify({
    ...booking,
    date: booking.date.toISOString(),
  }));

  window.location.href = 'confirmacao.html';
});

// ---- Init ----
loadProcedures();
buildCalendar();
