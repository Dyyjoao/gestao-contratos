import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";
import { app, state } from "./core.js";
import { empresaAtualId } from "./shared.js";

const storage=getStorage(app);

function seguroNome(nome){return String(nome||"arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,120)}

export async function uploadArquivo({modulo,registroId,arquivo,pasta="documentos"}){
  if(!arquivo)throw new Error("arquivo-ausente");
  const empresaId=empresaAtualId();if(!empresaId)throw new Error("empresa-nao-selecionada");
  const caminho=`grupos/${state.usuario.grupoId}/empresas/${empresaId}/${modulo}/${registroId}/${pasta}/${Date.now()}_${seguroNome(arquivo.name)}`;
  const destino=ref(storage,caminho);
  await uploadBytes(destino,arquivo,{contentType:arquivo.type||"application/octet-stream",customMetadata:{grupoId:state.usuario.grupoId,empresaId,usuarioId:state.usuario.id,modulo,registroId}});
  const url=await getDownloadURL(destino);
  return{nome:arquivo.name,tipo:arquivo.type||"",tamanho:arquivo.size||0,caminho,url,enviadoPor:state.usuario.id,enviadoEm:new Date().toISOString()};
}

export async function excluirArquivo(caminho){if(!caminho)return;await deleteObject(ref(storage,caminho))}
