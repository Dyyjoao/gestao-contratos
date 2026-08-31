import { abrirPagina } from "./core.js";
import { $, esc, permite, moeda, listarDocumentos, periodoAno, periodoChave, empresasSelecionadasIds, nomeEmpresa } from "./shared.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={
  total:{label:"Total do exercício",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"T1 · Jan–Mar",indices:[0,1,2]},t2:{label:"T2 · Abr–Jun",indices:[3,4,5]},
  t3:{label:"T3 · Jul–Set",indices:[6,7,8]},t4:{label:"T4 · Out–Dez",indices:[9,10,11]}
};
for(let i=0;i<12;i++)PERIODOS[`m${String(i+1).padStart(2,"0")}`]={label:NOMES[i],indices:[i]};
const GRUPOS={receita:"Receita Operacional",deducoes:"Deduções da Receita",custos:"Custos",despesas:"Despesas Operacionais",financeiro:"Resultado Financeiro",impostos:"Impostos",outros:"Outros"};
let plano=[],centros=[],docs=[],realizados=[],carregando=false,sujo=false;

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const pagina=()=>$("pagina-ctrl-dre");
const visivel=()=>pagina()&&!pagina().classList.contains("hidden");
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
function periodo(){return PERIODOS[periodoChave()]||PERIODOS.total}
function versaoMaisRecente(arr,ano){const m=new Map();arr.filter(x=>Number(x.exercicio)===Number(ano)&&x.versao).forEach(x=>m.set(x.versao,Math.max(m.get(x.versao)||0,stamp(x))));return [...m.entries()].sort((a,b)=>b[1]-a[1]||String(b[0]).localeCompare(String(a[0]),"pt-BR"))[0]?.[0]||""}
function contextoTexto(){const ids=empresasSelecionadasIds(),p=periodo();return `${ids.length>1?`${ids.length} empresas consolidadas`:ids.length===1?nomeEmpresa(ids[0]):"Sem empresa"} · ${p.label} · ${periodoAno()}`}

function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-ctrl-dre";s.className="pagina hidden";s.innerHTML=`
    <div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA & FP&A</span><h2>DRE Gerencial</h2><p>Consulta isolada. Os filtros do cabeçalho definem o contexto e a consulta só roda quando esta tela é aberta ou quando você clicar em Atualizar.</p></div><button id="btnAtualizarDreV2" class="btn-primario" type="button">Atualizar</button></div>
    <div id="dreV2Aviso" class="modulo-aviso hidden"></div>
    <div class="fpa-toolbar"><div class="campo"><label for="dreV2Cenario">Cenário</label><select id="dreV2Cenario"><option value="realizado">Realizado</option><option value="budget">Budget</option><option value="forecast">Forecast</option></select></div><div class="campo"><label for="dreV2Centro">Centro de custo</label><select id="dreV2Centro"><option value="">Consolidado / todos</option></select></div><div class="campo"><label>Contexto</label><div id="dreV2Contexto" class="fpa-contexto-chip">—</div></div></div>
    <section class="lista-card"><div class="lista-cabecalho"><div><h3 id="dreV2Titulo">DRE</h3><p id="dreV2Legenda">Clique em Atualizar.</p></div></div><div class="tabela-container"><table id="tabelaDreV2" class="tabela"><tbody><tr><td>Carregando...</td></tr></tbody></table></div></section>`;
  main.appendChild(s);
  $("btnAtualizarDreV2")?.addEventListener("click",()=>carregar({forcar:true}));
  $("dreV2Cenario")?.addEventListener("change",()=>{sujo=true;marcarSujo("Cenário alterado.")});
  $("dreV2Centro")?.addEventListener("change",render);
}

function marcarSujo(texto="Filtros alterados."){
  if(!visivel())return;const a=$("dreV2Aviso");if(a){a.classList.remove("hidden");a.innerHTML=`<strong>${esc(texto)}</strong> Clique em Atualizar para consultar o novo contexto sem disparar consultas em segundo plano.`}if($("dreV2Contexto"))$("dreV2Contexto").textContent=contextoTexto();
}
function limparAviso(){const a=$("dreV2Aviso");a?.classList.add("hidden")}

function preencherCentros(){
  const sel=$("dreV2Centro");if(!sel)return;const atual=sel.value,ids=empresasSelecionadasIds();
  const arr=[...centros].filter(x=>x.status!=="inativo").sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"));
  sel.innerHTML='<option value="">Consolidado / todos os centros</option>'+arr.map(x=>`<option value="${esc(x.id)}">${esc(x.codigo||"")} · ${esc(x.nome||"")}${ids.length>1?` · ${esc(nomeEmpresa(x.empresaId))}`:""}</option>`).join("");
  if(arr.some(x=>x.id===atual))sel.value=atual;
}

function valorDoc(d,i,cenario){
  if(cenario!=="forecast")return n(d?.valores?.[MESES[i]]);
  const fechado=n(d?.realizadoFechadoAte),r=realizados.find(x=>x.empresaId===d.empresaId&&x.contaId===d.contaId&&(x.centroCustoId||"")===(d.centroCustoId||"")&&Number(x.exercicio)===Number(d.exercicio));
  return i<fechado?n(r?.valores?.[MESES[i]]):n(d?.valores?.[MESES[i]]);
}

function render(){
  const t=$("tabelaDreV2");if(!t)return;const ano=periodoAno(),p=periodo(),cenario=$("dreV2Cenario")?.value||"realizado",cc=$("dreV2Centro")?.value||"";
  const versao=cenario==="realizado"?"":versaoMaisRecente(docs,ano),filtrados=docs.filter(x=>Number(x.exercicio)===Number(ano)&&(!cc||(x.centroCustoId||"")===cc)&&(!versao||x.versao===versao));
  const planoMap=new Map(plano.map(x=>[x.id,x])),linhas=new Map();
  filtrados.forEach(d=>{const c=planoMap.get(d.contaId);if(!c||c.status==="inativo")return;const chave=`${c.grupoDre||"outros"}|${c.natureza||"despesa"}|${c.codigo||c.id}`,sinal=c.natureza==="receita"?1:-1;if(!linhas.has(chave))linhas.set(chave,{codigo:c.codigo||"",nome:c.nome||"Conta",grupo:c.grupoDre||"outros",natureza:c.natureza||"despesa",valores:Array(12).fill(0)});const l=linhas.get(chave);for(let i=0;i<12;i++)l.valores[i]+=sinal*valorDoc(d,i,cenario)});
  const contas=[...linhas.values()].sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo),"pt-BR")),indices=p.indices,corpo=[];let resultado=Array(12).fill(0);
  for(const [gid,gnome] of Object.entries(GRUPOS)){
    const gs=contas.filter(x=>x.grupo===gid);if(!gs.length)continue;const subtotal=Array(12).fill(0);gs.forEach(x=>x.valores.forEach((v,i)=>subtotal[i]+=v));subtotal.forEach((v,i)=>resultado[i]+=v);
    corpo.push(`<tr class="dre-grupo"><td><strong>${esc(gnome)}</strong></td>${indices.map(i=>`<td class="numero"><strong>${moeda(subtotal[i])}</strong></td>`).join("")}${indices.length>1?`<td class="numero fpa-total"><strong>${moeda(indices.reduce((s,i)=>s+subtotal[i],0))}</strong></td>`:""}</tr>`);
    gs.forEach(x=>corpo.push(`<tr class="dre-filha"><td>${esc(x.codigo)} · ${esc(x.nome)}</td>${indices.map(i=>`<td class="numero">${moeda(x.valores[i])}</td>`).join("")}${indices.length>1?`<td class="numero fpa-total">${moeda(indices.reduce((s,i)=>s+x.valores[i],0))}</td>`:""}</tr>`));
  }
  corpo.push(`<tr class="dre-resultado"><td><strong>RESULTADO</strong></td>${indices.map(i=>`<td class="numero"><strong>${moeda(resultado[i])}</strong></td>`).join("")}${indices.length>1?`<td class="numero"><strong>${moeda(indices.reduce((s,i)=>s+resultado[i],0))}</strong></td>`:""}</tr>`);
  t.innerHTML=`<thead><tr><th>DRE ${ano}</th>${indices.map(i=>`<th>${NOMES[i]}</th>`).join("")}${indices.length>1?`<th>${periodoChave()==="total"?"Total":`Total ${periodoChave().toUpperCase()}`}</th>`:""}</tr></thead><tbody>${corpo.join("")||'<tr><td>Sem dados para o contexto.</td></tr>'}</tbody>`;
  if($("dreV2Titulo"))$("dreV2Titulo").textContent=`DRE · ${cenario==="realizado"?"Realizado":cenario==="budget"?"Budget":"Forecast"}`;
  if($("dreV2Legenda"))$("dreV2Legenda").textContent=`${contextoTexto()}${versao?` · versão ${versao}`:""}`;
  if($("dreV2Contexto"))$("dreV2Contexto").textContent=contextoTexto();
}

export async function carregar({forcar=false}={}){
  criarPagina();if(carregando||!permite("controladoria","visualizar")&&!permite("controladoria"))return;if(!empresasSelecionadasIds().length){marcarSujo("Selecione ao menos uma empresa.");return}
  carregando=true;const b=$("btnAtualizarDreV2");if(b){b.disabled=true;b.textContent="Atualizando..."}
  try{
    const cenario=$("dreV2Cenario")?.value||"realizado",tarefas=[listarDocumentos("planoContasGerencial"),listarDocumentos("centrosCusto")];
    if(cenario==="realizado")tarefas.push(listarDocumentos("realizadoMensal"));
    if(cenario==="budget")tarefas.push(listarDocumentos("budgetLinhas"));
    if(cenario==="forecast")tarefas.push(listarDocumentos("forecastLinhas"),listarDocumentos("realizadoMensal"));
    const r=await Promise.all(tarefas);plano=r[0];centros=r[1];docs=r[2]||[];realizados=cenario==="forecast"?(r[3]||[]):[];preencherCentros();render();sujo=false;limparAviso();
  }catch(e){console.error("DRE isolada:",e);const a=$("dreV2Aviso");if(a){a.classList.remove("hidden");a.textContent="Não foi possível atualizar a DRE."}}
  finally{carregando=false;if(b){b.disabled=false;b.textContent="Atualizar"}}
}

export function abrir(){criarPagina();abrirPagina("ctrl-dre");const t=$("tituloPagina");if(t)t.textContent="DRE Gerencial";carregar({forcar:true})}

criarPagina();
window.addEventListener("sig:periodo-changed",()=>{sujo=true;marcarSujo("Período alterado no cabeçalho.")});
window.addEventListener("sig:empresa-changed",()=>{sujo=true;marcarSujo("Seleção de empresas alterada.")});
