const n=v=>{const x=Number(v||0);return Number.isFinite(x)?x:0};

export function indiceMesContrato(iso){
  const s=String(iso||"");
  if(!/^\d{4}-\d{2}/.test(s))return null;
  return Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
}

export function competenciaIndiceContrato(ano,mes0){
  return Number(ano)*12+Number(mes0);
}

export function contratoVigenteNoMes(c,ano,mes0){
  const alvo=competenciaIndiceContrato(ano,mes0),ini=indiceMesContrato(c?.inicio),fim=indiceMesContrato(c?.fim);
  return(ini===null||alvo>=ini)&&(fim===null||alvo<=fim);
}

export function regraReajusteContrato(c){
  const regra=c?.regraReajuste||{};
  const tipo=["percentual_fixo","indice"].includes(regra.tipo)?regra.tipo:"sem_reajuste";
  return{
    tipo,
    indice:String(regra.indice||"").trim(),
    percentualProjetado:tipo==="sem_reajuste"?0:n(regra.percentualProjetado),
    periodicidadeMeses:Math.max(1,n(regra.periodicidadeMeses)||12)
  };
}

export function ciclosReajusteContrato(c,ano,mes0){
  const ini=indiceMesContrato(c?.inicio);
  if(ini===null)return 0;
  const alvo=competenciaIndiceContrato(ano,mes0),regra=regraReajusteContrato(c);
  return Math.max(0,Math.floor((alvo-ini)/regra.periodicidadeMeses));
}

export function valorContratoNoMes(c,ano,mes0){
  if(!contratoVigenteNoMes(c,ano,mes0))return 0;
  const base=Math.abs(n(c?.valorMensal));
  if(!base)return 0;
  const regra=regraReajusteContrato(c),ciclos=ciclosReajusteContrato(c,ano,mes0);
  return base*Math.pow(1+regra.percentualProjetado/100,ciclos);
}

export function valoresContratoNoAno(c,ano,meses=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"]){
  return Object.fromEntries(meses.map((m,i)=>[m,valorContratoNoMes(c,ano,i)]));
}

export function snapshotReajusteContrato(c){
  const r=regraReajusteContrato(c);
  return{tipo:r.tipo,indice:r.indice,percentualProjetado:r.percentualProjetado,periodicidadeMeses:r.periodicidadeMeses};
}
