import { $, permite, listarDocumentos, atualizarDocumento, emitirAlteracao } from "./shared.js";
import { uploadArquivo, obterUrlArquivo, validarArquivoStorage, STORAGE_MAX_BYTES } from "./storage.js";
import { carregarContratos } from "./contracts.js";

let contratos=[];
let editandoId=null;
let pendente=null;
let carregando=false;
let observer=null;

const podeAnexar=()=>permite("contratos","anexar")||permite("contratos","editar");
const form=()=>$("formContrato");
const arquivoInput=()=>$("contratoArquivoStorage");
const atualEl=()=>$("contratoArquivoAtual");

function erroArquivo(e){
  if(e?.message==="arquivo-maior-20mb")return"O arquivo ultrapassa o limite de 20 MB.";
  if(e?.message==="tipo-arquivo-nao-permitido")return"Formato não permitido. Use PDF, Word, Excel, JPG ou PNG.";
  return"Selecione um arquivo válido.";
}

async function abrirStorage(caminho){
  const janela=window.open("","_blank");
  try{
    const url=await obterUrlArquivo(caminho);
    if(janela)janela.location.replace(url);else window.location.assign(url);
  }catch(e){
    try{janela?.close()}catch{}
    console.error(e);
    alert("Não foi possível abrir o arquivo. Confirme seu acesso ao Firebase Storage.");
  }
}

function contratoPorLinha(tr){
  const id=tr.querySelector("[data-ctr-edit]")?.dataset.ctrEdit||tr.querySelector("[data-ctr-del]")?.dataset.ctrDel;
  if(id)return contratos.find(c=>c.id===id)||null;
  const titulo=tr.querySelector("td strong")?.textContent?.trim()||"";
  const xs=contratos.filter(c=>String(c.numero||c.fornecedor||"Contrato").trim()===titulo);
  return xs.length===1?xs[0]:null;
}

function decorarLista(){
  const tb=$("listaContratos");if(!tb)return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const c=contratoPorLinha(tr),a=c?.arquivoPrincipal;if(!c||a?.provider!=="firebase_storage"||!a?.caminho)return;
    const acoes=tr.querySelector(".acoes-tabela");if(acoes&&!acoes.querySelector("[data-storage-ctr-arq]")){
      const b=document.createElement("button");b.type="button";b.className="btn-acao";b.textContent="Arquivo";b.dataset.storageCtrArq=c.id;
      b.addEventListener("click",()=>abrirStorage(a.caminho));acoes.prepend(b);
    }
    const meta=tr.querySelector("td.celula-principal span");if(meta&&!meta.textContent.includes("Storage"))meta.append(" · Storage");
  });
}

function mostrarAtualStorage(){
  const el=atualEl();if(!el)return;
  const c=contratos.find(x=>x.id===editandoId),a=c?.arquivoPrincipal;
  if(a?.provider!=="firebase_storage"||!a?.caminho)return;
  el.innerHTML="";
  el.append("Arquivo atual: ");
  const b=document.createElement("button");b.type="button";b.className="btn-acao";b.textContent=a.nome||"Abrir arquivo";b.addEventListener("click",()=>abrirStorage(a.caminho));el.appendChild(b);
  el.append(` · Firebase Storage${a.tamanho?` · ${(Number(a.tamanho)/1024/1024).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB`:""}`);
}

function instalarCampo(){
  const card=document.querySelector(".drive-anexo-card");if(!card||card.dataset.firebaseStorage==="1")return;
  card.dataset.firebaseStorage="1";
  const head=card.querySelector(".drive-anexo-head");
  if(head)head.innerHTML=`<div><strong>Firebase Storage</strong><small>Contratos novos ficam armazenados no bucket privado do SIG.</small></div><span class="status-ativo">Até ${Math.round(STORAGE_MAX_BYTES/1024/1024)} MB</span>`;
  [$("contratoDriveUrl"),$("contratoDriveNome")].forEach(el=>el?.closest(".campo")?.classList.add("hidden"));
  const grid=card.querySelector(".form-grid");
  if(grid&&!$("contratoArquivoStorage"))grid.insertAdjacentHTML("afterend",`<div class="campo" style="margin-top:8px"><label for="contratoArquivoStorage">Arquivo do contrato</label><input id="contratoArquivoStorage" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png" ${podeAnexar()?"":"disabled"}><small>PDF, Word, Excel, JPG ou PNG. O código do SIG salva o caminho do objeto, não uma URL permanente de compartilhamento.</small></div>`);
  const rem=$("contratoRemoverArquivo")?.closest("label")?.querySelector("span");if(rem)rem.textContent="Remover vínculo do anexo atual (não apaga fisicamente o objeto)";
  [...card.querySelectorAll("small.arquivo-atual")].filter(x=>x.id!=="contratoArquivoAtual").forEach(x=>x.textContent="Arquivos legados do Google Drive continuam acessíveis; ao selecionar um novo arquivo, o vínculo passa a usar Firebase Storage. Exclusão física do bucket é exclusiva do Administrador.");
  mostrarAtualStorage();
}

function validarSubmit(ev){
  const arq=arquivoInput()?.files?.[0]||null;
  if(!arq){pendente=null;return}
  if(!podeAnexar()){ev.preventDefault();ev.stopImmediatePropagation();alert("Seu perfil não pode anexar arquivos a contratos.");return}
  try{validarArquivoStorage(arq)}catch(e){ev.preventDefault();ev.stopImmediatePropagation();alert(erroArquivo(e));return}
  pendente={arquivo:arq,empresaId:$("contratoEmpresa")?.value||""};
}

async function enviarPendente(contratoId){
  const p=pendente;pendente=null;if(!p?.arquivo||!contratoId)return;
  try{
    const meta=await uploadArquivo({modulo:"contratos",registroId:contratoId,arquivo:p.arquivo,pasta:"documentos",empresaId:p.empresaId});
    await atualizarDocumento("contratos",contratoId,{arquivoPrincipal:meta});
    emitirAlteracao("contratos");
    await carregarContratos();
    await atualizarCache();
  }catch(e){
    console.error(e);
    alert("O contrato foi salvo, mas o anexo não foi enviado ao Firebase Storage. Edite o contrato e tente anexar novamente.");
  }
}

async function atualizarCache(){
  if(carregando||!permite("contratos"))return;carregando=true;
  try{contratos=await listarDocumentos("contratos");decorarLista();mostrarAtualStorage()}catch(e){console.warn("Storage de contratos: não foi possível atualizar a referência dos anexos",e)}finally{carregando=false}
}

function decorar(){instalarCampo();decorarLista();mostrarAtualStorage()}
function instalar(){
  if(observer)return;
  form()?.addEventListener("submit",validarSubmit,true);
  document.addEventListener("click",e=>{
    const ed=e.target.closest?.("[data-ctr-edit]");if(ed){editandoId=ed.dataset.ctrEdit;setTimeout(()=>{decorar();mostrarAtualStorage()},40);return}
    if(e.target.closest?.("#btnNovoContrato")){editandoId=null;setTimeout(decorar,40)}
  },true);
  observer=new MutationObserver(()=>decorar());observer.observe(document.body,{childList:true,subtree:true});
  atualizarCache();decorar();
}

window.addEventListener("sig:contract-driver-changed",e=>enviarPendente(e.detail?.contratoId));
window.addEventListener("sig:ready",()=>{instalar();atualizarCache()});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contratos"){instalar();atualizarCache();setTimeout(decorar,60)}});
window.addEventListener("sig:empresa-changed",()=>{editandoId=null;pendente=null;atualizarCache()});
window.addEventListener("sig:data-changed",e=>{if(e.detail?.modulo==="contratos")atualizarCache()});
instalar();
