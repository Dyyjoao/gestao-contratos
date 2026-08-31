import { CC_ESTATISTICO_ID } from "./statistical-center.js";
import { CC_BALANCO_ID } from "./balance-center.js";

export const RAIZES_CONTABEIS={
  "1":{codigo:"1",nome:"ATIVO",tipo:"balanco",natureza:"ativo",naturezaContabilPadrao:"devedora",ccTecnicoId:CC_BALANCO_ID},
  "2":{codigo:"2",nome:"PASSIVO",tipo:"balanco",natureza:"passivo",naturezaContabilPadrao:"credora",ccTecnicoId:CC_BALANCO_ID},
  "3":{codigo:"3",nome:"RECEITA",tipo:"dre",natureza:"receita",naturezaContabilPadrao:"credora",ccTecnicoId:""},
  "4":{codigo:"4",nome:"DESPESA",tipo:"dre",natureza:"despesa",naturezaContabilPadrao:"devedora",ccTecnicoId:""},
  "9":{codigo:"9",nome:"ESTATÍSTICA",tipo:"estatistica",natureza:"estatistica",naturezaContabilPadrao:"neutra",ccTecnicoId:CC_ESTATISTICO_ID}
};

const PADRAO_SINTETICA=/^[12349]\.\d{2}$/;
const PADRAO_ANALITICA=/^[12349]\.\d{2}\.\d{4}$/;

export function raizCodigo(codigo=""){const r=String(codigo||"").trim().charAt(0);return RAIZES_CONTABEIS[r]?r:""}
export function codigoSinteticoValido(codigo=""){return PADRAO_SINTETICA.test(String(codigo||""))}
export function codigoAnaliticoValido(codigo=""){return PADRAO_ANALITICA.test(String(codigo||""))}
export function nivelMascara(codigo=""){const c=String(codigo||"");if(RAIZES_CONTABEIS[c])return 0;if(codigoSinteticoValido(c))return 1;if(codigoAnaliticoValido(c))return 2;return -1}
export function raizConta(conta){
  const declarada=String(conta?.grupoRaiz||"");if(RAIZES_CONTABEIS[declarada])return declarada;
  const codigo=String(conta?.codigo||"");if(codigoSinteticoValido(codigo)||codigoAnaliticoValido(codigo))return raizCodigo(codigo);
  return inferirRaizLegada(conta);
}
export function definicaoRaiz(valor){const r=typeof valor==="object"?raizConta(valor):raizCodigo(valor)||String(valor||"");return RAIZES_CONTABEIS[r]||null}
export function codigoPaiMascara(codigo=""){const c=String(codigo||"");const n=nivelMascara(c);if(n===2)return c.split(".").slice(0,2).join(".");if(n===1)return c.charAt(0);return""}
export function tipoEstruturaMascara(codigo=""){const n=nivelMascara(codigo);return n===0||n===1?"sintetica":n===2?"analitica":""}
export function demonstracaoConta(conta){return definicaoRaiz(conta)?.tipo||"dre"}
export function contaDre(conta){return demonstracaoConta(conta)==="dre"}
export function contaBalancoMascara(conta){return demonstracaoConta(conta)==="balanco"}
export function contaEstatisticaMascara(conta){return demonstracaoConta(conta)==="estatistica"}
export function centroTecnicoDaConta(conta){return definicaoRaiz(conta)?.ccTecnicoId||""}

export function naturezaContabilPadrao(valor){return definicaoRaiz(valor)?.naturezaContabilPadrao||"neutra"}
export function naturezaContabilConta(conta){
  const n=String(conta?.naturezaContabil||conta?.naturezaSaldo||"").toLowerCase();
  if(n==="devedora"||n==="devedor")return"devedora";
  if(n==="credora"||n==="credor")return"credora";
  if(n==="neutra")return"neutra";
  return naturezaContabilPadrao(conta);
}
export function multiplicadorApresentacao(conta){
  const raiz=raizConta(conta),natureza=naturezaContabilConta(conta),padrao=naturezaContabilPadrao(conta);
  if(raiz==="9"||natureza==="neutra")return 1;
  return natureza===padrao?1:-1;
}
export function multiplicadorResultado(conta){
  const raiz=raizConta(conta),mult=multiplicadorApresentacao(conta);
  if(raiz==="3")return 1*mult;
  if(raiz==="4")return -1*mult;
  return 0;
}
export function contaRedutora(conta){return raizConta(conta)!=="9"&&multiplicadorApresentacao(conta)===-1}
export function descricaoNatureza(conta){const n=naturezaContabilConta(conta),m=multiplicadorApresentacao(conta);return`${n==="devedora"?"Devedora":n==="credora"?"Credora":"Neutra"} · ${m>0?"+1":"-1"}`}

export function inferirRaizLegada(conta){
  if(!conta)return"";
  if(conta.natureza==="estatistica"||conta.tipoConta==="estatistica"||conta.grupoDre==="estatisticas")return"9";
  if(conta.natureza==="receita"||conta.grupoDre==="receita")return"3";
  if(conta.natureza==="ativo"||conta.tipoConta==="ativo")return"1";
  if(conta.natureza==="passivo"||conta.tipoConta==="passivo")return"2";
  return"4";
}

function maiorSequencia(contas,prefixo,regex,segmento){let maior=0;for(const c of contas||[]){const codigo=String(c?.codigo||"");if(!regex.test(codigo)||!codigo.startsWith(prefixo))continue;const p=codigo.split(".");maior=Math.max(maior,Number(p[segmento]||0))}return maior}
export function proximoCodigoSintetico(contas,raiz){const r=String(raiz||"");if(!RAIZES_CONTABEIS[r])throw new Error("raiz-invalida");const n=maiorSequencia(contas,`${r}.`,PADRAO_SINTETICA,1)+1;if(n>99)throw new Error("limite-sinteticas");return`${r}.${String(n).padStart(2,"0")}`}
export function proximoCodigoAnalitico(contas,paiCodigo){const pai=String(paiCodigo||"");if(!codigoSinteticoValido(pai))throw new Error("pai-sintetica-invalido");const regex=new RegExp(`^${pai.replace(".","\\.")}\\.\\d{4}$`),n=maiorSequencia(contas,`${pai}.`,regex,2)+1;if(n>9999)throw new Error("limite-analiticas");return`${pai}.${String(n).padStart(4,"0")}`}

export function grupoDreCompatibilidade(raiz){return({"1":"ativo","2":"passivo","3":"receita","4":"despesas","9":"estatisticas"})[String(raiz)]||"despesas"}
export function naturezaCompatibilidade(raiz){return RAIZES_CONTABEIS[String(raiz)]?.natureza||"despesa"}
export function raizVirtual(raiz){const d=RAIZES_CONTABEIS[String(raiz)];return d?{id:`__raiz_${d.codigo}__`,codigo:d.codigo,nome:d.nome,grupoRaiz:d.codigo,tipoEstrutura:"sintetica",raizSistema:true,status:"ativo",demonstracao:d.tipo,natureza:d.natureza,naturezaContabil:d.naturezaContabilPadrao,centroTecnicoId:d.ccTecnicoId}:null}
