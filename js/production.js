import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao, periodoAno, periodoChave } from "./shared.js";
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

let registros=[],cadastros=[],vinculos=[],responsaveis=[],editId=null,busy=false,detalheTipo="",analiseModo="producao";
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

function garantirCss(){if(document.querySelector('link[href^="production.css"]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=5";document.head.appendChild(l)}
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
    <div class="lista-cabecalho production-toolbar"><div><h3>Análise da produção</h3><p>O período principal vem do cabeçalho. Use o intervalo abaixo apenas para refinar por dias.</p><div class="production-analysis-toggle"><button id="prodModoProducao" class="btn-secundario ativo" type="button">Produção</button><button id="prodModoHora" class="btn-secundario" type="button">Produção/hora</button></div></div>
      <div class="production-filtros"><div class="production-date-range"><label>De <input id="prodFiltroDataIni" type="date"></label><label>Até <input id="prodFiltroDataFim" type="date"></label><button id="prodLimparIntervalo" class="btn-secundario" type="button">Limpar intervalo</button></div></div>
    </div>
    <div class="production-analysis-grid">
      <div class="production-card production-machine-card"><h4 id="prodGraficoMaquinasTitulo">Máquinas · produção em bandejas</h4><div id="prodGraficoMaquinas" class="production-bars"></div></div>
      <div class="production-summary-cards">
        <button id="prodCardLaje" class="production-summary-card" type="button" data-detalhe="laje"><span>Laje</span><strong id="prodCardLajeValor">—</strong><small>m² produzidos · clique para detalhar por produto</small></button>
        <button id="prodCardMourao" class="production-summary-card" type="button" data-detalhe="mourao"><span>Mourão</span><strong id="prodCardMouraoValor">—</strong><small>unidades produzidas · clique para detalhar por produto</small></button>
      </div>
    </div>
    <div id="prodDetalheProdutos" class="production-card production-detail-card hidden">
      <div class="production-detail-head"><div><h4 id="prodDetalheTitulo">Detalhamento por produto</h4><p id="prodDetalheSub">—</p></div><button id="prodFecharDetalhe" class="btn-secundario" type="button">Fechar</button></div>
      <div id="prodGraficoDetalhe" class="production-bars"></div>
    </div>
  </section>

  <section class="lista-card production-annual-card">
    <div class="lista-cabecalho production-annual-head">
      <div><h3>Acompanhamento anual</h3><p id="prodAcompanhamentoSub">Evolução mensal no ano selecionado no filtro principal.</p></div>
      <div class="campo production-annual-select"><label for="prodAcompanhamentoProducao">Produção</label><select id="prodAcompanhamentoProducao"></select></div>
    </div>
    <div class="production-annual-summary"><div><span>Total anual</span><strong id="prodAcompanhamentoTotal">—</strong></div><div><span>Produtividade média</span><strong id="prodAcompanhamentoMedia">—</strong></div></div><div class="production-annual-legend"><span><i class="volume"></i>Produção</span><span><i class="rate"></i>Produção/hora</span></div>
    <div id="prodAcompanhamentoGrafico" class="production-annual-chart"></div>
  </section>

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
  const r=$("prodRecurso"),vr=r?.value;
  if(r)r.innerHTML=opcoesLista(producoesAtivas());
  if(r&&vr&&[...r.options].some(o=>o.value===vr))r.value=vr;
  const anual=$("prodAcompanhamentoProducao"),anualAtual=anual?.value||"MAQUINAS_CONSOLIDADO";
  if(anual){
    const recursos=producoesAtivas().filter(x=>tipoBloco(x)!=="maquina").sort((a,b)=>a.localeCompare(b,"pt-BR"));
    anual.innerHTML='<option value="MAQUINAS_CONSOLIDADO">Máquinas · consolidado</option><option value="MAQ.1">MAQ.1</option><option value="MAQ.2">MAQ.2</option>'+recursos.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    anual.value=[...anual.options].some(o=>o.value===anualAtual)?anualAtual:"MAQUINAS_CONSOLIDADO";
  }
  atualizarItemDoForm();preencherResponsaveis();atualizarMetricaForm();atualizarVinculoSelects()
}
function atualizarVinculoSelects(){
  const r=$("prodVinculoRecurso"),i=$("prodVinculoItem"),vr=r?.value,vi=i?.value;
  if(r){r.innerHTML=opcoesLista(producoesAtivas());if(vr&&[...r.options].some(o=>o.value===vr))r.value=vr}
  if(i){i.innerHTML=opcoesLista(itensAtivos());if(vi&&[...i.options].some(o=>o.value===vi))i.value=vi}
}
function dentroPeriodoGeral(data){
  const d=String(data||""),ano=String(periodoAno()),p=periodoChave();
  if(!d.startsWith(ano))return false;
  if(/^m\d{2}$/.test(p))return d.slice(5,7)===p.slice(1);
  if(/^t[1-4]$/.test(p)){const m=Number(d.slice(5,7)),t=Number(p.slice(1));return Math.ceil(m/3)===t}
  const meses={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
  if(meses[p])return Number(d.slice(5,7))===meses[p];
  return true
}
function limitesPeriodoGeral(){
  const ano=Number(periodoAno()),p=periodoChave(),pad=v=>String(v).padStart(2,"0"),ultimo=(a,m)=>new Date(a,m,0).getDate();
  if(/^m\d{2}$/.test(p)){const m=Number(p.slice(1));return{ini:`${ano}-${pad(m)}-01`,fim:`${ano}-${pad(m)}-${pad(ultimo(ano,m))}`}}
  if(/^t[1-4]$/.test(p)){const t=Number(p.slice(1)),mi=(t-1)*3+1,mf=t*3;return{ini:`${ano}-${pad(mi)}-01`,fim:`${ano}-${pad(mf)}-${pad(ultimo(ano,mf))}`}}
  const meses={jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};
  if(meses[p]){const m=meses[p];return{ini:`${ano}-${pad(m)}-01`,fim:`${ano}-${pad(m)}-${pad(ultimo(ano,m))}`}}
  return{ini:`${ano}-01-01`,fim:`${ano}-12-31`}
}
function atualizarLimitesIntervalo(){
  const {ini,fim}=limitesPeriodoGeral(),a=$("prodFiltroDataIni"),b=$("prodFiltroDataFim");
  if(a){a.min=ini;a.max=fim;if(a.value&&(a.value<ini||a.value>fim))a.value=""}
  if(b){b.min=ini;b.max=fim;if(b.value&&(b.value<ini||b.value>fim))b.value=""}
}
function baseFiltrada(){
  let ini=$("prodFiltroDataIni")?.value||"",fim=$("prodFiltroDataFim")?.value||"";if(ini&&fim&&ini>fim)[ini,fim]=[fim,ini];
  return registros.filter(x=>{
    const d=String(x.data||"");
    return dentroPeriodoGeral(d)&&(!ini||d>=ini)&&(!fim||d<=fim)
  })
}
function barras(alvo,dados,{sufixo=""}={}){const el=$(alvo);if(!el)return;if(!dados.length){el.innerHTML='<p class="production-empty">Sem dados no filtro selecionado.</p>';return}const max=Math.max(...dados.map(x=>n(x.valor)),1);el.innerHTML=dados.map(x=>`<div class="production-bar-row"><span title="${esc(x.label)}">${esc(x.label)}</span><div><i style="width:${Math.max(2,n(x.valor)/max*100)}%"></i></div><strong>${fmt(x.valor)}${sufixo}</strong></div>`).join("")}
function somarPor(arr,chave){const out={};arr.forEach(x=>{const k=typeof chave==="function"?chave(x):x[chave]||"Não informado";out[k]=(out[k]||0)+n(x.quantidade)});return out}
function agregadoPorItem(dados,modo){
  const mapa={};
  dados.forEach(x=>{const k=x.item||"Não informado";mapa[k]??={q:0,h:0};mapa[k].q+=n(x.quantidade);mapa[k].h+=n(x.horasTrabalhadas)});
  return Object.entries(mapa).map(([label,v])=>({label,valor:modo==="hora"?(v.h?v.q/v.h:0):v.q})).sort((a,b)=>b.valor-a.valor)
}
function renderDetalheProdutos(arr){
  const box=$("prodDetalheProdutos"),graf=$("prodGraficoDetalhe");if(!box||!graf)return;
  if(!detalheTipo){box.classList.add("hidden");return}
  const isLaje=detalheTipo==="laje",dados=arr.filter(x=>tipoBloco(x.recurso)===detalheTipo),modoHora=analiseModo==="hora";
  const un=modoHora?(isLaje?" m²/h":" un/h"):(isLaje?" m²":" un");
  const titulo=isLaje?(modoHora?"Laje · produção/hora por produto":"Laje · produção por produto"):(modoHora?"Mourão · produção/hora por produto":"Mourão · produção por produto");
  $("prodDetalheTitulo").textContent=titulo;
  $("prodDetalheSub").textContent=modoHora?"Produtividade calculada por item: produção total ÷ horas lançadas.":(isLaje?"Distribuição do total produzido em m².":"Distribuição do total produzido em unidades.");
  barras("prodGraficoDetalhe",agregadoPorItem(dados,modoHora?"hora":"producao"),{sufixo:un});
  box.classList.remove("hidden");
  document.querySelectorAll("[data-detalhe]").forEach(b=>b.classList.toggle("ativo",b.dataset.detalhe===detalheTipo))
}


function renderAcompanhamentoAnual(){
  const host=$("prodAcompanhamentoGrafico"),sel=$("prodAcompanhamentoProducao");if(!host||!sel)return;
  const ano=Number(periodoAno()),escolha=sel.value||"MAQUINAS_CONSOLIDADO";
  let unidade="UN",rotulo=escolha;
  const base=registros.filter(x=>x.status!=="estornado"&&String(x.data||"").startsWith(String(ano)));
  let dadosBase=[];
  if(escolha==="MAQUINAS_CONSOLIDADO"){
    dadosBase=base.filter(x=>tipoBloco(x.recurso)==="maquina");unidade="BANDEJA";rotulo="Máquinas · consolidado";
  }else{
    dadosBase=base.filter(x=>norm(x.recurso)===norm(escolha));unidade=unidadeRecurso(escolha);
  }
  const meses=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const valores=meses.map((label,i)=>{
    const mes=dadosBase.filter(x=>Number(String(x.data||"").slice(5,7))===i+1),volume=mes.reduce((s,x)=>s+n(x.quantidade),0),horas=mes.reduce((s,x)=>s+n(x.horasTrabalhadas),0);
    return{label,volume,horas,rate:horas?volume/horas:0}
  });
  const maxVolume=Math.max(1,...valores.map(x=>x.volume)),maxRate=Math.max(1,...valores.map(x=>x.rate)),total=valores.reduce((s,x)=>s+x.volume,0),horasTotal=valores.reduce((s,x)=>s+x.horas,0),rateMedio=horasTotal?total/horasTotal:0;
  const sufixo=unidade==="M²"?"m²":unidade==="BANDEJA"?"b":"un",sufixoRate=unidade==="M²"?"m²/h":unidade==="BANDEJA"?"b/h":"un/h";
  if($("prodAcompanhamentoSub"))$("prodAcompanhamentoSub").textContent=`${rotulo} · evolução mensal de ${ano}`;
  if($("prodAcompanhamentoTotal"))$("prodAcompanhamentoTotal").textContent=`${fmt(total)} ${sufixo}`;
  if($("prodAcompanhamentoMedia"))$("prodAcompanhamentoMedia").textContent=horasTotal?`${fmt(rateMedio)} ${sufixoRate}`:"—";
  host.innerHTML=valores.map(x=>`<div class="production-annual-col">
    <div class="production-annual-values"><strong>${x.volume?fmt(x.volume):"0"} ${sufixo}</strong><small>${x.horas?fmt(x.rate)+" "+sufixoRate:"—"}</small></div>
    <div class="production-annual-dual">
      <div class="production-annual-track volume" title="Produção: ${fmt(x.volume)} ${sufixo}"><i style="height:${x.volume?Math.max(4,x.volume/maxVolume*100):0}%"></i></div>
      <div class="production-annual-track rate" title="Produção/hora: ${x.horas?fmt(x.rate)+" "+sufixoRate:"sem horas lançadas"}"><i style="height:${x.rate?Math.max(4,x.rate/maxRate*100):0}%"></i></div>
    </div>
    <span>${x.label}</span>
  </div>`).join("");
}

function render(){
  const historico=baseFiltrada(),arr=historico.filter(x=>x.status!=="estornado");
  const maquinas=arr.filter(x=>tipoBloco(x.recurso)==="maquina"),lajes=arr.filter(x=>tipoBloco(x.recurso)==="laje"),mourao=arr.filter(x=>tipoBloco(x.recurso)==="mourao");
  const qMaq=maquinas.reduce((s,x)=>s+n(x.quantidade),0),hMaq=maquinas.reduce((s,x)=>s+n(x.horasTrabalhadas),0),qLaje=lajes.reduce((s,x)=>s+n(x.quantidade),0),qMourao=mourao.reduce((s,x)=>s+n(x.quantidade),0);
  $("prodKpiMaquinas").textContent=fmt(qMaq);$("prodKpiLaje").textContent=fmt(qLaje);$("prodKpiMourao").textContent=fmt(qMourao,0);$("prodKpiMediaMaq").textContent=hMaq?`${fmt(qMaq/hMaq)} b/h`:"—";$("prodKpiRegs").textContent=String(arr.length);$("prodQtdRegistros").textContent=`${historico.length} lançamento(s) no filtro · ${arr.length} ativo(s)`;

  const modoHora=analiseModo==="hora";
  $("prodModoProducao")?.classList.toggle("ativo",!modoHora);$("prodModoHora")?.classList.toggle("ativo",modoHora);
  const maq1Docs=maquinas.filter(x=>["MAQ.1","MAQ1"].includes(norm(x.recurso).replaceAll(" ",""))),maq2Docs=maquinas.filter(x=>["MAQ.2","MAQ2"].includes(norm(x.recurso).replaceAll(" ","")));
  const maq1Q=maq1Docs.reduce((s,x)=>s+n(x.quantidade),0),maq2Q=maq2Docs.reduce((s,x)=>s+n(x.quantidade),0),maq1H=maq1Docs.reduce((s,x)=>s+n(x.horasTrabalhadas),0),maq2H=maq2Docs.reduce((s,x)=>s+n(x.horasTrabalhadas),0);
  const maqDados=modoHora
    ?[{label:"MAQ.1",valor:maq1H?maq1Q/maq1H:0},{label:"MAQ.2",valor:maq2H?maq2Q/maq2H:0},{label:"Consolidado",valor:(maq1H+maq2H)?(maq1Q+maq2Q)/(maq1H+maq2H):0}]
    :[{label:"MAQ.1",valor:maq1Q},{label:"MAQ.2",valor:maq2Q},{label:"Consolidado",valor:maq1Q+maq2Q}];
  if($("prodGraficoMaquinasTitulo"))$("prodGraficoMaquinasTitulo").textContent=modoHora?"Máquinas · produção por hora":"Máquinas · produção em bandejas";
  barras("prodGraficoMaquinas",maqDados,{sufixo:modoHora?" b/h":" b"});

  const hLaje=lajes.reduce((s,x)=>s+n(x.horasTrabalhadas),0),hMourao=mourao.reduce((s,x)=>s+n(x.horasTrabalhadas),0);
  if($("prodCardLajeValor"))$("prodCardLajeValor").textContent=modoHora?(hLaje?`${fmt(qLaje/hLaje)} m²/h`:"—"):`${fmt(qLaje)} m²`;
  if($("prodCardMouraoValor"))$("prodCardMouraoValor").textContent=modoHora?(hMourao?`${fmt(qMourao/hMourao)} un/h`:"—"):`${fmt(qMourao,0)} un`;
  const lajeSmall=$("prodCardLaje")?.querySelector("small"),mouraoSmall=$("prodCardMourao")?.querySelector("small");
  if(lajeSmall)lajeSmall.textContent=modoHora?"m² por hora · clique para detalhar por produto":"m² produzidos · clique para detalhar por produto";
  if(mouraoSmall)mouraoSmall.textContent=modoHora?"unidades por hora · clique para detalhar por produto":"unidades produzidas · clique para detalhar por produto";
  renderDetalheProdutos(arr);
  renderAcompanhamentoAnual();

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
    atualizarSelects();render();renderCadastros();$("producaoAviso")?.classList.add("hidden")
  }catch(e){console.error(e);const a=$("producaoAviso");if(a){a.classList.remove("hidden");a.textContent="Não foi possível carregar a Produção. Confira permissões, vínculos do RH e Firestore Rules."}registros=[];cadastros=[];vinculos=[];responsaveis=[];atualizarSelects();render();renderCadastros()}finally{busy=false}
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
  ["prodFiltroDataIni","prodFiltroDataFim"].forEach(id=>$(id)?.addEventListener("change",render));
  document.querySelectorAll("[data-detalhe]").forEach(b=>b.addEventListener("click",()=>{detalheTipo=detalheTipo===b.dataset.detalhe?"":b.dataset.detalhe;render()}));
  $("prodFecharDetalhe")?.addEventListener("click",()=>{detalheTipo="";render()});
  $("prodModoProducao")?.addEventListener("click",()=>{analiseModo="producao";render()});
  $("prodModoHora")?.addEventListener("click",()=>{analiseModo="hora";render()});
  $("prodAcompanhamentoProducao")?.addEventListener("change",renderAcompanhamentoAnual);
  $("prodLimparIntervalo")?.addEventListener("click",()=>{if($("prodFiltroDataIni"))$("prodFiltroDataIni").value="";if($("prodFiltroDataFim"))$("prodFiltroDataFim").value="";render()});
  $("btnProducaoCadastros")?.addEventListener("click",()=>{if(!podeCadastros())return;$("producaoCadastrosBox")?.classList.remove("hidden");renderCadastros();$("producaoCadastrosBox")?.scrollIntoView({behavior:"smooth",block:"start"})});
  $("btnFecharCadastrosProducao")?.addEventListener("click",()=>$("producaoCadastrosBox")?.classList.add("hidden"));
  document.querySelectorAll("[data-master-add]").forEach(b=>b.addEventListener("click",()=>adicionarCadastro(b.dataset.masterAdd)));
  $("btnProdVincularItem")?.addEventListener("click",adicionarVinculo)
}

function instalar(){garantirCss();garantirMenu();criarPagina();atualizarLimitesIntervalo();$("btnNovaProducao")?.classList.toggle("hidden",!podeLancar());$("btnProducaoCadastros")?.classList.toggle("hidden",!podeCadastros())}
instalar();
window.addEventListener("sig:ready",()=>{instalar();if(podeVer()&&!pagina()?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:empresa-contexto",()=>{if(!pagina()?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:data-changed",e=>{if(["producao","rh"].includes(e.detail?.modulo)&&!pagina()?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:periodo-changed",()=>{atualizarLimitesIntervalo();if(!pagina()?.classList.contains("hidden"))render()});
window.addEventListener("sig:periodo-alterado",()=>{atualizarLimitesIntervalo();if(!pagina()?.classList.contains("hidden"))render()});
