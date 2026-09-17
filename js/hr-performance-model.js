export const COMPETENCIAS = ['Colaboração', 'Entrega', 'Comunicação', 'Iniciativa', 'Liderança'];
export const GRUPOS = ['AUTOAVALIAÇÃO', 'LIDERANÇA', 'PAR', 'LIDERADO', 'CLIENTE', 'FORNECEDOR'];
export const MODALIDADES = {
  '90°': ['LIDERANÇA'],
  '180°': ['AUTOAVALIAÇÃO', 'LIDERANÇA'],
  '360°': ['AUTOAVALIAÇÃO', 'LIDERANÇA', 'PAR', 'LIDERADO'],
  '540°': GRUPOS
};
export function resumoCiclo(ciclo, respostas) {
  const validas = respostas.filter(r => r.status === 'ativo' && r.cicloId === ciclo.id);
  const porChave = new Map(validas.map(r => [r.avaliadorChave, r]));
  const grupos = MODALIDADES[ciclo.modalidade] || [];
  const andamento = grupos.map(papel => {
    const previstos = Object.entries(ciclo.avaliadores || {}).filter(([, a]) => a.papel === papel);
    const concluidos = previstos.filter(([chave]) => porChave.has(chave));
    const medias = concluidos.map(([chave]) => {
      const notas = porChave.get(chave)?.notas || [];
      return notas.length === COMPETENCIAS.length ? notas.reduce((n, v) => n + v, 0) / notas.length : null;
    }).filter(n => n !== null);
    return { papel, previstos: previstos.length, concluidos: concluidos.length,
      media: medias.length ? medias.reduce((n, v) => n + v, 0) / medias.length : null };
  });
  const medias = andamento.map(g => g.media).filter(n => n !== null);
  return { andamento, previstos: andamento.reduce((n, g) => n + g.previstos, 0),
    concluidos: andamento.reduce((n, g) => n + g.concluidos, 0),
    media: medias.length ? medias.reduce((n, v) => n + v, 0) / medias.length : null };
}
export function periodoInclui(periodo, mes) {
  return periodo.indices.some(i => mes === `${periodo.ano}-${String(i + 1).padStart(2, '0')}`);
}
export function caixa9(desempenho, potencial) {
  if (!['BAIXO', 'MÉDIO', 'ALTO'].includes(desempenho) || !['BAIXO', 'MÉDIO', 'ALTO'].includes(potencial)) return '—';
  return `${desempenho} × ${potencial}`;
}
