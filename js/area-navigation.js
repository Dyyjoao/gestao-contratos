import { $, permite, admin } from "./core.js";

const ITENS={
  producao:{label:"Produção",root:"menuProducao",area:"operacao",modulo:"producao",acoes:["visualizar","lancar","editar","cadastros"]},
  descarte:{label:"Descarte",root:"menuDescarte",area:"operacao",modulo:"descarte",acoes:["visualizar","lancar","editar"]},
  contratos:{label:"Contratos",root:"menuContratos",area:"controladoria",modulo:"contratos",acoes:["visualizar","cadastrar","editar","anexar","aprovar","excluir"]},
  contasPagar:{label:"Contas a Pagar",root:"menuContasPagar",area:"controladoria",modulo:"contasPagar",acoes:["visualizar","cadastrar","editar","baixar"]},
  permutas:{label:"Permutas",root:"menuPermutas",area:"controladoria",modulo:"permutas",acoes:["visualizar","cadastrar","editar","movimentar","estornar","fechar","inativar"]},
  consorcios:{label:"Consórcios",root:"menuConsorcios",area:"controladoria",modulo:"consorcios",acoes:["visualizar","editar"]},
  vendas:{label:"Vendas & Comissões",root:"menuVendas",area:"comercial",modulo:"vendas",acoes:["visualizar","lancar","editar","vendedores","comissoes"]}
};

const ORDEM_CONTROLADORIA=["contratos","contasPagar","permutas","consorcios"];
let chaveAtiva="";
let agendado=false;

function permitido(item){if(admin())return true;return item.acoes.some(acao=>permite(item.modulo,acao))}
function css(){
  if($("area-navigation-css"))return;
  const s=document.createElement("style");s.id="area-navigation-css";s.textContent=`
    .area-menu-wrap{display:none;margin:-4px 0 7px 12px;padding:5px 0 5px 10px;border-left:1px solid rgba(255,255,255,.14)}
    .area-menu-wrap.aberto{display:grid;gap:2px}
    .area-subitem{border:0;background:transparent;color:rgba(255,255,255,.72);text-align:left;padding:7px 9px;border-radius:7px;font-size:11px;cursor:pointer}
    .area-subitem:hover,.area-subitem.ativo{background:rgba(25,211,190,.12);color:#fff}
    .menu-item.area-expansivel::after{content:'▾';float:right;opacity:.7}
    .menu-item.area-expansivel.fechado::after{content:'▸'}
    .area-divider{height:1px;background:rgba(255,255,255,.08);margin:4px 8px}
  `;document.head.appendChild(s)
}
function ocultarRaizes(){Object.values(ITENS).forEach(item=>{const el=$(item.root);if(!el)return;el.classList.add("hidden");el.setAttribute("aria-hidden","true");el.tabIndex=-1})}
function acionar(chave){const item=ITENS[chave];if(!item||!permitido(item))return;chaveAtiva=chave;marcarAtivo(chave);const raiz=$(item.root);if(raiz)raiz.click();else if(window.SIG_ABRIR_CTRL&&["vendas","permutas","consorcios"].includes(chave))window.SIG_ABRIR_CTRL(chave);setTimeout(()=>{ocultarRaizes();marcarAtivo(chave)},0)}
function criarSubitem(chave,container,antesDe=null){const id=`areaNav-${chave}`;let b=$(id);if(!b){b=document.createElement("button");b.id=id;b.type="button";b.className="area-subitem";b.dataset.areaChave=chave;b.textContent=ITENS[chave].label;b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();acionar(chave)});if(antesDe)container.insertBefore(b,antesDe);else container.appendChild(b)}const ok=permitido(ITENS[chave]);b.classList.toggle("hidden",!ok);if(!ok)b.classList.remove("ativo");return b}
function criarArea({menuId,boxId,label,antesDe,chaves}){
  const sidebar=document.querySelector(".sidebar-menu");if(!sidebar)return;
  let menu=$(menuId),box=$(boxId);
  if(!menu){menu=document.createElement("button");menu.id=menuId;menu.type="button";menu.className="menu-item area-expansivel fechado hidden";menu.textContent=label;const ref=$(antesDe)||sidebar.querySelector(".menu-separador");if(ref)sidebar.insertBefore(menu,ref);else sidebar.appendChild(menu);box=document.createElement("div");box.id=boxId;box.className="area-menu-wrap";menu.insertAdjacentElement("afterend",box);menu.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const aberto=!box.classList.contains("aberto");box.classList.toggle("aberto",aberto);menu.classList.toggle("fechado",!aberto)},true)}
  if(!box)return;chaves.forEach(chave=>criarSubitem(chave,box));menu.classList.toggle("hidden",!chaves.some(chave=>permitido(ITENS[chave])))
}
function garantirOperacao(){criarArea({menuId:"menuOperacao",boxId:"operacaoSubmenu",label:"Operação",antesDe:"menuComercial",chaves:["producao","descarte"]})}
function garantirComercial(){criarArea({menuId:"menuComercial",boxId:"comercialSubmenu",label:"Comercial",antesDe:"menuControladoria",chaves:["vendas"]})}
function garantirControladoriaTransferidos(){const menu=$("menuControladoria"),box=$("ctrlSubmenu");if(!menu||!box)return;const primeiroNativo=box.querySelector(".ctrl-subitem");ORDEM_CONTROLADORIA.forEach(chave=>criarSubitem(chave,box,primeiroNativo));if(!$("areaNavCtrlDivider")){const d=document.createElement("div");d.id="areaNavCtrlDivider";d.className="area-divider";const nativo=box.querySelector(".ctrl-subitem");if(nativo)box.insertBefore(d,nativo);else box.appendChild(d)}const temTransferido=ORDEM_CONTROLADORIA.some(chave=>permitido(ITENS[chave]));const temNativo=[...box.querySelectorAll(".ctrl-subitem")].some(b=>!b.classList.contains("hidden"));menu.classList.toggle("hidden",!(temTransferido||temNativo))}
function marcarAtivo(chave=""){document.querySelectorAll(".area-subitem").forEach(b=>b.classList.toggle("ativo",b.dataset.areaChave===chave));const operacao=$("menuOperacao"),comercial=$("menuComercial"),ctrl=$("menuControladoria");if(operacao)operacao.classList.toggle("ativo",["producao","descarte"].includes(chave));if(comercial)comercial.classList.toggle("ativo",chave==="vendas");if(ctrl&&ORDEM_CONTROLADORIA.includes(chave))ctrl.classList.add("ativo");else if(ctrl&&["vendas","producao","descarte"].includes(chave))ctrl.classList.remove("ativo")}
function chavePorPagina(pagina=""){const p=String(pagina||"").toLowerCase();if(p.includes("producao"))return"producao";if(p.includes("descarte"))return"descarte";if(p.includes("contas-pagar"))return"contasPagar";if(p.includes("contrat"))return"contratos";if(p.includes("permut"))return"permutas";if(p.includes("consor"))return"consorcios";if(p.includes("venda"))return"vendas";return""}
function aplicar(){css();garantirOperacao();garantirComercial();garantirControladoriaTransferidos();ocultarRaizes();marcarAtivo(chaveAtiva)}
function agendar(){if(agendado)return;agendado=true;requestAnimationFrame(()=>{agendado=false;aplicar()})}
aplicar();const sidebar=document.querySelector(".sidebar-menu");if(sidebar)new MutationObserver(agendar).observe(sidebar,{childList:true});window.addEventListener("sig:ready",()=>{chaveAtiva="";agendar()});window.addEventListener("sig:page",e=>{const k=chavePorPagina(e.detail?.pagina);if(k)chaveAtiva=k;else if(e.detail?.pagina!=="controladoria")chaveAtiva="";agendar()});document.addEventListener("click",e=>{if(e.target.closest?.("#ctrlSubmenu .ctrl-subitem")){chaveAtiva="";setTimeout(()=>marcarAtivo(""),0)}},true);
