const ID='sigBrandingFooter';

function instalarBranding(){
  const mainArea=document.querySelector('.main-area');
  if(!mainArea||document.getElementById(ID))return;

  if(!document.getElementById('sigBrandingFooterStyle')){
    const style=document.createElement('style');
    style.id='sigBrandingFooterStyle';
    style.textContent=`
      .sig-page-footer{margin-top:28px;padding:16px 24px 20px;border-top:1px solid rgba(15,23,42,.08);text-align:center;color:#7b8794;font-size:11px;line-height:1.45;letter-spacing:.01em}
      .sig-page-footer strong{font-weight:600;color:#4b5563}
      .sig-page-footer .sig-powered{margin-right:4px}
      .sig-page-footer .sig-copyright{margin-left:8px}
      @media (max-width:720px){.sig-page-footer{padding:14px 16px 18px;font-size:10px}.sig-page-footer .sig-copyright{display:block;margin:3px 0 0}}
    `;
    document.head.appendChild(style);
  }

  const ano=new Date().getFullYear();
  const footer=document.createElement('footer');
  footer.id=ID;
  footer.className='sig-page-footer';
  footer.setAttribute('aria-label','Créditos do sistema');
  footer.innerHTML=`<span class="sig-powered">Powered by</span><strong>Avanço Consultoria</strong><span class="sig-copyright">© ${ano} · Todos os direitos reservados</span>`;
  mainArea.appendChild(footer);
}

instalarBranding();
window.addEventListener('sig:ready',instalarBranding);
