const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function disparar(el){
  el.dispatchEvent(new Event("change",{bubbles:true}));
}

function garantirCss(){
  if(document.getElementById("sig-period-navigation-css"))return;
  const s=document.createElement("style");
  s.id="sig-period-navigation-css";
  s.textContent=`
  .sig-period-native{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;overflow:hidden!important}
  .sig-year-nav{display:flex;align-items:center;gap:6px;min-height:42px}
  .sig-year-btn{border:1px solid #d7e1e6;background:#fff;color:#52606d;border-radius:10px;padding:9px 12px;font:inherit;font-size:12px;font-weight:750;cursor:pointer;min-width:64px;transition:.15s ease}
  .sig-year-btn:hover{border-color:#0c9488;color:#087a6f;background:#f2fbf9}
  .sig-year-btn.ativo{background:#0b1f33;border-color:#0b1f33;color:#fff;min-width:76px;font-size:13px}
  .sig-month-picker{display:grid;gap:8px;min-width:330px}
  .sig-month-year{display:flex;align-items:center;justify-content:flex-start;gap:6px}
  .sig-months{display:grid;grid-template-columns:repeat(6,minmax(44px,1fr));gap:5px}
  .sig-month-btn{border:1px solid #d7e1e6;background:#fff;color:#52606d;border-radius:8px;padding:7px 5px;font:inherit;font-size:10px;font-weight:750;cursor:pointer;transition:.15s ease}
  .sig-month-btn:hover{border-color:#0c9488;color:#087a6f;background:#f2fbf9}
  .sig-month-btn.ativo{background:#0c9488;border-color:#0c9488;color:#fff}
  @media(max-width:720px){.sig-month-picker{min-width:0;width:100%}.sig-months{grid-template-columns:repeat(4,1fr)}.sig-year-btn{padding:8px 9px;min-width:58px}}
  `;
  document.head.appendChild(s);
}

function montarAno(input){
  if(!input||input.dataset.periodNav==="1")return;
  input.dataset.periodNav="1";
  input.classList.add("sig-period-native");
  const nav=document.createElement("div");
  nav.className="sig-year-nav";
  input.after(nav);

  function valor(){return Number(input.value)||new Date().getFullYear()}
  function render(){
    const y=valor();
    nav.innerHTML=`<button class="sig-year-btn" type="button" data-y="${y-1}">${y-1}</button><button class="sig-year-btn ativo" type="button" aria-current="true" data-y="${y}">${y}</button><button class="sig-year-btn" type="button" data-y="${y+1}">${y+1}</button>`;
    nav.querySelectorAll("[data-y]").forEach(b=>b.addEventListener("click",()=>{
      const novo=Number(b.dataset.y);
      if(novo===valor())return;
      input.value=String(novo);
      render();
      disparar(input);
    }));
  }
  input.addEventListener("change",render);
  render();
}

function montarCompetencia(input){
  if(!input||input.dataset.periodNav==="1")return;
  input.dataset.periodNav="1";
  input.classList.add("sig-period-native");
  const nav=document.createElement("div");
  nav.className="sig-month-picker";
  input.after(nav);

  function partes(){
    const v=input.value||new Date().toISOString().slice(0,7);
    const [a,m]=v.split("-").map(Number);
    return{ano:a||new Date().getFullYear(),mes:Math.max(1,Math.min(12,m||1))};
  }
  function escolher(ano,mes){
    input.value=`${ano}-${String(mes).padStart(2,"0")}`;
    render();
    disparar(input);
  }
  function render(){
    const {ano,mes}=partes();
    nav.innerHTML=`
      <div class="sig-month-year">
        <button class="sig-year-btn" type="button" data-ano="${ano-1}">${ano-1}</button>
        <button class="sig-year-btn ativo" type="button" aria-current="true" data-ano="${ano}">${ano}</button>
        <button class="sig-year-btn" type="button" data-ano="${ano+1}">${ano+1}</button>
      </div>
      <div class="sig-months">${MESES.map((nome,i)=>`<button class="sig-month-btn ${i+1===mes?"ativo":""}" type="button" data-mes="${i+1}">${nome}</button>`).join("")}</div>`;
    nav.querySelectorAll("[data-ano]").forEach(b=>b.addEventListener("click",()=>escolher(Number(b.dataset.ano),mes)));
    nav.querySelectorAll("[data-mes]").forEach(b=>b.addEventListener("click",()=>escolher(ano,Number(b.dataset.mes))));
  }
  input.addEventListener("change",render);
  render();
}

function aplicar(){
  ["dreAno","realizadoAno","budgetAno","forecastAno","dashFinanceAno"].forEach(id=>montarAno(document.getElementById(id)));
  ["prestacaoCompetencia","fechamentoCompetencia"].forEach(id=>montarCompetencia(document.getElementById(id)));
}

function observar(id){
  const alvo=document.getElementById(id);if(!alvo)return;
  let timer;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(aplicar,20)}).observe(alvo,{childList:true,subtree:true});
}

garantirCss();
aplicar();
observar("pagina-controladoria");
observar("pagina-dashboard");
window.addEventListener("sig:ready",aplicar);
window.addEventListener("sig:page",aplicar);
