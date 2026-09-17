import assert from 'node:assert/strict';
import { resumoRH } from '../js/hr-metrics.js';
const pessoas=[
  {id:'a',admissao:'2026-01-10',demissao:'',setor:'PRODUÇÃO',jornadaMensalHoras:220,status:'ativo'},
  {id:'b',admissao:'2026-02-10',demissao:'2026-03-15',setor:'PRODUÇÃO',jornadaMensalHoras:200,status:'ativo'},
  {id:'c',admissao:'2026-02-01',demissao:'2026-02-28',setor:'ADM',jornadaMensalHoras:160,status:'ativo'}
];
const a=[{colaboradorId:'a',data:'2026-02-12',horas:8,status:'ativo'},{colaboradorId:'b',data:'2026-03-02',horas:4,status:'estornado'}];
const h=[{colaboradorId:'b',data:'2026-02-16',horas50:3,horas100:2,status:'ativo'}];
const feb=resumoRH(pessoas,a,h,'2026-02','2026-02');
assert.equal(feb.abertura,1);
assert.equal(feb.admissoes,2);
assert.equal(feb.demissoes,1);
assert.equal(feb.fechamento,2);
assert.ok(Math.abs(feb.turnover - 100/1.5)<1e-8);
assert.equal(feb.horasAusentes,8);
assert.equal(feb.horas50,3);
assert.equal(feb.horas100,2);
assert.ok(feb.previstas>220);
const p=resumoRH(pessoas,a,h,'2026-02','2026-03','PRODUÇÃO');
assert.equal(p.admissoes,1);
assert.equal(p.demissoes,1);
assert.equal(p.fechamento,1);
assert.equal(p.horasAusentes,8);
assert.equal(p.horas50,3);
assert.equal(p.linhas[1].fechamento,1);
assert.deepEqual(resumoRH(pessoas,a,h,'2026-03','2026-02').linhas,[]);
