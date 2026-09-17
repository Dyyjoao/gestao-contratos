import { abrirPagina, admin } from './core.js';
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, emitirAlteracao } from './shared.js';
import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from './admin-actions.js';
import { periodoAtual } from './company-context.js';
import { fimMes } from './hr-metrics.js';

const MOD={
  avaliacoes:{titulo:'Avaliações/feedback',colecao:'rhAvaliacoes360',perfil:'rhAvaliacoes360'},
  acoes:{titulo:'Ações de RH',colecao:'rhAcoes',perfil:'rhAcoes'}
};
const COMP=['Colaboração','Entrega','Comunicação','Iniciativa','Liderança'];
const TIPOS=['ENDOMARKETING','MELHORIA','TREINAMENTO'];
const PAPEIS=['AUTOAVALIAÇÃO','LIDERANÇA','PAR','LIDERADO'];
const ABAS_AV=['avaliacoes','feedbacks','pdis','calibracao','historico'];
let registros={avaliacoes:[],acoes:[]},pessoas=[],abaAv='avaliacoes',editId='',busy=false;

const perm=(k,a)=>admin()||permite(MOD[k].perfil,a);
const podeVer=k=>['visualizar','lancar','editar'].some(a=>perm(k,a));
const acesso=()=>admin()||permite('rhColaboradores','visualizar')||permite('rhColaboradores','lancar')||permite('rhColaboradores','editar');
const hoje=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const pessoa=id=>pessoas.find(p=>p.id===id)?.nome||'Colaborador indisponível';
const colaborador=id=>pessoas.find(p=>p.id===id);
const mediaNotas=x=>Array.isArray(x?.notas)&&x.notas.length?x.notas.reduce((a,b)=>a+Number(b||0),0)/x.notas.length:0;
const potencialNotas=x=>Array.isArray(x?.notas)&&x.notas.length>=5?(Number(x.notas[3]||0)+Number(x.notas[4]||0))/2:mediaNotas(x);
const dataBR=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'—';
const prefixo=(tipo,ciclo)=>`[${tipo}:${ciclo}]`;
const cicloAcao=x=>{const m=String(x?.titulo||'').match(/^\[(FEEDBACK|PDI):(\d{4}-\d{2})\]\s*/);return m?.[2]||x?.competencia||''};
const tipoDesenvolvimento=x=>{const m=String(x?.titulo||'').match(/^\[(FEEDBACK|PDI):/);return m?.[1]||''};
const tituloLimpo=x=>String(x?.titulo||'').replace(/^\[(FEEDBACK|PDI):\d{4}-\d{2}\]\s*/, '');

const contextoPeriodo=()=>{const p=periodoAtual(),meses=p.indices.map(i=>`${p.ano}-${String(i+1).padStart(2,'0')}`);return{...p,inicio:meses[0],fim:meses.at(-1)}};
function intervaloAval(){
  const p=contextoPeriodo(),min=`${p.inicio}-01`,max=fimMes(p.fim);
  const dataInicio=$('rhCultDataInicio')?.value||min,dataFim=$('rhCultDataFim')?.value||max;
  return {...p,min,max,dataInicio,dataFim,valido:/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)&&/^\d{4}-\d{2}-\d{2}$/.test(dataFim)&&dataInicio>=min&&dataFim<=max&&dataInicio<=dataFim};
}
function sincronizarPeriodoAval(){
  if(!$('rhCultDataInicio'))return;
  const p=contextoPeriodo(),min=`${p.inicio}-01`,max=fimMes(p.fim);
  $('rhCultDataInicio').min=min;$('rhCultDataInicio').max=max;$('rhCultDataFim').min=min;$('rhCultDataFim').max=max;
  $('rhCultDataInicio').value=min;$('rhCultDataFim').value=max;renderAvaliacoes();
}
function dentroPeriodoAvaliacao(x,p){const mes=String(x.ciclo||'');return mes>=p.dataInicio.slice(0,7)&&mes<=p.dataFim.slice(0,7)}
function dentroPeriodoAcao(x,p){const d=String(x.prazo||`${x.competencia||''}-01`);return d>=p.dataInicio&&d<=p.dataFim}
function filtrosAval(){return{setor:$('rhCultSetor')?.value||'',pessoa:$('rhCultPessoa')?.value||''}}
function pessoaPassa(id,f){const p=colaborador(id);return !!p&&(!f.setor||p.setor===f.setor)&&(!f.pessoa||id===f.pessoa)}
function opcoes(selecionado=''){return '<option value="">Selecione...</option>'+pessoas.filter(x=>x.status!=='estornado').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(p=>`<option value="${esc(p.id)}" ${selecionado===p.id?'selected':''}>${esc(p.nome)} · ${esc(p.codigo)}</option>`).join('')}
function atualizarFiltrosAval(){
  const setorAtual=$('rhCultSetor')?.value||'',pessoaAtual=$('rhCultPessoa')?.value||'';
  const setores=[...new Set(pessoas.filter(p=>p.status!=='estornado').map(p=>p.setor).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if($('rhCultSetor')){$('rhCultSetor').innerHTML='<option value="">Todos os setores</option>'+setores.map(s=>`<option>${esc(s)}</option>`).join('');$('rhCultSetor').value=setores.includes(setorAtual)?setorAtual:''}
  const setor=$('rhCultSetor')?.value||'';
  const lista=pessoas.filter(p=>p.status!=='estornado'&&(!setor||p.setor===setor)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  if($('rhCultPessoa')){$('rhCultPessoa').innerHTML='<option value="">Todos</option>'+lista.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.codigo)}</option>`).join('');$('rhCultPessoa').value=lista.some(p=>p.id===pessoaAtual)?pessoaAtual:''}
}

function montar(){
  const main=document.querySelector('main.conteudo');if(!main)return;
  if(!$('pagina-rh-avaliacoes')){
    const s=document.createElement('section');s.id='pagina-rh-avaliacoes';s.className='pagina hidden production-page';
    s.innerHTML=`
      <div class="rh-module-head rh-performance-head">
        <div class="pagina-cabecalho production-head">
          <div><span class="eyebrow">RH · DESENVOLVIMENTO</span><h2>Avaliações/feedback</h2><p>Avaliações de desempenho, feedbacks, PDIs e calibração em um histórico único.</p></div>
          <div class="acoes-cabecalho"><button id="rhCultNovo-avaliacoes" type="button" class="btn-primario">+ Nova avaliação</button><button id="rhCultAtualizar-avaliacoes" type="button" class="btn-secundario">Atualizar</button></div>
        </div>
        <div class="fleet-tabs rh-performance-tabs">
          <button class="fleet-tab ativo" data-rh-av-tab="avaliacoes" type="button">Avaliações</button>
          <button class="fleet-tab" data-rh-av-tab="feedbacks" type="button">Feedbacks</button>
          <button class="fleet-tab" data-rh-av-tab="pdis" type="button">PDIs</button>
          <button class="fleet-tab" data-rh-av-tab="calibracao" type="button">Calibração 9-box</button>
          <button class="fleet-tab" data-rh-av-tab="historico" type="button">Histórico</button>
        </div>
      </div>
      <div id="rhCultAviso-avaliacoes" class="modulo-aviso hidden"></div>
      <section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Período de análise</h3><p>Use o calendário dentro do período escolhido no topo do SIG.</p></div><div class="rh-filter-bar"><label class="rh-filter-field" for="rhCultDataInicio">De <input id="rhCultDataInicio" type="date"></label><label class="rh-filter-field" for="rhCultDataFim">Até <input id="rhCultDataFim" type="date"></label><label class="rh-filter-field" for="rhCultSetor">Setor <select id="rhCultSetor"><option value="">Todos os setores</option></select></label><label class="rh-filter-field" for="rhCultPessoa">Colaborador <select id="rhCultPessoa"><option value="">Todos</option></select></label></div></div></section>
      <div id="rhCultResumo-avaliacoes" class="production-kpis"></div>
      <section id="rhCultBox-avaliacoes" class="form-card hidden"><div class="form-card-titulo"><h3 id="rhCultTitulo-avaliacoes">Nova avaliação</h3></div><form id="rhCultForm-avaliacoes"><div class="form-grid form-grid-3" id="rhCultCampos-avaliacoes"></div><div class="form-acoes"><button type="button" class="btn-secundario" id="rhCultCancelar-avaliacoes">Cancelar</button><button type="submit" class="btn-primario">Salvar avaliação</button></div><p id="rhCultMsg-avaliacoes" class="mensagem-form"></p></form></section>
      <section id="rhDevBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="rhDevTitulo">Registrar feedback</h3><p id="rhDevNota">Conectado ao ciclo de desempenho selecionado.</p></div></div><form id="rhDevForm"><div id="rhDevCampos" class="form-grid form-grid-3"></div><div class="form-acoes"><button type="button" class="btn-secundario" id="rhDevCancelar">Cancelar</button><button type="submit" class="btn-primario">Salvar</button></div><p id="rhDevMsg" class="mensagem-form"></p></form></section>
      <section class="lista-card rh-performance-panel"><div class="lista-cabecalho"><div><h3 id="rhCultTituloLista">Avaliações do período</h3><p id="rhCultNotaLista">Ciclo, perspectivas e devolutivas.</p></div><div id="rhCultAcoesLista" class="acoes-cabecalho"></div></div><div id="rhCultConteudo-avaliacoes"></div></section>`;
    main.appendChild(s);
    s.querySelectorAll('[data-rh-av-tab]').forEach(b=>b.addEventListener('click',()=>trocarAbaAval(b.dataset.rhAvTab)));
    for(const id of ['rhCultDataInicio','rhCultDataFim','rhCultPessoa'])$(id).addEventListener('change',renderAvaliacoes);
    $('rhCultSetor').addEventListener('change',()=>{atualizarFiltrosAval();renderAvaliacoes()});
    $('rhCultNovo-avaliacoes').addEventListener('click',()=>abrirAvaliacao());
    $('rhCultAtualizar-avaliacoes').addEventListener('click',()=>carregar('avaliacoes'));
    $('rhCultCancelar-avaliacoes').addEventListener('click',()=>{$('rhCultBox-avaliacoes').classList.add('hidden');editId=''});
    $('rhCultForm-avaliacoes').addEventListener('submit',salvarAvaliacao);
    $('rhDevCancelar').addEventListener('click',()=>{$('rhDevBox').classList.add('hidden');$('rhDevMsg').textContent='' });
    $('rhDevForm').addEventListener('submit',salvarDesenvolvimento);
    sincronizarPeriodoAval();
  }
  if(!$('pagina-rh-acoes')){
    const s=document.createElement('section');s.id='pagina-rh-acoes';s.className='pagina hidden production-page';
    s.innerHTML=`<div class="pagina-cabecalho production-head"><div><span class="eyebrow">RH</span><h2>Ações de RH</h2><p>Endomarketing, melhorias e treinamentos com prazo e participantes para a Minha Mesa.</p></div><div class="acoes-cabecalho"><button id="rhCultNovo-acoes" type="button" class="btn-primario">+ Novo</button><button id="rhCultAtualizar-acoes" type="button" class="btn-secundario">Atualizar</button></div></div><div id="rhCultAviso-acoes" class="modulo-aviso hidden"></div><section class="lista-card"><div class="lista-cabecalho production-toolbar"><h3>Período</h3><input id="rhCultMes-acoes" type="month" aria-label="Mês de análise"></div></section><div id="rhCultResumo-acoes" class="production-kpis"></div><section id="rhCultBox-acoes" class="form-card hidden"><div class="form-card-titulo"><h3 id="rhCultTitulo-acoes">Novo registro</h3></div><form id="rhCultForm-acoes"><div class="form-grid form-grid-3" id="rhCultCampos-acoes"></div><div class="form-acoes"><button type="button" class="btn-secundario" id="rhCultCancelar-acoes">Cancelar</button><button type="submit" class="btn-primario">Salvar</button></div><p id="rhCultMsg-acoes" class="mensagem-form"></p></form></section><section class="lista-card"><div class="lista-cabecalho"><h3>Registros do período</h3></div><div class="tabela-container"><table class="tabela"><thead id="rhCultHead-acoes"></thead><tbody id="rhCultLista-acoes"></tbody></table></div></section>`;
    main.appendChild(s);$('rhCultMes-acoes').value=hoje().slice(0,7);$('rhCultMes-acoes').addEventListener('change',renderAcoes);$('rhCultNovo-acoes').addEventListener('click',()=>abrirAcao());$('rhCultAtualizar-acoes').addEventListener('click',()=>carregar('acoes'));$('rhCultCancelar-acoes').addEventListener('click',()=>{$('rhCultBox-acoes').classList.add('hidden');editId=''});$('rhCultForm-acoes').addEventListener('submit',salvarAcao);
  }
}

function menu(){
  const nav=document.querySelector('.sidebar-menu');if(!nav)return;
  for(const k of Object.keys(MOD)){
    let b=$('menuRh'+(k==='avaliacoes'?'Avaliacoes':'Acoes'));
    if(!b){b=document.createElement('button');b.id='menuRh'+(k==='avaliacoes'?'Avaliacoes':'Acoes');b.className='menu-item hidden';b.dataset.pagina='rh-'+k;b.type='button';nav.appendChild(b);b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(!acesso()||!podeVer(k))return;abrirPagina('rh-'+k);carregar(k)},true)}
    b.textContent=MOD[k].titulo;b.classList.toggle('hidden',!acesso()||!podeVer(k));
  }
  $('rhCultNovo-avaliacoes')?.classList.toggle('hidden',!perm('avaliacoes','lancar'));
  $('rhCultNovo-acoes')?.classList.toggle('hidden',!perm('acoes','lancar'));
}

function camposAvaliacao(x){
  const p=intervaloAval(),ciclo=x?.ciclo||p.dataFim.slice(0,7);
  return `<div class="campo"><label for="cultCiclo">Ciclo (mês)</label><input id="cultCiclo" type="month" required value="${esc(ciclo)}"></div><div class="campo"><label for="cultAvaliado">Avaliado</label><select id="cultAvaliado" required>${opcoes(x?.avaliadoId)}</select></div><div class="campo"><label for="cultAvaliador">Avaliador</label><select id="cultAvaliador" required>${opcoes(x?.avaliadorId)}</select></div><div class="campo"><label for="cultPapel">Perspectiva</label><select id="cultPapel">${PAPEIS.map(v=>`<option ${x?.papel===v?'selected':''}>${v}</option>`).join('')}</select></div>${COMP.map((v,i)=>`<div class="campo"><label for="cultNota${i}">${v} (1 a 5)</label><input id="cultNota${i}" type="number" min="1" max="5" step="1" required value="${x?.notas?.[i]??''}"></div>`).join('')}<div class="campo campo-span-3"><label for="cultComentario">Evidências e devolutiva</label><textarea id="cultComentario" maxlength="1000" rows="3">${esc(x?.comentario||'')}</textarea></div>`;
}
function abrirAvaliacao(x=null){if(!perm('avaliacoes',x?'editar':'lancar'))return;if(!empresaUnicaSelecionadaId())return alert('Selecione uma empresa no cabeçalho.');editId=x?.id||'';$('rhCultCampos-avaliacoes').innerHTML=camposAvaliacao(x);$('rhCultTitulo-avaliacoes').textContent=(x?'Editar':'Nova')+' avaliação de desempenho';msg($('rhCultMsg-avaliacoes'),'');$('rhCultBox-avaliacoes').classList.remove('hidden');$('rhCultBox-avaliacoes').scrollIntoView({behavior:'smooth',block:'start'})}
function lerAvaliacao(){
  const ciclo=$('cultCiclo').value,avaliadoId=$('cultAvaliado').value,avaliadorId=$('cultAvaliador').value,papel=$('cultPapel').value,notas=COMP.map((_,i)=>Number($('cultNota'+i).value)),comentario=$('cultComentario').value.trim();
  if(!/^\d{4}-\d{2}$/.test(ciclo)||!pessoas.some(p=>p.id===avaliadoId&&p.empresaId===empresaUnicaSelecionadaId())||!pessoas.some(p=>p.id===avaliadorId&&p.empresaId===empresaUnicaSelecionadaId())||!PAPEIS.includes(papel)||notas.some(n=>!Number.isInteger(n)||n<1||n>5)||((papel==='AUTOAVALIAÇÃO')!==(avaliadoId===avaliadorId)))throw Error('Revise ciclo, pessoas, perspectiva e notas.');
  if(registros.avaliacoes.some(v=>v.id!==editId&&v.status==='ativo'&&v.ciclo===ciclo&&v.avaliadoId===avaliadoId&&v.avaliadorId===avaliadorId))throw Error('Este avaliador já registrou avaliação para esse colaborador no ciclo.');
  return {ciclo,avaliadoId,avaliadorId,papel,notas,comentario};
}
async function salvarAvaliacao(e){e.preventDefault();if(busy)return;try{const emp=empresaUnicaSelecionadaId(),d=lerAvaliacao();busy=true;msg($('rhCultMsg-avaliacoes'),'Salvando...');if(editId){const x=registros.avaliacoes.find(v=>v.id===editId);if(!x||x.empresaId!==emp||x.status!=='ativo'||!perm('avaliacoes','editar'))throw Error('Edição não autorizada.');await atualizarDocumento(MOD.avaliacoes.colecao,editId,d)}else{if(!perm('avaliacoes','lancar'))throw Error('Sem permissão.');await criarDocumento(MOD.avaliacoes.colecao,{...d,empresaId:emp,status:'ativo',registradoPor:state.usuario.id,origem:'sig'})}$('rhCultBox-avaliacoes').classList.add('hidden');editId='';emitirAlteracao('rh');await carregar('avaliacoes')}catch(err){console.error(err);msg($('rhCultMsg-avaliacoes'),err.message||'Não foi possível salvar.')}finally{busy=false}}

function abrirDesenvolvimento(tipo,avaliadoId='',ciclo='',sugestao=''){
  if(!perm('acoes','lancar'))return alert('Seu perfil precisa de permissão para registrar Ações de RH.');
  if(!empresaUnicaSelecionadaId())return alert('Selecione uma empresa no cabeçalho.');
  const isPdi=tipo==='PDI',cicloPadrao=ciclo||intervaloAval().dataFim.slice(0,7),data=hoje(),prazo=isPdi?data:data;
  $('rhDevTitulo').textContent=isPdi?'Criar PDI':'Registrar feedback';
  $('rhDevNota').textContent=`Conectado ao ciclo ${cicloPadrao}. ${isPdi?'Defina objetivo, próximo passo e prazo.':'Registre uma devolutiva objetiva e acionável.'}`;
  $('rhDevCampos').innerHTML=`<input id="rhDevTipo" type="hidden" value="${tipo}"><div class="campo"><label for="rhDevCiclo">Ciclo de desempenho</label><input id="rhDevCiclo" type="month" required value="${esc(cicloPadrao)}"></div><div class="campo"><label for="rhDevPessoa">Colaborador</label><select id="rhDevPessoa" required>${opcoes(avaliadoId)}</select></div><div class="campo"><label for="rhDevPrazo">${isPdi?'Prazo do próximo passo':'Data do feedback'}</label><input id="rhDevPrazo" type="date" required value="${esc(prazo)}"></div><div class="campo campo-span-3"><label for="rhDevAssunto">${isPdi?'Objetivo do PDI':'Assunto do feedback'}</label><input id="rhDevAssunto" maxlength="100" required value="${esc(sugestao)}"></div><div class="campo campo-span-3"><label for="rhDevDescricao">${isPdi?'Próximos passos / critério de evolução':'Registro do feedback'}</label><textarea id="rhDevDescricao" maxlength="900" rows="4" required></textarea></div>${isPdi?`<div class="campo"><label for="rhDevSituacao">Situação</label><select id="rhDevSituacao"><option value="PLANEJADA">Planejado</option><option value="EM_ANDAMENTO">Em andamento</option><option value="CONCLUIDA">Concluído</option><option value="CANCELADA">Cancelado</option></select></div>`:'<input id="rhDevSituacao" type="hidden" value="CONCLUIDA">'} `;
  msg($('rhDevMsg'),'');$('rhDevBox').classList.remove('hidden');$('rhDevBox').scrollIntoView({behavior:'smooth',block:'start'});
}
async function salvarDesenvolvimento(e){
  e.preventDefault();if(busy)return;
  try{
    const tipo=$('rhDevTipo').value,ciclo=$('rhDevCiclo').value,pessoaId=$('rhDevPessoa').value,prazo=$('rhDevPrazo').value,assunto=$('rhDevAssunto').value.trim(),descricao=$('rhDevDescricao').value.trim(),situacao=$('rhDevSituacao').value;
    const p=colaborador(pessoaId);if(!['FEEDBACK','PDI'].includes(tipo)||!/^\d{4}-\d{2}$/.test(ciclo)||!p||p.empresaId!==empresaUnicaSelecionadaId()||!/^\d{4}-\d{2}-\d{2}$/.test(prazo)||!assunto||!descricao)throw Error('Revise ciclo, colaborador, data e descrição.');
    busy=true;msg($('rhDevMsg'),'Salvando...');
    const competencia=prazo.slice(0,7),titulo=`${prefixo(tipo,ciclo)} ${assunto}`,participanteIds=[pessoaId],participanteUsuarios=p.usuarioId?[p.usuarioId]:[];
    await criarDocumento('rhAcoes',{empresaId:empresaUnicaSelecionadaId(),competencia,prazo,tipo:'MELHORIA',titulo,descricao,situacao,status:'ativo',participanteIds,participanteUsuarios,registradoPor:state.usuario.id,origem:'sig'});
    $('rhDevBox').classList.add('hidden');emitirAlteracao('rh');await carregar('avaliacoes');trocarAbaAval(tipo==='PDI'?'pdis':'feedbacks');
  }catch(err){console.error(err);msg($('rhDevMsg'),err.message||'Não foi possível salvar.')}finally{busy=false}
}

function classe9(valor){return valor>=4?'alto':valor>=3?'medio':'baixo'}
function dados9Box(avaliacoes){
  const por=new Map();for(const x of avaliacoes.filter(x=>x.status==='ativo')){const a=por.get(x.avaliadoId)||[];a.push(x);por.set(x.avaliadoId,a)}
  return [...por.entries()].map(([id,arr])=>({id,nome:pessoa(id),setor:colaborador(id)?.setor||'—',performance:arr.reduce((n,x)=>n+mediaNotas(x),0)/arr.length,potencial:arr.reduce((n,x)=>n+potencialNotas(x),0)/arr.length,qtde:arr.length}));
}
function trocarAbaAval(k){if(!ABAS_AV.includes(k))k='avaliacoes';abaAv=k;document.querySelectorAll('#pagina-rh-avaliacoes [data-rh-av-tab]').forEach(b=>b.classList.toggle('ativo',b.dataset.rhAvTab===k));$('rhCultBox-avaliacoes').classList.add('hidden');$('rhDevBox').classList.add('hidden');renderAvaliacoes()}

function renderAvaliacoes(){
  if(!$('rhCultConteudo-avaliacoes'))return;const p=intervaloAval();if(!p.valido){$('rhCultConteudo-avaliacoes').innerHTML='<div class="empty-state">Revise o período de análise.</div>';return}
  const f=filtrosAval();
  const av=registros.avaliacoes.filter(x=>dentroPeriodoAvaliacao(x,p)&&pessoaPassa(x.avaliadoId,f)).sort((a,b)=>String(b.ciclo).localeCompare(String(a.ciclo)));
  const dev=registros.acoes.filter(x=>x.status!=='estornado'&&['FEEDBACK','PDI'].includes(tipoDesenvolvimento(x))&&pessoaPassa((x.participanteIds||[])[0],f));
  const feedbacks=dev.filter(x=>tipoDesenvolvimento(x)==='FEEDBACK'&&dentroPeriodoAcao(x,p));
  const pdis=dev.filter(x=>tipoDesenvolvimento(x)==='PDI'&&(cicloAcao(x)>=p.dataInicio.slice(0,7)&&cicloAcao(x)<=p.dataFim.slice(0,7)));
  const ativos=av.filter(x=>x.status==='ativo'),avaliados=new Set(ativos.map(x=>x.avaliadoId)),box=dados9Box(ativos);
  const media=box.length?box.reduce((n,x)=>n+x.performance,0)/box.length:0;
  $('rhCultResumo-avaliacoes').innerHTML=`<div class="kpi-card"><span>Avaliações</span><strong>${ativos.length}</strong><small>${avaliados.size} colaborador(es)</small></div><div class="kpi-card"><span>Feedbacks registrados</span><strong>${feedbacks.length}</strong><small>conectados ao ciclo</small></div><div class="kpi-card"><span>PDIs ativos</span><strong>${pdis.filter(x=>x.situacao!=='CONCLUIDA'&&x.situacao!=='CANCELADA').length}</strong><small>${pdis.length} no histórico</small></div><div class="kpi-card"><span>Média de desempenho</span><strong>${box.length?media.toFixed(1):'—'}</strong><small>escala de 1 a 5</small></div>`;
  const acoes=$('rhCultAcoesLista');acoes.innerHTML='';
  if(abaAv==='avaliacoes'){
    $('rhCultTituloLista').textContent='Avaliações de desempenho';$('rhCultNotaLista').textContent='Perspectivas 360°, evidências e próximos passos.';
    if(perm('acoes','lancar'))acoes.innerHTML='<button class="btn-secundario" type="button" data-novo-feedback>+ Feedback</button><button class="btn-secundario" type="button" data-novo-pdi>+ PDI</button>';
    $('rhCultConteudo-avaliacoes').innerHTML=`<div class="tabela-container"><table class="tabela"><thead><tr><th>Ciclo</th><th>Avaliado</th><th>Avaliador</th><th>Perspectiva</th><th>Média</th><th>Evidências</th><th>Ações</th></tr></thead><tbody>${av.map(x=>`<tr class="${x.status==='estornado'?'sig-admin-estornado':''}"><td>${esc(x.ciclo)}</td><td>${esc(pessoa(x.avaliadoId))}</td><td>${esc(pessoa(x.avaliadorId))}</td><td>${esc(x.papel)}</td><td><strong>${mediaNotas(x).toFixed(1)}</strong></td><td>${esc(x.comentario||'—')}</td><td class="acoes-tabela">${x.status==='ativo'&&perm('avaliacoes','editar')?`<button type="button" class="btn-acao destaque" data-av-edit="${esc(x.id)}">Editar</button>`:''}${x.status==='ativo'&&perm('acoes','lancar')?`<button type="button" class="btn-acao" data-av-feedback="${esc(x.id)}">Feedback</button><button type="button" class="btn-acao" data-av-pdi="${esc(x.id)}">Criar PDI</button>`:''}${x.status==='ativo'&&admin()?`<button type="button" class="btn-acao perigo" data-av-estorno="${esc(x.id)}">Estornar ADM</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">Nenhuma avaliação no período.</td></tr>'}</tbody></table></div>`;
  }else if(abaAv==='feedbacks'){
    $('rhCultTituloLista').textContent='Feedbacks registrados';$('rhCultNotaLista').textContent='Devolutivas registradas e conectadas ao ciclo de desempenho.';if(perm('acoes','lancar'))acoes.innerHTML='<button class="btn-primario" type="button" data-novo-feedback>+ Registrar feedback</button>';
    $('rhCultConteudo-avaliacoes').innerHTML=`<div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Ciclo</th><th>Colaborador</th><th>Assunto</th><th>Registro</th></tr></thead><tbody>${feedbacks.sort((a,b)=>String(b.prazo).localeCompare(String(a.prazo))).map(x=>`<tr><td>${dataBR(x.prazo)}</td><td>${esc(cicloAcao(x))}</td><td>${esc(pessoa((x.participanteIds||[])[0]))}</td><td>${esc(tituloLimpo(x))}</td><td>${esc(x.descricao||'—')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum feedback no período.</td></tr>'}</tbody></table></div>`;
  }else if(abaAv==='pdis'){
    $('rhCultTituloLista').textContent='Planos de Desenvolvimento Individual';$('rhCultNotaLista').textContent='PDIs originados das avaliações, com próximos passos, prazo e situação.';if(perm('acoes','lancar'))acoes.innerHTML='<button class="btn-primario" type="button" data-novo-pdi>+ Criar PDI</button>';
    $('rhCultConteudo-avaliacoes').innerHTML=`<div class="tabela-container"><table class="tabela"><thead><tr><th>Ciclo origem</th><th>Colaborador</th><th>Objetivo</th><th>Próximo passo</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>${pdis.sort((a,b)=>String(b.prazo).localeCompare(String(a.prazo))).map(x=>`<tr><td>${esc(cicloAcao(x))}</td><td>${esc(pessoa((x.participanteIds||[])[0]))}</td><td>${esc(tituloLimpo(x))}</td><td>${esc(x.descricao||'—')}</td><td>${dataBR(x.prazo)}</td><td>${esc(x.situacao||'PLANEJADA')}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum PDI conectado aos ciclos do período.</td></tr>'}</tbody></table></div>`;
  }else if(abaAv==='calibracao'){
    $('rhCultTituloLista').textContent='Calibração estruturada · Matriz 9-box';$('rhCultNotaLista').textContent='Performance = média geral. Potencial = média de Iniciativa + Liderança. Use como base objetiva para a calibração do ciclo.';
    const grupos={alto:{alto:[],medio:[],baixo:[]},medio:{alto:[],medio:[],baixo:[]},baixo:{alto:[],medio:[],baixo:[]}};for(const x of box)grupos[classe9(x.potencial)][classe9(x.performance)].push(x);
    const cel=(pot,perf,titulo)=>`<article class="rh-nine-cell"><div class="rh-nine-title"><strong>${titulo}</strong><span>${grupos[pot][perf].length}</span></div>${grupos[pot][perf].map(x=>`<button type="button" class="rh-nine-person" data-nine-person="${esc(x.id)}"><strong>${esc(x.nome)}</strong><small>${esc(x.setor)} · D ${x.performance.toFixed(1)} / P ${x.potencial.toFixed(1)}</small></button>`).join('')||'<div class="rh-empty">Sem colaboradores</div>'}</article>`;
    $('rhCultConteudo-avaliacoes').innerHTML=`<div class="rh-nine-wrapper"><div class="rh-nine-y">Potencial ↑</div><div class="rh-nine-grid">${cel('alto','baixo','Aposta futura')}${cel('alto','medio','Alto potencial')}${cel('alto','alto','Talento-chave')}${cel('medio','baixo','Potencial a desenvolver')}${cel('medio','medio','Desempenho sólido')}${cel('medio','alto','Forte desempenho')}${cel('baixo','baixo','Reavaliar aderência')}${cel('baixo','medio','Especialista consistente')}${cel('baixo','alto','Referência técnica')}</div><div class="rh-nine-x">Desempenho →</div></div>`;
  }else{
    $('rhCultTituloLista').textContent='Histórico centralizado';$('rhCultNotaLista').textContent='Avaliações, feedbacks e PDIs reunidos por colaborador e ciclo.';
    const hist=[...av.map(x=>({data:`${x.ciclo}-01`,tipo:'AVALIAÇÃO',ciclo:x.ciclo,pessoaId:x.avaliadoId,titulo:`${x.papel} · média ${mediaNotas(x).toFixed(1)}`,detalhe:x.comentario||'Sem comentário'})),...feedbacks.map(x=>({data:x.prazo,tipo:'FEEDBACK',ciclo:cicloAcao(x),pessoaId:(x.participanteIds||[])[0],titulo:tituloLimpo(x),detalhe:x.descricao||''})),...pdis.map(x=>({data:x.prazo,tipo:'PDI',ciclo:cicloAcao(x),pessoaId:(x.participanteIds||[])[0],titulo:tituloLimpo(x),detalhe:`${x.descricao||''} · ${x.situacao||'PLANEJADA'}`}))].sort((a,b)=>String(b.data).localeCompare(String(a.data)));
    $('rhCultConteudo-avaliacoes').innerHTML=`<div class="rh-history">${hist.map(x=>`<article class="rh-history-item"><div class="rh-history-date">${dataBR(x.data)}</div><div><span class="rh-history-type">${esc(x.tipo)}</span><strong>${esc(pessoa(x.pessoaId))}</strong><small>Ciclo ${esc(x.ciclo)}</small><p>${esc(x.titulo)}</p><small>${esc(x.detalhe)}</small></div></article>`).join('')||'<div class="rh-empty">Nenhum registro no período.</div>'}</div>`;
  }
  bindAvaliacoes();
}
function bindAvaliacoes(){
  document.querySelectorAll('#pagina-rh-avaliacoes [data-av-edit]').forEach(b=>b.addEventListener('click',()=>abrirAvaliacao(registros.avaliacoes.find(x=>x.id===b.dataset.avEdit))));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-av-feedback]').forEach(b=>b.addEventListener('click',()=>{const x=registros.avaliacoes.find(v=>v.id===b.dataset.avFeedback);if(x)abrirDesenvolvimento('FEEDBACK',x.avaliadoId,x.ciclo)}));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-av-pdi]').forEach(b=>b.addEventListener('click',()=>{const x=registros.avaliacoes.find(v=>v.id===b.dataset.avPdi);if(x)abrirDesenvolvimento('PDI',x.avaliadoId,x.ciclo)}));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-novo-feedback]').forEach(b=>b.addEventListener('click',()=>abrirDesenvolvimento('FEEDBACK')));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-novo-pdi]').forEach(b=>b.addEventListener('click',()=>abrirDesenvolvimento('PDI')));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-av-estorno]').forEach(b=>b.addEventListener('click',()=>estornar('avaliacoes',b.dataset.avEstorno)));
  document.querySelectorAll('#pagina-rh-avaliacoes [data-nine-person]').forEach(b=>b.addEventListener('click',()=>{$('rhCultPessoa').value=b.dataset.ninePerson;trocarAbaAval('historico')}));
}

function camposAcao(x){return `<div class="campo"><label for="cultMes">Competência</label><input id="cultMes" type="month" required value="${esc(x?.competencia||$('rhCultMes-acoes').value)}"></div><div class="campo"><label for="cultTipo">Tipo</label><select id="cultTipo">${TIPOS.map(v=>`<option ${x?.tipo===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="campo"><label for="cultPrazo">Data / prazo</label><input id="cultPrazo" type="date" required value="${esc(x?.prazo||hoje())}"></div><div class="campo campo-span-2"><label for="cultTitulo">Ação</label><input id="cultTitulo" maxlength="140" required value="${esc(x?.titulo||'')}"></div><div class="campo"><label for="cultStatus">Situação</label><select id="cultStatus">${['PLANEJADA','EM_ANDAMENTO','CONCLUIDA','CANCELADA'].map(v=>`<option ${x?.situacao===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="campo campo-span-3"><label for="cultDescricao">Descrição / resultado esperado</label><textarea id="cultDescricao" maxlength="1000" rows="3">${esc(x?.descricao||'')}</textarea></div><div class="campo campo-span-3"><label for="cultParticipantes">Colaboradores envolvidos (Ctrl para selecionar vários)</label><select id="cultParticipantes" multiple size="6">${pessoas.filter(p=>p.status!=='estornado').map(p=>`<option value="${esc(p.id)}" ${(x?.participanteIds||[]).includes(p.id)?'selected':''}>${esc(p.nome)} · ${p.usuarioId?'conta SIG vinculada':'sem conta SIG'}</option>`).join('')}</select><small>Somente participantes com conta SIG vinculada verão a ação na Minha Mesa.</small></div>`}
function abrirAcao(x=null){if(!perm('acoes',x?'editar':'lancar'))return;if(!empresaUnicaSelecionadaId())return alert('Selecione uma empresa no cabeçalho.');editId=x?.id||'';$('rhCultCampos-acoes').innerHTML=camposAcao(x);$('rhCultTitulo-acoes').textContent=(x?'Editar':'Novo')+' · Ações de RH';msg($('rhCultMsg-acoes'),'');$('rhCultBox-acoes').classList.remove('hidden');$('rhCultBox-acoes').scrollIntoView({behavior:'smooth',block:'start'})}
function lerAcao(){const competencia=$('cultMes').value,prazo=$('cultPrazo').value,tipo=$('cultTipo').value,titulo=$('cultTitulo').value.trim(),descricao=$('cultDescricao').value.trim(),situacao=$('cultStatus').value,participanteIds=[...$('cultParticipantes').selectedOptions].map(o=>o.value),participanteUsuarios=[...new Set(participanteIds.map(id=>pessoas.find(p=>p.id===id&&p.empresaId===empresaUnicaSelecionadaId())?.usuarioId).filter(Boolean))];if(!/^\d{4}-\d{2}$/.test(competencia)||!/^\d{4}-\d{2}-\d{2}$/.test(prazo)||prazo.slice(0,7)!==competencia||!TIPOS.includes(tipo)||!titulo||!['PLANEJADA','EM_ANDAMENTO','CONCLUIDA','CANCELADA'].includes(situacao)||participanteIds.some(id=>!pessoas.some(p=>p.id===id&&p.empresaId===empresaUnicaSelecionadaId())))throw Error('Revise ação, competência, data e participantes.');if(tipo!=='ENDOMARKETING'&&!participanteIds.length)throw Error('Informe os colaboradores envolvidos para a agenda.');return {competencia,prazo,tipo,titulo,descricao,situacao,participanteIds,participanteUsuarios}}
async function salvarAcao(e){e.preventDefault();if(busy)return;try{const emp=empresaUnicaSelecionadaId(),d=lerAcao();busy=true;msg($('rhCultMsg-acoes'),'Salvando...');if(editId){const x=registros.acoes.find(v=>v.id===editId);if(!x||x.empresaId!==emp||x.status!=='ativo'||!perm('acoes','editar'))throw Error('Edição não autorizada.');await atualizarDocumento('rhAcoes',editId,d)}else{if(!perm('acoes','lancar'))throw Error('Sem permissão.');await criarDocumento('rhAcoes',{...d,empresaId:emp,status:'ativo',registradoPor:state.usuario.id,origem:'sig'})}$('rhCultBox-acoes').classList.add('hidden');editId='';emitirAlteracao('rh');await carregar('acoes')}catch(err){console.error(err);msg($('rhCultMsg-acoes'),err.message||'Não foi possível salvar.')}finally{busy=false}}
function renderAcoes(){if(!$('rhCultLista-acoes'))return;const mes=$('rhCultMes-acoes').value,arr=registros.acoes.filter(x=>x.competencia===mes).sort((a,b)=>String(b.prazo).localeCompare(String(a.prazo)));$('rhCultResumo-acoes').innerHTML=`<div class="kpi-card"><span>Ações no mês</span><strong>${arr.filter(x=>x.status==='ativo').length}</strong></div><div class="kpi-card"><span>Treinamentos</span><strong>${arr.filter(x=>x.status==='ativo'&&x.tipo==='TREINAMENTO').length}</strong></div><div class="kpi-card"><span>Melhorias</span><strong>${arr.filter(x=>x.status==='ativo'&&x.tipo==='MELHORIA').length}</strong></div>`;$('rhCultHead-acoes').innerHTML='<tr><th>Prazo</th><th>Tipo</th><th>Ação</th><th>Situação</th><th>Participantes</th><th>Situação / ações</th></tr>';$('rhCultLista-acoes').innerHTML=arr.map(x=>`<tr class="${x.status==='estornado'?'sig-admin-estornado':''}"><td>${dataBR(x.prazo)}</td><td>${esc(x.tipo)}</td><td>${esc(tituloLimpo(x))}</td><td>${esc(x.situacao)}</td><td>${esc((x.participanteIds||[]).map(pessoa).join(', ')||'—')}</td><td>${x.status==='estornado'?'Estornado':'Ativo'} ${x.status==='ativo'&&perm('acoes','editar')?`<button type="button" class="btn-acao destaque" data-ac-edit="${esc(x.id)}">Editar</button>`:''}${x.status==='ativo'&&admin()?`<button type="button" class="btn-acao perigo" data-ac-estorno="${esc(x.id)}">Estornar ADM</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum registro no mês.</td></tr>';document.querySelectorAll('#pagina-rh-acoes [data-ac-edit]').forEach(b=>b.addEventListener('click',()=>abrirAcao(registros.acoes.find(x=>x.id===b.dataset.acEdit))));document.querySelectorAll('#pagina-rh-acoes [data-ac-estorno]').forEach(b=>b.addEventListener('click',()=>estornar('acoes',b.dataset.acEstorno)))}

async function estornar(k,id){if(!admin())return;const x=registros[k].find(v=>v.id===id);if(!x||x.status!=='ativo')return;const ok=await confirmarAcaoAdministrativa({titulo:'Estornar registro de RH',descricao:'O registro permanecerá no histórico.',motivoLabel:'Motivo obrigatório',confirmarTexto:'Estornar',perigosa:true});if(!ok)return;try{await atualizarComAuditoria({colecao:MOD[k].colecao,id,empresaId:x.empresaId,modulo:MOD[k].perfil,acao:'estorno',motivo:ok.motivo,resumo:`Estorno ${MOD[k].titulo}`,snapshotAntes:x,alteracoes:{status:'estornado',motivoEstorno:ok.motivo,estornadoPor:state.usuario.id,estornadoEm:new Date().toISOString()}});emitirAlteracao('rh');await carregar(k)}catch(e){console.error(e);alert('Não foi possível estornar.')}}
async function carregar(k){if(busy||!acesso()||!podeVer(k))return;busy=true;try{if(k==='avaliacoes'){const base=[listarDocumentos('rhColaboradores'),listarDocumentos('rhAvaliacoes360')];if(podeVer('acoes'))base.push(listarDocumentos('rhAcoes'));const r=await Promise.all(base);pessoas=r[0];registros.avaliacoes=r[1];registros.acoes=r[2]||[];atualizarFiltrosAval();renderAvaliacoes()}else{[pessoas,registros.acoes]=await Promise.all([listarDocumentos('rhColaboradores'),listarDocumentos('rhAcoes')]);renderAcoes()}$('rhCultAviso-'+k)?.classList.add('hidden')}catch(e){console.error(e);if($('rhCultAviso-'+k)){$('rhCultAviso-'+k).textContent='Não foi possível carregar RH. Confira perfil e Rules.';$('rhCultAviso-'+k).classList.remove('hidden')}}finally{busy=false}}

function instalar(){if(!document.querySelector('link[href^="production.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='production.css?v=1';document.head.appendChild(l)}montar();menu()}
instalar();window.addEventListener('sig:ready',instalar);window.addEventListener('sig:empresa-contexto',()=>{sincronizarPeriodoAval();for(const k of Object.keys(MOD))if(!$('pagina-rh-'+k)?.classList.contains('hidden'))carregar(k)});window.addEventListener('sig:data-changed',e=>{if(e.detail?.modulo==='rh')for(const k of Object.keys(MOD))if(!$('pagina-rh-'+k)?.classList.contains('hidden'))carregar(k)});
