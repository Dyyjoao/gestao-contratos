import { periodoAno, periodoChave } from "./shared.js";

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={
  total:{label:"Total do exercício",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"T1 · Jan–Mar",indices:[0,1,2]},
  t2:{label:"T2 · Abr–Jun",indices:[3,4,5]},
  t3:{label:"T3 · Jul–Set",indices:[6,7,8]},
  t4:{label:"T4 · Out–Dez",indices:[9,10,11]}
};
MESES.forEach((nome,i)=>PERIODOS[`m${String(i+1).padStart(2,"0")}`]={label:nome,indices:[i]});
let observadorTabela=null,observadorTela=null,sincronizando=false;

function numeroMoeda(texto){
  const limpo=String(texto||"").replace(/\s/g,"").replace(/R\$/g,"").replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(limpo);return Number.isFinite(n)?n:0;
}
function moeda(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function disparar(el){el?.dispatchEvent(new Event("change",{bubbles:true}))}

function esconderCampoAno(id){
  const el=document.getElementById(id);if(!el)return;
  const campo=el.closest(".campo");if(campo){campo.classList.add("hidden");campo.setAttribute("aria-hidden","true")}
}

function sincronizarAnos(){
  if(sincronizando)return;sincronizando=true;
  const ano=String(periodoAno());
  ["dreAno","realizadoAno","budgetAno","forecastAno"].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;esconderCampoAno(id);
    if(el.value!==ano){el.value=ano;disparar(el)}
  });
  sincronizando=false;
}

function sincronizarCompetenciasMensais(){
  const chave=periodoChave();if(!/^m\d{2}$/.test(chave))return;
  const mes=chave.slice(1),valor=`${periodoAno()}-${mes}`;
  ["prestacaoCompetencia","fechamentoCompetencia"].forEach(id=>{
    const el=document.getElementById(id);if(el&&el.value!==valor){el.value=valor;disparar(el)}
  });
}

function aplicarTabelaDre(){
  const tabela=document.getElementById("tabelaDre");if(!tabela)return;
  const p=PERIODOS[periodoChave()]||PERIODOS.total;
  const head=tabela.querySelector("thead tr");
  if(head){
    const ths=[...head.children];ths.slice(1).forEach(th=>{if(!th.dataset.sigPeriodoResumo)th.style.display="none"});
    let resumo=head.querySelector("[data-sig-periodo-resumo]");
    if(!resumo){resumo=document.createElement("th");resumo.dataset.sigPeriodoResumo="1";head.appendChild(resumo)}
    resumo.style.display="";resumo.textContent=`${p.label} · ${periodoAno()}`;
  }
  tabela.querySelectorAll("tbody tr").forEach(tr=>{
    const tds=[...tr.children].filter(x=>x.tagName==="TD");if(tds.length<13)return;
    const meses=tds.slice(1,13),originais=tds.slice(1).filter(td=>!td.dataset.sigPeriodoResumo);originais.forEach(td=>td.style.display="none");
    const valor=p.indices.reduce((s,i)=>s+numeroMoeda(meses[i]?.textContent),0);
    let resumo=tr.querySelector("[data-sig-periodo-resumo]");
    if(!resumo){resumo=document.createElement("td");resumo.dataset.sigPeriodoResumo="1";resumo.className="fpa-total numero";tr.appendChild(resumo)}
    resumo.style.display="";resumo.textContent=moeda(valor);
  });
}

function observarDre(){
  const tabela=document.getElementById("tabelaDre");if(!tabela||observadorTabela)return;
  observadorTabela=new MutationObserver(()=>{observadorTabela.disconnect();aplicarTabelaDre();observadorTabela.observe(tabela,{childList:true,subtree:true})});
  observadorTabela.observe(tabela,{childList:true,subtree:true});
}

function aplicar(){sincronizarAnos();sincronizarCompetenciasMensais();observarDre();setTimeout(aplicarTabelaDre,0)}

aplicar();
const pagina=document.getElementById("pagina-controladoria");
if(pagina&&!observadorTela){observadorTela=new MutationObserver(()=>setTimeout(aplicar,0));observadorTela.observe(pagina,{childList:true,subtree:true})}
window.addEventListener("sig:ready",aplicar);
window.addEventListener("sig:periodo-changed",aplicar);
window.addEventListener("sig:page",e=>{if(!e.detail?.pagina||e.detail.pagina==="controladoria")setTimeout(aplicar,0)});
