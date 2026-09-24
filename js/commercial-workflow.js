import { collection, query, where, getDocs, arrayUnion, addDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { abrirPagina, admin } from "./core.js";
import { $, db, esc, msg, permite, state, criarDocumento, atualizarDocumento, empresaUnicaSelecionadaId, empresasSelecionadasIds, idsEmpresasPermitidas, grupoAtualId, periodoAno, periodoChave, dataBr, emitirAlteracao } from "./shared.js";

const MODELOS={
  visitas:{titulo:"Visitas e contatos",colecao:"visitasComerciais",permissao:"visitas"},
  orcamentos:{titulo:"Orçamentos",colecao:"orcamentosComerciais",permissao:"orcamentos"}
};
const STATUS={aguardando_aprovacao:"Aguardando aprovação",licitacao:"Licitação",venda_concluida:"Venda concluída",perdido_concorrente:"Perdido para concorrente"};
const ABERTOS=new Set(["aguardando_aprovacao","licitacao"]);
const TIPOS_VISITA=[["telefone","Telefone"],["whatsapp","WhatsApp"],["presencial","Presencial"],["email","E-mail"]];
const PERIODOS={total:[0,1,2,3,4,5,6,7,8,9,10,11],t1:[0,1,2],t2:[3,4,5],t3:[6,7,8],t4:[9,10,11]};
for(let i=0;i<12;i++)PERIODOS[`m${String(i+1).padStart(2,"0")}`]=[i];
const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const dados={visitas:[],orcamentos:[]},edicao={visitas:null,orcamentos:null},ocupado={visitas:false,orcamentos:false};
let vendedoresVisitas=[],clientesVisitas=[],clientesRelacionamento=[];
const uid=()=>state.usuario?.id||"";
const gestor=k=>admin()||permite(MODELOS[k].permissao,"supervisionar");
const ver=k=>gestor(k)||["visualizar","registrar","editar"].some(a=>permite(MODELOS[k].permissao,a));
const registrar=k=>admin()||permite(MODELOS[k].permissao,"registrar");
const editar=k=>gestor(k)||permite(MODELOS[k].permissao,"editar");
const agoraIso=()=>new Date().toISOString();
const proximo24=()=>new Date(Date.now()+86400000).toISOString();
const localIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const dinheiro=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const norm=s=>String(s||"").trim().toLocaleLowerCase("pt-BR");
const mesData=v=>Number(String(v||"").slice(5,7))-1;
const anoData=v=>Number(String(v||"").slice(0,4));
const indicesPeriodo=()=>PERIODOS[periodoChave()]||PERIODOS.total;
const tipoVisitaCanon=v=>{const x=norm(v);if(x==="ligação"||x==="ligacao"||x==="telefone")return"telefone";if(x==="whatsapp")return"whatsapp";if(x==="presencial")return"presencial";if(x==="e-mail"||x==="email")return"email";return x};
const tipoVisitaNome=v=>Object.fromEntries(TIPOS_VISITA)[tipoVisitaCanon(v)]||String(v||"—");
const chaveCliente=(nome,cidade="")=>norm(nome)+"|"+norm(cidade);

const sigla=k=>k==="visitas"?"vis":"orc";
const el=(k,n)=>$(sigla(k)+n);
const campo=(k,id,label,type="text",required=false,extra="")=>`<div class="campo"><label for="${sigla(k)}${id}">${label}</label><input id="${sigla(k)}${id}" type="${type}" ${required?"required":""} ${extra}></div>`;
const selecao=(k,id,label,opcoes,required=false)=>`<div class="campo"><label for="${sigla(k)}${id}">${label}</label><select id="${sigla(k)}${id}" ${required?"required":""}><option value="">Selecione...</option>${opcoes.map(([value,txt])=>`<option value="${esc(value)}">${esc(txt)}</option>`).join("")}</select></div>`;
function formulario(k){
  if(k==="visitas"){
    const tipos=TIPOS_VISITA.map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join("");
    return `<section id="visitasFormBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="visitasFormTitulo">Novo registro</h3><p>Registre a interação com o cliente. Vendedor e cliente são vinculados às bases corporativas do grupo.</p></div></div><form id="visitasForm"><div class="form-grid form-grid-3">
      <div class="campo"><label for="visData">Data</label><input id="visData" type="date" required></div>
      <div class="campo"><label for="visVendedor">Vendedor</label><select id="visVendedor" required><option value="">Selecione...</option></select><small>Origem: colaboradores/vendedores vinculados ao RH.</small></div>
      <div class="campo"><label for="visCliente">Cliente</label><div class="commercial-select-action"><select id="visCliente" required><option value="">Selecione...</option></select><button id="visClienteNovo" class="btn-secundario" type="button">+ Incluir</button></div><small>Base de clientes do Comercial + clientes incluídos para relacionamento.</small></div>
      <div class="campo"><label for="visCidade">Cidade</label><input id="visCidade" type="text" placeholder="Preenchida pelo cadastro do cliente"></div>
      <div class="campo"><label for="visObra">Obra</label><input id="visObra" type="text"></div>
      <div class="campo"><label for="visMaterial">Material</label><input id="visMaterial" type="text"></div>
      <div class="campo"><label for="visAssunto">Assunto</label><input id="visAssunto" type="text"></div>
      <div class="campo"><label for="visTipo">Tipo de contato</label><select id="visTipo" required><option value="">Selecione...</option>${tipos}</select></div>
      <div class="campo"><label for="visEmail">E-mail do vendedor</label><input id="visEmail" type="email"></div>
      <div class="campo campo-span-3"><label for="visObservacao">Observação</label><textarea id="visObservacao"></textarea></div>
    </div><div class="form-acoes"><button class="btn-secundario" type="button" id="visitasCancelar">Cancelar</button><button class="btn-primario" type="submit">Salvar</button></div><p id="visitasMensagem" class="mensagem-form"></p></form></section>
    <section id="visitasClienteBox" class="form-card hidden commercial-client-new"><div class="form-card-titulo"><div><h3>Incluir cliente para relacionamento</h3><p>Esse cadastro complementa a lista de clientes originada das vendas e vale para todo o grupo empresarial.</p></div></div><form id="visitasClienteForm"><div class="form-grid form-grid-3"><div class="campo campo-span-2"><label for="visNovoClienteNome">Cliente</label><input id="visNovoClienteNome" required></div><div class="campo"><label for="visNovoClienteCidade">Cidade</label><input id="visNovoClienteCidade" required></div><div class="campo"><label for="visNovoClienteUf">UF</label><input id="visNovoClienteUf" maxlength="2"></div></div><div class="form-acoes"><button id="visNovoClienteCancelar" class="btn-secundario" type="button">Cancelar</button><button class="btn-primario" type="submit">Incluir cliente</button></div><p id="visNovoClienteMsg" class="mensagem-form"></p></form></section>`;
  }
  const comum=[campo(k,"Data","Data","date",true),campo(k,"Vendedor","Vendedor","text",true),campo(k,"Cliente","Cliente","text",true)];
  const campos=[...comum,campo(k,"Produto","Produto","text",true),campo(k,"Cidade","Cidade"),campo(k,"Comprador","Comprador"),campo(k,"NumeroVb","Nº da VB"),campo(k,"Valor","Valor","number",true,'min="0" step="0.01"'),selecao(k,"Status","Status",Object.entries(STATUS),true),campo(k,"Telefone","Telefone","tel"),campo(k,"Email","E-mail do vendedor","email"),`<div class="campo"><label for="orcObservacao">Observação</label><textarea id="orcObservacao"></textarea></div>`,`<div class="campo"><label for="orcJustificativa">Justificativa</label><textarea id="orcJustificativa"></textarea></div>`];
  return `<section id="${k}FormBox" class="form-card hidden"><div class="form-card-titulo"><div><h3 id="${k}FormTitulo">Novo registro</h3><p>Acompanhamento permanece na mesa do responsável enquanto o orçamento estiver aberto.</p></div></div><form id="${k}Form"><div class="form-grid form-grid-3">${campos.join("")}</div><div class="form-acoes"><button class="btn-secundario" type="button" id="${k}Cancelar">Cancelar</button><button class="btn-primario" type="submit">Salvar</button></div><p id="${k}Mensagem" class="mensagem-form"></p></form></section>`;
}

function montar(k){
  if($("pagina-"+k))return;
  const main=document.querySelector("main.conteudo");if(!main)return;
  const s=document.createElement("section");s.id="pagina-"+k;s.className="pagina hidden commercial-flow-page";

  if(k==="visitas"){
    s.innerHTML=`<div class="pagina-cabecalho"><div><span class="eyebrow">COMERCIAL</span><h2>Visitas e contatos</h2><p>Visão consolidada do grupo empresarial, independente do filtro de empresa do cabeçalho.</p></div><div class="acoes-cabecalho"><button class="btn-primario" id="visitasNovo" type="button">+ Incluir visita / contato</button><button class="btn-secundario" id="visitasAtualizar" type="button">Atualizar</button></div></div>
      <div id="visitasAviso" class="modulo-aviso hidden"></div>
      <div class="commercial-group-note"><strong>Escopo:</strong> esta tela consolida todas as empresas do grupo. O período continua seguindo o filtro geral do SIG.</div>
      <div class="production-kpis commercial-visits-kpis"><div class="kpi-card"><span>Total de visitas / contatos</span><strong id="visitasKpiTotal">—</strong><small id="visitasKpiPeriodo">período selecionado</small></div><div class="kpi-card"><span>Clientes distintos</span><strong id="visitasKpiSegundo">—</strong><small>clientes contatados no período</small></div></div>
      ${formulario(k)}
      <div class="commercial-charts-grid">
        <section class="lista-card"><div class="lista-cabecalho"><div><h3>Evolução em 12 meses</h3><p id="visitasGraficoAnoLabel">Ano selecionado</p></div></div><div id="visitasGrafico12" class="commercial-bars commercial-bars-monthly"></div></section>
        <section class="lista-card"><div class="lista-cabecalho"><div><h3>Por tipo de contato</h3><p>Distribuição no período selecionado.</p></div></div><div id="visitasGraficoTipo" class="commercial-bars"></div></section>
        <section class="lista-card"><div class="lista-cabecalho"><div><h3>Visitas por cliente</h3><p>Clientes com maior número de contatos no período.</p></div></div><div id="visitasGraficoCliente" class="commercial-bars commercial-bars-scroll"></div></section>
        <section class="lista-card"><div class="lista-cabecalho"><div><h3>Visitas por cidade</h3><p>Total de contatos por cidade no período.</p></div></div><div id="visitasGraficoCidade" class="commercial-bars commercial-bars-scroll"></div></section>
      </div>
      <section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Histórico de contatos</h3><p>${gestor(k)?"Visão consolidada da equipe e de todas as empresas do grupo.":"Registros sob sua responsabilidade, consolidados no grupo."}</p></div><div class="production-filtros"><input type="search" id="visitasBusca" placeholder="Buscar cliente ou vendedor"><select id="visitasFiltroTipo"><option value="">Todos os tipos</option>${TIPOS_VISITA.map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join("")}</select></div></div><div class="tabela-container commercial-history-scroll"><table class="tabela"><thead><tr><th>Data</th><th>Cliente / Cidade</th><th>Vendedor</th><th>Tipo</th><th>Assunto</th><th>Ações</th></tr></thead><tbody id="visitasLista"></tbody></table></div></section>`;
  }else{
    s.innerHTML=`<div class="pagina-cabecalho"><div><span class="eyebrow">COMERCIAL</span><h2>${MODELOS[k].titulo}</h2><p>Acompanhe cada orçamento e as próximas ações da equipe.</p></div><div class="acoes-cabecalho"><button class="btn-primario" id="${k}Novo" type="button">+ Novo registro</button><button class="btn-secundario" id="${k}Atualizar" type="button">Atualizar</button></div></div><div id="${k}Aviso" class="modulo-aviso hidden"></div><div class="production-kpis"><div class="kpi-card"><span>Orçamentos em aberto</span><strong id="${k}KpiTotal">—</strong></div><div class="kpi-card"><span>Próximo contato vencido</span><strong id="${k}KpiSegundo">—</strong></div><div class="kpi-card"><span>Valor em aberto</span><strong id="orcamentosKpiValor">—</strong></div></div>${formulario(k)}<section class="lista-card"><div class="lista-cabecalho production-toolbar"><div><h3>Minha Mesa · Orçamentos</h3><p>${gestor(k)?"Visão consolidada da equipe, com acesso por empresa.":"Registros sob sua responsabilidade."}</p></div><div class="production-filtros"><input type="search" id="${k}Busca" placeholder="Buscar cliente ou vendedor"><select id="${k}FiltroStatus"><option value="">Todos os status</option>${Object.entries(STATUS).map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select></div></div><div class="tabela-container"><table class="tabela"><thead><tr>${["Data","Cliente / Produto","Vendedor","Valor","Status / próximo contato","Ações"].map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody id="${k}Lista"></tbody></table></div></section>`;
  }

  main.appendChild(s);
  $(k+"Novo")?.addEventListener("click",()=>novo(k));
  $(k+"Atualizar")?.addEventListener("click",()=>carregar(k));
  $(k+"Cancelar")?.addEventListener("click",()=>{$(k+"FormBox")?.classList.add("hidden");limpar(k)});
  $(k+"Form")?.addEventListener("submit",e=>salvar(k,e));
  $(k+"Busca")?.addEventListener("input",()=>render(k));
  $(k+"FiltroStatus")?.addEventListener("change",()=>render(k));

  if(k==="visitas"){
    $("visitasFiltroTipo")?.addEventListener("change",()=>render(k));
    $("visCliente")?.addEventListener("change",sincronizarClienteVisita);
    $("visVendedor")?.addEventListener("change",sincronizarVendedorVisita);
    $("visClienteNovo")?.addEventListener("click",()=>{$("visitasClienteBox")?.classList.remove("hidden");$("visNovoClienteNome")?.focus()});
    $("visNovoClienteCancelar")?.addEventListener("click",()=>{$("visitasClienteBox")?.classList.add("hidden");$("visitasClienteForm")?.reset();msg($("visNovoClienteMsg"),"")});
    $("visitasClienteForm")?.addEventListener("submit",salvarClienteRelacionamento)
  }
}

function menu(k){const nav=document.querySelector(".sidebar-menu");if(!nav)return;let b=$("menu"+k);if(!b){b=document.createElement("button");b.id="menu"+k;b.className="menu-item hidden";b.dataset.pagina=k;b.type="button";b.textContent=MODELOS[k].titulo;nav.appendChild(b);b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();if(!ver(k))return;abrirPagina(k);carregar(k)},true)}b.classList.toggle("hidden",!ver(k))}
async function consultarColecaoGrupoPorEmpresa(nomeColecao){
  const grupo=grupoAtualId(),empresas=idsEmpresasPermitidas();if(!grupo||!empresas.length)return[];
  const blocos=await Promise.all(empresas.map(async empresaId=>{
    const s=await getDocs(query(collection(db,nomeColecao),where("grupoId","==",grupo),where("empresaId","==",empresaId)));
    return s.docs.map(x=>({id:x.id,...x.data()}))
  }));
  return blocos.flat()
}
async function carregarBasesVisitas(){
  const grupo=grupoAtualId();if(!grupo){vendedoresVisitas=[];clientesVisitas=[];clientesRelacionamento=[];return}
  const resultados=await Promise.allSettled([
    getDocs(query(collection(db,"vendedores"),where("grupoId","==",grupo))),
    consultarColecaoGrupoPorEmpresa("rhColaboradores"),
    getDocs(query(collection(db,"clientesComerciais"),where("grupoId","==",grupo))),
    getDocs(query(collection(db,"clientesRelacionamento"),where("grupoId","==",grupo)))
  ]);
  const configs=resultados[0].status==="fulfilled"?resultados[0].value.docs.map(x=>({id:x.id,...x.data()})):[];
  const rhs=resultados[1].status==="fulfilled"?resultados[1].value:[];
  const clientesSales=resultados[2].status==="fulfilled"?resultados[2].value.docs.map(x=>({id:x.id,...x.data()})):[];
  clientesRelacionamento=resultados[3].status==="fulfilled"?resultados[3].value.docs.map(x=>({id:x.id,...x.data()})):[];

  const hoje=localIso(),rhAtivos=new Map(rhs.filter(x=>x.status!=="estornado"&&(!x.admissao||x.admissao<=hoje)&&(!x.demissao||x.demissao>=hoje)).map(x=>[x.id,x])),vendMap=new Map();
  configs.filter(x=>x.status!=="inativo"&&(!x.tipoComissao||x.tipoComissao==="vendedor")).forEach(v=>{
    const rh=rhAtivos.get(v.rhColaboradorId),nome=String(rh?.nome||v.nome||"").trim();if(!nome)return;
    const chave=String(v.rhColaboradorId||norm(nome)),atual=vendMap.get(chave);
    vendMap.set(chave,{id:chave,nome,email:rh?.email||v.email||"",cargoNome:rh?.cargoNome||v.cargoNome||"",origem:"rh",configIds:[...(atual?.configIds||[]),v.id]})
  });
  if(rhAtivos.size){
    [...rhAtivos.values()].filter(x=>x.codigoVendedor||/vendedor|comercial/i.test(String(x.cargoNome||""))).forEach(rh=>{
      const chave=String(rh.id),atual=vendMap.get(chave);if(!atual)vendMap.set(chave,{id:chave,nome:rh.nome||"",email:rh.email||"",cargoNome:rh.cargoNome||"",origem:"rh",configIds:[]})
    })
  }
  vendedoresVisitas=[...vendMap.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));

  const cliMap=new Map();
  clientesSales.filter(x=>x.status!=="inativo").forEach(x=>{
    const nome=String(x.nome||"").trim();if(!nome)return;const cidade=String(x.cidade||"").trim(),uf=String(x.uf||"").trim().toUpperCase(),ch=chaveCliente(nome,cidade);
    const atual=cliMap.get(ch);if(!atual)cliMap.set(ch,{id:"sales:"+x.id,nome,cidade,uf,origem:"vendas",ids:[x.id]});else atual.ids.push(x.id)
  });
  clientesRelacionamento.filter(x=>x.status!=="inativo").forEach(x=>{
    const nome=String(x.nome||"").trim();if(!nome)return;const cidade=String(x.cidade||"").trim(),uf=String(x.uf||"").trim().toUpperCase(),ch=chaveCliente(nome,cidade);
    if(!cliMap.has(ch))cliMap.set(ch,{id:"rel:"+x.id,nome,cidade,uf,origem:"relacionamento",ids:[x.id]})
  });
  clientesVisitas=[...cliMap.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")||a.cidade.localeCompare(b.cidade,"pt-BR"));
  preencherBasesVisitas()
}
function preencherBasesVisitas(){
  const sv=$("visVendedor"),sc=$("visCliente");
  if(sv){const atual=sv.value;sv.innerHTML='<option value="">Selecione...</option>'+vendedoresVisitas.map(x=>`<option value="${esc(x.id)}">${esc(x.nome)}${x.cargoNome?" · "+esc(x.cargoNome):""}</option>`).join("");if([...sv.options].some(o=>o.value===atual))sv.value=atual}
  if(sc){const atual=sc.value;sc.innerHTML='<option value="">Selecione...</option>'+clientesVisitas.map(x=>`<option value="${esc(x.id)}">${esc(x.nome)}${x.cidade?" · "+esc(x.cidade+(x.uf?" / "+x.uf:"")):""}</option>`).join("");if([...sc.options].some(o=>o.value===atual))sc.value=atual}
}
function sincronizarClienteVisita(){const x=clientesVisitas.find(v=>v.id===$("visCliente")?.value);if(x&&$("visCidade"))$("visCidade").value=x.cidade||""}
function sincronizarVendedorVisita(){const x=vendedoresVisitas.find(v=>v.id===$("visVendedor")?.value);if(x&&$("visEmail")&&!$("visEmail").value)$("visEmail").value=x.email||""}
async function salvarClienteRelacionamento(e){
  e.preventDefault();if(!registrar("visitas"))return;
  const nome=String($("visNovoClienteNome")?.value||"").trim(),cidade=String($("visNovoClienteCidade")?.value||"").trim(),uf=String($("visNovoClienteUf")?.value||"").trim().toUpperCase();
  if(!nome||!cidade)return msg($("visNovoClienteMsg"),"Informe cliente e cidade.");
  const repetido=clientesVisitas.find(x=>chaveCliente(x.nome,x.cidade)===chaveCliente(nome,cidade));if(repetido)return msg($("visNovoClienteMsg"),"Este cliente já está disponível na lista.");
  try{
    msg($("visNovoClienteMsg"),"Incluindo...");
    const ref=await addDoc(collection(db,"clientesRelacionamento"),{grupoId:grupoAtualId(),nome,cidade,uf,status:"ativo",origem:"visitas_contatos",criadoPor:uid(),criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()});
    clientesRelacionamento.push({id:ref.id,grupoId:grupoAtualId(),nome,cidade,uf,status:"ativo",origem:"visitas_contatos"});
    await carregarBasesVisitas();const novo=clientesVisitas.find(x=>chaveCliente(x.nome,x.cidade)===chaveCliente(nome,cidade));if(novo&&$("visCliente"))$("visCliente").value=novo.id;sincronizarClienteVisita();
    $("visitasClienteBox")?.classList.add("hidden");$("visitasClienteForm")?.reset();msg($("visNovoClienteMsg"),"")
  }catch(err){console.error(err);msg($("visNovoClienteMsg"),"Não foi possível incluir o cliente. Confira as permissões publicadas.")}
}
function limpar(k){
  edicao[k]=null;$(k+"Form")?.reset();if(el(k,"Data"))el(k,"Data").value=localIso();
  if(k==="orcamentos")el(k,"Status").value="aguardando_aprovacao";
  if(k==="visitas"){preencherBasesVisitas();if($("visCidade"))$("visCidade").value=""}
  $(k+"FormTitulo").textContent="Novo registro";msg($(k+"Mensagem"),"")
}
function novo(k){
  if(!registrar(k))return;
  if(k!=="visitas"&&!empresaUnicaSelecionadaId())return alert("Selecione apenas uma empresa no cabeçalho.");
  limpar(k);$(k+"FormBox").classList.remove("hidden");$(k+"FormBox").scrollIntoView({behavior:"smooth",block:"start"})
}
function abrirEdicao(k,id){
  const x=dados[k].find(v=>v.id===id);if(!x||!editar(k)||(!gestor(k)&&x.responsavelId!==uid()))return;
  if(k==="visitas"){
    edicao[k]=id;limpar(k);edicao[k]=id;
    el(k,"Data").value=x.data||"";
    const vend=vendedoresVisitas.find(v=>v.id===x.vendedorId)||vendedoresVisitas.find(v=>norm(v.nome)===norm(x.vendedor));if(vend)el(k,"Vendedor").value=vend.id;
    const cli=clientesVisitas.find(v=>v.id===x.clienteId)||clientesVisitas.find(v=>chaveCliente(v.nome,v.cidade)===chaveCliente(x.cliente,x.cidade))||clientesVisitas.find(v=>norm(v.nome)===norm(x.cliente));if(cli)el(k,"Cliente").value=cli.id;
    ["Obra","Cidade","Material","Assunto","Email","Observacao"].forEach(n=>{el(k,n).value=x[n.charAt(0).toLowerCase()+n.slice(1)]??""});
    el(k,"Tipo").value=tipoVisitaCanon(x.tipo);$("visitasFormTitulo").textContent="Editar visita / contato";$("visitasFormBox").classList.remove("hidden");$("visitasFormBox").scrollIntoView({behavior:"smooth",block:"start"});return
  }
  if(x.empresaId!==empresaUnicaSelecionadaId())return alert("Selecione a empresa deste registro para editar.");
  edicao[k]=id;const nomes=["Data","Vendedor","Cliente","Produto","Cidade","Comprador","NumeroVb","Valor","Status","Telefone","Email","Observacao","Justificativa"];nomes.forEach(n=>{el(k,n).value=x[n.charAt(0).toLowerCase()+n.slice(1)]??""});$(k+"FormTitulo").textContent="Editar registro";$(k+"FormBox").classList.remove("hidden");$(k+"FormBox").scrollIntoView({behavior:"smooth",block:"start"})
}
function formularioDados(k){
  if(k==="visitas"){
    const vend=vendedoresVisitas.find(x=>x.id===$("visVendedor")?.value),cli=clientesVisitas.find(x=>x.id===$("visCliente")?.value),tipo=$("visTipo")?.value||"";
    return{data:$("visData")?.value||"",vendedorId:vend?.id||"",vendedor:vend?.nome||"",clienteId:cli?.id||"",clienteOrigem:cli?.origem||"",cliente:cli?.nome||"",obra:String($("visObra")?.value||"").trim(),cidade:String($("visCidade")?.value||cli?.cidade||"").trim(),material:String($("visMaterial")?.value||"").trim(),assunto:String($("visAssunto")?.value||"").trim(),tipo,email:String($("visEmail")?.value||"").trim(),observacao:String($("visObservacao")?.value||"").trim()}
  }
  const nomes=["Data","Vendedor","Cliente","Produto","Cidade","Comprador","NumeroVb","Valor","Status","Telefone","Email","Observacao","Justificativa"],d={};nomes.forEach(n=>{d[n.charAt(0).toLowerCase()+n.slice(1)]=String(el(k,n).value||"").trim()});d.valor=Number(d.valor);return d
}
async function consultar(k){
  const grupo=grupoAtualId(),id=uid();if(!grupo)return[];
  if(k==="visitas"){
    const cond=[where("grupoId","==",grupo)];if(!gestor(k))cond.push(where("responsavelId","==",id));
    const s=await getDocs(query(collection(db,MODELOS[k].colecao),...cond));return s.docs.map(x=>({id:x.id,...x.data()}))
  }
  const empresas=empresasSelecionadasIds();if(!empresas.length)return[];
  const blocos=await Promise.all(empresas.map(async empresaId=>{const cond=[where("grupoId","==",grupo),where("empresaId","==",empresaId)];if(!gestor(k))cond.push(where("responsavelId","==",id));const s=await getDocs(query(collection(db,MODELOS[k].colecao),...cond));return s.docs.map(x=>({id:x.id,...x.data()}))}));return blocos.flat()
}
async function carregar(k){
  if(ocupado[k]||!ver(k))return;ocupado[k]=true;
  try{
    if(k==="visitas")await carregarBasesVisitas();
    dados[k]=await consultar(k);$(k+"Aviso").classList.add("hidden");render(k)
  }catch(e){console.error(e);dados[k]=[];render(k);$(k+"Aviso").textContent="Não foi possível consultar os registros. Confira o perfil e as Rules publicadas no Firebase.";$(k+"Aviso").classList.remove("hidden")}finally{ocupado[k]=false}
}
function visitasDoPeriodo(){
  const ano=periodoAno(),meses=indicesPeriodo();
  return dados.visitas.filter(x=>anoData(x.data)===ano&&meses.includes(mesData(x.data)))
}
function barRows(items,total=0){
  const max=Math.max(1,...items.map(x=>x.valor));
  return items.map((x,i)=>`<div class="commercial-bar-row"><span class="commercial-bar-pos">${i+1}</span><strong title="${esc(x.nome)}">${esc(x.nome)}</strong><i><b style="width:${Math.max(x.valor?3:0,x.valor/max*100)}%"></b></i><em>${x.valor.toLocaleString("pt-BR")}</em>${total?`<small>${(x.valor/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%</small>`:""}</div>`).join("")
}
function renderVisitasGraficos(periodo){
  const ano=periodoAno(),anoDados=dados.visitas.filter(x=>anoData(x.data)===ano),meses=MESES.map((nome,i)=>({nome,valor:anoDados.filter(x=>mesData(x.data)===i).length})),maxMes=Math.max(1,...meses.map(x=>x.valor));
  $("visitasGraficoAnoLabel").textContent="Ano "+ano;
  $("visitasGrafico12").innerHTML=meses.map(x=>`<div class="commercial-month-col"><strong>${x.valor}</strong><i><b style="height:${x.valor?Math.max(4,x.valor/maxMes*100):0}%"></b></i><span>${x.nome}</span></div>`).join("");

  const porCliente=new Map(),porCidade=new Map(),porTipo=new Map(TIPOS_VISITA.map(([v,t])=>[v,{nome:t,valor:0}]));
  periodo.forEach(x=>{
    const ck=norm(x.cliente)||"não informado",cv=porCliente.get(ck)||{nome:x.cliente||"Cliente não informado",valor:0};cv.valor++;porCliente.set(ck,cv);
    const cidade=String(x.cidade||"Cidade não informada").trim()||"Cidade não informada",city=porCidade.get(norm(cidade))||{nome:cidade,valor:0};city.valor++;porCidade.set(norm(cidade),city);
    const tipo=tipoVisitaCanon(x.tipo),tv=porTipo.get(tipo)||{nome:tipoVisitaNome(tipo),valor:0};tv.valor++;porTipo.set(tipo,tv)
  });
  const clientes=[...porCliente.values()].sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,"pt-BR")).slice(0,15),cidades=[...porCidade.values()].sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,"pt-BR")).slice(0,15),tipos=[...porTipo.values()].sort((a,b)=>b.valor-a.valor);
  $("visitasGraficoCliente").innerHTML=clientes.length?barRows(clientes,periodo.length):'<div class="empty-state">Sem contatos no período.</div>';
  $("visitasGraficoCidade").innerHTML=cidades.length?barRows(cidades,periodo.length):'<div class="empty-state">Sem contatos no período.</div>';
  $("visitasGraficoTipo").innerHTML=barRows(tipos,periodo.length)
}
function renderVisitas(){
  const periodo=visitasDoPeriodo(),termo=norm($("visitasBusca")?.value),tipoFiltro=$("visitasFiltroTipo")?.value||"",filtrados=periodo.filter(x=>(!termo||[x.cliente,x.vendedor,x.cidade,x.assunto].some(v=>norm(v).includes(termo)))&&(!tipoFiltro||tipoVisitaCanon(x.tipo)===tipoFiltro));
  $("visitasKpiTotal").textContent=String(periodo.length);$("visitasKpiSegundo").textContent=String(new Set(periodo.map(x=>norm(x.cliente)).filter(Boolean)).size);$("visitasKpiPeriodo").textContent=`Ano ${periodoAno()} · ${periodoChave()==="total"?"ano completo":"período selecionado"}`;
  renderVisitasGraficos(periodo);
  $("visitasLista").innerHTML=filtrados.sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(x=>{const acao=editar("visitas")?`<button type="button" class="btn-acao destaque" data-visitas-edit="${esc(x.id)}">Editar</button>`:"";return `<tr><td>${dataBr(x.data)}</td><td><strong>${esc(x.cliente)}</strong><small>${esc(x.cidade||x.obra||"")}</small></td><td>${esc(x.vendedor)}</td><td>${esc(tipoVisitaNome(x.tipo))}</td><td>${esc(x.assunto||"—")}</td><td>${acao}</td></tr>`}).join("")||'<tr><td colspan="6">Nenhum registro encontrado no período.</td></tr>';
  document.querySelectorAll("[data-visitas-edit]").forEach(b=>b.addEventListener("click",()=>abrirEdicao("visitas",b.dataset.visitasEdit)))
}
function render(k){
  if(k==="visitas"){renderVisitas();return}
  const termo=String($(k+"Busca")?.value||"").toLocaleLowerCase("pt-BR"),status=$(k+"FiltroStatus")?.value||"",filtrados=dados[k].filter(x=>[x.cliente,x.vendedor,x.produto].some(s=>String(s||"").toLocaleLowerCase("pt-BR").includes(termo))&&(!status||x.status===status));const abertos=filtrados.filter(x=>ABERTOS.has(x.status)),vencidos=abertos.filter(x=>x.proximoContatoEm&&Date.parse(x.proximoContatoEm)<=Date.now());$(k+"KpiTotal").textContent=String(abertos.length);$(k+"KpiSegundo").textContent=String(vencidos.length);$("orcamentosKpiValor").textContent=dinheiro(abertos.reduce((a,x)=>a+Number(x.valor||0),0));renderMesa();
  $(k+"Lista").innerHTML=filtrados.sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(x=>{const acao=editar(k)?`<button type="button" class="btn-acao destaque" data-${k}-edit="${esc(x.id)}">Editar</button>`:"",vencido=ABERTOS.has(x.status)&&x.proximoContatoEm&&Date.parse(x.proximoContatoEm)<=Date.now();return `<tr><td>${dataBr(x.data)}</td><td><strong>${esc(x.cliente)}</strong><small>${esc(x.produto)}</small></td><td>${esc(x.vendedor)}</td><td>${dinheiro(x.valor)}</td><td><strong>${esc(STATUS[x.status]||x.status)}</strong>${ABERTOS.has(x.status)?`<small>${vencido?"Contato pendente":"Próximo contato"}: ${new Date(x.proximoContatoEm).toLocaleString("pt-BR")}</small>`:""}</td><td>${acao}${ABERTOS.has(x.status)&&editar(k)?`<button type="button" class="btn-acao" data-orc-follow="${esc(x.id)}">Registrar contato</button>`:""}${Array.isArray(x.contatos)&&x.contatos.length?`<button type="button" class="btn-acao" data-orc-history="${esc(x.id)}">Histórico (${x.contatos.length})</button>`:""}</td></tr>`}).join("")||'<tr><td colspan="6">Nenhum registro encontrado.</td></tr>';
  document.querySelectorAll(`[data-${k}-edit]`).forEach(b=>b.addEventListener("click",()=>abrirEdicao(k,b.dataset[`${k}Edit`])));
  document.querySelectorAll("[data-orc-follow]").forEach(b=>b.addEventListener("click",()=>followUp(b.dataset.orcFollow)));
  document.querySelectorAll("[data-orc-history]").forEach(b=>b.addEventListener("click",()=>{const x=dados.orcamentos.find(v=>v.id===b.dataset.orcHistory);if(!x)return;alert((x.contatos||[]).map(c=>`${new Date(c.em).toLocaleString("pt-BR")} · ${c.resultado}`).join("\n\n"))}))
}
async function salvar(k,e){
  e.preventDefault();
  if(k==="visitas"){
    const d=formularioDados(k);if(!d.data||!d.vendedorId||!d.vendedor||!d.clienteId||!d.cliente||!TIPOS_VISITA.some(([v])=>v===d.tipo))return msg($("visitasMensagem"),"Informe data, vendedor, cliente e tipo de contato.");
    try{
      msg($("visitasMensagem"),"Salvando...");
      if(edicao.visitas){
        const x=dados.visitas.find(v=>v.id===edicao.visitas);if(!x||!editar("visitas")||(!gestor("visitas")&&x.responsavelId!==uid()))throw new Error("Edição não autorizada.");
        await updateDoc(doc(db,"visitasComerciais",x.id),{...d,atualizadoEm:serverTimestamp()})
      }else{
        if(!registrar("visitas"))throw new Error("Sem permissão.");
        await addDoc(collection(db,"visitasComerciais"),{...d,grupoId:grupoAtualId(),responsavelId:uid(),origem:"sig",criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()})
      }
      $("visitasFormBox").classList.add("hidden");limpar("visitas");emitirAlteracao("visitas");await carregar("visitas")
    }catch(err){console.error(err);msg($("visitasMensagem"),err.message||"Não foi possível salvar.")}
    return
  }
  const emp=empresaUnicaSelecionadaId();if(!emp)return alert("Selecione apenas uma empresa no cabeçalho.");const d=formularioDados(k);if(!d.data||!d.vendedor||!d.cliente||!d.produto||!Number.isFinite(d.valor)||d.valor<0||!STATUS[d.status])return msg($(k+"Mensagem"),"Revise os campos obrigatórios.");if(d.telefone&&d.telefone.replace(/\D/g,"").length!==11)return msg($(k+"Mensagem"),"Telefone deve conter DDD e nove dígitos.");
  try{msg($(k+"Mensagem"),"Salvando...");if(edicao[k]){const x=dados[k].find(v=>v.id===edicao[k]);if(!x||!editar(k)||(!gestor(k)&&x.responsavelId!==uid())||x.empresaId!==emp)throw new Error("Edição não autorizada.");if(ABERTOS.has(d.status)&&!ABERTOS.has(x.status))d.proximoContatoEm=proximo24();await atualizarDocumento(MODELOS[k].colecao,x.id,d)}else{if(!registrar(k))throw new Error("Sem permissão.");await criarDocumento(MODELOS[k].colecao,{...d,proximoContatoEm:ABERTOS.has(d.status)?proximo24():"",ultimoContatoEm:"",empresaId:emp,responsavelId:uid(),origem:"sig"})}$(k+"FormBox").classList.add("hidden");limpar(k);emitirAlteracao(k);await carregar(k)}catch(err){console.error(err);msg($(k+"Mensagem"),err.message||"Não foi possível salvar.")}
}
async function followUp(id){const x=dados.orcamentos.find(v=>v.id===id);if(!x||!ABERTOS.has(x.status)||!editar("orcamentos")||(!gestor("orcamentos")&&x.responsavelId!==uid()))return;const nota=prompt(`Contato com ${x.cliente}: registre um breve resultado`);if(nota===null)return;if(!nota.trim())return alert("Informe o resultado do contato.");try{const instante=agoraIso();await atualizarDocumento("orcamentosComerciais",id,{ultimoContatoEm:instante,proximoContatoEm:proximo24(),notaUltimoContato:nota.trim(),contatos:arrayUnion({em:instante,por:uid(),resultado:nota.trim()})});emitirAlteracao("orcamentos");await carregar("orcamentos")}catch(e){console.error(e);alert("Não foi possível registrar o contato.")}}
function montarMesa(){const mesa=$("pagina-minhamesa"),dash=$("pagina-dashboard");if(mesa&&!$("mesaOrcamentos")){const s=document.createElement("section");s.id="mesaOrcamentos";s.className="lista-card hidden";s.innerHTML='<div class="lista-cabecalho"><div><h3>Orçamentos para acompanhar</h3><p>Próximo contato a cada 24 horas enquanto o orçamento estiver aberto.</p></div><button id="mesaAbrirOrcamentos" class="btn-secundario" type="button">Abrir Orçamentos</button></div><div id="mesaOrcamentosLista" class="commercial-mesa-list"></div>';mesa.appendChild(s);$("mesaAbrirOrcamentos").addEventListener("click",()=>{abrirPagina("orcamentos");carregar("orcamentos")})}if(dash&&!$("dashOrcamentos")){const s=document.createElement("section");s.id="dashOrcamentos";s.className="lista-card hidden";s.innerHTML='<div class="lista-cabecalho"><div><h3>Comercial · Orçamentos</h3><p>Carteira aberta e contatos pendentes da equipe.</p></div><button id="dashAbrirOrcamentos" class="btn-secundario" type="button">Abrir Orçamentos</button></div><div class="kpi-grid kpi-grid-4"><div class="kpi-card"><span>Em aberto</span><strong id="dashOrcAbertos">—</strong></div><div class="kpi-card"><span>Contato vencido</span><strong id="dashOrcVencidos">—</strong></div><div class="kpi-card"><span>Valor em aberto</span><strong id="dashOrcValor">—</strong></div></div>';dash.appendChild(s);$("dashAbrirOrcamentos").addEventListener("click",()=>{abrirPagina("orcamentos");carregar("orcamentos")})}}
function renderMesa(){montarMesa();const acesso=ver("orcamentos"),todos=dados.orcamentos.filter(x=>ABERTOS.has(x.status)),meus=todos.filter(x=>x.responsavelId===uid()),vencidos=todos.filter(x=>Date.parse(x.proximoContatoEm)<=Date.now());if($("dashOrcamentos"))$("dashOrcamentos").classList.toggle("hidden",!acesso);if($("mesaOrcamentos"))$("mesaOrcamentos").classList.toggle("hidden",!acesso);if(!acesso)return;$("dashOrcAbertos").textContent=String(todos.length);$("dashOrcVencidos").textContent=String(vencidos.length);$("dashOrcValor").textContent=dinheiro(todos.reduce((s,x)=>s+Number(x.valor||0),0));$("mesaOrcamentosLista").innerHTML=meus.sort((a,b)=>String(a.proximoContatoEm).localeCompare(String(b.proximoContatoEm))).slice(0,12).map(x=>`<div class="commercial-mesa-row"><strong>${esc(x.cliente)} · ${esc(x.produto)}</strong><span>${Date.parse(x.proximoContatoEm)<=Date.now()?"Contato pendente":"Próximo contato"}: ${new Date(x.proximoContatoEm).toLocaleString("pt-BR")}</span></div>`).join("")||'<p>Não há orçamentos abertos sob sua responsabilidade.</p>'}
function instalar(){if(!document.querySelector('link[href^="commercial-workflow.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="commercial-workflow.css?v=3";document.head.appendChild(l)}for(const k of Object.keys(MODELOS)){montar(k);menu(k);$(k+"Novo")?.classList.toggle("hidden",!registrar(k))}montarMesa()}
instalar();
window.addEventListener("sig:ready",()=>{instalar();for(const k of Object.keys(MODELOS))if(ver(k))carregar(k)});
window.addEventListener("sig:empresa-contexto",()=>{if(!$("pagina-orcamentos")?.classList.contains("hidden"))carregar("orcamentos")});
window.addEventListener("sig:periodo-changed",()=>{if(!$("pagina-visitas")?.classList.contains("hidden"))render("visitas")});
window.addEventListener("sig:data-changed",e=>{
  const k=e.detail?.modulo;
  if(MODELOS[k]&&!$("pagina-"+k)?.classList.contains("hidden"))carregar(k);
  else if(["vendas","rh"].includes(k)&&!$("pagina-visitas")?.classList.contains("hidden"))carregar("visitas")
});
