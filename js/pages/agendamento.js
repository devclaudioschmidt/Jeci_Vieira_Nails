// ================================================
// agendamento.js — Fluxo de Agendamento (A5.1–A5.4)
// ================================================
import { db, auth } from '../firebase/config.js';
import { signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { applyPhoneMask, formatDatePTBR, showToast, buildCalNavHTML } from '../global.js';

// ---- Estado da sessão de agendamento ----
const booking = {
  procedure: null,   // { id, name, price, duration }
  date: null,        // Date object
  time: null,        // string "HH:MM"
  name: '',
  phone: '',
};

let calendarMonth = new Date(); // Mês atualmente exibido no calendário

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
  procedureList.innerHTML = '<div class="skeleton" style="height:56px;border-radius:12px;margin-bottom:16px;"></div>'.repeat(3);

  try {
    const q = query(collection(db, 'procedimentos'), orderBy('name'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      procedureList.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:1rem;">Nenhum procedimento cadastrado.</p>';
      return;
    }

    procedureList.innerHTML = '';

    const categories = {
      'Manicure e Pedicure': [],
      'Podologia': [],
      'Outros': []
    };

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const cat = data.category || 'Manicure e Pedicure';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ id: docSnap.id, ...data });
    });

    for (const [catName, procs] of Object.entries(categories)) {
      if (procs.length === 0) continue;

      const group = document.createElement('div');
      group.className = 'category-group slide-up-anim';

      const header = document.createElement('button');
      header.className = 'category-header';
      header.innerHTML = `
        ${catName}
        <span class="category-icon">&#9660;</span>
      `;

      const content = document.createElement('ul');
      content.className = 'category-content procedure-list';

      procs.forEach(data => {
        const li = document.createElement('li');
        li.className = 'procedure-item';
        li.dataset.id = data.id;
        li.dataset.name = data.name;
        li.dataset.price = data.price ?? '';
        li.dataset.duration = data.duration ?? 60;
        li.innerHTML = `
          <span class="procedure-name">${data.name}</span>
          ${data.price ? `<span class="procedure-price">R$ ${Number(data.price).toFixed(2)}</span>` : ''}
        `;
        li.addEventListener('click', () => selectProcedure(li));
        content.appendChild(li);
      });

      header.addEventListener('click', () => {
        const isExpanded = header.classList.contains('expanded');
        // Fecha todos
        document.querySelectorAll('.category-header').forEach(h => h.classList.remove('expanded'));
        document.querySelectorAll('.category-content').forEach(c => c.classList.remove('expanded'));
        
        // Abre o clicado se não estava aberto
        if (!isExpanded) {
          header.classList.add('expanded');
          content.classList.add('expanded');
        }
      });

      group.appendChild(header);
      group.appendChild(content);
      procedureList.appendChild(group);
    }

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

// ---- STEP 2: Calendário com navegação entre meses ----
function buildCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();

  const monthLabel = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, m, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let html = buildCalNavHTML(monthLabel) + `
    <div class="calendar-grid">
      ${weekDays.map(d => `<span class="cal-header">${d}</span>`).join('')}
      ${Array(firstDay).fill('<span></span>').join('')}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, m, d);
    const isPast = date < today;
    const isSunday = date.getDay() === 0;
    const disabled = isPast || isSunday;
    html += `<button class="cal-day${disabled ? ' disabled' : ''}"
                     data-year="${year}" data-month="${m}" data-day="${d}"
                     ${disabled ? 'disabled' : ''}
                     aria-label="${formatDatePTBR(date)}">
               ${d}
             </button>`;
  }

  html += '</div>';
  datePicker.innerHTML = html;

  // Navegação entre meses
  datePicker.querySelector('.cal-prev').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    buildCalendar();
  });

  datePicker.querySelector('.cal-next').addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    buildCalendar();
  });

  // Seleção de dia
  datePicker.querySelectorAll('.cal-day:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      datePicker.querySelectorAll('.cal-day').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const y = parseInt(btn.dataset.year);
      const m = parseInt(btn.dataset.month);
      const day = parseInt(btn.dataset.day);
      booking.date = new Date(y, m, day);
      btnStep2Next.disabled = false;
    });
  });
}

btnStep2Next.addEventListener('click', async () => { 
  const btn = btnStep2Next;
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Carregando...';
  
  await buildTimeSlots(); 
  
  btn.disabled = false;
  btn.textContent = originalText;
  goToStep(3); 
});
btnStep2Back.addEventListener('click', () => goToStep(1));

// ---- STEP 3: Horários disponíveis ----
async function buildTimeSlots() {
  timeSlotList.innerHTML = '<li class="skeleton" style="height:48px;border-radius:12px;margin-bottom:8px;"></li>'.repeat(4);

  try {
    // 1. Obter config do salão
    const docSnap = await getDoc(doc(db, 'configuracoes', 'salao'));
    const config = docSnap.exists() ? docSnap.data() : {};
    
    const isSaturday = booking.date.getDay() === 6;

    let hStart, hEnd, intStart, intEnd;

    if (isSaturday) {
      // Sábado: usa horários específicos, sem intervalo de almoço
      hStart   = config.hoursSaturdayStart || '09:00';
      hEnd     = config.hoursSaturdayEnd   || '13:00';
      intStart = null;
      intEnd   = null;
    } else {
      // Dias úteis: horários normais com intervalo
      hStart   = config.hoursStart         || '09:00';
      hEnd     = config.hoursEnd           || '18:00';
      intStart = config.hoursIntervalStart || '12:00';
      intEnd   = config.hoursIntervalEnd   || '13:00';
    }

    // Helper: "HH:MM" -> minutos
    const toMin = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Helper: minutos -> "HH:MM"
    const toTimeStr = (m) => {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    };

    const startMin = toMin(hStart);
    const endMin   = toMin(hEnd);
    const iStart   = intStart ? toMin(intStart) : null;
    const iEnd     = intEnd   ? toMin(intEnd)   : null;

    // 2. Obter agendamentos do dia selecionado
    // Formatar data localmente para evitar bugs de TimeZone com toISOString()
    const y = booking.date.getFullYear();
    const m = String(booking.date.getMonth() + 1).padStart(2, '0');
    const dStr = String(booking.date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dStr}`;
    
    const q = query(collection(db, 'agendamentos'), where('date', '==', dateStr));
    const snap = await getDocs(q);

    const appointments = [];
    snap.forEach(d => {
      const data = d.data();
      const aStart = toMin(data.time);
      const aDur   = data.procedureDuration || 60; // Fallback para agendamentos antigos
      appointments.push({ start: aStart, end: aStart + aDur });
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
      console.error('[agendamento.js] Erro ao buscar bloqueios:', err);
    }

    const duration = booking.procedure?.duration || 60;
    
    // 3. Gerar slots de 30 em 30 min e filtrar
    const availableSlots = [];
    
    for (let currentM = startMin; currentM <= endMin - duration; currentM += 30) {
      const slotStart = currentM;
      const slotEnd   = currentM + duration;

      // 3.1 Checar se passa do fim do expediente
      if (slotEnd > endMin) continue;

      // 3.2 Checar se conflita com o intervalo de almoço (apenas dias com intervalo definido)
      if (iStart !== null && iEnd !== null) {
        if (Math.max(slotStart, iStart) < Math.min(slotEnd, iEnd)) {
          continue;
        }
      }

      // 3.3 Checar se conflita com agendamentos existentes
      let hasConflict = false;
      for (const appt of appointments) {
        if (Math.max(slotStart, appt.start) < Math.min(slotEnd, appt.end)) {
          hasConflict = true;
          break;
        }
      }

      // 3.4 Checar se conflita com bloqueios do admin
      if (!hasConflict) {
        for (const block of blockSlots) {
          if (Math.max(slotStart, block.start) < Math.min(slotEnd, block.end)) {
            hasConflict = true;
            break;
          }
        }
      }

      // 3.5 Checar se o horário já passou (no dia de hoje)
      const today = new Date();
      const todayY = today.getFullYear();
      const todayM = String(today.getMonth() + 1).padStart(2, '0');
      const todayD = String(today.getDate()).padStart(2, '0');
      const todayStr = `${todayY}-${todayM}-${todayD}`;
      
      if (dateStr === todayStr) {
        const nowMin = today.getHours() * 60 + today.getMinutes();
        if (slotStart <= nowMin) {
          hasConflict = true; 
        }
      }

      if (!hasConflict) {
        availableSlots.push(toTimeStr(slotStart));
      }
    }

    // 4. Renderizar horários disponíveis
    if (availableSlots.length === 0) {
      timeSlotList.innerHTML = `<li style="color:var(--color-text-muted);text-align:center;padding:1rem;">Nenhum horário disponível neste dia.</li>`;
      btnStep3Next.disabled = true;
      return;
    }

    timeSlotList.innerHTML = availableSlots.map(t =>
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

  } catch (error) {
    console.error('[agendamento.js] Erro ao buscar horários:', error);
    showToast('Erro ao carregar horários.', 'error');
    timeSlotList.innerHTML = `<li style="color:var(--color-error);text-align:center;padding:1rem;">Falha ao carregar. Tente novamente.</li>`;
  }
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
(async () => {
  if (!auth.currentUser) {
    try { await signInAnonymously(auth); } catch (_) {}
  }
  loadProcedures();
  buildCalendar();
})();
