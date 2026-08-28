import { $, permite, admin } from "./core.js";

const fixo=[
 ["btnNovoContrato",()=>permite("contratos","cadastrar")],
 ["btnNovoPrestador",()=>permite("prestadores","cadastrar")],
 ["btnNovoVeiculo",()=>permite("frota","cadastrar")],
 ["btnNovoItem",()=>permite("almoxarifado","cadastrar")],
 ["btnMovimentarEstoque",()=>permite("almoxarifado","movimentar")],
 ["btnNovaCotacao",()=>permite("cotacoes","solicitar")],
 ["btnNovaLinhaGerencial",()=>permite("controladoria","editar")||permite("controladoria","budget")||permite("controladoria","forecast")||permite("controladoria","importar")],
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
 const salvarGrupo=$("formGrupo")?.querySelector('button[type="submit"]');if(salvarGrupo)exibir(salvarGrupo,permite("grupoEmpresarial","editar"));
}
let timer;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(aplicar,20)});const sistema=$("sistema");if(sistema)obs.observe(sistema,{subtree:true,childList:true});
window.addEventListener("sig:ready",aplicar);window.addEventListener("sig:page",aplicar);aplicar();
