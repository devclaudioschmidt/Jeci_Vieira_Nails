// ================================================
// config.js — Configuração do Firebase SDK v9+ (Modular)
// ================================================

import { initializeApp }        from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getFirestore }         from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { getAuth }              from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey:            'AIzaSyAhsb5B8LHJ_773OhM8DlnY30GEJUoJgxY',
  authDomain:        'jecivieira-1f829.firebaseapp.com',
  projectId:         'jecivieira-1f829',
  storageBucket:     'jecivieira-1f829.firebasestorage.app',
  messagingSenderId: '732890108537',
  appId:             '1:732890108537:web:6f9054a0364702abd8baa8',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
