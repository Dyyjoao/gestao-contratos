const sistema=document.getElementById('sistema');
const sidebar=sistema?.querySelector('.sidebar');
const abrir=document.getElementById('abrirMenuMobile');
const fechar=document.getElementById('fecharMenuMobile');
const fundo=document.getElementById('fundoMenuMobile');
const mobile=window.matchMedia('(max-width:760px)');

if(sistema&&sidebar&&abrir&&fechar&&fundo){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='mobile-navigation.css?v=1';
  document.head.appendChild(css);

  function definirAberto(aberto,{restaurarFoco=false}={}){
    const ativo=mobile.matches&&aberto&&!sistema.classList.contains('hidden');
    sistema.classList.toggle('mobile-nav-open',ativo);
    document.body.classList.toggle('mobile-nav-locked',ativo);
    abrir.setAttribute('aria-expanded',String(ativo));
    abrir.setAttribute('aria-label',ativo?'Fechar menu':'Abrir menu');
    if(mobile.matches)sidebar.inert=!ativo;
    else sidebar.inert=false;
    if(ativo)fechar.focus();
    else if(restaurarFoco&&mobile.matches)abrir.focus();
  }

  abrir.addEventListener('click',()=>definirAberto(!sistema.classList.contains('mobile-nav-open'),{restaurarFoco:true}));
  fechar.addEventListener('click',()=>definirAberto(false,{restaurarFoco:true}));
  fundo.addEventListener('click',()=>definirAberto(false,{restaurarFoco:true}));
  window.addEventListener('sig:page',()=>definirAberto(false));
  document.getElementById('btnSair')?.addEventListener('click',()=>definirAberto(false));
  mobile.addEventListener('change',()=>definirAberto(false));
  document.addEventListener('keydown',event=>{
    if(!sistema.classList.contains('mobile-nav-open'))return;
    if(event.key==='Escape'){event.preventDefault();definirAberto(false,{restaurarFoco:true});return}
    if(event.key!=='Tab')return;
    const itens=[...sidebar.querySelectorAll('button:not(.hidden):not([disabled]),a[href]:not(.hidden)')]
      .filter(el=>el.getClientRects().length&&!el.closest('.hidden'));
    if(!itens.length)return;
    if(event.shiftKey&&document.activeElement===itens[0]){event.preventDefault();itens.at(-1).focus()}
    else if(!event.shiftKey&&document.activeElement===itens.at(-1)){event.preventDefault();itens[0].focus()}
  });
  definirAberto(false);
}
