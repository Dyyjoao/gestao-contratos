import { $, on, esc, msg, moeda, empresaAtualId, listarDocumentos, criarDocumento, atualizarDocumento } from "./shared.js";
import { exportarTabelaPdf, exportarTabelaXls } from "./export-utils.js";

const MESES=[["jan","Jan"],["fev","Fev"],["mar","Mar"],["abr","Abr"],["mai","Mai"],["jun","Jun"],["jul","Jul"],["ago","Ago"],["set","Set"],["out","Out"],["nov","Nov"],["dez","Dez"]];
const GRUPOS={receita:"Receita Operacional",deducoes:"Deduções da Receita",custos:"Custos",despesas:"Despesas Operacionais",financeiro:"Resultado Financeiro",impostos:"Impostos",outros:"Outros"};
let classificacoes=[],carregadoEmpresa="";
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const vazio=()=>Object.fromEntries(MESES.map(([m])=>[m,0]));
const total=v=>MESES.reduce((s,[m])=>s+n(v?.[m]),0);
const classeConta=id=>classificacoes.find(x=>x.contaId===id)?.classificacao||"opex";
const classeLabel=v=>v==="capex"?"CAPEX":"OPEX";

async function carregarClassificacoes(){
  const emp=empresaAtualId();if(!emp)return;
  try{classificacoes=await listarDocumentos("classificacoesContas");carregadoEmpresa=emp;anotarPlano();anotarBudget()}catch(e){console.warn("Classificações CAPEX/OPEX ainda não liberadas",e)}
}

async function salvarClassificacao(contaId,classificacao){
  const exist=classificacoes.find(x=>x.contaId===contaId);
  try{
    if(exist)await atualizarDocumento("classificacoesContas",exist.id,{contaId,classificacao});
    else await criarDocumento("classificacoesContas",{contaId,classificacao});
    await carregarClassificacoes();setTimeout(renderDreAvancada,0);
  }catch(e){console.error(e);alert("Não foi possível salvar a classificação CAPEX/OPEX.")}
}

function garantirCabecalhoPlano(){
  const ths=[...document.querySelectorAll("#listaPlanoGerencial")].flatMap(tb=>[...tb.closest("table")?.querySelectorAll("thead th")||[]]);
  if(!ths.length||ths.some(x=>x.dataset.classePlanejamento))return;
  const th=document.createElement("th");th.textContent="Classe";th.dataset.classePlanejamento="1";ths.at(-1)?.before(th);
}
function anotarPlano(){
  garantirCabecalhoPlano();
  document.querySelectorAll("#listaPlanoGerencial tr").forEach(tr=>{
    const btn=tr.querySelector("[data-edit-conta]");if(!btn)return;const id=btn.dataset.editConta;
    let td=tr.querySelector("[data-classe-conta]");if(!td){td=document.createElement("td");td.dataset.classeConta=id;tr.lastElementChild?.before(td)}
    td.innerHTML=`<select class="fpa-class-select" aria-label="Classificação da conta"><option value="opex" ${classeConta(id)==="opex"?"selected":""}>OPEX</option><option value="capex" ${classeConta(id)==="capex"?"selected":""}>CAPEX</option></select>`;
    const s=td.querySelector("select");on(s,"change",()=>salvarClassificacao(id,s.value));
  });
}
function anotarBudget(){
  const filtro=$("budgetClasse")?.value||"todos";
  document.querySelectorAll("#tabelaBudget tbody tr[data-budget-conta]").forEach(tr=>{
    const id=tr.dataset.budgetConta,classe=classeConta(id),cel=tr.querySelector(".conta-col");
    if(cel&&!cel.querySelector(".fpa-classe-badge")){const b=document.createElement("small");b.className=`fpa-classe-badge ${classe}`;b.textContent=classeLabel(classe);cel.appendChild(b)}
    tr.classList.toggle("hidden",filtro!=="todos"&&classe!==filtro);
  });
}

function adicionarControles(){
  const budgetToolbar=$("budgetCentro")?.closest(".fpa-toolbar");
  if(budgetToolbar&&!$("budgetClasse")){
    const c=document.createElement("div");c.className="campo";c.innerHTML='<label for="budgetClasse">Classe</label><select id="budgetClasse"><option value="todos">OPEX + CAPEX</option><option value="opex">Somente OPEX</option><option value="capex">Somente CAPEX</option></select>';$("budgetCentro")?.closest(".campo")?.after(c);on(c.querySelector("select"),"change",anotarBudget);
  }
  const dreToolbar=$("dreCentro")?.closest(".fpa-toolbar");
  if(dreToolbar&&!$("dreClasse")){
    const c=document.createElement("div");c.className="campo";c.innerHTML='<label for="dreClasse">Visão</label><select id="dreClasse"><option value="todos">DRE + CAPEX</option><option value="opex">DRE / OPEX</option><option value="capex">CAPEX</option></select>';$("dreCentro")?.closest(".campo")?.after(c);
    const xls=document.createElement("button");xls.id="btnExportarDreXls";xls.type="button";xls.className="btn-secundario";xls.textContent="Exportar XLS";
    const pdf=document.createElement("button");pdf.id="btnExportarDrePdf";pdf.type="button";pdf.className="btn-secundario";pdf.textContent="Exportar PDF";
    dreToolbar.append(xls,pdf);
    on(c.querySelector("select"),"change",renderDreAvancada);on(xls,"click",exportarDreXls);on(pdf,"click",exportarDrePdf);
  }
}

function docPor(arr,contaId,cc,ano,versao=""){return arr.find(x=>x.contaId===contaId&&(x.centroCustoId||"")===(cc||"")&&Number(x.exercicio)===Number(ano)&&(!versao||x.versao===versao))}
function valoresCenario(contaId,cc,ano,cenario,{realizados,budgets,forecasts}){
  if(cenario==="realizado")return{...vazio(),...(docPor(realizados,contaId,cc,ano)?.valores||{})};
  if(cenario==="budget"){const versao=$("budgetVersao")?.value.trim()||`Budget ${ano} - V1`;return{...vazio(),...(docPor(budgets,contaId,cc,ano,versao)?.valores||{})}}
  const versao=$("forecastVersao")?.value.trim()||"F01",fechado=Number($("forecastFechadoAte")?.value||0),r={...vazio(),...(docPor(realizados,contaId,cc,ano)?.valores||{})},f={...vazio(),...(docPor(forecasts,contaId,cc,ano,versao)?.valores||{})};
  return Object.fromEntries(MESES.map(([m],i)=>[m,i<fechado?r[m]:f[m]]));
}

async function renderDreAvancada(){
  const t=$("tabelaDre");if(!t||!empresaAtualId())return;
  const ano=Number($("dreAno")?.value||new Date().getFullYear()),cenario=$("dreCenario")?.value||"realizado",cc=$("dreCentro")?.value||"",visao=$("dreClasse")?.value||"todos";
  try{
    const [plano,realizados,budgets,forecasts,classes]=await Promise.all([listarDocumentos("planoContasGerencial"),listarDocumentos("realizadoMensal"),listarDocumentos("budgetLinhas"),listarDocumentos("forecastLinhas"),listarDocumentos("classificacoesContas")]);
    classificacoes=classes;const contas=plano.filter(x=>x.status!=="inativo");const linhas=[];
    if(visao!=="capex"){
      for(const [gid,gnome] of Object.entries(GRUPOS)){
        const gs=contas.filter(c=>c.grupoDre===gid&&classeConta(c.id)!=="capex");if(!gs.length)continue;const soma=vazio();
        gs.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario,{realizados,budgets,forecasts}),sinal=c.natureza==="receita"?1:-1;MESES.forEach(([m])=>soma[m]+=sinal*n(v[m]))});
        linhas.push({tipo:"grupo",nome:gnome,valores:soma,total:total(soma)});
        gs.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario,{realizados,budgets,forecasts}),sinal=c.natureza==="receita"?1:-1;linhas.push({tipo:"filha",nome:`${c.codigo} · ${c.nome}`,valores:Object.fromEntries(MESES.map(([m])=>[m,sinal*n(v[m])])),total:sinal*total(v)})});
      }
      const resultado=vazio();linhas.filter(x=>x.tipo==="grupo").forEach(x=>MESES.forEach(([m])=>resultado[m]+=n(x.valores[m])));linhas.push({tipo:"resultado",nome:"RESULTADO",valores:resultado,total:total(resultado)});
    }
    if(visao!=="opex"){
      const caps=contas.filter(c=>classeConta(c.id)==="capex");if(caps.length){const soma=vazio();caps.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario,{realizados,budgets,forecasts});MESES.forEach(([m])=>soma[m]+=Math.abs(n(v[m]))) });linhas.push({tipo:"capexgrupo",nome:"CAPEX / INVESTIMENTOS",valores:soma,total:total(soma)});caps.forEach(c=>{const v=valoresCenario(c.id,cc,ano,cenario,{realizados,budgets,forecasts});linhas.push({tipo:"capex",nome:`${c.codigo} · ${c.nome}`,valores:Object.fromEntries(MESES.map(([m])=>[m,Math.abs(n(v[m]))])),total:Math.abs(total(v))})})}
    }
    t.innerHTML=`<thead><tr><th class="sticky-col conta-col">${visao==="capex"?"CAPEX":"DRE"} ${ano}</th>${MESES.map(([,m])=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${linhas.map(l=>`<tr class="dre-${l.tipo}"><td class="sticky-col conta-col">${l.tipo==="resultado"?`<strong>${esc(l.nome)}</strong>`:esc(l.nome)}</td>${MESES.map(([m])=>`<td class="numero">${moeda(l.valores[m])}</td>`).join("")}<td class="fpa-total">${moeda(l.total)}</td></tr>`).join("")}</tbody>`;
  }catch(e){console.error("Erro na DRE CAPEX/OPEX",e)}
}

function metaDre(){const empresa=document.querySelector("#empresaContexto option:checked")?.textContent||"Empresa",ano=$("dreAno")?.value||"",cenario=$("dreCenario")?.selectedOptions?.[0]?.textContent||"";return[empresa,`Exercício ${ano}`,cenario]}
function exportarDreXls(){exportarTabelaXls($("tabelaDre"),{nome:`dre_${$("dreAno")?.value||""}`,titulo:"DRE Gerencial",meta:metaDre()})}
async function exportarDrePdf(){await exportarTabelaPdf($("tabelaDre"),{nome:`dre_${$("dreAno")?.value||""}`,titulo:"DRE Gerencial",meta:metaDre()})}

function bind(){
  adicionarControles();
  const plano=$("listaPlanoGerencial"),budget=$("tabelaBudget");
  if(plano)new MutationObserver(()=>anotarPlano()).observe(plano,{childList:true,subtree:true});
  if(budget)new MutationObserver(()=>anotarBudget()).observe(budget,{childList:true,subtree:true});
  on($("btnAtualizarDre"),"click",()=>setTimeout(renderDreAvancada,0));["dreAno","dreCenario","dreCentro"].forEach(id=>on($(id),"change",()=>setTimeout(renderDreAvancada,0)));
  window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="controladoria"){adicionarControles();if(carregadoEmpresa!==empresaAtualId())carregarClassificacoes();setTimeout(()=>{anotarPlano();anotarBudget();renderDreAvancada()},150)}});
  window.addEventListener("sig:empresa-changed",()=>{classificacoes=[];carregadoEmpresa="";carregarClassificacoes();setTimeout(renderDreAvancada,150)});
}
bind();
