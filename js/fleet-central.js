import { $, esc, listarDocumentos, empresaUnicaSelecionadaId, dataBr, moeda } from './shared.js';
import { colaboradoresPorFuncao } from './hr-role-registry.js';

let veiculos=[],manutencoes=[],abastecimentos=[],custosDiesel=[],motoristas=[],timer=0,observer=null,carregando=false,veiculoSelecionado='';
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const hoje=()=>new Date();
const emp=()=>empresaUnicaSelecionadaId();
const diasDesde=s=>{if(!s)return null;const d=new Date(`${String(s).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?null:Math.floor((hoje()-d)/86400000)};
const em12m=s=>{const d=diasDesde(s);return d!=null&&d>=0&&d<=366};
const ativo=v=>v.status==='ativo';
const obrigacoes=v=>Array.isArray(v?.obrigacoes)?v.obrigacoes:[];
const vencida=o=>!['pago','cancelado','em_recurso'].includes(o.status)&&o.vencimento&&new Date(`${o.vencimento}T12:00:00`)<hoje();
const diasAte=s=>{if(!s)return null;const d=new Date(`${s}T12:00:00`);return Number.isNaN(d.getTime())?null:Math.ceil((d-hoje())/86400000)};
const manutVencida=(m,v)=>{if(['concluida','cancelada'].includes(m.status))return false;const dd=diasAte(m.dataPrevista),km=n(m.kmPrevisto)-n(v?.quilometragemAtual);return (dd!=null&&dd<0)||(n(m.kmPrevisto)>0&&km<=0)};
const manutProxima=(m,v)=>{if(['concluida','cancelada'].includes(m.status))return false;const dd=diasAte(m.dataPrevista),km=n(m.kmPrevisto)-n(v?.quilometragemAtual);return (dd!=null&&dd>=0&&dd<=30)||(n(m.kmPrevisto)>0&&km>0&&km<=1000)};
const consumoVeiculo=id=>abastecimentos.filter(x=>x.status!=='estornado'&&x.tipo==='consumo'&&x.veiculoId===id&&n(x.quantidade)>0);
const kmL=x=>x.kmAtual!=null&&x.kmAnterior!=null&&n(x.kmAtual)>n(x.kmAnterior)&&n(x.quantidade)>0?(n(x.kmAtual)-n(x.kmAnterior))/n(x.quantidade):null;
const media=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const classeSaude=v=>v>=90?'Excelente':v>=75?'Saudável':v>=60?'Atenção':v>=40?'Crítico':'Urgente';

function garantirCss(){if(document.querySelector('link[href^="fleet-central.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='fleet-central.css?v=1';document.head.appendChild(l)}
async function seguro(colecao){try{return await listarDocumentos(colecao)}catch(e){console.warn(`Coleção ${colecao} indisponível`,e);return[]}}
async function carregarDados(){
  if(carregando||!emp())return;carregando=true;
  try{
    const [v,m,a,c,mo]=await Promise.all([seguro('veiculos'),seguro('manutencoesFrota'),seguro('abastecimentosFrota'),seguro('custosDiesel'),colaboradoresPorFuncao('MOTORISTA').catch(()=>[])]);
    veiculos=v.filter(x=>x.empresaId===emp());manutencoes=m.filter(x=>x.empresaId===emp());abastecimentos=a.filter(x=>x.empresaId===emp());custosDiesel=c.filter(x=>x.empresaId===emp());motoristas=mo.filter(x=>x.empresaId===emp());
    decorar();
  }finally{carregando=false}
}

function trocarPorSelect(input,lista,placeholder='Selecione...'){
  if(!input||input.tagName==='SELECT')return input;
  const s=document.createElement('select');for(const a of [...input.attributes])if(!['type','placeholder','value'].includes(a.name))s.setAttribute(a.name,a.value);s.id=input.id;s.className=input.className;s.required=input.required;
  s.innerHTML=`<option value="">${placeholder}</option>`+lista.map(p=>`<option value="${esc(p.nome)}" data-colaborador-id="${esc(p.id)}">${esc(p.nome)} · ${esc(p.cargoNome||'MOTORISTA')}</option>`).join('');
  const valor=String(input.value||'').trim().toUpperCase();input.replaceWith(s);if(valor){const o=[...s.options].find(x=>String(x.value).toUpperCase()===valor);if(o)s.value=o.value}return s;
}
function decorarMotoristas(){
  trocarPorSelect($('veiculoResponsavel'),motoristas,'Selecione o motorista...');
  trocarPorSelect($('fuelMotorista'),motoristas,'Selecione o motorista...');
  trocarPorSelect($('obrigCondutor'),motoristas,'Sem condutor vinculado');
  const centro=$('veiculoCentro')?.closest('.campo');if(centro)centro.remove();
}
function ampliarTiposManutencao(){const s=$('manutTipo');if(!s)return;const extras=[['pecas','Peças / componentes'],['servicos','Serviços / mão de obra']];for(const [v,t] of extras)if(![...s.options].some(o=>o.value===v))s.add(new Option(t,v))}

function precoMedioLitro12m(){
  const custos=custosDiesel.filter(x=>x.status!=='estornado'&&em12m(x.data)).reduce((s,x)=>s+n(x.valor),0);
  const receb=abastecimentos.filter(x=>x.status!=='estornado'&&x.tipo==='recebimento'&&em12m(x.data)).reduce((s,x)=>s+n(x.quantidade),0);
  const cons=abastecimentos.filter(x=>x.status!=='estornado'&&x.tipo==='consumo'&&em12m(x.data)).reduce((s,x)=>s+n(x.quantidade),0);
  const litros=receb||cons;return litros>0?custos/litros:0;
}
function custosVeiculo(v){
  const man=manutencoes.filter(x=>x.veiculoId===v.id&&x.status==='concluida'&&em12m(x.dataRealizada||x.dataPrevista)).reduce((s,x)=>s+n(x.custoReal),0);
  const docs=obrigacoes(v).filter(x=>x.status==='pago'&&em12m(x.dataPagamento||x.vencimento)).reduce((s,x)=>s+n(x.valor),0);
  const mov=consumoVeiculo(v.id).filter(x=>em12m(x.data)),litros=mov.reduce((s,x)=>s+n(x.quantidade),0),fuel=litros*precoMedioLitro12m();
  const km=mov.reduce((s,x)=>s+(x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,n(x.kmAtual)-n(x.kmAnterior)):0),0);
  return{manutencao:man,documentacao:docs,combustivelEstimado:fuel,total:man+docs+fuel,litros,km,custoKm:km>0?(man+docs+fuel)/km:null,kmL:litros>0&&km>0?km/litros:null};
}

function criterioDocumentacao(v){
  const os=obrigacoes(v),consultado=!!v.ultimaConsultaOficialEm;if(!os.length&&!consultado)return null;
  const venc=os.filter(vencida).length,prox=os.filter(o=>{const d=diasAte(o.vencimento);return !['pago','cancelado'].includes(o.status)&&d!=null&&d>=0&&d<=30}).length;
  const pts=Math.max(0,25-venc*8-prox*3);return{nome:'Documentação e regularidade',peso:25,pontos:pts,texto:venc?`${venc} obrigação(ões) vencida(s)${prox?` e ${prox} próxima(s)`:''}`:prox?`${prox} obrigação(ões) vencendo em até 30 dias`:'Sem pendências conhecidas'};
}
function criterioManut(v){
  const ms=manutencoes.filter(x=>x.veiculoId===v.id);if(!ms.length)return null;const venc=ms.filter(x=>manutVencida(x,v)).length,prox=ms.filter(x=>manutProxima(x,v)).length;const pts=Math.max(0,30-venc*15-prox*5);return{nome:'Manutenção',peso:30,pontos:pts,texto:venc?`${venc} manutenção(ões) vencida(s)${prox?` e ${prox} próxima(s)`:''}`:prox?`${prox} manutenção(ões) próxima(s)`:'Plano de manutenção sem atraso conhecido'};
}
function criterioConsumo(v){
  const vals=consumoVeiculo(v.id).map(x=>({data:x.data,kml:kmL(x)})).filter(x=>x.kml&&x.kml>0).sort((a,b)=>String(a.data).localeCompare(String(b.data)));if(vals.length<3)return null;
  const recentes=vals.slice(-3).map(x=>x.kml),anteriores=vals.slice(-6,-3).map(x=>x.kml),atual=media(recentes),base=anteriores.length?media(anteriores):media(vals.map(x=>x.kml)),queda=base>0?(base-atual)/base:0;let pts=20;if(queda>.30)pts=5;else if(queda>.20)pts=10;else if(queda>.10)pts=15;return{nome:'Consumo',peso:20,pontos:pts,texto:`${atual.toFixed(2)} km/l nos últimos registros${queda>.10?` · queda de ${(queda*100).toFixed(0)}% versus histórico`:' · estável versus histórico'}`};
}
function criterioCusto(v,mediana){
  const c=custosVeiculo(v);if(!c.km||!Number.isFinite(c.custoKm)||c.total<=0||!mediana)return null;const rel=c.custoKm/mediana;let pts=15;if(rel>1.75)pts=4;else if(rel>1.40)pts=8;else if(rel>1.15)pts=12;return{nome:'Custo operacional',peso:15,pontos:pts,texto:`${moeda(c.custoKm)}/km · ${rel>1.15?`${((rel-1)*100).toFixed(0)}% acima da mediana da frota`:'dentro da faixa da frota'}`};
}
function criterioUso(v){
  if(n(v.quilometragemAtual)<=0)return null;const datas=consumoVeiculo(v.id).map(x=>x.data).concat(manutencoes.filter(x=>x.veiculoId===v.id).map(x=>x.dataRealizada||x.dataPrevista)).filter(Boolean).sort();if(!datas.length)return null;const d=diasDesde(datas.at(-1));let pts=10;if(d>180)pts=1;else if(d>90)pts=4;else if(d>45)pts=7;return{nome:'Utilização / KM',peso:10,pontos:pts,texto:`Última evidência de quilometragem há ${d} dia(s)`};
}
function medianaCustos(){const vals=veiculos.filter(ativo).map(custosVeiculo).filter(x=>x.custoKm&&Number.isFinite(x.custoKm)).map(x=>x.custoKm).sort((a,b)=>a-b);if(!vals.length)return 0;const m=Math.floor(vals.length/2);return vals.length%2?vals[m]:(vals[m-1]+vals[m])/2}
function saudeVeiculo(v){
  const med=medianaCustos(),criterios=[criterioDocumentacao(v),criterioManut(v),criterioConsumo(v),criterioCusto(v,med),criterioUso(v)].filter(Boolean),peso=criterios.reduce((s,x)=>s+x.peso,0),pontos=criterios.reduce((s,x)=>s+x.pontos,0),score=peso?Math.round(pontos/peso*100):null;
  return{veiculo:v,criterios,peso,score,cobertura:criterios.length,classificacao:score==null?'Dados insuficientes':classeSaude(score)};
}
function saudeFrota(){const itens=veiculos.filter(ativo).map(saudeVeiculo),validos=itens.filter(x=>x.score!=null);return{itens,score:validos.length?Math.round(media(validos.map(x=>x.score))):null}}

function renderSaudeDetalhada(){
  const alvo=$('frotaSaude');if(!alvo)return;const s=saudeFrota(),score=s.score,ordenados=[...s.itens].sort((a,b)=>(a.score??999)-(b.score??999));
  const faltantes=['Documentação e regularidade','Manutenção','Consumo','Custo operacional','Utilização / KM'];
  alvo.innerHTML=`<div class="fleet-central-health"><div class="fleet-central-score"><strong>${score==null?'—':score}</strong><span>${score==null?'Dados insuficientes':classeSaude(score)}</span><small>${score==null?'Nenhum veículo possui dados suficientes para nota.':'Média normalizada dos veículos ativos; critérios sem dados não reduzem a nota.'}</small></div><div class="fleet-health-method"><strong>Como a nota é formada</strong><span>Documentação 25 · Manutenção 30 · Consumo 20 · Custo 15 · Utilização 10</span></div>${ordenados.map(x=>`<details class="fleet-health-vehicle" ${x.score!=null&&x.score<60?'open':''}><summary><span>${esc(x.veiculo.placa||'—')} · ${esc(x.veiculo.modelo||x.veiculo.marca||'Veículo')}</span><strong>${x.score==null?'Dados insuficientes':`${x.score}/100 · ${esc(x.classificacao)}`}</strong></summary><div class="fleet-health-breakdown">${x.criterios.map(c=>`<div><span>${esc(c.nome)} <small>${c.pontos}/${c.peso}</small></span><p>${esc(c.texto)}</p></div>`).join('')}${faltantes.filter(nm=>!x.criterios.some(c=>c.nome===nm)).map(nm=>`<div class="missing"><span>${esc(nm)} <small>sem nota</small></span><p>Dados insuficientes; este critério não penaliza o veículo.</p></div>`).join('')}</div><small>Nota baseada em ${x.cobertura} de 5 critérios.</small></details>`).join('')||'<div class="fleet-empty">Nenhum veículo ativo.</div>'}</div>`;
  const k=$('frotaKpiSaude');if(k)k.textContent=score==null?'—':`${score}/100`;
  const card=k?.closest('.fleet-kpi');if(card){const sm=card.querySelector('small');if(sm)sm.textContent=score==null?'dados insuficientes':classeSaude(score)}
}

function garantirIntegracoes(){
  const visao=document.querySelector('[data-fleet-panel="visao"]');if(!visao||$('fleetIntegracoesOficiais'))return;
  const sec=document.createElement('section');sec.id='fleetIntegracoesOficiais';sec.className='fleet-card fleet-central-integrations';sec.innerHTML=`<div class="fleet-toolbar"><div><h3>Integrações oficiais</h3><p>Arquitetura preparada para sincronização automática sem expor credenciais no navegador.</p></div></div><div class="fleet-integration-grid"><div><strong>SENATRAN / SERPRO</strong><span>Multas, infrações e penalidades</span><small>Backend/credencial ainda não configurado · consulta manual permanece disponível.</small></div><div><strong>Detran-ES</strong><span>IPVA e licenciamento</span><small>Backend/credencial ainda não configurado · consulta manual permanece disponível.</small></div></div>`;visao.appendChild(sec);
}
function garantirFicha(){
  const painel=document.querySelector('[data-fleet-panel="veiculos"]');if(!painel||$('fleetFichaCentral'))return;const s=document.createElement('section');s.id='fleetFichaCentral';s.className='fleet-card hidden';const lista=painel.querySelector('.lista-card');if(lista)lista.before(s);else painel.appendChild(s)
}
function renderFicha(id){
  garantirFicha();const v=veiculos.find(x=>x.id===id),box=$('fleetFichaCentral');if(!v||!box)return;veiculoSelecionado=id;const c=custosVeiculo(v),fuel=consumoVeiculo(id).filter(x=>em12m(x.data)).sort((a,b)=>String(b.data).localeCompare(String(a.data))),ms=manutencoes.filter(x=>x.veiculoId===id).sort((a,b)=>String(b.dataRealizada||b.dataPrevista).localeCompare(String(a.dataRealizada||a.dataPrevista))),os=[...obrigacoes(v)].sort((a,b)=>String(b.vencimento).localeCompare(String(a.vencimento))),sv=saudeVeiculo(v);
  box.innerHTML=`<div class="fleet-toolbar"><div><h3>${esc(v.placa||'—')} · ${esc(v.marca||'')} ${esc(v.modelo||'')}</h3><p>Ficha consolidada do veículo · motorista ${esc(v.responsavel||'não definido')}</p></div><button id="fleetFecharFicha" class="btn-secundario" type="button">Fechar ficha</button></div><div class="fleet-central-tabs"><button type="button" data-central-section="resumo" class="ativo">Resumo</button><button type="button" data-central-section="custos">Custos</button><button type="button" data-central-section="combustivel">Abastecimento/consumo</button><button type="button" data-central-section="manutencao">Manutenções</button><button type="button" data-central-section="documentos">Documentação/infrações</button></div><div data-central-panel="resumo"><div class="fleet-central-kpis"><div><span>Saúde</span><strong>${sv.score==null?'—':`${sv.score}/100`}</strong><small>${esc(sv.classificacao)} · ${sv.cobertura}/5 critérios</small></div><div><span>Custo 12 meses</span><strong>${moeda(c.total)}</strong><small>inclui combustível estimado</small></div><div><span>Consumo médio</span><strong>${c.kmL?`${c.kmL.toFixed(2)} km/l`:'—'}</strong><small>${c.litros.toLocaleString('pt-BR',{maximumFractionDigits:1})} L no período</small></div><div><span>Custo por KM</span><strong>${c.custoKm?moeda(c.custoKm):'—'}</strong><small>${c.km.toLocaleString('pt-BR')} km medidos</small></div></div></div><div data-central-panel="custos" class="hidden"><div class="fleet-cost-grid"><div><span>Combustível estimado</span><strong>${moeda(c.combustivelEstimado)}</strong><small>rateio pelo custo médio do litro da frota</small></div><div><span>Peças e serviços / manutenção</span><strong>${moeda(c.manutencao)}</strong></div><div><span>IPVA, licenciamento e obrigações pagas</span><strong>${moeda(c.documentacao)}</strong></div><div><span>Total</span><strong>${moeda(c.total)}</strong></div></div></div><div data-central-panel="combustivel" class="hidden"><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Motorista</th><th>Litros</th><th>KM</th><th>KM/L</th></tr></thead><tbody>${fuel.map(x=>`<tr><td>${dataBr(x.data)}</td><td>${esc(x.motorista||'—')}</td><td>${n(x.quantidade).toLocaleString('pt-BR')}</td><td>${x.kmAtual!=null&&x.kmAnterior!=null?(n(x.kmAtual)-n(x.kmAnterior)).toLocaleString('pt-BR'):'—'}</td><td>${kmL(x)?.toFixed(2)||'—'}</td></tr>`).join('')||'<tr><td colspan="5">Sem abastecimentos de consumo no período.</td></tr>'}</tbody></table></div></div><div data-central-panel="manutencao" class="hidden"><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Fornecedor</th><th>Custo</th></tr></thead><tbody>${ms.map(x=>`<tr><td>${dataBr(x.dataRealizada||x.dataPrevista)}</td><td>${esc(x.tipo||'—')}</td><td>${esc(x.descricao||'—')}</td><td>${esc(x.oficina||'—')}</td><td>${moeda(n(x.custoReal)||n(x.custoPrevisto))}</td></tr>`).join('')||'<tr><td colspan="5">Sem registros.</td></tr>'}</tbody></table></div></div><div data-central-panel="documentos" class="hidden"><div class="tabela-container"><table class="tabela"><thead><tr><th>Tipo</th><th>Referência</th><th>Vencimento</th><th>Status</th><th>Valor</th></tr></thead><tbody>${os.map(x=>`<tr><td>${esc(x.tipo||'—')}</td><td>${esc(x.exercicio||x.auto||x.descricao||'—')}</td><td>${dataBr(x.vencimento)}</td><td>${vencida(x)?'Vencido':esc(x.status||'aberto')}</td><td>${moeda(n(x.valor))}</td></tr>`).join('')||'<tr><td colspan="5">Sem obrigações registradas.</td></tr>'}</tbody></table></div></div>`;
  box.classList.remove('hidden');$('fleetFecharFicha').addEventListener('click',()=>box.classList.add('hidden'));box.querySelectorAll('[data-central-section]').forEach(b=>b.addEventListener('click',()=>{box.querySelectorAll('[data-central-section]').forEach(x=>x.classList.toggle('ativo',x===b));box.querySelectorAll('[data-central-panel]').forEach(p=>p.classList.toggle('hidden',p.dataset.centralPanel!==b.dataset.centralSection))}));box.scrollIntoView({behavior:'smooth',block:'start'});
}
function decorarLinhasVeiculo(){
  document.querySelectorAll('#listaVeiculos tr').forEach(tr=>{if(tr.dataset.central==='1')return;const placa=String(tr.cells?.[0]?.innerText||'').trim().split(' ')[0],v=veiculos.find(x=>x.placa===placa);if(!v)return;tr.dataset.central='1';const acoes=tr.cells?.[6]?.querySelector('.acoes-tabela');if(acoes){const b=document.createElement('button');b.type='button';b.className='btn-acao';b.textContent='Ficha';b.addEventListener('click',()=>renderFicha(v.id));acoes.prepend(b)}})
}

function configurarCards(){
  const cards=[...document.querySelectorAll('#pagina-frota .fleet-kpi')];for(const card of cards){if(card.dataset.centralBound==='1')continue;card.dataset.centralBound='1';card.classList.add('fleet-kpi-clickable');card.setAttribute('role','button');card.tabIndex=0;const id=card.querySelector('strong')?.id;const acao=()=>acionarCard(id);card.addEventListener('click',acao);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();acao()}})}
}
function clicarTab(nome){document.querySelector(`[data-fleet-tab="${nome}"]`)?.click()}
function filtrarTabela(selector,pred){document.querySelectorAll(selector).forEach(tr=>{tr.style.display=pred(tr)?'':'none'})}
function acionarCard(id){
  if(id==='frotaKpiAtivos'){clicarTab('veiculos');setTimeout(()=>filtrarTabela('#listaVeiculos tr',tr=>/\bativo\b/i.test(tr.innerText)),60)}
  else if(id==='frotaKpiVencidas'){clicarTab('obrigacoes');setTimeout(()=>filtrarTabela('#listaObrigacoes tr',tr=>/vencido/i.test(tr.innerText)),60)}
  else if(id==='frotaKpi30'){clicarTab('visao');$('frotaAlertas')?.scrollIntoView({behavior:'smooth',block:'center'})}
  else if(id==='frotaKpiManut'){clicarTab('manutencoes');setTimeout(()=>filtrarTabela('#listaManutencoes tr',tr=>!/concluída|concluida|cancelada/i.test(tr.innerText)),60)}
  else if(id==='frotaKpiCusto'){clicarTab('visao');document.querySelector('#frotaResumoVeiculos')?.closest('.fleet-card')?.scrollIntoView({behavior:'smooth',block:'start'})}
  else if(id==='frotaKpiSaude'){clicarTab('visao');renderSaudeDetalhada();$('frotaSaude')?.scrollIntoView({behavior:'smooth',block:'center'})}
}

function decorar(){if(!$('pagina-frota')&&!$('pagina-combustivel'))return;garantirCss();decorarMotoristas();ampliarTiposManutencao();garantirIntegracoes();garantirFicha();configurarCards();decorarLinhasVeiculo();renderSaudeDetalhada();if(veiculoSelecionado&&!$('fleetFichaCentral')?.classList.contains('hidden'))renderFicha(veiculoSelecionado)}
function agendar(){clearTimeout(timer);timer=setTimeout(()=>{carregarDados()},100)}
function instalar(){if(observer)return;observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorar,60)});observer.observe(document.body,{childList:true,subtree:true});agendar()}
window.addEventListener('sig:ready',agendar);window.addEventListener('sig:empresa-contexto',agendar);window.addEventListener('sig:data-changed',e=>{if(['frota','rh'].includes(e.detail?.modulo))agendar()});window.addEventListener('sig:page',e=>{if(['frota','combustivel','rh'].includes(e.detail?.pagina))agendar()});
instalar();
