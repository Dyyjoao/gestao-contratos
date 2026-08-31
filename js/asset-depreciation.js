const MESES=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
export const mesesDepreciacao=()=>[...MESES];
export function baseDepreciavel(bem){return Math.max(0,n(bem?.valorAquisicao)-n(bem?.valorResidual))}
export function vidaUtilMeses(bem){const m=Math.trunc(n(bem?.vidaUtilMeses));return Math.max(1,m||Math.round(1200/Math.max(.01,n(bem?.taxaAnual)||10)))}
export function depreciacaoMensalBase(bem){return baseDepreciavel(bem)/vidaUtilMeses(bem)}
function ym(data){const s=String(data||"").slice(0,7);return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)?s:""}
function serial(comp){const [a,m]=String(comp||"").split("-").map(Number);return a*12+(m-1)}
function inicioBem(bem){const exigeDisponivel=bem?.status==="em_implantacao"||bem?.status==="planejado";if(exigeDisponivel&&!ym(bem?.dataDisponivelUso||bem?.dataInicioDepreciacao))return"";return ym(bem?.dataDisponivelUso||bem?.dataInicioDepreciacao||bem?.dataAquisicao)}
function fimBem(bem){return ym(bem?.dataBaixa||"")}
export function depreciacaoCompetencia(bem,competencia){
  if(!bem||bem.status==="inativo"||bem.status==="cancelado")return 0;const ini=inicioBem(bem),comp=ym(competencia);if(!ini||!comp)return 0;const i=serial(ini),c=serial(comp),fim=fimBem(bem);if(c<i||fim&&c>serial(fim))return 0;const pos=c-i;if(pos<0||pos>=vidaUtilMeses(bem))return 0;const mensal=depreciacaoMensalBase(bem),acumAntes=mensal*pos,restante=Math.max(0,baseDepreciavel(bem)-acumAntes);return Math.min(mensal,restante)
}
export function depreciacaoAno(bem,ano){const out={};MESES.forEach((m,i)=>out[m]=depreciacaoCompetencia(bem,`${Number(ano)}-${String(i+1).padStart(2,"0")}`));return out}
export function depreciacaoAcumuladaAte(bem,competencia){const ini=inicioBem(bem),comp=ym(competencia);if(!ini||!comp||serial(comp)<serial(ini))return 0;const meses=Math.min(vidaUtilMeses(bem),serial(comp)-serial(ini)+1);return Math.min(baseDepreciavel(bem),depreciacaoMensalBase(bem)*meses)}
export function valorContabilLiquido(bem,competencia){return Math.max(n(bem?.valorResidual),n(bem?.valorAquisicao)-depreciacaoAcumuladaAte(bem,competencia))}
export function mapaDepreciacaoAno(bens,ano){const mapa=new Map();for(const b of bens||[]){if(!b.contaDepreciacaoId||!b.centroCustoId)continue;const k=`${b.centroCustoId}|${b.contaDepreciacaoId}`,at=mapa.get(k)||Object.fromEntries(MESES.map(m=>[m,0])),vals=depreciacaoAno(b,ano);MESES.forEach(m=>at[m]+=n(vals[m]));mapa.set(k,at)}return mapa}
export function mapaImobilizadoBalanco(bens,competencia){const bruto=new Map(),acum=new Map();for(const b of bens||[]){if(b.status==="cancelado"||b.status==="inativo")continue;const aq=ym(b.dataAquisicao),comp=ym(competencia);if(!aq||!comp||serial(aq)>serial(comp))continue;if(b.dataBaixa&&ym(b.dataBaixa)&&serial(ym(b.dataBaixa))<serial(comp))continue;if(b.contaAtivoId)bruto.set(b.contaAtivoId,(bruto.get(b.contaAtivoId)||0)+n(b.valorAquisicao));if(b.contaDepreciacaoAcumuladaId)acum.set(b.contaDepreciacaoAcumuladaId,(acum.get(b.contaDepreciacaoAcumuladaId)||0)+depreciacaoAcumuladaAte(b,comp))}return{bruto,acumulada:acum}}
