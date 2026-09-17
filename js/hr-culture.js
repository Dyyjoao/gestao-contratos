import './hr-performance.js?v=3';
import './hr-actions.js';

function garantirCss(arquivo,versao){
  let link=document.querySelector(`link[href^="${arquivo}"]`);
  const href=`${arquivo}?v=${versao}`;
  if(!link){link=document.createElement('link');link.rel='stylesheet';document.head.appendChild(link)}
  if(link.getAttribute('href')!==href)link.href=href;
}
garantirCss('production.css','2');
garantirCss('rh.css','3');

let refreshRhTimer=0;
function atualizarTelaRhAposGravacao(){
  clearTimeout(refreshRhTimer);
  refreshRhTimer=setTimeout(()=>{
    const aval=document.getElementById('pagina-rh-avaliacoes');
    const acoes=document.getElementById('pagina-rh-acoes');
    if(aval&&!aval.classList.contains('hidden'))document.getElementById('rhCultAtualizar-avaliacoes')?.click();
    if(acoes&&!acoes.classList.contains('hidden'))document.getElementById('rhCultAtualizar-acoes')?.click();
  },120);
}

window.addEventListener('sig:data-changed',e=>{
  if(e.detail?.modulo!=='rh')return;
  atualizarTelaRhAposGravacao();
});