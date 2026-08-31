import { contaAnalitica } from "./account-tree.js";
import { raizConta, multiplicadorResultado } from "./account-mask.js";
import { contaAtivaNoExercicio } from "./account-validity.js";
import { mapaDepreciacaoPlanejamento } from "./asset-planning.js";

export const MESES_FINANCEIROS=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const stamp=x=>n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0);
const ativo=x=>x?.legadoArquivado!==true&&x?.duplicadoArquivado!==true;
const idSeguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_");
const vazio=()=>Array(12).fill(0);

export function contaFinanceiraDre(conta,ano){
  const raiz=raizConta(conta);
  return !!conta&&contaAnalitica(conta)&&contaAtivaNoExercicio(conta,ano)&&(raiz==="3"||raiz==="4");
}

export function versaoMaisRecenteEmpresa(documentos,ano,empresaId){
  const mapa=new Map();
  (documentos||[]).filter(d=>ativo(d)&&d.tipoRegistro!=="budget_meta"&&d.empresaId===empresaId&&Number(d.exercicio)===Number(ano)&&d.versao).forEach(d=>mapa.set(d.versao,Math.max(mapa.get(d.versao)||0,stamp(d))));
  return [...mapa.entries()].sort((a,b)=>b[1]-a[1]||String(b[0]).localeCompare(String(a[0]),"pt-BR"))[0]?.[0]||"";
}

export function versoesMaisRecentesPorEmpresa(documentos,ano,empresasIds){
  const out=new Map();
  for(const emp of empresasIds||[]){const v=versaoMaisRecenteEmpresa(documentos,ano,emp);if(v)out.set(emp,v)}
  return out;
}

export function rotuloVersoes(mapa){
  const vals=[...new Set([...(mapa?.values?.()||[])])];
  if(!vals.length)return"";
  return vals.length===1?vals[0]:"última versão de cada empresa";
}

function chaveDocumento(d){return`${d.empresaId||""}|${d.centroCustoId||""}|${d.contaId||""}`}

function canonicos({documentos,plano,ano,empresasIds,cenario,versoes}){
  const ids=new Set(empresasIds||[]),pmap=new Map((plano||[]).map(c=>[c.id,c])),map=new Map();
  (documentos||[]).filter(d=>ativo(d)&&d.tipoRegistro!=="budget_meta"&&ids.has(d.empresaId)&&Number(d.exercicio)===Number(ano)&&(!versoes||!versoes.has(d.empresaId)||d.versao===versoes.get(d.empresaId))).forEach(d=>{
    const c=pmap.get(d.contaId);if(!contaFinanceiraDre(c,ano))return;
    const k=chaveDocumento(d),at=map.get(k);
    if(cenario==="realizado"){
      const canon=`r_${idSeguro(d.empresaId)}_${ano}_${idSeguro(d.centroCustoId||"")}_${idSeguro(d.contaId)}`;
      if(!at||d.id===canon||(at.id!==canon&&stamp(d)>stamp(at)))map.set(k,d);
    }else if(!at||stamp(d)>stamp(at))map.set(k,d);
  });
  return [...map.values()];
}

function fechadoForecast(documentos,ano,empresaId,versao){
  return Math.max(0,Math.min(12,...(documentos||[]).filter(d=>ativo(d)&&d.tipoRegistro!=="budget_meta"&&d.empresaId===empresaId&&Number(d.exercicio)===Number(ano)&&(!versao||d.versao===versao)).map(d=>n(d.realizadoFechadoAte)),0));
}

export function construirLinhasFinanceiras({cenario="realizado",documentos=[],realizados=[],plano=[],imobilizados=[],ano,empresasIds=[]}){
  const ids=[...new Set(empresasIds||[])],pmap=new Map(plano.map(c=>[c.id,c])),versoes=cenario==="realizado"?new Map():versoesMaisRecentesPorEmpresa(documentos,ano,ids),base=canonicos({documentos,plano,ano,empresasIds:ids,cenario,versoes}),reais=cenario==="forecast"?canonicos({documentos:realizados,plano,ano,empresasIds:ids,cenario:"realizado",versoes:null}):[],rmap=new Map(reais.map(d=>[chaveDocumento(d),d])),autoPorEmpresa=new Map();
  if(cenario!=="realizado")ids.forEach(emp=>autoPorEmpresa.set(emp,mapaDepreciacaoPlanejamento(imobilizados,emp,ano)));
  const out=[];
  for(const d of base){
    const c=pmap.get(d.contaId);if(!c)continue;const cc=d.centroCustoId||"",auto=cenario!=="realizado"&&autoPorEmpresa.get(d.empresaId)?.has(`${cc}|${c.id}`);if(auto)continue;
    const vals=vazio();if(cenario==="forecast"){const fechado=Math.max(0,Math.min(12,n(d.realizadoFechadoAte))),r=rmap.get(chaveDocumento(d));MESES_FINANCEIROS.forEach((m,i)=>vals[i]=i<fechado?n(r?.valores?.[m]):n(d.valores?.[m]))}else MESES_FINANCEIROS.forEach((m,i)=>vals[i]=n(d.valores?.[m]));
    out.push({empresaId:d.empresaId,conta:c,contaId:c.id,centroCustoId:cc,valores:vals,origem:"documento"});
  }
  if(cenario!=="realizado")for(const emp of ids){const mapa=autoPorEmpresa.get(emp)||new Map(),vers=versoes.get(emp)||"",fechado=cenario==="forecast"?fechadoForecast(documentos,ano,emp,vers):0;for(const[k,valsObj]of mapa){const pos=k.indexOf("|"),cc=pos>=0?k.slice(0,pos):"",contaId=pos>=0?k.slice(pos+1):k,c=pmap.get(contaId);if(!contaFinanceiraDre(c,ano))continue;const r=rmap.get(`${emp}|${cc}|${contaId}`),vals=vazio();MESES_FINANCEIROS.forEach((m,i)=>vals[i]=cenario==="forecast"&&i<fechado?n(r?.valores?.[m]):n(valsObj?.[m]));out.push({empresaId:emp,conta:c,contaId,centroCustoId:cc,valores:vals,origem:"imobilizado"})}}
  return{linhas:out,versoes,rotuloVersao:rotuloVersoes(versoes)};
}

export function valorIndices(valores,indices){return(indices||[]).reduce((s,i)=>s+n(valores?.[i]),0)}

export function resumirDre(linhas,indices){
  const out={receita:0,opex:0,resultado:0};
  for(const l of linhas||[]){const bruto=valorIndices(l.valores,indices),efeito=bruto*multiplicadorResultado(l.conta),grupo=l.conta?.grupoDre||"";out.resultado+=efeito;if(grupo==="receita")out.receita+=efeito;if(grupo==="custos"||grupo==="despesas")out.opex-=efeito}
  return out;
}

export function linhasPorCodigo(linhas,indices){
  const map=new Map();
  for(const l of linhas||[]){const codigo=String(l.conta?.codigo||"").trim(),chave=codigo||`${l.empresaId}|${l.contaId}`,efeito=valorIndices(l.valores,indices)*multiplicadorResultado(l.conta),at=map.get(chave)||{chave,codigo:codigo||"SEM CÓDIGO",nome:l.conta?.nome||"Conta",grupoDre:l.conta?.grupoDre||"outros",efeito:0,contas:[],automatico:false};at.efeito+=efeito;at.contas.push(l.conta);at.automatico=at.automatico||l.origem==="imobilizado";map.set(chave,at)}
  return[...map.values()];
}

export function capexCadastroAtual(imobilizados,ano,indices,empresasIds){
  const ids=new Set(empresasIds||[]),meses=new Set((indices||[]).map(i=>i+1)),out={realizado:0,planejado:0,total:0};
  for(const b of imobilizados||[]){if(!ids.has(b.empresaId)||b.status==="cancelado"||b.status==="inativo")continue;const data=String(b.dataAquisicao||"");if(!/^\d{4}-\d{2}/.test(data))continue;const [a,m]=data.slice(0,7).split("-").map(Number);if(a!==Number(ano)||!meses.has(m))continue;const v=Math.max(0,n(b.valorAquisicao));out.total+=v;if(b.status==="planejado")out.planejado+=v;else out.realizado+=v}
  return out;
}
