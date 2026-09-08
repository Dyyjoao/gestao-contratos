import { auth, state, admin } from "./core.js";
import { db } from "./shared.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

function garantirCss(){
  if(document.getElementById("sig-admin-actions-css"))return;
  const s=document.createElement("style");
  s.id="sig-admin-actions-css";
  s.textContent=`
  .sig-admin-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:rgba(6,18,31,.58);backdrop-filter:blur(3px)}
  .sig-admin-modal{width:min(520px,100%);border:1px solid #d8e0e7;border-radius:16px;padding:24px;background:#fff;box-shadow:0 26px 90px rgba(0,0,0,.28);color:#1f2937}
  .sig-admin-modal h3{margin:0;color:#0b1f33;font-size:20px}.sig-admin-modal p{margin:8px 0 18px;color:#667085;line-height:1.45;font-size:13px}
  .sig-admin-modal label{display:block;margin:12px 0 6px;font-size:12px;font-weight:750;color:#344054}.sig-admin-modal input,.sig-admin-modal textarea{width:100%;border:1px solid #cfd8e1;border-radius:9px;padding:10px 12px;font:inherit}.sig-admin-modal textarea{min-height:86px;resize:vertical}
  .sig-admin-modal .sig-admin-erro{min-height:20px;margin-top:10px;color:#b42318;font-size:12px}.sig-admin-acoes{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.sig-admin-perigo{border:0;border-radius:9px;padding:10px 15px;background:#b42318;color:white;font-weight:750}.sig-admin-cancelar{border:1px solid #cfd8e1;border-radius:9px;padding:10px 15px;background:white;color:#0b1f33;font-weight:700}
  .sig-admin-estornado td{opacity:.72}.sig-admin-estornado .celula-principal strong{text-decoration:line-through}.sig-admin-estorno-info{display:block;margin-top:4px;color:#9a6700;font-size:10px;line-height:1.35}`;
  document.head.appendChild(s);
}

function erroSenha(e){
  const c=String(e?.code||"");
  if(c.includes("wrong-password")||c.includes("invalid-credential"))return"Senha administrativa incorreta.";
  if(c.includes("too-many-requests"))return"Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if(c.includes("network-request-failed"))return"Não foi possível validar a senha por falha de conexão.";
  return"Não foi possível revalidar a sessão administrativa.";
}

export async function confirmarAcaoAdministrativa({
  titulo="Ação administrativa",
  descricao="Confirme sua senha para continuar.",
  exigirMotivo=true,
  motivoLabel="Motivo / justificativa",
  confirmarTexto="Confirmar",
  perigosa=false
}={}){
  if(!admin()){
    alert("Esta ação é exclusiva do perfil Administrador.");
    return null;
  }
  if(!auth.currentUser?.email){
    alert("A sessão atual não possui e-mail disponível para reautenticação.");
    return null;
  }
  garantirCss();
  return await new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.className="sig-admin-overlay";
    overlay.innerHTML=`<section class="sig-admin-modal" role="dialog" aria-modal="true">
      <h3>${titulo}</h3><p>${descricao}</p>
      ${exigirMotivo?`<label for="sigAdminMotivo">${motivoLabel}</label><textarea id="sigAdminMotivo" maxlength="600" placeholder="Registre por que esta correção é necessária."></textarea>`:""}
      <label for="sigAdminSenha">Senha do Administrador atual</label><input id="sigAdminSenha" type="password" autocomplete="current-password" placeholder="Digite sua senha" />
      <div class="sig-admin-erro" aria-live="polite"></div>
      <div class="sig-admin-acoes"><button class="sig-admin-cancelar" type="button">Cancelar</button><button class="${perigosa?"sig-admin-perigo":"btn-primario"}" type="button" data-confirmar>${confirmarTexto}</button></div>
    </section>`;
    document.body.appendChild(overlay);
    const senha=overlay.querySelector("#sigAdminSenha"),motivo=overlay.querySelector("#sigAdminMotivo"),erro=overlay.querySelector(".sig-admin-erro"),confirmar=overlay.querySelector("[data-confirmar]");
    const fechar=valor=>{overlay.remove();resolve(valor)};
    overlay.querySelector(".sig-admin-cancelar")?.addEventListener("click",()=>fechar(null));
    overlay.addEventListener("click",e=>{if(e.target===overlay)fechar(null)});
    confirmar?.addEventListener("click",async()=>{
      const m=String(motivo?.value||"").trim(),s=String(senha?.value||"");
      if(exigirMotivo&&!m){erro.textContent="Informe a justificativa da ação.";motivo?.focus();return}
      if(!s){erro.textContent="Informe a senha do Administrador.";senha?.focus();return}
      confirmar.disabled=true;erro.textContent="Validando credenciais...";
      try{
        const cred=EmailAuthProvider.credential(auth.currentUser.email,s);
        await reauthenticateWithCredential(auth.currentUser,cred);
        fechar({motivo:m});
      }catch(e){
        console.error("Falha de reautenticação administrativa",e);
        erro.textContent=erroSenha(e);confirmar.disabled=false;senha.value="";senha.focus();
      }
    });
    setTimeout(()=>motivo?.focus()||senha?.focus(),20);
  });
}

function serializarSnapshot(v){
  try{
    return JSON.stringify(v,(k,x)=>x&&typeof x.toDate==="function"?x.toDate().toISOString():x).slice(0,12000);
  }catch{return""}
}

function auditoriaBase({empresaId,modulo,acao,colecao,documentoId,motivo,resumo,snapshotAntes}){
  return{
    grupoId:state.usuario?.grupoId||state.grupo?.id||"",
    empresaId:empresaId||state.usuario?.empresaId||"",
    usuarioId:state.usuario?.id||auth.currentUser?.uid||"",
    usuarioNome:state.usuario?.nome||auth.currentUser?.email||"Administrador",
    modulo:modulo||"sistema",
    acao:acao||"acao_administrativa",
    colecao:colecao||"",
    documentoId:documentoId||"",
    motivo:String(motivo||"").trim(),
    resumo:String(resumo||"").slice(0,500),
    snapshotAntes:serializarSnapshot(snapshotAntes),
    criadoEm:serverTimestamp()
  };
}

export async function atualizarComAuditoria({colecao,id,empresaId,modulo,acao,motivo,resumo,snapshotAntes,alteracoes}){
  if(!admin())throw new Error("acao-administrativa-negada");
  const batch=writeBatch(db),alvo=doc(db,colecao,id),aud=doc(collection(db,"auditoriaAdministrativa"));
  batch.update(alvo,{...alteracoes,atualizadoEm:serverTimestamp()});
  batch.set(aud,auditoriaBase({empresaId,modulo,acao,colecao,documentoId:id,motivo,resumo,snapshotAntes}));
  await batch.commit();
  return aud.id;
}

export async function excluirComAuditoria({colecao,id,empresaId,modulo,acao="exclusao_fisica",motivo,resumo,snapshotAntes}){
  if(!admin())throw new Error("acao-administrativa-negada");
  const batch=writeBatch(db),alvo=doc(db,colecao,id),aud=doc(collection(db,"auditoriaAdministrativa"));
  batch.set(aud,auditoriaBase({empresaId,modulo,acao,colecao,documentoId:id,motivo,resumo,snapshotAntes}));
  batch.delete(alvo);
  await batch.commit();
  return aud.id;
}
