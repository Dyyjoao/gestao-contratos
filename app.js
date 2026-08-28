import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

  import {
  getFirestore,
  doc,
  getDoc
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


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
const db = getFirestore(app);

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
  async (usuario) => {

    if (!usuario) {

      sistema.classList.add("hidden");

      telaLogin.classList.remove("hidden");

      nomeUsuario.textContent = "";

      return;
    }


    try {

      const usuarioRef = doc(
        db,
        "usuarios",
        usuario.uid
      );


      const usuarioSnap =
        await getDoc(usuarioRef);


      // Usuário autenticou,
      // mas não existe no cadastro interno

      if (!usuarioSnap.exists()) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Usuário não autorizado a acessar o sistema.";

        return;
      }


      const dadosUsuario =
        usuarioSnap.data();


      // Usuário cadastrado, porém bloqueado

      if (dadosUsuario.ativo !== true) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Este usuário está desativado.";

        return;
      }


      // USUÁRIO AUTORIZADO

      telaLogin.classList.add("hidden");

      sistema.classList.remove("hidden");


      nomeUsuario.textContent =
        dadosUsuario.nome ||
        usuario.email;


    } catch (erro) {

      console.error(
        "Erro ao verificar usuário:",
        erro
      );


      await signOut(auth);


      mensagemLogin.textContent =
        "Não foi possível verificar sua autorização.";

    }

  }
);