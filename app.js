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
const menuAdministracao =
  document.getElementById("menuAdministracao");

const tituloPagina =
  document.getElementById("tituloPagina");

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

      menuAdministracao.classList.add("hidden");

      return;
    }


    try {

      // ========================================
      // BUSCA O USUÁRIO
      // ========================================

      const usuarioRef = doc(
        db,
        "usuarios",
        usuario.uid
      );

      const usuarioSnap =
        await getDoc(usuarioRef);


      if (!usuarioSnap.exists()) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Usuário não autorizado.";

        return;
      }


      const dadosUsuario =
        usuarioSnap.data();


      if (dadosUsuario.ativo !== true) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Este usuário está desativado.";

        return;
      }


      // ========================================
      // BUSCA O PERFIL DE ACESSO
      // ========================================

      const perfilRef = doc(
        db,
        "perfisAcesso",
        dadosUsuario.perfilId
      );

      const perfilSnap =
        await getDoc(perfilRef);


      if (!perfilSnap.exists()) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Perfil de acesso não encontrado.";

        return;
      }


      const dadosPerfil =
        perfilSnap.data();


      if (dadosPerfil.ativo !== true) {

        await signOut(auth);

        mensagemLogin.textContent =
          "Perfil de acesso desativado.";

        return;
      }


      // ========================================
      // LIBERA O SISTEMA
      // ========================================

      telaLogin.classList.add("hidden");

      sistema.classList.remove("hidden");

      nomeUsuario.textContent =
        dadosUsuario.nome ||
        usuario.email;


      // ========================================
      // PERMISSÃO ADMINISTRATIVA
      // ========================================

      if (dadosPerfil.acessoTotal === true) {

        menuAdministracao
          .classList.remove("hidden");

      } else {

        menuAdministracao
          .classList.add("hidden");

      }


    } catch (erro) {

      console.error(
        "Erro de autorização:",
        erro
      );

      await signOut(auth);

      mensagemLogin.textContent =
        "Erro ao verificar as permissões.";

    }

  }
);

// ========================================
// NAVEGAÇÃO DO SISTEMA
// ========================================

const itensMenu =
  document.querySelectorAll(".menu-item");

const paginas =
  document.querySelectorAll(".pagina");


itensMenu.forEach((item) => {

  item.addEventListener(
    "click",
    () => {

      const paginaSelecionada =
        item.dataset.pagina;


      paginas.forEach((pagina) => {

        pagina.classList.add("hidden");

      });


      itensMenu.forEach((botao) => {

        botao.classList.remove("ativo");

      });


      const pagina =
        document.getElementById(
          `pagina-${paginaSelecionada}`
        );


      if (pagina) {

        pagina.classList.remove("hidden");

      }


      item.classList.add("ativo");


      const titulos = {

        dashboard: "Dashboard",

        contratos: "Contratos",

        administracao: "Administração"

      };


      tituloPagina.textContent =
        titulos[paginaSelecionada] ||
        "Sistema Integrado";

    }

  );

});