import { listarDocumentos } from "./shared.js";

let porId=new Map();
let busy=false;
let timer=null;
let observer=null;

function decorar(){
  document.querySelectorAll("select option[value]").forEach(o=>{
    const r=porId.get(o.value);if(!r||o.textContent.includes(`Red. ${r}`))return;
    o.textContent=`${o.textContent} · Red. ${r}`;
  });
}
function agendar(){clearTimeout(timer);timer=setTimeout(decorar,70)}
async function carregar(){
  if(busy)return;busy=true;
  try{
    const contas=await listarDocumentos("planoContasGerencial");
    porId=new Map(contas.map(c=>[c.id,String(c.codigoReduzido||"").trim()]).filter(([,r])=>r));
    decorar();
  }catch(e){console.warn("Código reduzido: Plano de Contas indisponível neste contexto",e)}finally{busy=false}
}
function instalar(){
  if(observer)return;
  observer=new MutationObserver(agendar);observer.observe(document.body,{childList:true,subtree:true});
  carregar();
}
window.addEventListener("sig:ready",()=>{instalar();carregar()});
window.addEventListener("sig:page",()=>{carregar();setTimeout(decorar,60)});
window.addEventListener("sig:empresa-changed",carregar);
window.addEventListener("sig:data-changed",e=>{if(["controladoria","planoContas","plano"].includes(e.detail?.modulo))carregar()});
instalar();
