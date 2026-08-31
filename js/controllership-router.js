import { $, abrirPagina, permite, admin } from "./core.js";

let fpaPromise=null;const modulos=new Map();
function paginaControladoria(){return $("pagina-controladoria")}
function esconderTabsInternas(){const t=paginaControladoria()?.querySelector(".fpa-tabs");if(t)t.style.display="none"}
function marcarAtivo(chave){document.querySelectorAll(".ctrl-subitem").forEach(b=>b.classList.toggle("ativo",b.dataset.ctrl===chave));$("menuControladoria")?.classList.add("ativo")}
async function importarUma(chave,arquivo){if(!modulos.has(chave))modulos.set(chave,import(arquivo));return modulos.get(chave)}
async function carregarFpa(){if(!fpaPromise)fpaPromise=Promise.all([import("./fpa.js"),import("./fpa-number-fix.js"),import("./planning-details.js"),import("./center-account-matrix.js")]);return fpaPromise}

export async function abrirLegado(chave){
  marcarAtivo(chave);await carregarFpa();abrirPagina("controladoria");esconderTabsInternas();const mapa={budget:"budget",forecast:"forecast",premissas:"premissas",plano:"plano",centros:"centros"},tab=mapa[chave]||chave;requestAnimationFrame(()=>document.querySelector(`[data-fpa-tab="${tab}"]`)?.click());
}
async function abrirModuloTab(chave,arquivo,tabId){marcarAtivo(chave);await importarUma(chave,arquivo);abrirPagina("controladoria");esconderTabsInternas();requestAnimationFrame(()=>$(tabId)?.click())}
async function abrirDre(){marcarAtivo("dre");const m=await importarUma("dre","./ctrl-dre.js");m.abrir?.()}
async function abrirPermutas(){marcarAtivo("permutas");const m=await importarUma("permutas","./permutas.js");m.abrir?.()}
async function abrirConfig(){marcarAtivo("config");const m=await importarUma("config","./ctrl-settings.js");m.abrir?.()}
function abrirInput(){marcarAtivo("input");abrirPagina("input-mensal");const t=$("tituloPagina");if(t)t.textContent="Input Mensal";window.dispatchEvent(new CustomEvent("sig:page",{detail:{pagina:"input-mensal"}}))}

const itens=[
  ["dre","DRE Gerencial",abrirDre],["input","Input Mensal",abrirInput],["budget","Budget",()=>abrirLegado("budget")],["forecast","Forecast",()=>abrirLegado("forecast")],
  ["caixa","Fluxo de Caixa",()=>abrirModuloTab("caixa","./cashflow.js","tabFluxoCaixa")],["prestacao","Prestação de Contas",()=>abrirModuloTab("prestacao","./accountability.js","tabPrestacaoContas")],["fechamento","Fechamento",()=>abrirModuloTab("fechamento","./closing.js","tabFechamento")],
  ["permutas","Permutas",abrirPermutas],["premissas","Premissas",()=>abrirLegado("premissas")],["plano","Plano de Contas",()=>abrirLegado("plano")],["centros","Centros de Custo",()=>abrirLegado("centros")],["config","Configurações",abrirConfig]
];

function css(){if($("ctrl-submenu-css"))return;const s=document.createElement("style");s.id="ctrl-submenu-css";s.textContent=`.ctrl-menu-wrap{display:none;margin:-4px 0 7px 12px;padding:5px 0 5px 10px;border-left:1px solid rgba(255,255,255,.14)}.ctrl-menu-wrap.aberto{display:grid;gap:2px}.ctrl-subitem{border:0;background:transparent;color:rgba(255,255,255,.72);text-align:left;padding:7px 9px;border-radius:7px;font-size:11px;cursor:pointer}.ctrl-subitem:hover,.ctrl-subitem.ativo{background:rgba(25,211,190,.12);color:#fff}.menu-item.ctrl-expansivel::after{content:'▾';float:right;opacity:.7}.menu-item.ctrl-expansivel.fechado::after{content:'▸'}.fpa-contexto-chip{min-height:36px;display:flex;align-items:center;padding:0 10px;border:1px solid #d0d5dd;border-radius:8px;background:#f8fafc;color:#475467;font-size:11px}`;document.head.appendChild(s)}
function ocultarMenuInputDuplicado(){$("menuInputMensal")?.classList.add("hidden")}
function montar(){
  css();const menu=$("menuControladoria");if(!menu||$("ctrlSubmenu"))return;menu.classList.add("ctrl-expansivel","fechado");menu.textContent="Controladoria & FP&A";
  const box=document.createElement("div");box.id="ctrlSubmenu";box.className="ctrl-menu-wrap";itens.forEach(([chave,label,acao])=>{const b=document.createElement("button");b.type="button";b.className="ctrl-subitem";b.dataset.ctrl=chave;b.textContent=label;if(chave==="config"&&!admin()&&!permite("controladoria","editar"))b.classList.add("hidden");b.addEventListener("click",e=>{e.stopPropagation();acao()});box.appendChild(b)});menu.insertAdjacentElement("afterend",box);
  menu.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const aberto=!box.classList.contains("aberto");box.classList.toggle("aberto",aberto);menu.classList.toggle("fechado",!aberto)},true);
  ocultarMenuInputDuplicado();const obs=new MutationObserver(ocultarMenuInputDuplicado);obs.observe(document.querySelector(".sidebar-menu"),{childList:true,subtree:true});
}

document.addEventListener("click",e=>{const b=e.target.closest?.("#btnConfigurarContasCentro");if(!b)return;e.preventDefault();e.stopImmediatePropagation();abrirLegado("centros")},true);
window.SIG_ABRIR_CTRL_LEGADO=abrirLegado;
montar();window.addEventListener("sig:ready",()=>{montar();ocultarMenuInputDuplicado()});window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria")esconderTabsInternas()});
