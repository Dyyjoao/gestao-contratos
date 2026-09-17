from pathlib import Path
import re
R=Path(__file__).resolve().parents[1]
def rw(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')

# RH Cultura: exclusão física administrativa auditada, além do estorno.
p='js/hr-culture.js';s=rw(p)
s=s.replace("import { confirmarAcaoAdministrativa, atualizarComAuditoria } from './admin-actions.js';","import { confirmarAcaoAdministrativa, atualizarComAuditoria, excluirComAuditoria } from './admin-actions.js';")
anchor="async function estornar(k,id){if(!admin())return;"
if anchor not in s: raise SystemExit('estornar cultura nao encontrado')
pos=s.index('function render(k)',s.index(anchor))
extra="""async function excluirAdm(k,id){if(!admin())return;const x=registros[k].find(v=>v.id===id);if(!x)return;const ok=await confirmarAcaoAdministrativa({titulo:'Excluir fisicamente registro de RH',descricao:'Use apenas para cadastro duplicado ou teste. A auditoria será preservada.',motivoLabel:'Motivo obrigatório',confirmarTexto:'Excluir definitivamente',perigosa:true});if(!ok)return;try{await excluirComAuditoria({colecao:MOD[k].colecao,id,empresaId:x.empresaId,modulo:MOD[k].perfil,motivo:ok.motivo,resumo:`Exclusão física ${MOD[k].titulo}`,snapshotAntes:x});emitirAlteracao('rh');await carregar(k)}catch(e){console.error(e);alert('Não foi possível excluir. Confira as Rules administrativas.')}}\n"""
if 'async function excluirAdm(k,id)' not in s:s=s[:pos]+extra+s[pos:]
# Acrescenta Exclusão ADM ao lado do Estorno ADM sem depender de espaçamento/minificação exatos.
if 'data-rhc-excluir=' not in s:
    pat=r"(\$\{x\.status==='ativo'&&admin\(\)\?`<button[^`]+data-rhc-estorno=\\?\"\$\{x\.id\}\\?\"[^`]*Estornar ADM</button>`:''\})"
    m=re.search(pat,s)
    if not m:
        # fallback simples: injeta no bloco de ações imediatamente após a expressão de estorno
        token="Estornar ADM</button>`:''}"
        i=s.find(token)
        if i<0: raise SystemExit('acao Estornar ADM cultura nao encontrada')
        j=i+len(token)
        s=s[:j]+"${admin()?`<button class=\"btn-acao perigo\" type=\"button\" data-rhc-excluir=\"${x.id}\">Excluir ADM</button>`:''}"+s[j:]
    else:
        s=s[:m.end()]+"${admin()?`<button class=\"btn-acao perigo\" type=\"button\" data-rhc-excluir=\"${x.id}\">Excluir ADM</button>`:''}"+s[m.end():]
if "[data-rhc-excluir]" not in s:
    token="document.querySelectorAll('[data-rhc-estorno]').forEach(b=>b.addEventListener('click',()=>estornar(k,b.dataset.rhcEstorno)))"
    if token not in s: raise SystemExit('listener estorno cultura nao encontrado')
    s=s.replace(token,token+";document.querySelectorAll('[data-rhc-excluir]').forEach(b=>b.addEventListener('click',()=>excluirAdm(k,b.dataset.rhcExcluir)))",1)
wr(p,s)

# Rules: Administrador pode excluir fisicamente itens RH, sempre dentro do grupo/empresa.
p='firestore.rules';s=rw(p)
subs=[
("      allow delete: if false;\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    match /{colecao}/{id} {\n      allow read: if colecao in ['rhAusencias','rhHorasColaboradores']"),
("      allow delete: if false;\n    }\n    function rhAvaliacaoValida", "      allow delete: if colecao in ['rhAusencias','rhHorasColaboradores'] && administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAvaliacaoValida"),
("      allow delete: if false;\n    }\n    function rhAcaoValida", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n    function rhAcaoValida"),
("      allow delete: if false;\n    }\n\n    function moduloIndicador", "      allow delete: if administrador() && documentoAcessivel(resource.data);\n    }\n\n    function moduloIndicador")]
for old,new in subs:
    if old in s:s=s.replace(old,new,1)
# Contratos de segurança: as cinco coleções RH devem ter delete administrativo explícito ao final.
for needle in ["match /rhColaboradores/{id}","match /rhAvaliacoes360/{id}","match /rhAcoes/{id}"]:
    if needle not in s: raise SystemExit(f'bloco ausente: {needle}')
if "colecao in ['rhAusencias','rhHorasColaboradores'] && administrador()" not in s: raise SystemExit('delete admin ausencias/horas nao aplicado')
wr(p,s)
print('admin RH v2 aplicado')
