import { contaEstatistica } from "./statistical-center.js";

export function tipoEstrutura(conta){return conta?.tipoEstrutura==="sintetica"?"sintetica":"analitica"}
export function contaSintetica(conta){return tipoEstrutura(conta)==="sintetica"}
export function contaAnalitica(conta){return !contaSintetica(conta)}
export function paiId(conta){return conta?.contaPaiId||""}
export function ordenaContas(a,b){return Number(a?.ordem||0)-Number(b?.ordem||0)||String(a?.codigo||"").localeCompare(String(b?.codigo||""),"pt-BR")||String(a?.nome||"").localeCompare(String(b?.nome||""),"pt-BR")}
export function mapaContas(contas){return new Map((contas||[]).map(c=>[c.id,c]))}
export function filhosDe(contas,pai=""){return (contas||[]).filter(c=>(c.contaPaiId||"")===pai).sort(ordenaContas)}
export function temFilhos(contas,id){return (contas||[]).some(c=>(c.contaPaiId||"")===id)}
export function nivelConta(conta,mapa){let nivel=0,atual=conta,vistos=new Set();while(atual?.contaPaiId&&nivel<20&&!vistos.has(atual.contaPaiId)){vistos.add(atual.contaPaiId);atual=mapa.get(atual.contaPaiId);if(!atual)break;nivel++}return nivel}
export function caminhoConta(conta,mapa){const partes=[],vistos=new Set();let atual=conta;while(atual&&partes.length<20&&!vistos.has(atual.id)){vistos.add(atual.id);partes.unshift(atual);atual=atual.contaPaiId?mapa.get(atual.contaPaiId):null}return partes}
export function validaPai(contas,contaId,pai){if(!pai)return true;if(pai===contaId)return false;const map=mapaContas(contas),vistos=new Set([contaId]);let atual=map.get(pai);while(atual){if(vistos.has(atual.id))return false;vistos.add(atual.id);if(!atual.contaPaiId)break;atual=map.get(atual.contaPaiId)}return true}
export function arvoreContas(contas,{grupoDre=null,estatistica=null}={}){const base=(contas||[]).filter(c=>c.status!=="inativo"&&(grupoDre===null||c.grupoDre===grupoDre)&&(estatistica===null||contaEstatistica(c)===estatistica));const ids=new Set(base.map(c=>c.id)),porPai=new Map();base.forEach(c=>{const pai=ids.has(c.contaPaiId)?c.contaPaiId:"";if(!porPai.has(pai))porPai.set(pai,[]);porPai.get(pai).push(c)});porPai.forEach(a=>a.sort(ordenaContas));const out=[];function visita(pai,nivel){for(const c of porPai.get(pai)||[]){out.push({conta:c,nivel});visita(c.id,nivel+1)}}visita("",0);return out}
export function folhasDescendentes(contas,id){const mapFilhos=new Map();(contas||[]).forEach(c=>{const p=c.contaPaiId||"";if(!mapFilhos.has(p))mapFilhos.set(p,[]);mapFilhos.get(p).push(c)});const out=[],vistos=new Set();function visita(cid){if(vistos.has(cid))return;vistos.add(cid);const fs=mapFilhos.get(cid)||[];if(!fs.length){const c=(contas||[]).find(x=>x.id===cid);if(c)out.push(c);return}fs.forEach(f=>visita(f.id))}visita(id);return out.filter(contaAnalitica)}
export function contasLancaveis(contas){return (contas||[]).filter(c=>c.status!=="inativo"&&contaAnalitica(c))}

export function arvoreParaFolhas(contas,folhasIds,{grupoDre=null,estatistica=null}={}){
  const map=mapaContas(contas),incluidos=new Set();for(const id of folhasIds||[]){let c=map.get(id),guard=0;while(c&&guard++<30){if((grupoDre===null||c.grupoDre===grupoDre)&&(estatistica===null||contaEstatistica(c)===estatistica))incluidos.add(c.id);if(!c.contaPaiId)break;c=map.get(c.contaPaiId)}}
  const base=[...incluidos].map(id=>map.get(id)).filter(Boolean),ids=new Set(base.map(c=>c.id)),porPai=new Map();base.forEach(c=>{const p=ids.has(c.contaPaiId)?c.contaPaiId:"";if(!porPai.has(p))porPai.set(p,[]);porPai.get(p).push(c)});porPai.forEach(a=>a.sort(ordenaContas));const out=[];function visita(pai,nivel){for(const c of porPai.get(pai)||[]){out.push({conta:c,nivel});visita(c.id,nivel+1)}}visita("",0);return out;
}
