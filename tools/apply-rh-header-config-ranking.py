from pathlib import Path
import re

R = Path(__file__).resolve().parents[1]

def rw(p): return (R / p).read_text(encoding='utf-8')
def wr(p, s): (R / p).write_text(s, encoding='utf-8')

p = 'js/hr-people.js'
s = rw(p)

s = s.replace(
"registrarModuloConfiguravel('rh',{titulo:'Configurações · RH',telas:{pessoas:'Colaboradores e quadro',ausencias:'Absenteísmo',extras:'Horas extras'}});",
"registrarModuloConfiguravel('rh',{titulo:'Configurações · RH',telas:{pessoas:'Colaboradores e quadro',ausencias:'Absenteísmo',extras:'Horas extras',avaliacoes:'Avaliação 360°',acoes:'Ações / Endomarketing'},abrir:()=>abrirConfigRh()});"
)

old_head = '''s.innerHTML=`<div class="pagina-cabecalho production-head"><div><span class="eyebrow">PESSOAS</span><h2>RH · Quadro e indicadores</h2><p>Admissões, demissões, ausências e horas extras por colaborador.</p></div><div class="acoes-cabecalho"><button id="rhConfig" class="btn-secundario" type="button">⚙ Configurações RH</button><button id="rhNovo" class="btn-primario" type="button">+ Novo registro</button><button id="rhAtualizar" class="btn-secundario" type="button">Atualizar</button></div></div><div id="rhFloatingActions" class="rh-floating-actions"><button id="rhNovoFloat" class="btn-primario" type="button">+ Novo</button><button id="rhAtualizarFloat" class="btn-secundario" type="button">Atualizar</button></div>\n  <div id="rhAviso" class="modulo-aviso hidden"></div>\n  <div class="fleet-tabs"><button class="fleet-tab" data-rh-tab="pessoas" type="button">Colaboradores e quadro</button><button class="fleet-tab" data-rh-tab="ausencias" type="button">Absenteísmo</button><button class="fleet-tab" data-rh-tab="extras" type="button">Horas extras</button></div>'''
new_head = '''s.innerHTML=`<div class="rh-module-head"><div class="pagina-cabecalho production-head"><div><span class="eyebrow">PESSOAS</span><h2>RH · Quadro e indicadores</h2><p>Admissões, demissões, ausências e horas extras por colaborador.</p></div><div class="acoes-cabecalho"><button id="rhNovo" class="btn-primario" type="button">+ Novo registro</button><button id="rhAtualizar" class="btn-secundario" type="button">Atualizar</button></div></div><div class="fleet-tabs"><button class="fleet-tab" data-rh-tab="pessoas" type="button">Colaboradores e quadro</button><button class="fleet-tab" data-rh-tab="ausencias" type="button">Absenteísmo</button><button class="fleet-tab" data-rh-tab="extras" type="button">Horas extras</button></div></div>\n  <div id="rhAviso" class="modulo-aviso hidden"></div>'''
if old_head not in s:
    raise SystemExit('cabecalho RH esperado nao encontrado')
s = s.replace(old_head, new_head)

old_graph = '''<section id="rhGraficos" class="rh-analytics-grid"><article class="lista-card"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloA">Indicadores por colaborador</h3><p id="rhGraficoNotaA">Ranking do período selecionado.</p></div></div><div id="rhGraficoA" class="rh-bars"></div></article><article class="lista-card"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloB">Indicadores por setor</h3><p id="rhGraficoNotaB">Comparativo do período selecionado.</p></div></div><div id="rhGraficoB" class="rh-bars"></div></article></section>'''
new_graph = '''<section id="rhGraficos" class="lista-card rh-graficos-card"><div class="lista-cabecalho rh-ranking-toolbar"><div><h3>Gráficos e rankings</h3><p>Os gráficos respeitam período, setor e colaborador selecionados acima.</p></div><label class="rh-filter-field" for="rhRankingAgrupamento">Agrupar ranking por<select id="rhRankingAgrupamento"><option value="colaborador">Colaborador</option><option value="setor">Setor</option></select></label></div><div class="rh-analytics-grid"><article class="rh-chart-panel"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloA">Indicadores</h3><p id="rhGraficoNotaA">Ranking do período selecionado.</p></div></div><div id="rhGraficoA" class="rh-bars"></div></article><article class="rh-chart-panel"><div class="lista-cabecalho"><div><h3 id="rhGraficoTituloB">Comparativo</h3><p id="rhGraficoNotaB">Comparativo do período selecionado.</p></div></div><div id="rhGraficoB" class="rh-bars"></div></article></div></section>'''
if old_graph not in s:
    raise SystemExit('bloco de graficos RH esperado nao encontrado')
s = s.replace(old_graph, new_graph)

old_listeners = "$('rhNovo').addEventListener('click',novo);$('rhAtualizar').addEventListener('click',carregar);$('rhNovoFloat').addEventListener('click',novo);$('rhAtualizarFloat').addEventListener('click',carregar);$('rhConfig').addEventListener('click',abrirConfigRh);"
new_listeners = "$('rhNovo').addEventListener('click',novo);$('rhAtualizar').addEventListener('click',carregar);$('rhRankingAgrupamento').addEventListener('change',render);"
if old_listeners not in s:
    raise SystemExit('listeners RH esperados nao encontrados')
s = s.replace(old_listeners, new_listeners)

s = s.replace("$('rhNovoFloat')?.classList.toggle('hidden',!pode);", "")
s = s.replace("$('rhNovoFloat').textContent=k==='pessoas'?'+ Admitir':'+ Novo';render()}", "const agr=$('rhRankingAgrupamento');if(agr){agr.disabled=k==='pessoas';if(k==='pessoas')agr.value='setor'};render()}")

pattern = r"function renderGraficos\(\{pessoas,ausencias,extras,inicio,fim,tabAtual\}\)\{.*?\}\nasync function abrirConfigRh"
new_render = '''function renderGraficos({pessoas,ausencias,extras,inicio,fim,tabAtual}){
  const agrup=$('rhRankingAgrupamento')?.value||'colaborador';
  if(tabAtual==='ausencias'){
    const r=rankingAbsenteismo(pessoas,ausencias,inicio,fim,$('rhSetor').value);
    if(agrup==='setor'){
      const setores=[...new Set(pessoas.filter(ativo).map(p=>p.setor))].map(setor=>{const m=resumoRHPeriodo(pessoas,ausencias,[],inicio,fim,setor);const faltas=ausencias.filter(a=>ativo(a)&&a.data>=inicio&&a.data<=fim&&a.tipo==='FALTA'&&a.setor===setor).length;return{rotulo:setor,taxa:m.absenteismo,faltas}}).filter(x=>x.taxa>0||x.faltas>0).sort((a,b)=>b.taxa-a.taxa);
      $('rhGraficoTituloA').textContent='Absenteísmo por setor';$('rhGraficoNotaA').textContent='Índice = horas ausentes ÷ jornada prevista do setor.';barras('rhGraficoA',setores.map(x=>({rotulo:x.rotulo,valor:x.taxa})),{formata:v=>pct(v)});
      $('rhGraficoTituloB').textContent='Faltas por setor';$('rhGraficoNotaB').textContent='Ocorrências classificadas como FALTA.';barras('rhGraficoB',[...setores].sort((a,b)=>b.faltas-a.faltas).map(x=>({rotulo:x.rotulo,valor:x.faltas})),{formata:v=>String(v)});
    }else{
      $('rhGraficoTituloA').textContent='Ranking de absenteísmo por colaborador';$('rhGraficoNotaA').textContent='Índice = horas ausentes ÷ jornada prevista no período.';barras('rhGraficoA',r.map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.taxa})),{formata:v=>pct(v)});
      $('rhGraficoTituloB').textContent='Ranking de faltas por colaborador';$('rhGraficoNotaB').textContent='Quantidade de ocorrências classificadas como FALTA.';barras('rhGraficoB',[...r].sort((a,b)=>b.faltas-a.faltas).map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.faltas})),{formata:v=>String(v)});
    }
  }else if(tabAtual==='extras'){
    const r=rankingHorasExtras(pessoas,extras,inicio,fim,$('rhSetor').value);
    if(agrup==='setor'){
      const setores=[...new Set(pessoas.filter(ativo).map(p=>p.setor))].map(setor=>{const m=resumoRHPeriodo(pessoas,[],extras,inicio,fim,setor);return{rotulo:setor,h50:m.horas50,h100:m.horas100,total:m.horas50+m.horas100}}).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
      $('rhGraficoTituloA').textContent='Horas extras por setor';$('rhGraficoNotaA').textContent='Total de horas 50% + 100% por setor.';barras('rhGraficoA',setores.map(x=>({rotulo:x.rotulo,valor:x.total})));
      $('rhGraficoTituloB').textContent='Horas 100% por setor';$('rhGraficoNotaB').textContent='Concentração das horas com adicional de 100%.';barras('rhGraficoB',setores.map(x=>({rotulo:x.rotulo,valor:x.h100})));
    }else{
      $('rhGraficoTituloA').textContent='Horas extras por colaborador';$('rhGraficoNotaA').textContent='Total de horas 50% + 100%.';barras('rhGraficoA',r.map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.total})));
      $('rhGraficoTituloB').textContent='Horas 100% por colaborador';$('rhGraficoNotaB').textContent='Ranking das horas com adicional de 100%.';barras('rhGraficoB',r.map(x=>({rotulo:`${x.nome} · ${x.setor}`,valor:x.h100})));
    }
  }else{
    const r=turnoverPorSetor(pessoas,ausencias,extras,inicio,fim);$('rhGraficoTituloA').textContent='Turnover por setor';$('rhGraficoNotaA').textContent='Desligamentos ÷ quadro médio no período.';barras('rhGraficoA',r.map(x=>({rotulo:x.setor,valor:x.turnover})),{formata:v=>pct(v)});$('rhGraficoTituloB').textContent='Desligamentos por setor';$('rhGraficoNotaB').textContent='Volume absoluto de desligamentos.';barras('rhGraficoB',r.map(x=>({rotulo:x.setor,valor:x.demissoes})),{formata:v=>String(v)})
  }
}
async function abrirConfigRh'''
s2, n = re.subn(pattern, new_render, s, flags=re.S)
if n != 1:
    raise SystemExit(f'renderGraficos nao substituido: {n}')
s = s2
wr(p, s)

p='js/module-settings.js'
s=rw(p)
pattern=r"function instalarBotoes\(\)\{.*?\}\nconst obs=new MutationObserver\(instalarBotoes\);.*$"
new_tail='''function abrirCentralConfiguracoes(){
  if(!admin())return alert('Configurações de módulos são exclusivas do Administrador.');
  const emp=empresaUnicaSelecionadaId();if(!emp)return alert('Selecione apenas uma empresa no cabeçalho.');
  css();const mods=[...registro.values()].sort((a,b)=>String(a.titulo||a.modulo).localeCompare(String(b.titulo||b.modulo),'pt-BR'));const overlay=document.createElement('div');overlay.className='module-config-overlay';overlay.innerHTML=`<section class="module-config-card" role="dialog" aria-modal="true"><h3>Configurações dos módulos</h3><p>Administre disponibilidade de telas, Dashboard e Minha Mesa por empresa. As permissões dos perfis continuam independentes.</p><div class="module-config-grid">${mods.map(m=>`<button type="button" class="module-config-line module-config-entry" data-modulo="${esc(m.modulo)}"><span><strong>${esc(m.titulo||m.modulo)}</strong><small>Abrir configurações</small></span><span>→</span></button>`).join('')||'<p>Nenhum módulo configurável registrado.</p>'}</div><div class="module-config-actions"><button type="button" class="btn-secundario" data-cancelar>Fechar</button></div></section>`;document.body.appendChild(overlay);const fechar=()=>overlay.remove();overlay.querySelector('[data-cancelar]').onclick=fechar;overlay.addEventListener('click',e=>{if(e.target===overlay)fechar()});overlay.querySelectorAll('[data-modulo]').forEach(b=>b.onclick=()=>{const meta=registro.get(b.dataset.modulo)||{};fechar();if(typeof meta.abrir==='function')meta.abrir();else abrirConfiguracaoModulo(b.dataset.modulo,{titulo:meta.titulo||`Configurações · ${b.dataset.modulo}`,telas:meta.telas||{}})});
}
function instalarBotoes(){
  if(!admin())return;const grid=document.querySelector('#pagina-administracao .admin-grid');if(!grid||document.getElementById('cardConfiguracoesModulos'))return;const b=document.createElement('button');b.id='cardConfiguracoesModulos';b.className='admin-card admin-card-button';b.type='button';b.innerHTML='<span class="admin-card-tag">CONFIGURAÇÕES</span><h3>Módulos do SIG</h3><p>Ative telas e defina participação no Dashboard e na Minha Mesa.</p><span class="admin-card-link">Configurar módulos →</span>';b.onclick=abrirCentralConfiguracoes;grid.appendChild(b)
}
const obs=new MutationObserver(instalarBotoes);if(document.body)obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('sig:ready',instalarBotoes);window.addEventListener('sig:page',instalarBotoes);'''
s2,n=re.subn(pattern,new_tail,s,flags=re.S)
if n!=1: raise SystemExit(f'tail module-settings nao substituido: {n}')
wr(p,s2)

p='.github/workflows/hr-people-check.yml'
s=rw(p)
needle="          grep -q 'participanteUsuarios' js/hr-agenda.js\n"
extra="          grep -q 'participanteUsuarios' js/hr-agenda.js\n          grep -q 'rhRankingAgrupamento' js/hr-people.js\n          grep -q 'rh-module-head' js/hr-people.js\n          grep -q 'cardConfiguracoesModulos' js/module-settings.js\n"
if needle in s and 'rhRankingAgrupamento' not in s:s=s.replace(needle,extra)
wr(p,s)
print('RH header/config/ranking patch aplicado')
