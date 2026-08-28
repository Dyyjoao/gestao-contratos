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
// CONTEXTO DO USUÁRIO
// ========================================

let dadosUsuarioAtual =
  null;


let dadosPerfilAtual =
  null;


let empresaParaExcluir =
  null;


let empresasCache =
  new Map();



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


const menuAdministracao =
  document.getElementById(
    "menuAdministracao"
  );


const tituloPagina =
  document.getElementById(
    "tituloPagina"
  );



// ========================================
// ELEMENTOS - EMPRESAS
// ========================================

const cardEmpresas =
  document.getElementById(
    "cardEmpresas"
  );


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
// ========================================

const cardUsuarios =
  document.getElementById(
    "cardUsuarios"
  );


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
// NAVEGAÇÃO
// ========================================

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


      dadosUsuarioAtual =
        null;


      dadosPerfilAtual =
        null;


      empresaParaExcluir =
        null;


      sistema
        .classList.add(
          "hidden"
        );


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


      return;

    }


    try {


      const usuarioRef =
        doc(
          db,
          "usuarios",
          usuario.uid
        );


      const usuarioSnap =
        await getDoc(
          usuarioRef
        );


      if (
        !usuarioSnap.exists()
      ) {


        await signOut(
          auth
        );


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


        await signOut(
          auth
        );


        mensagemLogin.textContent =
          "Este usuário está desativado.";


        return;

      }


      const perfilRef =
        doc(
          db,
          "perfisAcesso",
          dadosUsuario.perfilId
        );


      const perfilSnap =
        await getDoc(
          perfilRef
        );


      if (
        !perfilSnap.exists()
      ) {


        await signOut(
          auth
        );


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


      if (
        dadosPerfil.acessoTotal ===
        true
      ) {


        menuAdministracao
          .classList.remove(
            "hidden"
          );


      } else {


        menuAdministracao
          .classList.add(
            "hidden"
          );


      }


      abrirPagina(
        "dashboard"
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


      abrirPagina(
        "administracao"
      );


    }
  );



btnMostrarNovaEmpresa
  .addEventListener(
    "click",
    () => {


      mensagemEmpresa.textContent =
        "";


      formNovaEmpresaContainer
        .classList.remove(
          "hidden"
        );


      empresaRazaoSocial
        .focus();


    }
  );



btnCancelarEmpresa
  .addEventListener(
    "click",
    () => {


      formNovaEmpresa.reset();


      mensagemEmpresa.textContent =
        "";


      formNovaEmpresaContainer
        .classList.add(
          "hidden"
        );


    }
  );



// ========================================
// MÁSCARA DE CNPJ
// ========================================

empresaCnpj.addEventListener(
  "input",
  () => {


    let valor =
      empresaCnpj.value
        .replace(
          /\D/g,
          ""
        );


    valor =
      valor.substring(
        0,
        14
      );


    if (
      valor.length > 12
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/,

          "$1.$2.$3/$4-$5"

        );


    } else if (
      valor.length > 8
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/,

          "$1.$2.$3/$4"

        );


    } else if (
      valor.length > 5
    ) {


      valor =
        valor.replace(

          /^(\d{2})(\d{3})(\d{0,3}).*/,

          "$1.$2.$3"

        );


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

      <td colspan="5">

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

            ${
              escaparHtml(
                empresa.razaoSocial
              )
            }

          </td>


          <td>

            ${
              escaparHtml(
                empresa.nomeFantasia
              )
            }

          </td>


          <td>

            ${
              escaparHtml(
                empresa.cnpj
              )
            }

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

        `;


        listaEmpresas
          .appendChild(
            linha
          );


      }
    );


    quantidadeEmpresas
      .textContent =

        `${quantidade} empresa(s) cadastrada(s)`;


    if (
      quantidade === 0
    ) {


      listaEmpresas.innerHTML = `

        <tr>

          <td colspan="5">

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

        <td colspan="5">

          Não foi possível carregar
          as empresas.

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

      empresaCnpj.value
        .replace(
          /\D/g,
          ""
        );


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
              empresa.cnpj || ""
            )

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
// ========================================

cardUsuarios.addEventListener(
  "click",
  async () => {


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


      abrirPagina(
        "administracao"
      );


    }
  );



btnNovoUsuario.addEventListener(
  "click",
  () => {


    avisoNovoUsuario
      .classList.toggle(
        "hidden"
      );


  }
);



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

            ${
              escaparHtml(
                usuario.nome
              )
            }

          </td>


          <td>

            ${
              escaparHtml(
                usuario.email
              )
            }

          </td>


          <td>

            ${
              escaparHtml(

                empresas[
                  usuario.empresaId
                ] ||

                "-"

              )
            }

          </td>


          <td>

            ${
              escaparHtml(

                perfis[
                  usuario.perfilId
                ] ||

                usuario.perfilId ||

                "-"

              )
            }

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

                    class="
                      btn-status-usuario
                    "

                    data-uid="${
                      uid
                    }"

                    data-ativo="${
                      usuario.ativo === true
                    }"

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


    quantidadeUsuarios
      .textContent =

        `${quantidade} usuário(s) cadastrado(s)`;


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


  const botoes =

    document.querySelectorAll(
      ".btn-status-usuario"
    );


  botoes.forEach(
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