import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria } from "./admin-actions.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";

const LEGADO=Object.freeze({
  recurso:["LAJE","MOURÃO","MAQ.1","MAQ.2"],
  item:["TRELIÇA","PAINEL","PAINEL E TRELIÇA","MOURÃO","COBOGÓ","COMPENSADOR","BANDEJA","NA"]
});
const TIPOS={recurso:"Produções / máquinas",item:"Itens produzidos"};
const VINCULOS_PADRAO={
  LAJE:["TRELIÇA","PAINEL","PAINEL E TRELIÇA"],
  "MOURÃO":["MOURÃO"],
  "MAQ.1":["BANDEJA"],
  "MAQ.2":["BANDEJA"]
};

let registros=[],cadastros=[],vinculos=[],responsaveis=[],editId=null,busy=false;
const pagina=()=>$("pagina-producao");
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const norm=v=>String(v||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const emp=()=>empresaUnicaSelecionadaId();
const podeVer=()=>admin()||["visualizar","lancar","editar","cadastros"].some(a=>permite("producao",a));
const podeLancar=()=>admin()||permite("producao","lancar");
const podeEditar=()=>admin()||permite("producao","editar");
const podeCadastros=()=>admin()||permite("producao","cadastros");

function tipoBloco(recurso){
  const r=norm(recurso).replaceAll(" ","");
  if(r==="MAQ.1"||r==="MAQ1"||r==="MAQ.2"||r==="MAQ2")return"maquina";
  if(r.startsWith("LAJE"))return"laje";
  if(r.startsWith("MOURAO"))return"mourao";
  return"outro";
}
function unidadeRecurso(recurso){
  const t=tipoBloco(recurso);
  return t==="maquina"?"BANDEJA":t==="laje"?"M²":t==="mourao"?"UN":"UN";
}
function unidadeTexto(u){return u==="M²"?"m²":u==="BANDEJA"?"bandejas":"un"}
function fmt(v,d=2){return n(v).toLocaleString("pt-BR",{maximumFractionDigits:d})}
function dataHoje(){return new Date().toISOString().slice(0,10)}

function garantirCss(){if(document.querySelector('link[href^="production.css"]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=2";document.head.appendChild(l)}
function garantirMenu(){
  const nav=document.querySelector(".sidebar-menu");if(!nav)return;
  let b=$("menuProducao");
  if(!b){b=document.createElement("button");b.id="menuProducao";b.className="menu-item hidden";b.dataset.pagina="producao";b.type="button";b.textContent="Produção";const ref=$("menuComercial")||$("menuControladoria")||nav.querySelector(".menu-separador");if(ref)nav.insertBefore(b,ref);else nav.appendChild(b)}
  b.classList.toggle("hidden",!podeVer());
  if(b.dataset.productionBound!=="1"){b.dataset.productionBound="1";b.addEventListener("click",async e=>{e.preventDefault();e.stopImmediatePropagation();if(!podeVer())return;abrirPagina("producao");await carregar()},true)}
}

function criarPagina(){
  if(pagina())return;const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-producao";s.className="pagina hidden production-page";s.innerHTML=`
  <div class="pagina-cabecalho production-head">
    <div><span class="eyebrow">INDÚSTRIA</span><h2>Produção</h2><p>Produção industrial por bloco, item, unidade de medida e produtividade das máquinas.</p></div>
    <div class="acoes-cabecalho"><button id="btnProducaoCadastros" class="btn-secundario" type="button">Cadastros</button><button id="btnNovaProducao" class="btn-primario" type="button">+ Novo lançamento</button><button id="btnAtualizarProducao" class="btn-secundario" type="button">Atualizar</button></div>
  </div>
  <div id="producaoAviso" class="modulo-aviso hidden"></div>

  <div class="production-kpis production-kpis-industria">
    <div class="kpi-card"><span>Máquinas 1 + 2</span><strong id="prodKpiMaquinas">—</strong><small>bandejas produzidas</small></div>
    <div class="kpi-card"><span>Produção de laje</span><strong id="prodKpiLaje">—</strong><small>m² produzidos</small></div>
    <div class="kpi-card"><span>Produção de mourão</span><strong id="prodKpiMourao">—</strong><small>unidades produzidas</small></div>
    <div class="kpi-card"><span>Média máquinas</span><strong id="prodKpiMediaMaq">—</strong><small>bandejas / hora</small></div>
    <div class="kpi-card"><span>Lançamentos</span><strong id="prodKpiRegs">—</strong><small>registros ativos</small></div>
  </div>

  <section id="producaoFormBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3 id="producaoFormTitulo">Novo lançamento</h3><p>O item é filtrado conforme a produção selecionada. Responsáveis vêm do RH.</p></div></div>
    <form id="formProducao"><div class="form-grid form-grid-3">
      <div class="campo"><label for="prodData">Data</label><input id="prodData" type="date" required></div>
      <div class="campo"><label for="prodRecurso">Produção / máquina</label><select id="prodRecurso" required></select></div>
      <div class="campo"><label for="prodItem">Item</label><select id="prodItem" required></select><small id="prodItemAjuda">Selecione a produção para carregar os itens vinculados.</small></div>
      <div class="campo"><label id="prodQuantidadeLabel" for="prodQuantidade">Quantidade produzida</label><input id="prodQuantidade" type="number" min="0" step="1" required></div>
      <div class="campo"><label for="prodUnidade">Unidade de medida</label><input id="prodUnidade" type="text" readonly></div>
      <div class="campo"><label id="prodHorasLabel" for="prodHoras">Horas trabalhadas</label><input id="prodHoras" type="number" min="0" step="0.01"></div>
      <div class="campo"><label for="prodMedia">Produtividade da máquina</label><input id="prodMedia" type="text" readonly value="—"></div>
      <div class="campo campo-span-2"><label for="prodConcretador">Responsável da produção</label><select id="prodConcretador" required></select><small>Origem: RH · cargo com função Produção / Indústria.</small></div>
    </div><div class="form-acoes"><button id="btnCancelarProducao" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar lançamento</button></div><p id="prodFormMsg" class="mensagem-form"></p></form>
  </section>

  <section id="producaoCadastrosBox" class="form-card hidden">
    <div class="form-card-titulo"><div><h3>Cadastros da Indústria</h3><p>Administre produções, itens e a relação Produção × Item.</p></div><button id="btnFecharCadastrosProducao" class="btn-secundario" type="button">Fechar</button></div>
    <div class="production-master-grid production-master-grid-2">
      ${Object.entries(TIPOS).map(([k,l])=>`<div class="production-master"><h4>${l}</h4><div class="production-master-add"><input data-master-input="${k}" placeholder="Novo cadastro"><button class="btn-secundario" data-master-add="${k}" type="button">Adicionar</button></div><div data-master-list="${k}"></div></div>`).join("")}
    </div>
    <div class="production-link-box">
      <div><h4>Produção × Item</h4><p>Ao lançar uma produção, somente os itens vinculados aqui serão apresentados. Se não houver vínculo explícito, o SIG usa o padrão legado.</p></div>
      <div class="production-link-form"><select id="prodVinculoRecurso"></select><select id="prodVinculoItem"></select><button id="btnProdVincularItem" class="btn-primario" type="button">Vincular item</button></div>
      <div id="prodVinculosLista" class="tabela-container"></div>
    </div>
    <p id="prodMasterMsg" class="mensagem-form"></p>
  </section>

  <section class="lista-card">
    <div class="lista-cabecalho production-toolbar"><div><h3>Análise da produção</h3><p>Totais separados por unidade de medida para evitar somar bandejas, m² e unidades como se fossem iguais.</p></div>
      <div class="production-filtros"><select id="prodFiltroAno"></select><select id="prodFiltroMes"><option value="">Ano inteiro</option>${Array.from({length:12},(_,i)=>`<option value="${String(i+1).padStart(2,"0")}">${new Date(2026,i,1).toLocaleString("pt-BR",{month:"long"})}</option>`).join("")}</select><select id="prodFiltroRecurso"><option value="">Todas as produções</option></select><select id="prodFiltroItem"><option value="">Todos os itens</option></select></div>
    </div>
    <div class="production-charts production-charts-industria">
      <div class="production-card"><h4>Máquinas · total por máquina</h4><div id="prodGraficoMaquinas" class="production-bars"></div></div>
      <div class="production-card"><h4>Laje · total por item (m²)</h4><div id="prodGraficoLaje" class="production-bars"></div></div>
      <div class="production-card"><h4>Mourão · total por item (un)</h4><div id="prodGraficoMourao" class="production-bars"></div></div>
      <div class="production-card"><h4>Máquinas · bandejas/hora</h4><div id="prodGraficoMedia" class="production-bars"></div></div>
    </div>
  </section>

  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Total de produção por item</h3><p>Detalhamento de cada item dentro de sua produção.</p></div></div><div id="prodResumoItens" class="production-item-groups"></div></section>

  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Histórico de lançamentos</h3><p id="prodQtdRegistros">—</p></div><span class="production-history-note">Estornos permanecem visíveis e não entram nos indicadores.</span></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Produção</th><th>Item</th><th>Total</th><th>Horas</th><th>Produtividade</th><th>Responsável</th><th>Ações</th></tr></thead><tbody id="prodLista"></tbody></table></div></section>`;
  main.appendChild(s);ligarEventos();
}

function listaCadastros(tipo){
  const mapa=new Map((LEGADO[tipo]||[]).map(nome=>[norm(nome),{id:"",nome,ativo:true,legado:true}]));
  cadastros.filter(x=>x.tipo===tipo&&x.empresaId===emp()).forEach(x=>mapa.set(norm(x.nome),{...x,legado:false}));
  return [...mapa.values()]
}
function producoesAtivas(){return listaCadastros("recurso").filter(x=>x.ativo!==false).map(x=>x.nome)}
function itensAtivos(){return listaCadastros("item").filter(x=>x.ativo!==false).map(x=>x.nome)}
function opcoesLista(valores,{vazio=true,label="Selecione..."}={}){return `${vazio?`<option value="">${label}</option>`:""}${[...new Set(valores)].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}`}
function itensParaProducao(recurso){
  if(!recurso)return[];
  const todos=vinculos.filter(x=>x.empresaId===emp()&&norm(x.recurso)===norm(recurso));
  if(todos.length)return todos.filter(x=>x.ativo!==false).map(x=>x.item).filter(Boolean);
  const padrao=VINCULOS_PADRAO[Object.keys(VINCULOS_PADRAO).find(k=>norm(k)===norm(recurso))]||[];
  return padrao.length?padrao:itensAtivos()
}
function preencherResponsaveis(valor=""){
  const s=$("prodConcretador");if(!s)return;const atual=valor||s.value||"";
  const nomes=responsaveis.map(x=>x.nome).filter(Boolean).sort((a,b)=>a.localeCompare(b,"pt-BR"));
  s.innerHTML='<option value="">Selecione...</option>'+nomes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(atual&&![...s.options].some(o=>o.value===atual))s.add(new Option(`${atual} · vínculo anterior`,atual));
  s.value=atual
}
function atualizarItemDoForm(valor=""){
  const r=$("prodRecurso")?.value||"",s=$("prodItem");if(!s)return;
  const itens=itensParaProducao(r);s.innerHTML=opcoesLista(itens,{label:r?"Selecione o item...":"Selecione a produção primeiro"});
  if(valor&&![...s.options].some(o=>o.value===valor))s.add(new Option(`${valor} · histórico`,valor));if(valor)s.value=valor;
  if($("prodItemAjuda"))$("prodItemAjuda").textContent=r?(itens.length?`${itens.length} item(ns) vinculado(s) a ${r}.`:"Nenhum item ativo vinculado a esta produção."):"Selecione a produção para carregar os itens vinculados."
}
function atualizarMetricaForm(){
  const r=$("prodRecurso")?.value||"",tipo=tipoBloco(r),u=unidadeRecurso(r);
  if($("prodUnidade"))$("prodUnidade").value=unidadeTexto(u);
  if($("prodQuantidadeLabel"))$("prodQuantidadeLabel").textContent=tipo==="maquina"?"Bandejas produzidas":tipo==="laje"?"Área produzida (m²)":tipo==="mourao"?"Unidades produzidas":"Quantidade produzida";
  const q=$("prodQuantidade");if(q)q.step=tipo==="laje"?"0.01":"1";
  if($("prodHorasLabel"))$("prodHorasLabel").textContent=tipo==="maquina"?"Horas trabalhadas":"Horas trabalhadas (opcional)";
  calcularMedia()
}
function atualizarSelects(){
  const r=$("prodRecurso"),fr=$("prodFiltroRecurso"),fi=$("prodFiltroItem"),vr=r?.value,vfr=fr?.value,vfi=fi?.value;
  if(r)r.innerHTML=opcoesLista(producoesAtivas());
  if(fr)fr.innerHTML='<option value="">Todas as produções</option>'+opcoesLista(producoesAtivas(),{vazio:false});
  const itensFiltro=vfr?itensParaProducao(vfr):itensAtivos();if(fi)fi.innerHTML='<option value="">Todos os itens</option>'+opcoesLista(itensFiltro,{vazio:false});
  if(r&&vr&&[...r.options].some(o=>o.value===vr))r.value=vr;if(fr&&vfr&&[...fr.options].some(o=>o.value===vfr))fr.value=vfr;if(fi&&vfi&&[...fi.options].some(o=>o.value===vfi))fi.value=vfi;
  atualizarItemDoForm();preencherResponsaveis();atualizarMetricaForm();atualizarVinculoSelects()
}
function atualizarVinculoSelects(){
  const r=$("prodVinculoRecurso"),i=$("prodVinculoItem"),vr=r?.value,vi=i?.value;
  if(r){r.innerHTML=opcoesLista(producoesAtivas());if(vr&&[...r.options].some(o=>o.value===vr))r.value=vr}
  if(i){i.innerHTML=opcoesLista(itensAtivos());if(vi&&[...i.options].some(o=>o.value===vi))i.value=vi}
}
function anosDisponiveis(){const atual=new Date().getFullYear(),set=new Set([atual,...registros.map(x=>Number(String(x.data||"").slice(0,4))).filter(Boolean)]);return [...set].sort((a,b)=>b-a)}
function atualizarFiltroAno(){const s=$("prodFiltroAno"),atual=s?.value||String(new Date().getFullYear());if(!s)return;s.innerHTML=anosDisponiveis().map(a=>`<option value="${a}">${a}</option>`).join("");if([...s.options].some(o=>o.value===atual))s.value=atual}
function baseFiltrada(){const ano=$("prodFiltroAno")?.value||"",mes=$("prodFiltroMes")?.value||"",rec=$("prodFiltroRecurso")?.value||"",item=$("prodFiltroItem")?.value||"";return registros.filter(x=>(!ano||String(x.data||"").startsWith(ano))&&(!mes||String(x.data||"").slice(5,7)===mes)&&(!rec||x.recurso===rec)&&(!item||x.item===item))}
function barras(alvo,dados,{sufixo=""}={}){const el=$(alvo);if(!el)return;if(!dados.length){el.innerHTML='<p class="production-empty">Sem dados no filtro selecionado.</p>';return}const max=Math.max(...dados.map(x=>n(x.valor)),1);el.innerHTML=dados.map(x=>`<div class="production-bar-row"><span title="${esc(x.label)}">${esc(x.label)}</span><div><i style="width:${Math.max(2,n(x.valor)/max*100)}%"></i></div><strong>${fmt(x.valor)}${sufixo}</strong></div>`).join("")}
function somarPor(arr,chave){const out={};arr.forEach(x=>{const k=typeof chave==="function"?chave(x):x[chave]||"Não informado";out[k]=(out[k]||0)+n(x.quantidade)});return out}
function renderResumoItens(arr){
  const host=$("prodResumoItens");if(!host)return;const grupos={};
  arr.forEach(x=>{const r=x.recurso||"Não informado",item=x.item||"Não informado";grupos[r]??={unidade:unidadeRecurso(r),itens:{}};grupos[r].itens[item]=(grupos[r].itens[item]||0)+n(x.quantidade)});
  host.innerHTML=Object.entries(grupos).sort(([a],[b])=>a.localeCompare(b,"pt-BR")).map(([recurso,g])=>{const itens=Object.entries(g.itens).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...itens.map(x=>x[1]));return`<div class="production-item-group"><div class="production-item-group-head"><strong>${esc(recurso)}</strong><span>${unidadeTexto(g.unidade)}</span></div><div class="production-bars">${itens.map(([item,valor])=>`<div class="production-bar-row"><span title="${esc(item)}">${esc(item)}</span><div><i style="width:${Math.max(2,valor/max*100)}%"></i></div><strong>${fmt(valor)} ${unidadeTexto(g.unidade)}</strong></div>`).join("")}</div></div>`}).join("")||'<p class="production-empty">Sem produção no filtro selecionado.</p>'
}
function render(){
  const historico=baseFiltrada(),arr=historico.filter(x=>x.status!=="estornado");
  const maquinas=arr.filter(x=>tipoBloco(x.recurso)==="maquina"),lajes=arr.filter(x=>tipoBloco(x.recurso)==="laje"),mourao=arr.filter(x=>tipoBloco(x.recurso)==="mourao");
  const qMaq=maquinas.reduce((s,x)=>s+n(x.quantidade),0),hMaq=maquinas.reduce((s,x)=>s+n(x.horasTrabalhadas),0),qLaje=lajes.reduce((s,x)=>s+n(x.quantidade),0),qMourao=mourao.reduce((s,x)=>s+n(x.quantidade),0);
  $("prodKpiMaquinas").textContent=fmt(qMaq);$("prodKpiLaje").textContent=fmt(qLaje);$("prodKpiMourao").textContent=fmt(qMourao,0);$("prodKpiMediaMaq").textContent=hMaq?`${fmt(qMaq/hMaq)} b/h`:"—";$("prodKpiRegs").textContent=String(arr.length);$("prodQtdRegistros").textContent=`${historico.length} lançamento(s) no filtro · ${arr.length} ativo(s)`;

  barras("prodGraficoMaquinas",Object.entries(somarPor(maquinas,"recurso")).map(([label,valor])=>({label,valor})).sort((a,b)=>b.valor-a.valor),{sufixo:" b"});
  barras("prodGraficoLaje",Object.entries(somarPor(lajes,"item")).map(([label,valor])=>({label,valor})).sort((a,b)=>b.valor-a.valor),{sufixo:" m²"});
  barras("prodGraficoMourao",Object.entries(somarPor(mourao,"item")).map(([label,valor])=>({label,valor})).sort((a,b)=>b.valor-a.valor),{sufixo:" un"});
  const rate={};maquinas.forEach(x=>{const k=x.recurso||"Máquina";rate[k]??={q:0,h:0};rate[k].q+=n(x.quantidade);rate[k].h+=n(x.horasTrabalhadas)});barras("prodGraficoMedia",Object.entries(rate).map(([label,v])=>({label,valor:v.h?v.q/v.h:0})).sort((a,b)=>b.valor-a.valor),{sufixo:" b/h"});
  renderResumoItens(arr);

  const tb=$("prodLista");if(tb)tb.innerHTML=historico.sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))).map(x=>{const u=x.unidadeMedida||unidadeRecurso(x.recurso),rate=n(x.horasTrabalhadas)?n(x.quantidade)/n(x.horasTrabalhadas):0;return`<tr class="${x.status==="estornado"?"sig-admin-estornado":""}"><td>${dataBr(x.data)}</td><td><strong>${esc(x.recurso||"-")}</strong>${x.status==="estornado"?'<small class="sig-admin-estorno-info">Estornado</small>':""}</td><td>${esc(x.item||"-")}</td><td>${fmt(x.quantidade)} ${unidadeTexto(u)}</td><td>${n(x.horasTrabalhadas)?fmt(x.horasTrabalhadas):"—"}</td><td>${tipoBloco(x.recurso)==="maquina"&&rate?fmt(rate)+" b/h":"—"}</td><td>${esc(x.responsavel||x.concretador||"-")}</td><td><div class="acoes-tabela">${x.status!=="estornado"&&podeEditar()?`<button class="btn-acao destaque" data-prod-edit="${x.id}" type="button">Editar</button>`:""}${x.status!=="estornado"&&admin()?`<button class="btn-acao perigo" data-prod-estorno="${x.id}" type="button">Estornar ADM</button>`:""}</div></td></tr>`}).join("")||'<tr><td colspan="8">Nenhum lançamento encontrado.</td></tr>';
  document.querySelectorAll("[data-prod-edit]").forEach(b=>b.onclick=()=>abrirEdicao(b.dataset.prodEdit));document.querySelectorAll("[data-prod-estorno]").forEach(b=>b.onclick=()=>estornar(b.dataset.prodEstorno))
}

function renderCadastros(){
  Object.keys(TIPOS).forEach(tipo=>{const el=document.querySelector(`[data-master-list="${tipo}"]`);if(!el)return;el.innerHTML=listaCadastros(tipo).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).map(x=>`<div class="production-master-row"><span>${esc(x.nome)}</span>${x.legado?'<small>base do Script</small>':`<button type="button" data-master-toggle="${x.id}">${x.ativo===false?"Reativar":"Inativar"}</button>`}</div>`).join("")});
  document.querySelectorAll("[data-master-toggle]").forEach(b=>b.onclick=()=>toggleCadastro(b.dataset.masterToggle));
  const host=$("prodVinculosLista");if(host){const arr=vinculos.filter(x=>x.empresaId===emp()).sort((a,b)=>String(a.recurso).localeCompare(String(b.recurso),"pt-BR")||String(a.item).localeCompare(String(b.item),"pt-BR"));host.innerHTML=`<table class="tabela"><thead><tr><th>Produção</th><th>Item</th><th>Status</th><th>Ação</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${esc(x.recurso)}</td><td>${esc(x.item)}</td><td>${x.ativo===false?"Inativo":"Ativo"}</td><td><button class="btn-acao" data-vinculo-toggle="${x.id}" type="button">${x.ativo===false?"Reativar":"Inativar"}</button></td></tr>`).join("")||'<tr><td colspan="4">Nenhum vínculo explícito. O padrão legado está sendo usado.</td></tr>'}</tbody></table>`;host.querySelectorAll("[data-vinculo-toggle]").forEach(b=>b.onclick=()=>toggleVinculo(b.dataset.vinculoToggle))}
  atualizarVinculoSelects()
}

async function carregar(){
  if(busy||!podeVer())return;busy=true;msg($("producaoAviso"),"");
  try{
    const [r,c,v,p]=await Promise.all([listarDocumentos("producaoLancamentos"),listarDocumentos("operacaoCadastros"),listarDocumentos("producaoItensConfig"),colaboradoresPorFuncao("PRODUCAO").catch(()=>[])]);
    registros=r.filter(x=>x.empresaId===emp());cadastros=c.filter(x=>x.empresaId===emp());vinculos=v.filter(x=>x.empresaId===emp());responsaveis=p.filter(x=>x.empresaId===emp());
    atualizarSelects();atualizarFiltroAno();render();renderCadastros();$("producaoAviso")?.classList.add("hidden")
  }catch(e){console.error(e);const a=$("producaoAviso");if(a){a.classList.remove("hidden");a.textContent="Não foi possível carregar a Produção. Confira permissões, vínculos do RH e Firestore Rules."}registros=[];cadastros=[];vinculos=[];responsaveis=[];atualizarSelects();atualizarFiltroAno();render();renderCadastros()}finally{busy=false}
}

function calcularMedia(){const r=$("prodRecurso")?.value,q=n($("prodQuantidade")?.value),h=n($("prodHoras")?.value);if($("prodMedia"))$("prodMedia").value=tipoBloco(r)==="maquina"?(h?`${fmt(q/h)} bandejas/h`:"—"):"Não aplicável"}
function limparForm(){editId=null;$("formProducao")?.reset();if($("prodData"))$("prodData").value=dataHoje();if($("producaoFormTitulo"))$("producaoFormTitulo").textContent="Novo lançamento";msg($("prodFormMsg"),"");atualizarSelects();atualizarItemDoForm();atualizarMetricaForm();calcularMedia()}
function abrirNovo(){if(!podeLancar())return alert("Seu perfil não pode registrar produção.");if(!emp())return alert("Selecione apenas uma empresa no cabeçalho para lançar produção.");limparForm();$("producaoFormBox")?.classList.remove("hidden");$("producaoFormBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function abrirEdicao(id){if(!podeEditar())return;const x=registros.find(v=>v.id===id);if(!x||x.status==="estornado")return;editId=id;$("prodData").value=x.data||"";$("prodRecurso").value=x.recurso||"";atualizarItemDoForm(x.item||"");$("prodQuantidade").value=n(x.quantidade);$("prodHoras").value=n(x.horasTrabalhadas);preencherResponsaveis(x.responsavel||x.concretador||"");if($("producaoFormTitulo"))$("producaoFormTitulo").textContent="Editar lançamento";atualizarMetricaForm();calcularMedia();$("producaoFormBox")?.classList.remove("hidden");$("producaoFormBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function validar(payload){
  const tipo=tipoBloco(payload.recurso);if(!payload.data||!payload.recurso)throw new Error("Preencha data e produção/máquina.");if(!payload.item)throw new Error("Selecione um item vinculado à produção.");if(!payload.responsavel)throw new Error("Selecione o responsável da produção.");if(!Number.isFinite(payload.quantidade)||payload.quantidade<=0)throw new Error("Informe uma quantidade produzida maior que zero.");if(!Number.isFinite(payload.horasTrabalhadas)||payload.horasTrabalhadas<0)throw new Error("Horas trabalhadas inválidas.");if(tipo==="maquina"&&payload.horasTrabalhadas<=0)throw new Error("MAQ.1 e MAQ.2 exigem horas trabalhadas para calcular bandejas/hora.");
  payload.unidadeMedida=unidadeRecurso(payload.recurso);payload.producaoPorHora=payload.horasTrabalhadas?payload.quantidade/payload.horasTrabalhadas:0;return payload
}
async function salvar(e){
  e.preventDefault();const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");
  try{
    const nomeResp=$("prodConcretador").value,resp=responsaveis.find(x=>x.nome===nomeResp);
    const payload=validar({empresaId,data:$("prodData").value,recurso:$("prodRecurso").value,item:$("prodItem").value,quantidade:n($("prodQuantidade").value),horasTrabalhadas:n($("prodHoras").value),responsavel:nomeResp,responsavelId:resp?.id||"",concretador:nomeResp,status:"ativo",origem:"sig",atualizadoPor:state.usuario?.id||""});
    msg($("prodFormMsg"),"Salvando...");if(editId){if(!podeEditar())throw new Error("sem-permissao");await atualizarDocumento("producaoLancamentos",editId,payload)}else{if(!podeLancar())throw new Error("sem-permissao");await criarDocumento("producaoLancamentos",payload)}
    msg($("prodFormMsg"),"Lançamento salvo.",true);emitirAlteracao("producao");await carregar();setTimeout(()=>{$("producaoFormBox")?.classList.add("hidden");limparForm()},250)
  }catch(err){console.error(err);msg($("prodFormMsg"),err.message||"Não foi possível salvar.")}
}
async function estornar(id){const x=registros.find(v=>v.id===id);if(!x||x.status==="estornado")return;const ok=await confirmarAcaoAdministrativa({titulo:"Estornar lançamento de produção",descricao:`O lançamento de ${x.recurso||"produção"} em ${dataBr(x.data)} deixará de compor indicadores, mas continuará no histórico.`,motivoLabel:"Motivo obrigatório do estorno",confirmarTexto:"Estornar lançamento",perigosa:true});if(!ok)return;try{await atualizarComAuditoria({colecao:"producaoLancamentos",id:x.id,empresaId:x.empresaId,modulo:"producao",acao:"estorno",motivo:ok.motivo,resumo:`Estorno de produção ${x.recurso||""} em ${x.data||""}`,snapshotAntes:x,alteracoes:{status:"estornado",motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoEm:new Date().toISOString()}});emitirAlteracao("producao");await carregar()}catch(e){console.error(e);alert("Não foi possível estornar o lançamento.")}}

async function adicionarCadastro(tipo){if(!podeCadastros())return;const input=document.querySelector(`[data-master-input="${tipo}"]`),nome=String(input?.value||"").trim();if(!nome)return;const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");const existente=cadastros.find(x=>x.tipo===tipo&&norm(x.nome)===norm(nome));if(existente){if(existente.ativo===false){await atualizarDocumento("operacaoCadastros",existente.id,{ativo:true});if(input)input.value="";await carregar();return}return msg($("prodMasterMsg"),"Este cadastro já existe.")}try{await criarDocumento("operacaoCadastros",{empresaId,tipo,nome,ativo:true,origem:"sig"});if(input)input.value="";msg($("prodMasterMsg"),"Cadastro incluído.",true);await carregar()}catch(e){console.error(e);msg($("prodMasterMsg"),"Não foi possível salvar o cadastro.")}}
async function toggleCadastro(id){if(!podeCadastros())return;const x=cadastros.find(v=>v.id===id);if(!x)return;try{await atualizarDocumento("operacaoCadastros",id,{ativo:x.ativo===false});await carregar()}catch(e){console.error(e);msg($("prodMasterMsg"),"Não foi possível alterar o cadastro.")}}
async function adicionarVinculo(){if(!podeCadastros())return;const recurso=$("prodVinculoRecurso")?.value,item=$("prodVinculoItem")?.value,empresaId=emp();if(!recurso||!item||!empresaId)return msg($("prodMasterMsg"),"Selecione produção e item.");const existente=vinculos.find(x=>norm(x.recurso)===norm(recurso)&&norm(x.item)===norm(item));try{if(existente){if(existente.ativo===false)await atualizarDocumento("producaoItensConfig",existente.id,{ativo:true});else return msg($("prodMasterMsg"),"Este vínculo já está ativo.")}else await criarDocumento("producaoItensConfig",{empresaId,recurso,item,ativo:true});msg($("prodMasterMsg"),"Vínculo salvo.",true);await carregar()}catch(e){console.error(e);msg($("prodMasterMsg"),"Não foi possível salvar o vínculo.")}}
async function toggleVinculo(id){if(!podeCadastros())return;const x=vinculos.find(v=>v.id===id);if(!x)return;try{await atualizarDocumento("producaoItensConfig",id,{ativo:x.ativo===false});await carregar()}catch(e){console.error(e);msg($("prodMasterMsg"),"Não foi possível alterar o vínculo.")}}

function ligarEventos(){
  $("btnNovaProducao")?.addEventListener("click",abrirNovo);$("btnAtualizarProducao")?.addEventListener("click",carregar);$("btnCancelarProducao")?.addEventListener("click",()=>{$("producaoFormBox")?.classList.add("hidden");limparForm()});
  $("formProducao")?.addEventListener("submit",salvar);$("prodQuantidade")?.addEventListener("input",calcularMedia);$("prodHoras")?.addEventListener("input",calcularMedia);
  $("prodRecurso")?.addEventListener("change",()=>{atualizarItemDoForm();atualizarMetricaForm()});
  $("prodFiltroRecurso")?.addEventListener("change",()=>{const fi=$("prodFiltroItem"),atual=fi?.value;const itens=$("prodFiltroRecurso").value?itensParaProducao($("prodFiltroRecurso").value):itensAtivos();if(fi){fi.innerHTML='<option value="">Todos os itens</option>'+opcoesLista(itens,{vazio:false});if(atual&&[...fi.options].some(o=>o.value===atual))fi.value=atual}render()});
  ["prodFiltroAno","prodFiltroMes","prodFiltroItem"].forEach(id=>$(id)?.addEventListener("change",render));
  $("btnProducaoCadastros")?.addEventListener("click",()=>{if(!podeCadastros())return;$("producaoCadastrosBox")?.classList.remove("hidden");renderCadastros();$("producaoCadastrosBox")?.scrollIntoView({behavior:"smooth",block:"start"})});
  $("btnFecharCadastrosProducao")?.addEventListener("click",()=>$("producaoCadastrosBox")?.classList.add("hidden"));
  document.querySelectorAll("[data-master-add]").forEach(b=>b.addEventListener("click",()=>adicionarCadastro(b.dataset.masterAdd)));
  $("btnProdVincularItem")?.addEventListener("click",adicionarVinculo)
}

function instalar(){garantirCss();garantirMenu();criarPagina();$("btnNovaProducao")?.classList.toggle("hidden",!podeLancar());$("btnProducaoCadastros")?.classList.toggle("hidden",!podeCadastros())}
instalar();
window.addEventListener("sig:ready",()=>{instalar();if(podeVer()&&!pagina()?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:empresa-contexto",()=>{if(!pagina()?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:data-changed",e=>{if(["producao","rh"].includes(e.detail?.modulo)&&!pagina()?.classList.contains("hidden"))carregar()});
