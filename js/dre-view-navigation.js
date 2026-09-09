let observer=null;
function ajustar(){
  const s=document.getElementById("dreClassModelo");if(!s)return false;
  const campo=s.closest(".campo"),label=campo?.querySelector('label[for="dreClassModelo"]');if(label)label.textContent="Outras visualizações";
  const ger=[...s.options].find(o=>o.value==="gerencial"),cpc=[...s.options].find(o=>o.value==="cpc51");if(ger)ger.textContent="DRE Gerencial · padrão";if(cpc)cpc.textContent="DRE Societária · CPC 51";
  campo?.setAttribute("title","A DRE Gerencial é a visão principal do SIG. Use este seletor apenas quando precisar de outra apresentação.");return true;
}
function instalar(){if(observer)return;observer=new MutationObserver(()=>ajustar());observer.observe(document.body,{childList:true,subtree:true});ajustar()}
window.addEventListener("sig:ready",instalar);window.addEventListener("sig:page",()=>setTimeout(ajustar,60));instalar();
