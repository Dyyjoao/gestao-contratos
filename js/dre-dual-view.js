import { listarDocumentos, empresasSelecionadasIds, periodoAno, periodoChave, moeda, esc } from "./shared.js";
import { contaAnalitica } from "./account-tree.js";
import { multiplicadorResultado } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { mapaDepreciacaoPlanejamento } from "./asset-planning.js";
import { CC_ESTATISTICO_ID } from "./statistical-center.js";
import { agregarClassificacao, linhasResumoGerencial, linhasResumoCpc51 } from "./dre-classification.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const vazio=()=>Array(12).fill(0);
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
let observer=null,timer=null,busy=false;

function colunas(){const p=periodoChave();if(p==="total"){const a=[];for(let q=0;q<4;q++){for(let i=q*3;i<q*3+3;i++)a.push({label:NOMES[i],indices:[i]});a.push({label:`T${q+1}`,indices:[q*3,q*3+1,q*3+2]})}a.push({label:"Total",indices:[0,1,2,3,4,5,6,7,8,9,10,11]});return a}if(/^t[1-4]$/.test(p)){const q=Number(p.slice(1))-1,idx=[q*3,q*3+1,q*3+2];return[...idx.map(i=>({label:NOMES[i],indices:[i]})),{label:`Total T${q+1}`,indices:idx}]}const m=Number(String(p).slice(1))-1;return[{label:NOMES[m]||"Período",indices:[Math.max(0,m)]}]}
function valor(v,indices){return(indices||[]).reduce((s,i)=>s+n(v?.[i]),0)}
function key(d){return`${d.empresaId}|${d.centroCustoId||""}|${d.contaId}`}
function canonicos(arr,{ano,versoes=null}={}){const m=new Map();for(const d of arr||[]){if(d.tipoRegistro==="budget_meta"||Number(d.exercicio)!==Number(ano))continue;if(versoes&&d.versao!==versoes.get(d.empresaId))continue;const k=key(d),at=m.get(k);if(!at||stamp(d)>=stamp(at))m.set(k,d)}return[...m.values()]}
function versoesRecentes(arr,ano,empresas){const out=new Map();for(const emp of empresas){const m=new Map();(arr||[]).filter(d=>d.empresaId===emp&&d.tipoRegistro!=="budget_meta"&&Number(d.exercicio)===Number(ano)&&d.versao).forEach(d=>m.set(d.versao,Math.max(m.get(d.versao)||0,stamp(d))));const v=[...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];if(v)out.set(emp,v)}return out}
function objetoVetor(d){return MESES.map(m=>n(d?.valores?.[m]))}
function adicionar(out,empresaId,conta,centroCustoId,valores,origem="documento"){out.push({empresaId,conta,centroCustoId,valores:valores.map(v=>v*multiplicadorResultado(conta)),origem})}

async function linhasDados(){
  const ano=periodoAno(),empresas=empresasSelecionadasIds(),cen=document.getElementById("dreV6Cenario")?.value||"realizado",ccFiltro=document.getElementById("dreV6Centro")?.value||"";
  if(ccFiltro===CC_ESTATISTICO_ID)return{linhas:[],aviso:"A visão de totalizadores da DRE é financeira. O filtro atual está em Estatísticas / Indicadores."};
  const [plano,realizados,docs,imobilizados]=await Promise.all([listarDocumentos("planoContasGerencial"),listarDocumentos("realizadoMensal"),cen==="realizado"?Promise.resolve([]):listarDocumentos(cen==="budget"?"budgetLinhas":"forecastLinhas"),cen==="realizado"?Promise.resolve([]):listarDocumentos("imobilizados").catch(()=>[])]);
  const pmap=new Map(plano.map(c=>[c.id,c])),idsEmp=new Set(empresas),reais=canonicos(realizados,{ano}),realMap=new Map(reais.map(d=>[key(d),d])),out=[];
  if(cen==="realizado"){
    for(const d of reais){if(!idsEmp.has(d.empresaId)||ccFiltro&&(d.centroCustoId||"")!==ccFiltro)continue;const c=pmap.get(d.contaId);if(!c||!contaAnalitica(c)||!contaAtivaNoExercicio(c,ano))continue;adicionar(out,d.empresaId,c,d.centroCustoId||"",objetoVetor(d))}
    return{linhas:out,plano};
  }
  const versoes=versoesRecentes(docs,ano,empresas),planos=canonicos(docs,{ano,versoes}),autoEmp=new Map();for(const emp of empresas)autoEmp.set(emp,mapaDepreciacaoPlanejamento(imobilizados,emp,ano));
  for(const d of planos){if(!idsEmp.has(d.empresaId)||ccFiltro&&(d.centroCustoId||"")!==ccFiltro)continue;const c=pmap.get(d.contaId);if(!c||!contaAnalitica(c)||!contaAtivaNoExercicio(c,ano))continue;const cc=d.centroCustoId||"",auto=autoEmp.get(d.empresaId)||new Map();if(auto.has(`${cc}|${c.id}`))continue;const v=objetoVetor(d);if(cen==="forecast"){const fechado=Math.max(0,Math.min(12,n(d.realizadoFechadoAte))),r=realMap.get(key(d));for(let i=0;i<fechado;i++)v[i]=n(r?.valores?.[MESES[i]])}adicionar(out,d.empresaId,c,cc,v)}
  for(const emp of empresas){const auto=autoEmp.get(emp)||new Map(),vers=versoes.get(emp)||"";let fechado=0;if(cen==="forecast"){const xs=docs.filter(d=>d.empresaId===emp&&d.tipoRegistro!=="budget_meta"&&Number(d.exercicio)===Number(ano)&&(!vers||d.versao===vers));fechado=Math.max(0,Math.min(12,Math.max(...xs.map(d=>n(d.realizadoFechadoAte)),0)))}for(const[k,valObj]of auto){const pos=k.indexOf("|"),cc=pos>=0?k.slice(0,pos):"",contaId=pos>=0?k.slice(pos+1):k;if(ccFiltro&&cc!==ccFiltro)continue;const c=pmap.get(contaId);if(!c||!contaAnalitica(c)||!contaAtivaNoExercicio(c,ano))continue;const v=MESES.map(m=>n(valObj?.[m]));if(cen==="forecast"){const r=realMap.get(`${emp}|${cc}|${contaId}`);for(let i=0;i<fechado;i++)v[i]=n(r?.valores?.[MESES[i]])}adicionar(out,emp,c,cc,v,"imobilizado")}}
  return{linhas:out,plano};
}

function instalar(){
  const pag=document.getElementById("pagina-ctrl-dre-v6");if(!pag)return false;
  if(!document.getElementById("dreClassModelo")){
    const toolbar=pag.querySelector(".fpa-toolbar");toolbar?.insertAdjacentHTML("afterbegin",`<div class="campo"><label for="dreClassModelo">Modelo da DRE</label><select id="dreClassModelo"><option value="gerencial">Gerencial · FP&A</option><option value="cpc51">Societária · CPC 51</option></select></div>`);
    const lista=pag.querySelector("section.lista-card");lista?.insertAdjacentHTML("beforebegin",`<section id="dreClassResumo" class="lista-card"><div class="lista-cabecalho"><div><h3 id="dreClassTitulo">DRE Gerencial · Totalizadores</h3><p id="dreClassLegenda">Totalizadores calculados automaticamente; não são contas e não recebem lançamentos.</p></div><span id="dreClassCobertura" class="status-ativo">—</span></div><div class="fpa-grid-wrap"><table id="dreClassTabela" class="fpa-grid dre-class-table"><tbody><tr><td>Carregando...</td></tr></tbody></table></div></section>`);
    const st=document.createElement("style");st.id="dre-class-summary-css";st.textContent=`.dre-class-table td:first-child,.dre-class-table th:first-child{min-width:330px}.dre-class-total td{font-weight:900;background:#eef3f5}.dre-class-destaque td{background:#0b1f33!important;color:#fff!important;font-weight:900}.dre-class-componente td:first-child{padding-left:18px;color:#475467}.dre-class-table .numero{text-align:right;font-variant-numeric:tabular-nums}`;document.head.appendChild(st);
    document.getElementById("dreClassModelo")?.addEventListener("change",render);
  }
  return true;
}

async function render(){
  if(!instalar()||busy)return;const pag=document.getElementById("pagina-ctrl-dre-v6");if(!pag||pag.classList.contains("hidden"))return;busy=true;
  try{
    const t=document.getElementById("dreClassTabela"),modelo=document.getElementById("dreClassModelo")?.value||"gerencial",dados=await linhasDados();if(!t)return;
    if(dados.aviso){t.innerHTML=`<tbody><tr><td>${esc(dados.aviso)}</td></tr></tbody>`;return}
    const ag=agregarClassificacao(dados.linhas),rows=modelo==="cpc51"?linhasResumoCpc51(ag):linhasResumoGerencial(ag),cols=colunas();
    document.getElementById("dreClassTitulo").textContent=modelo==="cpc51"?"DRE Societária · CPC 51":"DRE Gerencial · Totalizadores";
    document.getElementById("dreClassLegenda").textContent=modelo==="cpc51"?"Classificação por categorias CPC 51 usando os mesmos lançamentos da visão gerencial.":"Receita Bruta/Líquida, Lucro Bruto, Margem de Contribuição, EBITDA e resultados calculados automaticamente.";
    const cob=document.getElementById("dreClassCobertura"),faltam=Math.max(0,ag.total-ag.explicitas);if(cob){cob.textContent=faltam?`${ag.explicitas}/${ag.total} contas classificadas · ${faltam} em compatibilidade`:`${ag.total} conta(s) classificadas`;cob.className=faltam?"status-pendente":"status-ativo"}
    const body=rows.map(r=>`<tr class="${r.totalizador?"dre-class-total":"dre-class-componente"} ${r.destaque?"dre-class-destaque":""}"><td>${esc(r.label)}${r.totalizador?'<small>Σ Totalizador automático · não lançável</small>':""}</td>${cols.map(c=>`<td class="numero">${moeda(valor(r.valores,c.indices))}</td>`).join("")}</tr>`).join("");
    t.innerHTML=`<thead><tr><th>Linha da demonstração</th>${cols.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
  }catch(e){console.error("DRE dual view",e);const t=document.getElementById("dreClassTabela");if(t)t.innerHTML='<tbody><tr><td>Não foi possível calcular os totalizadores. Atualize a DRE e tente novamente.</td></tr></tbody>'}finally{busy=false}
}
function agendar(){clearTimeout(timer);timer=setTimeout(render,140)}
function observar(){if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",e=>{if(["dreV6Cenario","dreV6Centro","dreV6Visao","dreV6Conteudo"].includes(e.target?.id))agendar()},true);document.addEventListener("click",e=>{if(e.target?.id==="btnAtualizarDreV6")setTimeout(render,250)},true)}
window.addEventListener("sig:ready",()=>{observar();setTimeout(render,200)});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="ctrl-dre-v6")setTimeout(render,250)});
window.addEventListener("sig:empresa-changed",agendar);window.addEventListener("sig:periodo-changed",agendar);window.addEventListener("sig:data-changed",agendar);
observar();setTimeout(render,250);
