import { $, abrirPagina, permite, admin } from "./core.js";

let legadoPromise=null;const modulos=new Map();
function paginaControladoria(){return $("pagina-controladoria")}
function esconderTabsInternas(){const t=paginaControladoria()?.querySelector(".fpa-tabs");if(t)t.style.display="none"}
function marcarAtivo(chave){document.querySelectorAll(".ctrl-subitem").forEach(b=>b.classList.toggle("ativo",b.dataset.ctrl===chave));$("menuControladoria")?.classList.add("ativo")}
async function importar(chave,arquivo){if(!modulos.has(chave))modulos.set(chave,import(arquivo));return modulos.get(chave)}
async function carregarLegado(){if(!legadoPromise)legadoPromise=Promise.all([import("./fpa.js"),import("./fpa-number-fix.js"),import("./center-account-matrix.js"),import("./planning-details.js")]);return legadoPromise}
export async function abrirLegado(chave){marcarAtivo(chave);await carregarLegado();abrirPagina("controladoria");esconderTabsInternas();requestAnimationFrame(()=>document.querySelector(`[data-fpa-tab="${chave}"]`)?.click())}
async function abrirModuloLegado(chave,arquivo,tabId){marcarAtivo(chave);await carregarLegado();await importar(chave,arquivo);abrirPagina("controladoria");esconderTabsInternas();requestAnimationFrame(()=>$(tabId)?.click())}
async function abrirTela(chave,arquivo){marcarAtivo(chave);const m=await importar(chave,arquivo);m.abrir?.()}
async function abrirPermutas(){await abrirTela("permutas","./permutas.js");const editar=admin()||permite("controladoria","editar");["btnNovaPermuta","btnNovoMovPermuta"].forEach(id=>$(id)?.classList.toggle("hidden",!editar))}

const ACOES={
  dre:()=>abrirTela("dre","./ctrl-dre.js"),
  input:()=>abrirTela("input","./ctrl-input.js"),
  budget:()=>abrirTela("budget","./ctrl-budget.js"),
  forecast:()=>abrirLegado("forecast"),
  caixa:()=>abrirModuloLegado("caixa","./cashflow.js","tabFluxoCaixa"),
  prestacao:()=>abrirModuloLegado("prestacao","./accountability.js","tabPrestacaoContas"),
  fechamento:()=>abrirTela("fechamento","./closing-v2.js"),
  permutas:abrirPermutas,
  premissas:()=>abrirTela("premissas","./ctrl-premises.js"),
  plano:()=>abrirLegado("plano"),
  centros:()=>abrirLegado("centros"),
  config:()=>abrirTela("config","./ctrl-settings.js")
};
const ITENS=[["dre","DRE Gerencial"],["input","Input Mensal"],["budget","Budget"],["forecast","Forecast"],["caixa","Fluxo de Caixa"],["prestacao","Prestação de Contas"],["fechamento","Cockpit de Fechamento"],["permutas","Permutas"],["premissas","Premissas"],["plano","Plano de Contas"],["centros","Centros de Custo"],["config","Configurações"]];

function css(){if($("ctrl-submenu-css"))return;const s=document.createElement("style");s.id="ctrl-submenu-css";s.textContent=`.ctrl-menu-wrap{display:none;margin:-4px 0 7px 12px;padding:5px 0 5px 10px;border-left:1px solid rgba(255,255,255,.14)}.ctrl-menu-wrap.aberto{display:grid;gap:2px}.ctrl-subitem{border:0;background:transparent;color:rgba(255,255,255,.72);text-align:left;padding:7px 9px;border-radius:7px;font-size:11px;cursor:pointer}.ctrl-subitem:hover,.ctrl-subitem.ativo{background:rgba(25,211,190,.12);color:#fff}.menu-item.ctrl-expansivel::after{content:'▾';float:right;opacity:.7}.menu-item.ctrl-expansivel.fechado::after{content:'▸'}.fpa-contexto-chip{min-height:36px;display:flex;align-items:center;padding:0 10px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#475467;font-size:11px}.budget-inline{padding:12px;background:#f8fafc;border-left:3px solid #0c9488}.budget-inline .tabela input{min-width:82px}`;document.head.appendChild(s)}
function montar(){css();const menu=$("menuControladoria");if(!menu||$("ctrlSubmenu"))return;menu.classList.add("ctrl-expansivel","fechado");menu.textContent="Controladoria & FP&A";const box=document.createElement("div");box.id="ctrlSubmenu";box.className="ctrl-menu-wrap";ITENS.forEach(([chave,label])=>{const b=document.createElement("button");b.type="button";b.className="ctrl-subitem";b.dataset.ctrl=chave;b.textContent=label;if(chave==="config"&&!admin()&&!permite("controladoria","editar"))b.classList.add("hidden");b.addEventListener("click",e=>{e.stopPropagation();ACOES[chave]?.()});box.appendChild(b)});menu.insertAdjacentElement("afterend",box);menu.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const aberto=!box.classList.contains("aberto");box.classList.toggle("aberto",aberto);menu.classList.toggle("fechado",!aberto)},true)}
document.addEventListener("click",e=>{const b=e.target.closest?.("#btnConfigurarContasCentro");if(!b)return;e.preventDefault();e.stopImmediatePropagation();abrirLegado("centros")},true);
window.SIG_ABRIR_CTRL_LEGADO=abrirLegado;window.SIG_ABRIR_CTRL=chave=>ACOES[chave]?.();
montar();window.addEventListener("sig:ready",montar);window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")esconderTabsInternas()});
