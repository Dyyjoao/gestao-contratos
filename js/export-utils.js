function valorCelula(td){
  const input=td.querySelector("input");if(input)return input.value||"0";
  const select=td.querySelector("select");if(select)return select.options[select.selectedIndex]?.text||"";
  return td.innerText.replace(/\s+/g," ").trim();
}

export function tabelaParaMatriz(tabela){
  const linhas=[...tabela.querySelectorAll("tr")];
  return linhas.map(tr=>[...tr.children].filter(c=>!c.classList.contains("nao-exportar")).map(valorCelula));
}

function nomeSeguro(nome){return String(nome||"relatorio").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase()||"relatorio"}

function downloadBlob(blob,nome){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export function exportarTabelaXls(tabela,{nome="relatorio",titulo="Relatório",meta=[]}={}){
  if(!tabela)throw new Error("tabela-nao-encontrada");
  const matriz=tabelaParaMatriz(tabela);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const linhas=matriz.map((r,i)=>`<tr>${r.map(v=>`<${i===0?"th":"td"}>${esc(v)}</${i===0?"th":"td"}>`).join("")}</tr>`).join("");
  const metadados=meta.filter(Boolean).map(x=>`<div>${esc(x)}</div>`).join("");
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif}h1{font-size:18px}table{border-collapse:collapse}th,td{border:1px solid #bbb;padding:5px;white-space:nowrap}th{background:#e9eef2;font-weight:bold}</style></head><body><h1>${esc(titulo)}</h1>${metadados}<br><table>${linhas}</table></body></html>`;
  downloadBlob(new Blob(["\ufeff",html],{type:"application/vnd.ms-excel;charset=utf-8"}),`${nomeSeguro(nome)}.xls`);
}

function abrirImpressao(tabela,{titulo,meta}){
  const matriz=tabelaParaMatriz(tabela),w=window.open("","_blank");if(!w)throw new Error("popup-bloqueado");
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  w.document.write(`<html><head><title>${esc(titulo)}</title><style>@page{size:landscape;margin:8mm}body{font-family:Arial,sans-serif;color:#172b3a}h1{font-size:18px;margin:0 0 6px}.meta{font-size:10px;color:#667085;margin-bottom:10px}table{border-collapse:collapse;width:100%;font-size:7px}th,td{border:1px solid #ccd4da;padding:3px;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#eef3f5}</style></head><body><h1>${esc(titulo)}</h1><div class="meta">${meta.map(esc).join(" · ")}</div><table>${matriz.map((r,i)=>`<tr>${r.map(v=>`<${i===0?"th":"td"}>${esc(v)}</${i===0?"th":"td"}>`).join("")}</tr>`).join("")}</table><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);w.document.close();
}

export async function exportarTabelaPdf(tabela,{nome="relatorio",titulo="Relatório",meta=[]}={}){
  if(!tabela)throw new Error("tabela-nao-encontrada");
  const matriz=tabelaParaMatriz(tabela);if(!matriz.length)return;
  try{
    const [{jsPDF},{default:autoTable}]=await Promise.all([
      import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm"),
      import("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/+esm")
    ]);
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a3"});
    doc.setFontSize(15);doc.text(titulo,12,12);doc.setFontSize(8);doc.setTextColor(90);
    if(meta.length)doc.text(meta.join(" · "),12,18);
    autoTable(doc,{head:[matriz[0]],body:matriz.slice(1),startY:meta.length?23:18,styles:{fontSize:6,cellPadding:1.2,overflow:"linebreak"},headStyles:{fontStyle:"bold"},margin:{left:8,right:8}});
    doc.save(`${nomeSeguro(nome)}.pdf`);
  }catch(e){
    console.warn("PDF direto indisponível; usando impressão do navegador.",e);
    abrirImpressao(tabela,{titulo,meta});
  }
}
