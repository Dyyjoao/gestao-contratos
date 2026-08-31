const MESES=[
  ["m01","Jan",[0]],["m02","Fev",[1]],["m03","Mar",[2]],["m04","Abr",[3]],
  ["m05","Mai",[4]],["m06","Jun",[5]],["m07","Jul",[6]],["m08","Ago",[7]],
  ["m09","Set",[8]],["m10","Out",[9]],["m11","Nov",[10]],["m12","Dez",[11]]
];
const PERIODOS={
  total:{label:"Total do exercício",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"T1 · Jan–Mar",indices:[0,1,2]},
  t2:{label:"T2 · Abr–Jun",indices:[3,4,5]},
  t3:{label:"T3 · Jul–Set",indices:[6,7,8]},
  t4:{label:"T4 · Out–Dez",indices:[9,10,11]},
  ...Object.fromEntries(MESES.map(([id,nome,indices])=>[id,{label:nome,indices}]))
};
let observador=null;

function opcoes(){
  return `<optgroup label="Períodos"><option value="total">Total</option><option value="t1">T1 · Jan–Mar</option><option value="t2">T2 · Abr–Jun</option><option value="t3">T3 · Jul–Set</option><option value="t4">T4 · Out–Dez</option></optgroup><optgroup label="Meses">${MESES.map(([id,nome])=>`<option value="${id}">${nome}</option>`).join("")}</optgroup>`;
}
function numeroMoeda(texto){
  const limpo=String(texto||"").replace(/\s/g,"").replace(/R\$/g,"").replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(limpo);return Number.isFinite(n)?n:0;
}
function moeda(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}

function aplicarTabela(){
  const tabela=document.getElementById("tabelaDre"),sel=document.getElementById("drePeriodo");
  if(!tabela||!sel)return;
  const p=PERIODOS[sel.value]||PERIODOS.total;
  const head=tabela.querySelector("thead tr");
  if(head){
    const ths=[...head.children];
    ths.slice(1).forEach(th=>{if(!th.dataset.sigPeriodoResumo)th.style.display="none"});
    let resumo=head.querySelector("[data-sig-periodo-resumo]");
    if(!resumo){resumo=document.createElement("th");resumo.dataset.sigPeriodoResumo="1";head.appendChild(resumo)}
    resumo.style.display="";resumo.textContent=p.label;
  }
  tabela.querySelectorAll("tbody tr").forEach(tr=>{
    const tds=[...tr.children].filter(x=>x.tagName==="TD");
    if(tds.length<13)return;
    const meses=tds.slice(1,13),originais=tds.slice(1).filter(td=>!td.dataset.sigPeriodoResumo);
    originais.forEach(td=>td.style.display="none");
    const valor=p.indices.reduce((s,i)=>s+numeroMoeda(meses[i]?.textContent),0);
    let resumo=tr.querySelector("[data-sig-periodo-resumo]");
    if(!resumo){resumo=document.createElement("td");resumo.dataset.sigPeriodoResumo="1";resumo.className="fpa-total numero";tr.appendChild(resumo)}
    resumo.style.display="";resumo.textContent=moeda(valor);
  });
}

function montar(){
  const ano=document.getElementById("dreAno");if(!ano)return;
  if(!document.getElementById("drePeriodo")){
    const campo=document.createElement("div");campo.className="campo";campo.innerHTML=`<label for="drePeriodo">Competência</label><select id="drePeriodo">${opcoes()}</select>`;
    ano.closest(".campo")?.after(campo);
    document.getElementById("drePeriodo")?.addEventListener("change",aplicarTabela);
  }
  ["dreAno","dreCenario","dreCentro","btnAtualizarDre"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(aplicarTabela,0)));
  document.getElementById("btnAtualizarDre")?.addEventListener("click",()=>setTimeout(aplicarTabela,0));
  const tabela=document.getElementById("tabelaDre");
  if(tabela&&!observador){
    observador=new MutationObserver(()=>{observador.disconnect();aplicarTabela();observador.observe(tabela,{childList:true,subtree:true})});
    observador.observe(tabela,{childList:true,subtree:true});
  }
  aplicarTabela();
}

montar();
window.addEventListener("sig:ready",montar);
window.addEventListener("sig:page",e=>{if(!e.detail?.pagina||e.detail.pagina==="controladoria")setTimeout(montar,0)});
