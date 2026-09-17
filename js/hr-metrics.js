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
