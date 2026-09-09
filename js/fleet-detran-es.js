const DETRAN_ES_VEICULOS_URL="https://detran.es.gov.br/veiculos";
let observer=null,timer=null;

function abrirDetranES(){
  window.open(DETRAN_ES_VEICULOS_URL,"_blank","noopener,noreferrer");
}

function criarBotao(id,texto){
  const b=document.createElement("button");
  b.id=id;b.type="button";b.className="btn-secundario";b.textContent=texto;
  b.title="Abrir serviços oficiais do Detran|ES para veículos, IPVA e licenciamento";
  b.addEventListener("click",abrirDetranES);
  return b;
}

function decorar(){
  const pagina=document.getElementById("pagina-frota");
  if(!pagina)return;
  const cabecalho=pagina.querySelector(".fleet-actions");
  if(cabecalho&&!document.getElementById("btnFrotaDetranES")){
    const b=criarBotao("btnFrotaDetranES","Detran ES · IPVA/Licenciamento");
    const senatran=document.getElementById("btnFrotaConsulta");
    if(senatran)senatran.insertAdjacentElement("afterend",b);else cabecalho.prepend(b);
  }
  const novaObrig=document.getElementById("btnNovaObrig");
  const toolbar=novaObrig?.parentElement;
  if(toolbar&&!document.getElementById("btnObrigDetranES")){
    const b=criarBotao("btnObrigDetranES","Consultar Detran ES");
    novaObrig.insertAdjacentElement("afterend",b);
  }
}

function agendar(){clearTimeout(timer);timer=setTimeout(decorar,60)}
function instalar(){
  if(observer)return;
  observer=new MutationObserver(agendar);
  observer.observe(document.body,{childList:true,subtree:true});
  decorar();
}

window.addEventListener("sig:ready",instalar);
window.addEventListener("sig:page",agendar);
instalar();