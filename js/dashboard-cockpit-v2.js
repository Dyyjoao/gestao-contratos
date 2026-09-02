import { $, esc, permite, admin, moeda, listarDocumentos, periodoAno, periodoChave, empresasSelecionadasIds, state, db } from "./shared.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { construirLinhasFinanceiras, resumirDre, linhasPorCodigo } from "./financial-reporting.js";
import { calcularConsorcio, statusConsorcioAtivo } from "./consortium-calculations.js";
import { contaAnalitica } from "./account-tree.js";
import { raizConta, multiplicadorApresentacao } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { contaBalanco, CC_BALANCO_ID } from "./balance-center.js";
import { mapaImobilizadoBalanco } from "./asset-depreciation.js";

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CHAVES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const PERIODOS={total:[0,1,2,3,4,5,6,7,8,9,10,11],t1:[0,1,2],t2:[3,4,5],t3:[6,7,8],t4:[9,10,11]};
for(let i=0;i<12;i++)PERIODOS[`m${String(i+1).padStart(2,"0")}`]=[i];
const PADRAO=["executivo","evolucao","balanco","caixa","inadimplencia","consorcios","permutas","vendas","desvios"];
let preferencia={ordem:[...PADRAO],ocultos:[]};
let busy=false;

const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const set=(id,v)=>{if($(id))$(id).textContent=v};
const percent=(atual,base)=>Math.abs(base)>0.000001?(atual-base)/Math.abs(base)*100:null;
const pf=v=>v==null?"—":`${v>0?"+":""}${v.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`;
const podeDre=()=>admin()||permite("controladoria","editar")||permite("controladoria","visualizar")||permite("controladoria","dre");
const podeBalanco=()=>admin()||permite("controladoria","editar")||permite("controladoria","visualizar")||permite("controladoria","balanco");
const podeCaixa=()=>admin()||permite("controladoria","editar")||permite("controladoria","visualizar")||permite("controladoria","caixaVisualizar");
const podeInad=()=>admin()||permite("controladoria","editar")||permite("controladoria","inadimplencia")||permite("controladoria","inadimplenciaEditar");
const podeCons=()=>admin()||permite("consorcios","visualizar")||permite("consorcios","editar")||permite("controladoria","consorciosVisualizar")||permite("controladoria","consorciosEditar")||permite("controladoria","editar");
const podePerm=()=>admin()||["visualizar","cadastrar","editar","movimentar","estornar","fechar","inativar"].some(a=>permite("permutas",a));
const podeVendas=()=>admin()||["visualizar","lancar","editar","vendedores","comissoes"].some(a=>permite("vendas",a));

const WIDGETS={
  executivo:{nome:"Resumo executivo",perm:()=>podeDre()||podeCaixa()||podeInad()},
  evolucao:{nome:"Evolução de resultado",perm:podeDre},
  balanco:{nome:"Análise patrimonial",perm:podeBalanco},
  caixa:{nome:"Posição e projeção de caixa",perm:podeCaixa},
  inadimplencia:{nome:"Inadimplência & Aging",perm:podeInad},
  consorcios:{nome:"Posição de consórcios",perm:podeCons},
  permutas:{nome:"Posição de permutas",perm:podePerm},
  vendas:{nome:"Vendas & Comissões",perm:podeVendas},
  desvios:{nome:"Maiores desvios vs Budget",perm:podeDre}
};

function periodoIndices(){return PERIODOS[periodoChave()]||PERIODOS.total}
function mesFechamento(){
  const p=periodoChave(),ano=periodoAno();
  if(/^m\d{2}$/.test(p))return Math.max(0,Math.min(11,Number(p.slice(1))-1));
  if(/^t[1-4]$/.test(p))return Number(p.slice(1))*3-1;
  return ano===new Date().getFullYear()?new Date().getMonth():11;
}
function contexto(){
  const ids=empresasSelecionadasIds();
  return `${ids.length>1?`${ids.length} empresas consolidadas`:"Empresa selecionada"} · ${periodoAno()}`;
}
function widgetsPermitidos(){return PADRAO.filter(id=>WIDGETS[id]?.perm?.())}
function normalizar(p={}){
  const permitidos=widgetsPermitidos();
  const ordem=(Array.isArray(p.ordem)?p.ordem:[]).filter(x=>permitidos.includes(x));
  permitidos.forEach(x=>{if(!ordem.includes(x))ordem.push(x)});
  return {ordem,ocultos:(Array.isArray(p.ocultos)?p.ocultos:[]).filter(x=>permitidos.includes(x))};
}
function css(){
  if($("dashboard-v2-css"))return;
  const l=document.createElement("link");l.id="dashboard-v2-css";l.rel="stylesheet";l.href="dashboard-v2.css?v=2";document.head.appendChild(l);
}
function montar(){
  const p=$("pagina-dashboard");if(!p||p.dataset.dashboardCockpit==="1")return;
  css();p.dataset.dashboardCockpit="1";p.dataset.gerencial="1";
  p.innerHTML=`
  <div class="welcome modulo-hero dash-v2-hero">
    <div><span class="eyebrow">COCKPIT GERENCIAL</span><h2>Visão Executiva</h2><p>Indicadores para decidir: desempenho, tendência, exceções e posição dos principais módulos.</p></div>
    <div class="dash-v2-head"><span id="dashV2Contexto" class="hero-meta">—</span><button id="btnDashV2Config" class="btn-secundario" type="button">Configurar dashboard</button></div>
  </div>
  <div id="dashV2Aviso" class="modulo-aviso hidden"></div>
  <div id="dashV2Widgets" class="dash-v2-widgets">
    <section class="lista-card dash-v2-widget" data-widget="executivo">
      <div class="lista-cabecalho"><div><h3>Resumo executivo</h3><p>Valor atual e referência gerencial. Os cartões abrem o detalhe de origem.</p></div><span class="dash-v2-tag">GESTÃO</span></div>
      <div class="kpi-grid kpi-grid-6 dash-v2-kpis">
        <button class="kpi-card dash-v2-click" data-open="dre"><span>Receita realizada</span><strong id="dvReceita">—</strong><small id="dvReceitaSub">—</small></button>
        <button class="kpi-card dash-v2-click" data-open="dre"><span>OPEX realizado</span><strong id="dvOpex">—</strong><small id="dvOpexSub">—</small></button>
        <button class="kpi-card dash-v2-click" data-open="dre"><span>Resultado</span><strong id="dvResultado">—</strong><small id="dvResultadoSub">—</small></button>
        <button class="kpi-card dash-v2-click" data-open="dre"><span>Margem</span><strong id="dvMargem">—</strong><small>Resultado ÷ Receita</small></button>
        <button class="kpi-card dash-v2-click" data-open="caixa"><span>Caixa hoje</span><strong id="dvCaixa">—</strong><small id="dvCaixaSub">—</small></button>
        <button class="kpi-card dash-v2-click" data-open="inadimplencia"><span>Inadimplência</span><strong id="dvInad">—</strong><small id="dvInadSub">—</small></button>
      </div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="evolucao">
      <div class="lista-cabecalho"><div><h3>Evolução dos principais resultados</h3><p>Receita, OPEX e resultado mês a mês.</p></div><button class="btn-secundario" data-open="dre" type="button">Abrir DRE</button></div>
      <div id="dvGraficoResultado" class="dash-v2-chart"></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="balanco">
      <div class="lista-cabecalho"><div><h3>Análise de Balanço</h3><p id="dvBalancoRef">Posição patrimonial e comparação com o mesmo mês do ano anterior.</p></div><button class="btn-secundario" data-open="balanco" type="button">Abrir Balanço</button></div>
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card"><span>Ativo</span><strong id="dvAtivo">—</strong><small id="dvAtivoSub">—</small></div>
        <div class="kpi-card"><span>Passivo + PL</span><strong id="dvPassivo">—</strong><small id="dvPassivoSub">—</small></div>
        <div class="kpi-card"><span>Equação patrimonial</span><strong id="dvEquacao">—</strong><small id="dvEquacaoSub">Ativo − Passivo/PL</small></div>
        <div class="kpi-card"><span>Variação do Ativo</span><strong id="dvAtivoVar">—</strong><small>vs mesmo mês LY</small></div>
      </div>
      <div class="dash-v2-split"><div><h4>Evolução patrimonial</h4><div id="dvGraficoBalanco" class="dash-v2-chart"></div></div><div><h4>Maiores movimentos patrimoniais</h4><div id="dvMovPatrimoniais" class="dash-v2-list"></div></div></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="caixa">
      <div class="lista-cabecalho"><div><h3>Liquidez e projeção de caixa</h3><p>Posição liquidada e curva 30/60/90.</p></div><button class="btn-secundario" data-open="caixa" type="button">Abrir Caixa</button></div>
      <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Hoje</span><strong id="dvCx0">—</strong></div><div class="kpi-card"><span>D+30</span><strong id="dvCx30">—</strong></div><div class="kpi-card"><span>D+60</span><strong id="dvCx60">—</strong></div><div class="kpi-card"><span>D+90</span><strong id="dvCx90">—</strong></div></div>
      <div id="dvGraficoCaixa" class="dash-v2-chart"></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="inadimplencia">
      <div class="lista-cabecalho"><div><h3>Inadimplência & Aging</h3><p>Exposição atual da carteira por faixa de atraso.</p></div><button class="btn-secundario" data-open="inadimplencia" type="button">Abrir Aging</button></div>
      <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Carteira em aberto</span><strong id="dvInadCarteira">—</strong></div><div class="kpi-card"><span>Vencido</span><strong id="dvInadVencido">—</strong></div><div class="kpi-card"><span>Índice</span><strong id="dvInadIndice">—</strong></div><div class="kpi-card"><span>Acima de 90 dias</span><strong id="dvInad90">—</strong></div></div>
      <div id="dvAging" class="dash-v2-bars"></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="consorcios">
      <div class="lista-cabecalho"><div><h3>Posição de Consórcios</h3><p>Carteira ativa, crédito, parcela e saldo teórico.</p></div><button class="btn-secundario" data-open="consorcios" type="button">Abrir Consórcios</button></div>
      <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Planos ativos</span><strong id="dvConsAtivos">—</strong></div><div class="kpi-card"><span>Crédito atual</span><strong id="dvConsCredito">—</strong></div><div class="kpi-card"><span>Parcela mensal</span><strong id="dvConsParcela">—</strong></div><div class="kpi-card"><span>Saldo teórico</span><strong id="dvConsSaldo">—</strong></div></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="permutas">
      <div class="lista-cabecalho"><div><h3>Posição de Permutas</h3><p>Saldo líquido e exposição das permutas ativas, desconsiderando estornos.</p></div><button class="btn-secundario" data-open="permutas" type="button">Abrir Permutas</button></div>
      <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Permutas ativas</span><strong id="dvPermAtivas">—</strong></div><div class="kpi-card"><span>Valor acordado</span><strong id="dvPermAcordado">—</strong></div><div class="kpi-card"><span>Saldo líquido</span><strong id="dvPermSaldo">—</strong></div><div class="kpi-card"><span>Exposição absoluta</span><strong id="dvPermExposicao">—</strong></div></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="vendas">
      <div class="lista-cabecalho"><div><h3>Vendas & Comissões</h3><p>Venda, faturamento, meta e comissão gerada conforme a regra de cada vendedor.</p></div><button class="btn-secundario" data-open="vendas" type="button">Abrir Vendas</button></div>
      <div class="kpi-grid kpi-grid-5"><div class="kpi-card"><span>Vendas</span><strong id="dvVendas">—</strong></div><div class="kpi-card"><span>Faturamento</span><strong id="dvFaturamento">—</strong></div><div class="kpi-card"><span>Meta</span><strong id="dvMeta">—</strong></div><div class="kpi-card"><span>Atingimento</span><strong id="dvAtingimento">—</strong></div><div class="kpi-card"><span>Comissão gerada</span><strong id="dvComissao">—</strong></div></div>
      <div id="dvGraficoVendas" class="dash-v2-chart"></div>
    </section>
    <section class="lista-card dash-v2-widget" data-widget="desvios">
      <div class="lista-cabecalho"><div><h3>Maiores desvios vs Budget</h3><p>Exceções que mais impactaram o resultado do período.</p></div><span class="dash-v2-tag">EXCEÇÕES</span></div>
      <div id="dvDesvios" class="dash-v2-list"></div>
    </section>
  </div>
  <div id="dashV2Config" class="dash-v2-modal hidden"><div class="dash-v2-modal-card">
    <div class="lista-cabecalho"><div><h3>Configurar dashboard</h3><p>Escolha o que aparece e a ordem dos blocos. A preferência é individual.</p></div><button id="btnDashV2Fechar" class="btn-secundario" type="button">Fechar</button></div>
    <div id="dashV2ConfigLista" class="dash-v2-config-list"></div>
    <div class="form-acoes"><button id="btnDashV2Padrao" class="btn-secundario" type="button">Restaurar padrão</button><button id="btnDashV2Salvar" class="btn-primario" type="button">Salvar configuração</button></div>
  </div></div>`;
  p.addEventListener("click",e=>{const b=e.target.closest?.("[data-open]");if(b?.dataset?.open)window.SIG_ABRIR_CTRL?.(b.dataset.open)});
  $("btnDashV2Config")?.addEventListener("click",abrirConfig);
  $("btnDashV2Fechar")?.addEventListener("click",()=>$("dashV2Config")?.classList.add("hidden"));
  $("btnDashV2Padrao")?.addEventListener("click",()=>{preferencia=normalizar({});renderConfig();aplicarPreferencia()});
  $("btnDashV2Salvar")?.addEventListener("click",salvarPreferencia);
}
async function carregarPreferencia(){
  try{
    const s=await getDoc(doc(db,"dashboardPreferencias",state.usuario.id));
    preferencia=normalizar(s.exists()?s.data():{});
  }catch(e){console.warn("Dashboard: preferência indisponível",e);preferencia=normalizar({})}
  aplicarPreferencia();
}
function aplicarPreferencia(){
  const box=$("dashV2Widgets");if(!box)return;
  preferencia=normalizar(preferencia);
  preferencia.ordem.forEach(id=>{const el=box.querySelector(`[data-widget="${id}"]`);if(el)box.appendChild(el)});
  box.querySelectorAll("[data-widget]").forEach(el=>el.classList.toggle("hidden",!WIDGETS[el.dataset.widget]?.perm?.()||preferencia.ocultos.includes(el.dataset.widget)));
}
function renderConfig(){
  const box=$("dashV2ConfigLista");if(!box)return;
  preferencia=normalizar(preferencia);
  box.innerHTML=preferencia.ordem.map((id,i)=>`<div class="dash-v2-config-row" data-config-id="${id}"><label><input type="checkbox" ${preferencia.ocultos.includes(id)?"":"checked"}><span>${esc(WIDGETS[id].nome)}</span></label><div><button class="btn-acao" data-move="up" ${i===0?"disabled":""} type="button">↑</button><button class="btn-acao" data-move="down" ${i===preferencia.ordem.length-1?"disabled":""} type="button">↓</button></div></div>`).join("");
  box.querySelectorAll("input").forEach(c=>c.addEventListener("change",()=>{
    const id=c.closest("[data-config-id]").dataset.configId;
    preferencia.ocultos=c.checked?preferencia.ocultos.filter(x=>x!==id):[...new Set([...preferencia.ocultos,id])];
    aplicarPreferencia();
  }));
  box.querySelectorAll("[data-move]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.closest("[data-config-id]").dataset.configId,i=preferencia.ordem.indexOf(id),j=b.dataset.move==="up"?i-1:i+1;
    if(j<0||j>=preferencia.ordem.length)return;
    [preferencia.ordem[i],preferencia.ordem[j]]=[preferencia.ordem[j],preferencia.ordem[i]];
    renderConfig();aplicarPreferencia();
  }));
}
function abrirConfig(){renderConfig();$("dashV2Config")?.classList.remove("hidden")}
async function salvarPreferencia(){
  try{
    preferencia=normalizar(preferencia);
    await setDoc(doc(db,"dashboardPreferencias",state.usuario.id),{usuarioId:state.usuario.id,grupoId:state.usuario.grupoId,ordem:preferencia.ordem,ocultos:preferencia.ocultos,atualizadoEm:serverTimestamp()},{merge:true});
    $("dashV2Config")?.classList.add("hidden");
  }catch(e){console.error(e);alert("Não foi possível salvar a configuração do dashboard.")}
}

function compact(v){
  const a=Math.abs(n(v));
  if(a>=1e6)return `${(v/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi`;
  if(a>=1e3)return `${(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:0})} mil`;
  return n(v).toLocaleString("pt-BR",{maximumFractionDigits:0});
}
function lineChart(id,series){
  const el=$(id);if(!el)return;
  const todos=series.flatMap(s=>s.valores.map(n));
  const min=Math.min(0,...todos),max=Math.max(0,...todos),span=max-min||1,w=920,h=245,p=36;
  const x=i=>p+i*((w-p*2)/11),y=v=>h-p-(n(v)-min)/span*(h-p*2);
  const grid=[0,.25,.5,.75,1].map(t=>{const v=min+span*t,yy=y(v);return `<line x1="${p}" y1="${yy}" x2="${w-p}" y2="${yy}" class="dv-grid"/><text x="4" y="${yy+4}" class="dv-axis">${compact(v)}</text>`}).join("");
  const paths=series.map((s,i)=>`<polyline class="dv-line s${i}" points="${s.valores.map((v,j)=>`${x(j)},${y(v)}`).join(" ")}"/>`).join("");
  const labels=MESES.map((m,i)=>`<text x="${x(i)}" y="${h-8}" text-anchor="middle" class="dv-axis">${m}</text>`).join("");
  el.innerHTML=`<div class="dash-v2-legend">${series.map((s,i)=>`<span class="s${i}"><i></i>${esc(s.nome)}</span>`).join("")}</div><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfico de evolução">${grid}${paths}${labels}</svg>`;
}
function bars(id,itens){
  const el=$(id);if(!el)return;
  const max=Math.max(1,...itens.map(x=>n(x.valor)));
  el.innerHTML=itens.map(x=>`<div class="dv-bar-row"><span>${esc(x.nome)}</span><div><i style="width:${Math.max(1,n(x.valor)/max*100)}%"></i></div><strong>${moeda(x.valor)}</strong></div>`).join("");
}
function widgetErro(id,texto){
  const el=document.querySelector(`[data-widget="${id}"]`);
  if(el)el.querySelectorAll("strong").forEach(x=>x.textContent="—");
  console.warn(`Dashboard ${id}: ${texto}`);
}
function addDias(iso,dias){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+dias);return d.toISOString().slice(0,10)}

function caixaResumo(contas,lancamentos){
  const h=new Date().toISOString().slice(0,10);
  const abertura=contas.filter(x=>x.status!=="inativo").reduce((s,x)=>s+n(x.saldoAbertura),0);
  const ativos=lancamentos.filter(x=>x.status!=="cancelado");
  const mov=(data,liquidado=false)=>ativos.filter(x=>String(x.data||"")<=data&&(!liquidado||x.status==="liquidado")).reduce((s,x)=>s+(x.natureza==="entrada"?1:-1)*n(x.valor),0);
  return {hoje:abertura+mov(h,true),d30:abertura+mov(addDias(h,30)),d60:abertura+mov(addDias(h,60)),d90:abertura+mov(addDias(h,90))};
}
function inadResumo(titulos){
  const h=new Date().toISOString().slice(0,10),bucket={av:0,d30:0,d60:0,d90:0,m90:0};
  const abertos=titulos.filter(t=>t.status!=="cancelado"&&t.status!=="recebido").map(t=>({...t,saldo:Math.max(0,n(t.valorOriginal)-n(t.valorRecebido))})).filter(t=>t.saldo>0);
  const dias=t=>Math.max(0,Math.floor((new Date(`${h}T12:00:00`)-new Date(`${t.vencimento}T12:00:00`))/86400000));
  for(const t of abertos){
    if(!t.vencimento||t.vencimento>=h)bucket.av+=t.saldo;
    else{const d=dias(t);if(d<=30)bucket.d30+=t.saldo;else if(d<=60)bucket.d60+=t.saldo;else if(d<=90)bucket.d90+=t.saldo;else bucket.m90+=t.saldo}
  }
  const carteira=abertos.reduce((s,t)=>s+t.saldo,0),vencido=bucket.d30+bucket.d60+bucket.d90+bucket.m90;
  return {carteira,vencido,indice:carteira?vencido/carteira*100:0,bucket};
}
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
const ativoDoc=x=>x?.legadoArquivado!==true&&x?.duplicadoArquivado!==true;
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_");
function docBalanco(conta,ano,realizados){
  const ds=realizados.filter(d=>ativoDoc(d)&&d.empresaId===conta.empresaId&&d.contaId===conta.id&&(d.centroCustoId||"")===CC_BALANCO_ID&&Number(d.exercicio)===Number(ano));
  if(!ds.length)return null;
  const canon=`r_${idSeguro(conta.empresaId)}_${ano}_${idSeguro(CC_BALANCO_ID)}_${idSeguro(conta.id)}`;
  return ds.find(d=>d.id===canon)||[...ds].sort((a,b)=>stamp(b)-stamp(a))[0];
}
function mapaAuto(bens,empresa,ano,mes){
  const comp=`${ano}-${String(mes+1).padStart(2,"0")}`;
  return mapaImobilizadoBalanco(bens.filter(b=>b.empresaId===empresa&&b.integrarBalanco===true),comp);
}
function balancoMes(plano,realizados,bens,ano,mes,empresas){
  const ids=new Set(empresas),autos=new Map(empresas.map(e=>[e,mapaAuto(bens,e,ano,mes)])),porCodigo=new Map();
  let ativo=0,passivo=0;
  for(const c of plano){
    if(!ids.has(c.empresaId)||!contaBalanco(c)||!contaAnalitica(c)||!contaAtivaNoExercicio(c,ano))continue;
    const auto=autos.get(c.empresaId),automatico=auto?.bruto?.has(c.id)||auto?.acumulada?.has(c.id);
    let bruto=0;
    if(automatico)bruto=auto.bruto.has(c.id)?n(auto.bruto.get(c.id)):n(auto.acumulada.get(c.id));
    else bruto=n(docBalanco(c,ano,realizados)?.valores?.[CHAVES[mes]]);
    const v=bruto*multiplicadorApresentacao(c),raiz=raizConta(c);
    if(raiz==="1")ativo+=v;
    if(raiz==="2")passivo+=v;
    const k=c.codigo||c.id,at=porCodigo.get(k)||{codigo:c.codigo||"",nome:c.nome||"Conta",valor:0};
    at.valor+=v;porCodigo.set(k,at);
  }
  return {ativo,passivo,porCodigo};
}
function renderFinanceiro(plano,realizados,budgets,forecasts,bens){
  const ano=periodoAno(),empresas=empresasSelecionadasIds(),idx=periodoIndices();
  const realBase=construirLinhasFinanceiras({cenario:"realizado",documentos:realizados,plano,ano,empresasIds:empresas});
  const budBase=construirLinhasFinanceiras({cenario:"budget",documentos:budgets,plano,imobilizados:bens,ano,empresasIds:empresas});
  const foreBase=construirLinhasFinanceiras({cenario:"forecast",documentos:forecasts,realizados,plano,imobilizados:bens,ano,empresasIds:empresas});
  const real=resumirDre(realBase.linhas,idx),bud=resumirDre(budBase.linhas,idx),fore=resumirDre(foreBase.linhas,idx);
  set("dvReceita",moeda(real.receita));set("dvReceitaSub",`${pf(percent(real.receita,bud.receita))} vs Budget`);
  set("dvOpex",moeda(real.opex));set("dvOpexSub",`${pf(percent(real.opex,bud.opex))} vs Budget`);
  set("dvResultado",moeda(real.resultado));set("dvResultadoSub",`${pf(percent(real.resultado,bud.resultado))} vs Budget · Forecast ${moeda(fore.resultado)}`);
  set("dvMargem",`${(real.receita?real.resultado/Math.abs(real.receita)*100:0).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`);
  const meses=Array.from({length:12},(_,i)=>resumirDre(realBase.linhas,[i]));
  lineChart("dvGraficoResultado",[{nome:"Receita",valores:meses.map(x=>x.receita)},{nome:"OPEX",valores:meses.map(x=>x.opex)},{nome:"Resultado",valores:meses.map(x=>x.resultado)}]);
  const rmap=new Map(linhasPorCodigo(realBase.linhas,idx).map(x=>[x.chave,x])),bmap=new Map(linhasPorCodigo(budBase.linhas,idx).map(x=>[x.chave,x])),arr=[];
  for(const k of new Set([...rmap.keys(),...bmap.keys()])){
    const r=rmap.get(k),b=bmap.get(k),base=r||b;if(!base)continue;
    const realV=r?.efeito||0,budV=b?.efeito||0,impacto=realV-budV;
    if(Math.abs(realV)+Math.abs(budV)<.001)continue;
    arr.push({...base,real:realV,budget:budV,impacto});
  }
  arr.sort((a,b)=>Math.abs(b.impacto)-Math.abs(a.impacto));
  const box=$("dvDesvios");
  if(box)box.innerHTML=arr.slice(0,6).map(x=>`<button class="dash-v2-list-row" data-open="dre" type="button"><span><strong>${esc(x.codigo)} · ${esc(x.nome)}</strong><small>${esc(x.grupoDre||"DRE")}</small></span><span>Budget<strong>${moeda(x.budget)}</strong></span><span>Real<strong>${moeda(x.real)}</strong></span><b class="${x.impacto>=0?"bom":"ruim"}">${x.impacto>0?"+":""}${moeda(x.impacto)}</b></button>`).join("")||'<div class="empty-state">Sem desvios comparáveis.</div>';
}
function renderBalanco(plano,realizados,bens){
  const ano=periodoAno(),mes=mesFechamento(),empresas=empresasSelecionadasIds();
  const atual=balancoMes(plano,realizados,bens,ano,mes,empresas),ly=balancoMes(plano,realizados,bens,ano-1,mes,empresas),equacao=atual.ativo-atual.passivo;
  set("dvBalancoRef",`Posição ${MESES[mes]}/${ano} · comparação com ${MESES[mes]}/${ano-1}.`);
  set("dvAtivo",moeda(atual.ativo));set("dvAtivoSub",`${pf(percent(atual.ativo,ly.ativo))} vs LY`);
  set("dvPassivo",moeda(atual.passivo));set("dvPassivoSub",`${pf(percent(atual.passivo,ly.passivo))} vs LY`);
  set("dvEquacao",moeda(equacao));set("dvEquacaoSub",Math.abs(equacao)<.01?"Balanço conciliado":"Revisar diferença patrimonial");
  set("dvAtivoVar",pf(percent(atual.ativo,ly.ativo)));
  const evol=Array.from({length:12},(_,i)=>balancoMes(plano,realizados,bens,ano,i,empresas));
  lineChart("dvGraficoBalanco",[{nome:"Ativo",valores:evol.map(x=>x.ativo)},{nome:"Passivo + PL",valores:evol.map(x=>x.passivo)}]);
  const mov=[];
  for(const k of new Set([...atual.porCodigo.keys(),...ly.porCodigo.keys()])){
    const a=atual.porCodigo.get(k),l=ly.porCodigo.get(k),base=a||l,v=n(a?.valor)-n(l?.valor);
    if(Math.abs(v)>.005)mov.push({codigo:base.codigo,nome:base.nome,valor:v});
  }
  mov.sort((a,b)=>Math.abs(b.valor)-Math.abs(a.valor));
  const box=$("dvMovPatrimoniais");
  if(box)box.innerHTML=mov.slice(0,6).map(x=>`<button class="dash-v2-list-row simples" data-open="balanco" type="button"><span><strong>${esc(x.codigo)} · ${esc(x.nome)}</strong><small>Variação vs LY</small></span><b class="${x.valor>=0?"bom":"ruim"}">${x.valor>0?"+":""}${moeda(x.valor)}</b></button>`).join("")||'<div class="empty-state">Sem movimentos patrimoniais comparáveis.</div>';
}
function renderCaixa(contas,lancamentos){
  const c=caixaResumo(contas,lancamentos);
  set("dvCaixa",moeda(c.hoje));set("dvCaixaSub",`D+90 ${moeda(c.d90)}`);
  set("dvCx0",moeda(c.hoje));set("dvCx30",moeda(c.d30));set("dvCx60",moeda(c.d60));set("dvCx90",moeda(c.d90));
  lineChart("dvGraficoCaixa",[{nome:"Projeção",valores:[c.hoje,c.hoje,c.hoje,c.d30,c.d30,c.d30,c.d60,c.d60,c.d60,c.d90,c.d90,c.d90]}]);
}
function renderInad(titulos){
  const r=inadResumo(titulos);
  set("dvInad",`${r.indice.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`);set("dvInadSub",`${moeda(r.vencido)} vencido`);
  set("dvInadCarteira",moeda(r.carteira));set("dvInadVencido",moeda(r.vencido));set("dvInadIndice",`${r.indice.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`);set("dvInad90",moeda(r.bucket.m90));
  bars("dvAging",[{nome:"A vencer",valor:r.bucket.av},{nome:"1–30",valor:r.bucket.d30},{nome:"31–60",valor:r.bucket.d60},{nome:"61–90",valor:r.bucket.d90},{nome:">90",valor:r.bucket.m90}]);
}
function renderConsorcios(lista){
  const ativos=lista.filter(statusConsorcioAtivo),calcs=ativos.map(calcularConsorcio);
  set("dvConsAtivos",ativos.length);set("dvConsCredito",moeda(calcs.reduce((s,x)=>s+n(x.baseCredito),0)));set("dvConsParcela",moeda(calcs.reduce((s,x)=>s+n(x.parcelaReferencia),0)));set("dvConsSaldo",moeda(calcs.reduce((s,x)=>s+n(x.saldoTeorico),0)));
}
function renderPermutas(permutas,movimentos){
  const ativos=permutas.filter(p=>!["inativo","finalizada","encerrado","cancelado"].includes(p.status||"ativo")),ids=new Set(ativos.map(x=>x.id)),map=new Map();
  for(const m of movimentos.filter(m=>ids.has(m.permutaId)&&m.estornado!==true)){
    const sinal=["credito","ajuste_credito"].includes(m.tipo)?1:-1;
    map.set(m.permutaId,(map.get(m.permutaId)||0)+sinal*n(m.valorPermuta));
  }
  set("dvPermAtivas",ativos.length);set("dvPermAcordado",moeda(ativos.reduce((s,p)=>s+n(p.valorAcordado),0)));set("dvPermSaldo",moeda([...map.values()].reduce((s,v)=>s+v,0)));set("dvPermExposicao",moeda([...map.values()].reduce((s,v)=>s+Math.abs(v),0)));
}
function renderVendas(vendas,vendedores){
  const ano=periodoAno(),idx=periodoIndices(),mesVenda=Array(12).fill(0),mesFat=Array(12).fill(0),mesCom=Array(12).fill(0);
  const validas=vendas.filter(v=>v.status!=="cancelada");
  for(const v of validas){
    if(String(v.data||"").startsWith(`${ano}-`)){const m=Number(String(v.data).slice(5,7))-1;if(m>=0&&m<12)mesVenda[m]+=n(v.valor)}
    if(v.dataFaturamento&&String(v.dataFaturamento).startsWith(`${ano}-`)){const m=Number(String(v.dataFaturamento).slice(5,7))-1;if(m>=0&&m<12)mesFat[m]+=n(v.valorFaturado)}
    const dataCom=v.baseComissao==="faturamento"?v.dataFaturamento:v.data;
    if(dataCom&&String(dataCom).startsWith(`${ano}-`)){const m=Number(String(dataCom).slice(5,7))-1;if(m>=0&&m<12)mesCom[m]+=n(v.comissaoValor)}
  }
  const total=idx.reduce((s,i)=>s+mesVenda[i],0),fat=idx.reduce((s,i)=>s+mesFat[i],0),com=idx.reduce((s,i)=>s+mesCom[i],0),ativos=vendedores.filter(v=>v.status!=="inativo"),meta=ativos.reduce((s,v)=>s+n(v.metaMensal)*idx.length,0);
  set("dvVendas",moeda(total));set("dvFaturamento",moeda(fat));set("dvMeta",moeda(meta));set("dvAtingimento",meta?`${(total/meta*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`:"—");set("dvComissao",moeda(com));
  lineChart("dvGraficoVendas",[{nome:"Vendas",valores:mesVenda},{nome:"Faturamento",valores:mesFat},{nome:"Meta",valores:Array(12).fill(ativos.reduce((s,v)=>s+n(v.metaMensal),0))}]);
}
async function refresh(){
  montar();
  const p=$("pagina-dashboard");
  if(!p||p.classList.contains("hidden")||busy||!permite("dashboard"))return;
  busy=true;set("dashV2Contexto",contexto());
  const aviso=$("dashV2Aviso");if(aviso)aviso.classList.add("hidden");
  const need=id=>WIDGETS[id]?.perm?.()&&!preferencia.ocultos.includes(id);
  const erros=[];
  try{
    let plano,realizados,budgets,forecasts,bens;
    if([need("executivo"),need("evolucao"),need("desvios"),need("balanco")].some(Boolean)){
      try{[plano,realizados,budgets,forecasts,bens]=await Promise.all([listarDocumentos("planoContasGerencial"),listarDocumentos("realizadoMensal"),listarDocumentos("budgetLinhas"),listarDocumentos("forecastLinhas"),listarDocumentos("imobilizados")])}
      catch(e){erros.push("Controladoria");console.error(e)}
      if(plano&&realizados&&budgets&&forecasts&&bens&&[need("executivo"),need("evolucao"),need("desvios")].some(Boolean))renderFinanceiro(plano,realizados,budgets,forecasts,bens);else if([need("executivo"),need("evolucao"),need("desvios")].some(Boolean))widgetErro("executivo","base financeira indisponível");
      if(plano&&realizados&&bens&&need("balanco"))renderBalanco(plano,realizados,bens);else if(need("balanco"))widgetErro("balanco","base patrimonial indisponível");
    }
    if(podeCaixa()&&(need("caixa")||need("executivo"))){try{const [c,l]=await Promise.all([listarDocumentos("contasBancarias"),listarDocumentos("fluxoCaixaLancamentos")]);renderCaixa(c,l)}catch(e){erros.push("Caixa");console.error(e);widgetErro("caixa","dados indisponíveis")}}
    if(podeInad()&&(need("inadimplencia")||need("executivo"))){try{renderInad(await listarDocumentos("inadimplenciaTitulos"))}catch(e){erros.push("Inadimplência");console.error(e);widgetErro("inadimplencia","dados indisponíveis")}}
    if(podeCons()&&need("consorcios")){try{renderConsorcios(await listarDocumentos("consorcios"))}catch(e){erros.push("Consórcios");console.error(e);widgetErro("consorcios","dados indisponíveis")}}
    if(podePerm()&&need("permutas")){try{const [p,m]=await Promise.all([listarDocumentos("permutas"),listarDocumentos("permutaMovimentos")]);renderPermutas(p,m)}catch(e){erros.push("Permutas");console.error(e);widgetErro("permutas","dados indisponíveis")}}
    if(podeVendas()&&need("vendas")){try{const [v,ve]=await Promise.all([listarDocumentos("vendas"),listarDocumentos("vendedores")]);renderVendas(v,ve)}catch(e){erros.push("Vendas");console.error(e);widgetErro("vendas","dados indisponíveis")}}
    if(erros.length&&aviso){aviso.textContent=`Alguns blocos não puderam ser atualizados: ${[...new Set(erros)].join(", ")}.`;aviso.classList.remove("hidden")}
  }finally{busy=false}
}

montar();
window.addEventListener("sig:ready",async()=>{montar();await carregarPreferencia();refresh()});
window.addEventListener("sig:empresa-changed",refresh);
window.addEventListener("sig:periodo-changed",refresh);
window.addEventListener("sig:data-changed",refresh);
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="dashboard")setTimeout(refresh,40)});
