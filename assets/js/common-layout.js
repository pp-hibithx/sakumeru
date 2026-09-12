(()=>{
  "use strict";
  const script=document.currentScript;
  if(!script) return;
  const siteRoot=new URL("../../",script.src);
  const url=(path)=>new URL(path,siteRoot).href;
  const headerCss=new URL("assets/css/common-header.css?v=0912-mobile-nav",siteRoot).href;
  if(!document.querySelector('link[data-sakumeru-common-header]')){
    const link=document.createElement("link");
    link.rel="stylesheet";link.href=headerCss;link.dataset.sakumeruCommonHeader="1";
    document.head.appendChild(link);
  }
  const binderCss=new URL("assets/css/binder-v2.css?v=0913-sheet-themes",siteRoot).href;
  if(!document.querySelector('link[data-sakumeru-binder-v2]')){
    const link=document.createElement("link");link.rel="stylesheet";link.href=binderCss;link.dataset.sakumeruBinderV2="1";document.head.appendChild(link);
  }
  if(!window.TRPG39SheetTheme&&!document.querySelector('script[data-sakumeru-sheet-theme]')){
    const themeScript=document.createElement("script");themeScript.src=url("assets/js/sheet-theme.js?v=0913-1");themeScript.async=false;themeScript.dataset.sakumeruSheetTheme="1";document.head.appendChild(themeScript);
  }
  const NAV=[
    ["home","HOME","index.html"],["scenario","SCENARIO","scenario/index.html?v=0292"],
    ["calendar","CALENDAR","calendar/index.html?v=0292"],["library","LIBRARY","library/index.html?v=0292"],
    ["pc","PC","pcs/index.html?v=0292"],["players","PLAYERS","players/index.html?v=0292"],
    ["share","SHARE","share/manage.html"],["about","ABOUT","about/index.html"],
    ["help","HELP","help/index.html"],["tools","TOOLS","tools/index.html"],
    ["profile","PROFILE","profile/index.html"],["backup","BACKUP","backup/index.html"],["settings","SETTINGS","settings/index.html"]
  ];
  function escAttr(value){return String(value).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
  function headerHtml(active){
    const nav=NAV.map(([key,label,path])=>`<a href="${escAttr(url(path))}"${active===key?' aria-current="page"':''}>${label}</a>`).join("");
    return `<header class="site-header"><div class="wrap">
<div class="site-header-top"><div class="brand-logo-row"><a class="site-brand-logo" href="${escAttr(url("index.html"))}" aria-label="SAKU+MERU HOME"><img src="${escAttr(url("assets/img/sakumeru-logo-horizontal-dark-smooth.png"))}" alt="SAKU+MERU — 遊べば、記せば、本になる。"></a></div>
<div class="mobile-primary-actions"><button type="button" data-mobile-guide>案内人を呼ぶ</button><a class="button" href="${escAttr(url("backup/index.html#cloud-sync"))}">同期する</a><button type="button" data-mobile-menu aria-expanded="false" aria-controls="mobileGlobalMenu">メニュー</button></div></div>
<div class="site-header-menu" id="mobileGlobalMenu"><nav class="nav" aria-label="グローバルナビゲーション">${nav}</nav>
<div class="theme-switcher" aria-label="テーマ"><button type="button" data-theme-choice="system">端末</button><span>·</span><button type="button" data-theme-choice="dark">ダーク</button><span>·</span><button type="button" data-theme-choice="light">ライト</button></div></div>
</div></header>`;
  }
  function footerHtml(){return `<footer class="footer"><div class="wrap">© ${new Date().getFullYear()} SAKU+MERU</div></footer>`;}
  document.querySelectorAll("[data-site-header]").forEach(slot=>{const active=(slot.dataset.active||"").trim().toLowerCase();slot.outerHTML=headerHtml(active);});
  document.querySelectorAll("[data-site-footer]").forEach(slot=>{slot.outerHTML=footerHtml();});
  document.querySelectorAll("[data-mobile-menu]").forEach(button=>button.addEventListener("click",()=>{const menu=document.getElementById(button.getAttribute("aria-controls"));const open=button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));menu?.classList.toggle("is-open",open)}));
  document.addEventListener("click",event=>{const guideButton=event.target.closest?.("[data-mobile-guide]");if(!guideButton)return;let attempts=0;const open=()=>{const launcher=document.querySelector(".sakumeru-guide-launcher")||document.getElementById("callHomeGuide");if(launcher){launcher.click();return}if(++attempts<10)setTimeout(open,100)};open()});
  document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;document.querySelectorAll("[data-mobile-menu][aria-expanded=true]").forEach(button=>{button.setAttribute("aria-expanded","false");document.getElementById(button.getAttribute("aria-controls"))?.classList.remove("is-open")})});
  const guideText=document.createElement("script");guideText.src=url("assets/js/home-guide-text.js?v=0912-page-sync");guideText.onload=()=>{const guide=document.createElement("script");guide.src=url("assets/js/home-guide-tour.js?v=0912-page-sync");guide.onload=()=>{const concierge=document.createElement("script");concierge.src=url("assets/js/guide-concierge-v2.js?v=0912-1");document.body.appendChild(concierge)};document.body.appendChild(guide);};document.body.appendChild(guideText);
})();
