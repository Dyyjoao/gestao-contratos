import { carregarContratos } from "./contracts.js";

let recarregando=false;

async function sincronizar(e){
  if(e?.detail?.modulo!=="contratos"||recarregando)return;
  const pagina=document.getElementById("pagina-contratos");
  if(!pagina||pagina.classList.contains("hidden"))return;
  recarregando=true;
  try{await carregarContratos()}catch(err){console.error("Falha ao recarregar Contratos após alteração",err)}finally{recarregando=false}
}

window.addEventListener("sig:data-changed",sincronizar);
