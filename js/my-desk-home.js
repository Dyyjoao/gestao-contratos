import { $, abrirPagina } from "./core.js";

let abriuInicial=false;
function titulo(){if($("tituloPagina"))$("tituloPagina").textContent="Minha Mesa"}
function abrirInicial(){if(abriuInicial||!$("pagina-minhamesa"))return;abriuInicial=true;abrirPagina("minhamesa");titulo()}

window.addEventListener("sig:empresa-changed",()=>{if(!abriuInicial)abrirInicial()});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="minhamesa")titulo()});
setTimeout(()=>{if($("sistema")&&!$("sistema").classList.contains("hidden")&&!abriuInicial)abrirInicial()},800);
