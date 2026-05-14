// ================================================
// index.js — Lógica da Tela Inicial (Role Cliente)
// ================================================
import { db }                         from '../firebase/config.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { showToast, formatDatePTBR, applyPhoneMask, getGreeting } from '../global.js';

/**
 * Carrega as configurações do salão gravadas pelo Admin
 * e preenche os elementos da tela de boas-vindas.
 *
 * Documento Firestore esperado:
 *   /configuracoes/salao → { phone, address, notice }
 */
async function loadSalonInfo() {
  document.getElementById('welcome-title').textContent = getGreeting();
  try {
    const docRef  = doc(db, 'configuracoes', 'salao');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const { phone, address, notice } = docSnap.data();

    const elPhone   = document.getElementById('salon-phone');
    const elAddress = document.getElementById('salon-address');
    const elNotice  = document.getElementById('salon-notice');

    if (elPhone)   elPhone.textContent   = 'WhatsApp: ' + (phone || '');
    if (elAddress) elAddress.textContent = address || '';
    if (elNotice) {
      elNotice.textContent = notice || '';

      const elNoticeBoard = elNotice.closest('.notice-board');
      if (elNoticeBoard) {
        elNoticeBoard.classList.toggle('hidden', !notice);
      }
    }

  } catch (err) {
    console.error('[index.js] Erro ao carregar dados do salão:', err);
    showToast('Não foi possível carregar as informações do salão.', 'error');
  }
}

// Ponto de entrada
loadSalonInfo();

// ================================================
// BUSCA DE AGENDAMENTOS
// ================================================
const btnOpenSearch = document.getElementById('btn-open-search');
const btnCloseSearch = document.getElementById('btn-close-search');
const modalSearch = document.getElementById('modal-search-appointments');
const formSearch = document.getElementById('form-search-appointments');
const searchResultsList = document.getElementById('search-results-list');
const btnSubmitSearch = document.getElementById('btn-submit-search');
const inputSearchPhone = document.getElementById('search-phone');

if (inputSearchPhone) {
  applyPhoneMask(inputSearchPhone);
}

btnOpenSearch.addEventListener('click', () => {
  formSearch.reset();
  searchResultsList.innerHTML = '';
  searchResultsList.classList.add('hidden');
  modalSearch.showModal();
});

const closeSearchModal = () => modalSearch.close();
btnCloseSearch.addEventListener('click', closeSearchModal);

formSearch.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = inputSearchPhone.value.replace(/\D/g, '');

  if (!phone) return;

  btnSubmitSearch.disabled = true;
  btnSubmitSearch.textContent = 'Buscando...';
  searchResultsList.classList.remove('hidden');
  searchResultsList.innerHTML = '<li class="skeleton-card slide-up-anim"></li>'.repeat(3);

  try {
    const q = query(
      collection(db, 'agendamentos'),
      where('clientPhone', '==', phone),
      limit(50)
    );

    const snapshot = await getDocs(q);

    searchResultsList.innerHTML = '';

    if (snapshot.empty) {
      searchResultsList.innerHTML = `<li class="empty-state-msg slide-up-anim">Nenhum agendamento encontrado para este número.</li>`;
      return;
    }

    // Ordenação em memória (JavaScript) para evitar a necessidade de Índice Composto no Firestore
    const results = [];
    snapshot.forEach(docSnap => results.push(docSnap.data()));
    
    results.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1; // Mais recente primeiro
      }
      return a.time < b.time ? 1 : -1;   // Mais recente primeiro
    });

    const template = document.getElementById('tpl-search-result');
    results.forEach(d => {
      const clone = template.content.cloneNode(true);
      
      const [year, month, day] = d.date.split('-');
      const dateObj = new Date(year, month - 1, day);

      clone.querySelector('.search-date').textContent = formatDatePTBR(dateObj);
      clone.querySelector('.search-time').textContent = d.time;
      clone.querySelector('.search-procedure').textContent = d.procedureName;
      clone.querySelector('.search-price').textContent = d.price ? `R$ ${Number(d.price).toFixed(2)}` : '--';
      
      searchResultsList.appendChild(clone);
    });

  } catch (error) {
    console.error('[index.js] Erro na busca de agendamentos:', error);
    showToast('Erro ao buscar agendamentos. Verifique sua conexão.', 'error');
    searchResultsList.innerHTML = `<li class="empty-state-msg slide-up-anim error-msg">Falha ao carregar dados.</li>`;
  } finally {
    btnSubmitSearch.disabled = false;
    btnSubmitSearch.textContent = 'Buscar';
  }
});
