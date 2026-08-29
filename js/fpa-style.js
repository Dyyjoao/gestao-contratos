[
  ["sig-fpa-styles","fpa.css?v=14"],
  ["sig-fpa-advanced-styles","fpa-advanced.css?v=14"]
].forEach(([id,href])=>{
  if(document.getElementById(id))return;
  const link=document.createElement("link");link.id=id;link.rel="stylesheet";link.href=href;document.head.appendChild(link);
});
