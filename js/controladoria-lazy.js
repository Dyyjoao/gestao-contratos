const pagina=document.getElementById("pagina-controladoria");
const tabs=pagina?.querySelector(".fpa-tabs");

let avancadoPromise=null;
const modulos=new Map();

function importarAvancado(){
  if(!avancadoPromise){
    avancadoPromise=import("./fpa-advanced.js").catch(err=>{
      avancadoPromise=null;
      console.error("Falha ao carregar recursos avançados de FP&A",err);
    });
  }
  return avancadoPromise;
}

async function abrirModulo(chave,arquivo,tabId,placeholder){
  if(modulos.has(chave))return modulos.get(chave);
  placeholder.disabled=true;
  placeholder.textContent="Carregando...";
  const p=import(arquivo).then(()=>{
    placeholder.remove();
    requestAnimationFrame(()=>document.getElementById(tabId)?.click());
  }).catch(err=>{
    console.error(`Falha ao carregar ${chave}`,err);
    placeholder.disabled=false;
    placeholder.textContent=placeholder.dataset.rotulo||chave;
  });
  modulos.set(chave,p);
  return p;
}

function criarPlaceholder({id,rotulo,arquivo,tabId,chave}){
  if(!tabs||document.getElementById(id)||document.getElementById(tabId))return;
  const b=document.createElement("button");
  b.id=id;
  b.className="fpa-tab fpa-tab-lazy";
  b.type="button";
  b.textContent=rotulo;
  b.dataset.rotulo=rotulo;
  b.addEventListener("click",()=>abrirModulo(chave,arquivo,tabId,b));
  tabs.appendChild(b);
}

function montar(){
  if(!tabs)return;
  criarPlaceholder({id:"lazyFluxoCaixa",rotulo:"Fluxo de Caixa",arquivo:"./cashflow.js",tabId:"tabFluxoCaixa",chave:"caixa"});
  criarPlaceholder({id:"lazyPrestacao",rotulo:"Prestação de Contas",arquivo:"./accountability.js",tabId:"tabPrestacaoContas",chave:"prestacao"});
  criarPlaceholder({id:"lazyFechamento",rotulo:"Fechamento",arquivo:"./closing.js",tabId:"tabFechamento",chave:"fechamento"});
}

// A camada avançada é carregada apenas quando o usuário realmente entra
// em uma área que usa classificação OPEX/CAPEX ou detalhamento avançado.
document.addEventListener("click",e=>{
  const alvo=e.target.closest?.("[data-fpa-tab],#btnAtualizarDre");
  if(!alvo)return;
  const tab=alvo.dataset?.fpaTab||"";
  if(alvo.id==="btnAtualizarDre"||["dre","budget","plano"].includes(tab)){
    setTimeout(importarAvancado,0);
  }
});

montar();
window.addEventListener("sig:page",e=>{
  if(e.detail?.pagina==="controladoria")montar();
});
