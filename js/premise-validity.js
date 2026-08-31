export function competenciaDoMes(ano,indice){return`${Number(ano)}-${String(Number(indice)+1).padStart(2,"0")}`}
export function normalizarCompetencia(v,fallback=""){const s=String(v||"").slice(0,7);return/^\d{4}-(0[1-9]|1[0-2])$/.test(s)?s:fallback}
export function vigenciaInicio(p){return normalizarCompetencia(p?.vigenciaInicio,"0000-01")}
export function vigenciaFim(p){return normalizarCompetencia(p?.vigenciaFim,"9999-12")}
export function premissaVigente(p,competencia){if(!p||p.ativo===false)return false;const c=normalizarCompetencia(competencia);if(!c)return false;return c>=vigenciaInicio(p)&&c<=vigenciaFim(p)}
export function mesAnterior(competencia){const c=normalizarCompetencia(competencia);if(!c)return"";let[a,m]=c.split("-").map(Number);m--;if(m===0){m=12;a--}return`${a}-${String(m).padStart(2,"0")}`}
export function mesSeguinte(competencia){const c=normalizarCompetencia(competencia);if(!c)return"";let[a,m]=c.split("-").map(Number);m++;if(m===13){m=1;a++}return`${a}-${String(m).padStart(2,"0")}`}
export function periodosSobrepostos(aIni,aFim,bIni,bFim){const ai=normalizarCompetencia(aIni,"0000-01"),af=normalizarCompetencia(aFim,"9999-12"),bi=normalizarCompetencia(bIni,"0000-01"),bf=normalizarCompetencia(bFim,"9999-12");return ai<=bf&&bi<=af}
export function escopoCompativel(p,cenario){return p?.aplicaEm===cenario||p?.aplicaEm==="ambos"||(!p?.aplicaEm&&cenario==="budget")}
export function premissaParaCompetencia(lista,{cenario,contaId,centroCustoId="",competencia}){
  const base=(lista||[]).filter(p=>premissaVigente(p,competencia)&&escopoCompativel(p,cenario)&&p.contaGerencialId===contaId&&(!(p.centroCustoId||"")||(p.centroCustoId||"")===centroCustoId));
  const ordenar=(a,b)=>vigenciaInicio(b).localeCompare(vigenciaInicio(a))||String(b.id||"").localeCompare(String(a.id||""));
  return base.filter(p=>(p.centroCustoId||"")===centroCustoId).sort(ordenar)[0]||base.filter(p=>!(p.centroCustoId||"")).sort(ordenar)[0]||null;
}
export function descricaoVigenciaPremissa(p){const i=p?.vigenciaInicio||"início aberto",f=p?.vigenciaFim||"sem término";return`${i} → ${f}`}
