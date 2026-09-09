import { contaAnalitica } from "./account-tree.js";
import { raizConta, multiplicadorApresentacao } from "./account-mask.js";

export const VERSAO_CLASSIFICACAO_DRE="v1";

export const TIPOS_DRE={
  receita:"Receita",
  deducao:"Dedução da receita",
  custo:"Custo",
  despesa:"Despesa",
  tributo_lucro:"Tributo sobre o lucro",
  outro:"Outro resultado"
};

export const LINHAS_DRE_GERENCIAL={
  receita_bruta:"Receita Operacional Bruta",
  deducoes:"Deduções da Receita",
  custos:"Custos",
  despesas_variaveis:"Despesas Variáveis",
  pessoal:"Pessoal",
  operacionais:"Despesas Operacionais",
  administrativas:"Despesas Administrativas",
  comerciais:"Despesas Comerciais",
  depreciacao_amortizacao:"Depreciação e Amortização",
  financeiro:"Resultado Financeiro",
  investimentos:"Investimentos",
  tributos_lucro:"IRPJ / CSLL · Tributos sobre o Lucro",
  operacoes_descontinuadas:"Operações Descontinuadas",
  outros:"Outros Resultados"
};

export const CATEGORIAS_CPC51={
  operacional:"Operacional",
  investimento:"Investimento",
  financiamento:"Financiamento",
  tributos_lucro:"Tributos sobre o lucro",
  operacoes_descontinuadas:"Operações descontinuadas"
};

export const ORDEM_LINHAS_GERENCIAIS=[
  "receita_bruta","deducoes","custos","despesas_variaveis","pessoal","operacionais","administrativas","comerciais",
  "depreciacao_amortizacao","financeiro","investimentos","tributos_lucro","operacoes_descontinuadas","outros"
];

const TIPOS_VALIDOS=new Set(Object.keys(TIPOS_DRE));
const LINHAS_VALIDAS=new Set(Object.keys(LINHAS_DRE_GERENCIAL));
const CPC_VALIDAS=new Set(Object.keys(CATEGORIAS_CPC51));

export function contaLancavelResultado(c){const r=raizConta(c);return contaAnalitica(c)&&(r==="3"||r==="4")}

function fallbackLinha(c){
  const r=raizConta(c),g=String(c?.grupoDre||"").toLowerCase();
  if(g==="deducoes")return"deducoes";
  if(g==="custos")return"custos";
  if(g==="financeiro")return"financeiro";
  if(g==="impostos")return"tributos_lucro";
  if(g==="outros")return"outros";
  if(r==="3")return multiplicadorApresentacao(c)<0?"deducoes":"receita_bruta";
  return"operacionais";
}
function fallbackTipo(c,linha){
  const r=raizConta(c);
  if(linha==="deducoes")return"deducao";
  if(linha==="custos")return"custo";
  if(linha==="tributos_lucro")return"tributo_lucro";
  if(r==="3")return"receita";
  if(r==="4")return"despesa";
  return"outro";
}
function fallbackCpc(linha){
  if(linha==="financeiro")return"financiamento";
  if(linha==="investimentos")return"investimento";
  if(linha==="tributos_lucro")return"tributos_lucro";
  if(linha==="operacoes_descontinuadas")return"operacoes_descontinuadas";
  return"operacional";
}

export function normalizarClassificacaoDre(c){
  const linha=LINHAS_VALIDAS.has(c?.linhaDreGerencial)?c.linhaDreGerencial:fallbackLinha(c);
  const tipo=TIPOS_VALIDOS.has(c?.tipoDre)?c.tipoDre:fallbackTipo(c,linha);
  const categoriaCpc51=CPC_VALIDAS.has(c?.categoriaCpc51)?c.categoriaCpc51:fallbackCpc(linha);
  return{tipo,linha,categoriaCpc51,explicita:TIPOS_VALIDOS.has(c?.tipoDre)&&LINHAS_VALIDAS.has(c?.linhaDreGerencial)&&CPC_VALIDAS.has(c?.categoriaCpc51)};
}

export function grupoDreCompatibilidadeLinha(linha){
  if(linha==="receita_bruta")return"receita";
  if(linha==="deducoes")return"deducoes";
  if(linha==="custos")return"custos";
  if(linha==="financeiro"||linha==="investimentos")return"financeiro";
  if(linha==="tributos_lucro")return"impostos";
  if(linha==="outros"||linha==="operacoes_descontinuadas")return"outros";
  return"despesas";
}

export function dadosClassificacaoPersistencia({tipo,linha,categoriaCpc51}){
  if(!TIPOS_VALIDOS.has(tipo))throw new Error("tipo-dre-invalido");
  if(!LINHAS_VALIDAS.has(linha))throw new Error("linha-dre-invalida");
  if(!CPC_VALIDAS.has(categoriaCpc51))throw new Error("categoria-cpc51-invalida");
  return{tipoDre:tipo,linhaDreGerencial:linha,categoriaCpc51,grupoDre:grupoDreCompatibilidadeLinha(linha),versaoClassificacaoDre:VERSAO_CLASSIFICACAO_DRE};
}

const z=()=>Array(12).fill(0);
const soma=(a,b)=>a.map((v,i)=>Number(v||0)+Number(b?.[i]||0));
const somaChaves=(m,keys)=>keys.reduce((a,k)=>soma(a,m.get(k)||z()),z());

export function agregarClassificacao(linhas){
  const gerencial=new Map(),cpc51=new Map();
  ORDEM_LINHAS_GERENCIAIS.forEach(k=>gerencial.set(k,z()));
  Object.keys(CATEGORIAS_CPC51).forEach(k=>cpc51.set(k,z()));
  let explicitas=0,total=0;
  for(const item of linhas||[]){
    if(!contaLancavelResultado(item?.conta))continue;total++;
    const c=normalizarClassificacaoDre(item.conta);if(c.explicita)explicitas++;
    gerencial.set(c.linha,soma(gerencial.get(c.linha)||z(),item.valores||z()));
    cpc51.set(c.categoriaCpc51,soma(cpc51.get(c.categoriaCpc51)||z(),item.valores||z()));
  }
  return{gerencial,cpc51,explicitas,total};
}

export function linhasResumoGerencial(ag){
  const m=ag?.gerencial||new Map(),g=k=>m.get(k)||z(),calc=(keys)=>somaChaves(m,keys);
  const receitaLiquida=calc(["receita_bruta","deducoes"]);
  const lucroBruto=soma(receitaLiquida,g("custos"));
  const margem=soma(lucroBruto,g("despesas_variaveis"));
  const ebitda=soma(margem,calc(["pessoal","operacionais","administrativas","comerciais"]));
  const operacional=soma(ebitda,g("depreciacao_amortizacao"));
  const antesTrib=soma(operacional,calc(["financeiro","investimentos","outros"]));
  const continuadas=soma(antesTrib,g("tributos_lucro"));
  const liquido=soma(continuadas,g("operacoes_descontinuadas"));
  return[
    {id:"receita_bruta",label:"RECEITA OPERACIONAL BRUTA",valores:g("receita_bruta")},
    {id:"deducoes",label:"(-) DEDUÇÕES DA RECEITA",valores:g("deducoes")},
    {id:"receita_liquida",label:"RECEITA OPERACIONAL LÍQUIDA",valores:receitaLiquida,totalizador:true},
    {id:"custos",label:"(-) CUSTOS",valores:g("custos")},
    {id:"lucro_bruto",label:"LUCRO OPERACIONAL BRUTO",valores:lucroBruto,totalizador:true},
    {id:"despesas_variaveis",label:"(-) DESPESAS VARIÁVEIS",valores:g("despesas_variaveis")},
    {id:"margem_contribuicao",label:"MARGEM DE CONTRIBUIÇÃO",valores:margem,totalizador:true},
    {id:"pessoal",label:"(-) PESSOAL",valores:g("pessoal")},
    {id:"operacionais",label:"(-) DESPESAS OPERACIONAIS",valores:g("operacionais")},
    {id:"administrativas",label:"(-) DESPESAS ADMINISTRATIVAS",valores:g("administrativas")},
    {id:"comerciais",label:"(-) DESPESAS COMERCIAIS",valores:g("comerciais")},
    {id:"ebitda",label:"EBITDA GERENCIAL",valores:ebitda,totalizador:true,destaque:true},
    {id:"depreciacao_amortizacao",label:"(-) DEPRECIAÇÃO E AMORTIZAÇÃO",valores:g("depreciacao_amortizacao")},
    {id:"resultado_operacional",label:"RESULTADO OPERACIONAL LÍQUIDO",valores:operacional,totalizador:true},
    {id:"financeiro",label:"(+/-) RESULTADO FINANCEIRO",valores:g("financeiro")},
    {id:"investimentos",label:"(+/-) INVESTIMENTOS",valores:g("investimentos")},
    {id:"outros",label:"(+/-) OUTROS RESULTADOS",valores:g("outros")},
    {id:"antes_tributos",label:"RESULTADO ANTES DOS TRIBUTOS",valores:antesTrib,totalizador:true},
    {id:"tributos_lucro",label:"(-) IRPJ / CSLL · TRIBUTOS SOBRE O LUCRO",valores:g("tributos_lucro")},
    {id:"continuadas",label:"RESULTADO DE OPERAÇÕES CONTINUADAS",valores:continuadas,totalizador:true},
    {id:"operacoes_descontinuadas",label:"(+/-) OPERAÇÕES DESCONTINUADAS",valores:g("operacoes_descontinuadas")},
    {id:"resultado_liquido",label:"RESULTADO LÍQUIDO",valores:liquido,totalizador:true,destaque:true}
  ];
}

export function linhasResumoCpc51(ag){
  const m=ag?.cpc51||new Map(),g=k=>m.get(k)||z();
  const operacional=g("operacional"),invest=g("investimento"),antesFin=soma(operacional,invest),fin=g("financiamento"),antesTrib=soma(antesFin,fin),trib=g("tributos_lucro"),continuadas=soma(antesTrib,trib),desc=g("operacoes_descontinuadas"),liquido=soma(continuadas,desc);
  return[
    {id:"cpc_operacional",label:"RECEITAS E DESPESAS · CATEGORIA OPERACIONAL",valores:operacional},
    {id:"lucro_operacional",label:"LUCRO / PREJUÍZO OPERACIONAL",valores:operacional,totalizador:true,destaque:true},
    {id:"cpc_investimento",label:"RECEITAS E DESPESAS · CATEGORIA INVESTIMENTO",valores:invest},
    {id:"antes_financiamento_tributos",label:"LUCRO / PREJUÍZO ANTES DE FINANCIAMENTO E TRIBUTOS SOBRE O LUCRO",valores:antesFin,totalizador:true,destaque:true},
    {id:"cpc_financiamento",label:"RECEITAS E DESPESAS · CATEGORIA FINANCIAMENTO",valores:fin},
    {id:"antes_tributos_cpc",label:"RESULTADO ANTES DOS TRIBUTOS SOBRE O LUCRO",valores:antesTrib,totalizador:true},
    {id:"cpc_tributos",label:"TRIBUTOS SOBRE O LUCRO",valores:trib},
    {id:"continuadas_cpc",label:"RESULTADO DE OPERAÇÕES CONTINUADAS",valores:continuadas,totalizador:true},
    {id:"cpc_descontinuadas",label:"OPERAÇÕES DESCONTINUADAS",valores:desc},
    {id:"resultado_liquido_cpc",label:"RESULTADO LÍQUIDO",valores:liquido,totalizador:true,destaque:true}
  ];
}
