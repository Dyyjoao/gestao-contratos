function parsePt(v){
  const s=String(v||"").trim().replace(/\./g,"").replace(",",".");
  const n=Number(s);return Number.isFinite(n)?n:0;
}
function aplicar(root=document){
  root.querySelectorAll?.("[data-budget-real],[data-forecast-real]").forEach(td=>{
    if(td.dataset.rawNormalizado==="1")return;
    const exibicao=td.textContent.trim();
    const valor=parsePt(exibicao);
    td.dataset.display=exibicao;
    td.dataset.rawNormalizado="1";
    td.textContent=String(valor);
    td.classList.add("fpa-valor-raw");
  });
}
const pagina=document.getElementById("pagina-controladoria");
if(pagina){
  aplicar(pagina);
  const obs=new MutationObserver(()=>aplicar(pagina));
  obs.observe(pagina,{childList:true,subtree:true});
}
