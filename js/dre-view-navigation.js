let observer=null;
function texto(el,valor){if(el&&el.textContent!==valor)el.textContent=valor}
function ajustar(){
  const s=document.getElementById("dreClassModelo");if(!s)return false;
  const campo=s.closest(".campo"),label=campo?.querySelector('label[for="dreClassModelo"]');texto(label,"Outras visualizações");
  const ger=[...s.options].find(o=>o.value==="gerencial"),cpc=[...s.options].find(o=>o.value==="cpc51");texto(ger,"DRE Gerencial · padrão");texto(cpc,"DRE Societária · CPC 51");
  const titulo="A DRE Gerencial é a visão principal do SIG. Use este seletor apenas quando precisar de outra apresentação.";if(campo?.getAttribute("title")!==titulo)campo?.setAttribute("title",titulo);return true;
}
function instalar(){if(observer)return;observer=new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==="dreClassModelo"||n.querySelector?.("#dreClassModelo")))))ajustar()});observer.observe(document.body,{childList:true,subtree:true});ajustar()}
window.addEventListener("sig:ready",instalar);window.addEventListener("sig:page",()=>setTimeout(ajustar,60));instalar();
