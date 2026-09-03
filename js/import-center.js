// Núcleo leve e reutilizável para importações do SIG.
// Cada módulo mantém seu próprio parser/regra de negócio; este arquivo concentra
// leitura de arquivo, normalização, conversões e execução em lotes.

export async function lerArquivoTexto(file){
  if(!file)throw new Error("arquivo-ausente");
  const bytes=new Uint8Array(await file.arrayBuffer());
  let texto=new TextDecoder("utf-8").decode(bytes);
  const ruins=(texto.match(/\uFFFD/g)||[]).length;
  if(ruins>0){
    try{texto=new TextDecoder("windows-1252").decode(bytes)}catch(_){texto=new TextDecoder("iso-8859-1").decode(bytes)}
  }
  return texto;
}

export function normalizarTextoImportacao(v){
  return String(v??"").replace(/\r/g,"").replace(/\f/g,"\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
}

export function numeroBr(v){
  const s=String(v??"").trim().replace(/\s/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(s);return Number.isFinite(n)?n:0;
}

export function dataBrParaIso(v){
  const m=String(v??"").trim().match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);if(!m)return"";
  let ano=Number(m[3]);if(m[3].length===2)ano+=ano>=70?1900:2000;
  const mes=Number(m[2]),dia=Number(m[1]);if(mes<1||mes>12||dia<1||dia>31)return"";
  return `${String(ano).padStart(4,"0")}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
}

export function normalizarChave(v){
  return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]/g,"");
}

export function chaveImportacao(...partes){
  return partes.map(normalizarChave).filter(Boolean).join(":");
}

export function arredondarCentavos(v){return Math.round((Number(v)||0)*100)/100}

export async function executarEmLotes(itens,executar,{tamanho=8,onProgress}={}){
  const lista=Array.isArray(itens)?itens:[];let feitos=0;
  for(let i=0;i<lista.length;i+=tamanho){
    const bloco=lista.slice(i,i+tamanho);await Promise.all(bloco.map((item,idx)=>executar(item,i+idx)));
    feitos+=bloco.length;onProgress?.(feitos,lista.length);
  }
  return feitos;
}
