import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";


import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";



// ========================================
// CONFIGURAÇÃO FIREBASE
// ========================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDhFhXmyg44MqDkMHxgwVJ4DxEW-qqiDkU",

  authDomain:
    "gestao-de-contratos-b266b.firebaseapp.com",

  projectId:
    "gestao-de-contratos-b266b",

  storageBucket:
    "gestao-de-contratos-b266b.firebasestorage.app",

  messagingSenderId:
    "1090500586579",

  appId:
    "1:1090500586579:web:90419b7abe37540eeeeaa6"

};



const app =
  initializeApp(firebaseConfig);


const auth =
  getAuth(app);


const db =
  getFirestore(app);



// ========================================
<<<<<<< HEAD
// CONTEXTO E CACHES
=======
// CONTEXTO DO USUÁRIO
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================

let dadosUsuarioAtual =
  null;


let dadosPerfilAtual =
  null;


<<<<<<< HEAD
let empresaParaExcluir =
  null;


let perfilEmEdicaoId =
  null;


let empresasCache =
  new Map();


let perfisCache =
  new Map();



=======
let empresaParaExcluir =
  null;


let empresasCache =
  new Map();



>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================
// DEFINIÇÃO DAS PERMISSÕES
// ========================================

const DEFINICAO_PERMISSOES = [

  {

    modulo:
      "dashboard",

    nome:
      "Dashboard",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      }

    ]

  },


  {

    modulo:
      "contratos",

    nome:
      "Contratos",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      },

      {
        id:
          "cadastrar",

        nome:
          "Cadastrar"
      },

      {
        id:
          "editar",

        nome:
          "Editar"
      },

      {
        id:
          "excluir",

        nome:
          "Excluir"
      },

      {
        id:
          "aprovar",

        nome:
          "Aprovar"
      }

    ]

  },


  {

    modulo:
      "empresas",

    nome:
      "Empresas",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      },

      {
        id:
          "cadastrar",

        nome:
          "Cadastrar"
      },

      {
        id:
          "editar",

        nome:
          "Editar"
      },

      {
        id:
          "inativar",

        nome:
          "Inativar"
      },

      {
        id:
          "excluir",

        nome:
          "Excluir"
      }

    ]

  },


  {

    modulo:
      "usuarios",

    nome:
      "Usuários",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      },

      {
        id:
          "cadastrar",

        nome:
          "Cadastrar"
      },

      {
        id:
          "editar",

        nome:
          "Editar"
      },

      {
        id:
          "inativar",

        nome:
          "Inativar"
      }

    ]

  },


  {

    modulo:
      "perfisAcesso",

    nome:
      "Perfis de Acesso",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      },

      {
        id:
          "cadastrar",

        nome:
          "Cadastrar"
      },

      {
        id:
          "editar",

        nome:
          "Editar"
      },

      {
        id:
          "inativar",

        nome:
          "Inativar"
      }

    ]

  },


  {

    modulo:
      "grupoEmpresarial",

    nome:
      "Grupo Empresarial",

    acoes: [

      {
        id:
          "visualizar",

        nome:
          "Visualizar"
      },

      {
        id:
          "editar",

        nome:
          "Editar"
      }

    ]

  }

];



// ========================================
// ELEMENTOS GERAIS
// ========================================

const telaLogin =
  document.getElementById(
    "telaLogin"
  );


const sistema =
  document.getElementById(
    "sistema"
  );


const formLogin =
  document.getElementById(
    "formLogin"
  );


const email =
  document.getElementById(
    "email"
  );


const senha =
  document.getElementById(
    "senha"
  );


const mensagemLogin =
  document.getElementById(
    "mensagemLogin"
  );


const nomeUsuario =
  document.getElementById(
    "nomeUsuario"
  );


const btnSair =
  document.getElementById(
    "btnSair"
  );


const menuDashboard =
  document.getElementById(
    "menuDashboard"
  );


const menuContratos =
  document.getElementById(
    "menuContratos"
  );


const menuAdministracao =
  document.getElementById(
    "menuAdministracao"
  );


const tituloPagina =
  document.getElementById(
    "tituloPagina"
  );


const itensMenu =
  document.querySelectorAll(
    ".menu-item"
  );


const paginas =
  document.querySelectorAll(
    ".pagina"
  );



// ========================================
// ADMINISTRAÇÃO
// ========================================

const cardEmpresas =
  document.getElementById(
    "cardEmpresas"
  );


const cardUsuarios =
  document.getElementById(
    "cardUsuarios"
  );


const cardPerfisAcesso =
  document.getElementById(
    "cardPerfisAcesso"
  );


const cardGrupoEmpresarial =
  document.getElementById(
    "cardGrupoEmpresarial"
  );



// ========================================
// EMPRESAS
// ========================================

const btnVoltarAdministracao =
  document.getElementById(
    "btnVoltarAdministracao"
  );


const btnMostrarNovaEmpresa =
  document.getElementById(
    "btnMostrarNovaEmpresa"
  );


const formNovaEmpresaContainer =
  document.getElementById(
    "formNovaEmpresaContainer"
  );


const formNovaEmpresa =
  document.getElementById(
    "formNovaEmpresa"
  );


const btnCancelarEmpresa =
  document.getElementById(
    "btnCancelarEmpresa"
  );


const empresaRazaoSocial =
  document.getElementById(
    "empresaRazaoSocial"
  );


const empresaNomeFantasia =
  document.getElementById(
    "empresaNomeFantasia"
  );


const empresaCnpj =
  document.getElementById(
    "empresaCnpj"
  );


const listaEmpresas =
  document.getElementById(
    "listaEmpresas"
  );


const quantidadeEmpresas =
  document.getElementById(
    "quantidadeEmpresas"
  );


const mensagemEmpresa =
  document.getElementById(
    "mensagemEmpresa"
  );



// ========================================
<<<<<<< HEAD
// EXCLUSÃO DE EMPRESA
=======
// MODAL - EXCLUSÃO DE EMPRESA
// ========================================

const modalExcluirEmpresa =
  document.getElementById(
    "modalExcluirEmpresa"
  );


const nomeEmpresaExcluir =
  document.getElementById(
    "nomeEmpresaExcluir"
  );


const formConfirmarExclusaoEmpresa =
  document.getElementById(
    "formConfirmarExclusaoEmpresa"
  );


const senhaExclusaoEmpresa =
  document.getElementById(
    "senhaExclusaoEmpresa"
  );


const mensagemExclusaoEmpresa =
  document.getElementById(
    "mensagemExclusaoEmpresa"
  );


const btnCancelarExclusaoEmpresa =
  document.getElementById(
    "btnCancelarExclusaoEmpresa"
  );



// ========================================
// ELEMENTOS - USUÁRIOS
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================

const modalExcluirEmpresa =
  document.getElementById(
    "modalExcluirEmpresa"
  );


const nomeEmpresaExcluir =
  document.getElementById(
    "nomeEmpresaExcluir"
  );


const formConfirmarExclusaoEmpresa =
  document.getElementById(
    "formConfirmarExclusaoEmpresa"
  );


const senhaExclusaoEmpresa =
  document.getElementById(
    "senhaExclusaoEmpresa"
  );


const mensagemExclusaoEmpresa =
  document.getElementById(
    "mensagemExclusaoEmpresa"
  );


const btnCancelarExclusaoEmpresa =
  document.getElementById(
    "btnCancelarExclusaoEmpresa"
  );



// ========================================
// USUÁRIOS
// ========================================

const btnVoltarUsuarios =
  document.getElementById(
    "btnVoltarUsuarios"
  );


const btnNovoUsuario =
  document.getElementById(
    "btnNovoUsuario"
  );


const avisoNovoUsuario =
  document.getElementById(
    "avisoNovoUsuario"
  );


const listaUsuarios =
  document.getElementById(
    "listaUsuarios"
  );


const quantidadeUsuarios =
  document.getElementById(
    "quantidadeUsuarios"
  );



// ========================================
<<<<<<< HEAD
// PERFIS
=======
// NAVEGAÇÃO
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================

<<<<<<< HEAD
const btnVoltarPerfis =
  document.getElementById(
    "btnVoltarPerfis"
  );
=======
const itensMenu =
  document.querySelectorAll(
    ".menu-item"
  );


const paginas =
  document.querySelectorAll(
    ".pagina"
  );



// ========================================
// SEGURANÇA DE TEXTO
// ========================================

function escaparHtml(valor) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


const btnNovoPerfil =
  document.getElementById(
    "btnNovoPerfil"
  );


const formPerfilContainer =
  document.getElementById(
    "formPerfilContainer"
  );


const formPerfil =
  document.getElementById(
    "formPerfil"
  );


const tituloFormPerfil =
  document.getElementById(
    "tituloFormPerfil"
  );


const perfilNome =
  document.getElementById(
    "perfilNome"
  );


const perfilDescricao =
  document.getElementById(
    "perfilDescricao"
  );


const gradePermissoesPerfil =
  document.getElementById(
    "gradePermissoesPerfil"
  );


const btnCancelarPerfil =
  document.getElementById(
    "btnCancelarPerfil"
  );


const btnSalvarPerfil =
  document.getElementById(
    "btnSalvarPerfil"
  );


const mensagemPerfil =
  document.getElementById(
    "mensagemPerfil"
  );


const listaPerfis =
  document.getElementById(
    "listaPerfis"
  );


const quantidadePerfis =
  document.getElementById(
    "quantidadePerfis"
  );



// ========================================
// UTILITÁRIOS
// ========================================

function escaparHtml(
  valor
) {

  if (
    valor === null ||
    valor === undefined
  ) {

    return "-";

  }


  return String(valor)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}



// ========================================
<<<<<<< HEAD
// PERMISSÕES DO USUÁRIO ATUAL
// ========================================

function temPermissao(
  modulo,
  acao = "visualizar"
) {

  if (
    dadosPerfilAtual?.acessoTotal ===
    true
  ) {

    return true;

  }


  return (

    dadosPerfilAtual
      ?.permissoes
      ?.[modulo]
      ?.[acao] ===
    true

  );

}



function temAlgumAcessoAdministrativo() {

  return (

    dadosPerfilAtual?.acessoTotal ===
      true ||

    temPermissao(
      "empresas"
    ) ||

    temPermissao(
      "usuarios"
    ) ||

    temPermissao(
      "perfisAcesso"
    ) ||

    temPermissao(
      "grupoEmpresarial"
    )

  );

}



function configurarInterfacePorPermissoes() {

  menuDashboard
    .classList.toggle(

      "hidden",

      !temPermissao(
        "dashboard"
      )

    );


  menuContratos
    .classList.toggle(

      "hidden",

      !temPermissao(
        "contratos"
      )

    );


  menuAdministracao
    .classList.toggle(

      "hidden",

      !temAlgumAcessoAdministrativo()

    );


  cardEmpresas
    .classList.toggle(

      "hidden",

      !temPermissao(
        "empresas"
      )

    );


  cardUsuarios
    .classList.toggle(

      "hidden",

      !temPermissao(
        "usuarios"
      )

    );


  cardPerfisAcesso
    .classList.toggle(

      "hidden",

      !temPermissao(
        "perfisAcesso"
      )

    );


  cardGrupoEmpresarial
    .classList.toggle(

      "hidden",

      !temPermissao(
        "grupoEmpresarial"
      )

    );

}



function primeiraPaginaPermitida() {

  if (
    temPermissao(
      "dashboard"
    )
  ) {

    return "dashboard";

  }


  if (
    temPermissao(
      "contratos"
    )
  ) {

    return "contratos";

  }


  if (
    temAlgumAcessoAdministrativo()
  ) {

    return "administracao";

  }


  return "dashboard";

}



// ========================================
// NAVEGAÇÃO
// ========================================

function abrirPagina(
  nomePagina
) {

  paginas.forEach(
    (pagina) => {

      pagina
        .classList.add(
          "hidden"
        );

    }
  );


  const pagina =
    document.getElementById(
      `pagina-${nomePagina}`
    );


  if (pagina) {

    pagina
      .classList.remove(
        "hidden"
      );

  }


  itensMenu.forEach(
    (item) => {

      item
        .classList.remove(
          "ativo"
        );

    }
  );


  const paginaAdministrativa =

    [
      "administracao",
      "empresas",
      "usuarios",
      "perfis"
    ]

      .includes(
        nomePagina
      );


  const itemMenuAtivo =

    paginaAdministrativa

      ? menuAdministracao

      : document.querySelector(

          `.menu-item[data-pagina="${nomePagina}"]`

        );


  if (

    itemMenuAtivo &&

    !itemMenuAtivo
      .classList
      .contains(
        "hidden"
      )

  ) {

    itemMenuAtivo
      .classList.add(
        "ativo"
      );

  }


  const titulos = {

    dashboard:
      "Dashboard",

    contratos:
      "Contratos",

    administracao:
      "Administração",

    empresas:
      "Empresas",

    usuarios:
      "Usuários",

    perfis:
      "Perfis de Acesso"

  };


  tituloPagina.textContent =

    titulos[
      nomePagina
    ] ||

    "Sistema Integrado";

}



// ========================================
=======
// ABRIR PÁGINA
// ========================================

function abrirPagina(
  nomePagina
) {


  paginas.forEach(
    (pagina) => {

      pagina.classList.add(
        "hidden"
      );

    }
  );


  const pagina =
    document.getElementById(
      `pagina-${nomePagina}`
    );


  if (pagina) {

    pagina.classList.remove(
      "hidden"
    );

  }


  itensMenu.forEach(
    (item) => {

      item.classList.remove(
        "ativo"
      );

    }
  );


  const paginaAdministrativa =

    nomePagina ===
      "administracao" ||

    nomePagina ===
      "empresas" ||

    nomePagina ===
      "usuarios";


  let itemMenuAtivo;


  if (
    paginaAdministrativa
  ) {

    itemMenuAtivo =
      menuAdministracao;

  } else {

    itemMenuAtivo =
      document.querySelector(
        `.menu-item[data-pagina="${nomePagina}"]`
      );

  }


  if (itemMenuAtivo) {

    itemMenuAtivo
      .classList.add(
        "ativo"
      );

  }


  const titulos = {

    dashboard:
      "Dashboard",

    contratos:
      "Contratos",

    administracao:
      "Administração",

    empresas:
      "Empresas",

    usuarios:
      "Usuários"

  };


  tituloPagina.textContent =

    titulos[nomePagina] ||

    "Sistema Integrado";

}



// ========================================
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
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


      mensagemLogin.textContent =
        "";


      formLogin.reset();


    } catch (erro) {


      console.error(
        "Erro no login:",
        erro
      );


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

<<<<<<< HEAD
      await signOut(
        auth
      );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      await signOut(
        auth
      );


    } catch (erro) {


      console.error(
        "Erro ao sair:",
        erro
      );


    }

  }
);



// ========================================
// AUTENTICAÇÃO / AUTORIZAÇÃO
// ========================================

onAuthStateChanged(
  auth,
  async (usuario) => {


    if (!usuario) {

<<<<<<< HEAD
      dadosUsuarioAtual =
        null;
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      dadosUsuarioAtual =
        null;

<<<<<<< HEAD
      dadosPerfilAtual =
        null;
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      dadosPerfilAtual =
        null;

<<<<<<< HEAD
      empresaParaExcluir =
        null;
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      empresaParaExcluir =
        null;

<<<<<<< HEAD
      perfilEmEdicaoId =
        null;
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      sistema
        .classList.add(
          "hidden"
        );

<<<<<<< HEAD
      sistema
        .classList.add(
          "hidden"
        );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      telaLogin
        .classList.remove(
          "hidden"
        );

<<<<<<< HEAD
      telaLogin
        .classList.remove(
          "hidden"
        );


      menuAdministracao
        .classList.add(
          "hidden"
        );


      nomeUsuario.textContent =
        "";


=======

      menuAdministracao
        .classList.add(
          "hidden"
        );


      nomeUsuario.textContent =
        "";


>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
      return;

    }


    try {

<<<<<<< HEAD
      const usuarioSnap =
        await getDoc(
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

          doc(
            db,
            "usuarios",
            usuario.uid
          )

        );


<<<<<<< HEAD
      if (
        !usuarioSnap.exists()
      ) {
=======
      const usuarioSnap =
        await getDoc(
          usuarioRef
        );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        await signOut(
          auth
        );

<<<<<<< HEAD
=======
      if (
        !usuarioSnap.exists()
      ) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
=======

        await signOut(
          auth
        );


>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        mensagemLogin.textContent =
          "Usuário não autorizado.";


        return;

      }


      const dadosUsuario =
        usuarioSnap.data();


      if (
        dadosUsuario.ativo !==
        true
      ) {

<<<<<<< HEAD
        await signOut(
          auth
        );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        await signOut(
          auth
        );


        mensagemLogin.textContent =
          "Este usuário está desativado.";


        return;

      }


<<<<<<< HEAD
      const perfilSnap =
        await getDoc(

          doc(
            db,
            "perfisAcesso",
            dadosUsuario.perfilId
          )

=======
      const perfilRef =
        doc(
          db,
          "perfisAcesso",
          dadosUsuario.perfilId
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        );


<<<<<<< HEAD
      if (
        !perfilSnap.exists()
      ) {
=======
      const perfilSnap =
        await getDoc(
          perfilRef
        );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        await signOut(
          auth
        );

<<<<<<< HEAD
=======
      if (
        !perfilSnap.exists()
      ) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
=======

        await signOut(
          auth
        );


>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        mensagemLogin.textContent =
          "Perfil de acesso não encontrado.";


        return;

      }


      const dadosPerfil =
        perfilSnap.data();


      if (
        dadosPerfil.ativo !==
        true
      ) {

<<<<<<< HEAD
        await signOut(
          auth
        );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        await signOut(
          auth
        );


        mensagemLogin.textContent =
          "Perfil de acesso desativado.";


        return;

      }


      dadosUsuarioAtual =
        dadosUsuario;


      dadosPerfilAtual =
        dadosPerfil;


      telaLogin
        .classList.add(
          "hidden"
        );


      sistema
        .classList.remove(
          "hidden"
        );


      nomeUsuario.textContent =

        dadosUsuario.nome ||

        usuario.email;


<<<<<<< HEAD
      configurarInterfacePorPermissoes();

=======
      if (
        dadosPerfil.acessoTotal ===
        true
      ) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      gerarGradePermissoes();
=======

        menuAdministracao
          .classList.remove(
            "hidden"
          );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
=======

      } else {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
=======

        menuAdministracao
          .classList.add(
            "hidden"
          );


      }


>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
      abrirPagina(
        primeiraPaginaPermitida()
      );


    } catch (erro) {


      console.error(
        "Erro de autorização:",
        erro
      );


      await signOut(
        auth
      );


      mensagemLogin.textContent =
        "Erro ao verificar as permissões.";


    }

  }
);



// ========================================
// MENU PRINCIPAL
// ========================================

itensMenu.forEach(
  (item) => {


    item.addEventListener(
      "click",
      () => {

<<<<<<< HEAD
        if (
          item
            .classList
            .contains(
              "hidden"
            )
        ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
          return;

        }


=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        abrirPagina(
          item.dataset.pagina
        );


      }
    );


  }
);



// ========================================
// EMPRESAS - NAVEGAÇÃO
// ========================================

cardEmpresas.addEventListener(
  "click",
  async () => {

<<<<<<< HEAD
    if (
      !temPermissao(
        "empresas"
      )
    ) {

      return;

    }


=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
    abrirPagina(
      "empresas"
    );


    await carregarEmpresas();


  }
);



btnVoltarAdministracao
  .addEventListener(
    "click",
    () => {

<<<<<<< HEAD
      abrirPagina(
        "administracao"
      );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    }
  );
=======
      abrirPagina(
        "administracao"
      );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


    }
  );

<<<<<<< HEAD
btnMostrarNovaEmpresa
  .addEventListener(
    "click",
    () => {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      mensagemEmpresa.textContent =
        "";
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

btnMostrarNovaEmpresa
  .addEventListener(
    "click",
    () => {

<<<<<<< HEAD
      formNovaEmpresaContainer
        .classList.remove(
          "hidden"
        );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      mensagemEmpresa.textContent =
        "";

<<<<<<< HEAD
      empresaRazaoSocial
        .focus();
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    }
  );
=======
      formNovaEmpresaContainer
        .classList.remove(
          "hidden"
        );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


      empresaRazaoSocial
        .focus();

<<<<<<< HEAD
btnCancelarEmpresa
  .addEventListener(
    "click",
    () => {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      formNovaEmpresa.reset();
=======
    }
  );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


<<<<<<< HEAD
      mensagemEmpresa.textContent =
        "";
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

btnCancelarEmpresa
  .addEventListener(
    "click",
    () => {

<<<<<<< HEAD
      formNovaEmpresaContainer
        .classList.add(
          "hidden"
        );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    }
  );
=======
      formNovaEmpresa.reset();
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


      mensagemEmpresa.textContent =
        "";


      formNovaEmpresaContainer
        .classList.add(
          "hidden"
        );


    }
  );



// ========================================
<<<<<<< HEAD
// MÁSCARA CNPJ
=======
// MÁSCARA DE CNPJ
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================

empresaCnpj.addEventListener(
  "input",
  () => {


    let valor =
<<<<<<< HEAD
=======
      empresaCnpj.value
        .replace(
          /\D/g,
          ""
        );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

      empresaCnpj.value

        .replace(
          /\D/g,
          ""
        )

        .substring(
          0,
          14
        );

<<<<<<< HEAD
=======
    if (
      valor.length > 12
    ) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    if (
      valor.length > 12
    ) {

=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/,

          "$1.$2.$3/$4-$5"

        );

<<<<<<< HEAD
    } else if (
      valor.length > 8
    ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

    } else if (
      valor.length > 8
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/,

          "$1.$2.$3/$4"

        );

<<<<<<< HEAD
    } else if (
      valor.length > 5
    ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

    } else if (
      valor.length > 5
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{0,3}).*/,

          "$1.$2.$3"

        );

<<<<<<< HEAD
    } else if (
      valor.length > 2
    ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

    } else if (
      valor.length > 2
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{0,3}).*/,

          "$1.$2"

        );


    }


    empresaCnpj.value =
      valor;


  }
);



// ========================================
// CARREGAR EMPRESAS
// ========================================

async function carregarEmpresas() {


  listaEmpresas.innerHTML = `

    <tr>
<<<<<<< HEAD

      <td colspan="5">
=======

      <td colspan="5">

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        Carregando empresas...

      </td>

    </tr>

  `;


  quantidadeEmpresas.textContent =
    "Carregando...";


  empresasCache =
    new Map();


  try {


    const empresasSnap =
      await getDocs(

        collection(
          db,
          "empresas"
        )

      );


    listaEmpresas.innerHTML =
      "";


    let quantidade =
      0;


    empresasSnap.forEach(
      (documento) => {


        const empresa =
          documento.data();


        if (

          dadosUsuarioAtual?.grupoId &&

          empresa.grupoId !==
            dadosUsuarioAtual.grupoId

        ) {


          return;


        }


        quantidade++;


        empresasCache.set(
          documento.id,
          empresa
        );


        const linha =
          document.createElement(
            "tr"
          );


        linha.innerHTML = `

          <td>
<<<<<<< HEAD
            ${escaparHtml(
              empresa.razaoSocial
            )}
=======

            ${
              escaparHtml(
                empresa.razaoSocial
              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>
<<<<<<< HEAD
            ${escaparHtml(
              empresa.nomeFantasia
            )}
=======

            ${
              escaparHtml(
                empresa.nomeFantasia
              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>
<<<<<<< HEAD
            ${escaparHtml(
              empresa.cnpj
            )}
=======

            ${
              escaparHtml(
                empresa.cnpj
              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>

            <span

              class="${
                empresa.ativo === true
                  ? "status-ativo"
                  : "status-inativo"
              }"

            >

              ${
                empresa.ativo === true
                  ? "Ativa"
                  : "Inativa"
              }

            </span>

          </td>

<<<<<<< HEAD
          <td>

            <div class="acoes-tabela">

              <button
                class="btn-acao-empresa btn-status-empresa"
                data-id="${documento.id}"
                data-ativo="${empresa.ativo === true}"
                type="button"
              >
                ${
                  empresa.ativo === true
                    ? "Inativar"
                    : "Reativar"
                }
              </button>


              <button
                class="btn-acao-empresa btn-excluir-empresa"
                data-id="${documento.id}"
                type="button"
              >
                Excluir
              </button>

            </div>

          </td>

=======

          <td>

            <div class="acoes-tabela">


              <button

                class="
                  btn-acao-empresa
                  btn-status-empresa
                "

                data-id="${
                  documento.id
                }"

                data-ativo="${
                  empresa.ativo === true
                }"

                type="button"

              >

                ${
                  empresa.ativo === true
                    ? "Inativar"
                    : "Reativar"
                }

              </button>


              <button

                class="
                  btn-acao-empresa
                  btn-excluir-empresa
                "

                data-id="${
                  documento.id
                }"

                type="button"

              >

                Excluir

              </button>


            </div>

          </td>

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        `;


        listaEmpresas
          .appendChild(
            linha
          );


      }
    );


<<<<<<< HEAD
    quantidadeEmpresas.textContent =

      `${quantidade} empresa(s) cadastrada(s)`;
=======
    quantidadeEmpresas
      .textContent =
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        `${quantidade} empresa(s) cadastrada(s)`;

<<<<<<< HEAD
    if (
      quantidade === 0
    ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

    if (
      quantidade === 0
    ) {


      listaEmpresas.innerHTML = `

        <tr>

<<<<<<< HEAD
          <td colspan="5">
=======
          <td colspan="5">

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
            Nenhuma empresa cadastrada.

          </td>

        </tr>

      `;


    }


    configurarAcoesEmpresas();


  } catch (erro) {


    console.error(
      "Erro ao carregar empresas:",
      erro
    );


    listaEmpresas.innerHTML = `

      <tr>

<<<<<<< HEAD
        <td colspan="5">
          Não foi possível carregar as empresas.
=======
        <td colspan="5">

          Não foi possível carregar
          as empresas.

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
        </td>

      </tr>

    `;


  }

}



// ========================================
// CADASTRAR EMPRESA
// ========================================

formNovaEmpresa.addEventListener(
  "submit",
  async (evento) => {


    evento.preventDefault();


    mensagemEmpresa.textContent =
      "";


    const cnpjSomenteNumeros =

<<<<<<< HEAD
      empresaCnpj.value
=======
      empresaCnpj.value
        .replace(
          /\D/g,
          ""
        );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
        .replace(
          /\D/g,
          ""
        );


=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
    if (
      cnpjSomenteNumeros.length !==
      14
    ) {


      mensagemEmpresa.textContent =
        "Informe um CNPJ com 14 dígitos.";


      empresaCnpj.focus();


      return;


    }


    if (
      !dadosUsuarioAtual?.grupoId
    ) {


      mensagemEmpresa.textContent =

        "O usuário não está vinculado a um grupo empresarial.";


      return;


    }


    mensagemEmpresa.textContent =
      "Salvando empresa...";


    try {

<<<<<<< HEAD
=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
      const empresasSnap =
        await getDocs(

          collection(
            db,
            "empresas"
          )

        );


      let cnpjDuplicado =
        false;


      empresasSnap.forEach(
        (documento) => {


          const empresa =
            documento.data();


          const cnpjExistente =

            String(
<<<<<<< HEAD
              empresa.cnpj ||
              ""
            )
=======
              empresa.cnpj || ""
            )
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

              .replace(
                /\D/g,
                ""
              );


          if (
            cnpjExistente ===
            cnpjSomenteNumeros
          ) {


            cnpjDuplicado =
              true;


          }


        }
      );


      if (
        cnpjDuplicado
      ) {


        mensagemEmpresa.textContent =

          "Já existe uma empresa cadastrada com este CNPJ.";


        return;


      }


      await addDoc(

        collection(
          db,
          "empresas"
        ),

        {


          razaoSocial:

            empresaRazaoSocial
              .value
              .trim(),


          nomeFantasia:

            empresaNomeFantasia
              .value
              .trim(),


          cnpj:

            empresaCnpj
              .value
              .trim(),


          grupoId:
<<<<<<< HEAD
            dadosUsuarioAtual
              .grupoId,
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

            dadosUsuarioAtual
              .grupoId,


          ativo:
            true,


          criadoEm:
            serverTimestamp()


        }

      );


      mensagemEmpresa.textContent =
        "Empresa cadastrada com sucesso.";


      formNovaEmpresa.reset();


      await carregarEmpresas();


      setTimeout(
        () => {


          formNovaEmpresaContainer
            .classList.add(
              "hidden"
            );


          mensagemEmpresa.textContent =
            "";


        },
        1000
      );


    } catch (erro) {


      console.error(
        "Erro ao cadastrar empresa:",
        erro
      );


      mensagemEmpresa.textContent =
        "Não foi possível cadastrar a empresa.";


    }

  }
);



// ========================================
<<<<<<< HEAD
// EMPRESAS - AÇÕES
=======
// AÇÕES DAS EMPRESAS
// ========================================

function configurarAcoesEmpresas() {


  const botoesStatus =

    document.querySelectorAll(
      ".btn-status-empresa"
    );


  const botoesExcluir =

    document.querySelectorAll(
      ".btn-excluir-empresa"
    );



  botoesStatus.forEach(
    (botao) => {


      botao.addEventListener(
        "click",
        async () => {


          const empresaId =
            botao.dataset.id;


          const estaAtiva =

            botao.dataset.ativo ===
            "true";


          const empresa =
            empresasCache.get(
              empresaId
            );


          const acao =

            estaAtiva
              ? "inativar"
              : "reativar";


          const confirmar =

            window.confirm(

              `Deseja ${acao} a empresa ${
                empresa?.nomeFantasia ||
                empresa?.razaoSocial ||
                "selecionada"
              }?`

            );


          if (
            !confirmar
          ) {


            return;


          }


          try {


            await updateDoc(

              doc(
                db,
                "empresas",
                empresaId
              ),

              {


                ativo:
                  !estaAtiva,


                atualizadoEm:
                  serverTimestamp()


              }

            );


            await carregarEmpresas();


          } catch (erro) {


            console.error(
              "Erro ao alterar empresa:",
              erro
            );


            alert(

              "Não foi possível alterar o status da empresa."

            );


          }


        }
      );


    }
  );



  botoesExcluir.forEach(
    (botao) => {


      botao.addEventListener(
        "click",
        async () => {


          const empresaId =
            botao.dataset.id;


          await prepararExclusaoEmpresa(
            empresaId
          );


        }
      );


    }
  );

}



// ========================================
// VERIFICA VÍNCULOS DA EMPRESA
// ========================================

async function empresaPossuiVinculos(
  empresaId
) {


  /*
    NESTA FASE:

    Já existe a coleção USUÁRIOS.

    Conforme criarmos:
    - contratos
    - frota
    - almoxarifado
    - cotações
    - controladoria
    - budget
    - forecast

    eles entrarão também nesta verificação.
  */


  const usuariosSnap =
    await getDocs(

      collection(
        db,
        "usuarios"
      )

    );


  let possuiVinculo =
    false;


  usuariosSnap.forEach(
    (documento) => {


      const usuario =
        documento.data();


      if (
        usuario.empresaId ===
        empresaId
      ) {


        possuiVinculo =
          true;


      }


      if (

        Array.isArray(
          usuario.empresasAcesso
        ) &&

        usuario.empresasAcesso
          .includes(
            empresaId
          )

      ) {


        possuiVinculo =
          true;


      }


    }
  );


  return possuiVinculo;

}



// ========================================
// PREPARAR EXCLUSÃO
// ========================================

async function prepararExclusaoEmpresa(
  empresaId
) {


  if (
    dadosPerfilAtual?.acessoTotal !==
    true
  ) {


    alert(

      "Somente administradores podem excluir empresas."

    );


    return;


  }


  try {


    const possuiVinculo =

      await empresaPossuiVinculos(
        empresaId
      );


    if (
      possuiVinculo
    ) {


      alert(

        "Esta empresa possui informações vinculadas e não pode ser excluída permanentemente. Use a opção Inativar para preservar o histórico."

      );


      return;


    }


    const empresa =
      empresasCache.get(
        empresaId
      );


    empresaParaExcluir = {

      id:
        empresaId,

      nome:

        empresa?.nomeFantasia ||

        empresa?.razaoSocial ||

        "Empresa selecionada"

    };


    nomeEmpresaExcluir.textContent =
      empresaParaExcluir.nome;


    senhaExclusaoEmpresa.value =
      "";


    mensagemExclusaoEmpresa.textContent =
      "";


    modalExcluirEmpresa
      .classList.remove(
        "hidden"
      );


    setTimeout(
      () => {


        senhaExclusaoEmpresa
          .focus();


      },
      50
    );


  } catch (erro) {


    console.error(
      "Erro ao verificar vínculos da empresa:",
      erro
    );


    alert(

      "Não foi possível verificar se a empresa possui vínculos."

    );


  }

}



// ========================================
// FECHAR MODAL
// ========================================

function fecharModalExclusaoEmpresa() {


  empresaParaExcluir =
    null;


  formConfirmarExclusaoEmpresa
    .reset();


  mensagemExclusaoEmpresa.textContent =
    "";


  modalExcluirEmpresa
    .classList.add(
      "hidden"
    );

}



btnCancelarExclusaoEmpresa
  .addEventListener(
    "click",
    () => {


      fecharModalExclusaoEmpresa();


    }
  );



modalExcluirEmpresa
  .addEventListener(
    "click",
    (evento) => {


      if (
        evento.target ===
        modalExcluirEmpresa
      ) {


        fecharModalExclusaoEmpresa();


      }


    }
  );



// ========================================
// CONFIRMAR EXCLUSÃO
// ========================================

formConfirmarExclusaoEmpresa
  .addEventListener(
    "submit",
    async (evento) => {


      evento.preventDefault();


      if (

        !empresaParaExcluir ||

        !auth.currentUser

      ) {


        mensagemExclusaoEmpresa
          .textContent =

            "Não foi possível identificar a operação.";


        return;


      }


      const senhaInformada =
        senhaExclusaoEmpresa.value;


      if (
        !senhaInformada
      ) {


        mensagemExclusaoEmpresa
          .textContent =

            "Informe sua senha.";


        return;


      }


      mensagemExclusaoEmpresa
        .textContent =

          "Confirmando administrador...";


      try {


        /*
          Fazemos uma SEGUNDA verificação
          de vínculo imediatamente antes
          de excluir.
        */

        const possuiVinculo =

          await empresaPossuiVinculos(
            empresaParaExcluir.id
          );


        if (
          possuiVinculo
        ) {


          mensagemExclusaoEmpresa
            .textContent =

              "A empresa passou a possuir vínculo e não pode mais ser excluída.";


          return;


        }


        /*
          Reautenticação real no
          Firebase Authentication.
        */

        const credential =

          EmailAuthProvider
            .credential(

              auth.currentUser.email,

              senhaInformada

            );


        await reauthenticateWithCredential(

          auth.currentUser,

          credential

        );


        /*
          Só depois da reautenticação
          o documento é apagado.
        */

        await deleteDoc(

          doc(

            db,

            "empresas",

            empresaParaExcluir.id

          )

        );


        fecharModalExclusaoEmpresa();


        await carregarEmpresas();


        alert(

          "Empresa excluída permanentemente."

        );


      } catch (erro) {


        console.error(
          "Erro ao excluir empresa:",
          erro
        );


        if (

          erro.code ===
            "auth/invalid-credential" ||

          erro.code ===
            "auth/wrong-password"

        ) {


          mensagemExclusaoEmpresa
            .textContent =

              "Senha incorreta.";


          senhaExclusaoEmpresa
            .select();


          return;


        }


        mensagemExclusaoEmpresa
          .textContent =

            "Não foi possível concluir a exclusão.";


      }


    }
  );



// ========================================
// USUÁRIOS - NAVEGAÇÃO
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
// ========================================

function configurarAcoesEmpresas() {

  document
    .querySelectorAll(
      ".btn-status-empresa"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          async () => {

            const empresaId =
              botao.dataset.id;


            const estaAtiva =

              botao.dataset.ativo ===
              "true";


            const empresa =
              empresasCache.get(
                empresaId
              );


            const acao =

              estaAtiva

                ? "inativar"

                : "reativar";


            const confirmar =
              window.confirm(

                `Deseja ${acao} a empresa ${
                  empresa?.nomeFantasia ||
                  empresa?.razaoSocial ||
                  "selecionada"
                }?`

              );


            if (
              !confirmar
            ) {

              return;

            }


            try {

              await updateDoc(

                doc(
                  db,
                  "empresas",
                  empresaId
                ),

                {

                  ativo:
                    !estaAtiva,

                  atualizadoEm:
                    serverTimestamp()

                }

              );


              await carregarEmpresas();


            } catch (erro) {

              console.error(
                "Erro ao alterar empresa:",
                erro
              );


              alert(
                "Não foi possível alterar o status da empresa."
              );

            }

          }
        );

      }
    );



  document
    .querySelectorAll(
      ".btn-excluir-empresa"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          async () => {

            await prepararExclusaoEmpresa(
              botao.dataset.id
            );

          }
        );

      }
    );

}



// ========================================
// VÍNCULOS DA EMPRESA
// ========================================

async function empresaPossuiVinculos(
  empresaId
) {

  const usuariosSnap =
    await getDocs(

      collection(
        db,
        "usuarios"
      )

    );


  let possuiVinculo =
    false;


  usuariosSnap.forEach(
    (documento) => {

      const usuario =
        documento.data();


      if (
        usuario.empresaId ===
        empresaId
      ) {

        possuiVinculo =
          true;

      }


      if (

        Array.isArray(
          usuario.empresasAcesso
        ) &&

        usuario.empresasAcesso
          .includes(
            empresaId
          )

      ) {

        possuiVinculo =
          true;

      }

    }
  );


  return possuiVinculo;

}



// ========================================
// EXCLUSÃO DE EMPRESA
// ========================================

async function prepararExclusaoEmpresa(
  empresaId
) {

  if (
    dadosPerfilAtual?.acessoTotal !==
    true
  ) {

    alert(
      "Somente administradores podem excluir empresas."
    );


    return;

  }


  try {

    const possuiVinculo =

      await empresaPossuiVinculos(
        empresaId
      );


    if (
      possuiVinculo
    ) {

      alert(

        "Esta empresa possui informações vinculadas e não pode ser excluída permanentemente. Use a opção Inativar para preservar o histórico."

      );


      return;

    }


    const empresa =
      empresasCache.get(
        empresaId
      );


    empresaParaExcluir = {

      id:
        empresaId,

      nome:

        empresa?.nomeFantasia ||

        empresa?.razaoSocial ||

        "Empresa selecionada"

    };


    nomeEmpresaExcluir.textContent =
      empresaParaExcluir.nome;


    senhaExclusaoEmpresa.value =
      "";


    mensagemExclusaoEmpresa.textContent =
      "";


    modalExcluirEmpresa
      .classList.remove(
        "hidden"
      );


    setTimeout(
      () => {

        senhaExclusaoEmpresa
          .focus();

      },
      50
    );


  } catch (erro) {

    console.error(
      "Erro ao verificar vínculos da empresa:",
      erro
    );


    alert(
      "Não foi possível verificar se a empresa possui vínculos."
    );

  }

}



function fecharModalExclusaoEmpresa() {

  empresaParaExcluir =
    null;


  formConfirmarExclusaoEmpresa
    .reset();


  mensagemExclusaoEmpresa.textContent =
    "";


  modalExcluirEmpresa
    .classList.add(
      "hidden"
    );

}



btnCancelarExclusaoEmpresa
  .addEventListener(
    "click",
    fecharModalExclusaoEmpresa
  );



modalExcluirEmpresa
  .addEventListener(
    "click",
    (evento) => {

      if (
        evento.target ===
        modalExcluirEmpresa
      ) {

        fecharModalExclusaoEmpresa();

      }

    }
  );



formConfirmarExclusaoEmpresa
  .addEventListener(
    "submit",
    async (evento) => {

      evento.preventDefault();


      if (

        !empresaParaExcluir ||

        !auth.currentUser

      ) {

        mensagemExclusaoEmpresa.textContent =
          "Não foi possível identificar a operação.";


        return;

      }


      const senhaInformada =
        senhaExclusaoEmpresa.value;


      if (
        !senhaInformada
      ) {

        mensagemExclusaoEmpresa.textContent =
          "Informe sua senha.";


        return;

      }


      mensagemExclusaoEmpresa.textContent =
        "Confirmando administrador...";


      try {

        const possuiVinculo =

          await empresaPossuiVinculos(
            empresaParaExcluir.id
          );


        if (
          possuiVinculo
        ) {

          mensagemExclusaoEmpresa.textContent =
            "A empresa passou a possuir vínculo e não pode mais ser excluída.";


          return;

        }


        const credential =

          EmailAuthProvider
            .credential(

              auth.currentUser.email,

              senhaInformada

            );


        await reauthenticateWithCredential(

          auth.currentUser,

          credential

        );


        await deleteDoc(

          doc(
            db,
            "empresas",
            empresaParaExcluir.id
          )

        );


        fecharModalExclusaoEmpresa();


        await carregarEmpresas();


        alert(
          "Empresa excluída permanentemente."
        );


      } catch (erro) {

        console.error(
          "Erro ao excluir empresa:",
          erro
        );


        if (

          erro.code ===
            "auth/invalid-credential" ||

          erro.code ===
            "auth/wrong-password"

        ) {

          mensagemExclusaoEmpresa.textContent =
            "Senha incorreta.";


          senhaExclusaoEmpresa.select();


          return;

        }


        mensagemExclusaoEmpresa.textContent =
          "Não foi possível concluir a exclusão.";

      }

    }
  );



// ========================================
// USUÁRIOS
// ========================================

cardUsuarios.addEventListener(
  "click",
  async () => {

<<<<<<< HEAD
    if (
      !temPermissao(
        "usuarios"
      )
    ) {

      return;

    }


=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
    abrirPagina(
      "usuarios"
    );


    await carregarUsuarios();


  }
);



btnVoltarUsuarios
  .addEventListener(
    "click",
    () => {

<<<<<<< HEAD
      abrirPagina(
        "administracao"
      );
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    }
  );
=======
      abrirPagina(
        "administracao"
      );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


    }
  );

<<<<<<< HEAD
btnNovoUsuario
  .addEventListener(
    "click",
    () => {
=======


btnNovoUsuario.addEventListener(
  "click",
  () => {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      avisoNovoUsuario
        .classList.toggle(
          "hidden"
        );
=======

    avisoNovoUsuario
      .classList.toggle(
        "hidden"
      );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
    }
  );
=======

  }
);
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee



// ========================================
// CARREGAR USUÁRIOS
// ========================================

async function carregarUsuarios() {


  listaUsuarios.innerHTML = `

    <tr>

      <td colspan="6">

        Carregando usuários...

      </td>

    </tr>

  `;


  quantidadeUsuarios.textContent =
    "Carregando...";


  try {

<<<<<<< HEAD
=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
    const empresasSnap =
      await getDocs(

        collection(
          db,
          "empresas"
        )

      );


    const empresas =
      {};


    empresasSnap.forEach(
      (documento) => {


        const dados =
          documento.data();


        empresas[
          documento.id
        ] =

          dados.nomeFantasia ||

          dados.razaoSocial ||

          documento.id;


      }
    );


    const perfisSnap =
      await getDocs(

        collection(
          db,
          "perfisAcesso"
        )

      );


    const perfis =
      {};


    perfisSnap.forEach(
      (documento) => {


        const dados =
          documento.data();


        perfis[
          documento.id
        ] =

          dados.nome ||

          documento.id;


      }
    );


    const usuariosSnap =
      await getDocs(

        collection(
          db,
          "usuarios"
        )

      );


    listaUsuarios.innerHTML =
      "";


    let quantidade =
      0;


    usuariosSnap.forEach(
      (documento) => {


        const usuario =
          documento.data();


        if (

          dadosUsuarioAtual?.grupoId &&

          usuario.grupoId &&

          usuario.grupoId !==
            dadosUsuarioAtual.grupoId

        ) {


          return;


        }


        quantidade++;


        const uid =
          documento.id;


        const proprioUsuario =

          auth.currentUser &&

          auth.currentUser.uid ===
            uid;


        const linha =
          document.createElement(
            "tr"
          );


        linha.innerHTML = `

          <td>
<<<<<<< HEAD
            ${escaparHtml(
              usuario.nome
            )}
=======

            ${
              escaparHtml(
                usuario.nome
              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>
<<<<<<< HEAD
            ${escaparHtml(
              usuario.email
            )}
=======

            ${
              escaparHtml(
                usuario.email
              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>
<<<<<<< HEAD
            ${escaparHtml(
              empresas[
                usuario.empresaId
              ] || "-"
            )}
=======

            ${
              escaparHtml(

                empresas[
                  usuario.empresaId
                ] ||

                "-"

              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>
<<<<<<< HEAD
            ${escaparHtml(
              perfis[
                usuario.perfilId
              ] ||
              usuario.perfilId ||
              "-"
            )}
=======

            ${
              escaparHtml(

                perfis[
                  usuario.perfilId
                ] ||

                usuario.perfilId ||

                "-"

              )
            }

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          </td>


          <td>

            <span

              class="${
                usuario.ativo === true
                  ? "status-ativo"
                  : "status-inativo"
              }"

            >

              ${
                usuario.ativo === true
                  ? "Ativo"
                  : "Inativo"
              }

            </span>

          </td>


          <td>

            ${
              proprioUsuario

                ? `

                  <span
                    class="acao-propria"
                  >

                    Usuário atual

                  </span>

                `

                : `

                  <button
<<<<<<< HEAD
                    class="btn-status-usuario"
                    data-uid="${uid}"
                    data-ativo="${usuario.ativo === true}"
=======

                    class="
                      btn-status-usuario
                    "

                    data-uid="${
                      uid
                    }"

                    data-ativo="${
                      usuario.ativo === true
                    }"

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
                    type="button"

                  >
                    ${
                      usuario.ativo === true
                        ? "Desativar"
                        : "Ativar"
                    }
                  </button>

                `
            }

          </td>

        `;


        listaUsuarios
          .appendChild(
            linha
          );


      }
    );


<<<<<<< HEAD
    quantidadeUsuarios.textContent =

      `${quantidade} usuário(s) cadastrado(s)`;
=======
    quantidadeUsuarios
      .textContent =
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

        `${quantidade} usuário(s) cadastrado(s)`;

<<<<<<< HEAD
    if (
      quantidade === 0
    ) {
=======
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

    if (
      quantidade === 0
    ) {


      listaUsuarios.innerHTML = `

        <tr>

          <td colspan="6">

            Nenhum usuário cadastrado.

          </td>

        </tr>

      `;


    }


    configurarBotoesUsuarios();


  } catch (erro) {


    console.error(
      "Erro ao carregar usuários:",
      erro
    );


    listaUsuarios.innerHTML = `

      <tr>

        <td colspan="6">

          Não foi possível carregar
          os usuários.

        </td>

      </tr>

    `;


  }

}



// ========================================
// USUÁRIOS - ATIVAR / DESATIVAR
// ========================================

function configurarBotoesUsuarios() {

<<<<<<< HEAD
  document
    .querySelectorAll(
=======

  const botoes =

    document.querySelectorAll(
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
      ".btn-status-usuario"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          async () => {

            const uid =
              botao.dataset.uid;


            const estaAtivo =

              botao.dataset.ativo ===
              "true";


            const novoStatus =
              !estaAtivo;


            const confirmar =
              window.confirm(

                novoStatus

                  ? "Deseja ativar este usuário?"

                  : "Deseja desativar este usuário?"

              );


            if (
              !confirmar
            ) {

              return;

            }


            try {

              await updateDoc(

                doc(
                  db,
                  "usuarios",
                  uid
                ),

                {

                  ativo:
                    novoStatus

                }

              );


              await carregarUsuarios();


            } catch (erro) {

              console.error(
                "Erro ao alterar usuário:",
                erro
              );


              alert(
                "Não foi possível alterar o usuário."
              );

            }

          }
        );

      }
    );

}


<<<<<<< HEAD
=======

      botao.addEventListener(
        "click",
        async () => {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
// ========================================
// PERFIS - GERAÇÃO DA GRADE
// ========================================
=======

          const uid =
            botao.dataset.uid;
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

function gerarGradePermissoes() {

<<<<<<< HEAD
  gradePermissoesPerfil.innerHTML =
    "";
=======
          const estaAtivo =

            botao.dataset.ativo ===
            "true";
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee


  DEFINICAO_PERMISSOES.forEach(
    (definicao) => {

      const bloco =
        document.createElement(
          "div"
        );

<<<<<<< HEAD
=======
          const confirmar =
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      bloco.className =
        "permissao-modulo";
=======
            window.confirm(
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
=======
              novoStatus
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
      const acoesHtml =
=======
                ? "Deseja ativar este usuário?"
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
        definicao.acoes

          .map(
            (acao) => `

              <label class="permissao-opcao">

                <input
                  type="checkbox"
                  class="checkbox-permissao"
                  data-modulo="${definicao.modulo}"
                  data-acao="${acao.id}"
                >

                <span>
                  ${acao.nome}
                </span>

              </label>

            `
          )

          .join(
            ""
          );


      bloco.innerHTML = `

        <div class="permissao-modulo-titulo">

          ${definicao.nome}

        </div>


        <div class="permissao-acoes">

          ${acoesHtml}

        </div>

      `;


      gradePermissoesPerfil
        .appendChild(
          bloco
        );

    }
  );

}



// ========================================
// PERFIS - FORMULÁRIO
// ========================================

function limparFormularioPerfil() {

  perfilEmEdicaoId =
    null;


  formPerfil.reset();


  tituloFormPerfil.textContent =
    "Novo perfil";


  btnSalvarPerfil.textContent =
    "Salvar perfil";


  mensagemPerfil.textContent =
    "";


  document
    .querySelectorAll(
      ".checkbox-permissao"
    )
    .forEach(
      (checkbox) => {

        checkbox.checked =
          false;

      }
    );


  const dashboardVisualizar =

    document.querySelector(

      '.checkbox-permissao[data-modulo="dashboard"][data-acao="visualizar"]'

    );


  if (
    dashboardVisualizar
  ) {

    dashboardVisualizar.checked =
      true;

  }

}



function coletarPermissoesFormulario() {

  const permissoes =
    {};


  DEFINICAO_PERMISSOES.forEach(
    (definicao) => {

      permissoes[
        definicao.modulo
      ] =
        {};


      definicao.acoes.forEach(
        (acao) => {

          const checkbox =

            document.querySelector(

              `.checkbox-permissao[data-modulo="${definicao.modulo}"][data-acao="${acao.id}"]`

=======
                : "Deseja desativar este usuário?"

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
            );


<<<<<<< HEAD
          permissoes[
            definicao.modulo
          ][
            acao.id
          ] =
=======
          if (
            !confirmar
          ) {
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
            checkbox?.checked ===
            true;

        }
      );

    }
  );


  return permissoes;

}



function preencherPermissoesFormulario(
  permissoes = {}
) {

  document
    .querySelectorAll(
      ".checkbox-permissao"
    )
    .forEach(
      (checkbox) => {

        const modulo =
          checkbox.dataset.modulo;


        const acao =
          checkbox.dataset.acao;


        checkbox.checked =

          permissoes
            ?.[modulo]
            ?.[acao] ===
          true;

      }
    );

}



function contarPermissoesAtivas(
  permissoes = {}
) {

  let total =
    0;


  Object
    .values(
      permissoes
    )
    .forEach(
      (acoes) => {

        if (

          !acoes ||

          typeof acoes !==
            "object"

        ) {

          return;

        }


        Object
          .values(
            acoes
          )
          .forEach(
            (permitido) => {

              if (
                permitido ===
                true
              ) {

                total++;

              }

            }
          );

      }
    );


  return total;

}



// ========================================
// PERFIS - NAVEGAÇÃO
// ========================================

cardPerfisAcesso
  .addEventListener(
    "click",
    async () => {

      if (
        !temPermissao(
          "perfisAcesso"
        )
      ) {

        return;

      }


      abrirPagina(
        "perfis"
      );


      await carregarPerfisAcesso();

    }
  );



btnVoltarPerfis
  .addEventListener(
    "click",
    () => {

      abrirPagina(
        "administracao"
      );

    }
  );



btnNovoPerfil
  .addEventListener(
    "click",
    () => {

      limparFormularioPerfil();


      formPerfilContainer
        .classList.remove(
          "hidden"
        );


      perfilNome.focus();

    }
  );



btnCancelarPerfil
  .addEventListener(
    "click",
    () => {

      limparFormularioPerfil();


      formPerfilContainer
        .classList.add(
          "hidden"
        );

    }
  );



// ========================================
// PERFIS - LISTAGEM
// ========================================

async function carregarPerfisAcesso() {

  listaPerfis.innerHTML = `

    <tr>

      <td colspan="6">
        Carregando perfis...
      </td>

    </tr>

  `;


  quantidadePerfis.textContent =
    "Carregando...";


  perfisCache =
    new Map();


  try {

    const perfisSnap =
      await getDocs(

        collection(
          db,
          "perfisAcesso"
        )

      );


    listaPerfis.innerHTML =
      "";


    let quantidade =
      0;


    perfisSnap.forEach(
      (documento) => {

        const perfil =
          documento.data();


        const perfilDoGrupo =

          perfil.acessoTotal ===
            true ||

          !perfil.grupoId ||

          perfil.grupoId ===
            dadosUsuarioAtual?.grupoId;


        if (
          !perfilDoGrupo
        ) {

          return;

        }


        quantidade++;


        perfisCache.set(
          documento.id,
          perfil
        );


        const protegido =

          perfil.acessoTotal ===
            true ||

          documento.id ===
            "administrador";


        const permissoesTexto =

          perfil.acessoTotal ===
            true

            ? "Todas"

            : `${contarPermissoesAtivas(
                perfil.permissoes
              )} ativa(s)`;


        const linha =
          document.createElement(
            "tr"
          );


        linha.innerHTML = `

          <td>
            ${escaparHtml(
              perfil.nome ||
              documento.id
            )}
          </td>

          <td>
            ${escaparHtml(
              perfil.descricao ||
              "-"
            )}
          </td>

          <td>

            ${
              perfil.acessoTotal ===
                true

                ? `
                  <span class="selo-sistema">
                    Sistema
                  </span>
                `

                : "Personalizado"
            }

          </td>

          <td>
            ${permissoesTexto}
          </td>

          <td>

            <span
              class="${
                perfil.ativo === true
                  ? "status-ativo"
                  : "status-inativo"
              }"
            >

              ${
                perfil.ativo === true
                  ? "Ativo"
                  : "Inativo"
              }

            </span>

          </td>

          <td>

            ${
              protegido

                ? `
                  <span class="acao-propria">
                    Protegido
                  </span>
                `

                : `
                  <div class="acoes-tabela">

                    <button
                      class="btn-editar-perfil"
                      data-id="${documento.id}"
                      type="button"
                    >
                      Editar
                    </button>

                    <button
                      class="btn-status-perfil"
                      data-id="${documento.id}"
                      data-ativo="${perfil.ativo === true}"
                      type="button"
                    >
                      ${
                        perfil.ativo === true
                          ? "Inativar"
                          : "Reativar"
                      }
                    </button>

                  </div>
                `
            }

          </td>

        `;


        listaPerfis
          .appendChild(
            linha
          );

      }
    );


    quantidadePerfis.textContent =

      `${quantidade} perfil(is) cadastrado(s)`;


    if (
      quantidade === 0
    ) {

      listaPerfis.innerHTML = `

        <tr>

          <td colspan="6">
            Nenhum perfil cadastrado.
          </td>

        </tr>

      `;

    }


    configurarAcoesPerfis();


  } catch (erro) {

    console.error(
      "Erro ao carregar perfis:",
      erro
    );


    listaPerfis.innerHTML = `

      <tr>

        <td colspan="6">
          Não foi possível carregar os perfis.
        </td>

      </tr>

    `;

  }

}



// ========================================
// PERFIS - CRIAR / EDITAR
// ========================================

formPerfil.addEventListener(
  "submit",
  async (evento) => {

    evento.preventDefault();


    const nome =
      perfilNome
        .value
        .trim();


    const descricao =
      perfilDescricao
        .value
        .trim();


    const permissoes =
      coletarPermissoesFormulario();


    if (
      !nome
    ) {

      mensagemPerfil.textContent =
        "Informe o nome do perfil.";


      perfilNome.focus();


      return;

    }


    if (
      !dadosUsuarioAtual?.grupoId
    ) {

      mensagemPerfil.textContent =
        "O usuário não está vinculado a um grupo empresarial.";


      return;

    }


    mensagemPerfil.textContent =

      perfilEmEdicaoId

        ? "Salvando alterações..."

        : "Criando perfil...";


    try {

      const perfisSnap =
        await getDocs(

          collection(
            db,
            "perfisAcesso"
          )

        );


      let nomeDuplicado =
        false;


      perfisSnap.forEach(
        (documento) => {

          if (
            documento.id ===
            perfilEmEdicaoId
          ) {

=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
            return;


          }


          const perfil =
            documento.data();

<<<<<<< HEAD
=======

            await updateDoc(

              doc(
                db,
                "usuarios",
                uid
              ),
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
          const mesmoGrupo =

            !perfil.grupoId ||
=======
              {

                ativo:
                  novoStatus

              }

            );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

            perfil.grupoId ===
              dadosUsuarioAtual.grupoId;


          if (

            mesmoGrupo &&

<<<<<<< HEAD
            String(
              perfil.nome ||
              ""
            )
              .trim()
              .toLowerCase() ===
=======

            console.error(
              "Erro ao alterar usuário:",
              erro
            );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

            nome
              .toLowerCase()

<<<<<<< HEAD
          ) {
=======
            alert(

              "Não foi possível alterar o usuário."

            );
>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee

<<<<<<< HEAD
            nomeDuplicado =
              true;

=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
          }


        }
      );

<<<<<<< HEAD

      if (
        nomeDuplicado
      ) {

        mensagemPerfil.textContent =
          "Já existe um perfil com este nome.";


        return;

      }


      if (
        perfilEmEdicaoId
      ) {

        await updateDoc(

          doc(
            db,
            "perfisAcesso",
            perfilEmEdicaoId
          ),

          {

            nome:
              nome,

            descricao:
              descricao,

            permissoes:
              permissoes,

            atualizadoEm:
              serverTimestamp()

          }

        );


        mensagemPerfil.textContent =
          "Perfil atualizado com sucesso.";


      } else {

        await addDoc(

          collection(
            db,
            "perfisAcesso"
          ),

          {

            nome:
              nome,

            descricao:
              descricao,

            grupoId:
              dadosUsuarioAtual
                .grupoId,

            acessoTotal:
              false,

            ativo:
              true,

            permissoes:
              permissoes,

            criadoEm:
              serverTimestamp()

          }

        );


        mensagemPerfil.textContent =
          "Perfil criado com sucesso.";

      }


      await carregarPerfisAcesso();


      setTimeout(
        () => {

          limparFormularioPerfil();


          formPerfilContainer
            .classList.add(
              "hidden"
            );

        },
        900
      );


    } catch (erro) {

      console.error(
        "Erro ao salvar perfil:",
        erro
      );


      mensagemPerfil.textContent =
        "Não foi possível salvar o perfil.";

=======

>>>>>>> 714fb232dcc2bfd6f2171712b5fa779748f911ee
    }

  }
);



// ========================================
// PERFIL EM USO
// ========================================

async function perfilPossuiUsuariosAtivos(
  perfilId
) {

  const usuariosSnap =
    await getDocs(

      collection(
        db,
        "usuarios"
      )

    );


  let possui =
    false;


  usuariosSnap.forEach(
    (documento) => {

      const usuario =
        documento.data();


      if (

        usuario.perfilId ===
          perfilId &&

        usuario.ativo ===
          true

      ) {

        possui =
          true;

      }

    }
  );


  return possui;

}



// ========================================
// PERFIS - AÇÕES
// ========================================

function configurarAcoesPerfis() {

  document
    .querySelectorAll(
      ".btn-editar-perfil"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          () => {

            const perfilId =
              botao.dataset.id;


            const perfil =
              perfisCache.get(
                perfilId
              );


            if (
              !perfil
            ) {

              return;

            }


            perfilEmEdicaoId =
              perfilId;


            tituloFormPerfil.textContent =
              "Editar perfil";


            btnSalvarPerfil.textContent =
              "Salvar alterações";


            mensagemPerfil.textContent =
              "";


            perfilNome.value =
              perfil.nome ||
              "";


            perfilDescricao.value =
              perfil.descricao ||
              "";


            preencherPermissoesFormulario(

              perfil.permissoes ||
              {}

            );


            formPerfilContainer
              .classList.remove(
                "hidden"
              );


            perfilNome.focus();

          }
        );

      }
    );



  document
    .querySelectorAll(
      ".btn-status-perfil"
    )
    .forEach(
      (botao) => {

        botao.addEventListener(
          "click",
          async () => {

            const perfilId =
              botao.dataset.id;


            const estaAtivo =

              botao.dataset.ativo ===
              "true";


            const novoStatus =
              !estaAtivo;


            if (
              !novoStatus
            ) {

              const emUso =

                await perfilPossuiUsuariosAtivos(
                  perfilId
                );


              if (
                emUso
              ) {

                alert(

                  "Este perfil está vinculado a usuário(s) ativo(s). Altere o perfil desses usuários antes de inativá-lo."

                );


                return;

              }

            }


            const confirmar =
              window.confirm(

                novoStatus

                  ? "Deseja reativar este perfil?"

                  : "Deseja inativar este perfil?"

              );


            if (
              !confirmar
            ) {

              return;

            }


            try {

              await updateDoc(

                doc(
                  db,
                  "perfisAcesso",
                  perfilId
                ),

                {

                  ativo:
                    novoStatus,

                  atualizadoEm:
                    serverTimestamp()

                }

              );


              await carregarPerfisAcesso();


            } catch (erro) {

              console.error(
                "Erro ao alterar perfil:",
                erro
              );


              alert(
                "Não foi possível alterar o perfil."
              );

            }

          }
        );

      }
    );

}