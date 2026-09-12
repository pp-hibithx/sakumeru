(function(){
  "use strict";
  if(document.body.classList.contains("home-page"))return;
  const KEY="trpg39_home_tutorial_v1",TEXT=window.SAKUMERU_HOME_GUIDE_TEXT;
  if(!TEXT)return;
  const topics=[
    {key:"scenario",path:"scenario/index.html"},{key:"calendar",path:"calendar/index.html"},{key:"library",path:"library/index.html"},
    {key:"pc",path:"pcs/index.html"},{key:"players",path:"players/index.html"},{key:"share",path:"share/manage.html"},{key:"tools",path:"tools/index.html"}
  ];
  let state={};try{state=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch{}
  if((state.completed&&!state.review)||state.mode!=="tutorial")return;
  const currentPath=location.pathname.replace(/\\/g,"/").toLowerCase();
  const at=(segment,file="index.html")=>currentPath.endsWith(`/${segment}/${file}`)||currentPath.endsWith(`/${segment}/`);
  const currentPage=at("scenario")?"scenario":at("calendar")?"calendar":at("library")?"library":at("pcs")?"pc":at("players")?"players":at("share","manage.html")?"share":at("tools")?"tools":"";
  const actualStep=topics.findIndex(topic=>topic.key===currentPage);
  if(actualStep<0)return;
  const savedStep=Math.max(0,Math.min(topics.length-1,Number(state.step)||0));
  const step=actualStep,script=document.currentScript;
  const root=script?new URL("../../",script.src):new URL("./",location.href);
  const save=patch=>{state={...state,...patch,updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(state))};
  if(savedStep!==step||state.targetPage!==currentPage)save({step,targetPage:currentPage});
  const style=document.createElement("style");style.textContent=`
    .sakumeru-tour{position:fixed;right:clamp(12px,3vw,32px);bottom:clamp(12px,3vw,28px);z-index:1200;width:min(650px,calc(100vw - 24px));filter:drop-shadow(0 10px 24px rgba(0,0,0,.38));animation:sakumeruTourIn .24s ease-out both}
    .sakumeru-tour-inner{display:grid;grid-template-columns:86px minmax(0,1fr);gap:11px;align-items:end}.sakumeru-tour.no-art .sakumeru-tour-inner{grid-template-columns:minmax(0,1fr)}.sakumeru-tour-figure{margin:0;text-align:center}.sakumeru-tour-figure img{display:block;width:86px;height:112px;object-fit:contain}.sakumeru-tour-figure figcaption{font-size:12px;opacity:.72}.sakumeru-tour-box{min-width:0;padding:11px 13px 12px;border:1px solid var(--line,#48505c);border-radius:14px;background:var(--panel,#171b21);color:inherit}.sakumeru-tour-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.sakumeru-tour-head button{width:auto;padding:3px 8px}.sakumeru-tour-bubble{margin-top:7px;padding:10px 12px;border:1px solid var(--line,#48505c);border-radius:11px;line-height:1.7}.sakumeru-tour-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.sakumeru-tour-actions button{width:auto;min-width:max-content}.sakumeru-tour-name{font-size:12px;opacity:.72}@keyframes sakumeruTourIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(max-width:620px){.sakumeru-tour{left:10px;right:10px;bottom:10px;width:auto}.sakumeru-tour-inner{grid-template-columns:1fr}.sakumeru-tour-figure{justify-self:center}.sakumeru-tour-figure img{width:70px;height:88px}}`;
  document.head.appendChild(style);
  const host=document.createElement("aside");host.className="sakumeru-tour";host.setAttribute("aria-label","SAKU+MERU案内人");
  host.innerHTML=`<div class="sakumeru-tour-inner"><figure class="sakumeru-tour-figure"><img src="${new URL('assets/img/home-guide-shirato-mini.png',root).href}" alt="案内役・白十字"><figcaption>白十字</figcaption></figure><div class="sakumeru-tour-box"><div class="sakumeru-tour-head"><span class="sakumeru-tour-name">SAKU+MERU 案内人　${step+1}/${topics.length}</span><button type="button" data-tour-close>閉じる</button></div><div class="sakumeru-tour-bubble">${TEXT.tutorial[topics[step].key]}</div><div class="sakumeru-tour-actions">${step?'<button type="button" data-tour-prev>前へ</button>':''}${step===topics.length-1?'<button type="button" data-tour-finish>案内を終える</button>':'<button type="button" data-tour-next>次へ</button>'}</div></div></div>`;
  document.body.appendChild(host);
  host.querySelector(".sakumeru-tour-figure img").onerror=()=>{host.classList.add("no-art");host.querySelector(".sakumeru-tour-figure").hidden=true};
  const go=index=>{const next=Math.max(0,Math.min(topics.length-1,index)),topic=topics[next];save({completed:!!state.completed,review:!!state.review,mode:"tutorial",step:next,targetPage:topic.key});if(topic.path)location.href=new URL(topic.path,root).href;else location.reload()};
  host.querySelector("[data-tour-close]").onclick=()=>{save({mode:"paused",step,targetPage:topics[step].key});host.remove()};
  host.querySelector("[data-tour-prev]")?.addEventListener("click",()=>go(step-1));
  host.querySelector("[data-tour-next]")?.addEventListener("click",()=>go(step+1));
  host.querySelector("[data-tour-finish]")?.addEventListener("click",()=>{save({completed:true,review:false,mode:"complete",step,targetPage:topics[step].key});host.querySelector(".sakumeru-tour-bubble").textContent=TEXT.tutorialComplete;host.querySelector(".sakumeru-tour-actions").innerHTML='<button type="button" data-tour-done>閉じる</button>';host.querySelector("[data-tour-done]").onclick=()=>host.remove()});
})();
