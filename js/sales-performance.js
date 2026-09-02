import { $, esc, permite, admin, moeda, listarDocumentos, periodoAno, periodoChave } from "./shared.js";

const PERIODOS={total:[0,1,2,3,4,5,6,7,8,9,10,11],t1:[0,1,2],t2:[3,4,5],t3:[6,7,8],t4:[9,10,11]};
for(let i=0;i<12;i++)PERIODOS[`m${String(i+1).padStart(2,"0")}`]=[i];
let busy=false;
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const podeVer=()=>admin()||["visualizar","lancar","editar","vendedores","comissoes"].some(a=>permite("vendas",a));
const indices=()=>PERIODOS[periodoChave()]||PERIODOS.total;
const mes=v=>Number(String(v||"").slice(5,7))-1;
const ano=v=>Number(String(v||"").slice(0,4));
const valida=v=>v?.status!=="cancelada";
const baseNome=b=>b==="faturamento"?"faturamento":"venda";

function pagina(){return $("pagina-vendas")}
function visivel(){const p=pagina();return !!p&&!p.classList.contains("hidden")}
function css(){if($("sales-performance-css"))return;const l=document.createElement("link");l.id="sales-performance-css";l.rel="stylesheet";l.href="sales-performance.css?v=1";document.head.appendChild(l)}
function montar(){
  const p=pagina();if(!p||$("salesPerfV2"))return false;css();const grade=p.querySelector(".sales-grid");if(!grade)return false;
  const s=document.createElement("section");s.id="salesPerfV2";s.className="lista-card sales-perf-v2";s.innerHTML=`
    <div class="lista-cabecalho sales-perf-v2-head"><div><h3>Mapa de performance comercial</h3><p>Venda × faturamento × meta por vendedor. Clique em uma linha para abrir o detalhe daquele vendedor.</p></div><div class="sales-perf-v2-legend"><span class="venda"><i></i>Venda</span><span class="fat"><i></i>Faturamento</span><span class="meta"><i></i>Meta</span></div></div>
    <div id="salesPerfInsights" class="sales-perf-v2-insights"></div>
    <div id="salesPerfRows" class="sales-perf-v2-rows"><div class="empty-state">Carregando performance...</div></div>`;
  grade.insertAdjacentElement("afterend",s);
  s.addEventListener("click",e=>{const b=e.target.closest?.("[data-sales-focus]");if(!b)return;const filtro=$("salesFiltroVendedor");if(!filtro)return;filtro.value=b.dataset.salesFocus;filtro.dispatchEvent(new Event("change",{bubbles:true}));$("salesLista")?.closest(".lista-card")?.scrollIntoView({behavior:"smooth",block:"start"})});
  return true;
}
function noPeriodo(data){const a=periodoAno(),idx=new Set(indices()),m=mes(data);return ano(data)===a&&idx.has(m)}
function resumo(vendedor,vendas){
  const validas=vendas.filter(v=>valida(v)&&v.vendedorId===vendedor.id);
  const vendasPeriodo=validas.filter(v=>noPeriodo(v.data));
  const faturadasPeriodo=validas.filter(v=>v.dataFaturamento&&noPeriodo(v.dataFaturamento));
  const comissoesPeriodo=validas.filter(v=>v.baseComissao==="faturamento"?(v.dataFaturamento&&noPeriodo(v.dataFaturamento)):noPeriodo(v.data));
  const venda=vendasPeriodo.reduce((s,x)=>s+n(x.valor),0),faturamento=faturadasPeriodo.reduce((s,x)=>s+n(x.valorFaturado),0),meta=n(vendedor.metaMensal)*indices().length,comissao=comissoesPeriodo.reduce((s,x)=>s+n(x.comissaoValor),0),atingimento=meta?venda/meta*100:0,conversao=venda?faturamento/venda*100:0,ticket=vendasPeriodo.length?venda/vendasPeriodo.length:0,gap=Math.max(0,venda-faturamento);
  return{vendedor,venda,faturamento,meta,comissao,atingimento,conversao,ticket,gap,qtd:vendasPeriodo.length};
}
function leitura(r){
  if(r.venda<=0)return["neutro","Sem produção no período"];
  if(r.meta>0&&r.atingimento>=100&&r.conversao>=90)return["forte","Meta batida · faturamento saudável"];
  if(r.meta>0&&r.atingimento>=100)return["atencao","Meta batida · faturamento pendente"];
  if(r.gap>0&&r.conversao<70)return["atencao","Gap alto entre venda e faturamento"];
  if(r.meta>0&&r.atingimento>=80)return["quase","Próximo da meta"];
  if(r.conversao>110)return["info","Faturamento inclui carteira anterior"];
  return["neutro","Em evolução"];
}
function renderInsights(rank){
  const box=$("salesPerfInsights");if(!box)return;if(!rank.length){box.innerHTML="";return}
  const total=rank.reduce((s,r)=>s+r.venda,0),lider=rank[0],ating=[...rank].filter(r=>r.meta>0).sort((a,b)=>b.atingimento-a.atingimento)[0],gap=[...rank].sort((a,b)=>b.gap-a.gap)[0],com=[...rank].sort((a,b)=>b.comissao-a.comissao)[0],share=total?lider.venda/total*100:0;
  box.innerHTML=`<div><span>Líder de vendas</span><strong>${esc(lider.vendedor.nome)}</strong><small>${moeda(lider.venda)} · ${share.toLocaleString("pt-BR",{maximumFractionDigits:1})}% do total</small></div><div><span>Maior atingimento</span><strong>${ating?esc(ating.vendedor.nome):"—"}</strong><small>${ating?ating.atingimento.toLocaleString("pt-BR",{maximumFractionDigits:1})+"% da meta":"Sem meta cadastrada"}</small></div><div class="alerta"><span>Maior gap venda × faturamento</span><strong>${gap&&gap.gap>0?esc(gap.vendedor.nome):"Sem gap relevante"}</strong><small>${gap&&gap.gap>0?moeda(gap.gap)+" ainda não faturado":"Venda e faturamento alinhados"}</small></div><div><span>Maior comissão no período</span><strong>${com?esc(com.vendedor.nome):"—"}</strong><small>${com?moeda(com.comissao):"—"}</small></div>`;
}
function renderRows(rank){
  const box=$("salesPerfRows");if(!box)return;if(!rank.length){box.innerHTML='<div class="empty-state">Cadastre vendedores para gerar o comparativo.</div>';return}
  const max=Math.max(1,...rank.flatMap(r=>[r.venda,r.faturamento,r.meta])),w=v=>Math.max(v>0?2:0,n(v)/max*100);
  box.innerHTML=rank.map((r,i)=>{const[classe,texto]=leitura(r);return`<button class="sales-perf-v2-row" data-sales-focus="${r.vendedor.id}" type="button"><div class="sales-perf-v2-name"><span><b>#${i+1}</b><strong>${esc(r.vendedor.nome)}</strong><small>Comissão por ${baseNome(r.vendedor.baseComissao)}</small></span><em class="${classe}">${esc(texto)}</em></div><div class="sales-perf-v2-bars"><div><span>Venda</span><i><b class="venda" style="width:${w(r.venda)}%"></b></i><strong>${moeda(r.venda)}</strong></div><div><span>Faturado</span><i><b class="fat" style="width:${w(r.faturamento)}%"></b></i><strong>${moeda(r.faturamento)}</strong></div><div><span>Meta</span><i><b class="meta" style="width:${w(r.meta)}%"></b></i><strong>${moeda(r.meta)}</strong></div></div><div class="sales-perf-v2-foot"><span>Atingimento<strong>${r.meta?r.atingimento.toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":"—"}</strong></span><span>Faturado/Venda<strong>${r.venda?r.conversao.toLocaleString("pt-BR",{maximumFractionDigits:1})+"%":"—"}</strong></span><span>Ticket médio<strong>${moeda(r.ticket)}</strong></span><span>Comissão<strong>${moeda(r.comissao)}</strong></span></div></button>`}).join("");
}
async function carregar(){
  if(!visivel()||!podeVer()||busy)return;montar();busy=true;try{const[vendedores,vendas]=await Promise.all([listarDocumentos("vendedores"),listarDocumentos("vendas")]);const idsVenda=new Set(vendas.filter(v=>valida(v)&&(noPeriodo(v.data)||(v.dataFaturamento&&noPeriodo(v.dataFaturamento)))).map(v=>v.vendedorId));const base=vendedores.filter(v=>v.status!=="inativo"||idsVenda.has(v.id));const rank=base.map(v=>resumo(v,vendas)).sort((a,b)=>b.venda-a.venda||b.faturamento-a.faturamento||String(a.vendedor.nome||"").localeCompare(String(b.vendedor.nome||""),"pt-BR"));renderInsights(rank);renderRows(rank)}catch(e){console.error("Performance de vendas:",e);const box=$("salesPerfRows");if(box)box.innerHTML='<div class="empty-state">Não foi possível carregar a performance por vendedor.</div>'}finally{busy=false}}
function tentar(){if(montar()&&visivel())setTimeout(carregar,40)}
const obs=new MutationObserver(tentar);obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="vendas")setTimeout(()=>{montar();carregar()},120)});
window.addEventListener("sig:empresa-changed",()=>setTimeout(carregar,80));
window.addEventListener("sig:periodo-changed",()=>setTimeout(carregar,80));
window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="vendas")setTimeout(carregar,80)});
window.addEventListener("sig:ready",tentar);
tentar();