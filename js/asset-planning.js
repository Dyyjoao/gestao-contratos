import { mapaDepreciacaoAno } from "./asset-depreciation.js";

export function bensPlanejamento(bens,empresaId){
  return (bens||[]).filter(b=>b?.empresaId===empresaId&&b?.integrarPlanejamento===true&&b?.status!=="cancelado"&&b?.status!=="inativo"&&b?.contaDepreciacaoId&&b?.centroCustoId);
}

export function mapaDepreciacaoPlanejamento(bens,empresaId,ano){
  return mapaDepreciacaoAno(bensPlanejamento(bens,empresaId),ano);
}

export function depreciacaoPlanejadaConta(mapa,centroCustoId,contaId){
  return mapa?.get(`${centroCustoId}|${contaId}`)||null;
}

export function contaControladaPorImobilizado(mapa,centroCustoId,contaId){
  return !!depreciacaoPlanejadaConta(mapa,centroCustoId,contaId);
}
