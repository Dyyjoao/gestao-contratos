import { listarDocumentos, empresasSelecionadasIds, periodoAno, periodoChave, moeda, esc } from "./shared.js";
import { contaAnalitica } from "./account-tree.js";
import { multiplicadorResultado } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { mapaDepreciacaoPlanejamento } from "./asset-planning.js";
import { CC_ESTATISTICO_ID } from "./statistical-center.js";
import { agregarClassificacao, linhasResumoGerencial, linhasResumoCpc51, normalizarClassificacaoDre } from "./dre-classification.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CPC_ROW_KEY={cpc_operacional:"operacional",cpc_investimento:"investimento",cpc_financiamento:"financiamento",cpc_tributos:"tributos_lucro",cpc_descontinuadas:"operacoes_descontinuadas"};
const vazio=()=>Array(12).fill(0);
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
let observer=null,timer=null,busy=false;

function colunas(){const p=periodoChave();if(p==="total"){const a=[];for(let q=0;q<4;q++){for(let i=q*3;i<q*3+3;i++)a.push({label:NOMES[i],indices:[i]});a.push({label:`T${q+1}`,indices:[q*3,q*3+1,q*3+2]})}a.push({label:"Total",indices:[0,1,2,3,4,5,6,7,8,9,10,11]});return a}if(/^t[1-4]$/.test(p)){const q=Number(p.slice(1))-1,idx=[q*3,q*3+1,q*3+2];return[...idx.map(i=>({label:NOMES[i],indices:[i]})),{label:`Total T${q+1}`,indices:idx}]}const m=Number(String(p).slice(1))-1;return[{label:NOMES[m]||"Período",indices:[Math.max(0,m)]}]}
function valor(v,indices){return(indices||[]).reduce((s,i)=>s+n(v?.[i]),0)}
function somaVetores(a,b){return(a||vazio()).map((v,i)=>n(v)+n(b?.[i]))}
function key(d){return`${d.empresaId}|${d.centroCustoId||""}|${d.contaId}`}
function canonicos(arr,{ano,versoes=null}={}){const m=new Map();for(const d of arr||[]){if(d.tipoRegistro==="budget_meta"||Number(d.exercicio)!==Number(ano))continue;if(versoes&&d.versao!==versoes.get(d.empresaId))continue;const k=key(d),at=m.get(k);if(!at||stamp(d)>=stamp(at))m.set(k,d)}return[...m.values()]}
function versoesRecentes(arr,ano,empresas){const out=new Map();for(const emp of empresas){const m=new Map();(arr||[]).filter(d=>d.empresaId===emp&&d.tipoRegistro!=="budget_meta"&&Number(d.exercicio)===Number(ano)&&d.versao).forEach(d=>m.set(d.versao,Math.max(m.get(d.versao)||0,stamp(d))));const v=[...m.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];if(v)out.set(emp,v)}return out}
function objetoVetor(d){return MESES.map(m=>n(d?.valores?.[m]))}
function adicionar(out,empresaId,conta,centroCustoId,valores,origem="documento"){out.push({empresaId,conta,centroCustoId,valores:valores.map(v=>v*multiplicadorResultado(conta)),origem})}

async function linhasDados(){
  const ano=periodoAno(),empresas=empresasSelecionadasIds(),cen=document.getElementById("dreV6Cenario")?.value||"realizado",ccFiltro=document.getElementById("dreV6Centro")?.value||"";
  if(ccFiltro===CC_ESTATISTICO_ID)return{linhas:[],aviso:"A DRE é financeira. O filtro atual está em Estatísticas / Indicadores."};
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

function coberturaClassificacao(linhas){const contas=new Map();for(const item of linhas||[]){if(!item?.conta?.id)continue;const k=`${item.empresaId}|${item.conta.id}`;if(!contas.has(k))contas.set(k,normalizarClassificacaoDre(item.conta).explicita)}const vals=[...contas.values()];return{total:vals.length,explicitas:vals.filter(Boolean).length}}
function detalhesAgrupados(linhas,modelo){const porGrupo=new Map();for(const item of linhas||[]){const c=item.conta,cl=normalizarClassificacaoDre(c),grupo=modelo==="cpc51"?cl.categoriaCpc51:cl.linha,codigo=String(c.codigo||""),nome=String(c.nome||"Conta"),k=`${grupo}|${codigo}|${nome}`;let x=porGrupo.get(k);if(!x){x={grupo,codigo,nome,valores:vazio(),reduzidos:new Set(),empresas:new Set()};porGrupo.set(k,x)}x.valores=somaVetores(x.valores,item.valores||vazio());const red=String(c.codigoReduzido||"").trim();if(red)x.reduzidos.add(red);x.empresas.add(item.empresaId)}const out=new Map();for(const x of porGrupo.values()){if(!out.has(x.grupo))out.set(x.grupo,[]);out.get(x.grupo).push(x)}for(const arr of out.values())arr.sort((a,b)=>a.codigo.localeCompare(b.codigo,"pt-BR")||a.nome.localeCompare(b.nome,"pt-BR"));return out}
function chaveDetalhe(r,modelo){if(r.totalizador)return"";return modelo==="cpc51"?(CPC_ROW_KEY[r.id]||""):r.id}
function reduzidoDetalhe(x){if(!x.reduzidos.size)return"";return x.reduzidos.size===1?` · Red. ${[...x.reduzidos][0]}`:" · Red. diversos"}
function linhaContaHtml(x,cols){return`<tr class="dre-class-conta"><td><span>${esc(x.codigo)} · ${esc(x.nome)}</span><small>Conta analítica${esc(reduzidoDetalhe(x))}${x.empresas.size>1?` · consolidada em ${x.empresas.size} empresas`:""}</small></td>${cols.map(c=>`<td class="numero">${moeda(valor(x.valores,c.indices))}</td>`).join("")}</tr>`}
function originalPlano(){return document.querySelector('#pagina-ctrl-dre-v6 [data-dre-class-original="1"]')}
function aplicarVisibilidadePlano(){const o=originalPlano(),chk=document.getElementById("dreClassMostrarPlano");if(o&&chk)o.classList.toggle("hidden",!chk.checked)}

function instalar(){
  const pag=document.getElementById("pagina-ctrl-dre-v6");if(!pag)return false;
  if(!document.getElementById("dreClassModelo")){
    const toolbar=pag.querySelector(".fpa-toolbar");toolbar?.insertAdjacentHTML("afterbegin",`<div class="campo"><label for="dreClassModelo">Modelo da DRE</label><select id="dreClassModelo"><option value="gerencial">Gerencial · FP&A</option><option value="cpc51">Societária · CPC 51</option></select></div><label class="dre-class-toggle"><input id="dreClassDetalhar" type="checkbox" checked> Detalhar contas</label><label class="dre-class-toggle"><input id="dreClassMostrarPlano" type="checkbox"> Estrutura do plano</label>`);
    const lista=pag.querySelector("section.lista-card");if(lista)lista.dataset.dreClassOriginal="1";
    lista?.insertAdjacentHTML("beforebegin",`<section id="dreClassResumo" class="lista-card dre-class-principal"><div class="lista-cabecalho"><div><h3 id="dreClassTitulo">DRE Gerencial</h3><p id="dreClassLegenda">Uma única base de lançamentos, com subtotais automáticos e contas analíticas detalhadas.</p></div><span id="dreClassCobertura" class="status-ativo">—</span></div><div class="dre-class-note">Linhas destacadas são <strong>totalizadores calculados</strong>: não existem como contas no plano e nunca recebem lançamentos.</div><div class="fpa-grid-wrap"><table id="dreClassTabela" class="fpa-grid dre-class-table"><tbody><tr><td>Carregando...</td></tr></tbody></table></div></section>`);
    const st=document.createElement("style");st.id="dre-class-summary-css";st.textContent=`.dre-class-principal{border-top:3px solid #0b1f33}.dre-class-table td:first-child,.dre-class-table th:first-child{min-width:360px}.dre-class-total td{font-weight:900;background:#eef3f5}.dre-class-destaque td{background:#0b1f33!important;color:#fff!important;font-weight:900}.dre-class-componente td:first-child{font-weight:800;color:#344054}.dre-class-conta td{background:#fff}.dre-class-conta td:first-child{padding-left:28px;color:#475467}.dre-class-conta td:first-child span{display:block;font-size:10px}.dre-class-conta td:first-child small{display:block;margin-top:2px;color:#98a2b3;font-size:8px}.dre-class-table .numero{text-align:right;font-variant-numeric:tabular-nums}.dre-class-note{margin:0 0 10px;padding:8px 10px;border-radius:8px;background:#f8fafb;color:#667085;font-size:9px}.dre-class-toggle{display:flex;align-items:center;gap:5px;font-size:10px;color:#475467;white-space:nowrap}.dre-class-toggle input{accent-color:currentColor}`;document.head.appendChild(st);
    document.getElementById("dreClassModelo")?.addEventListener("change",render);
    document.getElementById("dreClassDetalhar")?.addEventListener("change",render);
    document.getElementById("dreClassMostrarPlano")?.addEventListener("change",aplicarVisibilidadePlano);
    aplicarVisibilidadePlano();
  }
  return true;
}

async function render(){
  if(!instalar()||busy)return;const pag=document.getElementById("pagina-ctrl-dre-v6");if(!pag||pag.classList.contains("hidden"))return;busy=true;
  try{
    const t=document.getElementById("dreClassTabela"),modelo=document.getElementById("dreClassModelo")?.value||"gerencial",detalhar=document.getElementById("dreClassDetalhar")?.checked!==false,dados=await linhasDados();if(!t)return;
    aplicarVisibilidadePlano();
    if(dados.aviso){t.innerHTML=`<tbody><tr><td>${esc(dados.aviso)}</td></tr></tbody>`;return}
    const ag=agregarClassificacao(dados.linhas),rows=modelo==="cpc51"?linhasResumoCpc51(ag):linhasResumoGerencial(ag),cols=colunas(),detalhes=detalhesAgrupados(dados.linhas,modelo),cobertura=coberturaClassificacao(dados.linhas);
    document.getElementById("dreClassTitulo").textContent=modelo==="cpc51"?"DRE Societária · CPC 51":"DRE Gerencial · FP&A";
    document.getElementById("dreClassLegenda").textContent=modelo==="cpc51"?"Categorias societárias e subtotais CPC 51 alimentados pela mesma base do Realizado, Budget ou Forecast.":"Receita, margens, EBITDA e resultados com detalhamento das mesmas contas analíticas usadas nos lançamentos.";
    const cob=document.getElementById("dreClassCobertura"),faltam=Math.max(0,cobertura.total-cobertura.explicitas);if(cob){cob.textContent=faltam?`${cobertura.explicitas}/${cobertura.total} contas classificadas · ${faltam} em compatibilidade`:`${cobertura.total} conta(s) classificadas`;cob.className=faltam?"status-pendente":"status-ativo"}
    let body="";for(const r of rows){body+=`<tr class="${r.totalizador?"dre-class-total":"dre-class-componente"} ${r.destaque?"dre-class-destaque":""}"><td>${esc(r.label)}${r.totalizador?'<small>Σ Totalizador automático · não lançável</small>':""}</td>${cols.map(c=>`<td class="numero">${moeda(valor(r.valores,c.indices))}</td>`).join("")}</tr>`;if(detalhar){const k=chaveDetalhe(r,modelo);for(const x of(k?detalhes.get(k)||[]:[]))body+=linhaContaHtml(x,cols)}}
    t.innerHTML=`<thead><tr><th>Linha da demonstração</th>${cols.map(c=>`<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
  }catch(e){console.error("DRE dual view",e);const t=document.getElementById("dreClassTabela");if(t)t.innerHTML='<tbody><tr><td>Não foi possível calcular a DRE. Atualize os dados e tente novamente.</td></tr></tbody>'}finally{busy=false}
}
function agendar(){clearTimeout(timer);timer=setTimeout(render,140)}
function observar(){if(observer)return;observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener("change",e=>{if(["dreV6Cenario","dreV6Centro","dreV6Visao","dreV6Conteudo"].includes(e.target?.id))agendar()},true);document.addEventListener("click",e=>{if(e.target?.id==="btnAtualizarDreV6")setTimeout(render,250)},true)}
window.addEventListener("sig:ready",()=>{observar();setTimeout(render,200)});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="ctrl-dre-v6")setTimeout(render,250)});
window.addEventListener("sig:empresa-changed",agendar);window.addEventListener("sig:periodo-changed",agendar);window.addEventListener("sig:data-changed",agendar);
observar();setTimeout(render,250);
