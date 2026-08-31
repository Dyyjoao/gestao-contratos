export const CC_BALANCO_ID="__cc_balanco__";
export const CC_BALANCO_CODIGO="CC-BALANCO";
export const CC_BALANCO_NOME="Balanço Patrimonial";

export function contaBalanco(conta){
  const raiz=String(conta?.grupoRaiz||conta?.codigo||"").charAt(0);
  return raiz==="1"||raiz==="2"||conta?.tipoConta==="balanco"||conta?.demonstracao==="balanco";
}

export function centroBalancoSintetico(empresaId=""){
  return {id:CC_BALANCO_ID,codigo:CC_BALANCO_CODIGO,nome:CC_BALANCO_NOME,empresaId,status:"ativo",tecnico:true,oculto:true};
}
