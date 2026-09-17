const ID='sigBrandingFooter';

function instalarBranding(){
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar||document.getElementById(ID))return;

  const style=document.createElement('style');
  style.id='sigBrandingFooterStyle';
  style.textContent=`
    .sidebar{display:flex;flex-direction:column}
    .sidebar-menu{flex:1 1 auto;min-height:0;overflow-y:auto}
    .sig-branding-footer{flex:0 0 auto;padding:14px 18px 16px;margin-top:auto;border-top:1px solid rgba(255,255,255,.08);text-align:center;color:rgba(255,255,255,.58);font-size:10px;line-height:1.45;letter-spacing:.02em}
    .sig-branding-footer strong{display:block;margin:2px 0 3px;color:rgba(255,255,255,.86);font-size:11px;font-weight:600;letter-spacing:.03em}
    .sig-branding-footer .sig-powered{display:block;text-transform:uppercase;font-size:9px;letter-spacing:.12em;color:rgba(255,255,255,.42)}
    .sig-branding-footer .sig-copyright{display:block;margin-top:2px;font-size:9px;color:rgba(255,255,255,.38)}
  `;
  document.head.appendChild(style);

  const footer=document.createElement('div');
  footer.id=ID;
  footer.className='sig-branding-footer';
  footer.setAttribute('aria-label','Créditos do sistema');
  footer.innerHTML='<span class="sig-powered">Powered by</span><strong>Avanço Consultoria</strong><span class="sig-copyright">© 2026 · Todos os direitos reservados</span>';
  sidebar.appendChild(footer);
}

instalarBranding();
window.addEventListener('sig:ready',instalarBranding);
