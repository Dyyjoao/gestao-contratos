import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao, periodoAno, periodoChave } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria } from "./admin-actions.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=6";
import { carregarConfiguracaoModulo, abrirConfiguracaoModulo } from "./module-settings.js";

const COLECAO="descarteLancamentos";
const PRODUCOES_PADRAO=["MAQ.1","MAQ.2","LAJE","MOURÃO"];
let registros=[],cadastros=[],responsaveis=[],configPerdas={},editId=null,carregando=false;

const ver=()=>admin()||["visualizar","lancar","editar"].some(a=>permite("descarte",a));
const lancar=()=>admin()||permite("descarte","lancar");
const editar=()=>admin()||permite("descarte","editar");
const emp=()=>empresaUnicaSelecionadaId();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>num(v).toLocaleString("pt-BR",{maximumFractionDigits:2});
const norm=v=>String(v||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
const meta=()=>Math.max(0,num(configPerdas.metaCaixotesMensal??30));
const producaoRegistro=x=>x.producao||x.maquina||"";
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
function limitesEfetivos(){
  const base=limitesPeriodoGeral(),uiIni=$("descarteFiltroDataIni")?.value||"",uiFim=$("descarteFiltroDataFim")?.value||"";
  let ini=uiIni&&uiIni>base.ini?uiIni:base.ini,fim=uiFim&&uiFim<base.fim?uiFim:base.fim;
  if(ini>fim)[ini,fim]=[fim,ini];
  return{ini,fim}
}
function atualizarLimitesIntervaloPerdas(){
  const {ini,fim}=limitesPeriodoGeral(),a=$("descarteFiltroDataIni"),b=$("descarteFiltroDataFim");
  if(a){a.min=ini;a.max=fim;if(a.value&&(a.value<ini||a.value>fim))a.value=""}
  if(b){b.min=ini;b.max=fim;if(b.value&&(b.value<ini||b.value>fim))b.value=""}
}
function mesesEfetivos(){
  const {ini,fim}=limitesEfetivos(),out=[],d=new Date(`${ini.slice(0,7)}-01T00:00:00`),lim=new Date(`${fim.slice(0,7)}-01T00:00:00`);
  while(d<=lim){out.push({ano:d.getFullYear(),mes:d.getMonth()+1,label:d.toLocaleString("pt-BR",{month:"short"}).replace(".","")});d.setMonth(d.getMonth()+1)}
  return out
}
const lista=()=>{
  const {ini,fim}=limitesEfetivos(),prod=$("descarteFiltroProducao")?.value||"";
  return registros.filter(x=>{const d=String(x.data||"");return dentroPeriodoGeral(d)&&d>=ini&&d<=fim&&(!prod||producaoRegistro(x)===prod)});
};
function producoes(){
  const mapa=new Map(PRODUCOES_PADRAO.map(nome=>[norm(nome),nome]));
  cadastros.filter(x=>x.tipo==="recurso"&&x.empresaId===emp()&&x.ativo!==false).forEach(x=>mapa.set(norm(x.nome),x.nome));
  return [...mapa.values()].sort((a,b)=>a.localeCompare(b,"pt-BR"))
}
function opcoesProducao(valor=""){
  const html='<option value="">Selecione...</option>'+producoes().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  const s=$("descarteProducao");if(s){s.innerHTML=html;if(valor&&![...s.options].some(o=>o.value===valor))s.add(new Option(`${valor} · histórico`,valor));if(valor)s.value=valor}
  const f=$("descarteFiltroProducao");if(f){const atual=f.value;f.innerHTML='<option value="">Todas as produções</option>'+producoes().map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");if([...f.options].some(o=>o.value===atual))f.value=atual}
}
function opcoesResponsavel(valor=""){
  const s=$("descarteResponsavel");if(!s)return;const atual=valor||s.value||"";
  s.innerHTML='<option value="">Selecione...</option>'+responsaveis.map(x=>x.nome).filter(Boolean).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(atual&&![...s.options].some(o=>o.value===atual))s.add(new Option(`${atual} · vínculo anterior`,atual));s.value=atual
}

function montar(){
  if($("pagina-descarte"))return;const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-descarte";s.className="pagina hidden production-page";s.innerHTML=`
  <div class="pagina-cabecalho production-head"><div><span class="eyebrow">INDÚSTRIA</span><h2>Perdas</h2><p>Controle de perdas em caixotes por produção e responsável.</p></div><div class="acoes-cabecalho"><button id="descarteConfig" class="btn-secundario hidden" type="button">Configurar meta</button><button id="descarteNovo" class="btn-primario" type="button">+ Nova perda</button><button id="descarteAtualizar" class="btn-secundario" type="button">Atualizar</button></div></div>
  <div id="descarteAviso" class="modulo-aviso hidden"></div>
  <div class="production-kpis">
    <div class="kpi-card"><span>Caixotes no filtro</span><strong id="descarteKpiTotal">—</strong><small>perdas registradas</small></div>
    <div class="kpi-card"><span>Meta mensal</span><strong id="descarteKpiMeta">—</strong><small>caixotes / mês</small></div>
    <div class="kpi-card"><span>Desvio mensal da meta</span><strong id="descarteKpiDiferenca">—</strong><small id="descarteKpiDiferencaSub">Somente meses com lançamento</small></div>
    <div class="kpi-card"><span>Lançamentos</span><strong id="descarteKpiRegistros">—</strong><small>registros ativos</small></div>
  </div>

  <section class="form-card hidden" id="descarteFormBox"><div class="form-card-titulo"><div><h3 id="descarteFormTitulo">Nova perda</h3><p>Responsáveis são carregados do RH pela função Produção / Indústria.</p></div></div><form id="descarteForm"><div class="form-grid form-grid-3">
    <div class="campo"><label for="descarteData">Data</label><input id="descarteData" type="date" required></div>
    <div class="campo"><label for="descarteQuantidade">Quantidade de caixotes</label><input id="descarteQuantidade" type="number" min="0" step="1" required></div>
    <div class="campo"><label for="descarteProducao">Produção</label><select id="descarteProducao" required></select></div>
    <div class="campo campo-span-2"><label for="descarteResponsavel">Responsável</label><select id="descarteResponsavel" required></select><small>Origem: RH · cargo com função Produção / Indústria.</small></div>
  </div><div class="form-acoes"><button id="descarteCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar perda</button></div><p id="descarteMensagem" class="mensagem-form"></p></form></section>

  <section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Análise das perdas</h3><p>Segue o período geral do cabeçalho. Use o intervalo abaixo apenas para refinar os dias.</p></div><div class="production-filtros"><div class="production-date-range"><label>De <input id="descarteFiltroDataIni" type="date"></label><label>Até <input id="descarteFiltroDataFim" type="date"></label><button id="descarteLimparIntervalo" class="btn-secundario" type="button">Limpar intervalo</button></div><select id="descarteFiltroProducao"></select></div></div>
    <div class="production-charts losses-charts"><div class="production-card"><h4>Mês a mês × meta</h4><div id="descarteMesMeta" class="losses-month-chart"></div></div><div class="production-card"><h4>Total por produção</h4><div id="descartePorProducao" class="production-bars"></div></div><div class="production-card"><h4>Total por responsável</h4><div id="descartePorResponsavel" class="production-bars"></div></div></div>
  </section>

  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Histórico de perdas</h3><p id="descarteContagem">—</p></div><span class="production-history-note">Estornos permanecem visíveis.</span></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Produção</th><th>Caixotes</th><th>Responsável</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="descarteLista"></tbody></table></div></section>`;
  main.appendChild(s);
  $("descarteNovo").onclick=novo;$("descarteAtualizar").onclick=carregar;$("descarteConfig").onclick=abrirConfig;
  $("descarteCancelar").onclick=()=>{$("descarteFormBox").classList.add("hidden");limpar()};$("descarteForm").addEventListener("submit",salvar);
  ["descarteFiltroDataIni","descarteFiltroDataFim","descarteFiltroProducao"].forEach(id=>$(id)?.addEventListener("change",render));
  $("descarteLimparIntervalo")?.addEventListener("click",()=>{if($("descarteFiltroDataIni"))$("descarteFiltroDataIni").value="";if($("descarteFiltroDataFim"))$("descarteFiltroDataFim").value="";render()})
}
function menu(){const nav=document.querySelector(".sidebar-menu");if(!nav)return;let b=$("menuDescarte");if(!b){b=document.createElement("button");b.id="menuDescarte";b.className="menu-item hidden";b.dataset.pagina="descarte";b.type="button";b.textContent="Perdas";nav.appendChild(b);b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(!ver())return;abrirPagina("descarte");carregar()},true)}b.textContent="Perdas";b.classList.toggle("hidden",!ver())}
function limpar(){editId=null;$("descarteForm").reset();$("descarteData").value=new Date().toLocaleDateString("en-CA");$("descarteFormTitulo").textContent="Nova perda";opcoesProducao();opcoesResponsavel();msg($("descarteMensagem"),"")}
function novo(){if(!lancar())return;if(!emp())return alert("Selecione apenas uma empresa no cabeçalho.");limpar();$("descarteFormBox").classList.remove("hidden");$("descarteFormBox").scrollIntoView({behavior:"smooth",block:"start"})}
function abrirEdicao(id){if(!editar())return;const x=registros.find(v=>v.id===id);if(!x||x.status!=="ativo"||x.empresaId!==emp())return alert("Selecione a empresa deste registro para editar.");editId=id;$("descarteData").value=x.data;$("descarteQuantidade").value=x.quantidade;opcoesProducao(producaoRegistro(x));opcoesResponsavel(x.responsavel);$("descarteFormTitulo").textContent="Editar perda";$("descarteFormBox").classList.remove("hidden");$("descarteFormBox").scrollIntoView({behavior:"smooth",block:"start"})}
function barras(id,values){const target=$(id),max=Math.max(1,...values.map(x=>x[1]));target.innerHTML=values.length?values.map(([k,v])=>`<div class="production-bar-row"><span title="${esc(k)}">${esc(k)}</span><div><i style="width:${Math.max(2,v/max*100)}%"></i></div><strong>${fmt(v)} cx</strong></div>`).join(""):'<p class="production-empty">Sem dados no filtro selecionado.</p>'}
function graficoMesMeta(){
  const host=$("descarteMesMeta");if(!host)return;const prod=$("descarteFiltroProducao")?.value||"",m=meta(),ano=Number(periodoAno());
  const meses=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const dados=meses.map((label,i)=>{
    const mm=String(i+1).padStart(2,"0"),prefix=`${ano}-${mm}`,docs=registros.filter(r=>r.status!=="estornado"&&String(r.data||"").startsWith(prefix)&&(!prod||producaoRegistro(r)===prod)),total=docs.reduce((s,r)=>s+num(r.quantidade),0);
    return{label,total,qtd:docs.length}
  });
  const max=Math.max(1,m,...dados.map(x=>x.total));
  host.innerHTML=dados.map(x=>`<div class="loss-month-row"><span>${esc(x.label)}</span><div class="loss-month-track"><i style="width:${Math.max(x.total?2:0,x.total/max*100)}%"></i><b style="left:${m/max*100}%" title="Meta ${fmt(m)}"></b></div><strong class="${x.total>m?"acima":""}">${fmt(x.total)} / ${fmt(m)}</strong></div>`).join("")
}
function render(){
  const historico=lista(),ativos=historico.filter(x=>x.status!=="estornado"),total=ativos.reduce((s,x)=>s+num(x.quantidade),0),producoesAgg={},responsaveisAgg={};
  ativos.forEach(x=>{const p=producaoRegistro(x)||"Não informado",r=x.responsavel||"Não informado";producoesAgg[p]=(producoesAgg[p]||0)+num(x.quantidade);responsaveisAgg[r]=(responsaveisAgg[r]||0)+num(x.quantidade)});
  const porMes=new Map();
  ativos.forEach(x=>{const chave=String(x.data||"").slice(0,7);if(chave)porMes.set(chave,(porMes.get(chave)||0)+num(x.quantidade))});
  const mesesComLancamento=[...porMes.entries()].map(([chave,valor])=>({chave,valor,dif:valor-meta()})).sort((a,b)=>a.chave.localeCompare(b.chave));
  const acima=mesesComLancamento.filter(x=>x.dif>0),pior=acima.length?acima.reduce((a,b)=>b.dif>a.dif?b:a):null,excesso=pior?.dif??0;
  $("descarteKpiTotal").textContent=`${fmt(total)} cx`;$("descarteKpiMeta").textContent=`${fmt(meta())} cx`;$("descarteKpiRegistros").textContent=String(ativos.length);
  $("descarteKpiDiferenca").textContent=mesesComLancamento.length?`${fmt(excesso)} cx`:"—";
  $("descarteKpiDiferencaSub").textContent=!mesesComLancamento.length?"Sem lançamento no período":pior?`Maior excesso mensal · ${pior.chave.slice(5,7)}/${pior.chave.slice(0,4)}`:`Nenhum mês com lançamento excedeu a meta`;
  $("descarteContagem").textContent=`${historico.length} lançamento(s) no filtro`;
  graficoMesMeta();barras("descartePorProducao",Object.entries(producoesAgg).sort((a,b)=>b[1]-a[1]));barras("descartePorResponsavel",Object.entries(responsaveisAgg).sort((a,b)=>b[1]-a[1]));
  $("descarteLista").innerHTML=historico.sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(x=>`<tr class="${x.status==="estornado"?"sig-admin-estornado":""}"><td>${dataBr(x.data)}</td><td>${esc(producaoRegistro(x)||"—")}</td><td>${fmt(x.quantidade)} cx</td><td>${esc(x.responsavel||"—")}</td><td>${x.status==="estornado"?"Estornado":"Ativo"}</td><td><div class="acoes-tabela">${x.status!=="estornado"&&editar()?`<button type="button" class="btn-acao destaque" data-descarte-edit="${esc(x.id)}">Editar</button>`:""}${x.status!=="estornado"&&admin()?`<button type="button" class="btn-acao perigo" data-descarte-estorno="${esc(x.id)}">Estornar ADM</button>`:""}</div></td></tr>`).join("")||'<tr><td colspan="6">Nenhuma perda encontrada.</td></tr>';
  document.querySelectorAll("[data-descarte-edit]").forEach(b=>b.onclick=()=>abrirEdicao(b.dataset.descarteEdit));document.querySelectorAll("[data-descarte-estorno]").forEach(b=>b.onclick=()=>estornar(b.dataset.descarteEstorno))
}
async function abrirConfig(){
  if(!admin())return;const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");
  const cfg=await carregarConfiguracaoModulo("descarte",empresaId);
  await abrirConfiguracaoModulo("descarte",{titulo:"Configurações · Perdas",extraHtml:`<div class="campo"><label for="cfgMetaPerdas">Meta geral mensal de caixotes</label><input id="cfgMetaPerdas" type="number" min="0" step="1" value="${esc(cfg.metaCaixotesMensal??30)}"><small>Meta usada no gráfico mês a mês.</small></div>`,coletarExtra:overlay=>({metaCaixotesMensal:Math.max(0,num(overlay.querySelector("#cfgMetaPerdas")?.value))}),onSaved:novo=>{configPerdas=novo;render()}})
}
async function carregar(){
  if(carregando||!ver()||!emp())return;carregando=true;
  try{
    const [r,c,p,cfg]=await Promise.all([listarDocumentos(COLECAO),listarDocumentos("operacaoCadastros"),colaboradoresPorFuncao("PRODUCAO").catch(()=>[]),carregarConfiguracaoModulo("descarte",emp()).catch(()=>({metaCaixotesMensal:30}))]);
    registros=r.filter(x=>x.empresaId===emp());cadastros=c.filter(x=>x.empresaId===emp());responsaveis=p.filter(x=>x.empresaId===emp());configPerdas=cfg||{};
    atualizarLimitesIntervaloPerdas();opcoesProducao();opcoesResponsavel();render();$("descarteAviso").classList.add("hidden")
  }catch(e){console.error(e);registros=[];render();$("descarteAviso").textContent="Não foi possível consultar perdas. Confira permissões, RH e Rules publicadas no Firebase.";$("descarteAviso").classList.remove("hidden")}finally{carregando=false}
}
async function salvar(e){
  e.preventDefault();const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");const quantidade=Number($("descarteQuantidade").value),producao=$("descarteProducao").value,responsavel=$("descarteResponsavel").value,resp=responsaveis.find(x=>x.nome===responsavel),dados={data:$("descarteData").value,quantidade,producao,maquina:producao,responsavel,responsavelId:resp?.id||""};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)||!Number.isFinite(quantidade)||quantidade<0||!producao||!responsavel)return msg($("descarteMensagem"),"Revise data, caixotes, produção e responsável.");
  try{msg($("descarteMensagem"),"Salvando...");if(editId){const atual=registros.find(x=>x.id===editId);if(!atual||atual.empresaId!==empresaId||!editar())throw new Error("Edição não autorizada.");await atualizarDocumento(COLECAO,editId,dados)}else{if(!lancar())throw new Error("Sem permissão.");await criarDocumento(COLECAO,{...dados,empresaId,status:"ativo",origem:"sig",registradoPor:state.usuario?.id||""})}$("descarteFormBox").classList.add("hidden");limpar();emitirAlteracao("descarte");await carregar()}catch(err){console.error(err);msg($("descarteMensagem"),err.message||"Não foi possível salvar.")}
}
async function estornar(id){if(!admin())return;const x=registros.find(v=>v.id===id);if(!x||x.status==="estornado")return;const ok=await confirmarAcaoAdministrativa({titulo:"Estornar perda",descricao:`O lançamento de ${fmt(x.quantidade)} caixote(s) em ${dataBr(x.data)} permanecerá no histórico.`,motivoLabel:"Motivo obrigatório",confirmarTexto:"Estornar",perigosa:true});if(!ok)return;try{await atualizarComAuditoria({colecao:COLECAO,id,empresaId:x.empresaId,modulo:"descarte",acao:"estorno",motivo:ok.motivo,resumo:`Estorno de perda ${x.data}`,snapshotAntes:x,alteracoes:{status:"estornado",motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoEm:new Date().toISOString()}});emitirAlteracao("descarte");await carregar()}catch(e){console.error(e);alert("Não foi possível estornar.")}}
function instalar(){if(!document.querySelector('link[href^="production.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=5";document.head.appendChild(l)}montar();menu();atualizarLimitesIntervaloPerdas();$("descarteNovo")?.classList.toggle("hidden",!lancar());$("descarteConfig")?.classList.toggle("hidden",!admin())}
instalar();window.addEventListener("sig:ready",()=>{instalar();if(ver())carregar()});window.addEventListener("sig:empresa-contexto",()=>{if(!$("pagina-descarte")?.classList.contains("hidden"))carregar()});window.addEventListener("sig:data-changed",e=>{if(["descarte","rh","producao"].includes(e.detail?.modulo)&&!$("pagina-descarte")?.classList.contains("hidden"))carregar()});window.addEventListener("sig:periodo-changed",()=>{atualizarLimitesIntervaloPerdas();if(!$("pagina-descarte")?.classList.contains("hidden"))render()});window.addEventListener("sig:periodo-alterado",()=>{atualizarLimitesIntervaloPerdas();if(!$("pagina-descarte")?.classList.contains("hidden"))render()});
