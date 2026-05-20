// ================================================
// confirmacao.js — Tela de Confirmação (A5.5–A5.7)
// ================================================
import { db } from '../firebase/config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { buildWhatsAppUrl, formatDatePTBR, showToast, formatPhoneNumber } from '../global.js';

// ---- Recuperar dados do agendamento ----
const raw = sessionStorage.getItem('booking');

if (!raw) {
  // Sem dados: redireciona ao início
  window.location.href = '../index.html';
}

const booking = JSON.parse(raw);
booking.date = new Date(booking.date);

// ---- Preencher resumo na tela ----
document.getElementById('summary-procedure').textContent = booking.procedure?.name || '—';
document.getElementById('summary-date').textContent = formatDatePTBR(booking.date);
document.getElementById('summary-time').textContent = booking.time || '—';
document.getElementById('summary-name').textContent = booking.name || '—';
document.getElementById('summary-phone').textContent = formatPhoneNumber(booking.phone) || '—';

// ---- Salvar no Firestore e abrir WhatsApp (A5.6) ----
document.getElementById('btn-confirmar-whatsapp').addEventListener('click', async () => {
  const btn = document.getElementById('btn-confirmar-whatsapp');
  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    // 1. Persistir no Firestore
    await addDoc(collection(db, 'agendamentos'), {
      procedureId: booking.procedure?.id ?? null,
      procedureName: booking.procedure?.name ?? '',
      procedureDuration: booking.procedure?.duration ?? 60,
      price: booking.procedure?.price ?? null,
      date: booking.date.toISOString().split('T')[0],  // "YYYY-MM-DD"
      time: booking.time,
      clientName: booking.name,
      clientPhone: booking.phone.replace(/\D/g, ''),
      status: 'confirmado',
      createdAt: serverTimestamp(),
    });

    btn.textContent = '✅ Agendado';

    // 2. Montar mensagem do WhatsApp (A5.6 / A5.7)
    // A CLIENTE envia esta mensagem para o SALÃO
    const dateStr = formatDatePTBR(booking.date);
    const message =
      `Olá, Jeci! 😊 Acabei de fazer meu agendamento pelo app:\n\n` +
      `📌 Procedimento: *${booking.procedure?.name}*\n` +
      `📅 Data: *${dateStr}*\n` +
      `🕐 Horário: *${booking.time}*\n\n` +
      `Meu nome: *${booking.name}*\n` +
      `Meu WhatsApp: *${booking.phone}*\n\n` +
      `Fico no aguardo da confirmação! 🙏💅`;

    // 3. Limpar sessionStorage
    sessionStorage.removeItem('booking');

    // 4. Mostrar feedback e redirecionar para o WhatsApp
    // Usamos window.location.href para garantir compatibilidade com mobile e evitar bloqueios de pop-up
    showToast('Agendamento confirmado! Redirecionando...', 'success');
    
    const SALON_WHATSAPP = '5547997064072';
    const whatsappUrl = buildWhatsAppUrl(SALON_WHATSAPP, message);
    
    // Pequeno delay para o usuário ver o feedback antes da transição de app
    setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 800);

  } catch (err) {
    console.error('[confirmacao.js] Erro ao salvar agendamento:', err);
    showToast('Erro ao confirmar agendamento. Tente novamente.', 'error');
    btn.disabled = false;
    btn.textContent = '📱 Confirmar pelo WhatsApp';
  }
});
