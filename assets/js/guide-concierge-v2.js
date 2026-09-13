(function(){
  "use strict";
  if(document.body.classList.contains("home-page"))return;
  const TEXT=window.SAKUMERU_HOME_GUIDE_TEXT;if(!TEXT)return;
  let tutorial={};try{tutorial=JSON.parse(localStorage.getItem("trpg39_home_tutorial_v1")||"{}")||{}}catch{}
  // 初回ツアーだけは共通ツアーへ委ねる。完了後のHELPはこの場で完結する。
  if(tutorial.mode==="tutorial"&&!tutorial.completed)return;
  const script=document.currentScript,root=script?new URL("../../",script.src):new URL("./",location.href),path=location.pathname.toLowerCase();
  const pageKey=/\/scenario\//.test(path)?"scenario":/\/calendar\//.test(path)?"calendar":/\/library\//.test(path)?"library":/\/pcs\//.test(path)?"pc":/\/players\//.test(path)?"players":/\/share\/manage\.html/.test(path)?"share":/\/tools\//.test(path)?"tools":"";
  const pageLabels={scenario:"SCENARIO",calendar:"CALENDAR",library:"LIBRARY",pc:"PC",players:"PLAYERS",share:"SHARE",tools:"TOOLS"};
  const host=document.createElement("aside");host.className="sakumeru-tour";host.setAttribute("aria-label","SAKU+MERU案内人");host.hidden=true;document.body.appendChild(host);
  let lastTrigger=null;
  const art=()=>`<figure class="sakumeru-tour-figure"><img src="${new URL('assets/img/home-guide-shirato-mini.png',root).href}" alt="案内役・白十字"><figcaption>白十字</figcaption></figure>`;
  const help=anchor=>new URL(`help/index.html${anchor||""}`,root).href;
  function close(){host.hidden=true;host.innerHTML="";lastTrigger?.focus?.();lastTrigger=null}
  function show(message,actions,label="SAKU+MERU 案内人"){
    host.innerHTML=`<div class="sakumeru-tour-inner">${art()}<div class="sakumeru-tour-box"><div class="sakumeru-tour-head"><span class="sakumeru-tour-name">${label}</span><button type="button" data-guide-close>閉じる</button></div><div class="sakumeru-tour-bubble">${message}</div><div class="sakumeru-tour-actions sakumeru-guide-menu">${actions}</div></div></div>`;
    host.hidden=false;host.querySelector("img").onerror=()=>{host.classList.add("no-art");host.querySelector("figure").hidden=true};host.querySelector("[data-guide-close]").onclick=close;
  }
  function conciergeMenu(){
    const pageAction=pageKey?`<button type="button" data-guide-page-help>${pageLabels[pageKey]}の使い方</button>`:"";
    show(TEXT.normal,`${pageAction}<a href="${help("")}">詳しいHELPを見る</a>`);
    host.querySelector("[data-guide-page-help]")?.addEventListener("click",pageHelp);
  }
  function pageHelp(){
    if(pageKey==="scenario"){scenarioMenu();return}
    const page=pageLabels[pageKey]||"このページ",overview=TEXT.tutorial[pageKey]||TEXT.help.unavailable;
    show(overview,`<button type="button" data-guide-menu>案内メニューへ戻る</button><a href="${help("")}">詳しいHELPを見る</a>`,`${page}のご案内`);
    host.querySelector("[data-guide-menu]").onclick=conciergeMenu;
  }
  const scenarioTopics=[
    ["register","シナリオを登録したい"],["search","シナリオを探したい"],["edit","登録済みシナリオを編集したい"],["fetch","URLから情報を取得したい"],
    ["prep","卓準備をしたい"],["binder","KP用バインダーを使いたい"],["overview","SCENARIOページについて知りたい"]
  ];
  function scenarioMenu(){
    const actions=scenarioTopics.map(([key,label])=>`<button type="button" data-guide-scenario="${key}">${label}</button>`).join("");
    show(TEXT.help.pageQuestion("SCENARIO"),`${actions}<button type="button" data-guide-menu>案内メニューへ戻る</button>`,`SCENARIOのご案内`);
    host.querySelectorAll("[data-guide-scenario]").forEach(button=>button.onclick=()=>scenarioDetail(button.dataset.guideScenario));host.querySelector("[data-guide-menu]").onclick=conciergeMenu;
  }
  function scenarioDetail(kind){
    const topic=TEXT.help.pages?.scenario?.[kind];if(!topic){scenarioMenu();return}
    let extra="";
    if(kind==="register")extra='<button type="button" data-guide-scenario="registerPlace">登録場所について詳しく</button><button type="button" data-guide-scenario="registerUrl">URLから登録について</button>';
    show(`<strong>${topic.title}</strong><br>${topic.text}`,`${extra}<button type="button" data-guide-scenario-back>SCENARIOの質問へ戻る</button><button type="button" data-guide-menu>案内メニューへ戻る</button><a href="${help(kind==="prep"||kind==="binder"?"#prep":"#scenario")}">詳しいHELPを見る</a>`,`SCENARIOのご案内`);
    host.querySelectorAll("[data-guide-scenario]").forEach(button=>button.onclick=()=>scenarioDetail(button.dataset.guideScenario));host.querySelector("[data-guide-scenario-back]").onclick=scenarioMenu;host.querySelector("[data-guide-menu]").onclick=conciergeMenu;
  }
  window.SAKUMERUGuide={open(trigger){lastTrigger=trigger||document.activeElement;conciergeMenu()},close};
})();
