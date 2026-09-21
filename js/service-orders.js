import { abrirPagina, admin } from "./core.js";
import { $, esc, msg, permite, state, listarDocumentos, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, dataBr, emitirAlteracao } from "./shared.js";
import { carregarConfiguracaoModulo, abrirConfiguracaoModulo } from "./module-settings.js";

const TIPOS=["CORRETIVA","MELHORIA","PREVENTIVA"];
const FUNCOES=["MECÂNICO","ELETRICISTA","OPERADOR","AUTOMAÇÃO"];
const STATUS={aberta:"Aberta",em_execucao:"Em execução",concluida:"Concluída",cancelada:"Cancelada"};
let ordens=[],configOS={},editId=null,busy=false;

const pode=a=>admin()||permite("ordensServico",a);
const ver=()=>["visualizar","solicitar","executar","supervisionar"].some(pode);
const emp=()=>empresaUnicaSelecionadaId();
const localIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const campo=(id,label,type="text",required=false)=>`<div class="campo"><label for="os${id}">${label}</label><input id="os${id}" type="${type}" ${required?"required":""}></div>`;
const select=(id,label,values,required=false)=>`<div class="campo"><label for="os${id}">${label}</label><select id="os${id}" ${required?"required":""}><option value="">Selecione...</option>${values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></div>`;
const unicos=arr=>[...new Set(arr.map(x=>String(x||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
function cfgLista(chave,campoLegado){
  return unicos([...(Array.isArray(configOS?.[chave])?configOS[chave]:[]),...ordens.map(x=>x[campoLegado])])
}
function preencherSelect(id,valores,valor=""){
  const s=$(id);if(!s)return;const atual=valor||s.value||"";
  s.innerHTML='<option value="">Selecione...</option>'+valores.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
  if(atual&&![...s.options].some(o=>o.value===atual))s.add(new Option(`${atual} · histórico`,atual));
  s.value=atual
}
function preencherCadastrosForm(valores={}){
  preencherSelect("osSolicitante",cfgLista("solicitantes","solicitante"),valores.solicitante);
  preencherSelect("osExecutante",cfgLista("executantes","executante"),valores.executante);
  preencherSelect("osLocal",cfgLista("locais","local").concat(ordens.map(x=>x.equipamento)).filter(Boolean),valores.local||valores.equipamento)
}
function osInicioVencido(x){
  return x.status==="aberta"&&x.dataInicioPrevista&&x.dataInicioPrevista<localIso()
}
function statusClass(s){return `os-status ${s||"aberta"}`}
function montar(){
  if($("pagina-ordensservico"))return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-ordensservico";s.className="pagina hidden production-page";s.innerHTML=`
  <div class="pagina-cabecalho production-head">
    <div><span class="eyebrow">INDÚSTRIA</span><h2>Ordens de Serviço</h2><p>Solicitação, prazos previstos e acompanhamento do status das OS.</p></div>
    <div class="acoes-cabecalho"><button class="btn-secundario hidden" id="osCadastros" type="button">Cadastros OS</button><button class="btn-primario" id="osNova" type="button">+ Solicitar serviço</button><button class="btn-secundario" id="osAtualizar" type="button">Atualizar</button></div>
  </div>
  <div id="osAviso" class="modulo-aviso hidden"></div>
  <div class="production-kpis os-kpis">
    <button id="osKpiAbertasCard" class="kpi-card os-filter-card" type="button" data-os-card-filter="aberta"><span>Em aberto</span><strong id="osKpiAbertas">—</strong><small>Clique para filtrar · aguardando início</small></button>
    <button id="osKpiExecucaoCard" class="kpi-card os-filter-card" type="button" data-os-card-filter="em_execucao"><span>Em execução</span><strong id="osKpiExecucao">—</strong><small>Clique para filtrar · serviços iniciados</small></button>
    <button id="osKpiInicioVencidoCard" class="kpi-card os-filter-card os-alert-card" type="button" data-os-card-filter="__inicio_vencido__"><span>Início vencido</span><strong id="osKpiInicioVencido">—</strong><small>Clique para filtrar as OS atrasadas</small></button>
    <button id="osKpiConcluidasCard" class="kpi-card os-filter-card" type="button" data-os-card-filter="concluida"><span>Concluídas</span><strong id="osKpiConcluidas">—</strong><small>Clique para filtrar · histórico concluído</small></button>
    <button id="osKpiParadaCard" class="kpi-card os-filter-card" type="button" data-os-card-filter="__parada__"><span>Com parada de produção</span><strong id="osKpiParada">—</strong><small>Clique para filtrar as OS com parada</small></button>
  </div>

  <section class="form-card hidden" id="osFormBox">
    <div class="form-card-titulo"><div><h3 id="osFormTitulo">Nova solicitação</h3><p>Uma nova OS é sempre criada com status <strong>Aberta</strong>. O status é atualizado diretamente na linha da OS.</p></div></div>
    <form id="osForm"><div class="form-grid form-grid-3">
      ${campo("Numero","Número da OS","text",true)}
      ${select("Tipo","Tipo de serviço",TIPOS,true)}
      <div class="campo"><label for="osSolicitante">Solicitante</label><select id="osSolicitante" required></select></div>
      ${campo("DataSolicitacao","Data da solicitação","date",true)}
      ${select("Funcao","Função",FUNCOES,true)}
      <div class="campo"><label for="osLocal">Local</label><select id="osLocal" required></select></div>
      <div class="campo campo-span-3"><label for="osDescricao">Serviço solicitado</label><textarea id="osDescricao" required></textarea></div>
      <div class="campo"><label for="osExecutante">Executante previsto</label><select id="osExecutante"></select></div>
      ${campo("InicioPrevisto","Início previsto","date",true)}
      ${campo("ConclusaoPrevista","Conclusão prevista","date",true)}
      <div class="campo"><label><input id="osParada" type="checkbox"> Houve / haverá parada de produção</label></div>
      <div class="campo"><label><input id="osPeca" type="checkbox"> Prevê troca de peça</label></div>
      <div class="campo campo-span-3"><label for="osObservacao">Observação</label><textarea id="osObservacao"></textarea></div>
    </div>
    <div class="form-acoes"><button id="osCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar OS</button></div>
    <p id="osMensagem" class="mensagem-form"></p></form>
  </section>

  <section class="lista-card">
    <div class="lista-cabecalho production-toolbar">
      <div><h3>Acompanhamento das OS</h3><p>Atualize o status diretamente na linha. OS com início previsto vencido ficam sinalizadas.</p></div>
      <div class="production-filtros"><input id="osBusca" type="search" placeholder="OS, local, solicitante"><select id="osFiltroStatus"><option value="">Todos os status</option><option value="__inicio_vencido__">Início vencido</option><option value="__parada__">Com parada de produção</option>${Object.entries(STATUS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div>
    </div>
    <div class="tabela-container"><table class="tabela os-table"><thead><tr><th>Nº OS</th><th>Solicitação</th><th>Local / serviço</th><th>Prazo previsto</th><th>Status</th><th>Executante</th><th>Ações</th></tr></thead><tbody id="osLista"></tbody></table></div>
  </section>`;
  main.appendChild(s);
  $("osNova").addEventListener("click",novo);
  $("osAtualizar").addEventListener("click",carregar);
  $("osCadastros").addEventListener("click",abrirCadastros);
  $("osCancelar").addEventListener("click",()=>{$("osFormBox").classList.add("hidden");limpar()});
  $("osForm").addEventListener("submit",salvar);
  $("osBusca").addEventListener("input",render);
  $("osFiltroStatus").addEventListener("change",render);
  document.querySelectorAll("[data-os-card-filter]").forEach(card=>card.addEventListener("click",()=>aplicarFiltroCard(card.dataset.osCardFilter)))
}
function menu(){
  const nav=document.querySelector(".sidebar-menu");if(!nav)return;let b=$("menuOrdensServico");
  if(!b){b=document.createElement("button");b.id="menuOrdensServico";b.className="menu-item hidden";b.dataset.pagina="ordensservico";b.type="button";b.textContent="Ordens de Serviço";nav.appendChild(b);b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(!ver())return;abrirPagina("ordensservico");carregar()},true)}
  b.classList.toggle("hidden",!ver())
}
function limpar(){
  editId=null;$("osForm").reset();$("osDataSolicitacao").value=localIso();$("osInicioPrevisto").value=localIso();$("osConclusaoPrevista").value=localIso();preencherCadastrosForm();$("osFormTitulo").textContent="Nova solicitação";msg($("osMensagem"),"")
}
function novo(){
  if(!pode("solicitar"))return;if(!emp())return alert("Selecione apenas uma empresa no cabeçalho.");
  limpar();$("osFormBox").classList.remove("hidden");$("osFormBox").scrollIntoView({behavior:"smooth",block:"start"})
}
function abrirEdicao(id){
  const x=ordens.find(y=>y.id===id);
  if(!x||!pode("executar")||["cancelada","concluida"].includes(x.status))return;
  if(x.empresaId!==emp())return alert("Selecione a empresa da OS para editar.");
  editId=id;
  $("osNumero").value=x.numero||"";$("osTipo").value=x.tipo||"";$("osDataSolicitacao").value=x.dataSolicitacao||"";$("osFuncao").value=x.funcao||"";$("osDescricao").value=x.descricao||"";
  $("osInicioPrevisto").value=x.dataInicioPrevista||x.dataInicio||"";$("osConclusaoPrevista").value=x.dataConclusaoPrevista||x.dataFim||"";
  $("osParada").checked=x.paradaProducao===true;$("osPeca").checked=x.trocaPeca===true;$("osObservacao").value=x.observacao||"";
  preencherCadastrosForm(x);
  $("osFormTitulo").textContent=`Editar OS ${x.numero}`;$("osFormBox").classList.remove("hidden");$("osFormBox").scrollIntoView({behavior:"smooth",block:"start"})
}
function payload(){
  const g=id=>String($("os"+id).value||"").trim();
  return{numero:g("Numero"),tipo:g("Tipo"),solicitante:g("Solicitante"),dataSolicitacao:g("DataSolicitacao"),funcao:g("Funcao"),local:g("Local"),descricao:g("Descricao"),executante:g("Executante"),dataInicioPrevista:g("InicioPrevisto"),dataConclusaoPrevista:g("ConclusaoPrevista"),paradaProducao:$("osParada").checked,trocaPeca:$("osPeca").checked,observacao:g("Observacao")}
}
function validar(d){
  if(!d.numero||!TIPOS.includes(d.tipo)||!d.solicitante||!d.dataSolicitacao||!FUNCOES.includes(d.funcao)||!d.local||!d.descricao)throw new Error("Preencha os dados obrigatórios da solicitação.");
  if(!d.dataInicioPrevista||!d.dataConclusaoPrevista)throw new Error("Informe as datas previstas de início e conclusão.");
  if(d.dataInicioPrevista<d.dataSolicitacao)throw new Error("O início previsto não pode ser anterior à solicitação.");
  if(d.dataConclusaoPrevista<d.dataInicioPrevista)throw new Error("A conclusão prevista não pode ser anterior ao início previsto.");
  return d
}
async function salvar(e){
  e.preventDefault();const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");
  try{
    const d=validar(payload());
    if(editId){
      const x=ordens.find(y=>y.id===editId);if(!pode("executar")||!x||x.empresaId!==empresaId||["cancelada","concluida"].includes(x.status))throw new Error("Edição não autorizada.");
      if(d.numero!==x.numero||d.dataSolicitacao!==x.dataSolicitacao)throw new Error("Número e data de solicitação não podem ser alterados.");
      await atualizarDocumento("ordensServico",editId,{...d,status:x.status,dataInicio:x.dataInicio||"",dataFim:x.dataFim||""})
    }else{
      if(!pode("solicitar"))throw new Error("Sem permissão para solicitar OS.");
      if(ordens.some(x=>x.empresaId===empresaId&&String(x.numero).toUpperCase()===d.numero.toUpperCase()&&x.status!=="cancelada"))throw new Error("Já existe OS com esse número na empresa.");
      await criarDocumento("ordensServico",{...d,equipamento:d.local,status:"aberta",dataInicio:"",dataFim:"",empresaId:empresaId,origem:"sig",solicitadoPor:state.usuario?.id||""})
    }
    $("osFormBox").classList.add("hidden");limpar();emitirAlteracao("ordensservico");await carregar()
  }catch(err){console.error(err);msg($("osMensagem"),err.message||"Não foi possível salvar.")}
}
function opcoesStatus(x){
  if(x.status==="aberta")return [["em_execucao","Em execução"],["concluida","Concluída"],["cancelada","Cancelada"]];
  if(x.status==="em_execucao")return [["concluida","Concluída"],["cancelada","Cancelada"]];
  return[]
}
async function atualizarStatus(id,status){
  if(!pode("executar"))return;
  const x=ordens.find(v=>v.id===id);if(!x||!opcoesStatus(x).some(([s])=>s===status))return;
  const nome=STATUS[status]||status;if(!confirm(`Atualizar a OS ${x.numero} para "${nome}"?`))return;
  const hoje=localIso(),alteracoes={status};
  if(status==="em_execucao"){alteracoes.dataInicio=x.dataInicio||hoje}
  if(status==="concluida"){alteracoes.dataInicio=x.dataInicio||hoje;alteracoes.dataFim=hoje}
  if(status==="cancelada"){alteracoes.canceladoPor=state.usuario?.id||"";alteracoes.canceladoEm=new Date().toISOString()}
  try{await atualizarDocumento("ordensServico",id,alteracoes);emitirAlteracao("ordensservico");await carregar()}catch(e){console.error(e);alert("Não foi possível atualizar o status da OS. Verifique as Rules publicadas no Firebase.")}
}
function aplicarFiltroCard(filtro){
  const select=$("osFiltroStatus");if(!select)return;
  select.value=select.value===filtro?"":filtro;render();
  document.querySelector("#osLista")?.closest(".lista-card")?.scrollIntoView({behavior:"smooth",block:"start"})
}
function render(){
  if(!$("osLista"))return;
  const busca=$("osBusca").value.toLocaleLowerCase("pt-BR"),filtro=$("osFiltroStatus").value;
  const arr=ordens.filter(x=>{
    const atendeStatus=!filtro||(filtro==="__inicio_vencido__"?osInicioVencido(x):filtro==="__parada__"?(x.status!=="cancelada"&&x.paradaProducao===true):x.status===filtro);
    const local=x.local||x.equipamento||"";
    return atendeStatus&&[x.numero,local,x.solicitante,x.descricao,x.executante].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(busca))
  });
  const vencidas=ordens.filter(osInicioVencido);
  $("osKpiAbertas").textContent=String(ordens.filter(x=>x.status==="aberta").length);
  $("osKpiExecucao").textContent=String(ordens.filter(x=>x.status==="em_execucao").length);
  $("osKpiInicioVencido").textContent=String(vencidas.length);
  $("osKpiConcluidas").textContent=String(ordens.filter(x=>x.status==="concluida").length);
  $("osKpiParada").textContent=String(ordens.filter(x=>x.status!=="cancelada"&&x.paradaProducao).length);
  $("osKpiInicioVencidoCard")?.classList.toggle("tem-alerta",vencidas.length>0);
  document.querySelectorAll("[data-os-card-filter]").forEach(card=>card.classList.toggle("ativo",card.dataset.osCardFilter===filtro));

  $("osLista").innerHTML=arr.sort((a,b)=>String(b.dataSolicitacao).localeCompare(String(a.dataSolicitacao))).map(x=>{
    const atrasada=osInicioVencido(x),local=x.local||x.equipamento||"—",opcoes=opcoesStatus(x);
    return `<tr class="${x.status==="cancelada"?"sig-admin-estornado":""} ${atrasada?"os-row-atrasada":""}">
      <td><strong>${esc(x.numero)}</strong>${atrasada?'<small class="os-alerta-texto">Início vencido</small>':""}</td>
      <td>${dataBr(x.dataSolicitacao)}<small>${esc(x.solicitante)}</small></td>
      <td><strong>${esc(local)}</strong><small>${esc(x.descricao)}</small></td>
      <td><strong>Início ${dataBr(x.dataInicioPrevista||x.dataInicio)}</strong><small>Conclusão ${dataBr(x.dataConclusaoPrevista||x.dataFim)}</small></td>
      <td><span class="${statusClass(x.status)}">${esc(STATUS[x.status]||x.status)}</span>${x.dataInicio?'<small>Iniciado '+dataBr(x.dataInicio)+'</small>':""}${x.dataFim?'<small>Concluído '+dataBr(x.dataFim)+'</small>':""}</td>
      <td>${esc(x.executante||"—")}</td>
      <td><div class="acoes-tabela os-acoes">${pode("executar")&&!["concluida","cancelada"].includes(x.status)?`<button class="btn-acao" data-os-edit="${esc(x.id)}" type="button">Editar</button>${opcoes.length?`<select data-os-status="${esc(x.id)}"><option value="">Novo status...</option>${opcoes.map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select><button class="btn-acao destaque" data-os-atualizar="${esc(x.id)}" type="button">Atualizar</button>`:""}`:"—"}</div></td>
    </tr>`
  }).join("")||'<tr><td colspan="7">Nenhuma OS encontrada.</td></tr>';

  document.querySelectorAll("[data-os-edit]").forEach(b=>b.addEventListener("click",()=>abrirEdicao(b.dataset.osEdit)));
  document.querySelectorAll("[data-os-atualizar]").forEach(b=>b.addEventListener("click",()=>{const s=document.querySelector(`[data-os-status="${CSS.escape(b.dataset.osAtualizar)}"]`);if(!s?.value)return alert("Selecione o novo status.");atualizarStatus(b.dataset.osAtualizar,s.value)}))
}
async function abrirCadastros(){
  if(!admin())return;
  const empresaId=emp();if(!empresaId)return alert("Selecione apenas uma empresa no cabeçalho.");
  const cfg=await carregarConfiguracaoModulo("ordensServico",empresaId),txt=(arr)=>esc((Array.isArray(arr)?arr:[]).join("\n"));
  await abrirConfiguracaoModulo("ordensServico",{
    titulo:"Cadastros · Ordens de Serviço",
    extraHtml:`<div class="form-grid form-grid-3">
      <div class="campo"><label for="cfgOsSolicitantes">Solicitantes</label><textarea id="cfgOsSolicitantes" rows="8" placeholder="Um nome por linha">${txt(cfg.solicitantes)}</textarea><small>Um solicitante por linha.</small></div>
      <div class="campo"><label for="cfgOsExecutantes">Executantes</label><textarea id="cfgOsExecutantes" rows="8" placeholder="Um nome por linha">${txt(cfg.executantes)}</textarea><small>Um executante por linha.</small></div>
      <div class="campo"><label for="cfgOsLocais">Locais</label><textarea id="cfgOsLocais" rows="8" placeholder="Um local por linha">${txt(cfg.locais)}</textarea><small>Ex.: Fábrica, Pátio, Central de concreto.</small></div>
    </div>`,
    coletarExtra:overlay=>{
      const linhas=id=>unicos(String(overlay.querySelector(id)?.value||"").split(/\r?\n/));
      return{solicitantes:linhas("#cfgOsSolicitantes"),executantes:linhas("#cfgOsExecutantes"),locais:linhas("#cfgOsLocais")}
    },
    onSaved:novo=>{configOS=novo;preencherCadastrosForm();render()}
  })
}
async function carregar(){
  if(busy||!ver()||!emp())return;busy=true;
  try{
    const [docs,cfg]=await Promise.all([listarDocumentos("ordensServico"),carregarConfiguracaoModulo("ordensServico",emp()).catch(()=>({}))]);
    ordens=docs.filter(x=>x.empresaId===emp());configOS=cfg||{};preencherCadastrosForm();render();$("osAviso").classList.add("hidden")
  }catch(e){console.error(e);$("osAviso").textContent="Não foi possível consultar as OS. Confira permissões e Rules publicadas.";$("osAviso").classList.remove("hidden")}finally{busy=false}
}
function instalar(){
  if(!document.querySelector('link[href^="production.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="production.css?v=4";document.head.appendChild(l)}
  montar();menu();$("osNova")?.classList.toggle("hidden",!pode("solicitar"));$("osCadastros")?.classList.toggle("hidden",!admin())
}
instalar();
window.addEventListener("sig:ready",()=>{instalar();if(ver())carregar()});
window.addEventListener("sig:empresa-contexto",()=>{if(!$("pagina-ordensservico")?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="ordensservico"&&!$("pagina-ordensservico")?.classList.contains("hidden"))carregar()});
window.addEventListener("sig:module-config",e=>{if(e.detail?.modulo==="ordensServico"&&!$("pagina-ordensservico")?.classList.contains("hidden"))carregar()});
