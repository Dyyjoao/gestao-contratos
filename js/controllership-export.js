import { $, on, esc, permite, moeda, competenciaAtual, listarDocumentos, nomeEmpresa } from "./shared.js";

const pagina=$("pagina-controladoria");
if(pagina&&!$("btnExportarControladoria")){
  const cab=pagina.querySelector(".pagina-cabecalho");
  const novo=$("btnNovaLinhaGerencial");
  if(cab&&novo){
    let acoes=cab.querySelector(".acoes-cabecalho");
    if(!acoes){acoes=document.createElement("div");acoes.className="acoes-cabecalho";novo.replaceWith(acoes);acoes.appendChild(novo)}
    const copiar=document.createElement("button");copiar.id="btnCopiarPrestacaoContas";copiar.className="btn-secundario";copiar.type="button";copiar.textContent="Copiar prestação";
    const csv=document.createElement("button");csv.id="btnExportarControladoria";csv.className="btn-secundario";csv.type="button";csv.textContent="Exportar CSV";
    acoes.prepend(copiar,csv);
  }
}

function pct(real,budget){if(!budget)return real?100:0;return((real-budget)/Math.abs(budget))*100}
function csvCell(v){const s=String(v??"").replaceAll('"','""');return `"${s}"`}
async function baseAtual(){
  const comp=$("controladoriaCompetenciaFiltro")?.value||competenciaAtual();
  const emp=$("controladoriaEmpresaFiltro")?.value||"";
  const todas=await listarDocumentos("planejamentoMensal");
  return {comp,emp,linhas:todas.filter(x=>(!comp||x.competencia===comp)&&(!emp||x.empresaId===emp))};
}

on($("btnExportarControladoria"),"click",async()=>{
  try{
    const {comp,emp,linhas}=await baseAtual();
    const cab=["Competência","Empresa","Grupo DRE","Conta gerencial","Natureza","Budget","Forecast","Realizado","Variação %","Caixa D+30","Caixa D+60","Caixa D+90","Comentário"];
    const rows=linhas.sort((a,b)=>String(a.grupoDre||"").localeCompare(String(b.grupoDre||""))||String(a.conta||"").localeCompare(String(b.conta||""),"pt-BR")).map(x=>[
      x.competencia,nomeEmpresa(x.empresaId),x.grupoDre,x.conta,x.natureza,Number(x.orcado||0).toFixed(2),Number(x.forecast||0).toFixed(2),Number(x.realizado||0).toFixed(2),pct(Number(x.realizado||0),Number(x.orcado||0)).toFixed(2),Number(x.caixaD30||0).toFixed(2),Number(x.caixaD60||0).toFixed(2),Number(x.caixaD90||0).toFixed(2),x.observacao||""
    ]);
    const conteudo='\uFEFF'+[cab,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
    const blob=new Blob([conteudo],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`SIG_Controladoria_${comp||"geral"}${emp?`_${emp}`:""}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){console.error(e);alert("Não foi possível exportar a Controladoria.")}
});

on($("btnCopiarPrestacaoContas"),"click",async()=>{
  try{
    const {comp,emp,linhas}=await baseAtual();
    const desvios=linhas.map(x=>({x,p:pct(Number(x.realizado||0),Number(x.orcado||0))})).filter(o=>Number(o.x.orcado||0)!==0&&Math.abs(o.p)>=5).sort((a,b)=>Math.abs(b.p)-Math.abs(a.p));
    const receitas=linhas.filter(x=>x.natureza==="receita").reduce((s,x)=>s+Number(x.realizado||0),0);
    const despesas=linhas.filter(x=>x.natureza!=="receita").reduce((s,x)=>s+Number(x.realizado||0),0);
    const resultado=receitas-despesas;
    const nomeEmp=emp?nomeEmpresa(emp):"Consolidado do grupo";
    const texto=[
      `SIG — Prestação de Contas Gerencial`,
      `Competência: ${comp||"Todas"}`,
      `Empresa: ${nomeEmp}`,
      ``,
      `Receita realizada: ${moeda(receitas)}`,
      `Despesa realizada: ${moeda(despesas)}`,
      `Resultado realizado: ${moeda(resultado)}`,
      ``,
      `Desvios relevantes (>= 5%):`,
      ...(desvios.length?desvios.map(({x,p})=>`- ${x.conta}: ${p>0?"+":""}${p.toLocaleString("pt-BR",{maximumFractionDigits:1})}% | Budget ${moeda(x.orcado)} | Realizado ${moeda(x.realizado)}${x.observacao?` | ${x.observacao}`:""}`):["- Nenhum desvio relevante identificado."])
    ].join("\n");
    await navigator.clipboard.writeText(texto);
    const b=$("btnCopiarPrestacaoContas");const antigo=b.textContent;b.textContent="Copiado ✓";setTimeout(()=>b.textContent=antigo,1600);
  }catch(e){console.error(e);alert("Não foi possível copiar a prestação de contas.")}
});

window.addEventListener("sig:ready",()=>{const pode=permite("controladoria");$("btnExportarControladoria")?.classList.toggle("hidden",!pode);$("btnCopiarPrestacaoContas")?.classList.toggle("hidden",!pode)});
