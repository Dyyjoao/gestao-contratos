// Indicadores operacionais: vínculos com data de admissão e demissão inclusivas.
export const mesDe = data => String(data || '').slice(0, 7);
export const mesesEntre = (inicio, fim) => {
  const meses = [];
  if (!/^\d{4}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}$/.test(fim) || inicio > fim) return meses;
  let [ano, mes] = inicio.split('-').map(Number);
  while (`${ano}-${String(mes).padStart(2, '0')}` <= fim && meses.length < 240) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    if (++mes === 13) { ano++; mes = 1; }
  }
  return meses;
};
export const fimMes = mes => `${mes}-${new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate()}`;
export const ativoNaData = (c, data) => c.status !== 'estornado' && c.admissao <= data && (!c.demissao || c.demissao >= data);
export const ativoNoMes = (c, mes) => c.status !== 'estornado' && c.admissao <= fimMes(mes) && (!c.demissao || c.demissao >= `${mes}-01`);
export function resumoRHDatas(colaboradores, ausencias, horas, inicio, fim, setor = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim || inicio.slice(0, 7) !== fim.slice(0, 7) || fim > fimMes(fim.slice(0, 7))) return null;
  const pessoas = colaboradores.filter(c => c.status !== 'estornado' && (!setor || c.setor === setor));
  const ids = new Set(pessoas.map(c => c.id));
  const abertura = pessoas.filter(c => c.admissao < inicio && (!c.demissao || c.demissao >= inicio)).length;
  const admissoes = pessoas.filter(c => c.admissao >= inicio && c.admissao <= fim).length;
  const demissoes = pessoas.filter(c => c.demissao >= inicio && c.demissao <= fim).length;
  const fechamento = pessoas.filter(c => c.admissao <= fim && (!c.demissao || c.demissao > fim)).length;
  const media = (abertura + fechamento) / 2;
  const diasMes = Number(fimMes(inicio.slice(0, 7)).slice(-2));
  const previstas = pessoas.reduce((total, c) => {
    const de = c.admissao > inicio ? c.admissao : inicio;
    const ate = c.demissao && c.demissao < fim ? c.demissao : fim;
    return total + (de <= ate ? Number(c.jornadaMensalHoras || 0) * (Number(ate.slice(-2)) - Number(de.slice(-2)) + 1) / diasMes : 0);
  }, 0);
  const noIntervalo = x => x.status !== 'estornado' && x.data >= inicio && x.data <= fim && ids.has(x.colaboradorId);
  const horasAusentes = ausencias.filter(noIntervalo).reduce((n, x) => n + Number(x.horas || 0), 0);
  const extras = horas.filter(noIntervalo);
  const linha = { mes: inicio.slice(0, 7), abertura, admissoes, demissoes, fechamento, media,
    turnover: media ? demissoes / media * 100 : 0, previstas, horasAusentes,
    absenteismo: previstas ? horasAusentes / previstas * 100 : 0,
    horas50: extras.reduce((n, x) => n + Number(x.horas50 || 0), 0),
    horas100: extras.reduce((n, x) => n + Number(x.horas100 || 0), 0) };
  return { ...linha, linhas: [linha] };
}
export function resumoRH(colaboradores, ausencias, horas, inicio, fim, setor = '') {
  const pessoas = colaboradores.filter(c => c.status !== 'estornado' && (!setor || c.setor === setor));
  const ids = new Set(pessoas.map(c => c.id));
  const meses = mesesEntre(inicio, fim);
  const linhas = meses.map(mes => {
    const primeiro = `${mes}-01`, ultimo = fimMes(mes);
    const abertura = pessoas.filter(c => c.admissao < primeiro && (!c.demissao || c.demissao >= primeiro)).length;
    const admissoes = pessoas.filter(c => mesDe(c.admissao) === mes).length;
    const demissoes = pessoas.filter(c => mesDe(c.demissao) === mes).length;
    const fechamento = pessoas.filter(c => c.admissao <= ultimo && (!c.demissao || c.demissao > ultimo)).length;
    const media = (abertura + fechamento) / 2;
    const diasMes = Number(ultimo.slice(-2));
    const previstas = pessoas.reduce((total, c) => {
      if (!ativoNoMes(c, mes)) return total;
      const de = Math.max(1, c.admissao.slice(0, 7) === mes ? Number(c.admissao.slice(-2)) : 1);
      const ate = Math.min(diasMes, mesDe(c.demissao) === mes ? Number(c.demissao.slice(-2)) : diasMes);
      return total + Number(c.jornadaMensalHoras || 0) * Math.max(0, ate - de + 1) / diasMes;
    }, 0);
    const faltas = ausencias.filter(a => a.status !== 'estornado' && mesDe(a.data) === mes && ids.has(a.colaboradorId));
    const extras = horas.filter(h => h.status !== 'estornado' && mesDe(h.data) === mes && ids.has(h.colaboradorId));
    const horasAusentes = faltas.reduce((n, a) => n + Number(a.horas || 0), 0);
    return { mes, abertura, admissoes, demissoes, fechamento, media, turnover: media ? demissoes / media * 100 : 0,
      previstas, horasAusentes, absenteismo: previstas ? horasAusentes / previstas * 100 : 0,
      horas50: extras.reduce((n, h) => n + Number(h.horas50 || 0), 0),
      horas100: extras.reduce((n, h) => n + Number(h.horas100 || 0), 0) };
  });
  const total = chave => linhas.reduce((n, l) => n + l[chave], 0);
  const abertura = linhas[0]?.abertura || 0, fechamento = linhas.at(-1)?.fechamento || 0;
  const media = (abertura + fechamento) / 2, previstas = total('previstas'), horasAusentes = total('horasAusentes');
  return { linhas, abertura, fechamento, admissoes: total('admissoes'), demissoes: total('demissoes'),
    turnover: media ? total('demissoes') / media * 100 : 0, horasAusentes,
    previstas, absenteismo: previstas ? horasAusentes / previstas * 100 : 0,
    horas50: total('horas50'), horas100: total('horas100') };
}


// Intervalo livre (inclusive), usado pelos filtros de calendário do RH.
export function resumoRHPeriodo(colaboradores, ausencias, horas, inicio, fim, setor = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) return {linhas:[],abertura:0,fechamento:0,admissoes:0,demissoes:0,turnover:0,horasAusentes:0,previstas:0,absenteismo:0,horas50:0,horas100:0};
  const iniMes=inicio.slice(0,7),fimM=fim.slice(0,7),linhas=[];
  for (const mes of mesesEntre(iniMes,fimM)) {
    const de=mes===iniMes?inicio:`${mes}-01`, ate=mes===fimM?fim:fimMes(mes);
    const r=resumoRHDatas(colaboradores,ausencias,horas,de,ate,setor); if(r) linhas.push(r);
  }
  const flat=linhas.map(x=>x.linhas[0]),total=k=>flat.reduce((n,l)=>n+Number(l[k]||0),0),abertura=flat[0]?.abertura||0,fechamento=flat.at(-1)?.fechamento||0,media=(abertura+fechamento)/2,previstas=total('previstas'),horasAusentes=total('horasAusentes');
  return {linhas:flat,abertura,fechamento,admissoes:total('admissoes'),demissoes:total('demissoes'),turnover:media?total('demissoes')/media*100:0,horasAusentes,previstas,absenteismo:previstas?horasAusentes/previstas*100:0,horas50:total('horas50'),horas100:total('horas100')};
}
