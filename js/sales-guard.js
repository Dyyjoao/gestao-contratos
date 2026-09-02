import { $, permite, admin } from "./core.js";

function aplicar(){
  const pode=admin()||permite("vendas","comissoes");
  const taxa=$("salesPct"),status=$("salesComStatus");
  if(taxa){taxa.disabled=!pode;taxa.title=pode?"":"A taxa vem do cadastro do vendedor. Alterações exigem a permissão de comissões."}
  if(status){status.disabled=!pode;status.title=pode?"":"Aprovação e pagamento exigem a permissão de comissões."}
}
function titulo(e){if(e?.detail?.pagina!=="vendas")return;if($("tituloPagina"))$("tituloPagina").textContent="Vendas & Comissões"}
const obs=new MutationObserver(aplicar);obs.observe(document.body,{childList:true,subtree:true});window.addEventListener("sig:ready",aplicar);window.addEventListener("sig:page",e=>{titulo(e);aplicar()});aplicar();
