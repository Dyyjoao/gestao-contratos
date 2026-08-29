import {
  $, on, esc, norm, msg, permite, state, moeda, dataBr, diasAte,
  preencherEmpresaSelect, listarDocumentos, criarDocumento, atualizarDocumento,
  excluirDocumento, emitirAlteracao, abrirBox, fecharBox, confirmar
} from "./shared.js";
import { uploadArquivo } from "./storage.js";

let dados=[];
let centros=[];
let plano=[];
let editId=null;

const box=$("formContratoContainer");
const form=$("formContrato");
const titulo=$("tituloFormContrato");
const mensagem=$("mensagemContrato");
const lista=$("listaContratos");
const busca=$("buscaContrato");
const qtd=$("quantidadeContratos");
const empresa=$("contratoEmpresa");
const numero=$("contratoNumero");
const fornecedor=$("contratoFornecedor");
const objeto=$("contratoObjeto");
const inicio=$("contratoInicio");
const fim=$("contratoFim");
const valorCampo=$("contratoValor");
const responsavel=$("contratoResponsavel");
const status=$("contratoStatus");
const reajuste=$("contratoReajuste");
const obs=$("contratoObservacoes");

function montarCampos(){
  const grid=form?.querySelector(".form-grid");
  if(!grid||$("contratoCentroCusto"))return;

  const campoEmpresa=empresa?.closest(".campo");
  const cc=document.createElement("div");
  cc.className="campo";
  cc.innerHTML='<label for="contratoCentroCusto">Centro de custo</label><select id="contratoCentroCusto"><option value="">Sem centro específico</option></select>';

  const arq=document.createElement("div");
  arq.className="campo campo-span-2";
  arq.innerHTML='<label for="contratoArquivo">Arquivo do contrato</label><input id="contratoArquivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"><small id="contratoArquivoAtual" class="arquivo-atual"></small>';

  const integracao=document.createElement("div");
  integracao.className="campo-span-3 contrato-driver-card";
  integracao.innerHTML=`
    <div class="contrato-driver-head">
      <div><strong>Integração FP&A</strong><small>Use o contrato como driver de Budget, Forecast e Fluxo de Caixa.</small></div>
      <label class="driver-switch"><input id="contratoPlanejamentoAtivo" type="checkbox"><span>Usar no planejamento</span></label>
      <label class="driver-switch"><input id="contratoCaixaAtivo" type="checkbox"><span>Provisionar no caixa</span></label>
    </div>
    <div id="contratoDriverCampos" class="form-grid form-grid-3 contrato-driver-campos">
      <div class="campo"><label for="contratoContaGerencial">Conta gerencial</label><select id="contratoContaGerencial"><option value="">Selecione...</option></select></div>
      <div class="campo"><label for="contratoDiaVencimento">Dia de pagamento</label><input id="contratoDiaVencimento" type="number" min="1" max="31" placeholder="Ex.: 10"></div>
      <div class="campo"><label for="contratoReajusteTipo">Regra de reajuste</label><select id="contratoReajusteTipo"><option value="sem_reajuste">Sem reajuste</option><option value="percentual_fixo">Percentual fixo</option><option value="indice">Índice</option></select></div>
      <div class="campo"><label for="contratoIndiceReajuste">Índice / referência</label><input id="contratoIndiceReajuste" placeholder="Ex.: IPCA, IGP-M, INPC"></div>
      <div class="campo"><label for="contratoPercentualProjetado">Índice / reajuste projetado (%)</label><input id="contratoPercentualProjetado" type="number" step="0.01" placeholder="Ex.: 4,50"></div>
      <div class="campo"><label for="contratoPeriodicidade">Periodicidade (meses)</label><input id="contratoPeriodicidade" type="number" min="1" max="60" value="12"></div>
      <div class="campo campo-span-3"><label for="contratoComentarioPlanejamento">Comentário para Budget / Forecast</label><input id="contratoComentarioPlanejamento" placeholder="Ex.: reajuste anual IPCA, data-base março; valor conforme contrato CTR-014"></div>
    </div>`;

  if(campoEmpresa){
    campoEmpresa.after(cc);
    cc.after(arq);
    arq.after(integracao);
  }else{
    grid.prepend(integracao);
    grid.prepend(arq);
    grid.prepend(cc);
  }

  const head=form.closest("section")?.nextElementSibling?.querySelector("thead tr");
  if(head)head.innerHTML="<th>Contrato</th><th>Centro de custo</th><th>Vigência</th><th>Valor mensal</th><th>Status</th><th>Ações</th>";
}

montarCampos();

const centro=()=>$("contratoCentroCusto");
const arquivo=()=>$("contratoArquivo");
const arquivoAtual=()=>$("contratoArquivoAtual");
const planejamentoAtivo=()=>$("contratoPlanejamentoAtivo");
const caixaAtivo=()=>$("contratoCaixaAtivo");
const contaGerencial=()=>$("contratoContaGerencial");
const diaVencimento=()=>$("contratoDiaVencimento");
const reajusteTipo=()=>$("contratoReajusteTipo");
const indiceReajuste=()=>$("contratoIndiceReajuste");
const percentualProjetado=()=>$("contratoPercentualProjetado");
const periodicidade=()=>$("contratoPeriodicidade");
const comentarioPlanejamento=()=>$("contratoComentarioPlanejamento");

function centroNome(id){
  const c=centros.find(x=>x.id===id);
  return c?`${c.codigo||""}${c.codigo?" · ":""}${c.nome||""}`:"-";
}

function preencherCentros(valor=""){
  const el=centro();
  if(!el)return;
  el.innerHTML='<option value="">Sem centro específico</option>'+centros
    .filter(x=>x.status!=="inativo")
    .sort((a,b)=>String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"))
    .map(x=>`<option value="${x.id}">${esc(x.codigo||"")} · ${esc(x.nome||"")}</option>`).join("");
  el.value=valor||"";
}

function preencherPlano(valor=""){
  const el=contaGerencial();
  if(!el)return;
  el.innerHTML='<option value="">Selecione...</option>'+plano
    .filter(x=>x.status!=="inativo")
    .sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0)||String(a.codigo||"").localeCompare(String(b.codigo||""),"pt-BR"))
    .map(x=>`<option value="${x.id}">${esc(x.codigo||"")} · ${esc(x.nome||"")}</option>`).join("");
  el.value=valor||"";
}

function atualizarDriverCampos(){
  const ativo=planejamentoAtivo()?.checked===true||caixaAtivo()?.checked===true;
  $("contratoDriverCampos")?.classList.toggle("driver-inativo",!ativo);
}

function limpar(){
  editId=null;
  form?.reset();
  preencherCentros();
  preencherPlano();
  if(periodicidade())periodicidade().value=12;
  if(titulo)titulo.textContent="Novo contrato";
  if(arquivoAtual())arquivoAtual().innerHTML="";
  atualizarDriverCampos();
  msg(mensagem,"");
}

async function abrir(item=null){
  limpar();
  await preencherEmpresaSelect(empresa,{valorAtual:item?.empresaId||state.usuario?.empresaId});
  if(item){
    editId=item.id;
    titulo.textContent="Editar contrato";
    numero.value=item.numero||"";
    fornecedor.value=item.fornecedor||"";
    objeto.value=item.objeto||"";
    inicio.value=item.inicio||"";
    fim.value=item.fim||"";
    valorCampo.value=Number(item.valorMensal||0);
    responsavel.value=item.responsavel||"";
    status.value=item.status||"ativo";
    reajuste.value=item.reajuste||"";
    obs.value=item.observacoes||"";
    empresa.value=item.empresaId||"";
    preencherCentros(item.centroCustoId||"");
    preencherPlano(item.contaGerencialId||"");
    if(planejamentoAtivo())planejamentoAtivo().checked=item.planejamentoAtivo===true;
    if(caixaAtivo())caixaAtivo().checked=item.fluxoCaixaAtivo===true;
    if(diaVencimento())diaVencimento().value=item.diaVencimento||"";
    if(reajusteTipo())reajusteTipo().value=item.regraReajuste?.tipo||"sem_reajuste";
    if(indiceReajuste())indiceReajuste().value=item.regraReajuste?.indice||"";
    if(percentualProjetado())percentualProjetado().value=Number(item.regraReajuste?.percentualProjetado||0)||"";
    if(periodicidade())periodicidade().value=Number(item.regraReajuste?.periodicidadeMeses||12);
    if(comentarioPlanejamento())comentarioPlanejamento().value=item.comentarioPlanejamento||"";
    if(item.arquivoPrincipal?.url&&arquivoAtual())arquivoAtual().innerHTML=`Arquivo atual: <a href="${esc(item.arquivoPrincipal.url)}" target="_blank" rel="noopener">${esc(item.arquivoPrincipal.nome||"Abrir arquivo")}</a>`;
  }
  atualizarDriverCampos();
  abrirBox(box,objeto);
  box?.scrollIntoView({behavior:"smooth",block:"start"});
}

function statusContrato(item){
  if(item.status==="encerrado")return'<span class="status-inativo">Encerrado</span>';
  if(item.status==="suspenso")return'<span class="status-aviso">Suspenso</span>';
  const d=diasAte(item.fim);
  if(d!==null&&d<0)return'<span class="status-inativo">Vencido</span>';
  if(d!==null&&d<=60)return'<span class="status-aviso">A vencer</span>';
  return'<span class="status-ativo">Ativo</span>';
}

function render(filtro=""){
  const t=norm(filtro);
  const arr=dados.filter(x=>!t||[x.numero,x.fornecedor,x.objeto,x.responsavel,centroNome(x.centroCustoId)].some(v=>norm(v).includes(t)))
    .sort((a,b)=>String(a.fim||"9999").localeCompare(String(b.fim||"9999")));
  const ativos=dados.filter(x=>x.status==="ativo"&&((diasAte(x.fim)??1)>=0));
  const av=ativos.filter(x=>{const d=diasAte(x.fim);return d!==null&&d<=60});
  const venc=dados.filter(x=>x.status==="ativo"&&(diasAte(x.fim)??0)<0);
  $("contratosAtivos").textContent=ativos.length;
  $("contratosAVencer").textContent=av.length;
  $("contratosVencidos").textContent=venc.length;
  $("contratosValorMensal").textContent=moeda(ativos.reduce((s,x)=>s+Number(x.valorMensal||0),0));
  if(qtd)qtd.textContent=`${dados.length} contrato(s) cadastrado(s)`;
  if(!lista)return;
  if(!arr.length){lista.innerHTML='<tr><td colspan="6">Nenhum contrato encontrado.</td></tr>';return}
  lista.innerHTML=arr.map(x=>`<tr>
    <td class="celula-principal"><strong>${esc(x.numero||x.fornecedor||"Contrato")}</strong><span>${esc(x.objeto||"")}${x.planejamentoAtivo?" · FP&A":""}${x.fluxoCaixaAtivo?" · Caixa":""}</span></td>
    <td>${esc(centroNome(x.centroCustoId))}</td>
    <td>${dataBr(x.inicio)} → ${dataBr(x.fim)}</td>
    <td>${moeda(x.valorMensal)}</td>
    <td>${statusContrato(x)}</td>
    <td><div class="acoes-tabela">${x.arquivoPrincipal?.url?`<a class="btn-acao" href="${esc(x.arquivoPrincipal.url)}" target="_blank" rel="noopener">Arquivo</a>`:""}${permite("contratos","editar")?`<button class="btn-acao destaque" data-ctr-edit="${x.id}" type="button">Editar</button>`:""}${permite("contratos","excluir")?`<button class="btn-acao perigo" data-ctr-del="${x.id}" type="button">Excluir</button>`:""}</div></td>
  </tr>`).join("");
  document.querySelectorAll("[data-ctr-edit]").forEach(b=>on(b,"click",()=>abrir(dados.find(x=>x.id===b.dataset.ctrEdit))));
  document.querySelectorAll("[data-ctr-del]").forEach(b=>on(b,"click",()=>remover(b.dataset.ctrDel)));
}

export async function carregarContratos(){
  if(!permite("contratos"))return;
  if(lista)lista.innerHTML='<tr><td colspan="6">Carregando contratos...</td></tr>';
  try{
    await preencherEmpresaSelect(empresa);
    const tarefas=[listarDocumentos("contratos"),listarDocumentos("centrosCusto")];
    if(permite("controladoria")||permite("contratos"))tarefas.push(listarDocumentos("planoContasGerencial"));
    const res=await Promise.all(tarefas);
    dados=res[0]||[];
    centros=res[1]||[];
    plano=res[2]||[];
    preencherCentros();
    preencherPlano();
    render(busca?.value||"");
  }catch(e){
    console.error(e);
    if(lista)lista.innerHTML='<tr><td colspan="6">Não foi possível carregar os contratos.</td></tr>';
  }
}

async function remover(id){
  const item=dados.find(x=>x.id===id);
  if(!item||!confirmar(`Excluir o contrato ${item.numero||item.fornecedor}?`))return;
  try{
    await excluirDocumento("contratos",id);
    await carregarContratos();
    emitirAlteracao("contratos");
  }catch(e){
    console.error(e);
    alert("Não foi possível excluir o contrato.");
  }
}

on($("btnNovoContrato"),"click",()=>abrir());
on($("btnCancelarContrato"),"click",()=>{limpar();box?.classList.add("hidden")});
on(busca,"input",()=>render(busca.value));
on(planejamentoAtivo(),"change",atualizarDriverCampos);
on(caixaAtivo(),"change",atualizarDriverCampos);

on(form,"submit",async ev=>{
  ev.preventDefault();
  const d={
    empresaId:empresa.value,
    numero:numero.value.trim(),
    fornecedor:fornecedor.value.trim(),
    objeto:objeto.value.trim(),
    inicio:inicio.value,
    fim:fim.value,
    valorMensal:Number(valorCampo.value||0),
    responsavel:responsavel.value.trim(),
    status:status.value,
    reajuste:reajuste.value,
    observacoes:obs.value.trim(),
    centroCustoId:centro()?.value||"",
    planejamentoAtivo:planejamentoAtivo()?.checked===true,
    fluxoCaixaAtivo:caixaAtivo()?.checked===true,
    contaGerencialId:contaGerencial()?.value||"",
    diaVencimento:Number(diaVencimento()?.value||0),
    regraReajuste:{
      tipo:reajusteTipo()?.value||"sem_reajuste",
      indice:indiceReajuste()?.value.trim()||"",
      percentualProjetado:Number(percentualProjetado()?.value||0),
      periodicidadeMeses:Number(periodicidade()?.value||12)
    },
    comentarioPlanejamento:comentarioPlanejamento()?.value.trim()||""
  };
  if(!d.empresaId||!d.fornecedor||!d.objeto||!d.inicio||!d.fim)return msg(mensagem,"Preencha fornecedor, objeto e vigência.");
  if(d.fim<d.inicio)return msg(mensagem,"A data de término não pode ser anterior ao início.");
  if((d.planejamentoAtivo||d.fluxoCaixaAtivo)&&!d.contaGerencialId)return msg(mensagem,"Selecione a conta gerencial para integrar o contrato ao FP&A.");
  try{
    msg(mensagem,"Salvando contrato...");
    let id=editId;
    if(editId)await atualizarDocumento("contratos",editId,d);
    else id=await criarDocumento("contratos",d);
    const f=arquivo()?.files?.[0];
    if(f){
      msg(mensagem,"Enviando arquivo...");
      const meta=await uploadArquivo({modulo:"contratos",registroId:id,arquivo:f,pasta:"principal"});
      await atualizarDocumento("contratos",id,{arquivoPrincipal:meta});
    }
    msg(mensagem,"Contrato salvo com sucesso.",true);
    await carregarContratos();
    emitirAlteracao("contratos");
    window.dispatchEvent(new CustomEvent("sig:contract-driver-changed",{detail:{contratoId:id}}));
    setTimeout(()=>fecharBox(box,form,mensagem),500);
  }catch(e){
    console.error(e);
    msg(mensagem,e?.code?.includes("storage")?"Contrato salvo, mas o Firebase Storage ainda precisa ser habilitado para anexos.":"Não foi possível salvar o contrato.");
  }
});

window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contratos")carregarContratos()});
window.addEventListener("sig:empresa-changed",()=>{if(!box?.classList.contains("hidden"))limpar()});
