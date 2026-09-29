import { $, esc, msg, permite, admin, state } from "./core.js";
import { listarDocumentosEmpresa, criarDocumentoEmpresa, atualizarDocumento, nomeEmpresa, dataBr, emitirAlteracao } from "./shared.js";

let rotas=[],execucoes=[],busy=false,rotaEditId=null,pontosDraft=[],execucaoRotaId="";
const pagina=()=>$("pagina-governanca");
const empresa=()=>String($("governancaEmpresa")?.value||"");
const podeConfig=()=>admin()||permite("governanca","configurar");
const podeExecutar=()=>admin()||permite("governanca","auditar")||permite("governanca","configurar");
const podePlano=()=>admin()||permite("governanca","planoAcao")||permite("planosAcao","cadastrar");
const hoje=()=>new Date().toISOString().slice(0,10);
const agora=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||`${Date.now()}_${Math.random().toString(36).slice(2)}`;
const addDias=(d,n)=>{const x=new Date(`${d}T12:00:00`);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const PERIODOS={diaria:"Diária",semanal:"Semanal",quinzenal:"Quinzenal",mensal:"Mensal",eventual:"Eventual"};
const SEVERIDADES={baixa:"Baixa",media:"Média",alta:"Alta",critica:"Crítica"};

function css(){
  if($("kamishibai-css"))return;
  const s=document.createElement("style");s.id="kamishibai-css";s.textContent=`
  .kami-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kami-card{border:1px solid #e3e8ef;border-radius:14px;background:#fff;padding:14px}.kami-card h4{margin:0 0 4px}.kami-meta,.kami-actions{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.kami-meta{margin:8px 0}.kami-actions{margin-top:10px}.kami-point-builder{display:grid;grid-template-columns:1fr 1.4fr .7fr auto;gap:8px;align-items:end}.kami-point{border:1px solid #e6ebef;border-radius:12px;padding:12px;margin:9px 0;background:#fbfcfd}.kami-point-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.kami-exec-point{border:1px solid #e1e7eb;border-radius:14px;padding:14px;margin:10px 0}.kami-exec-point[data-result="conforme"]{border-left:5px solid #10b8aa}.kami-exec-point[data-result="desvio"]{border-left:5px solid #b42318}.kami-exec-point[data-result="na"]{border-left:5px solid #98a2b3}.kami-exec-grid{display:grid;grid-template-columns:.8fr 1.4fr 1.2fr;gap:10px;margin-top:10px}.kami-route-progress{height:7px;background:#edf1f4;border-radius:99px;overflow:hidden}.kami-route-progress span{display:block;height:100%;background:#10b8aa}.kami-history td small{display:block}.kami-pending{color:#b54708;font-weight:700}@media(max-width:900px){.kami-grid{grid-template-columns:1fr}.kami-point-builder,.kami-exec-grid{grid-template-columns:1fr}.kami-actions button{flex:1 1 auto}.kami-card{padding:12px}}
  `;document.head.appendChild(s)
}

function instalar(){
  const p=pagina();if(!p||$("govTabKamishibai"))return false;css();
  const nav=p.querySelector(".gov-tabs"),audBtn=nav?.querySelector('[data-gov-tab="auditoria"]');if(!nav)return false;
  const b=document.createElement("button");b.id="govTabKamishibai";b.className="fpa-tab";b.dataset.govTab="kamishibai";b.type="button";b.textContent="Kamishibai";audBtn?.after(b);
  const view=document.createElement("section");view.className="gov-view hidden";view.dataset.govView="kamishibai";view.innerHTML=`
    <div class="pagina-cabecalho interno"><div><h3>Kamishibai · Rotas de Chão de Fábrica</h3><p>Verificação curta, visual e recorrente no gemba. Cada desvio pode gerar plano de ação rastreável.</p></div><button id="btnNovaRotaKami" class="btn-primario" type="button">+ Nova rota</button></div>
    <div id="kamiAviso" class="modulo-aviso">Selecione a empresa da Governança para carregar as rotas.</div>
    <div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Rotas ativas</span><strong id="kamiKpiRotas">—</strong><small>rotas vigentes</small></div><div class="kpi-card"><span>Execuções 30 dias</span><strong id="kamiKpiExec">—</strong><small>rondas concluídas</small></div><div class="kpi-card"><span>Conformidade 30 dias</span><strong id="kamiKpiConf">—</strong><small>pontos conformes</small></div><div class="kpi-card"><span>Desvios 30 dias</span><strong id="kamiKpiDesvios">—</strong><small>pontos fora do padrão</small></div></div>
    <section id="kamiRotaFormBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="kamiRotaFormTitulo">Nova rota Kamishibai</h3><p>Defina a sequência física da verificação e o padrão esperado em cada ponto.</p></div></div><form id="kamiRotaForm"><div class="form-grid form-grid-3">
      <div class="campo"><label for="kamiRotaNome">Nome da rota</label><input id="kamiRotaNome" required placeholder="Ex.: Rota Produção · Início do turno"></div>
      <div class="campo"><label for="kamiRotaSetor">Setor / área</label><input id="kamiRotaSetor" required placeholder="Ex.: Moldagem e armação"></div>
      <div class="campo"><label for="kamiRotaPeriodicidade">Periodicidade</label><select id="kamiRotaPeriodicidade">${Object.entries(PERIODOS).map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></div>
      <div class="campo"><label for="kamiRotaResponsavel">Responsável pela rota</label><input id="kamiRotaResponsavel" placeholder="Ex.: Supervisor de Produção"></div>
      <div class="campo"><label for="kamiRotaStatus">Status</label><select id="kamiRotaStatus"><option value="ativo">Ativa</option><option value="inativo">Inativa</option></select></div>
      <div class="campo"><label for="kamiRotaObjetivo">Objetivo</label><input id="kamiRotaObjetivo" placeholder="Ex.: Segurança, 5S e padrão operacional"></div>
    </div>
    <div class="lista-cabecalho"><div><h4>Pontos da rota</h4><p>Cadastre na mesma ordem em que a pessoa percorre fisicamente o chão de fábrica.</p></div><button id="btnKamiModeloFabrica" class="btn-secundario" type="button">Usar modelo pré-moldados</button></div>
    <div class="kami-point-builder"><div class="campo"><label for="kamiPontoLocal">Local / etapa</label><input id="kamiPontoLocal" placeholder="Ex.: Central de concreto"></div><div class="campo"><label for="kamiPontoCriterio">O que verificar / padrão</label><input id="kamiPontoCriterio" placeholder="Ex.: Área limpa, sem material fora da faixa demarcada"></div><div class="campo"><label for="kamiPontoSeveridade">Criticidade</label><select id="kamiPontoSeveridade">${Object.entries(SEVERIDADES).map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></div><button id="btnKamiAddPonto" class="btn-secundario" type="button">Adicionar</button></div>
    <div id="kamiPontosDraft"></div>
    <div class="form-acoes"><button id="btnKamiCancelarRota" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Salvar rota</button></div><p id="kamiRotaMsg" class="mensagem-form"></p></form></section>
    <section id="kamiExecBox" class="form-card hidden"></section>
    <div class="kami-grid"><section class="lista-card"><div class="lista-cabecalho"><div><h3>Rotas cadastradas</h3><p>Inicie a ronda diretamente pelo celular no chão de fábrica.</p></div></div><div id="kamiRotasLista"></div></section><section class="lista-card"><div class="lista-cabecalho"><div><h3>Histórico recente</h3><p>Execuções, conformidade e desvios registrados.</p></div></div><div class="tabela-container"><table class="tabela kami-history"><thead><tr><th>Data</th><th>Rota</th><th>Auditor</th><th>Conformidade</th><th>Desvios</th></tr></thead><tbody id="kamiHistorico"></tbody></table></div></section></div>
  `;p.appendChild(view);
  b.addEventListener("click",()=>{p.querySelectorAll("[data-gov-tab]").forEach(x=>x.classList.toggle("ativo",x===b));p.querySelectorAll("[data-gov-view]").forEach(x=>x.classList.toggle("hidden",x.dataset.govView!=="kamishibai"));carregar()});
  $("btnNovaRotaKami")?.addEventListener("click",()=>abrirRota());
  $("btnKamiCancelarRota")?.addEventListener("click",fecharRota);
  $("btnKamiAddPonto")?.addEventListener("click",addPonto);
  $("btnKamiModeloFabrica")?.addEventListener("click",carregarModeloFabrica);
  $("kamiRotaForm")?.addEventListener("submit",salvarRota);
  $("governancaEmpresa")?.addEventListener("change",()=>{if(!view.classList.contains("hidden"))carregar()});
  return true
}

function renderPontosDraft(){
  const box=$("kamiPontosDraft");if(!box)return;
  box.innerHTML=pontosDraft.length?pontosDraft.map((x,i)=>`<div class="kami-point"><div class="kami-point-head"><span><strong>${i+1}. ${esc(x.local)}</strong><small> · ${esc(SEVERIDADES[x.severidade]||x.severidade)}</small></span><div><button class="btn-acao" data-kami-up="${x.id}" type="button" ${i===0?"disabled":""}>↑</button><button class="btn-acao" data-kami-down="${x.id}" type="button" ${i===pontosDraft.length-1?"disabled":""}>↓</button><button class="btn-acao perigo" data-kami-del="${x.id}" type="button">Remover</button></div></div><p>${esc(x.criterio)}</p></div>`).join(""):'<div class="empty-state">Adicione pelo menos um ponto de verificação.</div>';
  box.querySelectorAll("[data-kami-del]").forEach(b=>b.onclick=()=>{pontosDraft=pontosDraft.filter(x=>x.id!==b.dataset.kamiDel);renderPontosDraft()});
  box.querySelectorAll("[data-kami-up]").forEach(b=>b.onclick=()=>moverPonto(b.dataset.kamiUp,-1));
  box.querySelectorAll("[data-kami-down]").forEach(b=>b.onclick=()=>moverPonto(b.dataset.kamiDown,1))
}
function moverPonto(id,delta){const i=pontosDraft.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=pontosDraft.length)return;[pontosDraft[i],pontosDraft[j]]=[pontosDraft[j],pontosDraft[i]];renderPontosDraft()}
function carregarModeloFabrica(){
  if(pontosDraft.length&&!confirm("Substituir os pontos atuais pelo modelo de pré-moldados?"))return;
  const base=[
    ["Acesso / início da rota","Corredores e faixas de circulação livres, sinalizados e sem materiais obstruindo a passagem.","alta"],
    ["EPI e comportamento seguro","Equipe utilizando EPIs obrigatórios e sem condição ou ato inseguro evidente.","critica"],
    ["Central de concreto","Área limpa e organizada; insumos identificados; vazamentos, derrames e acúmulos tratados.","alta"],
    ["Armação","Vergalhões, telas e armações armazenados de forma segura, identificados e fora das áreas de circulação.","alta"],
    ["Formas e moldes","Formas íntegras, limpas, organizadas e prontas para uso conforme padrão definido.","media"],
    ["Produção / moldagem","Posto organizado; padrão operacional seguido; materiais e ferramentas nos locais definidos.","alta"],
    ["Movimentação de cargas","Pontes rolantes, cintas, ganchos e acessórios sem avaria aparente e operação dentro da área segura.","critica"],
    ["Cura e estoque intermediário","Peças identificadas, posicionadas com estabilidade e respeitando área e tempo de cura.","alta"],
    ["Pátio / produto acabado","Empilhamento estável, identificação visível e corredores livres para movimentação.","critica"],
    ["Expedição","Carga e amarração organizadas; área sem peças soltas ou condições que comprometam a segurança.","critica"],
    ["5S / descarte","Resíduos segregados; sucata, madeira, aço e descartes nos locais definidos; ausência de acúmulo desnecessário.","media"],
    ["Gestão à vista","Quadros e indicadores do setor atualizados, legíveis e coerentes com a situação observada.","baixa"]
  ];
  pontosDraft=base.map(([local,criterio,severidade])=>({id:`kp_${uid()}`,local,criterio,severidade}));
  if(!$("kamiRotaNome").value)$("kamiRotaNome").value="Rota Kamishibai · Chão de Fábrica";
  if(!$("kamiRotaSetor").value)$("kamiRotaSetor").value="Produção / Pátio";
  if(!$("kamiRotaObjetivo").value)$("kamiRotaObjetivo").value="Segurança, 5S, padrão operacional e qualidade";
  renderPontosDraft()
}
function addPonto(){const local=String($("kamiPontoLocal")?.value||"").trim(),criterio=String($("kamiPontoCriterio")?.value||"").trim(),severidade=$("kamiPontoSeveridade")?.value||"media";if(!local||!criterio)return; pontosDraft.push({id:`kp_${uid()}`,local,criterio,severidade});$("kamiPontoLocal").value="";$("kamiPontoCriterio").value="";renderPontosDraft()}
function abrirRota(id=""){if(!podeConfig())return;const r=id?rotas.find(x=>x.id===id):null;rotaEditId=r?.id||null;pontosDraft=(r?.pontos||[]).map(x=>({...x}));$("kamiRotaForm")?.reset();$("kamiRotaFormTitulo").textContent=r?"Editar rota Kamishibai":"Nova rota Kamishibai";$("kamiRotaNome").value=r?.nome||"";$("kamiRotaSetor").value=r?.setor||"";$("kamiRotaPeriodicidade").value=r?.periodicidade||"semanal";$("kamiRotaResponsavel").value=r?.responsavel||"";$("kamiRotaStatus").value=r?.status||"ativo";$("kamiRotaObjetivo").value=r?.objetivo||"";renderPontosDraft();$("kamiRotaFormBox")?.classList.remove("hidden");$("kamiRotaFormBox")?.scrollIntoView({behavior:"smooth",block:"start"})}
function fecharRota(){rotaEditId=null;pontosDraft=[];$("kamiRotaForm")?.reset();$("kamiRotaFormBox")?.classList.add("hidden")}
async function salvarRota(e){e.preventDefault();const emp=empresa();if(!emp||!podeConfig())return;if(!pontosDraft.length)return msg($("kamiRotaMsg"),"Inclua pelo menos um ponto na rota.");const d={nome:$("kamiRotaNome").value.trim(),setor:$("kamiRotaSetor").value.trim(),periodicidade:$("kamiRotaPeriodicidade").value,responsavel:$("kamiRotaResponsavel").value.trim(),status:$("kamiRotaStatus").value,objetivo:$("kamiRotaObjetivo").value.trim(),pontos:pontosDraft.map((x,i)=>({...x,ordem:i+1}))};if(!d.nome||!d.setor)return msg($("kamiRotaMsg"),"Informe nome e setor da rota.");try{msg($("kamiRotaMsg"),"Salvando...");if(rotaEditId)await atualizarDocumento("kamishibaiRotas",rotaEditId,d);else await criarDocumentoEmpresa("kamishibaiRotas",{empresaId:emp,...d});fecharRota();emitirAlteracao("governanca");await carregar()}catch(err){console.error(err);msg($("kamiRotaMsg"),"Não foi possível salvar a rota. Confira as Rules do Firebase.")}}

function exec30(){const limite=new Date();limite.setDate(limite.getDate()-30);return execucoes.filter(x=>new Date(String(x.data||"").slice(0,10)+"T12:00:00")>=limite)}
function conformidade(lista){const validos=lista.flatMap(x=>x.respostas||[]).filter(x=>x.resultado!=="na");return validos.length?Math.round(validos.filter(x=>x.resultado==="conforme").length/validos.length*100):null}
function ultimaExecucao(rotaId){return [...execucoes].filter(x=>x.rotaId===rotaId).sort((a,b)=>String(b.data||"").localeCompare(String(a.data||"")))[0]||null}
function statusProxima(r){const u=ultimaExecucao(r.id);if(r.periodicidade==="eventual")return u?`Última: ${dataBr(u.data)}`:"Eventual";if(!u)return "Pendente · nunca executada";const dias={diaria:1,semanal:7,quinzenal:15,mensal:30}[r.periodicidade]||30,prox=addDias(String(u.data).slice(0,10),dias);return `${prox<hoje()?"Atrasada":"Próxima"}: ${dataBr(prox)}`}
function render(){
  const h30=exec30(),conf=conformidade(h30),desv=h30.flatMap(x=>x.respostas||[]).filter(x=>x.resultado==="desvio").length;
  $("kamiKpiRotas").textContent=String(rotas.filter(x=>x.status!=="inativo").length);$("kamiKpiExec").textContent=String(h30.length);$("kamiKpiConf").textContent=conf===null?"—":`${conf}%`;$("kamiKpiDesvios").textContent=String(desv);$("btnNovaRotaKami")?.classList.toggle("hidden",!podeConfig());
  $("kamiAviso").innerHTML=empresa()?`<strong>${esc(nomeEmpresa(empresa()))}</strong> · ${rotas.length} rota(s) · ${execucoes.length} execução(ões) registradas.`:"Selecione a empresa da Governança.";
  const box=$("kamiRotasLista");if(box){box.innerHTML=rotas.length?rotas.sort((a,b)=>String(a.nome).localeCompare(String(b.nome),"pt-BR")).map(r=>`<div class="kami-card"><h4>${esc(r.nome)}</h4><p>${esc(r.setor)}${r.objetivo?` · ${esc(r.objetivo)}`:""}</p><div class="kami-meta"><span class="${r.status==="inativo"?"status-inativo":"status-ativo"}">${r.status==="inativo"?"Inativa":"Ativa"}</span><span>${esc(PERIODOS[r.periodicidade]||r.periodicidade)}</span><span>${(r.pontos||[]).length} ponto(s)</span><span class="${statusProxima(r).startsWith("Atrasada")||statusProxima(r).startsWith("Pendente")?"kami-pending":""}">${esc(statusProxima(r))}</span></div><div class="kami-actions">${podeExecutar()&&r.status!=="inativo"?`<button class="btn-acao destaque" data-kami-run="${r.id}" type="button">Iniciar rota</button>`:""}${podeConfig()?`<button class="btn-acao" data-kami-edit="${r.id}" type="button">Editar</button>`:""}</div></div>`).join(""):'<div class="empty-state">Nenhuma rota Kamishibai cadastrada para esta empresa.</div>';box.querySelectorAll("[data-kami-run]").forEach(b=>b.onclick=()=>abrirExecucao(b.dataset.kamiRun));box.querySelectorAll("[data-kami-edit]").forEach(b=>b.onclick=()=>abrirRota(b.dataset.kamiEdit))}
  const hist=$("kamiHistorico");if(hist)hist.innerHTML=execucoes.length?[...execucoes].sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))).slice(0,30).map(x=>`<tr><td>${dataBr(x.data)}<small>${esc(x.hora||"")}</small></td><td><strong>${esc(x.rotaNome||"Rota")}</strong><small>${esc(x.setor||"")}</small></td><td>${esc(x.auditorNome||"—")}</td><td>${x.percentualConformidade==null?"—":x.percentualConformidade+"%"}</td><td><span class="${x.desvios?"status-inativo":"status-ativo"}">${x.desvios||0}</span></td></tr>`).join(""):'<tr><td colspan="5">Nenhuma execução registrada.</td></tr>'
}

function abrirExecucao(id){const r=rotas.find(x=>x.id===id);if(!r||!podeExecutar())return;execucaoRotaId=id;const box=$("kamiExecBox");box.classList.remove("hidden");box.innerHTML=`<div class="form-card-titulo"><div><span class="eyebrow">EXECUÇÃO KAMISHIBAI</span><h3>${esc(r.nome)}</h3><p>${esc(r.setor)} · ${esc(PERIODOS[r.periodicidade]||r.periodicidade)} · Auditor: ${esc(state.usuario?.nome||state.usuario?.email||"Usuário")}</p></div></div><form id="kamiExecForm"><div class="campo"><label for="kamiExecData">Data</label><input id="kamiExecData" type="date" value="${hoje()}" required></div><div id="kamiExecPontos">${(r.pontos||[]).sort((a,b)=>(a.ordem||0)-(b.ordem||0)).map((p,i)=>`<div class="kami-exec-point" data-kami-exec-point="${esc(p.id)}" data-result="pendente"><div class="kami-point-head"><div><span class="eyebrow">PONTO ${i+1}</span><h4>${esc(p.local)}</h4><p>${esc(p.criterio)}</p></div><span class="status-atencao">${esc(SEVERIDADES[p.severidade]||p.severidade)}</span></div><div class="kami-exec-grid"><div class="campo"><label>Resultado</label><select data-kami-result><option value="">Selecione...</option><option value="conforme">Conforme</option><option value="desvio">Desvio</option><option value="na">N/A</option></select></div><div class="campo"><label>Observação / causa aparente</label><input data-kami-obs placeholder="Descreva somente quando necessário"></div><div class="campo"><label>Evidência</label><input data-kami-evidencia type="url" placeholder="Link de foto/documento"></div></div></div>`).join("")}</div><label class="toggle-linha"><input id="kamiGerarPlanos" type="checkbox" ${podePlano()?"checked":"disabled"}><span><strong>Gerar plano de ação para cada desvio</strong><small>Responsável inicial: você · prazo padrão: 7 dias.</small></span></label><div class="form-acoes"><button id="btnKamiCancelarExec" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Concluir rota</button></div><p id="kamiExecMsg" class="mensagem-form"></p></form>`;
  box.querySelectorAll("[data-kami-result]").forEach(s=>s.onchange=()=>{const p=s.closest("[data-kami-exec-point]");p.dataset.result=s.value||"pendente"});
  $("btnKamiCancelarExec").onclick=fecharExecucao;$("kamiExecForm").onsubmit=salvarExecucao;box.scrollIntoView({behavior:"smooth",block:"start"})
}
function fecharExecucao(){execucaoRotaId="";const box=$("kamiExecBox");box?.classList.add("hidden");if(box)box.innerHTML=""}
async function salvarExecucao(e){e.preventDefault();const r=rotas.find(x=>x.id===execucaoRotaId),emp=empresa();if(!r||!emp||!podeExecutar())return;const cards=[...document.querySelectorAll("[data-kami-exec-point]")],respostas=cards.map((c,i)=>{const p=(r.pontos||[]).find(x=>x.id===c.dataset.kamiExecPoint)||{};return{pontoId:p.id||c.dataset.kamiExecPoint,ordem:p.ordem||i+1,local:p.local||"",criterio:p.criterio||"",severidade:p.severidade||"media",resultado:c.querySelector("[data-kami-result]")?.value||"",observacao:c.querySelector("[data-kami-obs]")?.value.trim()||"",evidenciaUrl:c.querySelector("[data-kami-evidencia]")?.value.trim()||""}});if(respostas.some(x=>!x.resultado))return msg($("kamiExecMsg"),"Classifique todos os pontos como Conforme, Desvio ou N/A.");const desvios=respostas.filter(x=>x.resultado==="desvio"),validos=respostas.filter(x=>x.resultado!=="na"),pct=validos.length?Math.round(validos.filter(x=>x.resultado==="conforme").length/validos.length*100):null,data=$("kamiExecData").value;try{msg($("kamiExecMsg"),"Concluindo rota...");const execId=await criarDocumentoEmpresa("kamishibaiExecucoes",{empresaId:emp,rotaId:r.id,rotaNome:r.nome,setor:r.setor,data,hora:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),auditorId:state.usuario?.id||"",auditorNome:state.usuario?.nome||state.usuario?.email||"Usuário",status:"concluida",respostas,conformes:respostas.filter(x=>x.resultado==="conforme").length,desvios:desvios.length,naoAplicaveis:respostas.filter(x=>x.resultado==="na").length,percentualConformidade:pct});const planosIds=[];if($("kamiGerarPlanos")?.checked&&podePlano()){for(const d of desvios){const pid=await criarDocumentoEmpresa("planosAcao",{empresaId:emp,titulo:`Kamishibai · ${r.nome} · ${d.local}`,descricao:[d.criterio,d.observacao?`Desvio observado: ${d.observacao}`:"",d.evidenciaUrl?`Evidência: ${d.evidenciaUrl}`:""].filter(Boolean).join("\n\n"),prazo:addDias(data,7),status:"aberto",responsavelId:state.usuario?.id||"",responsavelNome:state.usuario?.nome||state.usuario?.email||"Usuário",origem:"Kamishibai",moduloOrigem:"governanca",referenciaId:execId});planosIds.push(pid)}}await atualizarDocumento("kamishibaiRotas",r.id,{ultimaExecucaoEm:agora(),ultimaExecucaoData:data,ultimaConformidade:pct,ultimoDesvios:desvios.length});fecharExecucao();emitirAlteracao("governanca");emitirAlteracao("planosAcao");await carregar()}catch(err){console.error(err);msg($("kamiExecMsg"),"Não foi possível concluir a rota. Confira permissões e Rules do Firebase.")}}

async function carregar(){if(busy)return;const emp=empresa();if(!emp){rotas=[];execucoes=[];render();return}busy=true;try{const [rr,re]=await Promise.all([listarDocumentosEmpresa("kamishibaiRotas",emp),listarDocumentosEmpresa("kamishibaiExecucoes",emp)]);rotas=rr;execucoes=re;render()}catch(err){console.error("Kamishibai:",err);rotas=[];execucoes=[];render();if($("kamiAviso"))$("kamiAviso").innerHTML="<strong>Kamishibai indisponível.</strong> Publique as Rules do Firebase desta versão."}finally{busy=false}}

function boot(){if(instalar()){if(!pagina()?.classList.contains("hidden")&&!document.querySelector('[data-gov-view="kamishibai"]')?.classList.contains("hidden"))carregar()}else setTimeout(boot,80)}
boot();
window.addEventListener("sig:ready",boot);
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="governanca")setTimeout(()=>{instalar();if(!document.querySelector('[data-gov-view="kamishibai"]')?.classList.contains("hidden"))carregar()},50)});
window.addEventListener("sig:empresa-changed",()=>{if(!document.querySelector('[data-gov-view="kamishibai"]')?.classList.contains("hidden"))carregar()});
