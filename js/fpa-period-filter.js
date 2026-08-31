import { periodoAno, periodoChave } from "./shared.js";

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={
  total:{label:"Total do exercício",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"Total T1",indices:[0,1,2]},
  t2:{label:"Total T2",indices:[3,4,5]},
  t3:{label:"Total T3",indices:[6,7,8]},
  t4:{label:"Total T4",indices:[9,10,11]}
};
MESES.forEach((nome,i)=>PERIODOS[`m${String(i+1).padStart(2,"0")}`]={label:nome,indices:[i]});
let observadorTabela=null,sincronizando=false;

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

function observarTabela(tabela){
  if(!observadorTabela)return;
  observadorTabela.observe(tabela,{childList:true,subtree:true});
}

function aplicarTabelaDre(){
  const tabela=document.getElementById("tabelaDre");if(!tabela)return;
  if(observadorTabela)observadorTabela.disconnect();
  try{
    const chave=periodoChave(),p=PERIODOS[chave]||PERIODOS.total,mostrarConsolidado=p.indices.length>1;
    const head=tabela.querySelector("thead tr");
    if(head){
      const originais=[...head.children].filter(th=>!th.dataset.sigPeriodoResumo);
      const meses=originais.slice(1,13),totalOriginal=originais[13];
      meses.forEach(th=>th.style.display="none");if(totalOriginal)totalOriginal.style.display="none";
      p.indices.forEach(i=>{if(meses[i])meses[i].style.display=""});
      let resumo=head.querySelector("[data-sig-periodo-resumo]");
      if(mostrarConsolidado){
        if(!resumo){resumo=document.createElement("th");resumo.dataset.sigPeriodoResumo="1";head.appendChild(resumo)}
        resumo.style.display="";
        const texto=`${p.label} · ${periodoAno()}`;if(resumo.textContent!==texto)resumo.textContent=texto;
      }else if(resumo)resumo.style.display="none";
    }

    tabela.querySelectorAll("tbody tr").forEach(tr=>{
      const originais=[...tr.children].filter(td=>td.tagName==="TD"&&!td.dataset.sigPeriodoResumo);if(originais.length<13)return;
      const meses=originais.slice(1,13),totalOriginal=originais[13];
      meses.forEach(td=>td.style.display="none");if(totalOriginal)totalOriginal.style.display="none";
      p.indices.forEach(i=>{if(meses[i])meses[i].style.display=""});
      let resumo=tr.querySelector("[data-sig-periodo-resumo]");
      if(mostrarConsolidado){
        const valor=p.indices.reduce((s,i)=>s+numeroMoeda(meses[i]?.textContent),0),texto=moeda(valor);
        if(!resumo){resumo=document.createElement("td");resumo.dataset.sigPeriodoResumo="1";resumo.className="fpa-total numero";tr.appendChild(resumo)}
        resumo.style.display="";if(resumo.textContent!==texto)resumo.textContent=texto;
      }else if(resumo)resumo.style.display="none";
    });
  }finally{
    observarTabela(tabela);
  }
}

function observarDre(){
  const tabela=document.getElementById("tabelaDre");if(!tabela)return;
  if(!observadorTabela)observadorTabela=new MutationObserver(()=>aplicarTabelaDre());
  observadorTabela.disconnect();observarTabela(tabela);
}

function aplicar(){sincronizarAnos();sincronizarCompetenciasMensais();observarDre();setTimeout(aplicarTabelaDre,0)}

aplicar();
window.addEventListener("sig:ready",aplicar);
window.addEventListener("sig:periodo-changed",aplicar);
window.addEventListener("sig:page",e=>{if(!e.detail?.pagina||e.detail.pagina==="controladoria")setTimeout(aplicar,0)});
