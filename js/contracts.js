import {
  $, on, esc, norm, msg, permite, state, moeda, dataBr, diasAte,
  prepararEmpresaInput, empresaDoInput, listarDocumentos, criarDocumentoEmpresa, atualizarDocumento,
  excluirDocumento, emitirAlteracao, abrirBox, fecharBox, confirmar, nomeEmpresa
} from "./shared.js";
import { SIG_DRIVE_EMPRESAS_URL, metaAnexoDrive, nomeProvider } from "./drive-attachments.js";

let dados=[];
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
  if(!grid||$("contratoDriveUrl"))return;
  const campoEmpresa=empresa?.closest(".campo");
  const arq=document.createElement("div");
  arq.className="campo campo-span-3";
  arq.innerHTML=`
    <label>Anexo do contrato</label>
    <div class="drive-anexo-card">
      <div class="drive-anexo-head">
        <div><strong>Google Drive</strong><small>O SIG mantém a referência do documento sem duplicar o arquivo.</small></div>
        <a class="btn-secundario" href="${SIG_DRIVE_EMPRESAS_URL}" target="_blank" rel="noopener">Abrir pasta do SIG no Drive</a>
      </div>
      <div class="form-grid form-grid-2">
        <div class="campo"><label for="contratoDriveUrl">Link do arquivo no Drive</label><input id="contratoDriveUrl" type="url" placeholder="Cole aqui o link do arquivo do Google Drive"></div>
        <div class="campo"><label for="contratoDriveNome">Nome do arquivo</label><input id="contratoDriveNome" type="text" placeholder="Ex.: Contrato_Fornecedor_XYZ.pdf"></div>
      </div>
      <label class="driver-switch drive-remover"><input id="contratoRemoverArquivo" type="checkbox"><span>Remover vínculo do anexo atual</span></label>
      <small id="contratoArquivoAtual" class="arquivo-atual"></small>
    </div>`;
  if(campoEmpresa)campoEmpresa.after(arq);else grid.prepend(arq);
  if(!$("sig-drive-anexo-css")){const style=document.createElement("style");style.id="sig-drive-anexo-css";style.textContent=".drive-anexo-card{border:1px solid #dbe4e8;border-radius:12px;padding:12px;background:#f8fbfb}.drive-anexo-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.drive-anexo-head strong,.drive-anexo-head small{display:block}.drive-anexo-head small,.arquivo-atual{color:#667085;margin-top:3px}.drive-remover{margin-top:8px}.arquivo-atual a{font-weight:800}@media(max-width:720px){.drive-anexo-head{align-items:flex-start;flex-direction:column}}";document.head.appendChild(style)}
  const head=form.closest("section")?.nextElementSibling?.querySelector("thead tr");
  if(head)head.innerHTML="<th>Empresa</th><th>Contrato</th><th>Vigência</th><th>Valor mensal</th><th>Status</th><th>Ações</th>";
}
montarCampos();

const driveUrl=()=>$("contratoDriveUrl");
const driveNome=()=>$("contratoDriveNome");
const removerArquivo=()=>$("contratoRemoverArquivo");
const arquivoAtual=()=>$("contratoArquivoAtual");

function mostrarArquivo(item){
  if(!arquivoAtual())return;
  const a=item?.arquivoPrincipal;
  if(!a?.url){arquivoAtual().innerHTML="Nenhum arquivo vinculado.";return}
  arquivoAtual().innerHTML=`Arquivo atual: <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.nome||"Abrir arquivo")}</a> · ${esc(nomeProvider(a)||"Anexo")}`;
}
function limpar(){
  editId=null;form?.reset();if(titulo)titulo.textContent="Novo contrato";
  if(driveUrl())driveUrl().value="";if(driveNome())driveNome().value="";if(removerArquivo())removerArquivo().checked=false;
  mostrarArquivo(null);msg(mensagem,"");
}
async function abrir(item=null){
  limpar();await prepararEmpresaInput(empresa,{valorAtual:item?.empresaId||""});if(empresa){empresa.disabled=false}
  if(item){
    editId=item.id;titulo.textContent="Editar contrato";numero.value=item.numero||"";fornecedor.value=item.fornecedor||"";objeto.value=item.objeto||"";
    inicio.value=item.inicio||"";fim.value=item.fim||"";valorCampo.value=Number(item.valorMensal||0);responsavel.value=item.responsavel||"";
    status.value=item.status||"ativo";reajuste.value=item.reajuste||"";obs.value=item.observacoes||"";empresa.value=item.empresaId||"";empresa.disabled=true;
    if(driveNome())driveNome().value=item.arquivoPrincipal?.nome||"";mostrarArquivo(item);
  }
  abrirBox(box,objeto);box?.scrollIntoView({behavior:"smooth",block:"start"});
}
function statusContrato(item){
  if(item.status==="encerrado")return'<span class="status-inativo">Encerrado</span>';
  if(item.status==="suspenso")return'<span class="status-aviso">Suspenso</span>';
  const d=diasAte(item.fim);if(d!==null&&d<0)return'<span class="status-inativo">Vencido</span>';
  if(d!==null&&d<=60)return'<span class="status-aviso">A vencer</span>';return'<span class="status-ativo">Ativo</span>';
}
function render(filtro=""){
  const t=norm(filtro),arr=dados.filter(x=>!t||[x.numero,x.fornecedor,x.objeto,x.responsavel].some(v=>norm(v).includes(t))).sort((a,b)=>String(a.fim||"9999").localeCompare(String(b.fim||"9999")));
  const ativos=dados.filter(x=>x.status==="ativo"&&((diasAte(x.fim)??1)>=0)),av=ativos.filter(x=>{const d=diasAte(x.fim);return d!==null&&d<=60}),venc=dados.filter(x=>x.status==="ativo"&&(diasAte(x.fim)??0)<0);
  $("contratosAtivos").textContent=ativos.length;$("contratosAVencer").textContent=av.length;$("contratosVencidos").textContent=venc.length;$("contratosValorMensal").textContent=moeda(ativos.reduce((s,x)=>s+Number(x.valorMensal||0),0));
  if(qtd)qtd.textContent=`${dados.length} contrato(s) cadastrado(s)`;if(!lista)return;
  if(!arr.length){lista.innerHTML='<tr><td colspan="6">Nenhum contrato encontrado.</td></tr>';return}
  lista.innerHTML=arr.map(x=>`<tr><td>${esc(nomeEmpresa(x.empresaId))}</td><td class="celula-principal"><strong>${esc(x.numero||x.fornecedor||"Contrato")}</strong><span>${esc(x.objeto||"")}${x.contasPagarAtivo?" · Contas a Pagar":""}${x.arquivoPrincipal?.provider==="google_drive"?" · Drive":""}</span></td><td>${dataBr(x.inicio)} → ${dataBr(x.fim)}</td><td>${moeda(x.valorMensal)}</td><td>${statusContrato(x)}</td><td><div class="acoes-tabela">${x.arquivoPrincipal?.url?`<a class="btn-acao" href="${esc(x.arquivoPrincipal.url)}" target="_blank" rel="noopener">Arquivo</a>`:""}${permite("contratos","editar")?`<button class="btn-acao destaque" data-ctr-edit="${x.id}" type="button">Editar</button>`:""}${permite("contratos","excluir")?`<button class="btn-acao perigo" data-ctr-del="${x.id}" type="button">Excluir</button>`:""}</div></td></tr>`).join("");
  document.querySelectorAll("[data-ctr-edit]").forEach(b=>on(b,"click",()=>abrir(dados.find(x=>x.id===b.dataset.ctrEdit))));
  document.querySelectorAll("[data-ctr-del]").forEach(b=>on(b,"click",()=>remover(b.dataset.ctrDel)));
}
export async function carregarContratos(){
  if(!permite("contratos"))return;if(lista)lista.innerHTML='<tr><td colspan="6">Carregando contratos...</td></tr>';
  try{dados=await listarDocumentos("contratos");render(busca?.value||"")}catch(e){console.error(e);if(lista)lista.innerHTML='<tr><td colspan="6">Não foi possível carregar os contratos.</td></tr>'}
}
async function remover(id){
  const item=dados.find(x=>x.id===id);if(!item||!confirmar(`Excluir o contrato ${item.numero||item.fornecedor}?`))return;
  try{await excluirDocumento("contratos",id);await carregarContratos();emitirAlteracao("contratos")}catch(e){console.error(e);alert("Não foi possível excluir o contrato.")}
}
on($("btnNovoContrato"),"click",()=>abrir());on($("btnCancelarContrato"),"click",()=>{limpar();box?.classList.add("hidden")});on(busca,"input",()=>render(busca.value));
on(form,"submit",async ev=>{
  ev.preventDefault();const atual=dados.find(x=>x.id===editId)||null;let anexo=atual?.arquivoPrincipal||null;
  try{if(removerArquivo()?.checked===true)anexo=null;else if(driveUrl()?.value.trim())anexo=metaAnexoDrive({url:driveUrl().value,nome:driveNome()?.value,anterior:anexo})}catch(e){if(e.message==="drive-url-invalida")return msg(mensagem,"O link do anexo precisa ser um endereço do Google Drive.");throw e}
  let empresaId="";try{empresaId=empresaDoInput(empresa)}catch{return msg(mensagem,"Selecione a empresa do contrato.")}
  const d={empresaId,numero:numero.value.trim(),fornecedor:fornecedor.value.trim(),objeto:objeto.value.trim(),inicio:inicio.value,fim:fim.value,valorMensal:Number(valorCampo.value||0),responsavel:responsavel.value.trim(),status:status.value,reajuste:reajuste.value,observacoes:obs.value.trim(),arquivoPrincipal:anexo};
  if(!d.fornecedor||!d.objeto||!d.inicio||!d.fim)return msg(mensagem,"Preencha fornecedor, objeto e vigência.");if(d.fim<d.inicio)return msg(mensagem,"A data de término não pode ser anterior ao início.");
  if(atual&&atual.empresaId!==empresaId)return msg(mensagem,"A empresa do contrato não pode ser alterada. Crie um novo contrato para outra empresa.");
  try{msg(mensagem,"Salvando contrato...");let id=editId;if(editId)await atualizarDocumento("contratos",editId,d);else id=await criarDocumentoEmpresa("contratos",d);msg(mensagem,"Contrato salvo com sucesso.",true);await carregarContratos();emitirAlteracao("contratos");window.dispatchEvent(new CustomEvent("sig:contract-driver-changed",{detail:{contratoId:id}}));setTimeout(()=>fecharBox(box,form,mensagem),500)}catch(e){console.error(e);msg(mensagem,"Não foi possível salvar o contrato.")}
});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contratos")carregarContratos()});window.addEventListener("sig:empresa-changed",()=>{if(!box?.classList.contains("hidden"))limpar()});
