(()=>{
"use strict";

const DEFAULTS={
  rootHeading:"h2",
  childHeading:"h3",
  specialSelector:"section.kp-special",
};

function options(opts){return Object.assign({},DEFAULTS,opts||{})}
function directBlocks(editor){return editor?[...editor.children]:[]}

function levelOf(block,opts){
  opts=options(opts);
  if(!block?.matches)return 0;
  if(block.matches(opts.rootHeading))return 1;
  if(block.matches(opts.childHeading))return 2;
  return 0;
}
function isSpecial(block,opts){
  opts=options(opts);
  return !!block?.matches?.(opts.specialSelector);
}
function isCollapsible(block,opts){
  return levelOf(block,opts)>0 || isSpecial(block,opts);
}
function isCollapsed(block){
  return block?.dataset?.smCollapsed==="1";
}
function setCollapsed(block,value){
  if(!block)return;
  if(value)block.dataset.smCollapsed="1";
  else delete block.dataset.smCollapsed;
  block.classList.toggle("sm-outline-collapsed",!!value);
  block.setAttribute("aria-expanded",value?"false":"true");
}
function toggle(block,editor,opts){
  if(!isCollapsible(block,opts))return false;
  setCollapsed(block,!isCollapsed(block));
  refresh(editor,opts);
  return true;
}
function groupFor(block,editor,opts){
  if(!block||!editor||block.parentElement!==editor)return [];
  const level=levelOf(block,opts);
  if(!level)return [block];
  const result=[block];
  let n=block.nextElementSibling;
  while(n){
    const nl=levelOf(n,opts);
    if(nl && nl<=level)break;
    result.push(n);
    n=n.nextElementSibling;
  }
  return result;
}
function groupEnd(block,editor,opts){
  const g=groupFor(block,editor,opts);
  return g[g.length-1]||block;
}
function moveGroup(editor,block,target,before,opts){
  if(!editor||!block||!target||block===target)return false;
  const src=groupFor(block,editor,opts);
  if(!src.length||src.includes(target))return false;

  let ref=target;
  if(!before){
    const tg=groupFor(target,editor,opts);
    if(tg.some(x=>src.includes(x)))return false;
    const last=tg[tg.length-1]||target;
    ref=last.nextSibling;
  }

  if(ref && src.includes(ref))return false;
  const frag=document.createDocumentFragment();
  src.forEach(n=>frag.appendChild(n));
  editor.insertBefore(frag,ref||null);
  refresh(editor,opts);
  return true;
}
function specialSummary(section){
  if(!section)return "";
  const explicit=(section.querySelector(":scope > .kp-special-title")?.textContent||"").replace(/\u200B/g,"").replace(/\s+/g," ").trim();
  if(explicit && !["開示情報","KPメモ","RP","秘匿","会話ログ"].includes(explicit))return explicit.slice(0,60);
  const heading=section.querySelector(":scope > .kp-special-body h2,:scope > .kp-special-body h3");
  const h=(heading?.textContent||"").replace(/\u200B/g,"").replace(/\s+/g," ").trim();
  if(h)return h.slice(0,60);
  return "";
}
function ensureSpecialSummary(section){
  if(!section)return;
  const head=section.querySelector(":scope > .kp-special-head");
  if(!head)return;
  let el=head.querySelector(":scope > .sm-special-summary");
  if(!el){
    el=document.createElement("span");
    el.className="sm-special-summary sm-outline-ui";
    el.setAttribute("contenteditable","false");
    head.appendChild(el);
  }
  const text=specialSummary(section);
  el.textContent=text?`｜${text}`:"";
}
function refresh(editor,opts){
  if(!editor)return;
  opts=options(opts);
  const blocks=directBlocks(editor);
  const collapsedLevels=[];

  for(const block of blocks){
    block.classList.remove("sm-outline-hidden");
    const lvl=levelOf(block,opts);

    if(lvl){
      while(collapsedLevels.length && collapsedLevels[collapsedLevels.length-1]>=lvl)collapsedLevels.pop();
      const hidden=collapsedLevels.length>0;
      block.classList.toggle("sm-outline-hidden",hidden);
      block.classList.toggle("sm-outline-heading",true);
      block.dataset.smOutlineLevel=String(lvl);
      block.classList.toggle("sm-outline-collapsed",isCollapsed(block));
      if(isCollapsed(block))collapsedLevels.push(lvl);
      continue;
    }

    delete block.dataset.smOutlineLevel;
    block.classList.remove("sm-outline-heading");
    if(collapsedLevels.length)block.classList.add("sm-outline-hidden");

    if(isSpecial(block,opts)){
      ensureSpecialSummary(block);
      block.classList.toggle("sm-outline-collapsed",isCollapsed(block));
    }
  }
}
function isHidden(block){return !!block?.classList?.contains("sm-outline-hidden")}

function cleanupClone(clone){
  if(!clone)return clone;
  clone.querySelectorAll(".sm-outline-ui").forEach(x=>x.remove());
  clone.querySelectorAll(".sm-outline-hidden,.sm-outline-heading,.sm-outline-collapsed").forEach(el=>{
    el.classList.remove("sm-outline-hidden","sm-outline-heading","sm-outline-collapsed");
    if(!el.className)el.removeAttribute("class");
  });
  clone.querySelectorAll("[data-sm-collapsed],[data-sm-outline-level]").forEach(el=>{
    el.removeAttribute("data-sm-collapsed");
    el.removeAttribute("data-sm-outline-level");
    el.removeAttribute("aria-expanded");
  });
  return clone;
}

function ensurePreviewModal(){
  let modal=document.getElementById("smRichPreviewModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="smRichPreviewModal";
  modal.className="sm-rich-preview-modal";
  modal.hidden=true;
  modal.innerHTML=`<div class="sm-rich-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="smRichPreviewTitle">
    <div class="sm-rich-preview-head">
      <div><strong id="smRichPreviewTitle">表示プレビュー</strong><div id="smRichPreviewNote" class="sm-rich-preview-note"></div></div>
      <button type="button" class="sm-rich-preview-close" aria-label="プレビューを閉じる">× 閉じる</button>
    </div>
    <div class="sm-rich-preview-scroll"><article id="smRichPreviewContent" class="sm-rich-preview-content kp-live-body"></article></div>
  </div>`;
  document.body.appendChild(modal);
  const close=()=>{modal.hidden=true;document.body.classList.remove("sm-rich-preview-open")};
  modal.querySelector(".sm-rich-preview-close").onclick=close;
  modal.addEventListener("click",e=>{if(e.target===modal)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close()});
  return modal;
}
function preparePreviewClone(source,opts){
  opts=opts||{};
  let clone;
  if(typeof source==="string"){
    clone=document.createElement("div");clone.innerHTML=source;
  }else if(source?.cloneNode){clone=source.cloneNode(true)}
  else{clone=document.createElement("div")}
  cleanupClone(clone);
  clone.querySelectorAll(".block-handle-layer,.img-remove,.grid-help,.kp-reveal-sharebox,.kp-special-action,.sm-editor-only,[data-editor-only]").forEach(x=>x.remove());
  clone.querySelectorAll("[contenteditable]").forEach(x=>x.removeAttribute("contenteditable"));
  clone.querySelectorAll("[draggable]").forEach(x=>x.removeAttribute("draggable"));
  clone.querySelectorAll("input,textarea,select,button").forEach(x=>{
    if(x.matches("input[type=checkbox],input[type=radio]")){
      const mark=document.createElement("span");
      mark.className="sm-rich-preview-check";
      mark.textContent=x.checked?"☑":"☐";
      x.replaceWith(mark);
    }else x.remove();
  });
  if(typeof opts.transform==="function")opts.transform(clone);
  return clone;
}
function openPreview(config){
  config=config||{};
  const modal=ensurePreviewModal();
  const title=modal.querySelector("#smRichPreviewTitle");
  const note=modal.querySelector("#smRichPreviewNote");
  const content=modal.querySelector("#smRichPreviewContent");
  title.textContent=config.title||"表示プレビュー";
  note.textContent=config.note||"編集内容を読み取り専用で表示しています。プレビューを開くだけでは保存されません。";
  const clone=preparePreviewClone(config.source||config.html||"",config);
  content.innerHTML="";
  while(clone.firstChild)content.appendChild(clone.firstChild);
  modal.hidden=false;document.body.classList.add("sm-rich-preview-open");
  modal.querySelector(".sm-rich-preview-close")?.focus();
  return modal;
}
function closePreview(){const modal=document.getElementById("smRichPreviewModal");if(modal){modal.hidden=true;document.body.classList.remove("sm-rich-preview-open")}}

window.SAKUMERichOutline={
  options,levelOf,isSpecial,isCollapsible,isCollapsed,setCollapsed,toggle,
  groupFor,groupEnd,moveGroup,refresh,isHidden,cleanupClone,specialSummary,
  preview:{open:openPreview,close:closePreview,prepareClone:preparePreviewClone}
};
})();