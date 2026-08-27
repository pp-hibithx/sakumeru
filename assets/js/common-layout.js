(()=>{
  "use strict";
  const script=document.currentScript;
  if(!script) return;
  const siteRoot=new URL("../../",script.src);
  const url=(path)=>new URL(path,siteRoot).href;
  const headerCss=new URL("assets/css/common-header.css",siteRoot).href;
  if(!document.querySelector('link[data-sakumeru-common-header]')){
    const link=document.createElement("link");
    link.rel="stylesheet";link.href=headerCss;link.dataset.sakumeruCommonHeader="1";
    document.head.appendChild(link);
  }
  const NAV=[
    ["home","HOME","index.html"],["scenario","SCENARIO","scenario/index.html?v=0292"],
    ["calendar","CALENDAR","calendar/index.html?v=0292"],["library","LIBRARY","library/index.html?v=0292"],
    ["pc","PC","pcs/index.html?v=0292"],["players","PLAYERS","players/index.html?v=0292"],
    ["profile","PROFILE","profile/index.html"],["tools","TOOLS","tools/index.html"],
    ["backup","BACKUP","backup/index.html"],["help","HELP","help/index.html"],
    ["about","ABOUT","about/index.html"],["settings","SETTINGS","settings/index.html"]
  ];
  function escAttr(value){return String(value).replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
  function headerHtml(active){
    const nav=NAV.map(([key,label,path])=>`<a href="${escAttr(url(path))}"${active===key?' aria-current="page"':''}>${label}</a>`).join("");
    return `<header class="site-header"><div class="wrap">
<div class="brand-logo-row"><a class="site-brand-logo" href="${escAttr(url("index.html"))}" aria-label="SAKU+MERU HOME"><img src="${escAttr(url("assets/img/sakumeru-logo-horizontal-dark-smooth.png"))}" alt="SAKU+MERU — 遊べば、記せば、本になる。"></a></div>
<nav class="nav">${nav}</nav>
<div class="theme-switcher" aria-label="テーマ"><button type="button" data-theme-choice="system">端末</button><span>·</span><button type="button" data-theme-choice="dark">ダーク</button><span>·</span><button type="button" data-theme-choice="light">ライト</button></div>
</div></header>`;
  }
  function footerHtml(){return `<footer class="footer"><div class="wrap">© ${new Date().getFullYear()} SAKU+MERU</div></footer>`;}
  document.querySelectorAll("[data-site-header]").forEach(slot=>{const active=(slot.dataset.active||"").trim().toLowerCase();slot.outerHTML=headerHtml(active);});
  document.querySelectorAll("[data-site-footer]").forEach(slot=>{slot.outerHTML=footerHtml();});
})();
