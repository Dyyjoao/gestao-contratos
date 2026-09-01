const n=v=>{const x=Number(v??0);return Number.isFinite(x)?x:0};
const positivo=v=>Math.max(0,n(v));

export function statusConsorcioAtivo(status){
  return status==="ativo"||status==="contemplado";
}

export function calcularConsorcio(dados={}){
  const creditoContratado=positivo(dados.creditoContratado);
  const creditoAtualInformado=positivo(dados.creditoAtual);
  const creditoBase=creditoAtualInformado>0?creditoAtualInformado:creditoContratado;
  const prazoMeses=Math.max(1,Math.trunc(positivo(dados.prazoMeses)||1));
  const parcelasPagas=Math.min(prazoMeses,Math.max(0,Math.trunc(positivo(dados.parcelasPagas))));
  const parcelasRestantes=Math.max(0,prazoMeses-parcelasPagas);

  const taxaAdministracaoPct=positivo(dados.taxaAdministracaoPct);
  const fundoReservaPct=positivo(dados.fundoReservaPct);
  const seguroOutrosPct=positivo(dados.seguroOutrosPct);
  const jurosEncargosPct=positivo(dados.jurosEncargosPct);
  const taxaConsorcioPct=taxaAdministracaoPct+fundoReservaPct+seguroOutrosPct;
  const custoAdicionalPct=taxaConsorcioPct+jurosEncargosPct;

  const taxaAdministracaoValor=creditoBase*taxaAdministracaoPct/100;
  const fundoReservaValor=creditoBase*fundoReservaPct/100;
  const seguroOutrosValor=creditoBase*seguroOutrosPct/100;
  const jurosEncargosValor=creditoBase*jurosEncargosPct/100;
  const taxaConsorcioValor=taxaAdministracaoValor+fundoReservaValor+seguroOutrosValor;
  const custoAdicionalValor=taxaConsorcioValor+jurosEncargosValor;
  const totalEstimadoPlano=creditoBase+custoAdicionalValor;
  const parcelaMediaEstimada=totalEstimadoPlano/prazoMeses;

  const valorPagoAcumulado=positivo(dados.valorPagoAcumulado);
  const saldoTeorico=valorPagoAcumulado>0
    ?Math.max(0,totalEstimadoPlano-valorPagoAcumulado)
    :Math.max(0,parcelaMediaEstimada*parcelasRestantes);

  const valorParcelaAtual=positivo(dados.valorParcelaAtual);
  const parcelaReferencia=valorParcelaAtual>0?valorParcelaAtual:parcelaMediaEstimada;
  const percentualParcelasPagas=prazoMeses?parcelasPagas/prazoMeses*100:0;
  const creditoUtilizado=Math.min(creditoBase,positivo(dados.creditoUtilizado));
  const saldoCarta=Math.max(0,creditoBase-creditoUtilizado);

  return{
    creditoContratado,
    creditoBase,
    prazoMeses,
    parcelasPagas,
    parcelasRestantes,
    taxaAdministracaoPct,
    fundoReservaPct,
    seguroOutrosPct,
    jurosEncargosPct,
    taxaConsorcioPct,
    custoAdicionalPct,
    taxaAdministracaoValor,
    fundoReservaValor,
    seguroOutrosValor,
    jurosEncargosValor,
    taxaConsorcioValor,
    custoAdicionalValor,
    totalEstimadoPlano,
    parcelaMediaEstimada,
    valorPagoAcumulado,
    saldoTeorico,
    valorParcelaAtual,
    parcelaReferencia,
    percentualParcelasPagas,
    creditoUtilizado,
    saldoCarta
  };
}

function competenciaParcela(dataInicio,indice){
  const m=String(dataInicio||"").match(/^(\d{4})-(\d{2})/);
  if(!m)return"";
  const base=Number(m[1])*12+(Number(m[2])-1)+Math.max(0,indice);
  const ano=Math.floor(base/12),mes=base%12+1;
  return`${String(mes).padStart(2,"0")}/${ano}`;
}

export function gerarCronogramaConsorcio(dados={}){
  const r=calcularConsorcio(dados);
  const prazo=r.prazoMeses;
  const porParcela={
    credito:r.creditoBase/prazo,
    taxaAdministracao:r.taxaAdministracaoValor/prazo,
    fundoReserva:r.fundoReservaValor/prazo,
    seguroOutros:r.seguroOutrosValor/prazo,
    jurosEncargos:r.jurosEncargosValor/prazo,
    total:r.totalEstimadoPlano/prazo
  };
  return Array.from({length:prazo},(_,i)=>({
    numero:i+1,
    competencia:competenciaParcela(dados.dataInicio,i),
    status:i<r.parcelasPagas?"paga":"a_vencer",
    credito:porParcela.credito,
    taxaAdministracao:porParcela.taxaAdministracao,
    fundoReserva:porParcela.fundoReserva,
    seguroOutros:porParcela.seguroOutros,
    jurosEncargos:porParcela.jurosEncargos,
    valorTeorico:porParcela.total,
    valorReferencia:i>=r.parcelasPagas&&r.valorParcelaAtual>0?r.valorParcelaAtual:porParcela.total
  }));
}
