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
    return `<header class="site-header beta-gate-header" data-beta-gate-owned="1"><div class="wrap">
<div class="brand-logo-row"><a class="site-brand-logo" href="${escAttr(url("index.html"))}" aria-label="SAKU+MERU HOME">
  <img src="${escAttr(url("assets/img/sakumeru-logo-horizontal-dark-smooth.png"))}" alt="SAKU+MERU — 遊べば、記せば、本になる。">
</a></div>
</div></header>`;
  }

  function gateFooterHtml(){
    return `<footer class="footer beta-gate-footer" data-beta-gate-owned="1"><div class="wrap">© ${new Date().getFullYear()} SAKU+MERU</div></footer>`;
  }

  function removeLegacyRecruitment(main){
    [...main.querySelectorAll("p")].forEach(p=>{
      const t=(p.textContent||"").replace(/\s+/g,"").trim();
      if(
        t.includes("本体はテスター募集中です") ||
        t.includes("DMにてお声がけください")
      ){
        p.remove();
      }
    });
  }

  function refreshGateCopy(main){
    // beta-gate.js の旧タイトルは入口UI側で置き換える。
    main.querySelector("h1")?.remove();

    const h2=main.querySelector("h2");
    if(h2) h2.textContent="現在、限定テスト公開中です";

    const directPs=[...main.querySelectorAll(":scope > p")];
    const normalPs=directPs.filter(p=>p.id!=="betaAccessError");

    if(normalPs[0]) normalPs[0].textContent="SAKU+MERUは現在、テスター向けに先行公開しています。";
    if(normalPs[1]) normalPs[1].textContent="ご案内済みのテスターキーを入力してください。";

    removeLegacyRecruitment(main);

    const input=document.getElementById("betaAccessKey");
    if(input){
      input.placeholder="テスターキー";
      input.setAttribute("aria-label","テスターキー");
    }

    const button=document.getElementById("betaAccessButton");
    if(button) button.textContent="SAKU+MERUに入る";

    // 募集文削除後、旧「共有ページ～」の案内だけを現在の公開範囲表記へ。
    [...main.querySelectorAll(":scope > p")].forEach(p=>{
      if(p.id==="betaAccessError") return;
      const t=(p.textContent||"").replace(/\s+/g,"");
      if(t.includes("共有ページの閲覧") || t.includes("共有ページ・ABOUT・HELP")){
        p.textContent="共有ページ・ABOUT・HELP・一部の公開ツールは、キーなしでもご利用いただけます。";
        p.classList.add("beta-gate-public-note");
      }
    });

    if(!main.querySelector(".beta-gate-eyebrow")){
      const eyebrow=document.createElement("div");
      eyebrow.className="beta-gate-eyebrow";
      eyebrow.textContent="SAKU+MERU  β TEST";
      h2?.insertAdjacentElement("beforebegin",eyebrow);
    }

    if(!main.querySelector(".beta-gate-home-link")){
      const home=document.createElement("a");
      home.className="beta-gate-home-link";
      home.href=url("index.html");
      home.textContent="← HOMEに戻る";
      main.insertAdjacentElement("afterbegin",home);
    }
  }

  function removeDuplicateChrome(){
    // ゲート表示中に別スクリプトがヘッダー/フッターを追加しても、入口用1組だけ残す。
    document.body.querySelectorAll("header,footer").forEach(el=>{
      if(el.dataset.betaGateOwned!=="1") el.remove();
    });
  }

  function applyGateLayout(){
    if(!document.getElementById("betaAccessKey")) return;

    document.body.classList.add("beta-gate-active");

    const main=[...document.body.children].find(el=>el.tagName==="MAIN") || document.querySelector("main");
    if(!main) return;

    removeDuplicateChrome();
    refreshGateCopy(main);

    if(!document.querySelector('[data-beta-gate-owned="1"].beta-gate-header')){
      main.insertAdjacentHTML("beforebegin",gateHeaderHtml());
    }
    if(!document.querySelector('[data-beta-gate-owned="1"].beta-gate-footer')){
      document.body.insertAdjacentHTML("beforeend",gateFooterHtml());
    }

    if(!document.getElementById("beta-gate-ui-0309")){
      const style=document.createElement("style");
      style.id="beta-gate-ui-0309";
      style.textContent=`
body.beta-gate-active:has(#betaAccessKey)::before,
body.beta-gate-active:has(#betaAccessKey)::after{
  content:none !important;
  display:none !important;
  background:none !important;
  border:0 !important;
  padding:0 !important;
  min-height:0 !important;
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
  position:relative !important;
  font-size:14px !important;
  line-height:1.7 !important;
}
body.beta-gate-active:has(#betaAccessKey) > main > h2{
  font-size:22px !important;
  line-height:1.45 !important;
}
body.beta-gate-active:has(#betaAccessKey) > main p{
  font-size:14px !important;
  line-height:1.7 !important;
}
body.beta-gate-active:has(#betaAccessKey) #betaAccessKey,
body.beta-gate-active:has(#betaAccessKey) #betaAccessButton{
  font-size:14px !important;
}
body.beta-gate-active > .beta-gate-footer{
  flex:0 0 auto !important;
  width:100% !important;
  margin-top:auto !important;
}
body.beta-gate-active .beta-gate-home-link{
  display:inline-block;
  margin:0 0 18px;
  font-size:13px;
  text-decoration:none;
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

    // 遅れて共通ヘッダーが挿入されるページにも対応。
    let timer=null;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        if(!document.getElementById("betaAccessKey")){ observer.disconnect(); return; }
        removeDuplicateChrome();
        removeLegacyRecruitment(main);
        if(!document.querySelector('[data-beta-gate-owned="1"].beta-gate-header')){
          main.insertAdjacentHTML("beforebegin",gateHeaderHtml());
        }
        if(!document.querySelector('[data-beta-gate-owned="1"].beta-gate-footer')){
          document.body.insertAdjacentHTML("beforeend",gateFooterHtml());
        }
      },0);
    });
    observer.observe(document.body,{childList:true,subtree:false});
    setTimeout(()=>observer.disconnect(),1500);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",applyGateLayout,{once:true});
  }else{
    queueMicrotask(applyGateLayout);
  }
})();