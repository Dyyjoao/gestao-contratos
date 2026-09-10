import { admin, permite } from "./core.js";
import { hojeIso } from "./shared.js";

const MODULO="contasPagar";
const podeCadastrar=()=>admin()||permite(MODULO,"cadastrar");
let filtroInicialAplicado=false;

const addDias=(iso,dias)=>{
  const [a,m,d]=String(iso||"").split("-").map(Number);
  const x=new Date(Date.UTC(a,m-1,d));
  x.setUTCDate(x.getUTCDate()+dias);
  return x.toISOString().slice(0,10);
};
const addMeses=(iso,meses)=>{
  const [a,m,d]=String(iso||"").split("-").map(Number);
  const x=new Date(Date.UTC(a,m-1+meses,1));
  const ultimo=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();
  x.setUTCDate(Math.min(d||1,ultimo));
  return x.toISOString().slice(0,10);
};

function setTextoPorFor(id,texto){
  const input=document.getElementById(id);
  const label=input?.closest(".campo")?.querySelector(`label[for="${id}"]`);
  if(label)label.textContent=texto;
}

function dispararFiltro(){
  ["apFiltroStatus","apFiltroInicio","apFiltroFim"].forEach(id=>{
    document.getElementById(id)?.dispatchEvent(new Event("change",{bubbles:true}));
  });
}

function aplicarFiltro(tipo){
  const status=document.getElementById("apFiltroStatus");
  const ini=document.getElementById("apFiltroInicio");
  const fim=document.getElementById("apFiltroFim");
  if(!status||!ini||!fim)return;
  const hoje=hojeIso();
  status.value="abertos";
  ini.value="";
  if(tipo==="vencidos")fim.value=addDias(hoje,-1);
  else if(tipo==="todos")fim.value="";
  else fim.value=addDias(hoje,7);
  dispararFiltro();
}

function garantirAcoes(){
  const box=document.querySelector("#pagina-contas-pagar .ap-head-actions");
  if(!box||document.getElementById("apCockpitSemana"))return;
  const todos=document.createElement("button");
  todos.id="apCockpitTodos";
  todos.className="btn-secundario";
  todos.type="button";
  todos.textContent="Todos pendentes";
  todos.addEventListener("click",()=>aplicarFiltro("todos"));
  const venc=document.createElement("button");
  venc.id="apCockpitVencidos";
  venc.className="btn-secundario";
  venc.type="button";
  venc.textContent="Vencidos";
  venc.addEventListener("click",()=>aplicarFiltro("vencidos"));
  const semana=document.createElement("button");
  semana.id="apCockpitSemana";
  semana.className="btn-secundario";
  semana.type="button";
  semana.textContent="Radar 7 dias";
  semana.addEventListener("click",()=>aplicarFiltro("semana"));
  const atualizar=document.getElementById("btnAtualizarContasPagar");
  if(atualizar){box.insertBefore(todos,atualizar);box.insertBefore(venc,atualizar);box.insertBefore(semana,atualizar)}
}

function simplificarFormulario(){
  const box=document.getElementById("formContaPagarContainer");
  if(!box)return;
  const titulo=document.getElementById("tituloContaPagar");
  if(titulo&&titulo.textContent==="Nova conta")titulo.textContent="Novo compromisso fixo";
  const intro=box.querySelector(".form-card-titulo p");
  if(intro)intro.textContent="Cadastre um pagamento recorrente ou pontual que precisa entrar no seu radar semanal.";
  setTextoPorFor("apFornecedor","Fornecedor / compromisso");
  setTextoPorFor("apVencimento","Próximo vencimento");
  setTextoPorFor("apValor","Valor previsto");
  setTextoPorFor("apResponsavel","Responsável pelo acompanhamento");
  setTextoPorFor("apRecorrenteAte","Controlar recorrência até");
  ["apDocumento","apCategoria"].forEach(id=>document.getElementById(id)?.closest(".campo")?.classList.add("ap-campo-secundario"));
  const rec=document.getElementById("apRecorrente");
  const recLabel=rec?.closest("label");
  const strong=recLabel?.querySelector("strong");
  const small=recLabel?.querySelector("small");
  if(strong)strong.textContent="Pagamento fixo mensal";
  if(small)small.textContent="Mantém o compromisso no radar mês a mês. Você pode desmarcar para um vencimento pontual.";
}

function prepararNovoCompromisso(){
  setTimeout(()=>{
    const box=document.getElementById("formContaPagarContainer");
    if(!box||box.classList.contains("hidden"))return;
    const titulo=document.getElementById("tituloContaPagar");
    if(titulo?.textContent?.toLowerCase().includes("editar"))return;
    if(titulo)titulo.textContent="Novo compromisso fixo";
    const rec=document.getElementById("apRecorrente");
    const ate=document.getElementById("apRecorrenteAte");
    const venc=document.getElementById("apVencimento");
    if(rec&&!rec.disabled){rec.checked=true;rec.dispatchEvent(new Event("change",{bubbles:true}))}
    if(ate&&!ate.value){const base=venc?.value||hojeIso();ate.value=addMeses(base,18)}
  },30);
}

function renomearAcoesLista(){
  document.querySelectorAll("#pagina-contas-pagar [data-ap-pagar]").forEach(b=>b.textContent="Marcar pago");
  document.querySelectorAll("#pagina-contas-pagar [data-ap-editar]").forEach(b=>b.textContent="Ajustar");
}

function aplicarLayout(){
  const p=document.getElementById("pagina-contas-pagar");
  if(!p)return false;
  const eyebrow=p.querySelector(".pagina-cabecalho .eyebrow");
  const h2=p.querySelector(".pagina-cabecalho h2");
  const desc=p.querySelector(".pagina-cabecalho p");
  if(eyebrow)eyebrow.textContent="RADAR SEMANAL";
  if(h2)h2.textContent="Cockpit de Pagamentos Fixos";
  if(desc)desc.textContent="Controle de vencimentos e pagamentos recorrentes para orientar sua semana. Não é um módulo contábil e não alimenta DRE, Budget ou Forecast.";
  const novo=document.getElementById("btnNovaContaPagar");
  if(novo){novo.textContent="+ Novo compromisso fixo";novo.classList.toggle("hidden",!podeCadastrar())}
  const atualizar=document.getElementById("btnAtualizarContasPagar");
  if(atualizar)atualizar.textContent="Atualizar radar";
  const listaTitulo=p.querySelector(".lista-card .lista-cabecalho h3");
  if(listaTitulo)listaTitulo.textContent="Pendências e vencimentos";
  simplificarFormulario();
  garantirAcoes();
  renomearAcoesLista();
  if(!filtroInicialAplicado){
    filtroInicialAplicado=true;
    setTimeout(()=>aplicarFiltro("semana"),40);
  }
  return true;
}

function instalarCss(){
  if(document.getElementById("sig-payables-cockpit-ux"))return;
  const s=document.createElement("style");
  s.id="sig-payables-cockpit-ux";
  s.textContent=`
    #pagina-contas-pagar .pagina-cabecalho{align-items:flex-start}
    #pagina-contas-pagar .pagina-cabecalho p{max-width:780px;line-height:1.45}
    #pagina-contas-pagar .ap-head-actions{justify-content:flex-end}
    #pagina-contas-pagar .ap-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
    #pagina-contas-pagar .ap-kpis>.kpi-card{min-width:0;min-height:108px;padding:16px 17px!important;border:1px solid #e4e7ec;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(11,31,51,.035)}
    #pagina-contas-pagar .ap-kpis>.kpi-card>span{display:block;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:#667085}
    #pagina-contas-pagar .ap-kpis>.kpi-card>strong{display:block;margin-top:7px;font-size:24px;line-height:1;color:#0b1f33}
    #pagina-contas-pagar .ap-kpis>.kpi-card>small{display:block;margin-top:6px;font-size:11px;color:#667085}
    #pagina-contas-pagar .ap-kpis>.kpi-card:not(button){display:none}
    #pagina-contas-pagar .ap-kpi-btn[data-ap-atalho="vencidos"]{border-top:3px solid #d92d20}
    #pagina-contas-pagar .ap-kpi-btn[data-ap-atalho="hoje"]{border-top:3px solid #f79009}
    #pagina-contas-pagar .ap-kpi-btn[data-ap-atalho="7"]{border-top:3px solid #0f9f95}
    #pagina-contas-pagar .ap-kpi-btn[data-ap-atalho="30"]{border-top:3px solid #344054}
    #pagina-contas-pagar .ap-filtros-head{gap:12px}
    #pagina-contas-pagar .ap-filtros{justify-content:flex-end}
    #pagina-contas-pagar .ap-table th:nth-child(2),#pagina-contas-pagar .ap-table td:nth-child(2){display:none}
    #pagina-contas-pagar .ap-campo-secundario{display:none!important}
    #pagina-contas-pagar .form-card{border-top:3px solid #14b8a6}
    #pagina-contas-pagar .ap-check{background:#f2fbfa;border-color:#c9ece8}
    @media(max-width:1100px){#pagina-contas-pagar .ap-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:720px){#pagina-contas-pagar .ap-kpis{grid-template-columns:1fr}#pagina-contas-pagar .ap-head-actions{justify-content:flex-start}}
  `;
  document.head.appendChild(s);
}

installCss:
instalarCss();

const obs=new MutationObserver(()=>{
  if(aplicarLayout())renomearAcoesLista();
});
obs.observe(document.body,{childList:true,subtree:true});

document.addEventListener("click",e=>{
  if(e.target?.closest?.("#btnNovaContaPagar"))prepararNovoCompromisso();
},true);
window.addEventListener("sig:ready",()=>setTimeout(aplicarLayout,0));
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contas-pagar")setTimeout(aplicarLayout,0)});
window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo===MODULO)setTimeout(renomearAcoesLista,80)});
aplicarLayout();
