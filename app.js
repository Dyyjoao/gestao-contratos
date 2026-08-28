import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// ========================================
// FIREBASE
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyDhFhXmyg44MqDkMHxgwVJ4DxEW-qqiDkU",
  authDomain: "gestao-de-contratos-b266b.firebaseapp.com",
  projectId: "gestao-de-contratos-b266b",
  storageBucket: "gestao-de-contratos-b266b.firebasestorage.app",
  messagingSenderId: "1090500586579",
  appId: "1:1090500586579:web:90419b7abe37540eeeeaa6"

};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


// ========================================
// ELEMENTOS
// ========================================

const telaLogin =
  document.getElementById("telaLogin");

const sistema =
  document.getElementById("sistema");

const formLogin =
  document.getElementById("formLogin");

const email =
  document.getElementById("email");

const senha =
  document.getElementById("senha");

const mensagemLogin =
  document.getElementById("mensagemLogin");

const nomeUsuario =
  document.getElementById("nomeUsuario");

const btnSair =
  document.getElementById("btnSair");


// ========================================
// LOGIN
// ========================================

formLogin.addEventListener(
  "submit",
  async (evento) => {

    evento.preventDefault();

    mensagemLogin.textContent =
      "Entrando...";

    try {

      await signInWithEmailAndPassword(
        auth,
        email.value.trim(),
        senha.value
      );

      mensagemLogin.textContent = "";

      formLogin.reset();

    } catch (erro) {

      console.error(erro);

      mensagemLogin.textContent =
        "E-mail ou senha inválidos.";

    }

  }
);


// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

    } catch (erro) {

      console.error(erro);

    }

  }
);


// ========================================
// ESTADO DA AUTENTICAÇÃO
// ========================================

onAuthStateChanged(
  auth,
  (usuario) => {

    if (usuario) {

      telaLogin.classList.add("hidden");

      sistema.classList.remove("hidden");

      nomeUsuario.textContent =
        usuario.email;

    } else {

      sistema.classList.add("hidden");

      telaLogin.classList.remove("hidden");

      nomeUsuario.textContent = "";

    }

  }
);