import { $, on, esc, permite, moeda, listarDocumentos } from "./shared.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES_MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PERIODOS={
  total:{label:"Total",indices:[0,1,2,3,4,5,6,7,8,9,10,11]},
  t1:{label:"T1 · Jan–Mar",indices:[0,1,2]},
  t2:{label:"T2 · Abr–Jun",indices:[3,4,5]},
  t3:{label:"T3 · Jul–Set",indices:[6,7,8]},
  t4:{label:"T4 · Out–Dez",indices:[9,10,11]}
};
NOMES_MESES.forEach((nome,i)=>PERIODOS[`m${String(i+1).padStart(2,"0")}`]={label:nome,indices:[i]});
let carregando=false;

function garantirCss(){
  if(document.getElementById("sig-dashboard-finance-css"))return;
  const l=document.createElement("link");l.id="sig-dashboard-finance-css";l.rel="stylesheet";l.href="dashboard-finance.css?v=15";document.head.appendChild(l);
}
function opcoesPeriodo(){
  return `<optgroup label="Períodos"><option value="total">Total</option><option value="t1">T1 · Jan–Mar</option><option value="t2">T2 · Abr–Jun</option><option value="t3">T3 · Jul–Set</option><option value="t4">T4 · Out–Dez</option></optgroup><optgroup label="Meses">${NOMES_MESES.map((m,i)=>`<option value="m${String(i+1).padStart(2,"0")}">${m}</option>`).join("")}</optgroup>`;
}
function montar(){
  const pagina=$("pagina-dashboard");if(!pagina||$("dashFinanceiro"))return;
  const grade=pagina.querySelector(".dashboard-grid"),agora=new Date(),ano=agora.getFullYear(),periodoAtual=`m${String(agora.getMonth()+1).padStart(2,"0")}`;
  const s=document.createElement("section");s.id="dashFinanceiro";s.className="lista-card dashboard-financeiro";
  s.innerHTML=`
    <div class="lista-cabecalho">
      <div><h3>Visão financeira</h3><p>Realizado, Budget, Forecast e caixa da empresa ativa no período selecionado.</p></div>
      <div class="dash-finance-filtros">
        <div class="campo"><label for="dashFinanceAno">Exercício</label><input id="dashFinanceAno" type="number" min="2020" max="2100" value="${ano}"></div>
        <div class="campo"><label for="dashFinancePeriodo">Competência</label><select id="dashFinancePeriodo">${opcoesPeriodo()}</select></div>
      </div>
    </div>
    <div class="kpi-grid kpi-grid-6 dash-finance-kpis">
      <div class="kpi-card"><span>Receita realizada</span><strong id="dashFinReceita">—</strong><small id="dashFinReceitaSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>OPEX realizado</span><strong id="dashFinOpex">—</strong><small id="dashFinOpexSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>Resultado</span><strong id="dashFinResultado">—</strong><small id="dashFinResultadoSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>Margem</span><strong id="dashFinMargem">—</strong><small id="dashFinMargemSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>CAPEX realizado</span><strong id="dashFinCapex">—</strong><small id="dashFinCapexSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>Forecast do período</span><strong id="dashFinForecast">—</strong><small id="dashFinForecastSub" class="kpi-subvalor">—</small></div>
    </div>
    <div class="dash-finance-grid">
      <div class="dash-finance-box">
        <h4>Realizado × Budget × Forecast</h4><p id="dashFinLegenda">Carregando visão financeira...</p>
        <table class="dash-finance-table"><thead><tr><th>Indicador</th><th>Realizado</th><th>Budget</th><th>Forecast</th><th>Δ vs Budget</th></tr></thead><tbody id="dashFinTabela"><tr><td colspan="5">Carregando...</td></tr></tbody></table>
      </div>
      <div class="dash-finance-box">
        <h4>Posição de caixa</h4><p>Saldo bancário e projeções financeiras a partir dos lançamentos cadastrados.</p>
        <div class="dash-cash-list">
          <div class="dash-cash-row"><span>Saldo liquidado hoje</span><strong id="dashFinCaixaHoje">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+30</span><strong id="dashFinCaixaD30">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+60</span><strong id="dashFinCaixaD60">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+90</span><strong id="dashFinCaixaD90">—</strong></div>
        </div>
        <div id="dashFinCaixaAlerta"></div>
      </div>
    </div>`;
  if(grade)pagina.insertBefore(s,grade);else pagina.appendChild(s);
  $("dashFinancePeriodo").value=periodoAtual;
  on($("dashFinanceAno"),"change",carregar);
  on($("dashFinancePeriodo"),"change",carregar);
}

const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const stamp=x=>num(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
function versaoMaisRecente(arr,ano){
  const docs=arr.filter(x=>Number(x.exercicio)===Number(ano)&&x.versao);if(!docs.length)return"";
  const mapa=new Map();docs.forEach(x=>mapa.set(x.versao,Math.max(mapa.get(x.versao)||0,stamp(x))));
  return [...mapa.entries()].sort((a,b)=>b[1]-a[1]||String(b[0]).localeCompare(String(a[0]),"pt-BR"))[0]?.[0]||"";
}
function indicesPeriodo(periodo){return (PERIODOS[periodo]||PERIODOS.total).indices}
function valorPeriodo(valores,periodo){return indicesPeriodo(periodo).reduce((s,i)=>s+num(valores?.[MESES[i]]),0)}
function somaCenario({docs,plano,classes,ano,periodo,versao=""}){
  const pmap=new Map(plano.map(x=>[x.id,x])),cmap=new Map(classes.map(x=>[x.contaId,x.classificacao||"opex"]));
  const out={receita:0,opex:0,capex:0,resultado:0};
  docs.filter(x=>Number(x.exercicio)===Number(ano)&&(!versao||x.versao===versao)).forEach(x=>{
    const conta=pmap.get(x.contaId);if(!conta)return;const v=valorPeriodo(x.valores,periodo),classe=cmap.get(x.contaId)||"opex";
    if(classe==="capex"){out.capex+=Math.abs(v);return}
    if(conta.natureza==="receita")out.receita+=v;else out.opex+=Math.abs(v);
  });
  out.resultado=out.receita-out.opex;return out;
}
function somaForecast({forecasts,realizados,plano,classes,ano,periodo,versao}){
  const pmap=new Map(plano.map(x=>[x.id,x])),cmap=new Map(classes.map(x=>[x.contaId,x.classificacao||"opex"]));
  const fdocs=forecasts.filter(x=>Number(x.exercicio)===Number(ano)&&(!versao||x.versao===versao));
  const chaves=new Map();
  realizados.filter(x=>Number(x.exercicio)===Number(ano)).forEach(x=>chaves.set(`${x.contaId}|${x.centroCustoId||""}`,{contaId:x.contaId,cc:x.centroCustoId||""}));
  fdocs.forEach(x=>chaves.set(`${x.contaId}|${x.centroCustoId||""}`,{contaId:x.contaId,cc:x.centroCustoId||""}));
  const out={receita:0,opex:0,capex:0,resultado:0};
  chaves.forEach(k=>{
    const conta=pmap.get(k.contaId);if(!conta)return;
    const r=realizados.find(x=>Number(x.exercicio)===Number(ano)&&x.contaId===k.contaId&&(x.centroCustoId||"")===k.cc);
    const f=fdocs.find(x=>x.contaId===k.contaId&&(x.centroCustoId||"")===k.cc);
    const fechado=num(f?.realizadoFechadoAte),vals={};
    MESES.forEach((m,i)=>vals[m]=i<fechado?num(r?.valores?.[m]):num(f?.valores?.[m]));
    const v=valorPeriodo(vals,periodo),classe=cmap.get(k.contaId)||"opex";
    if(classe==="capex")out.capex+=Math.abs(v);else if(conta.natureza==="receita")out.receita+=v;else out.opex+=Math.abs(v);
  });
  out.resultado=out.receita-out.opex;return out;
}
function pct(atual,base){return base?((atual-base)/Math.abs(base))*100:null}
function pctTxt(atual,base){const p=pct(atual,base);return p===null?"—":`${p>0?"+":""}${p.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}
function varClass(atual,base,inverter=false){const p=pct(atual,base);if(p===null||Math.abs(p)<.01)return"";const bom=inverter?p<0:p>0;return bom?"positiva":"negativa"}
function set(id,v){if($(id))$(id).textContent=v}
function renderTabela(real,budget,forecast){
  const rows=[
    ["Receita",real.receita,budget.receita,forecast.receita,false],
    ["OPEX",real.opex,budget.opex,forecast.opex,true],
    ["Resultado",real.resultado,budget.resultado,forecast.resultado,false,"resultado"],
    ["CAPEX",real.capex,budget.capex,forecast.capex,true,"capex"]
  ];
  const tb=$("dashFinTabela");if(!tb)return;
  tb.innerHTML=rows.map(([nome,r,b,f,inv,classe])=>`<tr class="${classe||""}"><td>${esc(nome)}</td><td>${moeda(r)}</td><td>${moeda(b)}</td><td>${moeda(f)}</td><td class="dash-finance-var ${varClass(r,b,inv)}">${pctTxt(r,b)}</td></tr>`).join("");
}
function addDias(iso,dias){const [a,m,d]=iso.split("-").map(Number),x=new Date(Date.UTC(a,m-1,d));x.setUTCDate(x.getUTCDate()+dias);return x.toISOString().slice(0,10)}
function renderCaixa(contas,lancamentos){
  const hoje=new Date().toISOString().slice(0,10),ativas=contas.filter(x=>x.status!=="inativo"),base=ativas.reduce((s,x)=>s+num(x.saldoAbertura),0),validos=lancamentos.filter(x=>x.status!=="cancelado");
  const mov=(data,liquidado=false)=>validos.filter(x=>x.data<=data&&(!liquidado||x.status==="liquidado")).reduce((s,x)=>s+(x.natureza==="entrada"?1:-1)*num(x.valor),0);
  set("dashFinCaixaHoje",moeda(base+mov(hoje,true)));set("dashFinCaixaD30",moeda(base+mov(addDias(hoje,30))));set("dashFinCaixaD60",moeda(base+mov(addDias(hoje,60))));set("dashFinCaixaD90",moeda(base+mov(addDias(hoje,90))));
  const venc=validos.filter(x=>x.status!=="liquidado"&&x.data<hoje).length,al=$("dashFinCaixaAlerta");
  if(al)al.innerHTML=venc?`<div class="dash-cash-alerta">${venc} lançamento(s) pendente(s) com data vencida. A projeção merece revisão.</div>`:"";
}

export async function carregar(){
  montar();if(carregando||!permite("controladoria")){const s=$("dashFinanceiro");if(s)s.classList.toggle("hidden",!permite("controladoria"));return}
  const s=$("dashFinanceiro");if(s)s.classList.remove("hidden");
  const ano=Number($("dashFinanceAno")?.value||new Date().getFullYear()),periodo=$("dashFinancePeriodo")?.value||"total",rotulo=(PERIODOS[periodo]||PERIODOS.total).label;
  carregando=true;
  try{
    const [plano,classes,realizados,budgets,forecasts,contas,lancamentos]=await Promise.all([
      listarDocumentos("planoContasGerencial"),listarDocumentos("classificacoesContas"),listarDocumentos("realizadoMensal"),listarDocumentos("budgetLinhas"),listarDocumentos("forecastLinhas"),listarDocumentos("contasBancarias"),listarDocumentos("fluxoCaixaLancamentos")
    ]);
    const bv=versaoMaisRecente(budgets,ano),fv=versaoMaisRecente(forecasts,ano);
    const real=somaCenario({docs:realizados,plano,classes,ano,periodo}),budget=somaCenario({docs:budgets,plano,classes,ano,periodo,versao:bv}),forecast=somaForecast({forecasts,realizados,plano,classes,ano,periodo,versao:fv});
    const margem=real.receita?(real.resultado/Math.abs(real.receita))*100:0;
    set("dashFinReceita",moeda(real.receita));set("dashFinReceitaSub",`${pctTxt(real.receita,budget.receita)} vs Budget`);
    set("dashFinOpex",moeda(real.opex));set("dashFinOpexSub",`${pctTxt(real.opex,budget.opex)} vs Budget`);
    set("dashFinResultado",moeda(real.resultado));set("dashFinResultadoSub",`${pctTxt(real.resultado,budget.resultado)} vs Budget`);
    set("dashFinMargem",`${margem.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`);set("dashFinMargemSub","Resultado ÷ Receita");
    set("dashFinCapex",moeda(real.capex));set("dashFinCapexSub",`${pctTxt(real.capex,budget.capex)} vs Budget`);
    set("dashFinForecast",moeda(forecast.resultado));set("dashFinForecastSub",fv?`Versão ${fv}`:"Sem Forecast salvo");
    set("dashFinLegenda",`${rotulo} · ${ano} · Budget ${bv||"não identificado"} · Forecast ${fv||"não identificado"}`);
    set("dashResultadoGerencial",moeda(real.resultado));set("dashVariacaoBudget",`${pctTxt(real.resultado,budget.resultado)} vs. budget`);
    renderTabela(real,budget,forecast);renderCaixa(contas,lancamentos);
  }catch(e){console.error("Dashboard financeiro:",e);const tb=$("dashFinTabela");if(tb)tb.innerHTML='<tr><td colspan="5" class="dash-finance-empty">Não foi possível carregar a visão financeira. Verifique as permissões do Firebase.</td></tr>'}
  finally{carregando=false}
}

garantirCss();montar();
window.addEventListener("sig:ready",carregar);
window.addEventListener("sig:empresa-changed",carregar);
window.addEventListener("sig:data-changed",carregar);
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="dashboard")carregar()});
