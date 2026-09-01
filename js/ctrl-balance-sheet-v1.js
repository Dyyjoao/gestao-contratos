import { abrirPagina } from "./core.js";
import { $, esc, moeda, listarDocumentos, periodoAno, periodoChave, empresasSelecionadasIds, nomeEmpresa } from "./shared.js";
import { CC_BALANCO_ID, contaBalanco } from "./balance-center.js";
import { contaSintetica, contaAnalitica } from "./account-tree.js";
import { VERSAO_MASCARA_PLANO, raizConta, codigoSinteticoValido, codigoSinteticoNivel1Valido, codigoSinteticoNivel2Valido, codigoAnaliticoValido, prefixosSinteticosCodigo, multiplicadorApresentacao, contaRedutora, descricaoNatureza } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { mapaImobilizadoBalanco } from "./asset-depreciation.js";
import { exportarTabelaXls, exportarTabelaPdf } from "./export-utils.js";

const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const NOMES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
let plano=[],realizados=[],bens=[],busy=false;
const pagina=()=>$("pagina-ctrl-balanco-v1");
const visivel=()=>pagina()&&!pagina().classList.contains("hidden");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
const ativo=x=>x?.legadoArquivado!==true&&x?.duplicadoArquivado!==true;
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_");
const estruturaAtual=c=>c?.versaoMascara===VERSAO_MASCARA_PLANO&&(codigoSinteticoValido(c?.codigo)||codigoAnaliticoValido(c?.codigo));
const visaoRelatorio=()=>$("balancoV1Visao")?.value||"evolucao";
const anoAtual=()=>Number(periodoAno());
const anoAnterior=()=>anoAtual()-1;

function colunas(){
  const ano=anoAtual();
  if(visaoRelatorio()==="comparativo_anual")return[
    {tipo:"saldo",label:String(ano),ano,i:11,destaque:true},
    {tipo:"saldo",label:"Last Year",ano:ano-1,i:11,destaque:true},
    {tipo:"variacao_valor",label:"Variação R$"},
    {tipo:"variacao_pct",label:"Variação %"}
  ];
  const p=periodoChave();
  if(/^m\d{2}$/.test(p)){
    const i=Number(p.slice(1))-1;
    return i>=0&&i<12?[{tipo:"saldo",mes:MESES[i],label:NOMES[i],ano,i}]:[];
  }
  if(/^t[1-4]$/.test(p)){
    const q=Number(p.slice(1))-1;
    const meses=[0,1,2].map(x=>{const i=q*3+x;return{tipo:"saldo",mes:MESES[i],label:NOMES[i],ano,i}});
    const ultimo=q*3+2;
    meses.push({tipo:"saldo",mes:MESES[ultimo],label:`Total T${q+1}`,ano,i:ultimo,destaque:true,fechamento:true});
    return meses;
  }
  const meses=MESES.map((mes,i)=>({tipo:"saldo",mes,label:NOMES[i],ano,i}));
  meses.push({tipo:"saldo",mes:"dez",label:"Total Ano",ano,i:11,destaque:true,fechamento:true});
  return meses;
}

function contextoTexto(){
  const ids=empresasSelecionadasIds();
  const empresa=ids.length>1?`${ids.length} empresas consolidadas`:ids.length===1?nomeEmpresa(ids[0]):"Sem empresa";
  if(visaoRelatorio()==="comparativo_anual")return`${empresa} · Comparativo anual · ${anoAtual()} x ${anoAnterior()} · posições de dezembro`;
  const p=periodoChave();
  const per=/^m\d{2}$/.test(p)?NOMES[Number(p.slice(1))-1]:/^t[1-4]$/.test(p)?p.toUpperCase():"Exercício completo";
  return`${empresa} · ${per} · ${anoAtual()} · posição de fechamento`;
}

function criarPagina(){
  if(pagina())return;
  const main=document.querySelector("main.conteudo");
  if(!main)return;
  const s=document.createElement("section");
  s.id="pagina-ctrl-balanco-v1";
  s.className="pagina hidden";
  s.innerHTML=`
<div class="pagina-cabecalho"><div><span class="eyebrow">CONTROLADORIA & FP&A</span><h2>Balanço Patrimonial</h2><p>Posição patrimonial mensal com hierarquia Raiz → Sintética N1 → Sintética N2 → Analítica, natureza contábil e consolidação multiempresa.</p></div><div class="acoes-cabecalho"><button id="btnExportarBalancoV1" class="btn-secundario" type="button">Exportar Excel</button><button id="btnImprimirBalancoV1" class="btn-secundario" type="button">Imprimir / PDF</button><button id="btnAtualizarBalancoV1" class="btn-primario" type="button">Atualizar</button></div></div>
<div id="balancoV1Aviso" class="modulo-aviso"><strong>Regra:</strong> Balanço é posição de fechamento. O Total do trimestre/ano corresponde ao último mês do período; saldos mensais nunca são somados entre si.</div>
<div class="fpa-toolbar"><div class="campo"><label for="balancoV1Visao">Visão</label><select id="balancoV1Visao"><option value="evolucao">Evolução mensal + fechamento</option><option value="comparativo_anual">Comparativo anual</option></select></div><div class="campo"><label>Contexto</label><div id="balancoV1ContextoTopo" class="fpa-contexto-chip">—</div></div></div>
<section class="lista-card"><div class="lista-cabecalho"><div><h3>Balanço Patrimonial</h3><p id="balancoV1Contexto">—</p></div><span id="balancoV1Status"></span></div><div class="fpa-grid-wrap balanco-v1-wrap"><table id="tabelaBalancoV1" class="fpa-grid balanco-v1-grid"><tbody><tr><td>Clique em Atualizar.</td></tr></tbody></table></div></section>`;
  main.appendChild(s);
  garantirCss();
  $("btnAtualizarBalancoV1")?.addEventListener("click",carregar);
  $("btnExportarBalancoV1")?.addEventListener("click",exportar);
  $("btnImprimirBalancoV1")?.addEventListener("click",imprimir);
  $("balancoV1Visao")?.addEventListener("change",render);
}

function garantirCss(){
  if($("balanco-v1-css"))return;
  const s=document.createElement("style");
  s.id="balanco-v1-css";
  s.textContent=`
.balanco-v1-wrap{max-width:100%;overflow:auto}
.balanco-v1-grid th:first-child,.balanco-v1-grid td:first-child{width:320px;min-width:320px;max-width:360px;white-space:normal;word-break:normal;overflow-wrap:normal}
.balanco-v1-grid th:not(:first-child),.balanco-v1-grid td:not(:first-child){min-width:110px}
.balanco-v1-grid th.balanco-v1-total,.balanco-v1-grid td.balanco-v1-total{font-weight:900;border-left:2px solid #b7c4cf}
.balanco-v1-grid th.balanco-v1-variacao,.balanco-v1-grid td.balanco-v1-variacao{min-width:120px;font-weight:800}
.balanco-v1-raiz td{background:#dfe8f6;font-weight:900}
.balanco-v1-sint1 td{background:#f2f5fa;font-weight:850}
.balanco-v1-sint2 td{background:#fafbfc;font-weight:800}
.balanco-v1-redutora td:first-child{color:#9f2f2f}
.balanco-v1-legado td{background:#fffaf2}
.balanco-v1-diferenca td{background:#0b1f33!important;color:#fff!important;font-weight:900}
.balanco-v1-tree{display:flex;align-items:center;gap:7px}
.balanco-v1-pill{display:inline-block;border-radius:999px;padding:2px 6px;font-size:8px;background:#fff0f0;color:#a12b2b;margin-left:6px}
.balanco-v1-pill.warn{background:#fff3e8;color:#9a4e00}
.balanco-v1-grid small{display:block;font-size:8px;color:#667085;margin-top:2px}
@media(max-width:900px){.balanco-v1-grid th:first-child,.balanco-v1-grid td:first-child{width:260px;min-width:260px;max-width:300px}}
`;
  document.head.appendChild(s);
}

function docsConta(c,ano){return realizados.filter(d=>ativo(d)&&d.contaId===c.id&&(d.centroCustoId||"")===CC_BALANCO_ID&&Number(d.exercicio)===Number(ano))}
function docCanonico(c,ano){const ds=docsConta(c,ano);if(!ds.length)return null;const canon=`r_${idSeguro(c.empresaId)}_${ano}_${idSeguro(CC_BALANCO_ID)}_${idSeguro(c.id)}`;return ds.find(d=>d.id===canon)||[...ds].sort((a,b)=>stamp(b)-stamp(a))[0]}
function bensEmpresa(emp){return bens.filter(b=>b.empresaId===emp&&b.integrarBalanco===true&&b.status!=="cancelado"&&b.status!=="inativo")}
function contasAutomaticasEmpresa(emp){const ids=new Set();for(const b of bensEmpresa(emp)){if(b.contaAtivoId)ids.add(b.contaAtivoId);if(b.contaDepreciacaoAcumuladaId)ids.add(b.contaDepreciacaoAcumuladaId)}return ids}
function contaAutomatica(c){return contasAutomaticasEmpresa(c.empresaId).has(c.id)}

function valorBrutoConta(c,mesIndex,ano){
  const emp=c.empresaId;
  if(contaAutomatica(c)){
    const comp=`${ano}-${String(mesIndex+1).padStart(2,"0")}`;
    const mapas=mapaImobilizadoBalanco(bensEmpresa(emp),comp);
    if(mapas.bruto.has(c.id))return n(mapas.bruto.get(c.id));
    if(mapas.acumulada.has(c.id))return n(mapas.acumulada.get(c.id));
    return 0;
  }
  return n(docCanonico(c,ano)?.valores?.[MESES[mesIndex]]);
}

function contasAtivasAno(ano){
  const ids=new Set(empresasSelecionadasIds());
  return plano.filter(c=>ids.has(c.empresaId)&&contaAtivaNoExercicio(c,ano)&&contaBalanco(c));
}
function anosEstrutura(){return visaoRelatorio()==="comparativo_anual"?[anoAtual(),anoAnterior()]:[anoAtual()]}
function contasContexto(){const mapa=new Map();for(const ano of anosEstrutura())for(const c of contasAtivasAno(ano))mapa.set(c.id,c);return[...mapa.values()]}
function analiticasAtivasAno(ano,raiz=""){return contasAtivasAno(ano).filter(c=>contaAnalitica(c)&&(!raiz||raizConta(c)===raiz))}
function analiticasContexto(raiz=""){const mapa=new Map();for(const ano of anosEstrutura())for(const c of analiticasAtivasAno(ano,raiz))mapa.set(c.id,c);return[...mapa.values()]}
function analiticasCodigo(codigo,ano){return analiticasAtivasAno(ano).filter(c=>codigoAnaliticoValido(c.codigo)&&c.codigo===codigo)}
function analiticasCodigoContexto(codigo){return analiticasContexto().filter(c=>codigoAnaliticoValido(c.codigo)&&c.codigo===codigo)}
function valorContaApresentado(c,mesIndex,ano){return contaAtivaNoExercicio(c,ano)?valorBrutoConta(c,mesIndex,ano)*multiplicadorApresentacao(c):0}
function valorCodigo(codigo,mesIndex,ano){return analiticasCodigo(codigo,ano).reduce((s,c)=>s+valorContaApresentado(c,mesIndex,ano),0)}
function codigosAnaliticosAno(raiz,ano){return[...new Set(analiticasAtivasAno(ano,raiz).filter(c=>codigoAnaliticoValido(c.codigo)).map(c=>c.codigo))].sort((a,b)=>a.localeCompare(b,"pt-BR"))}
function codigosAnaliticos(raiz){const set=new Set();for(const ano of anosEstrutura())codigosAnaliticosAno(raiz,ano).forEach(c=>set.add(c));return[...set].sort((a,b)=>a.localeCompare(b,"pt-BR"))}
function sinteticamenteCadastrada(codigo){return contasContexto().some(c=>estruturaAtual(c)&&contaSintetica(c)&&c.codigo===codigo)}
function codigosSinteticosN1(raiz){const set=new Set(contasContexto().filter(c=>estruturaAtual(c)&&contaSintetica(c)&&codigoSinteticoNivel1Valido(c.codigo)&&raizConta(c)===raiz).map(c=>c.codigo));codigosAnaliticos(raiz).forEach(c=>{const p=prefixosSinteticosCodigo(c)[0];if(p)set.add(p)});return[...set].sort((a,b)=>a.localeCompare(b,"pt-BR"))}
function codigosSinteticosN2(raiz,paiN1){const set=new Set(contasContexto().filter(c=>estruturaAtual(c)&&contaSintetica(c)&&codigoSinteticoNivel2Valido(c.codigo)&&raizConta(c)===raiz&&c.codigo.startsWith(`${paiN1}.`)).map(c=>c.codigo));codigosAnaliticos(raiz).forEach(c=>{const ps=prefixosSinteticosCodigo(c);if(ps[0]===paiN1&&ps[1])set.add(ps[1])});return[...set].sort((a,b)=>a.localeCompare(b,"pt-BR"))}
function nomeCodigo(codigo){return contasContexto().find(c=>estruturaAtual(c)&&c.codigo===codigo)?.nome||contasContexto().find(c=>c.codigo===codigo)?.nome||codigo}
function valorSintetica(codigo,mesIndex,ano){return codigosAnaliticosAno(codigo.charAt(0),ano).filter(a=>prefixosSinteticosCodigo(a).includes(codigo)).reduce((s,a)=>s+valorCodigo(a,mesIndex,ano),0)}
function valorRaiz(raiz,mesIndex,ano){return analiticasAtivasAno(ano,raiz).reduce((s,c)=>s+valorContaApresentado(c,mesIndex,ano),0)}
function legadasContexto(raiz){const mapa=new Map();for(const ano of anosEstrutura())for(const c of analiticasAtivasAno(ano,raiz).filter(c=>!codigoAnaliticoValido(c.codigo)))mapa.set(c.id,c);return[...mapa.values()]}

function pctVariacao(atual,anterior){
  const dif=atual-anterior;
  if(Math.abs(anterior)<0.005)return Math.abs(atual)<0.005?"0,00%":"—";
  return`${(dif/Math.abs(anterior)*100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%`;
}

function celulas(fn,cols){
  const atual=anoAtual(),anterior=anoAnterior();
  const valorAtual=()=>fn(atual,11),valorAnterior=()=>fn(anterior,11);
  return cols.map(c=>{
    if(c.tipo==="saldo")return`<td class="numero ${c.destaque?"balanco-v1-total":""}">${moeda(fn(c.ano,c.i))}</td>`;
    if(c.tipo==="variacao_valor")return`<td class="numero balanco-v1-variacao">${moeda(valorAtual()-valorAnterior())}</td>`;
    if(c.tipo==="variacao_pct")return`<td class="numero balanco-v1-variacao">${esc(pctVariacao(valorAtual(),valorAnterior()))}</td>`;
    return'<td class="numero">—</td>';
  }).join("");
}

function linhaAnalitica(codigo,cols){
  const cs=analiticasCodigoContexto(codigo),c=cs[0],naturezas=new Set(cs.map(x=>x.naturezaContabil||descricaoNatureza(x))),divergente=naturezas.size>1,red=cs.length>0&&cs.every(contaRedutora),auto=cs.some(contaAutomatica);
  return`<tr class="${red?"balanco-v1-redutora":""}"><td><div class="balanco-v1-tree" style="padding-left:74px"><span>•</span><span><strong>${esc(codigo)}</strong> · ${esc(nomeCodigo(codigo))}${red?'<span class="balanco-v1-pill">REDUTORA</span>':""}${divergente?'<span class="balanco-v1-pill warn">NATUREZA DIVERGENTE</span>':""}</span></div><small>${c?esc(descricaoNatureza(c)):""}${auto?" · origem automática: Imobilizado":""}${cs.length>1?` · ${cs.length} empresa(s)/conta(s) consolidadas`:""}</small></td>${celulas((ano,i)=>valorCodigo(codigo,i,ano),cols)}</tr>`;
}
function linhaSintetica(codigo,cols,nivel){const cadastrada=sinteticamenteCadastrada(codigo),indent=nivel===1?20:46,classe=nivel===1?"balanco-v1-sint1":"balanco-v1-sint2";return`<tr class="${classe}"><td><div class="balanco-v1-tree" style="padding-left:${indent}px"><span>Σ</span><span><strong>${esc(codigo)}</strong> · ${esc(cadastrada?nomeCodigo(codigo):"Sintética de reconciliação")}${!cadastrada?'<span class="balanco-v1-pill warn">NÃO CADASTRADA</span>':""}</span></div><small>Soma das Analíticas descendentes já considerando redutoras</small></td>${celulas((ano,i)=>valorSintetica(codigo,i,ano),cols)}</tr>`}
function linhaLegado(c,cols){const red=contaRedutora(c),multi=empresasSelecionadasIds().length>1;return`<tr class="balanco-v1-legado ${red?"balanco-v1-redutora":""}"><td><div class="balanco-v1-tree" style="padding-left:20px"><span>!</span><span><strong>${esc(c.codigo||"SEM CÓDIGO")}</strong> · ${esc(c.nome||"Conta legada")}<span class="balanco-v1-pill warn">LEGADO</span>${red?'<span class="balanco-v1-pill">REDUTORA</span>':""}</span></div><small>${esc(descricaoNatureza(c))}${multi?` · ${esc(nomeEmpresa(c.empresaId))}`:""}${contaAutomatica(c)?" · origem automática: Imobilizado":""}</small></td>${celulas((ano,i)=>valorContaApresentado(c,i,ano),cols)}</tr>`}
function linhaRaiz(raiz,label,cols){return`<tr class="balanco-v1-raiz"><td><strong>${raiz} · ${esc(label)}</strong></td>${celulas((ano,i)=>valorRaiz(raiz,i,ano),cols)}</tr>`}

function cabecalhoColuna(c){
  if(c.tipo==="variacao_valor"||c.tipo==="variacao_pct")return`<th class="balanco-v1-variacao">${esc(c.label)}</th>`;
  if(visaoRelatorio()==="comparativo_anual"&&c.label==="Last Year")return`<th class="balanco-v1-total">Last Year<br><small>${c.ano}</small></th>`;
  if(visaoRelatorio()==="comparativo_anual")return`<th class="balanco-v1-total">${c.ano}</th>`;
  return`<th class="${c.destaque?"balanco-v1-total":""}">${esc(c.label)}/${c.ano}</th>`;
}

function render(){
  const t=$("tabelaBalancoV1");
  if(!t)return;
  const ids=empresasSelecionadasIds(),cols=colunas();
  if(!ids.length){t.innerHTML='<tbody><tr><td>Selecione ao menos uma empresa no cabeçalho.</td></tr></tbody>';return}
  const corpo=[];
  let legadoQtd=0,orfaoQtd=0,divergencias=0;
  for(const[r,label]of[["1","ATIVO"],["2","PASSIVO / PATRIMÔNIO LÍQUIDO"]]){
    corpo.push(linhaRaiz(r,label,cols));
    for(const s1 of codigosSinteticosN1(r)){
      if(!sinteticamenteCadastrada(s1))orfaoQtd++;
      corpo.push(linhaSintetica(s1,cols,1));
      for(const s2 of codigosSinteticosN2(r,s1)){
        if(!sinteticamenteCadastrada(s2))orfaoQtd++;
        corpo.push(linhaSintetica(s2,cols,2));
        for(const a of codigosAnaliticos(r).filter(x=>prefixosSinteticosCodigo(x)[1]===s2)){
          const cs=analiticasCodigoContexto(a);
          if(new Set(cs.map(x=>x.naturezaContabil||descricaoNatureza(x))).size>1)divergencias++;
          corpo.push(linhaAnalitica(a,cols));
        }
      }
    }
    const leg=legadasContexto(r);
    legadoQtd+=leg.length;
    leg.forEach(c=>corpo.push(linhaLegado(c,cols)));
  }
  const diferenca=(ano,i)=>valorRaiz("1",i,ano)-valorRaiz("2",i,ano);
  const saldosValidacao=cols.filter(c=>c.tipo==="saldo").map(c=>diferenca(c.ano,c.i));
  const fechado=saldosValidacao.every(v=>Math.abs(v)<.005);
  corpo.push(`<tr class="balanco-v1-diferenca"><td>DIFERENÇA · ATIVO − PASSIVO/PL</td>${celulas(diferenca,cols)}</tr>`);
  t.innerHTML=`<thead><tr><th>Conta patrimonial</th>${cols.map(cabecalhoColuna).join("")}</tr></thead><tbody>${corpo.join("")||'<tr><td>Nenhuma conta patrimonial cadastrada.</td></tr>'}</tbody>`;
  const contexto=contextoTexto();
  if($("balancoV1Contexto"))$("balancoV1Contexto").textContent=contexto;
  if($("balancoV1ContextoTopo"))$("balancoV1ContextoTopo").textContent=contexto;
  const st=$("balancoV1Status");
  if(st){st.className=fechado&&!divergencias?"status-ativo":"status-atencao";st.textContent=fechado&&!divergencias?"BALANÇO FECHADO":!fechado?"HÁ DIFERENÇA":"REVISAR NATUREZAS"}
  const aviso=$("balancoV1Aviso"),avisos=[];
  if(!fechado)avisos.push("existe diferença entre Ativo e Passivo/PL");
  if(legadoQtd)avisos.push(`${legadoQtd} conta(s) legada(s) estão incluídas na reconciliação`);
  if(orfaoQtd)avisos.push(`${orfaoQtd} Sintética(s) foram reconstruídas a partir das Analíticas porque não há cadastro explícito`);
  if(divergencias)avisos.push(`${divergencias} código(s) têm natureza divergente entre empresas`);
  if(aviso){
    aviso.classList.remove("hidden");
    aviso.innerHTML=avisos.length?`<strong>Atenção:</strong> ${esc(avisos.join("; "))}.`:visaoRelatorio()==="comparativo_anual"?'<strong>Integridade:</strong> comparativo usa posições de dezembro do ano atual e do Last Year; variação em valor = atual − LY e variação percentual usa o módulo do saldo LY como base.':'<strong>Integridade:</strong> Ativo e Passivo/PL estão equilibrados; os Totais representam a posição de fechamento do período e não a soma dos meses.';
  }
}

async function carregar(){
  criarPagina();
  if(busy)return;
  const ids=empresasSelecionadasIds();
  if(!ids.length){render();return}
  const b=$("btnAtualizarBalancoV1");
  busy=true;
  if(b){b.disabled=true;b.textContent="Atualizando..."}
  try{
    const[p,r,im]=await Promise.all([
      listarDocumentos("planoContasGerencial"),
      listarDocumentos("realizadoMensal"),
      listarDocumentos("imobilizados").catch(()=>[])
    ]);
    plano=p;
    realizados=r;
    bens=im;
    render();
  }catch(e){
    console.error("Balanço V1:",e);
    const a=$("balancoV1Aviso");
    if(a)a.innerHTML='<strong>Erro:</strong> não foi possível carregar o Balanço Patrimonial.';
  }finally{
    busy=false;
    if(b){b.disabled=false;b.textContent="Atualizar"}
  }
}

function marcarSujo(){
  if(visivel()){
    const a=$("balancoV1Aviso");
    if(a)a.innerHTML='<strong>Contexto alterado.</strong> Clique em Atualizar para recalcular as posições patrimoniais.';
    const contexto=contextoTexto();
    if($("balancoV1Contexto"))$("balancoV1Contexto").textContent=contexto;
    if($("balancoV1ContextoTopo"))$("balancoV1ContextoTopo").textContent=contexto;
  }
}

function metaExportacao(){
  return visaoRelatorio()==="comparativo_anual"
    ?[contextoTexto(),"Ano atual e Last Year são posições de dezembro; variação em valor = atual − LY; percentual sobre o módulo de LY."]
    :[contextoTexto(),"Saldos de posição; Total do trimestre/ano = posição do último mês do período, nunca soma dos meses."];
}
function exportar(){const t=$("tabelaBalancoV1");if(!t)return;exportarTabelaXls(t,{nome:`balanco_${anoAtual()}_${visaoRelatorio()}_${periodoChave()}`,titulo:"Balanço Patrimonial",meta:metaExportacao()})}
async function imprimir(){const t=$("tabelaBalancoV1");if(!t)return;await exportarTabelaPdf(t,{nome:`balanco_${anoAtual()}_${visaoRelatorio()}_${periodoChave()}`,titulo:"Balanço Patrimonial",meta:metaExportacao()})}
export function abrir(){criarPagina();abrirPagina("ctrl-balanco-v1");const t=$("tituloPagina");if(t)t.textContent="Balanço Patrimonial";carregar()}
export{carregar};
criarPagina();
window.addEventListener("sig:periodo-changed",marcarSujo);
window.addEventListener("sig:empresa-changed",marcarSujo);
