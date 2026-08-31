import { $, permite } from "./core.js";

const fpa=acao=>permite("controladoria","editar")||permite("controladoria",acao);
const fixo=[
 ["btnNovoContrato",()=>permite("contratos","cadastrar")],
 ["btnNovoPrestador",()=>permite("prestadores","cadastrar")],
 ["btnNovoVeiculo",()=>permite("frota","cadastrar")],
 ["btnNovoItem",()=>permite("almoxarifado","cadastrar")],
 ["btnMovimentarEstoque",()=>permite("almoxarifado","movimentar")],
 ["btnNovaCotacao",()=>permite("cotacoes","solicitar")],
 ["btnSalvarRealizado",()=>fpa("realizado")||permite("controladoria","importar")],
 ["btnSalvarBudget",()=>fpa("budget")],
 ["btnAplicarTodasPremissas",()=>fpa("budget")],
 ["btnSalvarForecast",()=>fpa("forecast")],
 ["btnNovaPremissa",()=>fpa("premissas")],
 ["btnNovoBemV1",()=>fpa("imobilizado")],
 ["btnNovaContaGerencial",()=>fpa("planoContas")],
 ["btnNovoCentroCusto",()=>fpa("centrosCusto")],
 ["btnContaBancaria",()=>fpa("caixaContas")],
 ["btnNovoLancamentoCaixa",()=>fpa("caixaLancar")],
 ["btnNovaProvisao",()=>fpa("caixaLancar")],
 ["btnNovoFixo",()=>fpa("caixaFixos")],
 ["btnGerarProvisoesFixas",()=>fpa("caixaFixos")],
 ["btnSalvarPrestacao",()=>fpa("prestacaoComentar")],
 ["btnGerarPrestacaoPdf",()=>fpa("prestacao")],
 ["btnNovaEmpresa",()=>permite("empresas","cadastrar")],
 ["btnNovoUsuario",()=>permite("usuarios","cadastrar")],
 ["btnNovoPerfil",()=>permite("perfisAcesso","cadastrar")],
 ["cardEmpresas",()=>permite("empresas","visualizar")],
 ["cardUsuarios",()=>permite("usuarios","visualizar")],
 ["cardPerfisAcesso",()=>permite("perfisAcesso","visualizar")],
 ["cardGrupoEmpresarial",()=>permite("grupoEmpresarial","visualizar")]
];
function exibir(el,pode){el?.classList.toggle("hidden",!pode)}
function aplicar(){
 fixo.forEach(([id,fn])=>exibir($(id),fn()));
 document.querySelectorAll("[data-ee]").forEach(e=>exibir(e,permite("empresas","editar")));
 document.querySelectorAll("[data-es]").forEach(e=>exibir(e,permite("empresas","inativar")));
 document.querySelectorAll("[data-ex]").forEach(e=>exibir(e,permite("empresas","excluir")));
 document.querySelectorAll("[data-ue]").forEach(e=>exibir(e,permite("usuarios","editar")));
 document.querySelectorAll("[data-us]").forEach(e=>exibir(e,permite("usuarios","inativar")));
 document.querySelectorAll("[data-ur]").forEach(e=>exibir(e,permite("usuarios","resetarSenha")));
 document.querySelectorAll("[data-pe]").forEach(e=>exibir(e,permite("perfisAcesso","editar")));
 document.querySelectorAll("[data-ps]").forEach(e=>exibir(e,permite("perfisAcesso","inativar")));
 document.querySelectorAll("[data-edit-conta]").forEach(e=>exibir(e,fpa("planoContas")));
 document.querySelectorAll("[data-edit-centro]").forEach(e=>exibir(e,fpa("centrosCusto")));
 document.querySelectorAll("[data-edit-premissa]").forEach(e=>exibir(e,fpa("premissas")));
 document.querySelectorAll("[data-edit-bem]").forEach(e=>exibir(e,fpa("imobilizado")));
 document.querySelectorAll("[data-edit-lanc-caixa]").forEach(e=>exibir(e,fpa("caixaLancar")));
 document.querySelectorAll("[data-edit-conta-caixa]").forEach(e=>{e.disabled=!fpa("caixaContas");e.setAttribute("aria-disabled",String(!fpa("caixaContas")))});
 document.querySelectorAll("[data-edit-fixo]").forEach(e=>{e.disabled=!fpa("caixaFixos");e.setAttribute("aria-disabled",String(!fpa("caixaFixos")))});
 const tabCaixa=$("tabFluxoCaixa");if(tabCaixa)exibir(tabCaixa,fpa("caixaVisualizar")||fpa("caixaLancar")||fpa("caixaContas")||fpa("caixaFixos"));
 const tabPrest=$("tabPrestacaoContas");if(tabPrest)exibir(tabPrest,fpa("prestacao")||fpa("prestacaoComentar"));
 document.querySelectorAll("[data-prestacao-comentario]").forEach(e=>e.disabled=!fpa("prestacaoComentar"));
 const salvarGrupo=$("formGrupo")?.querySelector('button[type="submit"]');if(salvarGrupo)exibir(salvarGrupo,permite("grupoEmpresarial","editar"));
}
let timer;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(aplicar,20)});const sistema=$("sistema");if(sistema)obs.observe(sistema,{subtree:true,childList:true});
window.addEventListener("sig:ready",aplicar);window.addEventListener("sig:page",aplicar);window.addEventListener("sig:empresa-changed",aplicar);aplicar();