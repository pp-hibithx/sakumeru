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
  <img src="${escAttr(url("assets/img/sakumeru-logo-horizontal-dark-smooth.png"))}" alt="SAKU+MERU — 遊べば、記せば、本になる。">
</a></div>
</div></header>`;
  }

  function gateFooterHtml(){
    return `<footer class="footer beta-gate-footer"><div class="wrap">© ${new Date().getFullYear()} SAKU+MERU</div></footer>`;
  }

  function refreshGateCopy(main){
    const h2=main.querySelector("h2");
    if(h2) h2.textContent="現在、限定テスト公開中です";

    const ps=[...main.querySelectorAll(":scope > p")];
    if(ps[0]) ps[0].textContent="SAKU+MERUは現在、テスター向けに先行公開しています。";
    if(ps[1]) ps[1].textContent="ご案内済みのテスターキーを入力してください。";

    const input=document.getElementById("betaAccessKey");
    if(input){
      input.placeholder="テスターキー";
      input.setAttribute("aria-label","テスターキー");
    }

    const button=document.getElementById("betaAccessButton");
    if(button) button.textContent="SAKU+MERUに入る";

    // beta-gate.js が生成する旧案内文を、現在の限定テスト運用に合わせる。
    if(ps[2]){
      ps[2].textContent="共有ページ・ABOUT・HELP・一部の公開ツールは、キーなしでもご利用いただけます。";
      ps[2].classList.add("beta-gate-public-note");
    }
    if(ps[3]){
      ps[3].remove();
    }

    const eyebrow=document.createElement("div");
    eyebrow.className="beta-gate-eyebrow";
    eyebrow.textContent="SAKU+MERU  β TEST";
    h2?.insertAdjacentElement("beforebegin",eyebrow);
  }

  function applyGateLayout(){
    if(!document.getElementById("betaAccessKey")) return;
    if(document.body.classList.contains("beta-gate-active")) return;

    document.body.classList.add("beta-gate-active");

    const main=document.body.querySelector(":scope > main");
    if(!main) return;

    refreshGateCopy(main);
    main.insertAdjacentHTML("beforebegin",gateHeaderHtml());
    document.body.insertAdjacentHTML("beforeend",gateFooterHtml());

    const style=document.createElement("style");
    style.id="beta-gate-ui-0307";
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
body.beta-gate-active .beta-gate-eyebrow{
  margin:0 0 7px;
  color:#c99525;
  font-size:12px;
  font-weight:800;
  letter-spacing:.14em;
}
body.beta-gate-active .beta-gate-public-note{
  margin-top:24px !important;
  padding-top:18px;
  border-top:1px solid var(--line);
}
body.beta-gate-active #betaAccessButton{
  white-space:nowrap;
}
@media(max-width:560px){
  body.beta-gate-active #betaAccessKey{
    min-width:0 !important;
    width:100%;
  }
  body.beta-gate-active #betaAccessButton{
    width:100%;
  }
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