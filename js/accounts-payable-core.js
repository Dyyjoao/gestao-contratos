const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};
const pad=v=>String(v).padStart(2,"0");
const seguro=v=>String(v||"sem").replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,110);

export function hojeLocal(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
export function competenciaDeData(iso){return /^\d{4}-\d{2}/.test(String(iso||""))?String(iso).slice(0,7):""}
export function primeiroDiaCompetencia(comp){return /^\d{4}-\d{2}$/.test(String(comp||""))?`${comp}-01`:""}
export function ultimoDiaCompetencia(comp){if(!/^\d{4}-\d{2}$/.test(String(comp||"")))return"";const [a,m]=comp.split("-").map(Number),d=new Date(a,m,0);return`${a}-${pad(m)}-${pad(d.getDate())}`}
export function addMesesCompetencia(comp,q){const [a,m]=String(comp||"").split("-").map(Number);if(!a||!m)return"";const d=new Date(a,m-1+Number(q||0),1);return`${d.getFullYear()}-${pad(d.getMonth()+1)}`}
export function dataVencimento(comp,dia){const ultimo=Number(ultimoDiaCompetencia(comp).slice(8,10));return`${comp}-${pad(Math.min(Math.max(1,Number(dia)||1),ultimo))}`}
export function idBaixa({origem,origemId,competencia}){return`cp_${seguro(origem)}_${seguro(origemId)}_${String(competencia||"").replace("-","")}`}

function indiceMes(iso){const s=String(iso||"");if(!/^\d{4}-\d{2}/.test(s))return null;return Number(s.slice(0,4))*12+Number(s.slice(5,7))-1}
function vigente(origem,comp){const alvo=indiceMes(comp),ini=indiceMes(origem.inicio),fim=indiceMes(origem.fim);return alvo!==null&&(ini===null||alvo>=ini)&&(fim===null||alvo<=fim)}
function valorContrato(c,comp){
  if(!vigente(c,comp))return 0;
  const base=Math.abs(n(c.valorMensal));if(!base)return 0;
  const regra=c.regraReajuste||{},tipo=regra.tipo||"sem_reajuste",pct=tipo==="sem_reajuste"?0:n(regra.percentualProjetado),period=Math.max(1,n(regra.periodicidadeMeses)||12),ini=indiceMes(c.inicio),alvo=indiceMes(comp),ciclos=ini===null?0:Math.max(0,Math.floor((alvo-ini)/period));
  return base*Math.pow(1+pct/100,ciclos);
}
function competenciasEntre(de,ate){const out=[];let c=competenciaDeData(de),fim=competenciaDeData(ate);if(!c||!fim)return out;let guard=0;while(c<=fim&&guard++<60){out.push(c);c=addMesesCompetencia(c,1)}return out}
function stamp(x){return n(x?.atualizadoEm?.seconds||x?.criadoEm?.seconds||0)}
function mapaBaixas(baixas){const m=new Map();for(const b of baixas||[]){const k=`${b.origem||""}|${b.origemId||""}|${b.competencia||""}`,at=m.get(k);if(!at||stamp(b)>=stamp(at))m.set(k,b)}return m}
function statusOcorrencia(vencimento,baixa,hoje){if(baixa?.status==="pago")return"pago";if(vencimento<hoje)return"vencido";if(vencimento===hoje)return"vence_hoje";return"aberto"}

export function contratoElegivelContasPagar(c){
  return c?.status==="ativo"&&(c?.contasPagarAtivo===true||c?.fluxoCaixaAtivo===true)&&n(c?.valorMensal)>0&&n(c?.diaVencimento)>=1&&n(c?.diaVencimento)<=31;
}

export function projetarContasPagar({fixos=[],contratos=[],baixas=[],de,ate,hoje=hojeLocal()}={}){
  const comps=competenciasEntre(de,ate),pagos=mapaBaixas(baixas),out=[];
  const push=(origem,origemId,empresaId,comp,dia,valor,fornecedor,descricao,meta={})=>{
    const vencimento=dataVencimento(comp,dia);if(vencimento<de||vencimento>ate)return;
    const baixa=pagos.get(`${origem}|${origemId}|${comp}`)||null,status=statusOcorrencia(vencimento,baixa,hoje);
    out.push({id:idBaixa({origem,origemId,competencia:comp}),origem,origemId,empresaId,competencia:comp,vencimento,valor:Math.abs(n(valor)),fornecedor:fornecedor||"",descricao:descricao||"",status,baixa,automatico:origem==="contrato",...meta});
  };
  for(const f of fixos||[]){
    if(f?.status==="inativo"||!f?.id||!n(f?.diaVencimento)||!n(f?.valor))continue;
    for(const comp of comps){if(!vigente(f,comp))continue;push("fixo",f.id,f.empresaId,comp,f.diaVencimento,f.valor,f.fornecedor,f.descricao,{categoria:f.categoria||"Fixo"})}
  }
  for(const c of contratos||[]){
    if(!contratoElegivelContasPagar(c)||!c.id)continue;
    for(const comp of comps){if(!vigente(c,comp))continue;const valor=valorContrato(c,comp);if(!valor)continue;push("contrato",c.id,c.empresaId,comp,c.diaVencimento,valor,c.fornecedor,c.objeto||c.numero||"Contrato",{categoria:"Contrato",numeroContrato:c.numero||""})}
  }
  return out.sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))||String(a.fornecedor).localeCompare(String(b.fornecedor),"pt-BR"));
}

export function resumoContasPagar(itens,hoje=hojeLocal()){
  const mes=competenciaDeData(hoje),fim7=(()=>{const [a,m,d]=hoje.split("-").map(Number),x=new Date(a,m-1,d+7);return`${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`})();
  const aberto=(itens||[]).filter(x=>x.status!=="pago"),vencidos=aberto.filter(x=>x.vencimento<hoje),proximos7=aberto.filter(x=>x.vencimento>=hoje&&x.vencimento<=fim7),mesItens=(itens||[]).filter(x=>x.competencia===mes),pagos=mesItens.filter(x=>x.status==="pago");
  const soma=arr=>arr.reduce((s,x)=>s+n(x.valor),0);
  return{vencidosQtd:vencidos.length,vencidosValor:soma(vencidos),proximos7Qtd:proximos7.length,proximos7Valor:soma(proximos7),abertoMesQtd:mesItens.filter(x=>x.status!=="pago").length,abertoMesValor:soma(mesItens.filter(x=>x.status!=="pago")),pagosMesQtd:pagos.length,pagosMesValor:soma(pagos)};
}
