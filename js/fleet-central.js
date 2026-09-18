import { $, esc, listarDocumentos, empresaUnicaSelecionadaId, dataBr, moeda } from './shared.js';
import { colaboradoresPorFuncao } from './hr-role-registry.js?v=6';
import { periodoAtual } from './company-context.js';

let veiculos=[],manutencoes=[],abastecimentos=[],custosDiesel=[],motoristas=[],busy=false,timer=0,observer=null,veiculoSelecionado='';
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const emp=()=>empresaUnicaSelecionadaId();
const agora=()=>new Date();
const diasDesde=s=>{if(!s)return null;const d=new Date(`${String(s).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?null:Math.floor((agora()-d)/86400000)};
const diasAte=s=>{if(!s)return null;const d=new Date(`${s}T12:00:00`);return Number.isNaN(d.getTime())?null:Math.ceil((d-agora())/86400000)};
const em12m=s=>{const d=diasDesde(s);return d!=null&&d>=0&&d<=366};
const periodoInfo=()=>{const p=periodoAtual(),meses=new Set(p.indices.map(i=>String(i+1).padStart(2,'0')));return{...p,meses}};
const emPeriodo=s=>{if(!s)return false;const p=periodoInfo(),str=String(s);return str.slice(0,4)===String(p.ano)&&p.meses.has(str.slice(5,7))};
const obr=v=>Array.isArray(v?.obrigacoes)?v.obrigacoes:[];
const movCons=id=>{
  const v=veiculos.find(x=>x.id===id),placa=String(v?.placa||'').toUpperCase().replace(/[^A-Z0-9]/g,''),operacionais=veiculos.filter(x=>x.empresaId===v?.empresaId&&x.status!=='baixado');
  return abastecimentos.filter(x=>{
    if(x.status==='estornado'||x.tipo==='recebimento'||num(x.quantidade)<=0||x.empresaId!==v?.empresaId)return false;
    const xp=String(x.placa||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(x.veiculoId===id)return true;
    if(placa&&xp===placa)return true;
    const semVinculo=!String(x.veiculoId||'').trim()&&!xp;
    return semVinculo&&operacionais.length===1&&operacionais[0].id===id
  })
};
const kml=x=>x.kmAtual!=null&&x.kmAnterior!=null&&num(x.kmAtual)>num(x.kmAnterior)?(num(x.kmAtual)-num(x.kmAnterior))/num(x.quantidade):null;
const media=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const classificacao=s=>s>=90?'Excelente':s>=75?'Saudável':s>=60?'Atenção':s>=40?'Crítico':'Urgente';

function css(){if(document.querySelector('link[href^="fleet-central.css"]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='fleet-central.css?v=1';document.head.appendChild(l)}
async function lerSeguro(c){try{return await listarDocumentos(c)}catch(e){console.warn(`Frota: ${c} indisponível`,e);return[]}}
async function carregar(){if(busy||!emp())return;busy=true;try{const [v,m,a,c,mo]=await Promise.all([lerSeguro('veiculos'),lerSeguro('manutencoesFrota'),lerSeguro('abastecimentosFrota'),lerSeguro('custosDiesel'),colaboradoresPorFuncao('MOTORISTA').catch(()=>[])]);veiculos=v.filter(x=>x.empresaId===emp());manutencoes=m.filter(x=>x.empresaId===emp());abastecimentos=a.filter(x=>x.empresaId===emp());custosDiesel=c.filter(x=>x.empresaId===emp());motoristas=mo.filter(x=>x.empresaId===emp());decorar();renderSaude();if(veiculoSelecionado&&!$('fleetFichaCentral')?.classList.contains('hidden'))renderFicha(veiculoSelecionado)}finally{busy=false}}

function selectMotorista(input,placeholder){
  if(!input)return;
  const valor=String(input.value||'').trim(),eraSelect=input.tagName==='SELECT';
  let s=input;
  if(!eraSelect){
    s=document.createElement('select');
    [...input.attributes].forEach(a=>{if(!['type','placeholder','value'].includes(a.name))s.setAttribute(a.name,a.value)});
    s.id=input.id;s.required=input.required;input.replaceWith(s);
  }
  s.innerHTML=`<option value="">${placeholder}</option>`+motoristas.map(p=>`<option value="${esc(p.nome)}">${esc(p.nome)} · ${esc(p.cargoNome||'MOTORISTA')}</option>`).join('');
  if(valor&&![...s.options].some(o=>o.value===valor))s.add(new Option(`${valor} · vínculo anterior`,valor));
  s.value=valor;
}
function decorarFormularios(){selectMotorista($('veiculoResponsavel'),'Selecione o motorista...');selectMotorista($('fuelMotorista'),'Selecione o motorista...');selectMotorista($('obrigCondutor'),'Sem condutor vinculado');$('veiculoCentro')?.closest('.campo')?.remove();const t=$('manutTipo');if(t){[['pecas','Peças / componentes'],['servicos','Serviços / mão de obra']].forEach(([v,n])=>{if(![...t.options].some(o=>o.value===v))t.add(new Option(n,v))})}}

function vencida(o){return !['pago','cancelado','em_recurso'].includes(o.status)&&o.vencimento&&(diasAte(o.vencimento)??0)<0}
function manutVencida(m,v){if(['concluida','cancelada'].includes(m.status))return false;const d=diasAte(m.dataPrevista),km=num(m.kmPrevisto)-num(v.quilometragemAtual);return (d!=null&&d<0)||(num(m.kmPrevisto)>0&&km<=0)}
function manutProxima(m,v){if(['concluida','cancelada'].includes(m.status))return false;const d=diasAte(m.dataPrevista),km=num(m.kmPrevisto)-num(v.quilometragemAtual);return (d!=null&&d>=0&&d<=30)||(num(m.kmPrevisto)>0&&km>0&&km<=1000)}
function precoLitro(filtro=em12m){const compras=custosDiesel.filter(x=>x.status!=='estornado'&&filtro(x.data)),custo=compras.reduce((s,x)=>s+num(x.valorTotal??x.valor),0),litros=compras.reduce((s,x)=>s+num(x.quantidade),0);return litros?custo/litros:0}
function custoComFiltro(v,filtro){const ms=manutencoes.filter(x=>x.veiculoId===v.id&&x.status==='concluida'&&filtro(x.dataRealizada||x.dataPrevista)).reduce((s,x)=>s+num(x.custoReal),0),docs=obr(v).filter(x=>x.status==='pago'&&filtro(x.dataPagamento||x.vencimento)).reduce((s,x)=>s+num(x.valor),0),mov=movCons(v.id).filter(x=>filtro(x.data)),litros=mov.reduce((s,x)=>s+num(x.quantidade),0),km=mov.reduce((s,x)=>s+(x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0),0),fuel=litros*precoLitro(filtro),total=ms+docs+fuel;return{manutencao:ms,documentacao:docs,combustivel:fuel,total,litros,km,kml:litros&&km?km/litros:null,custoKm:km?total/km:null}}
function custo(v){return custoComFiltro(v,em12m)}
function custoPeriodo(v){return custoComFiltro(v,emPeriodo)}
function medianaCustoKm(){const a=veiculos.filter(v=>v.status==='ativo').map(custo).map(x=>x.custoKm).filter(x=>x&&Number.isFinite(x)).sort((a,b)=>a-b);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function criterios(v){const out=[];const os=obr(v),consultado=!!v.ultimaConsultaOficialEm;if(os.length||consultado){const ven=os.filter(vencida).length,prox=os.filter(o=>{const d=diasAte(o.vencimento);return !['pago','cancelado'].includes(o.status)&&d!=null&&d>=0&&d<=30}).length;out.push({nome:'Documentação e regularidade',peso:25,pontos:Math.max(0,25-ven*8-prox*3),texto:ven?`${ven} obrigação(ões) vencida(s)`:prox?`${prox} obrigação(ões) vencendo em até 30 dias`:'Sem pendências conhecidas'})}const ms=manutencoes.filter(x=>x.veiculoId===v.id);if(ms.length){const ven=ms.filter(x=>manutVencida(x,v)).length,prox=ms.filter(x=>manutProxima(x,v)).length;out.push({nome:'Manutenção',peso:30,pontos:Math.max(0,30-ven*15-prox*5),texto:ven?`${ven} manutenção(ões) vencida(s)`:prox?`${prox} manutenção(ões) próxima(s)`:'Plano sem atraso conhecido'})}const vals=movCons(v.id).map(x=>({data:x.data,k:kml(x)})).filter(x=>x.k&&x.k>0).sort((a,b)=>String(a.data).localeCompare(String(b.data)));if(vals.length>=3){const rec=media(vals.slice(-3).map(x=>x.k)),ant=vals.slice(-6,-3),base=ant.length?media(ant.map(x=>x.k)):media(vals.map(x=>x.k)),queda=base?(base-rec)/base:0;let p=20;if(queda>.30)p=5;else if(queda>.20)p=10;else if(queda>.10)p=15;out.push({nome:'Consumo',peso:20,pontos:p,texto:`${rec.toFixed(2)} km/l${queda>.10?` · queda de ${(queda*100).toFixed(0)}% versus histórico`:' · estável versus histórico'}`})}const cv=custo(v),med=medianaCustoKm();if(cv.custoKm&&med){const r=cv.custoKm/med;let p=15;if(r>1.75)p=4;else if(r>1.40)p=8;else if(r>1.15)p=12;out.push({nome:'Custo operacional',peso:15,pontos:p,texto:`${moeda(cv.custoKm)}/km · ${r>1.15?`${((r-1)*100).toFixed(0)}% acima da mediana`:'dentro da faixa da frota'}`})}if(num(v.quilometragemAtual)>0){const datas=movCons(v.id).map(x=>x.data).concat(ms.map(x=>x.dataRealizada||x.dataPrevista)).filter(Boolean).sort();if(datas.length){const d=diasDesde(datas.at(-1));let p=10;if(d>180)p=1;else if(d>90)p=4;else if(d>45)p=7;out.push({nome:'Utilização / KM',peso:10,pontos:p,texto:`Última evidência de KM há ${d} dia(s)`})}}return out}
function saude(v){const c=criterios(v),peso=c.reduce((s,x)=>s+x.peso,0),pts=c.reduce((s,x)=>s+x.pontos,0),score=peso?Math.round(pts/peso*100):null;return{v,c,score,cobertura:c.length,classe:score==null?'Dados insuficientes':classificacao(score)}}
function renderSaude(){const alvo=$('frotaSaude');if(!alvo)return;const itens=veiculos.filter(v=>v.status==='ativo').map(saude),validos=itens.filter(x=>x.score!=null),score=validos.length?Math.round(media(validos.map(x=>x.score))):null,falt=['Documentação e regularidade','Manutenção','Consumo','Custo operacional','Utilização / KM'];const html=`<div class="fleet-central-health"><div class="fleet-central-score"><strong>${score==null?'—':score}</strong><span>${score==null?'Dados insuficientes':classificacao(score)}</span><small>${score==null?'Ainda não há base suficiente para uma nota.':'Critérios sem dados são excluídos do cálculo e não penalizam a nota.'}</small></div><div class="fleet-health-method"><strong>Composição</strong><span>Documentação 25 · Manutenção 30 · Consumo 20 · Custo 15 · Utilização 10</span></div>${itens.sort((a,b)=>(a.score??999)-(b.score??999)).map(x=>`<details class="fleet-health-vehicle"><summary><span>${esc(x.v.placa||'—')} · ${esc(x.v.modelo||x.v.marca||'Veículo')}</span><strong>${x.score==null?'Dados insuficientes':`${x.score}/100 · ${esc(x.classe)}`}</strong></summary><div class="fleet-health-breakdown">${x.c.map(c=>`<div><span>${esc(c.nome)} <small>${c.pontos}/${c.peso}</small></span><p>${esc(c.texto)}</p></div>`).join('')}${falt.filter(n=>!x.c.some(c=>c.nome===n)).map(n=>`<div class="missing"><span>${esc(n)} <small>sem nota</small></span><p>Dados insuficientes; este critério não reduz a nota.</p></div>`).join('')}</div><small>Nota baseada em ${x.cobertura} de 5 critérios.</small></details>`).join('')||'<div class="fleet-empty">Nenhum veículo ativo.</div>'}</div>`;if(alvo.innerHTML!==html)alvo.innerHTML=html;const k=$('frotaKpiSaude');if(k)k.textContent=score==null?'—':`${score}/100`;const sm=k?.closest('.fleet-kpi')?.querySelector('small');if(sm)sm.textContent=score==null?'dados insuficientes':classificacao(score)}

function garantirIntegracoes(){const p=document.querySelector('[data-fleet-panel="visao"]');if(!p||$('fleetIntegracoesOficiais'))return;const s=document.createElement('section');s.id='fleetIntegracoesOficiais';s.className='fleet-card';s.innerHTML='<div class="fleet-toolbar"><div><h3>Integrações oficiais</h3><p>Fontes definidas para automação segura.</p></div></div><div class="fleet-integration-grid"><div><strong>SENATRAN / SERPRO</strong><span>Multas, infrações e penalidades</span><small>Aguardando backend e credenciais. Consulta manual permanece como contingência.</small></div><div><strong>Detran-ES</strong><span>IPVA e licenciamento</span><small>Aguardando backend e credenciais. Consulta manual permanece como contingência.</small></div></div>';p.appendChild(s)}
function garantirFicha(){const p=document.querySelector('[data-fleet-panel="visao"]');if(!p||$('fleetFichaCentral'))return;const s=document.createElement('section');s.id='fleetFichaCentral';s.className='fleet-card hidden';const alvo=p.querySelector('.fleet-card:last-child');if(alvo)alvo.before(s);else p.appendChild(s)}
function renderFicha(id){
  garantirFicha();
  const v=veiculos.find(x=>x.id===id),b=$('fleetFichaCentral');
  if(!v||!b)return;
  veiculoSelecionado=id;

  const p=periodoInfo(),c12=custo(v),cp=custoPeriodo(v),sv=saude(v);
  const fuelPeriodo=movCons(id).filter(x=>emPeriodo(x.data)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const fuel12=movCons(id).filter(x=>em12m(x.data)).sort((a,b)=>String(b.data).localeCompare(String(a.data)));
  const manutPeriodo=manutencoes.filter(x=>x.veiculoId===id&&x.status==='concluida'&&emPeriodo(x.dataRealizada||x.dataPrevista)).sort((a,b)=>String(b.dataRealizada||b.dataPrevista).localeCompare(String(a.dataRealizada||a.dataPrevista)));
  const manutTodas=manutencoes.filter(x=>x.veiculoId===id).sort((a,b)=>String(b.dataRealizada||b.dataPrevista).localeCompare(String(a.dataRealizada||a.dataPrevista)));
  const obrigTodas=[...obr(v)].sort((a,b)=>String(b.dataPagamento||b.vencimento).localeCompare(String(a.dataPagamento||a.vencimento)));
  const obrigPeriodo=obrigTodas.filter(x=>emPeriodo(x.dataPagamento||x.vencimento));
  const impostos=obrigPeriodo.filter(x=>['ipva','licenciamento','seguro'].includes(String(x.tipo||'').toLowerCase()));
  const multas=obrigPeriodo.filter(x=>String(x.tipo||'').toLowerCase()==='multa');

  const kmPeriodo=fuelPeriodo.reduce((s,x)=>s+(x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0),0);
  const litrosPeriodo=fuelPeriodo.reduce((s,x)=>s+num(x.quantidade),0);
  const consumoPeriodo=litrosPeriodo&&kmPeriodo?kmPeriodo/litrosPeriodo:null;
  const custoCombPeriodo=litrosPeriodo*precoLitro(emPeriodo);
  const custoManutPeriodo=manutPeriodo.reduce((s,x)=>s+num(x.custoReal),0);
  const custoImpostos=impostos.reduce((s,x)=>s+num(x.valor),0);
  const custoMultas=multas.reduce((s,x)=>s+num(x.valor),0);

  const motoristasMap=new Map();
  fuelPeriodo.forEach(x=>{
    const nome=String(x.motorista||'Não informado').trim()||'Não informado';
    const z=motoristasMap.get(nome)||{nome,qtd:0,litros:0,km:0,primeiro:x.data,ultimo:x.data};
    z.qtd++;z.litros+=num(x.quantidade);
    if(x.kmAtual!=null&&x.kmAnterior!=null)z.km+=Math.max(0,num(x.kmAtual)-num(x.kmAnterior));
    if(String(x.data)<String(z.primeiro))z.primeiro=x.data;
    if(String(x.data)>String(z.ultimo))z.ultimo=x.data;
    motoristasMap.set(nome,z)
  });
  const motoristasPeriodo=[...motoristasMap.values()].sort((a,b)=>b.qtd-a.qtd);

  const timeline=[
    ...fuelPeriodo.map(x=>({data:x.data,tipo:'Abastecimento',descricao:`${fmtLitros(x.quantidade)} L · ${x.motorista||'motorista não informado'} · KM ${x.kmAtual??'—'}`,valor:num(x.quantidade)*precoLitro(emPeriodo)})),
    ...manutPeriodo.map(x=>({data:x.dataRealizada||x.dataPrevista,tipo:'Manutenção',descricao:x.descricao||x.tipo||'Manutenção',valor:num(x.custoReal)})),
    ...obrigPeriodo.map(x=>({data:x.dataPagamento||x.vencimento,tipo:String(x.tipo||'Obrigação'),descricao:x.exercicio||x.auto||x.descricao||'Obrigação',valor:num(x.valor)}))
  ].filter(x=>x.data).sort((a,b)=>String(b.data).localeCompare(String(a.data)));

  b.innerHTML=`
  <div class="fleet-toolbar">
    <div>
      <h3>${esc(v.placa||'—')} · ${esc(v.marca||'')} ${esc(v.modelo||'')}</h3>
      <p>Detalhamento técnico · ${esc(p.label)} ${p.ano}</p>
    </div>
    <button id="fleetFecharFicha" class="btn-secundario" type="button">Fechar</button>
  </div>

  <div class="fleet-central-tabs">
    <button class="ativo" data-fsec="ficha">Ficha técnica</button>
    <button data-fsec="motorista">Motorista no período</button>
    <button data-fsec="manutencao">Manutenções realizadas</button>
    <button data-fsec="combustivel">Abastecimento & consumo</button>
    <button data-fsec="tributos">Impostos & multas</button>
    <button data-fsec="historico">Histórico geral</button>
  </div>

  <div data-fpanel="ficha">
    <div class="fleet-central-kpis">
      <div><span>Status</span><strong>${esc(v.status||'—')}</strong><small>situação operacional</small></div>
      <div><span>KM atual</span><strong>${num(v.quilometragemAtual).toLocaleString('pt-BR')} km</strong><small>KM inicial: ${num(v.quilometragemInicial??v.quilometragemAtual).toLocaleString('pt-BR')} km</small></div>
      <div><span>Motorista principal</span><strong>${esc(v.responsavel||'—')}</strong><small>cadastro atual do veículo</small></div>
      <div><span>Custo do período</span><strong>${moeda(cp.total)}</strong><small>combustível + manutenção + obrigações</small></div>
      <div><span>Custo 12 meses</span><strong>${moeda(c12.total)}</strong><small>visão acumulada</small></div>
      <div><span>Consumo do período</span><strong>${consumoPeriodo?`${consumoPeriodo.toFixed(2)} km/l`:'—'}</strong><small>${fmtLitros(litrosPeriodo)} L · ${kmPeriodo.toLocaleString('pt-BR')} km</small></div>
      <div><span>RENAVAM</span><strong>${esc(v.renavam||'—')}</strong><small>ano/modelo ${esc(v.anoModelo||'—')}</small></div>
      <div><span>Saúde da frota</span><strong>${sv.score==null?'—':`${sv.score}/100`}</strong><small>${esc(sv.classe)}</small></div>
    </div>
    <div class="fleet-tech-grid">
      <div><span>Data de aquisição</span><strong>${v.dataAquisicao?dataBr(v.dataAquisicao):'—'}</strong></div>
      <div><span>Valor de aquisição</span><strong>${moeda(num(v.valorAquisicao))}</strong></div>
      <div><span>Disponível para uso</span><strong>${v.dataDisponivelUso?dataBr(v.dataDisponivelUso):'—'}</strong></div>
      <div><span>Vida útil</span><strong>${num(v.vidaUtilMeses)||'—'} meses</strong></div>
      <div><span>Imobilizado</span><strong>${v.imobilizadoId?'Vinculado':'Pendente'}</strong></div>
      <div><span>Observações</span><strong>${esc(v.observacoes||'—')}</strong></div>
    </div>
  </div>

  <div data-fpanel="motorista" class="hidden">
    <div class="fleet-central-kpis">
      <div><span>Motoristas no período</span><strong>${motoristasPeriodo.length}</strong><small>${esc(p.label)} ${p.ano}</small></div>
      <div><span>Abastecimentos</span><strong>${fuelPeriodo.length}</strong><small>lançamentos associados ao veículo</small></div>
      <div><span>Litros</span><strong>${fmtLitros(litrosPeriodo)} L</strong><small>total abastecido</small></div>
      <div><span>KM rodados</span><strong>${kmPeriodo.toLocaleString('pt-BR')} km</strong><small>pela sequência de abastecimentos</small></div>
    </div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Motorista</th><th>1º registro</th><th>Último registro</th><th>Abastecimentos</th><th>Litros</th><th>KM</th></tr></thead><tbody>${motoristasPeriodo.map(x=>`<tr><td>${esc(x.nome)}</td><td>${dataBr(x.primeiro)}</td><td>${dataBr(x.ultimo)}</td><td>${x.qtd}</td><td>${fmtLitros(x.litros)} L</td><td>${x.km.toLocaleString('pt-BR')} km</td></tr>`).join('')||'<tr><td colspan="6">Sem motorista identificado nos abastecimentos do período.</td></tr>'}</tbody></table></div>
  </div>

  <div data-fpanel="manutencao" class="hidden">
    <div class="fleet-central-kpis">
      <div><span>Realizadas no período</span><strong>${manutPeriodo.length}</strong><small>status concluída</small></div>
      <div><span>Custo realizado</span><strong>${moeda(custoManutPeriodo)}</strong><small>${esc(p.label)} ${p.ano}</small></div>
      <div><span>Histórico total</span><strong>${manutTodas.length}</strong><small>todos os registros do veículo</small></div>
    </div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Tipo</th><th>Serviço</th><th>Oficina</th><th>KM</th><th>Custo</th><th>Próxima revisão</th></tr></thead><tbody>${manutPeriodo.map(x=>`<tr><td>${dataBr(x.dataRealizada||x.dataPrevista)}</td><td>${esc(x.tipo||'—')}</td><td>${esc(x.descricao||'—')}</td><td>${esc(x.oficina||'—')}</td><td>${num(x.kmRealizado).toLocaleString('pt-BR')||'—'}</td><td>${moeda(num(x.custoReal))}</td><td>${x.proximaRevisao?dataBr(x.proximaRevisao):x.proximoKm?num(x.proximoKm).toLocaleString('pt-BR')+' km':'—'}</td></tr>`).join('')||'<tr><td colspan="7">Nenhuma manutenção concluída no período selecionado.</td></tr>'}</tbody></table></div>
  </div>

  <div data-fpanel="combustivel" class="hidden">
    <div class="fleet-central-kpis">
      <div><span>Abastecido no período</span><strong>${fmtLitros(litrosPeriodo)} L</strong><small>${fuelPeriodo.length} lançamento(s)</small></div>
      <div><span>KM rodados</span><strong>${kmPeriodo.toLocaleString('pt-BR')} km</strong><small>diferença entre hodômetros</small></div>
      <div><span>Consumo médio</span><strong>${consumoPeriodo?`${consumoPeriodo.toFixed(2)} km/l`:'—'}</strong><small>KM ÷ litros</small></div>
      <div><span>Custo combustível</span><strong>${moeda(custoCombPeriodo)}</strong><small>preço médio das compras do período</small></div>
    </div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Motorista</th><th>Litros</th><th>KM anterior</th><th>KM atual</th><th>KM rodado</th><th>KM/L</th></tr></thead><tbody>${fuelPeriodo.map(x=>{const km=x.kmAtual!=null&&x.kmAnterior!=null?Math.max(0,num(x.kmAtual)-num(x.kmAnterior)):0;return`<tr><td>${dataBr(x.data)}</td><td>${esc(x.motorista||'—')}</td><td>${fmtLitros(x.quantidade)} L</td><td>${x.kmAnterior!=null?num(x.kmAnterior).toLocaleString('pt-BR'):'—'}</td><td>${x.kmAtual!=null?num(x.kmAtual).toLocaleString('pt-BR'):'—'}</td><td>${km?km.toLocaleString('pt-BR')+' km':'—'}</td><td>${kml(x)?.toFixed(2)||'—'}</td></tr>`}).join('')||'<tr><td colspan="7">Sem abastecimentos no período selecionado.</td></tr>'}</tbody></table></div>
  </div>

  <div data-fpanel="tributos" class="hidden">
    <div class="fleet-central-kpis">
      <div><span>Impostos / documentos</span><strong>${moeda(custoImpostos)}</strong><small>${impostos.length} registro(s) no período</small></div>
      <div><span>Multas</span><strong>${moeda(custoMultas)}</strong><small>${multas.length} infração(ões) no período</small></div>
      <div><span>Obrigações do período</span><strong>${moeda(obrigPeriodo.reduce((s,x)=>s+num(x.valor),0))}</strong><small>inclui todos os tipos cadastrados</small></div>
    </div>
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Tipo</th><th>Referência</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Órgão / condutor</th><th>Valor</th></tr></thead><tbody>${obrigPeriodo.map(x=>`<tr><td>${esc(x.tipo||'—')}</td><td>${esc(x.exercicio||x.auto||x.descricao||'—')}</td><td>${dataBr(x.vencimento)}</td><td>${x.dataPagamento?dataBr(x.dataPagamento):'—'}</td><td>${vencida(x)?'Vencido':esc(x.status||'aberto')}</td><td>${esc([x.orgao,x.condutor].filter(Boolean).join(' · ')||'—')}</td><td>${moeda(num(x.valor))}</td></tr>`).join('')||'<tr><td colspan="7">Sem impostos, multas ou obrigações no período selecionado.</td></tr>'}</tbody></table></div>
  </div>

  <div data-fpanel="historico" class="hidden">
    <div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Evento</th><th>Descrição</th><th>Valor / custo</th></tr></thead><tbody>${timeline.map(x=>`<tr><td>${dataBr(x.data)}</td><td>${esc(x.tipo)}</td><td>${esc(x.descricao)}</td><td>${moeda(x.valor)}</td></tr>`).join('')||'<tr><td colspan="4">Sem eventos no período selecionado.</td></tr>'}</tbody></table></div>
  </div>`;

  b.classList.remove('hidden');
  $('fleetFecharFicha').onclick=()=>{b.classList.add('hidden');veiculoSelecionado=''};
  b.querySelectorAll('[data-fsec]').forEach(bt=>bt.onclick=()=>{
    b.querySelectorAll('[data-fsec]').forEach(x=>x.classList.toggle('ativo',x===bt));
    b.querySelectorAll('[data-fpanel]').forEach(x=>x.classList.toggle('hidden',x.dataset.fpanel!==bt.dataset.fsec))
  });
  b.scrollIntoView({behavior:'smooth',block:'start'})
}
function fmtLitros(v){return num(v).toLocaleString('pt-BR',{maximumFractionDigits:2})}
function decorarLinhas(){document.querySelectorAll('#listaVeiculos tr').forEach(tr=>{if(tr.dataset.ficha==='1')return;const placa=String(tr.cells?.[0]?.innerText||'').trim().split(' ')[0],v=veiculos.find(x=>x.placa===placa);if(!v)return;tr.dataset.ficha='1';const ac=tr.cells?.[6]?.querySelector('.acoes-tabela');if(ac){const b=document.createElement('button');b.className='btn-acao';b.type='button';b.textContent='Ficha';b.onclick=()=>{document.querySelector('[data-fleet-tab="visao"]')?.click();setTimeout(()=>renderFicha(v.id),40)};ac.prepend(b)}});decorarResumoLinhas()}
function decorarResumoLinhas(){const tb=$('frotaResumoVeiculos'),table=tb?.closest('table');if(!tb||!table)return;const p=periodoInfo();tb.querySelectorAll('tr').forEach(tr=>{const id=tr.dataset.veiculoId||'',placa=String(tr.cells?.[0]?.innerText||'').trim().split(' ')[0],v=veiculos.find(x=>x.id===id)||veiculos.find(x=>x.placa===placa);if(!v)return;const c12=custo(v),cp=custoPeriodo(v);if(tr.cells[5])tr.cells[5].textContent=moeda(c12.total);if(tr.cells[6])tr.cells[6].innerHTML=`<strong>${moeda(cp.total)}</strong><br><small>${esc(p.label)} ${p.ano}</small>`;tr.style.cursor='pointer';tr.tabIndex=0;tr.setAttribute('role','button');tr.title='Abrir detalhamento técnico do veículo';const abrir=e=>{if(e?.target?.closest?.('button,a,input,select'))return;renderFicha(v.id)};tr.onclick=abrir;tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();renderFicha(v.id)}}})}

function filtrar(sel,pred){document.querySelectorAll(sel).forEach(tr=>{tr.style.display=pred(tr)?'':'none'})}
function cardAcao(id){if(id==='frotaKpiAtivos'){document.querySelector('[data-fleet-tab="veiculos"]')?.click();setTimeout(()=>filtrar('#listaVeiculos tr',tr=>/\bativo\b/i.test(tr.innerText)),60)}else if(id==='frotaKpiVencidas'){document.querySelector('[data-fleet-tab="obrigacoes"]')?.click();setTimeout(()=>filtrar('#listaObrigacoes tr',tr=>/vencido/i.test(tr.innerText)),60)}else if(id==='frotaKpi30'){document.querySelector('[data-fleet-tab="visao"]')?.click();$('frotaAlertas')?.scrollIntoView({behavior:'smooth',block:'center'})}else if(id==='frotaKpiManut'){document.querySelector('[data-fleet-tab="manutencoes"]')?.click();setTimeout(()=>filtrar('#listaManutencoes tr',tr=>!/concluída|concluida|cancelada/i.test(tr.innerText)),60)}else if(id==='frotaKpiCusto'){document.querySelector('[data-fleet-tab="visao"]')?.click();$('frotaResumoVeiculos')?.closest('.fleet-card')?.scrollIntoView({behavior:'smooth',block:'start'})}else if(id==='frotaKpiSaude'){document.querySelector('[data-fleet-tab="visao"]')?.click();renderSaude();$('frotaSaude')?.scrollIntoView({behavior:'smooth',block:'center'})}}
function cards(){document.querySelectorAll('#pagina-frota .fleet-kpi').forEach(c=>{if(c.dataset.click==='1')return;c.dataset.click='1';c.classList.add('fleet-kpi-clickable');c.tabIndex=0;c.setAttribute('role','button');const id=c.querySelector('strong')?.id,go=()=>cardAcao(id);c.addEventListener('click',go);c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})})}
function decorar(){css();decorarFormularios();garantirIntegracoes();garantirFicha();cards();decorarLinhas();decorarResumoLinhas()}
function agenda(){clearTimeout(timer);timer=setTimeout(carregar,100)}
function instalar(){if(observer)return;observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{decorarFormularios();cards();decorarLinhas()},60)});observer.observe(document.body,{childList:true,subtree:true});agenda()}
window.addEventListener('sig:ready',agenda);window.addEventListener('sig:fleet-summary-rendered',()=>setTimeout(decorarResumoLinhas,0));window.addEventListener('sig:empresa-contexto',agenda);window.addEventListener('sig:periodo-changed',()=>{decorarResumoLinhas();if(veiculoSelecionado&&!$('fleetFichaCentral')?.classList.contains('hidden'))renderFicha(veiculoSelecionado)});window.addEventListener('sig:data-changed',e=>{if(['frota','combustivel','rh'].includes(e.detail?.modulo))agenda()});window.addEventListener('sig:page',e=>{if(['frota','combustivel'].includes(e.detail?.pagina))agenda()});
instalar();
