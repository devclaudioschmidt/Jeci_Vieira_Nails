// ================================================
// config.js — Configuração do Firebase SDK v9+ (Modular)
// ================================================
// INSTRUÇÕES:
//   1. Acesse https://console.firebase.google.com
//   2. Crie um projeto e registre um Web App
//   3. Copie o objeto firebaseConfig gerado e substitua abaixo
//   4. Ative: Authentication (Email/Senha), Firestore e App Check

import { initializeApp }        from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getFirestore }         from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { getAuth }              from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

// ⚠️ Substitua pelos valores reais do seu projeto Firebase
const firebaseConfig = {
  apiKey:            'SUA_API_KEY',
  authDomain:        'SEU_PROJETO.firebaseapp.com',
  projectId:         'SEU_PROJETO_ID',
  storageBucket:     'SEU_PROJETO.appspot.com',
  messagingSenderId: 'SEU_SENDER_ID',
  appId:             'SEU_APP_ID',
};

// Inicialização (singleton)
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
