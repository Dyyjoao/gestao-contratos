import { $, listarDocumentos, moeda } from './shared.js';

let timer=0,busy=false;
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const placa=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const em12m=s=>{
  if(!s)return false;
  const d=new Date(`${String(s).slice(0,10)}T12:00:00`),l=new Date();
  l.setMonth(l.getMonth()-12);
  return d>=l&&d<=new Date()
};
async function seguro(c){try{return await listarDocumentos(c)}catch{return[]}}

async function atualizar(){
  if(busy||!$('frotaKpiCusto'))return;
  busy=true;
  try{
    const [veiculos,manut,mov,custos]=await Promise.all([
      seguro('veiculos'),
      seguro('manutencoesFrota'),
      seguro('abastecimentosFrota'),
      seguro('custosDiesel')
    ]);

    // O KPI da Frota só reconhece custos vinculados a veículos existentes
    // no contexto atual. Registros órfãos de combustível/manutenção não
    // podem gerar custo "fantasma".
    const vs=veiculos.filter(v=>v.status!=='baixado');
    const ids=new Set(vs.map(v=>String(v.id||'')).filter(Boolean));
    const placas=new Set(vs.map(v=>placa(v.placa)).filter(Boolean));

    let total=0;
    if(vs.length){
      const compras=custos.filter(x=>x.status!=='estornado'&&em12m(x.data));
      const custoDiesel=compras.reduce((s,x)=>s+n(x.valorTotal??x.valor),0);
      const litrosComprados=compras.reduce((s,x)=>s+n(x.quantidade),0);
      const preco=litrosComprados?custoDiesel/litrosComprados:0;

      const consumos=mov.filter(x=>{
        if(x.status==='estornado'||x.tipo!=='consumo'||!em12m(x.data))return false;
        const id=String(x.veiculoId||'').trim(),p=placa(x.placa);
        return (id&&ids.has(id))||(!id&&p&&placas.has(p));
      });
      const litrosConsumidos=consumos.reduce((s,x)=>s+n(x.quantidade),0);
      const combustivel=litrosConsumidos*preco;

      const manutencao=manut.filter(x=>
        ids.has(String(x.veiculoId||''))&&
        x.status==='concluida'&&
        em12m(x.dataRealizada||x.dataPrevista)
      ).reduce((s,x)=>s+n(x.custoReal),0);

      const obrigacoes=vs.flatMap(v=>Array.isArray(v.obrigacoes)?v.obrigacoes:[])
        .filter(x=>x.status==='pago'&&em12m(x.dataPagamento||x.vencimento))
        .reduce((s,x)=>s+n(x.valor),0);

      total=combustivel+manutencao+obrigacoes;
    }

    $('frotaKpiCusto').textContent=moeda(total);
    const small=$('frotaKpiCusto').closest('.fleet-kpi')?.querySelector('small');
    if(small)small.textContent=vs.length
      ?'combustível vinculado + manutenção + obrigações'
      :'sem veículos cadastrados';
  }finally{busy=false}
}

function agendar(){clearTimeout(timer);timer=setTimeout(atualizar,180)}
window.addEventListener('sig:ready',agendar);
window.addEventListener('sig:empresa-contexto',agendar);
window.addEventListener('sig:data-changed',e=>{if(['frota','combustivel'].includes(e.detail?.modulo))agendar()});
window.addEventListener('sig:page',e=>{if(e.detail?.pagina==='frota')agendar()});
agendar();
