import { resumoRHPeriodo } from './hr-metrics.js';
const ativo=x=>x.status!=='estornado';
export function rankingAbsenteismo(pessoas,ausencias,inicio,fim,setor=''){
  return pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).map(p=>{const r=resumoRHPeriodo([p],ausencias,[],inicio,fim);return{id:p.id,nome:p.nome,setor:p.setor,horas:r.horasAusentes,taxa:r.absenteismo,faltas:ausencias.filter(a=>ativo(a)&&a.colaboradorId===p.id&&a.data>=inicio&&a.data<=fim&&a.tipo==='FALTA').length}}).filter(x=>x.horas>0||x.faltas>0).sort((a,b)=>b.taxa-a.taxa||b.horas-a.horas);
}
export function rankingHorasExtras(pessoas,horas,inicio,fim,setor=''){
  return pessoas.filter(p=>ativo(p)&&(!setor||p.setor===setor)).map(p=>{const r=resumoRHPeriodo([p],[],horas,inicio,fim);return{id:p.id,nome:p.nome,setor:p.setor,h50:r.horas50,h100:r.horas100,total:r.horas50+r.horas100}}).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
}
export function turnoverPorSetor(pessoas,ausencias,horas,inicio,fim){
  return [...new Set(pessoas.filter(ativo).map(p=>p.setor))].map(setor=>{const r=resumoRHPeriodo(pessoas,ausencias,horas,inicio,fim,setor);return{setor,turnover:r.turnover,admissoes:r.admissoes,demissoes:r.demissoes,fechamento:r.fechamento}}).sort((a,b)=>b.turnover-a.turnover);
}
