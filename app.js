import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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

const appCriacaoUsuarios = initializeApp(firebaseConfig, "sig-criacao-usuarios");
const authCriacaoUsuarios = getAuth(appCriacaoUsuarios);

let dadosUsuarioAtual = null;
let dadosPerfilAtual = null;
let grupoAtual = null;

let empresasCache = new Map();
let usuariosCache = new Map();
let perfisCache = new Map();

let empresaEmEdicaoId = null;
let usuarioEmEdicaoId = null;
let perfilEmEdicaoId = null;
let empresaParaExcluir = null;

const DEFINICAO_PERMISSOES = [
  {
    modulo: "dashboard",
    nome: "Dashboard",
    acoes: [
      { id: "visualizar", nome: "Visualizar" }
    ]
  },
  {
    modulo: "contratos",
    nome: "Contratos",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "cadastrar", nome: "Cadastrar" },
      { id: "editar", nome: "Editar" },
      { id: "excluir", nome: "Excluir" },
      { id: "aprovar", nome: "Aprovar" }
    ]
  },
  {
    modulo: "frota",
    nome: "Frota",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "cadastrar", nome: "Cadastrar" },
      { id: "editar", nome: "Editar" },
      { id: "excluir", nome: "Excluir" }
    ]
  },
  {
    modulo: "almoxarifado",
    nome: "Almoxarifado",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "movimentar", nome: "Movimentar" },
      { id: "editar", nome: "Editar" },
      { id: "ajustar", nome: "Ajustar saldo" }
    ]
  },
  {
    modulo: "cotacoes",
    nome: "Cotações",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "solicitar", nome: "Solicitar" },
      { id: "cotacao", nome: "Registrar cotação" },
      { id: "aprovar", nome: "Aprovar" },
      { id: "editar", nome: "Editar" }
    ]
  },
  {
    modulo: "controladoria",
    nome: "Controladoria",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "importar", nome: "Importar dados" },
      { id: "editar", nome: "Editar" },
      { id: "budget", nome: "Budget" },
      { id: "forecast", nome: "Forecast" }
    ]
  },
  {
    modulo: "administracao",
    nome: "Administração",
    acoes: [
      { id: "visualizar", nome: "Visualizar" }
    ]
  },
  {
    modulo: "empresas",
    nome: "Empresas",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "cadastrar", nome: "Cadastrar" },
      { id: "editar", nome: "Editar" },
      { id: "inativar", nome: "Inativar" },
      { id: "excluir", nome: "Excluir" }
    ]
  },
  {
    modulo: "usuarios",
    nome: "Usuários",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "cadastrar", nome: "Cadastrar" },
      { id: "editar", nome: "Editar" },
      { id: "inativar", nome: "Inativar" },
      { id: "resetarSenha", nome: "Redefinir senha" }
    ]
  },
  {
    modulo: "perfisAcesso",
    nome: "Perfis de Acesso",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "cadastrar", nome: "Cadastrar" },
      { id: "editar", nome: "Editar" },
      { id: "inativar", nome: "Inativar" }
    ]
  },
  {
    modulo: "grupoEmpresarial",
    nome: "Grupo Empresarial",
    acoes: [
      { id: "visualizar", nome: "Visualizar" },
      { id: "editar", nome: "Editar" }
    ]
  }
];

const $ = (id) => document.getElementById(id);

const telaLogin = $("telaLogin");
const sistema = $("sistema");
const formLogin = $("formLogin");
const email = $("email");
const senha = $("senha");
const mensagemLogin = $("mensagemLogin");
const nomeUsuario = $("nomeUsuario");
const btnSair = $("btnSair");
const tituloPagina = $("tituloPagina");
const subtituloContexto = $("subtituloContexto");
const menuDashboard = $("menuDashboard");
const menuContratos = $("menuContratos");
const menuAdministracao = $("menuAdministracao");
const paginas = document.querySelectorAll(".pagina");
const itensMenu = document.querySelectorAll(".menu-item");

const cardEmpresas = $("cardEmpresas");
const cardUsuarios = $("cardUsuarios");
const cardPerfisAcesso = $("cardPerfisAcesso");
const cardGrupoEmpresarial = $("cardGrupoEmpresarial");

const resumoEmpresas = $("resumoEmpresas");
const resumoUsuarios = $("resumoUsuarios");
const resumoPerfis = $("resumoPerfis");

const btnNovaEmpresa = $("btnNovaEmpresa");
const formEmpresaContainer = $("formEmpresaContainer");
const formEmpresa = $("formEmpresa");
const tituloFormEmpresa = $("tituloFormEmpresa");
const empresaRazaoSocial = $("empresaRazaoSocial");
const empresaNomeFantasia = $("empresaNomeFantasia");
const empresaCnpj = $("empresaCnpj");
const btnCancelarEmpresa = $("btnCancelarEmpresa");
const mensagemEmpresa = $("mensagemEmpresa");
const quantidadeEmpresas = $("quantidadeEmpresas");
const listaEmpresas = $("listaEmpresas");
const buscaEmpresa = $("buscaEmpresa");

const modalExcluirEmpresa = $("modalExcluirEmpresa");
const nomeEmpresaExcluir = $("nomeEmpresaExcluir");
const formConfirmarExclusaoEmpresa = $("formConfirmarExclusaoEmpresa");
const senhaExclusaoEmpresa = $("senhaExclusaoEmpresa");
const mensagemExclusaoEmpresa = $("mensagemExclusaoEmpresa");
const btnCancelarExclusaoEmpresa = $("btnCancelarExclusaoEmpresa");

const btnNovoUsuario = $("btnNovoUsuario");
const formUsuarioContainer = $("formUsuarioContainer");
const formUsuario = $("formUsuario");
const tituloFormUsuario = $("tituloFormUsuario");
const descricaoFormUsuario = $("descricaoFormUsuario");
const usuarioNome = $("usuarioNome");
const usuarioEmail = $("usuarioEmail");
const usuarioSenha = $("usuarioSenha");
const campoSenhaNovoUsuario = $("campoSenhaNovoUsuario");
const usuarioPerfil = $("usuarioPerfil");
const usuarioEmpresaPrincipal = $("usuarioEmpresaPrincipal");
const usuarioAcessoGlobal = $("usuarioAcessoGlobal");
const listaEmpresasAcesso = $("listaEmpresasAcesso");
const btnCancelarUsuario = $("btnCancelarUsuario");
const mensagemUsuario = $("mensagemUsuario");
const quantidadeUsuarios = $("quantidadeUsuarios");
const listaUsuarios = $("listaUsuarios");
const buscaUsuario = $("buscaUsuario");

const btnNovoPerfil = $("btnNovoPerfil");
const formPerfilContainer = $("formPerfilContainer");
const formPerfil = $("formPerfil");
const tituloFormPerfil = $("tituloFormPerfil");
const perfilNome = $("perfilNome");
const perfilDescricao = $("perfilDescricao");
const gradePermissoesPerfil = $("gradePermissoesPerfil");
const btnCancelarPerfil = $("btnCancelarPerfil");
const mensagemPerfil = $("mensagemPerfil");
const quantidadePerfis = $("quantidadePerfis");
const listaPerfis = $("listaPerfis");
const buscaPerfil = $("buscaPerfil");

const formGrupo = $("formGrupo");
const grupoIdExibicao = $("grupoIdExibicao");
const grupoNome = $("grupoNome");
const mensagemGrupo = $("mensagemGrupo");
const grupoNomeResumo = $("grupoNomeResumo");
const grupoStatus = $("grupoStatus");
const grupoQtdEmpresas = $("grupoQtdEmpresas");
const grupoQtdUsuarios = $("grupoQtdUsuarios");
const grupoQtdPerfis = $("grupoQtdPerfis");

function escaparHtml(valor) {
  if (valor === null || valor === undefined) return "-";
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarCnpj(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 14);
  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function cnpjValido(valor) {
  const cnpj = String(valor || "").replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base) => {
    let peso = base.length - 7;
    let soma = 0;

    for (const numero of base) {
      soma += Number(numero) * peso--;
      if (peso < 2) peso = 9;
    }

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cnpj.slice(0, 12));
  const digito2 = calcularDigito(cnpj.slice(0, 12) + digito1);

  return cnpj === cnpj.slice(0, 12) + String(digito1) + String(digito2);
}

function marcarMensagem(elemento, texto, sucesso = false) {
  elemento.textContent = texto;
  elemento.classList.toggle("sucesso", sucesso);
}

function perfilAdministrador() {
  return dadosPerfilAtual?.acessoTotal === true;
}

function temPermissao(modulo, acao = "visualizar") {
  if (perfilAdministrador()) return true;
  return dadosPerfilAtual?.permissoes?.[modulo]?.[acao] === true;
}

function abrirPagina(nomePagina) {
  const pagina = $(`pagina-${nomePagina}`);
  if (!pagina) return;

  paginas.forEach((item) => item.classList.add("hidden"));
  pagina.classList.remove("hidden");

  itensMenu.forEach((item) => item.classList.remove("ativo"));

  const administrativa = ["administracao", "empresas", "usuarios", "perfis", "grupo"].includes(nomePagina);
  const itemMenu = administrativa
    ? menuAdministracao
    : document.querySelector(`.menu-item[data-pagina="${nomePagina}"]`);

  itemMenu?.classList.add("ativo");

  const titulos = {
    dashboard: "Dashboard",
    contratos: "Contratos",
    administracao: "Administração",
    empresas: "Empresas",
    usuarios: "Usuários",
    perfis: "Perfis de Acesso",
    grupo: "Grupo Empresarial"
  };

  tituloPagina.textContent = titulos[nomePagina] || "SIG";
  subtituloContexto.textContent = grupoAtual?.nome || "Sistema Integrado de Gestão";
}

function configurarMenus() {
  menuDashboard.classList.toggle("hidden", !temPermissao("dashboard"));
  menuContratos.classList.toggle("hidden", !temPermissao("contratos"));
  menuAdministracao.classList.toggle("hidden", !perfilAdministrador());
}

function primeiraPaginaPermitida() {
  if (temPermissao("dashboard")) return "dashboard";
  if (temPermissao("contratos")) return "contratos";
  if (perfilAdministrador()) return "administracao";
  return "dashboard";
}

async function carregarGrupoAtual() {
  if (!dadosUsuarioAtual?.grupoId) {
    grupoAtual = null;
    return;
  }

  const snap = await getDoc(doc(db, "gruposEmpresariais", dadosUsuarioAtual.grupoId));
  grupoAtual = snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function carregarColecoesAdministrativas() {
  if (!perfilAdministrador()) return;

  const [empresasSnap, usuariosSnap, perfisSnap] = await Promise.all([
    getDocs(collection(db, "empresas")),
    getDocs(collection(db, "usuarios")),
    getDocs(collection(db, "perfisAcesso"))
  ]);

  empresasCache = new Map();
  usuariosCache = new Map();
  perfisCache = new Map();

  empresasSnap.forEach((registro) => {
    const dados = registro.data();
    if (!dadosUsuarioAtual?.grupoId || dados.grupoId === dadosUsuarioAtual.grupoId) {
      empresasCache.set(registro.id, { id: registro.id, ...dados });
    }
  });

  usuariosSnap.forEach((registro) => {
    const dados = registro.data();
    if (!dadosUsuarioAtual?.grupoId || !dados.grupoId || dados.grupoId === dadosUsuarioAtual.grupoId) {
      usuariosCache.set(registro.id, { id: registro.id, ...dados });
    }
  });

  perfisSnap.forEach((registro) => {
    const dados = registro.data();
    if (
      dados.acessoTotal === true ||
      !dados.grupoId ||
      dados.grupoId === dadosUsuarioAtual?.grupoId
    ) {
      perfisCache.set(registro.id, { id: registro.id, ...dados });
    }
  });
}

async function atualizarResumoAdministracao() {
  if (!perfilAdministrador()) return;

  try {
    await carregarColecoesAdministrativas();

    resumoEmpresas.textContent = empresasCache.size;
    resumoUsuarios.textContent = [...usuariosCache.values()].filter((item) => item.ativo === true).length;
    resumoPerfis.textContent = [...perfisCache.values()].filter((item) => item.ativo === true).length;
  } catch (erro) {
    console.error("Erro ao atualizar resumo administrativo:", erro);
    resumoEmpresas.textContent = "—";
    resumoUsuarios.textContent = "—";
    resumoPerfis.textContent = "—";
  }
}

/* LOGIN E SESSÃO */

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemLogin.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
    formLogin.reset();
  } catch (erro) {
    console.error("Erro no login:", erro);
    mensagemLogin.textContent = "E-mail ou senha inválidos.";
  }
});

btnSair.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) {
    dadosUsuarioAtual = null;
    dadosPerfilAtual = null;
    grupoAtual = null;
    sistema.classList.add("hidden");
    telaLogin.classList.remove("hidden");
    nomeUsuario.textContent = "";
    return;
  }

  try {
    const usuarioSnap = await getDoc(doc(db, "usuarios", usuario.uid));

    if (!usuarioSnap.exists()) {
      mensagemLogin.textContent = "Usuário não autorizado.";
      await signOut(auth);
      return;
    }

    const dadosUsuario = usuarioSnap.data();

    if (dadosUsuario.ativo !== true) {
      mensagemLogin.textContent = "Este usuário está desativado.";
      await signOut(auth);
      return;
    }

    const perfilSnap = await getDoc(doc(db, "perfisAcesso", dadosUsuario.perfilId));

    if (!perfilSnap.exists() || perfilSnap.data().ativo !== true) {
      mensagemLogin.textContent = "Perfil de acesso indisponível.";
      await signOut(auth);
      return;
    }

    dadosUsuarioAtual = { id: usuario.uid, ...dadosUsuario };
    dadosPerfilAtual = { id: perfilSnap.id, ...perfilSnap.data() };

    await carregarGrupoAtual();

    if (grupoAtual && grupoAtual.ativo === false) {
      mensagemLogin.textContent = "O grupo empresarial está inativo.";
      await signOut(auth);
      return;
    }

    telaLogin.classList.add("hidden");
    sistema.classList.remove("hidden");
    nomeUsuario.textContent = dadosUsuarioAtual.nome || usuario.email;
    mensagemLogin.textContent = "";

    configurarMenus();
    gerarGradePermissoes();
    abrirPagina(primeiraPaginaPermitida());

    if (perfilAdministrador()) {
      atualizarResumoAdministracao();
    }
  } catch (erro) {
    console.error("Erro de autorização:", erro);
    mensagemLogin.textContent = "Não foi possível validar seu acesso.";
    await signOut(auth);
  }
});

itensMenu.forEach((item) => {
  item.addEventListener("click", async () => {
    const pagina = item.dataset.pagina;

    if (pagina === "administracao" && !perfilAdministrador()) return;

    abrirPagina(pagina);

    if (pagina === "administracao") {
      await atualizarResumoAdministracao();
    }
  });
});

document.querySelectorAll("[data-voltar-admin]").forEach((botao) => {
  botao.addEventListener("click", async () => {
    abrirPagina("administracao");
    await atualizarResumoAdministracao();
  });
});

/* ADMINISTRAÇÃO */

cardEmpresas.addEventListener("click", async () => {
  abrirPagina("empresas");
  await carregarEmpresas();
});

cardUsuarios.addEventListener("click", async () => {
  abrirPagina("usuarios");
  await carregarUsuarios();
});

cardPerfisAcesso.addEventListener("click", async () => {
  abrirPagina("perfis");
  await carregarPerfis();
});

cardGrupoEmpresarial.addEventListener("click", async () => {
  abrirPagina("grupo");
  await carregarGrupo();
});

/* EMPRESAS */

function limparFormularioEmpresa() {
  empresaEmEdicaoId = null;
  formEmpresa.reset();
  tituloFormEmpresa.textContent = "Nova empresa";
  marcarMensagem(mensagemEmpresa, "");
}

function abrirFormularioEmpresa(empresa = null) {
  limparFormularioEmpresa();

  if (empresa) {
    empresaEmEdicaoId = empresa.id;
    tituloFormEmpresa.textContent = "Editar empresa";
    empresaRazaoSocial.value = empresa.razaoSocial || "";
    empresaNomeFantasia.value = empresa.nomeFantasia || "";
    empresaCnpj.value = empresa.cnpj || "";
  }

  formEmpresaContainer.classList.remove("hidden");
  empresaRazaoSocial.focus();
}

btnNovaEmpresa.addEventListener("click", () => abrirFormularioEmpresa());

btnCancelarEmpresa.addEventListener("click", () => {
  limparFormularioEmpresa();
  formEmpresaContainer.classList.add("hidden");
});

empresaCnpj.addEventListener("input", () => {
  empresaCnpj.value = formatarCnpj(empresaCnpj.value);
});

function renderizarEmpresas(filtro = "") {
  const termo = normalizar(filtro);

  const empresas = [...empresasCache.values()]
    .filter((empresa) => {
      if (!termo) return true;
      return [
        empresa.razaoSocial,
        empresa.nomeFantasia,
        empresa.cnpj
      ].some((valor) => normalizar(valor).includes(termo));
    })
    .sort((a, b) => String(a.nomeFantasia || a.razaoSocial).localeCompare(String(b.nomeFantasia || b.razaoSocial), "pt-BR"));

  quantidadeEmpresas.textContent = `${empresasCache.size} empresa(s) cadastrada(s)`;

  if (!empresas.length) {
    listaEmpresas.innerHTML = `<tr><td colspan="4">Nenhuma empresa encontrada.</td></tr>`;
    return;
  }

  listaEmpresas.innerHTML = empresas.map((empresa) => `
    <tr>
      <td class="celula-principal">
        <strong>${escaparHtml(empresa.nomeFantasia || empresa.razaoSocial)}</strong>
        <span>${escaparHtml(empresa.razaoSocial)}</span>
      </td>
      <td>${escaparHtml(empresa.cnpj)}</td>
      <td>
        <span class="${empresa.ativo === true ? "status-ativo" : "status-inativo"}">
          ${empresa.ativo === true ? "Ativa" : "Inativa"}
        </span>
      </td>
      <td>
        <div class="acoes-tabela">
          <button class="btn-acao destaque" data-empresa-editar="${empresa.id}" type="button">Editar</button>
          <button class="btn-acao" data-empresa-status="${empresa.id}" type="button">
            ${empresa.ativo === true ? "Inativar" : "Reativar"}
          </button>
          <button class="btn-acao perigo" data-empresa-excluir="${empresa.id}" type="button">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-empresa-editar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      abrirFormularioEmpresa(empresasCache.get(botao.dataset.empresaEditar));
    });
  });

  document.querySelectorAll("[data-empresa-status]").forEach((botao) => {
    botao.addEventListener("click", () => alterarStatusEmpresa(botao.dataset.empresaStatus));
  });

  document.querySelectorAll("[data-empresa-excluir]").forEach((botao) => {
    botao.addEventListener("click", () => prepararExclusaoEmpresa(botao.dataset.empresaExcluir));
  });
}

async function carregarEmpresas() {
  listaEmpresas.innerHTML = `<tr><td colspan="4">Carregando empresas...</td></tr>`;

  try {
    await carregarColecoesAdministrativas();
    renderizarEmpresas(buscaEmpresa.value);
  } catch (erro) {
    console.error("Erro ao carregar empresas:", erro);
    listaEmpresas.innerHTML = `<tr><td colspan="4">Não foi possível carregar as empresas.</td></tr>`;
  }
}

buscaEmpresa.addEventListener("input", () => renderizarEmpresas(buscaEmpresa.value));

formEmpresa.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const razaoSocial = empresaRazaoSocial.value.trim();
  const nomeFantasia = empresaNomeFantasia.value.trim();
  const cnpj = formatarCnpj(empresaCnpj.value);
  const cnpjNumeros = cnpj.replace(/\D/g, "");

  if (!cnpjValido(cnpj)) {
    marcarMensagem(mensagemEmpresa, "Informe um CNPJ válido.");
    empresaCnpj.focus();
    return;
  }

  const duplicada = [...empresasCache.values()].some((empresa) => {
    if (empresa.id === empresaEmEdicaoId) return false;
    return String(empresa.cnpj || "").replace(/\D/g, "") === cnpjNumeros;
  });

  if (duplicada) {
    marcarMensagem(mensagemEmpresa, "Já existe uma empresa com este CNPJ.");
    return;
  }

  if (!dadosUsuarioAtual?.grupoId) {
    marcarMensagem(mensagemEmpresa, "Seu usuário não está vinculado a um grupo empresarial.");
    return;
  }

  marcarMensagem(mensagemEmpresa, "Salvando...");

  const dados = {
    razaoSocial,
    nomeFantasia,
    cnpj,
    cnpjNumeros,
    grupoId: dadosUsuarioAtual.grupoId,
    atualizadoEm: serverTimestamp()
  };

  try {
    if (empresaEmEdicaoId) {
      await updateDoc(doc(db, "empresas", empresaEmEdicaoId), dados);
      marcarMensagem(mensagemEmpresa, "Empresa atualizada com sucesso.", true);
    } else {
      await addDoc(collection(db, "empresas"), {
        ...dados,
        ativo: true,
        criadoEm: serverTimestamp()
      });
      marcarMensagem(mensagemEmpresa, "Empresa cadastrada com sucesso.", true);
    }

    await carregarEmpresas();
    await atualizarResumoAdministracao();

    setTimeout(() => {
      limparFormularioEmpresa();
      formEmpresaContainer.classList.add("hidden");
    }, 700);
  } catch (erro) {
    console.error("Erro ao salvar empresa:", erro);
    marcarMensagem(mensagemEmpresa, "Não foi possível salvar a empresa.");
  }
});

async function alterarStatusEmpresa(empresaId) {
  const empresa = empresasCache.get(empresaId);
  if (!empresa) return;

  const novoStatus = empresa.ativo !== true;
  const acao = novoStatus ? "reativar" : "inativar";

  if (!window.confirm(`Deseja ${acao} ${empresa.nomeFantasia || empresa.razaoSocial}?`)) return;

  try {
    await updateDoc(doc(db, "empresas", empresaId), {
      ativo: novoStatus,
      atualizadoEm: serverTimestamp()
    });

    await carregarEmpresas();
    await atualizarResumoAdministracao();
  } catch (erro) {
    console.error("Erro ao alterar status da empresa:", erro);
    alert("Não foi possível alterar o status da empresa.");
  }
}

function empresaPossuiVinculos(empresaId) {
  const vinculadaAUsuario = [...usuariosCache.values()].some((usuario) =>
    usuario.empresaId === empresaId ||
    (Array.isArray(usuario.empresasAcesso) && usuario.empresasAcesso.includes(empresaId))
  );

  const empresa = empresasCache.get(empresaId);
  const possuiHistoricoSinalizado =
    empresa?.possuiMovimento === true ||
    Number(empresa?.movimentosCount || 0) > 0;

  return vinculadaAUsuario || possuiHistoricoSinalizado;
}

async function prepararExclusaoEmpresa(empresaId) {
  try {
    await carregarColecoesAdministrativas();

    if (empresaPossuiVinculos(empresaId)) {
      alert("Esta empresa possui usuários vinculados ou histórico registrado e não pode ser excluída. Use Inativar.");
      return;
    }

    const empresa = empresasCache.get(empresaId);
    if (!empresa) return;

    empresaParaExcluir = empresa;
    nomeEmpresaExcluir.textContent = empresa.nomeFantasia || empresa.razaoSocial;
    senhaExclusaoEmpresa.value = "";
    marcarMensagem(mensagemExclusaoEmpresa, "");
    modalExcluirEmpresa.classList.remove("hidden");

    setTimeout(() => senhaExclusaoEmpresa.focus(), 30);
  } catch (erro) {
    console.error("Erro ao preparar exclusão:", erro);
    alert("Não foi possível verificar os vínculos da empresa.");
  }
}

function fecharModalExclusaoEmpresa() {
  empresaParaExcluir = null;
  formConfirmarExclusaoEmpresa.reset();
  marcarMensagem(mensagemExclusaoEmpresa, "");
  modalExcluirEmpresa.classList.add("hidden");
}

btnCancelarExclusaoEmpresa.addEventListener("click", fecharModalExclusaoEmpresa);

modalExcluirEmpresa.addEventListener("click", (evento) => {
  if (evento.target === modalExcluirEmpresa) fecharModalExclusaoEmpresa();
});

formConfirmarExclusaoEmpresa.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!empresaParaExcluir || !auth.currentUser?.email) return;

  marcarMensagem(mensagemExclusaoEmpresa, "Validando administrador...");

  try {
    await carregarColecoesAdministrativas();

    if (empresaPossuiVinculos(empresaParaExcluir.id)) {
      marcarMensagem(mensagemExclusaoEmpresa, "A empresa possui vínculo e não pode mais ser excluída.");
      return;
    }

    const credencial = EmailAuthProvider.credential(
      auth.currentUser.email,
      senhaExclusaoEmpresa.value
    );

    await reauthenticateWithCredential(auth.currentUser, credencial);
    await deleteDoc(doc(db, "empresas", empresaParaExcluir.id));

    fecharModalExclusaoEmpresa();
    await carregarEmpresas();
    await atualizarResumoAdministracao();
    alert("Empresa excluída permanentemente.");
  } catch (erro) {
    console.error("Erro ao excluir empresa:", erro);

    if (["auth/invalid-credential", "auth/wrong-password"].includes(erro.code)) {
      marcarMensagem(mensagemExclusaoEmpresa, "Senha incorreta.");
      senhaExclusaoEmpresa.select();
      return;
    }

    marcarMensagem(mensagemExclusaoEmpresa, "Não foi possível concluir a exclusão.");
  }
});

/* USUÁRIOS */

function perfisAtivosParaSelecao() {
  return [...perfisCache.values()]
    .filter((perfil) => perfil.ativo === true)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

function empresasAtivasParaSelecao() {
  return [...empresasCache.values()]
    .filter((empresa) => empresa.ativo === true)
    .sort((a, b) => String(a.nomeFantasia || a.razaoSocial).localeCompare(String(b.nomeFantasia || b.razaoSocial), "pt-BR"));
}

function preencherSelectsUsuario() {
  const empresas = empresasAtivasParaSelecao();
  const perfis = perfisAtivosParaSelecao();

  usuarioEmpresaPrincipal.innerHTML =
    `<option value="">Selecione...</option>` +
    empresas.map((empresa) => `
      <option value="${empresa.id}">${escaparHtml(empresa.nomeFantasia || empresa.razaoSocial)}</option>
    `).join("");

  usuarioPerfil.innerHTML =
    `<option value="">Selecione...</option>` +
    perfis.map((perfil) => `
      <option value="${perfil.id}">${escaparHtml(perfil.nome || perfil.id)}</option>
    `).join("");

  listaEmpresasAcesso.innerHTML = empresas.map((empresa) => `
    <label class="checkbox-card">
      <input type="checkbox" class="checkbox-empresa-acesso" value="${empresa.id}">
      <span>${escaparHtml(empresa.nomeFantasia || empresa.razaoSocial)}</span>
    </label>
  `).join("");
}

function sincronizarEmpresaPrincipalNosAcessos() {
  const principal = usuarioEmpresaPrincipal.value;
  if (!principal) return;

  const checkbox = document.querySelector(`.checkbox-empresa-acesso[value="${principal}"]`);
  if (checkbox) checkbox.checked = true;
}

function atualizarEstadoEmpresasAcesso() {
  const global = usuarioAcessoGlobal.checked;

  document.querySelectorAll(".checkbox-empresa-acesso").forEach((checkbox) => {
    checkbox.disabled = global;
  });

  listaEmpresasAcesso.style.opacity = global ? "0.55" : "1";
}

usuarioEmpresaPrincipal.addEventListener("change", sincronizarEmpresaPrincipalNosAcessos);
usuarioAcessoGlobal.addEventListener("change", atualizarEstadoEmpresasAcesso);

function limparFormularioUsuario() {
  usuarioEmEdicaoId = null;
  formUsuario.reset();
  usuarioEmail.disabled = false;
  usuarioSenha.required = false;
  campoSenhaNovoUsuario.classList.remove("hidden");
  tituloFormUsuario.textContent = "Novo usuário";
  descricaoFormUsuario.textContent = "Crie o acesso e vincule perfil e empresas.";
  marcarMensagem(mensagemUsuario, "");
  preencherSelectsUsuario();
  atualizarEstadoEmpresasAcesso();
}

function abrirFormularioUsuario(usuario = null) {
  limparFormularioUsuario();

  if (usuario) {
    usuarioEmEdicaoId = usuario.id;
    tituloFormUsuario.textContent = "Editar usuário";
    descricaoFormUsuario.textContent = "A conta de autenticação permanece vinculada ao e-mail atual.";
    campoSenhaNovoUsuario.classList.add("hidden");
    usuarioEmail.disabled = true;

    usuarioNome.value = usuario.nome || "";
    usuarioEmail.value = usuario.email || "";
    usuarioPerfil.value = usuario.perfilId || "";
    usuarioEmpresaPrincipal.value = usuario.empresaId || "";
    usuarioAcessoGlobal.checked = usuario.acessoGlobal === true;

    const acessos = new Set(
      Array.isArray(usuario.empresasAcesso)
        ? usuario.empresasAcesso
        : usuario.empresaId
          ? [usuario.empresaId]
          : []
    );

    document.querySelectorAll(".checkbox-empresa-acesso").forEach((checkbox) => {
      checkbox.checked = acessos.has(checkbox.value);
    });

    sincronizarEmpresaPrincipalNosAcessos();
    atualizarEstadoEmpresasAcesso();
  } else {
    usuarioSenha.required = true;
  }

  formUsuarioContainer.classList.remove("hidden");
  usuarioNome.focus();
}

btnNovoUsuario.addEventListener("click", async () => {
  await carregarColecoesAdministrativas();
  abrirFormularioUsuario();
});

btnCancelarUsuario.addEventListener("click", () => {
  limparFormularioUsuario();
  formUsuarioContainer.classList.add("hidden");
});

function nomeEmpresaPorId(id) {
  const empresa = empresasCache.get(id);
  return empresa?.nomeFantasia || empresa?.razaoSocial || "-";
}

function nomePerfilPorId(id) {
  const perfil = perfisCache.get(id);
  return perfil?.nome || id || "-";
}

function renderizarUsuarios(filtro = "") {
  const termo = normalizar(filtro);

  const usuarios = [...usuariosCache.values()]
    .filter((usuario) => {
      if (!termo) return true;
      return [usuario.nome, usuario.email].some((valor) => normalizar(valor).includes(termo));
    })
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  quantidadeUsuarios.textContent = `${usuariosCache.size} usuário(s) cadastrado(s)`;

  if (!usuarios.length) {
    listaUsuarios.innerHTML = `<tr><td colspan="6">Nenhum usuário encontrado.</td></tr>`;
    return;
  }

  listaUsuarios.innerHTML = usuarios.map((usuario) => {
    const proprioUsuario = auth.currentUser?.uid === usuario.id;
    const qtdEmpresas = usuario.acessoGlobal === true
      ? "Grupo completo"
      : `${new Set([usuario.empresaId, ...(usuario.empresasAcesso || [])].filter(Boolean)).size} empresa(s)`;

    return `
      <tr>
        <td class="celula-principal">
          <strong>${escaparHtml(usuario.nome)}</strong>
          <span>${escaparHtml(usuario.email)}</span>
        </td>
        <td>${escaparHtml(nomeEmpresaPorId(usuario.empresaId))}</td>
        <td>${escaparHtml(nomePerfilPorId(usuario.perfilId))}</td>
        <td>${escaparHtml(qtdEmpresas)}</td>
        <td>
          <span class="${usuario.ativo === true ? "status-ativo" : "status-inativo"}">
            ${usuario.ativo === true ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td>
          ${
            proprioUsuario
              ? `
                <div class="acoes-tabela">
                  <span class="acao-propria">Usuário atual</span>
                  <button class="btn-acao" data-usuario-reset="${usuario.id}" type="button">Redefinir senha</button>
                </div>
              `
              : `
                <div class="acoes-tabela">
                  <button class="btn-acao destaque" data-usuario-editar="${usuario.id}" type="button">Editar</button>
                  <button class="btn-acao" data-usuario-status="${usuario.id}" type="button">
                    ${usuario.ativo === true ? "Desativar" : "Ativar"}
                  </button>
                  <button class="btn-acao" data-usuario-reset="${usuario.id}" type="button">Redefinir senha</button>
                </div>
              `
          }
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-usuario-editar]").forEach((botao) => {
    botao.addEventListener("click", () => {
      abrirFormularioUsuario(usuariosCache.get(botao.dataset.usuarioEditar));
    });
  });

  document.querySelectorAll("[data-usuario-status]").forEach((botao) => {
    botao.addEventListener("click", () => alterarStatusUsuario(botao.dataset.usuarioStatus));
  });

  document.querySelectorAll("[data-usuario-reset]").forEach((botao) => {
    botao.addEventListener("click", () => enviarRedefinicaoSenha(botao.dataset.usuarioReset));
  });
}

async function carregarUsuarios() {
  listaUsuarios.innerHTML = `<tr><td colspan="6">Carregando usuários...</td></tr>`;

  try {
    await carregarColecoesAdministrativas();
    preencherSelectsUsuario();
    renderizarUsuarios(buscaUsuario.value);
  } catch (erro) {
    console.error("Erro ao carregar usuários:", erro);
    listaUsuarios.innerHTML = `<tr><td colspan="6">Não foi possível carregar os usuários.</td></tr>`;
  }
}

buscaUsuario.addEventListener("input", () => renderizarUsuarios(buscaUsuario.value));

function obterEmpresasSelecionadas() {
  return [...document.querySelectorAll(".checkbox-empresa-acesso:checked")]
    .map((checkbox) => checkbox.value);
}

formUsuario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = usuarioNome.value.trim();
  const emailInformado = usuarioEmail.value.trim().toLowerCase();
  const perfilId = usuarioPerfil.value;
  const empresaId = usuarioEmpresaPrincipal.value;
  const acessoGlobal = usuarioAcessoGlobal.checked;

  sincronizarEmpresaPrincipalNosAcessos();

  let empresasAcesso = obterEmpresasSelecionadas();
  if (empresaId && !empresasAcesso.includes(empresaId)) empresasAcesso.push(empresaId);

  if (!acessoGlobal && empresasAcesso.length === 0) {
    marcarMensagem(mensagemUsuario, "Selecione ao menos uma empresa permitida.");
    return;
  }

  if (!perfilId || !empresaId) {
    marcarMensagem(mensagemUsuario, "Selecione o perfil e a empresa principal.");
    return;
  }

  try {
    if (usuarioEmEdicaoId) {
      marcarMensagem(mensagemUsuario, "Salvando alterações...");

      await updateDoc(doc(db, "usuarios", usuarioEmEdicaoId), {
        nome,
        perfilId,
        empresaId,
        acessoGlobal,
        empresasAcesso,
        atualizadoEm: serverTimestamp()
      });

      marcarMensagem(mensagemUsuario, "Usuário atualizado com sucesso.", true);
    } else {
      if (usuarioSenha.value.length < 6) {
        marcarMensagem(mensagemUsuario, "A senha inicial precisa ter pelo menos 6 caracteres.");
        return;
      }

      const emailDuplicado = [...usuariosCache.values()]
        .some((usuario) => normalizar(usuario.email) === normalizar(emailInformado));

      if (emailDuplicado) {
        marcarMensagem(mensagemUsuario, "Já existe um usuário cadastrado com este e-mail.");
        return;
      }

      marcarMensagem(mensagemUsuario, "Criando acesso...");

      let credencialNova = null;

      try {
        credencialNova = await createUserWithEmailAndPassword(
          authCriacaoUsuarios,
          emailInformado,
          usuarioSenha.value
        );

        await setDoc(doc(db, "usuarios", credencialNova.user.uid), {
          nome,
          email: emailInformado,
          perfilId,
          empresaId,
          empresasAcesso,
          acessoGlobal,
          grupoId: dadosUsuarioAtual.grupoId,
          ativo: true,
          criadoEm: serverTimestamp()
        });
      } catch (erroCriacao) {
        if (credencialNova?.user) {
          try {
            await deleteUser(credencialNova.user);
          } catch (erroRollback) {
            console.error("Falha ao desfazer usuário de autenticação:", erroRollback);
          }
        }

        throw erroCriacao;
      } finally {
        try {
          await signOut(authCriacaoUsuarios);
        } catch {
          // Nada a fazer.
        }
      }

      marcarMensagem(mensagemUsuario, "Usuário criado com sucesso.", true);
    }

    await carregarUsuarios();
    await atualizarResumoAdministracao();

    setTimeout(() => {
      limparFormularioUsuario();
      formUsuarioContainer.classList.add("hidden");
    }, 800);
  } catch (erro) {
    console.error("Erro ao salvar usuário:", erro);

    const mensagens = {
      "auth/email-already-in-use": "Este e-mail já possui uma conta no Firebase Authentication.",
      "auth/invalid-email": "O e-mail informado é inválido.",
      "auth/weak-password": "A senha inicial é muito fraca."
    };

    marcarMensagem(
      mensagemUsuario,
      mensagens[erro.code] || "Não foi possível salvar o usuário."
    );
  }
});

async function alterarStatusUsuario(usuarioId) {
  const usuario = usuariosCache.get(usuarioId);
  if (!usuario || auth.currentUser?.uid === usuarioId) return;

  const novoStatus = usuario.ativo !== true;

  if (!window.confirm(`${novoStatus ? "Ativar" : "Desativar"} ${usuario.nome || usuario.email}?`)) return;

  try {
    await updateDoc(doc(db, "usuarios", usuarioId), {
      ativo: novoStatus,
      atualizadoEm: serverTimestamp()
    });

    await carregarUsuarios();
    await atualizarResumoAdministracao();
  } catch (erro) {
    console.error("Erro ao alterar status do usuário:", erro);
    alert("Não foi possível alterar o status do usuário.");
  }
}

async function enviarRedefinicaoSenha(usuarioId) {
  const usuario = usuariosCache.get(usuarioId);
  if (!usuario/.email) return;

  if (!window.confirm(`Enviar e-mail de redefinirção de senha para ${usuario.email}?`)) return;

  try {
    await sendPasswordResetEmail(auth, usuario.email);
    alert("E-mail de redefinição enviado.");
  } catch (erro) {
    console.error("Erro ao enviar redefinirção:", erro);
    alert("Não foi possível enviar a redefinição de senha.");
  }
}

/* PERFIS */

function gerarGradePermissoes() {
  gradePermissoesPerfil.innerHTML = DEFINICAO_PERMISSOES.map((definicao) => `
    <div class="permissao-modulo">
      <div class="permissao-modulo_titulo">${escaparHtml(definicao.nome)}</div>
      <div class="permissao-acoes">
        ${definicao.acoes.map((acao) => `
          <label class="permissao-opcao">
            <input
              type="checkbox"
              class="checkbox-permissao"
              data-modulo="${definicao.modulo}"
              data-acao="${acao.id}"
            >
            <span>${escaparHtml(acao.nome)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function limparFormularioPerfil() {
  perfilEmEdicaoId = null;
  formPerfil.reset();
  tituloFormPerfil.textContent = "Novo perfil";
  marcarMensagem(mensagemPerfil, "");

  document.querySelectorAll(".checkbox-permissao").forEach((checkbox) => {
    checkbox.checked = false;
  });

  const dashboard = document.querySelector(
    '.checkbox-permissao[data-modulo="dashboard"][data-acao="visualizar"]'
  );

  if (dashboard) dashboard.checked = true;
}

function coletarPermissoes() {
  const permissoes = {};

  DEFINICAO_PERMISSOES.forEach((definicao) => {
    permissoes[definicao.modulo] = {};

    definicao.acoes.forEach((acao) => {
      const checkbox = document.querySelector(
        `.checkbox-permissao[data-modulo="${definicao.modulo}"][data-acao="${acao.id}"]`
      );

      permissoes[definicao.modulo][acao.id] = checkbox?.checked === true;
    });
  });

  return permissoes;
}

function preencherPermissoes(permissoes = {}) {
  document.querySelectorAll(".checkbox-permissao").forEach((checkbox) => {
    checkbox.checked = permissoes?.[checkbox.dataset.modulo]?.[checkbox.dataset.acao] === true;
  });
}

function contarPermissoes(permissoes = {}) {
  return Object.values(permissoes).reduce((total, acoes) => {
    if (!acoes || typeof acoes !== "object") return total;
    return total + Object.values(acoes).filter((valor) => valor === true).length;
  }, 0);
}

function usuariosDoPerfil(perfilId) {
  return [...usuariosCache.values()].filter((usuario) => usuario.perfilId === perfilId);
}

function renderizarPerfis(filtro = "") {
  const termo = normalizar(filtro);

  const perfis = [...perfisCache.values()]
    .filter((perfil) => !termo || normalizar(perfil.nome).includes(termo))
    .sort((a, b) => {
      if (a.acessoTotal === true) return -1;
      if (b.acessoTotal === true) return 1;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });

  quantidadePerfis.textContent = `${perfisCache.size} perfil(is) cadastrado(s)`;

  if (!perfis.length) {
    listaPerfis.innerHTML = `<tr><td colspan="6">Nenhum perfil encontrado.</td></tr>`;
    return;
  }

  listaPerfis.innerHTML = perfis.map((perfil) => {
    const protegido = perfil.acessoTotal === true || perfil.id === "administrador";
    const qtdUsuarios = usuariosDoPerfil(perfil.id).length;

    return `
      <tr>
        <td class="celula-principal">
          <strong>${escaparHtml(perfil.nome || perfil.id)}</strong>
          <span>${escaparHtml(perfil.descricao || "Sem descrição")}</span>
        </td>
        <td>${perfil.acessoTotal === true ? '<span class="selo-sistema">Sistema</span>' : "Personalizado"}</td>
        <td>${perfil.acessoTotal === true ? "Todas" : `${contarPermissoes(perfil.permissoes)} ativa(s)`}</td>
        <td>${qtdUsuarios}</td>
        <td>
          <span class="${perfil.ativo === true ? "status-ativo" : "status-inativo"}">
            ${perfil.ativo === true ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td>
          ${
            protegido
              ? '<span class="acao-propria">Protegido</span>'
              : `
                <div class="acoes-tabela">
                  <button class="btn-acao destaque" data-perfil-editar="${perfil.id}" type="button">Editar</button>
                  <button class="btn-acao" data-perfil-status="${perfil.id}" type="button">
                    ${perfil.ativo === true ? "Inativar" : "Reativar"}
                  </button>
                </div>
              `
          }
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-perfil-editar]").forEach((botao) => {
    botao.addEventListener("click", () => abrirFormularioPerfil(perfisCache.get(botao.dataset.perfilEditar)));
  });

  document.querySelectorAll("[data-perfil-status]").forEach((botao) => {
    botao.addEventListener("click", () => alterarStatusPerfil(botao.dataset.perfilStatus));
  });
}

async function carregarPerfis() {
  listaPerfis.innerHTML = `<tr><td colspan="6">Carregando perfis...</td></tr>`;

  try {
    await carregarColecoesAdministrativas();
    renderizarPerfis(buscaPerfil.value));
  } catch (erro) {
    console.error("Erro ao carregar perfis:", erro);
    listaPerfis.innerHTML = `<tr><td colspan="6">Não foi possível carregar os perfis.</td></tr>`;
  }
}

buscaPerfil.addEventListener("input", () => renderizarPerfis(buscaPerfil.value));

function abrirFormularioPerfil(perfil = null) {
  limparFormularioPerfil();

  if (perfil) {
    perfilEmEdicaoId = perfil.id;
    tituloFormPerfil.textContent = "Editar perfil";
    perfilNome.value = perfil.nome || "";
    perfilDescricao.value = perfil.descricao || "";
    preencherPermissoes(perfil.permissoes || {});
  }

  formPerfilContainer.classList.remove("hidden");
  perfilNome.focus();
}

btnNovoPerfil.addEventListener("click", () => abrirFormularioPerfil());

btnCancelarPerfil.addEventListener("click", () => {
  limparFormularioPerfil();
  formPerfilContainer.classList.add("hidden");
});

formPerfil.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = perfilNome.value.trim();
  const descricao = perfilDescricao.value.trim();
  const permissoes = coletarPermissoes();

  const nomeDuplicado = [...perfisCache.values()].some((perfil) => {
    if (perfil.id === perfilEmEdicaoId) return false;
    return normalizar(perfil.nome) === normalizar(nome);
  });

  if (nomeDuplicado) {
    marcarMensagem(mensagemPerfil, "Já existe um perfil com este nome.");
    return;
  }

  try {
    marcarMensagem(mensagemPerfil, "Salvando...");

    if (perfilEmEdicaoId) {
      const perfil = perfisCache.get(perfilEmEdicaoId);

      if (perfil?.acessoTotal === true || perfilEmEdicaoId === "administrador") {
        marcarMensagem(mensagemPerfil, "O perfil Administrador é protegido.");
        return;
      }

      await updateDoc(doc(db, "perfisAcesso", perfilEmEdicaoId), {
        nome,
        descricao,
        permissoes,
        atualizadoEm: serverTimestamp()
      });

      marcarMensagem(mensagemPerfil, "Perfil atualizado com sucesso.", true);
    } else {
      await addDoc(collection(db, "perfisAcesso"), {
        nome,
        descricao,
        grupoId: dadosUsuarioAtual.grupoId,
        acessoTotal: false,
        ativo: true,
        permissoes,
        criadoEm: serverTimestamp()
      });

      marcarMensagem(mensagemPerfil, "Perfil criado com sucesso.", true);
    }

    await carregarPerfis();
    await atualizarResumoAdministracao();

    setTimeout(() => {
      limparFormularioPerfil();
      formPerfilContainer.classList.add("hidden");
    }, 700);
  } catch (erro) {
    console.error("Erro ao salvar perfil:", erro);
    marcarMensagem(mensagemPerfil, "Não foi possível salvar o perfil.");
  }
});

async function alterarStatusPerfil(perfilId) {
  const perfil = perfisCache.get(perfilId);
  if (!perfil || perfil.acessoTotal === true || perfilId === "administrador") return;

  const novoStatus = perfil.ativo !== true;

  if (!novoStatus) {
    const usuariosAtivos = usuariosDoPerfil(perfilId).filter((usuario) => usuario.ativo === true);

    if (usuariosAtivos.length) {
      alert("Este perfil possui usuários ativos. Altere o perfil desses usuários antes de inativá-lo.");
      return;
    }
  }

  if (!window.confirm(`${novoStatus ? "Reativar" : "Inativar"} o perfil ${perfil.nome}?`)) return;

  try {
    await updateDoc(doc(db, "perfisAcesso", perfilId), {
      ativo: novoStatus,
      atualizadoEm: serverTimestamp()
    });

    await carregarPerfis();
    await atualizarResumoAdministracao();
  } catch (erro) {
    console.error("Erro ao alterar status do perfil:", erro);
    alert("Não foi possível alterar o perfil.");
  }
}

/* GRUPO EMPRESARIAL */

async function carregarGrupo() {
  try {
    await carregarGrupoAtual();
    await carregarColecoesAdministrativas();

    if (!grupoAtual) {
      grupoIdExibicao.value = dadosUsuarioAtual?.grupoId || "";
      grupoNome.value = "";
      grupoNomeResumo.textContent = "Grupo não encontrado";
      grupoStatus.innerHTML = '<span class="status-aviso">Não encontrado</span>';
      marcarMensagem(mensagemGrupo, "O documento do grupo não foi localizado.");
      return;
    }

    grupoIdExibicao.value = grupoAtual.id;
    grupoNome.value = grupoAtual.nome || "";
    grupoNomeResumo.textContent = grupoAtual.nome || "Grupo empresarial";
    grupoStatus.innerHTML = `
      <span class="${grupoAtual.ativo === true ? "status-ativo" : "status-inativo"}">
        ${grupoAtual.ativo === true ? "Ativo" : "Inativo"}
      </span>
    `;

    grupoQtdEmpresas.textContent = empresasCache.size;
    grupoQtdUsuarios.textContent = usuariosCache.size;
    grupoQtdPerfis.textContent = perfisCache.size;
    marcarMensagem(mensagemGrupo, "");
  } catch (erro) {
    console.error("Erro ao carregar grupo:", erro);
    marcarMensagem(mensagemGrupo, "Não foi possível carregar o grupo empresarial.");
  }
}

formGrupo.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!grupoAtual?.id) {
    marcarMensagem(mensagemGrupo, "Grupo empresarial não encontrado.");
    return;
  }

  const nome = grupoNome.value.trim();

  if (!nome) {
    marcarMensagem(mensagemGrupo, "Informe o nome do grupo.");
    return;
  }

  try {
    marcarMensagem(mensagemGrupo, "Salvando...");

    await updateDoc(doc(db, "gruposEmpresariais", grupoAtual.id), {
      nome,
      atualizadoEm: serverTimestamp()
    });

    await carregarGrupoAtual();
    subtituloContexto.textContent = grupoAtual?.nome || "Sistema Integrado de Gestão";
    await carregarGrupo();
    marcarMensagem(mensagemGrupo, "Grupo atualizado com sucesso.", true);
  } catch (erro) {
    console.error("Erro ao salvar grupo:", erro);
    marcarMensagem(mensagemGrupo, "Não foi possível salvar o grupo.");
  }
});
