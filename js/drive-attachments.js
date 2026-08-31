import { state } from "./core.js";

export const SIG_DRIVE_ROOT_URL="https://drive.google.com/drive/folders/1COyESg5l0cr1tCqCce-Cz3cVoyIRcSGC";
export const SIG_DRIVE_EMPRESAS_URL="https://drive.google.com/drive/folders/17Yp8dWHLkaJ0cMb0fq_plat8VMs-JC7Y";

export function driveFileId(url=""){
  const s=String(url||"").trim();
  if(!s)return"";
  const padroes=[
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/folders\/([a-zA-Z0-9_-]{10,})/,
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/
  ];
  for(const p of padroes){const m=s.match(p);if(m?.[1])return m[1]}
  return"";
}

export function urlDriveValida(url=""){
  try{
    const u=new URL(String(url||"").trim());
    return ["drive.google.com","docs.google.com"].includes(u.hostname);
  }catch{return false}
}

export function metaAnexoDrive({url,nome="",tipo="",anterior=null}={}){
  const limpa=String(url||"").trim();
  if(!limpa)return anterior||null;
  if(!urlDriveValida(limpa))throw new Error("drive-url-invalida");
  return{
    provider:"google_drive",
    fileId:driveFileId(limpa),
    nome:String(nome||"").trim()||anterior?.nome||"Arquivo no Google Drive",
    tipo:String(tipo||"").trim()||anterior?.tipo||"",
    url:limpa,
    enviadoPor:state.usuario?.id||"",
    enviadoPorNome:state.usuario?.nome||state.usuario?.email||"",
    enviadoEm:new Date().toISOString(),
    migracaoStorage:"pendente"
  };
}

export function nomeProvider(anexo){
  if(anexo?.provider==="google_drive")return"Google Drive";
  if(anexo?.provider==="firebase_storage")return"Firebase Storage";
  return anexo?.url?"Anexo":"";
}
