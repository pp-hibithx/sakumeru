(()=>{
  "use strict";

  const script=document.currentScript;
  if(!script) return;
  const siteRoot=new URL("../../",script.src);
  const url=(path)=>new URL(path,siteRoot).href;

  function escAttr(value){
    return String(value).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  }

  function gateHeaderHtml(){
    return `<header class="site-header beta-gate-header"><div class="wrap">
<div class="brand-logo-row"><a class="site-brand-logo" href="${escAttr(url("index.html"))}" aria-label="SAKU+MERU HOME">
  <span class="brand-symbol" aria-hidden="true"><img class="symbol-dark" src="${escAttr(url("assets/img/sakumeru-symbol-dark.png"))}" alt=""><img class="symbol-light" src="${escAttr(url("assets/img/sakumeru-symbol-light.png"))}" alt=""></span>
  <span class="brand-type" aria-hidden="true"><span class="brand-word">SAKU</span><span class="brand-plus">＋</span><span class="brand-word">MERU</span><span class="brand-tagline">遊んで、記して、本になる。</span></span>
</a></div>
</div></header>`;
  }

  function gateFooterHtml(){
    return `<footer class="footer beta-gate-footer"><div class="wrap">© ${new Date().getFullYear()} SAKU+MERU</div></footer>`;
  }

  function applyGateLayout(){
    if(!document.getElementById("betaAccessKey")) return;
    if(document.body.classList.contains("beta-gate-active")) return;

    document.body.classList.add("beta-gate-active");

    const main=document.body.querySelector(":scope > main");
    if(!main) return;

    main.insertAdjacentHTML("beforebegin",gateHeaderHtml());
    document.body.insertAdjacentHTML("beforeend",gateFooterHtml());

    const style=document.createElement("style");
    style.id="beta-gate-real-header-fix";
    style.textContent=`
body.beta-gate-active:before,
body.beta-gate-active:after{
  content:none !important;
  display:none !important;
  background:none !important;
}
body.beta-gate-active{
  min-height:100vh !important;
  margin:0 !important;
  display:flex !important;
  flex-direction:column !important;
  background:var(--bg) !important;
  color:var(--text) !important;
}
body.beta-gate-active > .beta-gate-header{
  flex:0 0 auto !important;
  width:100% !important;
}
body.beta-gate-active > .beta-gate-header .wrap{
  width:min(1000px,calc(100% - 32px)) !important;
  margin:auto !important;
}
body.beta-gate-active > .beta-gate-header .brand-logo-row{
  justify-content:flex-start !important;
}
body.beta-gate-active > main{
  flex:0 0 auto !important;
  align-self:center !important;
}
body.beta-gate-active > .beta-gate-footer{
  flex:0 0 auto !important;
  width:100% !important;
  margin-top:auto !important;
}
`;
    document.head.appendChild(style);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",applyGateLayout,{once:true});
  }else{
    queueMicrotask(applyGateLayout);
  }
})();
