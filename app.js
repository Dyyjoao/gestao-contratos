// ========================================
// FIREBASE - IMPORTAÇÕES
// ========================================

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
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
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



// ========================================
// INICIALIZAÇÃO
// ========================================

const app =
  initializeApp(firebaseConfig);


const auth =
  getAuth(app);


const db =
  getFirestore(app);



// ========================================
// DADOS DO USUÁRIO ATUAL
// ========================================

let dadosUsuarioAtual = null;

let dadosPerfilAtual = null;



// ========================================
// ELEMENTOS GERAIS
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


const menuAdministracao =
  document.getElementById("menuAdministracao");


const tituloPagina =
  document.getElementById("tituloPagina");



// ========================================
// ELEMENTOS - EMPRESAS
// ========================================

const cardEmpresas =
  document.getElementById("cardEmpresas");


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
// FUNÇÃO DE SEGURANÇA PARA TEXTOS
// ========================================

function escaparHtml(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return "-";
  }


  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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


      mensagemLogin.textContent = "";

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

      await signOut(auth);

    } catch (erro) {

      console.error(
        "Erro ao sair:",
        erro
      );

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

      dadosUsuarioAtual = null;
      dadosPerfilAtual = null;


      sistema.classList.add(
        "hidden"
      );


      telaLogin.classList.remove(
        "hidden"
      );


      menuAdministracao.classList.add(
        "hidden"
      );


      nomeUsuario.textContent = "";


      return;

    }


    try {

      // ========================================
      // USUÁRIO INTERNO
      // ========================================

      const usuarioRef =
        doc(
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
      // PERFIL DE ACESSO
      // ========================================

      const perfilRef =
        doc(
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
      // GUARDA CONTEXTO
      // ========================================

      dadosUsuarioAtual =
        dadosUsuario;


      dadosPerfilAtual =
        dadosPerfil;


      // ========================================
      // LIBERA SISTEMA
      // ========================================

      telaLogin.classList.add(
        "hidden"
      );


      sistema.classList.remove(
        "hidden"
      );


      nomeUsuario.textContent =
        dadosUsuario.nome ||
        usuario.email;


      // ========================================
      // ADMINISTRAÇÃO
      // ========================================

      if (
        dadosPerfil.acessoTotal === true
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


      await signOut(auth);


      mensagemLogin.textContent =
        "Erro ao verificar as permissões.";

    }

  }
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



function abrirPagina(nomePagina) {

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
    nomePagina === "administracao" ||
    nomePagina === "empresas" ||
    nomePagina === "usuarios";


  let itemMenuAtivo;


  if (paginaAdministrativa) {

    itemMenuAtivo =
      menuAdministracao;

  } else {

    itemMenuAtivo =
      document.querySelector(
        `.menu-item[data-pagina="${nomePagina}"]`
      );

  }


  if (itemMenuAtivo) {

    itemMenuAtivo.classList.add(
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



itensMenu.forEach(
  (item) => {

    item.addEventListener(
      "click",
      () => {

        const paginaSelecionada =
          item.dataset.pagina;


        abrirPagina(
          paginaSelecionada
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



btnVoltarAdministracao.addEventListener(
  "click",
  () => {

    abrirPagina(
      "administracao"
    );

  }
);



btnMostrarNovaEmpresa.addEventListener(
  "click",
  () => {

    mensagemEmpresa.textContent = "";


    formNovaEmpresaContainer
      .classList.remove(
        "hidden"
      );


    empresaRazaoSocial.focus();

  }
);



btnCancelarEmpresa.addEventListener(
  "click",
  () => {

    formNovaEmpresa.reset();


    mensagemEmpresa.textContent = "";


    formNovaEmpresaContainer
      .classList.add(
        "hidden"
      );

  }
);



// ========================================
// EMPRESAS - MÁSCARA CNPJ
// ========================================

empresaCnpj.addEventListener(
  "input",
  () => {

    let valor =
      empresaCnpj.value.replace(
        /\D/g,
        ""
      );


    valor =
      valor.substring(
        0,
        14
      );


    if (valor.length > 12) {

      valor =
        valor.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/,
          "$1.$2.$3/$4-$5"
        );

    } else if (valor.length > 8) {

      valor =
        valor.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/,
          "$1.$2.$3/$4"
        );

    } else if (valor.length > 5) {

      valor =
        valor.replace(
          /^(\d{2})(\d{3})(\d{0,3}).*/,
          "$1.$2.$3"
        );

    } else if (valor.length > 2) {

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
// EMPRESAS - LISTAGEM
// ========================================

async function carregarEmpresas() {

  listaEmpresas.innerHTML = `
    <tr>
      <td colspan="4">
        Carregando empresas...
      </td>
    </tr>
  `;


  try {

    const empresasSnap =
      await getDocs(
        collection(
          db,
          "empresas"
        )
      );


    listaEmpresas.innerHTML = "";


    let quantidade = 0;


    empresasSnap.forEach(
      (documento) => {

        const empresa =
          documento.data();


        // Mostra apenas empresas
        // pertencentes ao grupo atual.

        if (
          dadosUsuarioAtual?.grupoId &&
          empresa.grupoId !==
            dadosUsuarioAtual.grupoId
        ) {

          return;

        }


        quantidade++;


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

        `;


        listaEmpresas.appendChild(
          linha
        );

      }
    );


    quantidadeEmpresas.textContent =
      `${quantidade} empresa(s) cadastrada(s)`;


    if (quantidade === 0) {

      listaEmpresas.innerHTML = `

        <tr>

          <td colspan="4">
            Nenhuma empresa cadastrada.
          </td>

        </tr>

      `;

    }


  } catch (erro) {

    console.error(
      "Erro ao carregar empresas:",
      erro
    );


    listaEmpresas.innerHTML = `

      <tr>

        <td colspan="4">
          Não foi possível carregar as empresas.
        </td>

      </tr>

    `;

  }

}



// ========================================
// EMPRESAS - CADASTRO
// ========================================

formNovaEmpresa.addEventListener(
  "submit",
  async (evento) => {

    evento.preventDefault();


    mensagemEmpresa.textContent = "";


    const cnpjSomenteNumeros =
      empresaCnpj.value.replace(
        /\D/g,
        ""
      );


    if (
      cnpjSomenteNumeros.length !== 14
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

      // ========================================
      // VERIFICA CNPJ DUPLICADO
      // ========================================

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
            ).replace(
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


      if (cnpjDuplicado) {

        mensagemEmpresa.textContent =
          "Já existe uma empresa cadastrada com este CNPJ.";


        return;

      }


      // ========================================
      // SALVA EMPRESA
      // ========================================

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
            dadosUsuarioAtual.grupoId,

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



btnVoltarUsuarios.addEventListener(
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
// USUÁRIOS - LISTAGEM
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

    // ========================================
    // EMPRESAS
    // ========================================

    const empresasSnap =
      await getDocs(
        collection(
          db,
          "empresas"
        )
      );


    const empresas = {};


    empresasSnap.forEach(
      (documento) => {

        const dados =
          documento.data();


        empresas[documento.id] =
          dados.nomeFantasia ||
          dados.razaoSocial ||
          documento.id;

      }
    );


    // ========================================
    // PERFIS
    // ========================================

    const perfisSnap =
      await getDocs(
        collection(
          db,
          "perfisAcesso"
        )
      );


    const perfis = {};


    perfisSnap.forEach(
      (documento) => {

        const dados =
          documento.data();


        perfis[documento.id] =
          dados.nome ||
          documento.id;

      }
    );


    // ========================================
    // USUÁRIOS
    // ========================================

    const usuariosSnap =
      await getDocs(
        collection(
          db,
          "usuarios"
        )
      );


    listaUsuarios.innerHTML = "";


    let quantidade = 0;


    usuariosSnap.forEach(
      (documento) => {

        const usuario =
          documento.data();


        // Filtra pelo grupo empresarial.

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
          auth.currentUser.uid === uid;


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
                ] || "-"
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
                  <span class="acao-propria">
                    Usuário atual
                  </span>
                `

                : `
                  <button
                    class="btn-status-usuario"
                    data-uid="${uid}"
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


        listaUsuarios.appendChild(
          linha
        );

      }
    );


    quantidadeUsuarios.textContent =
      `${quantidade} usuário(s) cadastrado(s)`;


    if (quantidade === 0) {

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
          Não foi possível carregar os usuários.
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


          const mensagemConfirmacao =
            novoStatus

              ? "Deseja ativar este usuário?"

              : "Deseja desativar este usuário?";


          const confirmar =
            window.confirm(
              mensagemConfirmacao
            );


          if (!confirmar) {

            return;

          }


          try {

            const usuarioRef =
              doc(
                db,
                "usuarios",
                uid
              );


            await updateDoc(
              usuarioRef,
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