(function(){
  "use strict";
  if(document.body.classList.contains("home-page"))return;
  const TEXT=window.SAKUMERU_HOME_GUIDE_TEXT;if(!TEXT)return;
  let tutorial={};try{tutorial=JSON.parse(localStorage.getItem("trpg39_home_tutorial_v1")||"{}")||{}}catch{}
  if(tutorial.mode==="tutorial"&&(!tutorial.completed||tutorial.review))return;
  const script=document.currentScript,root=script?new URL("../../",script.src):new URL("./",location.href),path=location.pathname.toLowerCase();
  const pageKey=/\/scenario\//.test(path)?"scenario":/\/calendar\//.test(path)?"calendar":/\/library\//.test(path)?"library":/\/pcs\//.test(path)?"pc":/\/players\//.test(path)?"players":/\/share\//.test(path)?"share":/\/tools\//.test(path)?"tools":"";
  const launcher=document.createElement("button");launcher.type="button";launcher.className="sakumeru-guide-launcher";launcher.textContent="案内人を呼ぶ";launcher.setAttribute("aria-expanded","false");document.body.appendChild(launcher);
  const host=document.createElement("aside");host.className="sakumeru-tour";host.setAttribute("aria-label","SAKU+MERU案内人");host.hidden=true;document.body.appendChild(host);
  const art=()=>`<figure class="sakumeru-tour-figure"><img src="${new URL('assets/img/home-guide-shirato-mini.png',root).href}" alt="案内役・白十字"><figcaption>白十字</figcaption></figure>`;
  function close(){host.hidden=true;host.innerHTML="";launcher.setAttribute("aria-expanded","false");launcher.focus()}
  function show(message,actions){host.innerHTML=`<div class="sakumeru-tour-inner">${art()}<div class="sakumeru-tour-box"><div class="sakumeru-tour-head"><span class="sakumeru-tour-name">SAKU+MERU 案内人</span><button type="button" data-guide-close>閉じる</button></div><div class="sakumeru-tour-bubble">${message}</div><div class="sakumeru-tour-actions sakumeru-guide-menu">${actions}</div></div></div>`;host.hidden=false;launcher.setAttribute("aria-expanded","true");host.querySelector("img").onerror=()=>{host.classList.add("no-art");host.querySelector("figure").hidden=true};host.querySelector("[data-guide-close]").onclick=close}
  const help=anchor=>new URL(`help/index.html${anchor||""}`,root).href;
  const scenarioMessages={
    register:"画面上部の『＋ 追加』を押してください。タイトルやURLなど必要な項目を入力し、最後に『保存』を押します。",
    thumbnail:"登録欄の配布・販売ページへURLを入力し、『URLから情報取得』を押してください。取得した画像は候補へ追加され、既存入力は勝手に上書きされません。",
    description:"登録欄の『シナリオ概要』へ、公開して安全な説明文を入力してください。入力後は『保存』を押します。",
    edit:"一覧で対象シナリオを開き、詳細画面の『編集』を押してください。修正後に登録欄の『保存』を押します。",
    prep:"一覧で対象シナリオを開き、詳細画面の『卓準備へ』または『KP用バインダー』を押してください。"
  };
  function scenarioMenu(){show("SCENARIOで、どの操作をご案内しましょうか？",'<button data-guide-scenario="register">シナリオを登録したい</button><button data-guide-scenario="thumbnail">サムネイルを取得したい</button><button data-guide-scenario="description">説明文・文章を保存したい</button><button data-guide-scenario="edit">登録したシナリオを編集したい</button><button data-guide-scenario="prep">卓準備へ進みたい</button><a href="'+help('#scenario')+'">詳しい使い方を見る</a>');host.querySelectorAll("[data-guide-scenario]").forEach(button=>button.onclick=()=>scenarioDetail(button.dataset.guideScenario))}
  function scenarioDetail(kind){show(scenarioMessages[kind],'<button type="button" data-guide-back>ほかの操作を見る</button><a href="'+help(kind==="prep"?'#prep':'#scenario')+'">詳しい使い方を見る</a>');host.querySelector("[data-guide-back]").onclick=scenarioMenu;const target=kind==="register"?document.getElementById("openForm"):kind==="thumbnail"?document.getElementById("url"):kind==="description"?document.getElementById("summaryText"):null;target?.focus()}
  launcher.onclick=()=>{if(pageKey==="scenario")scenarioMenu();else show(TEXT.tutorial[pageKey]||TEXT.normal,'<a href="'+help('')+'">詳しい使い方を見る</a>')};
})();
