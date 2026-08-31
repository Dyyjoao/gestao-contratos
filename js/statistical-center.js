export const CC_ESTATISTICO_ID="__cc_estatistico__";
export const CC_ESTATISTICO_CODIGO="CC-ESTATISTICO";
export const CC_ESTATISTICO_NOME="Indicadores estatísticos";

export function contaEstatistica(conta){
  return conta?.natureza==="estatistica"||conta?.tipoConta==="estatistica"||conta?.grupoDre==="estatisticas";
}

export function centroDaConta(conta,centroId=""){
  return contaEstatistica(conta)?CC_ESTATISTICO_ID:(centroId||"");
}

export function centroEstatisticoSintetico(empresaId=""){
  return {id:CC_ESTATISTICO_ID,codigo:CC_ESTATISTICO_CODIGO,nome:CC_ESTATISTICO_NOME,empresaId,status:"ativo",tecnico:true,oculto:true};
}
