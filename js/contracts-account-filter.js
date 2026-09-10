import { $, listarDocumentos } from "./shared.js";
import { contaAnalitica } from "./account-tree.js";
import { raizConta } from "./account-mask.js";

let plano=[];
let planoCarregado=false;
let carregando=null;
let selectObservado=null;
let observer=null;

const contaResultadoAnalitica=c=>{
  if(!c||c.status==="inativo"||!contaAnalitica(c))return false;
  const raiz=raizConta(c);
  return raiz==="3"||raiz==="4";
};

function mensagem(texto,erro=false){
  const el=$("mensagemContrato");
  if(!el)return;
  el.textContent=texto||"";
  el.classList.toggle("erro",!!erro);
}

function garantirAjuda(){
  const sel=$("contratoContaGerencial");
  if(!sel||$("contratoContaGerencialAjuda"))return;
  const small=document.createElement("small");
  small.id="contratoContaGerencialAjuda";
  small.textContent="Somente contas analíticas de resultado: Receita (3) e Despesa (4). Contas sintéticas, Ativo, Passivo e Estatísticas não são permitidas.";
  sel.after(small);
}

function filtrarSelect(){
  const sel=$("contratoContaGerencial");
  if(!sel||!planoCarregado)return;
  garantirAjuda();
  const mapa=new Map(plano.map(c=>[c.id,c]));
  const valorAntes=sel.value;
  const contaAntes=mapa.get(valorAntes);
  const vinculoInvalido=!!valorAntes&&!contaResultadoAnalitica(contaAntes);
  [...sel.options].forEach(op=>{
    if(!op.value)return;
    if(!contaResultadoAnalitica(mapa.get(op.value)))op.remove();
  });
  if(vinculoInvalido){
    sel.value="";
    mensagem("O vínculo anterior usa uma conta que não é analítica de resultado. Selecione uma conta de Receita (3) ou Despesa (4).",true);
  }
}

function observarSelect(){
  const sel=$("contratoContaGerencial");
  if(!sel)return;
  garantirAjuda();
  if(selectObservado===sel)return;
  observer?.disconnect();
  selectObservado=sel;
  observer=new MutationObserver(()=>filtrarSelect());
  observer.observe(sel,{childList:true});
  filtrarSelect();
}

async function carregarPlano(){
  if(carregando)return carregando;
  carregando=(async()=>{
    try{
      plano=await listarDocumentos("planoContasGerencial")||[];
      planoCarregado=true;
      observarSelect();
      filtrarSelect();
    }catch(e){
      console.warn("Contratos · filtro de contas analíticas de resultado:",e);
      plano=[];
      planoCarregado=false;
    }finally{
      carregando=null;
    }
  })();
  return carregando;
}

function validarEnvio(ev){
  if(ev.target?.id!=="formContrato")return;
  const planejamento=$("contratoPlanejamentoAtivo")?.checked===true;
  const caixa=$("contratoCaixaAtivo")?.checked===true;
  if(!planejamento&&!caixa)return;
  const id=$("contratoContaGerencial")?.value||"";
  const conta=plano.find(c=>c.id===id);
  if(id&&contaResultadoAnalitica(conta))return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  mensagem("Para integrar o contrato ao FP&A, selecione uma conta analítica de resultado — Receita (3) ou Despesa (4).",true);
  $("contratoContaGerencial")?.focus();
}

document.addEventListener("submit",validarEnvio,true);
window.addEventListener("sig:ready",()=>{observarSelect();carregarPlano()});
window.addEventListener("sig:page",e=>{if(e.detail?.pagina==="contratos"){observarSelect();carregarPlano()}});
window.addEventListener("sig:empresa-changed",()=>{planoCarregado=false;carregarPlano()});
window.addEventListener("sig:data-changed",e=>{if(["controladoria","planoContasGerencial"].includes(e.detail?.modulo)){planoCarregado=false;carregarPlano()}});

observarSelect();
carregarPlano();
