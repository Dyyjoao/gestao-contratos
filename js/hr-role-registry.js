import { $, listarDocumentos, empresaUnicaSelecionadaId } from './shared.js';
import { carregarConfiguracaoModulo } from './module-settings.js';

let cargos=[],colaboradores=[],legacy=null,timer=0;
const normaliza=s=>String(s||'').trim().toUpperCase();
const empresa=()=>empresaUnicaSelecionadaId();

async function carregar(){
  const empresaId=empresa();
  if(!empresaId){cargos=[];colaboradores=[];legacy=null;return}
  const [cfg,pessoas,cfgs]=await Promise.all([
    carregarConfiguracaoModulo('rh',empresaId).catch(()=>({})),
    listarDocumentos('rhColaboradores').catch(e=>{console.warn('Colaboradores indisponíveis para cargos',e);return[]}),
    listarDocumentos('configuracoesModulos').catch(()=>[])
  ]);
  legacy=cfgs.find(x=>x.modulo==='rhCargosCentral'&&x.empresaId===empresaId)||null;
  const atuais=Array.isArray(cfg?.cargos)?cfg.cargos:[];
  const antigos=Array.isArray(legacy?.cargos)?legacy.cargos:[];
  cargos=(atuais.length?atuais:antigos).map(c=>({...c,funcoesSistema:Array.isArray(c.funcoesSistema)?c.funcoesSistema:[]}));
  colaboradores=pessoas.filter(x=>x.empresaId===empresaId&&x.status!=='estornado');
}
function cargoIdPessoa(p){return p?.cargoId||legacy?.vinculos?.[p?.id]||''}
export async function carregarBaseCargos(){
  await carregar();
  return{cargos:[...cargos],colaboradores:[...colaboradores]};
}
export async function colaboradoresPorFuncao(funcao){
  await carregar();
  const alvo=normaliza(funcao);
  return colaboradores.filter(p=>{
    const id=cargoIdPessoa(p),c=cargos.find(x=>x.id===id&&x.ativo!==false);
    return c&&c.funcoesSistema.map(normaliza).includes(alvo);
  }).map(p=>{
    const cargoId=cargoIdPessoa(p),c=cargos.find(x=>x.id===cargoId);
    return {...p,cargoId,cargoNome:p.cargoNome||c?.nome||''};
  });
}
function agendar(){clearTimeout(timer);timer=setTimeout(carregar,80)}
window.addEventListener('sig:ready',agendar);
window.addEventListener('sig:empresa-contexto',agendar);
window.addEventListener('sig:data-changed',e=>{if(e.detail?.modulo==='rh')agendar()});
window.addEventListener('sig:module-config',e=>{if(e.detail?.modulo==='rh')agendar()});
agendar();
