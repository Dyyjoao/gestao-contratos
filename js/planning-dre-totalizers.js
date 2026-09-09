import { listarDocumentos, moeda, esc } from "./shared.js";
import { multiplicadorResultado, multiplicadorApresentacao } from "./account-mask.js";
import { agregarClassificacao, linhasResumoGerencial, linhasResumoCpc51 } from "./dre-classification.js";

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CONFIGS=[
  {pagina:"pagina-ctrl-budget-v7",tabela:"pagina-ctrl-budget-v7-tabela",cenario:"budget",titulo:"Budget"},
  {pagina:"pagina-ctrl-forecast-v5",tabela:"pagina-ctrl-forecast-v5-tabela",cenario:"forecast",titulo:"Forecast"}
];
let plano=[],busy=false,observer=null,timer=null;

function parseNumero(txt){let s=String(txt||"").trim(),neg=/\([^)]*\)/.test(s)||s.includes("-");s=s.replace(/[^0-9,.-]/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");const x=Math.abs(Number.parseFloat(s)||0);return neg?-x:x}
function codigoLinha(tr){return String(tr?.cells?.[0]?.textContent||"").match(/[34]\.\d{2}\.\d{2}\.\d{4}/)?.[0]||""}
function contaPorCodigo(codigo){const xs=plano.filter(c=>String(c.codigo||"")===codigo);return xs.length===1?xs[0]:xs[0]||null}
function vetorLinha(tr,cenario){const v=Array(12).fill(0);if(cenario==="budget"){for(let i=0;i<12;i++)v[i]=parseNumero(tr.cells?.[2+i*3]?.textContent)}else for(let i=0;i<12;i++)v[i]=parseNumero(tr.cells?.[1+i]?.textContent);return v}
function converterResultado(c,v){const a=multiplicadorApresentacao(c),r=multiplicadorResultado(c),f=a?r/a:r;return v.map(x=>Number(x||0)*f)}

function linhasDaTabela(cfg){const t=document.getElementById(cfg.tabela);if(!t)return[];const out=[];t.querySelectorAll("tbody tr.dre-filha:not(.conta-sintetica-row):not(.linha-estatistica)").forEach(tr=>{const codigo=codigoLinha(tr),c=contaPorCodigo(codigo);if(!codigo||!c)return;out.push({conta:c,valores:converterResultado(c,vetorLinha(tr,cfg.cenario))})});return out}
function total(v){return(v||[]).reduce((s,x)=>s+Number(x||0),0)}

function instalarCfg(cfg){
  const pag=document.getElementById(cfg.pagina),t=document.getElementById(cfg.tabela);if(!pag||!t)return false;
  const id=`${cfg.pagina}-dre-totalizadores`;if(document.getElementById(id))return true;
  const wrap=t.closest(".fpa-grid-wrap,.tabela-container")||t.parentElement;if(!wrap)return false;
  const card=document.createElement("section");card.id=id;card.className="lista-card planning-dre-totalizadores";card.innerHTML=`<div class="lista-cabecalho"><div><h3>Totalizadores da DRE · ${cfg.titulo}</h3><p>Linhas calculadas automaticamente a partir das contas analíticas. Não recebem lançamentos.</p></div><div style="display:flex;gap:8px;align-items:center"><select data-planning-dre-modelo="${cfg.cenario}"><option value="gerencial">Gerencial</option><option value="cpc51">Societária · CPC 51</option></select><span data-planning-dre-cobertura="${cfg.cenario}" class="status-ativo">—</span></div></div><div class="fpa-grid-wrap"><table data-planning-dre-table="${cfg.cenario}" class="fpa-grid planning-dre-grid"><tbody><tr><td>Aguardando a matriz...</td></tr></tbody></table></div>`;
  wrap.parentElement?.insertBefore(card,wrap);
  card.querySelector("select")?.addEventListener("change",()=>renderCfg(cfg));
  return true;
}

function renderCfg(cfg){
  if(!instalarCfg(cfg))return;const pag=document.getElementById(cfg.pagina);if(!pag||pag.classList.contains("hidden"))return;
  const linhas=linhasDaTabela(cfg),ag=agregarClassificacao(linhas),sel=pag.querySelector(`[data-planning-dre-modelo="${cfg.cenario}"]`),modelo=sel?.value||"gerencial",rows=modelo==="cpc51"?linhasResumoCpc51(ag):linhasResumoGerencial(ag),tb=pag.querySelector(`[data-planning-dre-table="${cfg.cenario}"]`),cob=pag.querySelector(`[data-planning-dre-cobertura="${cfg.cenario}"]`);if(!tb)return;
  const faltam=Math.max(0,ag.total-ag.explicitas);if(cob){cob.textContent=faltam?`${ag.explicitas}/${ag.total} classificadas`:`${ag.total} classificadas`;cob.className=faltam?"status-pendente":"status-ativo"}
  const body=rows.map(r=>`<tr class="${r.totalizador?"planning-dre-total":"planning-dre-item"} ${r.destaque?"planning-dre-destaque":""}"><td>${esc(r.label)}${r.totalizador?'<small>Σ automático · não lançável</small>':""}</td>${r.valores.map(v=>`<td class="numero">${moeda(v)}</td>`).join("")}<td class="numero"><strong>${moeda(total(r.valores))}</strong></td></tr>`).join("");
  tb.innerHTML=`<thead><tr><th>Linha da DRE</th>${MESES.map(m=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${body}</tbody>`;
}

async function carregarPlano(){if(busy)return;busy=true;try{plano=await listarDocumentos("planoContasGerencial");CONFIGS.forEach(renderCfg)}catch(e){console.warn("Totalizadores Budget/Forecast: Plano de Contas indisponível",e)}finally{busy=false}}
function agendar(){clearTimeout(timer);timer=setTimeout(()=>CONFIGS.forEach(renderCfg),100)}
function instalar(){
  if(!document.getElementById("planning-dre-totalizadores-css")){const s=document.createElement("style");s.id="planning-dre-totalizadores-css";s.textContent=`.planning-dre-totalizadores{margin-bottom:14px}.planning-dre-grid th:first-child,.planning-dre-grid td:first-child{min-width:300px;white-space:normal}.planning-dre-grid th:not(:first-child),.planning-dre-grid td:not(:first-child){min-width:95px}.planning-dre-grid .numero{text-align:right;font-variant-numeric:tabular-nums}.planning-dre-total td{background:#eef3f5;font-weight:900}.planning-dre-destaque td{background:#0b1f33!important;color:#fff!important;font-weight:900}.planning-dre-item td:first-child{padding-left:16px;color:#475467}`;document.head.appendChild(s)}
  CONFIGS.forEach(instalarCfg);if(observer)return;observer=new MutationObserver(m=>{if(m.some(x=>CONFIGS.some(c=>x.target?.id===c.tabela||x.target?.closest?.(`#${c.tabela}`))))agendar();else if(m.some(x=>x.addedNodes?.length))CONFIGS.forEach(install=>instalarCfg(install))});observer.observe(document.body,{childList:true,subtree:true});
}
window.addEventListener("sig:ready",()=>{instalar();carregarPlano()});window.addEventListener("sig:page",()=>{instalar();carregarPlano();setTimeout(agendar,180)});window.addEventListener("sig:empresa-changed",carregarPlano);window.addEventListener("sig:data-changed",e=>{if(["controladoria","planoContas","plano"].includes(e.detail?.modulo))carregarPlano();else agendar()});
instalar();carregarPlano();
