import { $, listarDocumentos, listarDocumentosEmpresa, empresasSelecionadasIds } from './shared.js';
import { carregarConfiguracaoModulo } from './module-settings.js';

let cargosPorEmpresa=new Map(),colaboradores=[],legacyPorEmpresa=new Map(),timer=0;
const normaliza=s=>String(s||'').trim().toUpperCase();

async function carregar(empresaIdAlvo=""){
  const pessoas=empresaIdAlvo
    ?await listarDocumentosEmpresa('rhColaboradores',empresaIdAlvo).catch(e=>{console.warn('Colaboradores indisponíveis para cargos',e);return[]})
    :await listarDocumentos('rhColaboradores').catch(e=>{console.warn('Colaboradores indisponíveis para cargos',e);return[]});
  const ids=[...new Set((empresaIdAlvo?[empresaIdAlvo]:pessoas.map(x=>x.empresaId).concat(empresasSelecionadasIds())).filter(Boolean))];
  cargosPorEmpresa=new Map();legacyPorEmpresa=new Map();
  await Promise.all(ids.map(async empresaId=>{
    const [cfg,cfgs]=await Promise.all([
      carregarConfiguracaoModulo('rh',empresaId).catch(()=>({})),
      listarDocumentosEmpresa('configuracoesModulos',empresaId).catch(()=>[])
    ]);
    const legacy=cfgs.find(x=>x.modulo==='rhCargosCentral')||null;
    legacyPorEmpresa.set(empresaId,legacy);
    const atuais=Array.isArray(cfg?.cargos)?cfg.cargos:[];
    const antigos=Array.isArray(legacy?.cargos)?legacy.cargos:[];
    cargosPorEmpresa.set(empresaId,(atuais.length?atuais:antigos).map(c=>({...c,funcoesSistema:Array.isArray(c.funcoesSistema)?c.funcoesSistema:[]})));
  }));
  const hoje=new Date().toISOString().slice(0,10);
  colaboradores=pessoas.filter(x=>x.status!=='estornado'&&(!x.admissao||x.admissao<=hoje)&&(!x.demissao||x.demissao>=hoje));
}
function cargoIdPessoa(p){return p?.cargoId||legacyPorEmpresa.get(p?.empresaId)?.vinculos?.[p?.id]||''}
function cargoPessoa(p){const id=cargoIdPessoa(p);return (cargosPorEmpresa.get(p?.empresaId)||[]).find(x=>x.id===id&&x.ativo!==false)||null}
export async function carregarBaseCargos(empresaId=""){
  await carregar(empresaId);
  return{cargos:[...cargosPorEmpresa.values()].flat(),colaboradores:[...colaboradores]};
}
export async function colaboradoresPorFuncao(funcao,opcoes={}){
  const empresaId=typeof opcoes==='string'?opcoes:String(opcoes?.empresaId||'');
  await carregar(empresaId);
  const alvo=normaliza(funcao);
  return colaboradores.filter(p=>{
    const cargo=cargoPessoa(p);
    return cargo&&cargo.funcoesSistema.map(normaliza).includes(alvo);
  }).map(p=>{
    const cargo=cargoPessoa(p);
    return {...p,cargoId:cargoIdPessoa(p),cargoNome:p.cargoNome||cargo?.nome||''};
  });
}
function agendar(){clearTimeout(timer);timer=setTimeout(()=>carregar().catch(()=>{}),80)}
window.addEventListener('sig:ready',agendar);
window.addEventListener('sig:empresa-changed',agendar);
window.addEventListener('sig:contexto-changed',agendar);
window.addEventListener('sig:empresa-contexto',agendar);
window.addEventListener('sig:data-changed',e=>{if(e.detail?.modulo==='rh')agendar()});
window.addEventListener('sig:module-config',e=>{if(e.detail?.modulo==='rh')agendar()});
agendar();
