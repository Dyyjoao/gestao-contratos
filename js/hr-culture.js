import './hr-performance.js';
import './hr-actions.js';

window.addEventListener('sig:data-changed',e=>{
  if(e.detail?.modulo!=='rh')return;
  setTimeout(()=>{
    const aval=document.getElementById('pagina-rh-avaliacoes');
    const acoes=document.getElementById('pagina-rh-acoes');
    if(aval&&!aval.classList.contains('hidden'))document.getElementById('rhCultAtualizar-avaliacoes')?.click();
    if(acoes&&!acoes.classList.contains('hidden'))document.getElementById('rhCultAtualizar-acoes')?.click();
  },0);
});
