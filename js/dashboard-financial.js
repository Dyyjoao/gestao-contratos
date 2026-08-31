import { $, esc, permite, moeda, listarDocumentos, periodoAno, periodoChave, empresasSelecionadasIds } from "./shared.js";
import { construirLinhasFinanceiras, resumirDre, capexCadastroAtual } from "./financial-reporting.js";

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
function dashboardVisivel(){const p=$("pagina-dashboard");return !!p&&!p.classList.contains("hidden")}

function garantirCss(){
  if(document.getElementById("sig-dashboard-finance-css"))return;
  const l=document.createElement("link");l.id="sig-dashboard-finance-css";l.rel="stylesheet";l.href="dashboard-finance.css?v=16";document.head.appendChild(l);
}
function montar(){
  const pagina=$("pagina-dashboard");if(!pagina||$("dashFinanceiro"))return;
  const grade=pagina.querySelector(".dashboard-grid"),s=document.createElement("section");s.id="dashFinanceiro";s.className="lista-card dashboard-financeiro";
  s.innerHTML=`
    <div class="lista-cabecalho">
      <div><h3>Visão financeira</h3><p id="dashFinContexto">Realizado, Budget, Forecast e caixa no contexto selecionado no cabeçalho.</p></div>
    </div>
    <div class="kpi-grid kpi-grid-6 dash-finance-kpis">
      <div class="kpi-card"><span>Receita realizada</span><strong id="dashFinReceita">—</strong><small id="dashFinReceitaSub" class="kpi-subvalor">—</small></div>
      <div class="kpi-card"><span>OPEX realizado</span><strong id="dashFinOpex">—</strong><small id="dashFinOpexSub" class="kpi-subvalor">Custos + despesas operacionais</small></div>
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
        <h4>Posição de caixa</h4><p>Saldo bancário consolidado das empresas selecionadas.</p>
        <div class="dash-cash-list">
          <div class="dash-cash-row"><span>Saldo liquidado hoje</span><strong id="dashFinCaixaHoje">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+30</span><strong id="dashFinCaixaD30">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+60</span><strong id="dashFinCaixaD60">—</strong></div>
          <div class="dash-cash-row"><span>Projetado D+90</span><strong id="dashFinCaixaD90">—</strong></div>
        </div><div id="dashFinCaixaAlerta"></div>
      </div>
    </div>`;
  if(grade)pagina.insertBefore(s,grade);else pagina.appendChild(s);
}

const num=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
function pct(atual,base){return base?((atual-base)/Math.abs(base))*100:null}
function pctTxt(atual,base){const p=pct(atual,base);return p===null?"—":`${p>0?"+":""}${p.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}
function varClass(atual,base,inverter=false){const p=pct(atual,base);if(p===null||Math.abs(p)<.01)return"";return(inverter?p<0:p>0)?"positiva":"negativa"}
function set(id,v){if($(id))$(id).textContent=v}
function renderTabela(real,budget,forecast,capex){const rows=[["Receita",real.receita,budget.receita,forecast.receita,false],["OPEX",real.opex,budget.opex,forecast.opex,true],["Resultado",real.resultado,budget.resultado,forecast.resultado,false,"resultado"],["CAPEX · cadastro atual",capex.realizado,capex.planejado,capex.total,true,"capex"]],tb=$("dashFinTabela");if(!tb)return;tb.innerHTML=rows.map(([nome,r,b,f,inv,classe])=>`<tr class="${classe||""}"><td>${esc(nome)}</td><td>${moeda(r)}</td><td>${moeda(b)}</td><td>${moeda(f)}</td><td class="dash-finance-var ${varClass(r,b,inv)}">${pctTxt(r,b)}</td></tr>`).join("")}
function addDias(iso,dias){const [a,m,d]=iso.split("-").map(Number),x=new Date(Date.UTC(a,m-1,d));x.setUTCDate(x.getUTCDate()+dias);return x.toISOString().slice(0,10)}
function renderCaixa(contas,lancamentos){const hoje=new Date().toISOString().slice(0,10),ativas=contas.filter(x=>x.status!=="inativo"),base=ativas.reduce((s,x)=>s+num(x.saldoAbertura),0),validos=lancamentos.filter(x=>x.status!=="cancelado"),mov=(data,liquidado=false)=>validos.filter(x=>x.data<=data&&(!liquidado||x.status==="liquidado")).reduce((s,x)=>s+(x.natureza==="entrada"?1:-1)*num(x.valor),0);set("dashFinCaixaHoje",moeda(base+mov(hoje,true)));set("dashFinCaixaD30",moeda(base+mov(addDias(hoje,30))));set("dashFinCaixaD60",moeda(base+mov(addDias(hoje,60))));set("dashFinCaixaD90",moeda(base+mov(addDias(hoje,90))));const venc=validos.filter(x=>x.status!=="liquidado"&&x.data<hoje).length,al=$("dashFinCaixaAlerta");if(al)al.innerHTML=venc?`<div class="dash-cash-alerta">${venc} lançamento(s) pendente(s) com data vencida. A projeção merece revisão.</div>`:""}

export async function carregar(){
  montar();if(!dashboardVisivel())return;if(carregando||!permite("controladoria")){const s=$("dashFinanceiro");if(s)s.classList.toggle("hidden",!permite("controladoria"));return}
  const s=$("dashFinanceiro");if(s)s.classList.remove("hidden");
  const ano=periodoAno(),periodo=periodoChave(),p=PERIODOS[periodo]||PERIODOS.total,rotulo=p.label,empresas=empresasSelecionadasIds();
  set("dashFinContexto",`${empresas.length>1?`${empresas.length} empresas consolidadas`:"Empresa selecionada"} · ${rotulo} · ${ano}`);
  carregando=true;
  try{
    const [plano,realizados,budgets,forecasts,contas,lancamentos,imobilizados]=await Promise.all([listarDocumentos("planoContasGerencial"),listarDocumentos("realizadoMensal"),listarDocumentos("budgetLinhas"),listarDocumentos("forecastLinhas"),listarDocumentos("contasBancarias"),listarDocumentos("fluxoCaixaLancamentos"),listarDocumentos("imobilizados").catch(()=>[])]);
    const realBase=construirLinhasFinanceiras({cenario:"realizado",documentos:realizados,plano,ano,empresasIds:empresas}),budgetBase=construirLinhasFinanceiras({cenario:"budget",documentos:budgets,plano,imobilizados,ano,empresasIds:empresas}),forecastBase=construirLinhasFinanceiras({cenario:"forecast",documentos:forecasts,realizados,plano,imobilizados,ano,empresasIds:empresas}),real=resumirDre(realBase.linhas,p.indices),budget=resumirDre(budgetBase.linhas,p.indices),forecast=resumirDre(forecastBase.linhas,p.indices),capex=capexCadastroAtual(imobilizados,ano,p.indices,empresas),margem=real.receita?(real.resultado/Math.abs(real.receita))*100:0;
    set("dashFinReceita",moeda(real.receita));set("dashFinReceitaSub",`${pctTxt(real.receita,budget.receita)} vs Budget`);set("dashFinOpex",moeda(real.opex));set("dashFinOpexSub",`${pctTxt(real.opex,budget.opex)} vs Budget · custos + despesas`);set("dashFinResultado",moeda(real.resultado));set("dashFinResultadoSub",`${pctTxt(real.resultado,budget.resultado)} vs Budget`);set("dashFinMargem",`${margem.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`);set("dashFinMargemSub","Resultado ÷ Receita");set("dashFinCapex",moeda(capex.realizado));set("dashFinCapexSub",`${moeda(capex.planejado)} planejado no cadastro atual`);set("dashFinForecast",moeda(forecast.resultado));set("dashFinForecastSub",forecastBase.rotuloVersao?`Versão: ${forecastBase.rotuloVersao}`:"Sem Forecast salvo; automações ainda podem compor projeção");set("dashFinLegenda",`${rotulo} · ${ano} · Budget ${budgetBase.rotuloVersao||"não identificado"} · Forecast ${forecastBase.rotuloVersao||"não identificado"}. Balanço e Estatísticas não compõem estes KPIs; CAPEX usa a ficha patrimonial atual.`);set("dashResultadoGerencial",moeda(real.resultado));set("dashVariacaoBudget",`${pctTxt(real.resultado,budget.resultado)} vs. budget`);renderTabela(real,budget,forecast,capex);renderCaixa(contas,lancamentos);
  }catch(e){console.error("Dashboard financeiro:",e);const tb=$("dashFinTabela");if(tb)tb.innerHTML='<tr><td colspan="5" class="dash-finance-empty">Não foi possível carregar a visão financeira. Verifique as permissões do Firebase.</td></tr>'}finally{carregando=false}
}

garantirCss();montar();
window.addEventListener("sig:ready",carregar);window.addEventListener("sig:empresa-changed",carregar);window.addEventListener("sig:periodo-changed",carregar);window.addEventListener("sig:data-changed",carregar);window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="dashboard")carregar()});
