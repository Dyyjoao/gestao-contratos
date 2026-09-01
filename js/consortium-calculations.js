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
