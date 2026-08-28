import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// ========================================
// CONFIGURAÇÃO DO FIREBASE
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyDhFhXmyg44MqDkMHxgwVJ4DxEW-qqiDkU",
  authDomain: "gestao-de-contratos-b266b.firebaseapp.com",
  projectId: "gestao-de-contratos-b266b",
  storageBucket: "gestao-de-contratos-b266b.firebasestorage.app",
  messagingSenderId: "1090500586579",
  appId: "1:1090500586579:web:90419b7abe37540eeeeaa6"
};
  

};


// ========================================
// INICIALIZAÇÃO
// ========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const googleProvider =
  new GoogleAuthProvider();


// ========================================
// ELEMENTOS DA TELA
// ========================================

const telaLogin =
  document.getElementById("telaLogin");

const sistema =
  document.getElementById("sistema");

const btnGoogle =
  document.getElementById("btnGoogle");

const btnSair =
  document.getElementById("btnSair");

const nomeUsuario =
  document.getElementById("nomeUsuario");

const mensagemLogin =
  document.getElementById("mensagemLogin");


// ========================================
// LOGIN GOOGLE
// ========================================

btnGoogle.addEventListener("click", async () => {

  try {

    mensagemLogin.textContent =
      "Abrindo login do Google...";

    await signInWithPopup(
      auth,
      googleProvider
    );

  } catch (erro) {

    console.error(erro);

    mensagemLogin.textContent =
      "Não foi possível realizar o login.";

  }

});


// ========================================
// LOGOUT
// ========================================

btnSair.addEventListener("click", async () => {

  try {

    await signOut(auth);

  } catch (erro) {

    console.error(erro);

  }

});


// ========================================
// OBSERVA O USUÁRIO
// ========================================

onAuthStateChanged(auth, (usuario) => {

  if (usuario) {

    telaLogin.classList.add("hidden");

    sistema.classList.remove("hidden");

    nomeUsuario.textContent =
      usuario.displayName || usuario.email;

  } else {

    sistema.classList.add("hidden");

    telaLogin.classList.remove("hidden");

    nomeUsuario.textContent = "";

  }

});