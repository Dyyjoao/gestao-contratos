import { $, abrirPagina, permite, admin, state } from "./core.js";
import { empresasSelecionadasIds } from "./shared.js";

const modulos=new Map();const MODULO_VERSAO="20260901consorcios1";
function paginaControladoria(){return $("pagina-controladoria")}
function esconderTabsInternas(){const t=paginaControladoria()?.querySelector(".fpa-tabs");if(t)t.style.display="none"}
function prepararShellCompartilhado(){const p=paginaControladoria();if(!p)return false;if(!p.querySelector(".fpa-tabs"))p.innerHTML='<nav class="fpa-tabs" aria-label="Áreas internas da Controladoria"></nav>';esconderTabsInternas();return true}
function marcarAtivo(chave){document.querySelectorAll(".ctrl-subitem").forEach(b=>b.classList.toggle("ativo",b.dataset.ctrl===chave));$("menuControladoria")?.classList.add("ativo")}
function nomeModulo(chave){return({dre:"DRE Gerencial",balanco:"Balanço Patrimonial",input:"Input Mensal",budget:"Budget",forecast:"Forecast",caixa:"Fluxo de Caixa",prestacao:"Prestação de Contas",fechamento:"Cockpit de Fechamento",permutas:"Permutas",premissas:"Premissas",imobilizado:"Imobilizado & CAPEX",consorcios:"Consórcios",plano:"Plano de Contas",centros:"Centros de Custo",config:"Configurações"})[chave]||"módulo"}
function erroModulo(chave,e){console.error(`Falha ao abrir ${chave}:`,e);const detalhe=e?.code||e?.message||"erro-desconhecido";const texto=`Não foi possível abrir ${nomeModulo(chave)}. Atualize a página e tente novamente. Se persistir, informe o detalhe técnico: ${detalhe}.`;const atual=document.querySelector(".pagina:not(.hidden) .modulo-aviso");if(atual)atual.textContent=texto;else alert(texto)}
function exigeEmpresaUnica(chave){return chave==="caixa"||chave==="prestacao"}
function validarContexto(chave){if(exigeEmpresaUnica(chave)&&empresasSelecionadasIds().length!==1){alert(`${nomeModulo(chave)} exige uma única empresa selecionada no cabeçalho para evitar mistura de dados entre empresas.`);return false}return true}
function permissoesControladoria(){return state.perfil?.permissoes?.controladoria||{}}
function ctrlAcao(acao,{legadoVisualizar=false}={}){if(admin()||permite("controladoria","editar"))return true;const p=permissoesControladoria();if(Object.prototype.hasOwnProperty.call(p,acao))return p[acao]===true;return legadoVisualizar&&permite("controladoria","visualizar")}
function podeAbrir(chave){
  if(admin())return true;
  switch(chave){
    case"dre":return ctrlAcao("dre",{legadoVisualizar:true});
    case"balanco":return ctrlAcao("balanco",{legadoVisualizar:true});
    case"input":return ctrlAcao("realizado")||ctrlAcao("importar");
    case"budget":return ctrlAcao("budget");
    case"forecast":return ctrlAcao("forecast");
    case"caixa":return ctrlAcao("caixaVisualizar")||ctrlAcao("caixaLancar")||ctrlAcao("caixaContas")||ctrlAcao("caixaFixos");
    case"prestacao":return ctrlAcao("prestacao")||ctrlAcao("prestacaoComentar");
    case"fechamento":return ctrlAcao("fechamento")||ctrlAcao("fecharCompetencia");
    case"permutas":return permite("controladoria","editar");
    case"premissas":return ctrlAcao("premissas");
    case"imobilizado":return ctrlAcao("imobilizado");
    case"consorcios":return ctrlAcao("consorciosVisualizar")||ctrlAcao("consorciosEditar");
    case"plano":return ctrlAcao("planoContas");
    case"centros":return ctrlAcao("centrosCusto");
    case"config":return permite("controladoria","editar");
    default:return false;
  }
}
function validarPermissao(chave){if(podeAbrir(chave))return true;alert(`Seu perfil não possui permissão para acessar ${nomeModulo(chave)}.`);return false}
function chaveSessaoModulo(){return`${MODULO_VERSAO}:${state.usuario?.id||"anon"}:${state.perfil?.id||"sem-perfil"}`}
async function importar(chave,arquivo){if(!modulos.has(chave)){const versao=encodeURIComponent(chaveSessaoModulo());const p=import(`${arquivo}?v=${versao}`).catch(e=>{modulos.delete(chave);throw e});modulos.set(chave,p)}return modulos.get(chave)}
async function abrirModuloCompartilhado(chave,arquivo,tabId){if(!validarPermissao(chave)||!validarContexto(chave))return;try{marcarAtivo(chave);if(!prepararShellCompartilhado())throw new Error("shell-controladoria-ausente");await importar(chave,arquivo);abrirPagina("controladoria");esconderTabsInternas();requestAnimationFrame(()=>$(tabId)?.click())}catch(e){erroModulo(chave,e)}}
async function abrirTela(chave,arquivo){if(!validarPermissao(chave)||!validarContexto(chave))return;try{marcarAtivo(chave);const m=await importar(chave,arquivo);if(typeof m.abrir!=="function")throw new Error("modulo-sem-funcao-abrir");m.abrir()}catch(e){erroModulo(chave,e)}}
async function abrirPermutas(){if(!validarPermissao("permutas"))return;await abrirTela("permutas","./permutas.js");const editar=admin()||permite("controladoria","editar");["btnNovaPermuta","btnNovoMovPermuta"].forEach(id=>$(id)?.classList.toggle("hidden",!editar))}

const ACOES={
  dre:()=>abrirTela("dre","./ctrl-dre-v6.js"),
  balanco:()=>abrirTela("balanco","./ctrl-balance-sheet-v1.js"),
  input:()=>abrirTela("input","./ctrl-input-v6.js"),
  budget:()=>abrirTela("budget","./ctrl-budget-v7.js"),
  forecast:()=>abrirTela("forecast","./ctrl-forecast-v5.js"),
  caixa:()=>abrirModuloCompartilhado("caixa","./cashflow.js","tabFluxoCaixa"),
  prestacao:()=>abrirModuloCompartilhado("prestacao","./accountability.js","tabPrestacaoContas"),
  fechamento:()=>abrirTela("fechamento","./closing-v3.js"),
  permutas:abrirPermutas,
  premissas:()=>abrirTela("premissas","./ctrl-premises-v4.js"),
  imobilizado:()=>abrirTela("imobilizado","./ctrl-assets-v1.js"),
  consorcios:()=>abrirTela("consorcios","./ctrl-consorcios-v1.js"),
  plano:()=>abrirTela("plano","./ctrl-chart-accounts-v6.js"),
  centros:()=>abrirTela("centros","./ctrl-cost-centers-v2.js"),
  config:()=>abrirTela("config","./ctrl-settings.js")
};
const ITENS=[["dre","DRE Gerencial"],["balanco","Balanço Patrimonial"],["input","Input Mensal"],["budget","Budget"],["forecast","Forecast"],["caixa","Fluxo de Caixa"],["prestacao","Prestação de Contas"],["fechamento","Cockpit de Fechamento"],["permutas","Permutas"],["premissas","Premissas"],["imobilizado","Imobilizado & CAPEX"],["consorcios","Consórcios"],["plano","Plano de Contas"],["centros","Centros de Custo"],["config","Configurações"]];

function css(){if($("ctrl-submenu-css"))return;const s=document.createElement("style");s.id="ctrl-submenu-css";s.textContent=`.ctrl-menu-wrap{display:none;margin:-4px 0 7px 12px;padding:5px 0 5px 10px;border-left:1px solid rgba(255,255,255,.14)}.ctrl-menu-wrap.aberto{display:grid;gap:2px}.ctrl-subitem{border:0;background:transparent;color:rgba(255,255,255,.72);text-align:left;padding:7px 9px;border-radius:7px;font-size:11px;cursor:pointer}.ctrl-subitem:hover,.ctrl-subitem.ativo{background:rgba(25,211,190,.12);color:#fff}.menu-item.ctrl-expansivel::after{content:'▾';float:right;opacity:.7}.menu-item.ctrl-expansivel.fechado::after{content:'▸'}.fpa-contexto-chip{min-height:36px;display:flex;align-items:center;padding:0 10px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#475467;font-size:11px}.budget-inline{padding:12px;background:#f8fafc;border-left:3px solid #0c9488}.budget-inline .tabela input{min-width:82px}.dre-centro td{background:#f7f9fb;font-weight:750}.dre-centro td:first-child{border-left:3px solid #9fb8c7}.dre-filha td:first-child{font-weight:500}.conta-acoes-inline{display:flex;align-items:center;gap:6px}.linha-fechada{opacity:.8}`;document.head.appendChild(s)}
function aplicarPermissoesSubmenu(){document.querySelectorAll("#ctrlSubmenu .ctrl-subitem").forEach(b=>{const ok=podeAbrir(b.dataset.ctrl);b.classList.toggle("hidden",!ok);if(!ok)b.classList.remove("ativo")})}
function montar(){
  css();const menu=$("menuControladoria");if(!menu)return;
  let box=$("ctrlSubmenu");
  if(!box){
    menu.classList.add("ctrl-expansivel","fechado");menu.textContent="Controladoria & FP&A";
    box=document.createElement("div");box.id="ctrlSubmenu";box.className="ctrl-menu-wrap";
    ITENS.forEach(([chave,label])=>{const b=document.createElement("button");b.type="button";b.className="ctrl-subitem";b.dataset.ctrl=chave;b.textContent=label;b.addEventListener("click",e=>{e.stopPropagation();ACOES[chave]?.()});box.appendChild(b)});
    menu.insertAdjacentElement("afterend",box);
    menu.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const aberto=!box.classList.contains("aberto");box.classList.toggle("aberto",aberto);menu.classList.toggle("fechado",!aberto)},true);
  }
  aplicarPermissoesSubmenu();
}
document.addEventListener("click",e=>{const b=e.target.closest?.("#btnConfigurarContasCentro");if(!b)return;e.preventDefault();e.stopImmediatePropagation();ACOES.centros?.()},true);
export async function abrirLegado(chave){return ACOES[chave]?.()}
window.SIG_ABRIR_CTRL_LEGADO=abrirLegado;window.SIG_ABRIR_CTRL=chave=>ACOES[chave]?.();
montar();window.addEventListener("sig:ready",()=>{modulos.clear();montar()});window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")esconderTabsInternas();aplicarPermissoesSubmenu()});