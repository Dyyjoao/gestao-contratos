import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao } from "./shared.js";
import { confirmarAcaoAdministrativa, atualizarComAuditoria } from "./admin-actions.js";
import { colaboradoresPorFuncao } from "./hr-role-registry.js?v=7";
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
const lista=()=>{
  const ano=$("descarteAno")?.value||"",mes=$("descarteMes")?.value||"",prod=$("descarteFiltroProducao")?.value||"";
  return registros.filter(x=>(!ano||x.data?.startsWith(ano))&&(!mes||x.data?.slice(5,7)===mes)&&(!prod||producaoRegistro(x)===prod));
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
    <div class="kpi-card"><span>Diferença para meta</span><strong id="descarteKpiDiferenca">—</strong><small id="descarteKpiDiferencaSub">—</small></div>
    <div class="kpi-card"><span>Lançamentos</span><strong id="descarteKpiRegistros">—</strong><small>registros ativos</small></div>
  </div>

  <section class="form-card hidden" id="descarteFormBox"><div class="form-card-titulo"><div><h3 id="descarteFormTitulo">Nova perda</h3><p>Responsáveis são carregados do RH pela função Produção / Indústria.</p></div></div><form id="descarteForm"><div class="form-grid form-grid-3">
    <div class="campo"><label for="descarteData">Data</label><input id="descarteData" type="date" required></div>
    <div class="campo"><label for="descarteQuantidade">Quantidade de caixotes</label><input id="descarteQuantidade" type="number" min="0" step="1" required></div>
    <div class="campo"><label for="descarteProducao">Produção</label><select id="descarteProducao" required></select></div>
    <div class="campo campo-span-2"><label for="descarteResponsavel">Responsável</label><select id="descarteResponsavel" required></select><small>Origem: RH · cargo com função Produção / Indústria.</small></div>
  </div><div class="form-acoes"><button id="descarteCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar perda</button></div><p id="descarteMensagem" class="mensagem-form"></p></form></section>

  <section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Análise das perdas</h3><p>Meta geral mensal configurável administrativamente.</p></div><div class="production-filtros"><select id="descarteAno"></select><select id="descarteMes"><option value="">Ano inteiro</option>${Array.from({length:12},(_,i)=>`<option value="${String(i+1).padStart(2,"0")}">${new Date(2026,i,1).toLocaleString("pt-BR",{month:"long"})}</option>`).join("")}</select><select id="descarteFiltroProducao"></select></div></div>
    <div class="production-charts losses-charts"><div class="production-card"><h4>Mês a mês × meta</h4><div id="descarteMesMeta" class="losses-month-chart"></div></div><div class="production-card"><h4>Total por produção</h4><div id="descartePorProducao" class="production-bars"></div></div><div class="production-card"><h4>Total por responsável</h4><div id="descartePorResponsavel" class="production-bars"></div></div></div>
  </section>

  <section class="lista-card"><div class="lista-cabecalho"><div><h3>Histórico de perdas</h3><p id="descarteContagem">—</p></div><span class="production-history-note">Estornos permanecem visíveis.</span></div><div class="tabela-container"><table class="tabela"><thead><tr><th>Data</th><th>Produção</th><th>Caixotes</th><th>Responsável</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="descarteLista"></tbody></table></div></section>`;
  main.appendChild(s);
  $("descarteNovo").onclick=novo;$("descarteAtualizar").onclick=carregar;$("descarteConfig").onclick=abrirConfig;
  $("descarteCancelar").onclick=()=>{$("descarteFormBox").classList.add("hidden");limpar()};$("descarteForm").addEventListener("submit",salvar);
  ["descarteAno","descarteMes","descarteFiltroProducao"].forEach(id=>$(id).addEventListener("change",render))
}
function menu(){const nav=document.querySelector(".sidebar-menu");if(!nav)return;let b=$("menuDescarte");if(!b){b=document.createElement("button");b.id="menuDescarte";b.className="menu-item hidden";b.dataset.pagina="descarte";b.type="button";b.textContent="Perdas";nav.appendChild(b);b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(!ver())return;abrirPagina("descarte");carregar()},true)}b.textContent="Perdas";b.classList.toggle("hidden",!ver())}
function limpar(){editId=null;$("descarteForm").reset();$("descarteData").value=new Date().toLocaleDateString("en-CA");$("descarteFormTitulo").textContent="Nova perda";opcoesProducao();opcoesResponsavel();msg($("descarteMensagem"),"")}
function novo(){if(!lancar())return;if(!emp())return alert("Selecione apenas uma empresa no cabeçalho.");limpar();$("descarteFormBox").classList.remove("hidden");$("descarteFormBox").scrollIntoView({behavior:"smooth",block:"start"})}
function abrirEdicao(id){if(!editar())return;const x=registros.find(v=>v.id===id);if(!x||x.status!=="ativo"||x.empresaId!==emp())return alert("Selecione a empresa deste registro para editar.");editId=id;$("descarteData").value=x.data;$("descarteQuantidade").value=x.quantidade;opcoesProducao(producaoRegistro(x));opcoesResponsavel(x.responsavel);$("descarteFormTitulo").textContent="Editar perda";$("descarteFormBox").classList.remove("hidden");$("descarteFormBox").scrollIntoView({behavior:"smooth",block:"start"})}
function barras(id,values){const target=$(id),max=Math.max(1,...values.map(x=>x[1]));target.innerHTML=values.length?values.map(([k,v])=>`<div class="production-bar-row"><span title="${esc(k)}">${esc(k)}</span><div><i style="width:${Math.max(2,v/max*100)}%"></i></div><strong>${fmt(v)} cx</strong></div>`).join(""):'<p class="production-empty">Sem dados no filtro selecionado.</p>'}
function graficoMesMeta(){
  const host=$("descarteMesMeta");if(!host)return;const ano=$("descarteAno")?.value||String(new Date().getFullYear()),prod=$("descarteFiltroProducao")?.value||"",m=meta();
  const dados=Array.from({length:12},(_,i)=>{const mm=String(i+1).padStart(2,"0"),total=registros.filter(x=>x.status!=="estornado"&&String(x.data||"").startsWith(`${ano}-${mm}`)&&(!prod||producaoRegistro(x)===prod)).reduce((s,x)=>s+num(x.quantidade),0);return{label:new Date(2026,i,1).toLocaleString("pt-BR",{month:"short"}).replace(".",""),total}});
  const max=Math.max(1,m,...dados.map(x=>x.total));
  host.innerHTML=dados.map(x=>`<div class="loss-month-row"><span>${esc(x.label)}</span><div class="loss-month-track"><i style="width:${Math.max(x.total?2:0,x.total/max*100)}%"></i><b style="left:${m/max*100}%" title="Meta ${fmt(m)}"></b></div><strong class="${x.total>m?"acima":""}">${fmt(x.total)} / ${fmt(m)}</strong></div>`).join("")
}
function render(){
  const historico=lista(),ativos=historico.filter(x=>x.status!=="estornado"),total=ativos.reduce((s,x)=>s+num(x.quantidade),0),producoesAgg={},responsaveisAgg={};
  ativos.forEach(x=>{const p=producaoRegistro(x)||"Não informado",r=x.responsavel||"Não informado";producoesAgg[p]=(producoesAgg[p]||0)+num(x.quantidade);responsaveisAgg[r]=(responsaveisAgg[r]||0)+num(x.quantidade)});
  const mes=$("descarteMes")?.value,mensal=$("descarteMes")?.value!==""?meta():meta()*12,dif=total-mensal;
  $("descarteKpiTotal").textContent=`${fmt(total)} cx`;$("descarteKpiMeta").textContent=`${fmt(meta())} cx`;$("descarteKpiRegistros").textContent=String(ativos.length);$("descarteKpiDiferenca").textContent=`${dif>0?"+":""}${fmt(dif)} cx`;$("descarteKpiDiferencaSub").textContent=dif>0?"Acima da meta":"Dentro / abaixo da meta";$("descarteContagem").textContent=`${historico.length} lançamento(s) no filtro`;
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
    const s=$("descarteAno"),atual=s.value||String(new Date().getFullYear()),anos=[...new Set([new Date().getFullYear(),...registros.map(x=>Number(String(x.data||"").slice(0,4))).filter(Boolean)])].sort((a,b)=>b-a);s.innerHTML=anos.map(a=>`<option value="${a}">${a}</option>`).join("");if(anos.map(String).includes(atual))s.value=atual;opcoesProducao();opcoesResponsavel();render();$("descarteAviso").classList.add("hidden")
  }catch(e){console.error(e);registros=[];render();$("descarteAviso").textContent="Não foi possível consultar perdas. Confira permissões, RH e Rules publicadas no Firebase.";$("descarteAviso").classList.remove("hidden")}finally{carregando=false}
}
async function salvar(e){
  e.preventDefault();const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");const quantidade=Number($("descarteQuantidade").value),producao=$("descarteProducao").value,responsavel=$("descarteResponsavel").value,resp=responsaveis.find(x=>x.nome===responsavel),dados={data:$("descarteData").value,quantidade,producao,maquina:producao,responsavel,responsavelId:resp?.id||""};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)||!Number.isFinite(quantidade)||quantidade<0||!producao||!responsavel)return msg($("descarteMensagem"),"Revise data, caixotes, produção e responsável.");
  try{msg($("descarteMensagem"),"Salvando...");if(editId){const atual=registros.find(x=>x.id===editId);if(!atual||atual.empresaId!==empresaId||!editar())throw new Error("Edição não autorizada.");await atualizarDocumento(COLECAO,editId,dados)}else{if(!lancar())throw new Error("Sem permissão.");await criarDocumento(COLECAO,{...dados,empresaId,status:"ativo",origem:"sig",registradoPor:state.usuario?.id||""})}$("descarteFormBox").classList.add("hidden");limpar();emitirAlteracao("descarte");await carregar()}catch(err){console.error(err);msg($("descarteMensagem"),err.message||"Não foi possível salvar.")}
}
async function estornar(id){if(!admin())return;const x=registros.find(v=>v.id===id);if(!x||x.status==="estornado")return;const ok=await confirmarAcaoAdministrativa({titulo:"Estornar perda",descricao:`O lançamento de ${fmt(x.quantidade)} caixote(s) em ${dataBr(x.data)} permanecerá no histórico.`,motivoLabel:"Motivo obrigatório",confirmarTexto:"Estornar",perigosa:true});if(!ok)return;try{await atualizarComAuditoria({colecao:COLECAO,id,empresaId:x.empresaId,modulo:"descarte",acao:"estorno",motivo:ok.motivo,resumo:`Estorno de perda ${x.data}`,snapshotAntes:x,alteracoes:{status:"estornado",motivoEstorno:ok.motivo,estornadoPor:state.usuario?.id||"",estornadoEm:new Date().toISOString()}});emitirAlteracao("descarte");await carregar()}catch(e){console.error(e);alert("Não foi possível estornar.")}}
function instalar(){if(!document.querySelector('link[href^="production.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=2";document.head.appendChild(l)}montar();menu();$("descarteNovo")?.classList.toggle("hidden",!lancar());$("descarteConfig")?.classList.toggle("hidden",!admin())}
instalar();window.addEventListener("sig:ready",()=>{instalar();if(ver())carregar()});window.addEventListener("sig:empresa-contexto",()=>{if(!$("pagina-descarte")?.classList.contains("hidden"))carregar()});window.addEventListener("sig:data-changed",e=>{if(["descarte","rh","producao"].includes(e.detail?.modulo)&&!$("pagina-descarte")?.classList.contains("hidden"))carregar()});
