import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";
import { app, state, admin } from "./core.js";
import { empresaAtualId } from "./shared.js";

const storage=getStorage(app);
export const STORAGE_MAX_BYTES=20*1024*1024;
const TIPOS=new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png"
]);
const TIPO_EXT={pdf:"application/pdf",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png"};

function seguroNome(nome){return String(nome||"arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,120)}
function tipoArquivo(arquivo){const informado=String(arquivo?.type||"").trim().toLowerCase();if(TIPOS.has(informado))return informado;const ext=String(arquivo?.name||"").split(".").pop()?.toLowerCase()||"";return TIPO_EXT[ext]||""}
export function validarArquivoStorage(arquivo){
  if(!arquivo)throw new Error("arquivo-ausente");
  if(Number(arquivo.size||0)>STORAGE_MAX_BYTES)throw new Error("arquivo-maior-20mb");
  const tipo=tipoArquivo(arquivo);if(!tipo)throw new Error("tipo-arquivo-nao-permitido");
  return tipo;
}

export async function uploadArquivo({modulo,registroId,arquivo,pasta="documentos",empresaId=empresaAtualId()}={}){
  const tipo=validarArquivoStorage(arquivo);
  const grupoId=state.usuario?.grupoId||"";const usuarioId=state.usuario?.id||"";
  if(!grupoId||!usuarioId)throw new Error("usuario-nao-autenticado");
  if(!empresaId)throw new Error("empresa-nao-selecionada");
  if(!modulo||!registroId)throw new Error("destino-storage-invalido");
  const caminho=`grupos/${grupoId}/empresas/${empresaId}/${modulo}/${registroId}/${pasta}/${Date.now()}_${seguroNome(arquivo.name)}`;
  const destino=ref(storage,caminho);
  await uploadBytes(destino,arquivo,{contentType:tipo,customMetadata:{grupoId,empresaId,usuarioId,modulo,registroId}});
  return{
    provider:"firebase_storage",
    nome:arquivo.name,
    tipo,
    tamanho:Number(arquivo.size||0),
    caminho,
    enviadoPor:usuarioId,
    enviadoPorNome:state.usuario?.nome||state.usuario?.email||"",
    enviadoEm:new Date().toISOString()
  };
}

export async function obterUrlArquivo(caminho){if(!caminho)throw new Error("caminho-storage-ausente");return getDownloadURL(ref(storage,caminho))}
export async function abrirArquivo(caminho){const url=await obterUrlArquivo(caminho);const w=window.open(url,"_blank","noopener,noreferrer");if(!w)return url;return url}

// Exclusão física é uma operação excepcional. A UI administrativa deve fazer
// reautenticação + justificativa + auditoria antes de chamar este helper.
export async function excluirArquivo(caminho){if(!admin())throw new Error("admin-obrigatorio");if(!caminho)return;await deleteObject(ref(storage,caminho))}
