from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path, text):
    p=ROOT/path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text,encoding='utf-8')
def repl(path, old, new, count=-1):
    s=read(path)
    if old not in s:
        raise SystemExit(f'Nao encontrei trecho em {path}: {old[:100]!r}')
    s=s.replace(old,new,count)
    write(path,s)

# idempotencia
if 'import "./js/module-settings.js";' in read('app.js'):
    print('RH v2 ja aplicado')
    raise SystemExit(0)

# 1) infraestrutura reutilizavel de configuracao por modulo
module_settings = r'''import { db, state, admin, esc, grupoAtualId, empresaUnicaSelecionadaId } from "./shared.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const PADRAO={ativo:true,dashboardAtivo:true,minhaMesaAtiva:true,telas:{}};
const cache=new Map();
const registro=new Map();
const chave=(modulo,empresaId)=>`${grupoAtualId()}_${empresaId}_${modulo}`;
const normalizar=(x={})=>({...PADRAO,...x,telas:{...(x.telas||{})}});
export function registrarModuloConfiguravel(modulo,meta={}){registro.set(modulo,{modulo,...meta});}
export function configuracaoModulo(modulo,empresaId=empresaUnicaSelecionadaId()){return cache.get(chave(modulo,empresaId))||normalizar();}
export function moduloAtivo(modulo,empresaId){return configuracaoModulo(modulo,empresaId).ativo!==false;}
export function moduloNoDashboard(modulo,empresaId){return configuracaoModulo(modulo,empresaId).dashboardAtivo!==false;}
export function moduloNaMinhaMesa(modulo,empresaId){return configuracaoModulo(modulo,empresaId).minhaMesaAtiva!==false;}
export async function carregarConfiguracaoModulo(modulo,empresaId=empresaUnicaSelecionadaId()){
  if(!grupoAtualId()||!empresaId)return normalizar();
  const k=chave(modulo,empresaId);if(cache.has(k))return cache.get(k);
  try{const s=await getDoc(doc(db,'configuracoesModulos',k));const v=normalizar(s.exists()?s.data():{});cache.set(k,v);return v}catch(e){console.warn('Configuracao de modulo indisponivel',modulo,e);const v=normalizar();cache.set(k,v);return v}
}
export async function salvarConfiguracaoModulo(modulo,patch,empresaId=empresaUnicaSelecionadaId()){
  if(!admin())throw new Error('configuracao-modulo-somente-administrador');
  if(!grupoAtualId()||!empresaId)throw new Error('selecione-uma-empresa');
  const k=chave(modulo,empresaId),atual=await carregarConfiguracaoModulo(modulo,empresaId),novo=normalizar({...atual,...patch,telas:{...atual.telas,...(patch.telas||{})}});
  await setDoc(doc(db,'configuracoesModulos',k),{...novo,grupoId:grupoAtualId(),empresaId,modulo,atualizadoPor:state.usuario?.id||'',atualizadoEm:serverTimestamp()},{merge:true});
  cache.set(k,novo);window.dispatchEvent(new CustomEvent('sig:module-config',{detail:{modulo,empresaId,config:novo}}));return novo;
}
function css(){if(document.getElementById('module-settings-css'))return;const s=document.createElement('style');s.id='module-settings-css';s.textContent=`.module-config-overlay{position:fixed;inset:0;z-index:10020;background:rgba(8,22,35,.55);display:grid;place-items:center;padding:20px}.module-config-card{width:min(620px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;padding:22px;box-shadow:0 28px 80px rgba(0,0,0,.25)}.module-config-card h3{margin:0 0 6px}.module-config-grid{display:grid;gap:10px;margin:18px 0}.module-config-line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #e3e9ee;border-radius:10px}.module-config-extra{margin-top:16px}.module-config-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.module-config-btn{white-space:nowrap}`;document.head.appendChild(s)}
export async function abrirConfiguracaoModulo(modulo,{titulo='',telas={},extraHtml='',coletarExtra=null,onSaved=null}={}){
  if(!admin())return alert('Configurações de módulo são exclusivas do Administrador.');
  const emp=empresaUnicaSelecionadaId();if(!emp)return alert('Selecione apenas uma empresa no cabeçalho.');css();const cfg=await carregarConfiguracaoModulo(modulo,emp),overlay=document.createElement('div');overlay.className='module-config-overlay';overlay.innerHTML=`<section class="module-config-card" role="dialog" aria-modal="true"><h3>${esc(titulo||`Configurações · ${modulo}`)}</h3><p>Disponibilidade geral do módulo. Permissões de perfil continuam sendo aplicadas separadamente.</p><div class="module-config-grid"><label class="module-config-line"><span>Módulo ativo</span><input data-cfg="ativo" type="checkbox" ${cfg.ativo!==false?'checked':''}></label><label class="module-config-line"><span>Disponível no Dashboard</span><input data-cfg="dashboardAtivo" type="checkbox" ${cfg.dashboardAtivo!==false?'checked':''}></label><label class="module-config-line"><span>Disponível na Minha Mesa</span><input data-cfg="minhaMesaAtiva" type="checkbox" ${cfg.minhaMesaAtiva!==false?'checked':''}></label>${Object.entries(telas).map(([id,nome])=>`<label class="module-config-line"><span>${esc(nome)}</span><input data-tela="${esc(id)}" type="checkbox" ${cfg.telas?.[id]!==false?'checked':''}></label>`).join('')}</div><div class="module-config-extra">${extraHtml||''}</div><div class="module-config-actions"><button type="button" class="btn-secundario" data-cancelar>Cancelar</button><button type="button" class="btn-primario" data-salvar>Salvar configurações</button></div><p data-msg class="mensagem-form"></p></section>`;document.body.appendChild(overlay);
  const fechar=()=>overlay.remove();overlay.querySelector('[data-cancelar]').onclick=fechar;overlay.addEventListener('click',e=>{if(e.target===overlay)fechar()});overlay.querySelector('[data-salvar]').onclick=async()=>{const msg=overlay.querySelector('[data-msg]');try{msg.textContent='Salvando...';const patch={ativo:overlay.querySelector('[data-cfg="ativo"]').checked,dashboardAtivo:overlay.querySelector('[data-cfg="dashboardAtivo"]').checked,minhaMesaAtiva:overlay.querySelector('[data-cfg="minhaMesaAtiva"]').checked,telas:{}};overlay.querySelectorAll('[data-tela]').forEach(x=>patch.telas[x.dataset.tela]=x.checked);Object.assign(patch,coletarExtra?coletarExtra(overlay,cfg):{});const novo=await salvarConfiguracaoModulo(modulo,patch,emp);onSaved?.(novo);fechar()}catch(e){console.error(e);msg.textContent=e.message||'Não foi possível salvar.'}};return overlay;
}
function instalarBotoes(){if(!admin())return;document.querySelectorAll('.pagina[id^="pagina-"]').forEach(p=>{if(p.id==='pagina-dashboard'||p.id==='pagina-minhamesa')return;const head=p.querySelector('.pagina-cabecalho,.modulo-hero,.welcome');if(!head||head.querySelector('[data-module-config-auto]'))return;const modulo=p.id.replace(/^pagina-/,'');const box=head.querySelector('.acoes-cabecalho')||head;const b=document.createElement('button');b.type='button';b.className='btn-secundario module-config-btn';b.dataset.moduleConfigAuto='1';b.textContent='⚙ Configurar módulo';b.onclick=()=>{const meta=registro.get(modulo)||{};abrirConfiguracaoModulo(modulo,{titulo:meta.titulo||`Configurações · ${modulo}`,telas:meta.telas||{}})};box.appendChild(b)})}
const obs=new MutationObserver(instalarBotoes);if(document.body)obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('sig:ready',instalarBotoes);window.addEventListener('sig:page',instalarBotoes);
'''
write('js/module-settings.js',module_settings)

# 2) analitica de RH desacoplada e reutilizavel pelo dashboard
hr_analytics = r'''import { resumoRHPeriodo } from './hr-metrics.js';
const ativo=x=>x.status!=='estornado';
export function rankingAbsenteismo(pessoas,ausencias,inicio,fim,setor=''){
  return pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).map(p=>{const r=resumoRHPeriodo([p],ausencias,[],inicio,fim);return{id:p.id,nome:p.nome,setor:p.setor,horas:r.horasAusentes,taxa:r.absenteismo,faltas:ausencias.filter(a=>ativo(a)&&a.colaboradorId===p.id&&a.data>=inicio&&a.data<=fim&&a.tipo==='FALTA').length}}).filter(x=>x.horas>0||x.faltas>0).sort((a,b)=>b.taxa-a.taxa||b.horas-a.horas);
}
export function rankingHorasExtras(pessoas,horas,inicio,fim,setor=''){
  return pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).map(p=>{const r=resumoRHPeriodo([p],[],horas,inicio,fim);return{id:p.id,nome:p.nome,setor:p.setor,h50:r.horas50,h100:r.horas100,total:r.horas50+r.horas100}}).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
}
export function turnoverPorSetor(pessoas,ausencias,horas,inicio,fim){
  return [...new Set(pessoas.filter(ativo).map(p=>p.setor))].map(setor=>{const r=resumoRHPeriodo(pessoas,ausencias,horas,inicio,fim,setor);return{setor,turnover:r.turnover,admissoes:r.admissoes,demissoes:r.demissoes,fechamento:r.fechamento}}).sort((a,b)=>b.turnover-a.turnover);
}
'''
write('js/hr-analytics.js',hr_analytics)

# 3) app imports
repl('app.js','import "./js/hr-agenda.js";','import "./js/hr-agenda.js";\nimport "./js/module-settings.js";')

# 4) periodo arbitrario por calendario no motor de RH
p='js/hr-metrics.js';s=read(p)
s += r'''

// Intervalo livre (inclusive), usado pelos filtros de calendário do RH.
export function resumoRHPeriodo(colaboradores, ausencias, horas, inicio, fim, setor = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) return {linhas:[],abertura:0,fechamento:0,admissoes:0,demissoes:0,turnover:0,horasAusentes:0,previstas:0,absenteismo:0,horas50:0,horas100:0};
  const iniMes=inicio.slice(0,7),fimM=fim.slice(0,7),linhas=[];
  for (const mes of mesesEntre(iniMes,fimM)) {
    const de=mes===iniMes?inicio:`${mes}-01`, ate=mes===fimM?fim:fimMes(mes);
    const r=resumoRHDatas(colaboradores,ausencias,horas,de,ate,setor); if(r) linhas.push(r);
  }
  const flat=linhas.map(x=>x.linhas[0]),total=k=>flat.reduce((n,l)=>n+Number(l[k]||0),0),abertura=flat[0]?.abertura||0,fechamento=flat.at(-1)?.fechamento||0,media=(abertura+fechamento)/2,previstas=total('previstas'),horasAusentes=total('horasAusentes');
  return {linhas:flat,abertura,fechamento,admissoes:total('admissoes'),demissoes:total('demissoes'),turnover:media?total('demissoes')/media*100:0,horasAusentes,previstas,absenteismo:previstas?horasAusentes/previstas*100:0,horas50:total('horas50'),horas100:total('horas100')};
}
'''
write(p,s)

# 5) RH principal: configuracao, calendario, filtros dependentes, analytics e correcoes ADM
p='js/hr-people.js';s=read(p)
s=s.replace("import { confirmarAcaoAdministrativa, atualizarComAuditoria } from './admin-actions.js';","import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from './admin-actions.js';")
s=s.replace("import { resumoRH, resumoRHDatas, fimMes, ativoNaData } from './hr-metrics.js';","import { resumoRHPeriodo, fimMes, ativoNaData } from './hr-metrics.js';\nimport { rankingAbsenteismo, rankingHorasExtras, turnoverPorSetor } from './hr-analytics.js';\nimport { carregarConfiguracaoModulo, configuracaoModulo, abrirConfiguracaoModulo, registrarModuloConfiguravel } from './module-settings.js';")
s=s.replace("const SETORES = ['ADM','LAJE','COMERCIAL','LOGISTICA','PRODUÇÃO','MOURÃO','MANUTENÇÃO'];","const SETORES_PADRAO = ['ADM','LAJE','COMERCIAL','LOGISTICA','PRODUÇÃO','MOURÃO','MANUTENÇÃO'];\nlet configRh={setores:[...SETORES_PADRAO],telas:{}};\nconst setoresAtivos=()=>{const base=Array.isArray(configRh.setores)?configRh.setores:SETORES_PADRAO;return [...new Set(base.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))};\nconst setoresConhecidos=()=>[...new Set([...setoresAtivos(),...dados.pessoas.map(p=>p.setor).filter(Boolean)])];\nregistrarModuloConfiguravel('rh',{titulo:'Configurações · RH',telas:{pessoas:'Colaboradores e quadro',ausencias:'Absenteísmo',extras:'Horas extras'}});")
s=s.replace("const intervalo = () => { const p=contextoPeriodo(), de=Number($('rhDiaInicio').value), ate=Number($('rhDiaFim').value); return { ...p, dataInicio:`${p.inicio}-${String(de).padStart(2,'0')}`, dataFim:`${p.fim}-${String(ate).padStart(2,'0')}`, valido:!p.unico || Number.isInteger(de)&&Number.isInteger(ate)&&de>=1&&ate<=Number(fimMes(p.fim).slice(-2))&&de<=ate }; };\nfunction sincronizarPeriodo(){const p=contextoPeriodo(), dias=Number(fimMes(p.fim).slice(-2));$('rhDias').classList.toggle('hidden',!p.unico);$('rhDiaInicio').max=dias;$('rhDiaFim').max=dias;$('rhDiaInicio').value='1';$('rhDiaFim').value=String(dias);render()}","const intervalo=()=>{const p=contextoPeriodo(),min=`${p.inicio}-01`,max=fimMes(p.fim),dataInicio=$('rhDataInicioFiltro')?.value||min,dataFim=$('rhDataFimFiltro')?.value||max;return{...p,dataInicio,dataFim,valido:/^\\d{4}-\\d{2}-\\d{2}$/.test(dataInicio)&&/^\\d{4}-\\d{2}-\\d{2}$/.test(dataFim)&&dataInicio>=min&&dataFim<=max&&dataInicio<=dataFim}};\nfunction sincronizarPeriodo(){const p=contextoPeriodo(),min=`${p.inicio}-01`,max=fimMes(p.fim);$('rhDataInicioFiltro').min=min;$('rhDataInicioFiltro').max=max;$('rhDataFimFiltro').min=min;$('rhDataFimFiltro').max=max;$('rhDataInicioFiltro').value=min;$('rhDataFimFiltro').value=max;render()}")
s=s.replace("<div class=\"pagina-cabecalho production-head\"><div><span class=\"eyebrow\">PESSOAS</span><h2>RH · Quadro e indicadores</h2><p>Admissões, demissões, ausências e horas extras por colaborador.</p></div><div class=\"acoes-cabecalho\"><button id=\"rhNovo\" class=\"btn-primario\" type=\"button\">+ Novo registro</button><button id=\"rhAtualizar\" class=\"btn-secundario\" type=\"button\">Atualizar</button></div></div>","<div class=\"pagina-cabecalho production-head\"><div><span class=\"eyebrow\">PESSOAS</span><h2>RH · Quadro e indicadores</h2><p>Admissões, demissões, ausências e horas extras por colaborador.</p></div><div class=\"acoes-cabecalho\"><button id=\"rhConfig\" class=\"btn-secundario\" type=\"button\">⚙ Configurações RH</button><button id=\"rhNovo\" class=\"btn-primario\" type=\"button\">+ Novo registro</button><button id=\"rhAtualizar\" class=\"btn-secundario\" type=\"button\">Atualizar</button></div></div><div id=\"rhFloatingActions\" class=\"rh-floating-actions\"><button id=\"rhNovoFloat\" class=\"btn-primario\" type=\"button\">+ Novo</button><button id=\"rhAtualizarFloat\" class=\"btn-secundario\" type=\"button\">Atualizar</button></div>")
old='<section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Período de análise</h3><p>Admissão e demissão contam na data informada. O quadro é calculado dos vínculos ativos.</p></div><div class="rh-filter-bar"><div id="rhDias" class="rh-day-range"><label for="rhDiaInicio">Do dia <input id="rhDiaInicio" type="number" min="1" step="1" inputmode="numeric"></label><label for="rhDiaFim">Até o dia <input id="rhDiaFim" type="number" min="1" step="1" inputmode="numeric"></label></div><label class="rh-filter-field" for="rhSetor">Setor <select id="rhSetor"><option value="">Todos</option>${SETORES.map(x=>`<option>${esc(x)}</option>`).join(\'\')}</select></label><label class="rh-filter-field" for="rhFiltroPessoa">Colaborador <select id="rhFiltroPessoa"><option value="">Todos</option></select></label></div></div></section>'
new='<section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Período de análise</h3><p>Use o calendário dentro do período escolhido no topo do SIG.</p></div><div class="rh-filter-bar"><label class="rh-filter-field" for="rhDataInicioFiltro">De <input id="rhDataInicioFiltro" type="date"></label><label class="rh-filter-field" for="rhDataFimFiltro">Até <input id="rhDataFimFiltro" type="date"></label><label class="rh-filter-field" for="rhSetor">Setor <select id="rhSetor"><option value="">Todos os setores</option></select></label><label class="rh-filter-field" for="rhFiltroPessoa">Colaborador <select id="rhFiltroPessoa"><option value="">Todos</option></select></label></div></div></section>'
if old not in s: raise SystemExit('markup filtro RH nao encontrado')
s=s.replace(old,new)
s=s.replace('<section id="rhPorPessoaBox" class="lista-card">','<section id="rhGraficos" class="rh-analytics-grid"><article class="lista-card"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloA">Indicadores por colaborador</h3><p id="rhGraficoNotaA">Ranking do período selecionado.</p></div></div><div id="rhGraficoA" class="rh-bars"></div></article><article class="lista-card"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloB">Indicadores por setor</h3><p id="rhGraficoNotaB">Comparativo do período selecionado.</p></div></div><div id="rhGraficoB" class="rh-bars"></div></article></section><section id="rhPorPessoaBox" class="lista-card">')
s=s.replace("for(const id of ['rhDiaInicio','rhDiaFim','rhSetor','rhFiltroPessoa']) $(id).addEventListener('change',render);","for(const id of ['rhDataInicioFiltro','rhDataFimFiltro','rhFiltroPessoa']) $(id).addEventListener('change',render);\n  $('rhSetor').addEventListener('change',()=>{atualizarFiltroPessoas();render()});")
s=s.replace("$('rhNovo').addEventListener('click',novo);$('rhAtualizar').addEventListener('click',carregar);","$('rhNovo').addEventListener('click',novo);$('rhAtualizar').addEventListener('click',carregar);$('rhNovoFloat').addEventListener('click',novo);$('rhAtualizarFloat').addEventListener('click',carregar);$('rhConfig').addEventListener('click',abrirConfigRh);")
s=s.replace("function trocar(k){if(k!=='pessoas'&&!perm(k,'visualizar')&&!perm(k,'lancar')&&!perm(k,'editar'))k='pessoas';tab=k;editId='';$('rhFormBox')?.classList.add('hidden');document.querySelectorAll('[data-rh-tab]').forEach(b=>{b.classList.toggle('ativo',b.dataset.rhTab===k);b.classList.toggle('hidden',b.dataset.rhTab!=='pessoas'&&!perm(b.dataset.rhTab,'visualizar')&&!perm(b.dataset.rhTab,'lancar')&&!perm(b.dataset.rhTab,'editar'))});$('rhNovo')?.classList.toggle('hidden',!perm(k,'lancar'));$('rhNovo').textContent=k==='pessoas'?'+ Admitir colaborador':'+ Novo registro';render()}","function telaAtiva(k){return configRh?.telas?.[k]!==false}\nfunction trocar(k){if(!telaAtiva(k)||k!=='pessoas'&&!perm(k,'visualizar')&&!perm(k,'lancar')&&!perm(k,'editar'))k='pessoas';tab=k;editId='';$('rhFormBox')?.classList.add('hidden');document.querySelectorAll('[data-rh-tab]').forEach(b=>{const permitido=telaAtiva(b.dataset.rhTab)&&(b.dataset.rhTab==='pessoas'||perm(b.dataset.rhTab,'visualizar')||perm(b.dataset.rhTab,'lancar')||perm(b.dataset.rhTab,'editar'));b.classList.toggle('ativo',b.dataset.rhTab===k);b.classList.toggle('hidden',!permitido)});const pode=perm(k,'lancar');$('rhNovo')?.classList.toggle('hidden',!pode);$('rhNovoFloat')?.classList.toggle('hidden',!pode);$('rhNovo').textContent=k==='pessoas'?'+ Admitir colaborador':'+ Novo registro';$('rhNovoFloat').textContent=k==='pessoas'?'+ Admitir':'+ Novo';render()}")
s=s.replace("function opcoesPessoa(valor=''){const arr=dados.pessoas.filter(ativo).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));","function opcoesPessoa(valor=''){const setor=$('rhSetor')?.value||'';const arr=dados.pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));")
s=s.replace("${SETORES.map(x=>`<option>${esc(x)}</option>`).join('')}","${setoresAtivos().map(x=>`<option>${esc(x)}</option>`).join('')}")
s=s.replace("!SETORES.includes(d.setor)","!setoresConhecidos().includes(d.setor)")
# admin excluir
anchor="async function estornar(id){if(!admin())return;"
idx=s.find(anchor)
if idx<0: raise SystemExit('estornar nao encontrado')
end=s.find("function tabela",idx)
block=s[idx:end]
extra="""async function excluirAdm(id){if(!admin())return;const x=dados[tab].find(v=>v.id===id);if(!x)return;if(tab==='pessoas'&&[...dados.ausencias,...dados.extras].some(v=>ativo(v)&&v.colaboradorId===id))return alert('Este colaborador possui lançamentos vinculados. Use estorno ou corrija os dependentes antes da exclusão física.');const ok=await confirmarAcaoAdministrativa({titulo:'Excluir fisicamente registro de RH',descricao:'Use somente para cadastro duplicado ou teste. A auditoria será preservada.',motivoLabel:'Motivo obrigatório',confirmarTexto:'Excluir definitivamente',perigosa:true});if(!ok)return;try{await excluirComAuditoria({colecao:COL[tab],id,empresaId:x.empresaId,modulo:MOD[tab],motivo:ok.motivo,resumo:`Exclusão física RH · ${tab}`,snapshotAntes:x});emitirAlteracao('rh');await carregar()}catch(e){console.error(e);alert('Não foi possível excluir. Confira as Rules administrativas.')}}\n"""
s=s[:end]+extra+s[end:]
s=s.replace("${ativo(x)&&admin()?`<button type=\"button\" class=\"btn-acao perigo\" data-rh-estorno=\"${esc(x.id)}\">Estornar ADM</button>`:''}","${ativo(x)&&admin()?`<button type=\"button\" class=\"btn-acao perigo\" data-rh-estorno=\"${esc(x.id)}\">Estornar ADM</button><button type=\"button\" class=\"btn-acao perigo\" data-rh-excluir=\"${esc(x.id)}\">Excluir ADM</button>`:''}")
s=s.replace("document.querySelectorAll('[data-rh-estorno]').forEach(b=>b.addEventListener('click',()=>estornar(b.dataset.rhEstorno)))","document.querySelectorAll('[data-rh-estorno]').forEach(b=>b.addEventListener('click',()=>estornar(b.dataset.rhEstorno)));document.querySelectorAll('[data-rh-excluir]').forEach(b=>b.addEventListener('click',()=>excluirAdm(b.dataset.rhExcluir)))")
# troca calculo para periodo livre
s=s.replace("const calcular=(col,aus,hrs,set='')=>periodo.unico?resumoRHDatas(col,aus,hrs,dataInicio,dataFim,set):resumoRH(col,aus,hrs,inicio,fim,set);","const calcular=(col,aus,hrs,set='')=>resumoRHPeriodo(col,aus,hrs,dataInicio,dataFim,set);")
s=s.replace("const selecionados=new Set(pessoasRel.map(p=>p.id));const dentro=x=>x.data>=(periodo.unico?dataInicio:`${inicio}-01`)&&x.data<=(periodo.unico?dataFim:fimMes(fim))","const selecionados=new Set(pessoasRel.map(p=>p.id));const dentro=x=>x.data>=dataInicio&&x.data<=dataFim")
# injeta graficos antes do fim de render
needle="  else{$('rhTituloLista').textContent='Lançamentos de horas extras';"
if needle not in s: raise SystemExit('render extras nao encontrado')
# apos bloco else final, antes de fechamento render, localizar padrao\n}
marker="    else{$('rhTituloLista').textContent='Lançamentos de horas extras'"
# adiciona chamada antes do fechamento de render usando trecho final conhecido
old_end="else{$('rhTituloLista').textContent='Lançamentos de horas extras';$('rhNota').textContent='Cada lançamento identifica o colaborador e distingue 50% de 100%.';tabela(['Data','Colaborador','Setor','Horas 50%','Horas 100%'],registros,x=>[dataBR(x.data),nome(x.colaboradorId),x.setor,decimal(x.horas50),decimal(x.horas100)]);serie(['Mês','Horas 50%','Horas 100%','Total'],rel.linhas.map(l=>[l.mes,decimal(l.horas50),decimal(l.horas100),decimal(l.horas50+l.horas100)]));$('rhPorPessoaBox').classList.remove('hidden');$('rhPorSetorBox').classList.remove('hidden');$('rhPorPessoaTitulo').textContent='Horas por colaborador e setor';resumoPessoas(['Colaborador','Setor','Horas 50%','Horas 100%','Total'],pessoasRel.filter(ativo).map(p=>{const v=calcular([p],[],extras);return [p.nome,p.setor,decimal(v.horas50),decimal(v.horas100),decimal(v.horas50+v.horas100)]}).filter(row=>row[4]!=='0'));setorTabela('extras',pessoasRel,calcular,ausencias,extras)}\n}"
new_end=old_end[:-2]+"\n  renderGraficos({pessoas:pessoasRel,ausencias,extras,inicio:dataInicio,fim:dataFim,tabAtual:tab});window.dispatchEvent(new CustomEvent('sig:rh-kpis',{detail:{empresaId:empresa(),inicio:dataInicio,fim:dataFim,tab,rel}}));\n}"
if old_end not in s: raise SystemExit('final render nao encontrado')
s=s.replace(old_end,new_end)
# filtros e graficos/config helpers antes de setorTabela
insert_before="function setorTabela(k,pessoasRel,calcular,ausencias,extras){"
helpers=r'''function atualizarSetoresFiltro(){const s=$('rhSetor'),antes=s.value,lista=setoresConhecidos().sort((a,b)=>a.localeCompare(b,'pt-BR'));s.innerHTML='<option value="">Todos os setores</option>'+lista.map(x=>`<option>${esc(x)}</option>`).join('');if(lista.includes(antes))s.value=antes}
function atualizarFiltroPessoas(){const s=$('rhFiltroPessoa'),setor=$('rhSetor')?.value||'',antes=s.value,arr=dados.pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));s.innerHTML=`<option value="">${setor?'Todos do setor':'Todos'}</option>`+arr.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)} · ${esc(p.codigo)}</option>`).join('');if(arr.some(p=>p.id===antes))s.value=antes}
function barras(id,itens,{valor='valor',rotulo='rotulo',formata=v=>decimal(v),limite=8}={}){const host=$(id),arr=itens.slice(0,limite),max=Math.max(0,...arr.map(x=>Number(x[valor]||0)));host.innerHTML=arr.map(x=>`<div class="rh-bar-row"><div class="rh-bar-label"><strong>${esc(x[rotulo])}</strong><span>${esc(formata(Number(x[valor]||0)))}</span></div><div class="rh-bar-track"><i style="width:${max?Math.max(2,Number(x[valor]||0)/max*100):0}%"></i></div></div>`).join('')||'<div class="rh-empty">Sem dados no período.</div>'}
function renderGraficos({pessoas,ausencias,extras,inicio,fim,tabAtual}){if(tabAtual==='ausencias'){const r=rankingAbsenteismo(pessoas,ausencias,inicio,fim,$('rhSetor').value);$('rhGraficoTituloA').textContent='Ranking de absenteísmo';$('rhGraficoNotaA').textContent='Índice = horas ausentes ÷ jornada prevista no período.';barras('rhGraficoA',r.map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.taxa})),{formata:v=>pct(v)});$('rhGraficoTituloB').textContent='Ranking de faltas';$('rhGraficoNotaB').textContent='Quantidade de ocorrências classificadas como FALTA.';barras('rhGraficoB',[...r].sort((a,b)=>b.faltas-a.faltas).map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.faltas})),{formata:v=>String(v)})}else if(tabAtual==='extras'){const r=rankingHorasExtras(pessoas,extras,inicio,fim,$('rhSetor').value);$('rhGraficoTituloA').textContent='Horas extras por colaborador';$('rhGraficoNotaA').textContent='Total de horas 50% + 100%.';barras('rhGraficoA',r.map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.total})));const setores=[...new Set(r.map(x=>x.setor))].map(setor=>({rotulo:setor,valor:r.filter(x=>x.setor===setor).reduce((n,x)=>n+x.total,0)})).sort((a,b)=>b.valor-a.valor);$('rhGraficoTituloB').textContent='Horas extras por setor';$('rhGraficoNotaB').textContent='Concentração de horas extras no período.';barras('rhGraficoB',setores)}else{const r=turnoverPorSetor(pessoas,ausencias,extras,inicio,fim);$('rhGraficoTituloA').textContent='Turnover por setor';$('rhGraficoNotaA').textContent='Desligamentos ÷ quadro médio no período.';barras('rhGraficoA',r.map(x=>({rotulo:x.setor,valor:x.turnover})),{formata:v=>pct(v)});$('rhGraficoTituloB').textContent='Desligamentos por setor';$('rhGraficoNotaB').textContent='Volume absoluto de desligamentos.';barras('rhGraficoB',r.map(x=>({rotulo:x.setor,valor:x.demissoes})),{formata:v=>String(v)})}}
async function abrirConfigRh(){const emp=empresa();if(!emp)return alert('Selecione apenas uma empresa no cabeçalho.');const cfg=await carregarConfiguracaoModulo('rh',emp),setores=Array.isArray(cfg.setores)&&cfg.setores.length?cfg.setores:SETORES_PADRAO;await abrirConfiguracaoModulo('rh',{titulo:'Configurações · RH',telas:{pessoas:'Tela Colaboradores e quadro',ausencias:'Tela Absenteísmo',extras:'Tela Horas extras',avaliacoes:'Tela Avaliação 360°',acoes:'Tela Ações / Endomarketing'},extraHtml:`<label style="display:block;font-weight:700;margin-bottom:6px">Setores ativos</label><p style="margin:0 0 8px;color:#667085;font-size:12px">Um setor por linha. Nomes existentes no histórico continuam visíveis mesmo após alteração.</p><textarea id="rhConfigSetores" style="width:100%;min-height:150px;border:1px solid #d0d5dd;border-radius:10px;padding:10px">${esc(setores.join('\n'))}</textarea>`,coletarExtra:modal=>{const setores=[...new Set(String(modal.querySelector('#rhConfigSetores')?.value||'').split(/\r?\n/).map(x=>x.trim().toUpperCase()).filter(Boolean))];if(!setores.length)throw new Error('Cadastre ao menos um setor.');return{setores}},onSaved:novo=>{configRh=novo;atualizarSetoresFiltro();atualizarFiltroPessoas();trocar(tab)}})}
'''
if insert_before not in s: raise SystemExit('setorTabela nao encontrado')
s=s.replace(insert_before,helpers+insert_before)
# carregar config e filtros
old_car="async function carregar(){if(ocupado||!acesso())return;ocupado=true;try{if(perm('pessoas','lancar')||perm('pessoas','editar'))"
new_car="async function carregar(){if(ocupado||!acesso())return;ocupado=true;try{configRh=await carregarConfiguracaoModulo('rh',empresa());if(configRh.ativo===false&&!admin()){ $('rhAviso').textContent='O módulo de RH está desativado nas configurações.';$('rhAviso').classList.remove('hidden');return }if(perm('pessoas','lancar')||perm('pessoas','editar'))"
if old_car not in s: raise SystemExit('carregar inicio nao encontrado')
s=s.replace(old_car,new_car)
old_sel="const sel=$('rhFiltroPessoa'),antes=sel.value;sel.innerHTML='<option value=\"\">Todos</option>'+dados.pessoas.filter(ativo).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(p=>`<option value=\"${esc(p.id)}\">${esc(p.nome)} · ${esc(p.codigo)}</option>`).join('');sel.value=antes;render()"
s=s.replace(old_sel,"atualizarSetoresFiltro();atualizarFiltroPessoas();render()")
s=s.replace("l.href='rh.css?v=2'","l.href='rh.css?v=3'")
s=s.replace("window.addEventListener('sig:periodo-changed',()=>{if($('rhDiaInicio'))sincronizarPeriodo()})","window.addEventListener('sig:periodo-changed',()=>{if($('rhDataInicioFiltro'))sincronizarPeriodo()})")
s += "\nwindow.addEventListener('sig:module-config',e=>{if(e.detail?.modulo==='rh'){configRh={...configRh,...e.detail.config};if(!$('pagina-rh')?.classList.contains('hidden'))carregar()}});\n"
write(p,s)

# 6) Minha Mesa respeita configuracao do modulo
p='js/hr-agenda.js';s=read(p)
s=s.replace("import { $, db, state, esc, empresasSelecionadasIds, grupoAtualId } from './shared.js';","import { $, db, state, esc, empresasSelecionadasIds, grupoAtualId } from './shared.js';\nimport { carregarConfiguracaoModulo } from './module-settings.js';")
s=s.replace("async function carregar(){montar();if(busy||!$('mesaAcoesRhLista')||!state.usuario?.id)return;busy=true;try{const grupo=grupoAtualId(),empresas=empresasSelecionadasIds();","async function carregar(){montar();if(busy||!$('mesaAcoesRhLista')||!state.usuario?.id)return;busy=true;try{const grupo=grupoAtualId(),empresas=empresasSelecionadasIds();if(empresas.length===1){const cfg=await carregarConfiguracaoModulo('rh',empresas[0]);$('mesaAcoesRh').classList.toggle('hidden',cfg.minhaMesaAtiva===false);if(cfg.minhaMesaAtiva===false)return}else $('mesaAcoesRh').classList.remove('hidden');")
write(p,s)

# 7) estilo RH v2
p='rh.css';s=read(p)+r'''
#pagina-rh .rh-floating-actions{position:fixed;right:22px;bottom:22px;z-index:800;display:flex;gap:8px;padding:8px;border:1px solid #dbe3ea;border-radius:14px;background:rgba(255,255,255,.96);box-shadow:0 12px 34px rgba(16,42,67,.16);backdrop-filter:blur(8px)}
#pagina-rh .rh-filter-field input[type="date"]{min-width:150px}
#pagina-rh .rh-analytics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
#pagina-rh .rh-bars{display:grid;gap:11px}.rh-bar-row{display:grid;gap:5px}.rh-bar-label{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#40566a}.rh-bar-label strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rh-bar-track{height:9px;border-radius:999px;background:#edf2f5;overflow:hidden}.rh-bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#15354b,#20b6a5)}.rh-empty{padding:14px;color:#667085;font-size:12px;text-align:center}
@media(max-width:800px){#pagina-rh .rh-floating-actions{right:12px;bottom:12px}#pagina-rh .rh-analytics-grid{grid-template-columns:1fr}}
'''
write(p,s)

# 8) Rules: configuracoes de modulo + setores dinamicos; sem wildcard delete
p='firestore.rules';s=read(p)
s=s.replace("function rhSetorValido(setor) { return setor in ['ADM','LAJE','COMERCIAL','LOGISTICA','PRODUÇÃO','MOURÃO','MANUTENÇÃO']; }","function rhSetorValido(setor) { return setor is string && setor.size() > 0 && setor.size() <= 80; }")
anchor="    match /dashboardPreferencias/{usuarioId} {"
pos=s.find(anchor)
if pos<0: raise SystemExit('dashboardPreferencias nao encontrado')
# inserir bloco antes do dashboard prefs
block=r'''    match /configuracoesModulos/{id} {
      allow read: if usuarioAtivo() && documentoAcessivel(resource.data);
      allow create: if administrador() && documentoAcessivel(request.resource.data) &&
        request.resource.data.modulo is string && request.resource.data.modulo.size() > 0;
      allow update: if administrador() && documentoAcessivel(resource.data) &&
        request.resource.data.grupoId == resource.data.grupoId &&
        request.resource.data.empresaId == resource.data.empresaId &&
        request.resource.data.modulo == resource.data.modulo;
      allow delete: if false;
    }

'''
s=s[:pos]+block+s[pos:]
write(p,s)

# 9) cache do app
p='index.html';s=read(p).replace('app.js?v=14','app.js?v=15');write(p,s)

# 10) testes e QA
write('tests/hr-v2.test.mjs',r'''import test from 'node:test';import assert from 'node:assert/strict';import { resumoRHPeriodo } from '../js/hr-metrics.js';import { rankingAbsenteismo, rankingHorasExtras, turnoverPorSetor } from '../js/hr-analytics.js';
const pessoas=[{id:'a',nome:'ANA',setor:'ADM',admissao:'2026-01-01',demissao:'',jornadaMensalHoras:220,status:'ativo'},{id:'b',nome:'BIA',setor:'PRODUÇÃO',admissao:'2026-01-01',demissao:'2026-09-10',jornadaMensalHoras:220,status:'ativo'}];
const aus=[{colaboradorId:'a',setor:'ADM',data:'2026-09-02',tipo:'FALTA',horas:8,status:'ativo'},{colaboradorId:'a',setor:'ADM',data:'2026-09-03',tipo:'ATESTADO',horas:4,status:'ativo'}];
const ext=[{colaboradorId:'a',setor:'ADM',data:'2026-09-05',horas50:2,horas100:1,status:'ativo'}];
test('periodo livre soma parcial',()=>{const r=resumoRHPeriodo(pessoas,aus,ext,'2026-09-01','2026-09-15');assert.equal(r.horasAusentes,12);assert.equal(r.horas50,2);assert.equal(r.horas100,1)});
test('rankings e turnover por setor',()=>{assert.equal(rankingAbsenteismo(pessoas,aus,'2026-09-01','2026-09-15')[0].nome,'ANA');assert.equal(rankingHorasExtras(pessoas,ext,'2026-09-01','2026-09-15')[0].total,3);assert.equal(turnoverPorSetor(pessoas,aus,ext,'2026-09-01','2026-09-30')[0].setor,'PRODUÇÃO')});
''')
write('.github/workflows/rh-v2-check.yml',r'''name: RH v2 Contract Check
on:
  pull_request:
    paths: ['js/hr-people.js','js/hr-metrics.js','js/hr-analytics.js','js/module-settings.js','js/hr-agenda.js','rh.css','firestore.rules','tests/hr-v2.test.mjs']
  push:
    branches: ['feature/rh-v2-config-modulos']
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          node --check js/hr-people.js
          node --check js/hr-metrics.js
          node --check js/hr-analytics.js
          node --check js/module-settings.js
          node --check js/hr-agenda.js
          node --test tests/hr-metrics.test.mjs tests/hr-v2.test.mjs
          grep -q 'match /configuracoesModulos/{id}' firestore.rules
          grep -q 'Excluir ADM' js/hr-people.js
          grep -q 'rhDataInicioFiltro' js/hr-people.js
          grep -q 'Ranking de absenteísmo' js/hr-people.js
          git diff --check HEAD^ HEAD || true
''')
print('RH v2 aplicado')
