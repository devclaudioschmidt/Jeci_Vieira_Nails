// ================================================
// index.js — Lógica da Tela Inicial (Role Cliente)
// ================================================
import { db }                         from '../firebase/config.js';
import { doc, getDoc }                from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { showToast }                  from '../global.js';

/**
 * Carrega as configurações do salão gravadas pelo Admin
 * e preenche os elementos da tela de boas-vindas.
 *
 * Documento Firestore esperado:
 *   /configuracoes/salao → { phone, address, notice }
 */
async function loadSalonInfo() {
  try {
    const docRef  = doc(db, 'configuracoes', 'salao');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const { phone, address, notice } = docSnap.data();

    const elPhone   = document.getElementById('salon-phone');
    const elAddress = document.getElementById('salon-address');
    const elNotice  = document.getElementById('salon-notice');

    if (elPhone)   elPhone.textContent   = phone   || '';
    if (elAddress) elAddress.textContent = address || '';
    if (elNotice)  elNotice.textContent  = notice  || '';

  } catch (err) {
    console.error('[index.js] Erro ao carregar dados do salão:', err);
    showToast('Não foi possível carregar as informações do salão.', 'error');
  }
}

// Ponto de entrada
loadSalonInfo();
