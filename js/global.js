// ================================================
// global.js — Comportamentos globais da aplicação
// ================================================

/**
 * Máscara de telefone brasileiro: (00) 00000-0000
 * @param {HTMLInputElement} input
 */
export function applyPhoneMask(input) {
  input.addEventListener('input', () => {
    let value = input.value.replace(/\D/g, '').slice(0, 11);
    if (value.length >= 7) {
      value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7)}`;
    } else if (value.length >= 3) {
      value = `(${value.slice(0,2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    input.value = value;
  });
}

/**
 * Formata uma data JS para pt-BR legível.
 * @param {Date} date
 * @returns {string} Ex.: "segunda-feira, 13 de maio de 2026"
 */
export function formatDatePTBR(date) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

/**
 * Gera a URL de envio do WhatsApp.
 * @param {string} phone  Número com DDD (somente dígitos)
 * @param {string} text   Mensagem a ser enviada
 * @returns {string}
 */
export function buildWhatsAppUrl(phone, text) {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * Retorna saudação baseada no horário do dia.
 * @returns {string} "Bom dia!", "Boa tarde!" ou "Boa noite!"
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia!';
  if (hour < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

/**
 * Exibe um toast de feedback não-intrusivo.
 * @param {string}  message
 * @param {'success'|'error'|'info'} type
 */
/**
 * Gera o HTML da barra de navegação do calendário (setas anterior/próximo).
 * @param {string} monthLabel  — rótulo do mês (ex: "maio de 2026")
 * @returns {string}
 */
export function buildCalNavHTML(monthLabel) {
  return `
    <div class="cal-nav">
      <button class="cal-prev cal-nav-btn" aria-label="Mês anterior">&#8592;</button>
      <span class="calendar-month">${monthLabel}</span>
      <button class="cal-next cal-nav-btn" aria-label="Próximo mês">&#8594;</button>
    </div>`;
}

export function showToast(message, type = 'info') {
  const existing = document.getElementById('toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;

  const colorMap = {
    success: 'var(--color-success)',
    error:   'var(--color-error)',
    info:    'var(--color-primary)',
  };

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '24px',
    left:         '50%',
    transform:    'translateX(-50%) translateY(80px)',
    background:   colorMap[type] ?? colorMap.info,
    color:        '#fff',
    padding:      '12px 24px',
    borderRadius: '999px',
    fontSize:     '0.875rem',
    fontWeight:   '600',
    zIndex:       '9999',
    transition:   'transform 300ms ease, opacity 300ms ease',
    opacity:      '0',
    whiteSpace:   'nowrap',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.3)',
  });

  document.body.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity   = '1';
    });
  });

  // Remover após 3s
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    toast.style.opacity   = '0';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}
