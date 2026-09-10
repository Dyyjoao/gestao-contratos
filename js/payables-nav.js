function ajustarTitulo(pagina){
  if(pagina!=="contas-pagar")return;
  const titulo=document.getElementById("tituloPagina");
  if(titulo)titulo.textContent="Contas a Pagar";
}
window.addEventListener("sig:page",e=>ajustarTitulo(e.detail?.pagina));
