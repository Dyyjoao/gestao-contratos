import {
  collection, getDocs, getDoc, doc, query, where,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { $, on, esc, norm, msg, db, state, admin, permite } from "./core.js";

export { $, on, esc, norm, msg, db, state, admin, permite, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction };

export const moeda=(v)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export const numero=(v)=>Number(v||0).toLocaleString("pt-BR",{maximumFractionDigits:3});
export const valor=(v)=>{const n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0};
export const hojeIso=()=>new Date().toISOString().slice(0,10);
export const competenciaAtual=()=>new Date().toISOString().slice(0,7);
export const grupoAtualId=()=>state.grupoAtualId||state.grupo?.id||state.usuario?.grupoId||"";
export const empresasSelecionadasIds=()=>{
  const ids=Array.isArray(state.empresasSelecionadasIds)?state.empresasSelecionadasIds.filter(Boolean):[];
  if(ids.length)return [...new Set(ids)];
  const fallback=state.empresaAtualId||state.usuario?.empresaId;return fallback?[fallback]:[];
};
export const empresaAtualId=()=>empresasSelecionadasIds()[0]||"";
export const empresaUnicaSelecionadaId=()=>{const ids=empresasSelecionadasIds();return ids.length===1?ids[0]:""};
export const multiEmpresaAtiva=()=>empresasSelecionadasIds().length>1;
export const periodoAno=()=>Number(state.periodoAno)||new Date().getFullYear();
export const periodoChave=()=>state.periodoChave||`m${String(new Date().getMonth()+1).padStart(2,"0")}`;
export function dataBr(v){if(!v)return"-";const [a,m,d]=String(v).slice(0,10).split("-");return a&&m&&d?`${d}/${m}/${a}`:v}
export function diasAte(v){if(!v)return null;const alvo=new Date(`${v}T12:00:00`),hoje=new Date();hoje.setHours(12,0,0,0);return Math.ceil((alvo-hoje)/86400000)}
export function statusHtml(texto,classe="status-ativo"){return `<span class="${classe}">${esc(texto)}</span>`}
export function fluxoHtml(status){const nomes={solicitada:"Solicitada",em_cotacao:"Em cotação",aguardando_aprovacao:"Aguardando aprovação",aprovada:"Aprovada",reprovada:"Reprovada",finalizada:"Finalizada"};return `<span class="fluxo-status status-${status}">${esc(nomes[status]||status)}</span>`}
export function emitirAlteracao(modulo){window.dispatchEvent(new CustomEvent("sig:data-changed",{detail:{modulo}}))}

function mapaErrosColecoes(){if(!(state.errosColecoes instanceof Map))state.errosColecoes=new Map();return state.errosColecoes}
function registrarErroColecao(nome,e){mapaErrosColecoes().set(String(nome||""),e||new Error("colecao-indisponivel"))}
function limparErroColecao(nome){mapaErrosColecoes().delete(String(nome||""))}
export function erroColecao(nome){return mapaErrosColecoes().get(String(nome||""))||null}
export function exigirColecaoDisponivel(nome){const original=erroColecao(nome);if(!original)return true;const e=new Error(`Coleção ${nome} indisponível; cálculo automático bloqueado para evitar dados incompletos.`);e.code=original?.code||"colecao-indisponivel";e.cause=original;throw e}
export function mensagemErroDados(e,alvo="dados"){const c=String(e?.code||e?.cause?.code||"").toLowerCase();if(c.includes("permission-denied"))return`Sem permissão para acessar ${alvo}. Verifique se as regras do Firestore publicadas correspondem à versão do SIG.`;if(c.includes("failed-precondition"))return`O Firestore exige configuração adicional para acessar ${alvo}.`;if(c.includes("unavailable")||c.includes("network"))return`Não foi possível acessar ${alvo} por indisponibilidade de conexão.`;return`Não foi possível acessar ${alvo}.`}

export function idsEmpresasPermitidas(){
  if(!state.usuario)return[];
  if(admin()||state.usuario?.acessoGlobal===true){
    const grupo=grupoAtualId();
    return [...state.empresas.values()].filter(e=>e.ativo!==false&&(!grupo||e.grupoId===grupo)).map(e=>e.id);
  }
  return [...new Set([state.usuario.empresaId,...(Array.isArray(state.usuario.empresasAcesso)?state.usuario.empresasAcesso:[])].filter(Boolean))];
}
export function podeEmpresa(id){return admin()||state.usuario?.acessoGlobal===true||idsEmpresasPermitidas().includes(id)}

export async function carregarEmpresasModulo(){
  const mapa=new Map(),grupo=grupoAtualId();
  if(!grupo)return mapa;
  if(admin()||state.usuario?.acessoGlobal===true){
    const s=await getDocs(query(collection(db,"empresas"),where("grupoId","==",grupo)));
    s.forEach(r=>{const d=r.data();if(d.ativo!==false)mapa.set(r.id,{id:r.id,...d})});
  }else{
    for(const id of idsEmpresasPermitidas()){
      const s=await getDoc(doc(db,"empresas",id));
      if(s.exists()){const d=s.data();if(d.ativo!==false&&d.grupoId===grupo)mapa.set(s.id,{id:s.id,...d})}
    }
  }
  state.empresas=new Map([...state.empresas,...mapa]);
  return mapa;
}

export async function preencherEmpresaSelect(select,{todas=false,valorAtual=""}={}){
  if(!select)return;
  const mapa=await carregarEmpresasModulo(),selecionadas=empresasSelecionadasIds().filter(id=>mapa.has(id));
  if(selecionadas.length===1){
    const e=mapa.get(selecionadas[0]);
    select.innerHTML=`<option value="${esc(e.id)}">${esc(e.nomeFantasia||e.razaoSocial||e.id)}</option>`;
    select.value=e.id;return;
  }
  const arr=[...mapa.values()].filter(e=>!selecionadas.length||selecionadas.includes(e.id)).sort((a,b)=>String(a.nomeFantasia||a.razaoSocial||"").localeCompare(String(b.nomeFantasia||b.razaoSocial||""),"pt-BR"));
  select.innerHTML=(todas?'<option value="">Todas as empresas selecionadas</option>':'<option value="">Selecione a empresa...</option>')+arr.map(e=>`<option value="${e.id}">${esc(e.nomeFantasia||e.razaoSocial||e.id)}</option>`).join("");
  if(valorAtual&&[...select.options].some(o=>o.value===valorAtual))select.value=valorAtual;
  else if(!todas&&arr.length===1)select.value=arr[0].id;
}
export function nomeEmpresa(id){const e=state.empresas.get(id);return e?.nomeFantasia||e?.razaoSocial||"-"}

async function consultarEmpresa(nomeColecao,empresaId){
  const grupo=grupoAtualId();if(!grupo||!empresaId)return[];
  const s=await getDocs(query(collection(db,nomeColecao),where("grupoId","==",grupo),where("empresaId","==",empresaId))),arr=[];
  s.forEach(r=>arr.push({id:r.id,...r.data()}));return arr;
}
export async function listarDocumentosEmpresa(nomeColecao,empresaId){
  if(!empresaId||!podeEmpresa(empresaId))return[];
  try{const saida=await consultarEmpresa(nomeColecao,empresaId);limparErroColecao(nomeColecao);return saida}catch(e){registrarErroColecao(nomeColecao,e);throw e}
}

export async function listarDocumentos(nomeColecao){
  try{
    const grupo=grupoAtualId();if(!grupo){limparErroColecao(nomeColecao);return[]}
    let ids=empresasSelecionadasIds();
    if(!ids.length)ids=idsEmpresasPermitidas();
    ids=[...new Set(ids.filter(id=>podeEmpresa(id)))];if(!ids.length){limparErroColecao(nomeColecao);return[]}
    if((admin()||state.usuario?.acessoGlobal===true)&&state.todasEmpresasSelecionadas===true){
      const s=await getDocs(query(collection(db,nomeColecao),where("grupoId","==",grupo))),permitidos=new Set(ids),saida=[];
      s.forEach(r=>{const d=r.data();if(permitidos.has(d.empresaId))saida.push({id:r.id,...d})});limparErroColecao(nomeColecao);return saida;
    }
    const blocos=await Promise.all(ids.map(id=>consultarEmpresa(nomeColecao,id))),saida=[];
    blocos.forEach(arr=>arr.forEach(x=>saida.push(x)));limparErroColecao(nomeColecao);return saida;
  }catch(e){registrarErroColecao(nomeColecao,e);throw e}
}

function empresaParaGravacao(dados={}){
  if(dados.empresaId){if(!podeEmpresa(dados.empresaId))throw new Error("sem-acesso-empresa");return dados.empresaId}
  const id=empresaUnicaSelecionadaId();
  if(id)return id;
  if(typeof window!=="undefined")window.alert("Para cadastrar ou alterar um registro que pertence a uma empresa, selecione apenas uma empresa no cabeçalho do SIG.");
  throw new Error("selecione-uma-empresa");
}

export async function criarDocumento(nomeColecao,dados){
  const empresaId=empresaParaGravacao(dados),grupoId=grupoAtualId();
  if(!grupoId)throw new Error("grupo-nao-selecionado");
  const ref=await addDoc(collection(db,nomeColecao),{...dados,empresaId,grupoId,criadoPor:state.usuario.id,criadoEm:serverTimestamp(),atualizadoEm:serverTimestamp()});
  return ref.id;
}
export async function atualizarDocumento(nomeColecao,id,dados){await updateDoc(doc(db,nomeColecao,id),{...dados,atualizadoEm:serverTimestamp()})}
export async function excluirDocumento(nomeColecao,id){await deleteDoc(doc(db,nomeColecao,id))}

export function abrirBox(box,focus){box?.classList.remove("hidden");setTimeout(()=>focus?.focus(),20)}
export function fecharBox(box,form,mensagem){form?.reset();box?.classList.add("hidden");msg(mensagem,"")}
export function scrollForm(box){box?.scrollIntoView({behavior:"smooth",block:"start"})}
export function setBotaoPermissao(botao,permitido){botao?.classList.toggle("hidden",!permitido)}
export function confirmar(texto){return window.confirm(texto)}

export async function movimentarSaldoItem({itemId,tipo,quantidade,observacao}){
  const qtd=Math.abs(valor(quantidade));if(!qtd)throw new Error("quantidade-invalida");
  const itemRef=doc(db,"itensAlmoxarifado",itemId);
  await runTransaction(db,async tx=>{
    const snap=await tx.get(itemRef);if(!snap.exists())throw new Error("item-nao-encontrado");
    const item=snap.data(),selecionadas=empresasSelecionadasIds();
    if(item.grupoId!==grupoAtualId()||!podeEmpresa(item.empresaId)||!selecionadas.includes(item.empresaId))throw new Error("sem-acesso");
    const atual=valor(item.estoqueAtual),novo=tipo==="entrada"?atual+qtd:atual-qtd;if(novo<0)throw new Error("saldo-insuficiente");
    tx.update(itemRef,{estoqueAtual:novo,atualizadoEm:serverTimestamp()});
    const movRef=doc(collection(db,"movimentacoesEstoque"));
    tx.set(movRef,{grupoId:grupoAtualId(),empresaId:item.empresaId,itemId,itemCodigo:item.codigo||"",itemDescricao:item.descricao||"",tipo,quantidade:qtd,saldoAnterior:atual,saldoPosterior:novo,observacao:observacao||"",criadoPor:state.usuario.id,criadoEm:serverTimestamp()});
  });
}