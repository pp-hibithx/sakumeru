(()=>{
"use strict";

const ALLOWED_TAGS=new Set("A B BLOCKQUOTE BR CODE DEL DETAILS DIV EM FIGCAPTION FIGURE H2 H3 HR I IMG LI MARK OL P S SECTION SMALL SPAN STRONG SUMMARY U UL".split(" "));
const DROP_TAGS=new Set(["SCRIPT","STYLE","IFRAME","OBJECT","EMBED","FORM","INPUT","BUTTON","SELECT","TEXTAREA","META","LINK"]);
const ALLOWED_ATTRS=new Set(["class","href","target","rel","src","alt","title","style","open","data-kind","data-block-id"]);
const SAFE_CLASSES=/^(sm-rich-|sm-special|kp-special|kp-special-(?:head|title|body)|kind-chip|image-grid|cols-[1-4]|kp-marker)(?:\s|$)/;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto.randomUUID?.()||`sm-rich-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function textToHtml(text){
 const lines=String(text||"").replace(/\r/g,"").split("\n");
 return (lines.length?lines:[""]).map(line=>`<p>${line?esc(line):"<br>"}</p>`).join("");
}
function plainText(html){const d=document.createElement("div");d.innerHTML=String(html||"");return (d.innerText||d.textContent||"").replace(/\u200B/g,"").trim()}
function safeUrl(value,{image=false}={}){
 const v=String(value||"").trim();
 if(!v)return "";
 if(image&&/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(v))return v;
 try{const u=new URL(v,location.href);return ["http:","https:"].includes(u.protocol)?u.href:""}catch{return ""}
}
function sanitizeHtml(html){
 const template=document.createElement("template");template.innerHTML=String(html||"");
 const walk=node=>{
  [...node.childNodes].forEach(child=>{
   if(child.nodeType===8){child.remove();return}
   if(child.nodeType!==1)return;
   const tag=child.tagName;
   if(DROP_TAGS.has(tag)){child.remove();return}
   if(!ALLOWED_TAGS.has(tag)){walk(child);child.replaceWith(...child.childNodes);return}
   [...child.attributes].forEach(a=>{
    const n=a.name.toLowerCase();
    if(n.startsWith("on")||!ALLOWED_ATTRS.has(n)){child.removeAttribute(a.name);return}
    if(n==="class"&&!SAFE_CLASSES.test(a.value)){child.removeAttribute("class");return}
    if(n==="style"){
     const safe=a.value.split(";").map(x=>x.trim()).filter(x=>/^(?:text-align\s*:\s*(?:left|center|right)|color\s*:\s*(?:#[0-9a-f]{3,8}|rgb\([^)]*\))|background-color\s*:\s*(?:transparent|#[0-9a-f]{3,8}|rgb\([^)]*\)))$/i.test(x)).join(";");
     if(safe)child.setAttribute("style",safe);else child.removeAttribute("style");
    }
   });
   if(tag==="A"){
    const href=safeUrl(child.getAttribute("href"));if(href){child.href=href;child.target="_blank";child.rel="noopener noreferrer"}else child.removeAttribute("href");
   }
   if(tag==="IMG"){
    const src=safeUrl(child.getAttribute("src"),{image:true});if(src)child.src=src;else{child.remove();return}
   }
   walk(child);
  });
 };
 walk(template.content);return template.innerHTML;
}
function cleanupEditorHtml(editor,extraCleanup){
 const clone=editor.cloneNode(true);
 clone.removeAttribute("contenteditable");
 clone.querySelectorAll(".sm-rich-ui,.sm-outline-ui,.sm-drag-handle,.img-remove,.grid-help,.kp-special-move").forEach(x=>x.remove());
 clone.querySelectorAll(".sm-rich-selected,.sm-outline-collapsed,.sm-outline-heading,.sm-block,.sm-block-dragging,.sm-drop-before,.sm-drop-after,.kp-state-open,.kp-state-fail").forEach(x=>{
  x.classList.remove("sm-rich-selected","sm-outline-collapsed","sm-outline-heading","sm-block","sm-block-dragging","sm-drop-before","sm-drop-after","kp-state-open","kp-state-fail");if(!x.className)x.removeAttribute("class");
 });
 extraCleanup?.(clone);
 return clone.innerHTML||"<p><br></p>";
}
function normalizeExistingEditor(editor){
 [...editor.childNodes].forEach(n=>{if(n.nodeType===3&&n.textContent.trim()){const p=document.createElement("p");p.textContent=n.textContent;editor.replaceChild(p,n)}});
 if(!editor.children.length)editor.innerHTML="<p><br></p>";
 return editor;
}
function execCommand(editor,command,showUI=false,value=null){
 editor?.focus?.();
 return document.execCommand(command,showUI,value);
}
function specialHtml(kind){
 const labels={note:"メモ",rp:"RP",secret:"秘匿",dialogue:"会話ログ"};
 if(kind==="toggle")return `<details class="sm-special sm-rich-toggle" open><summary>トグル見出し</summary><div class="sm-rich-toggle-body"><p><br></p></div></details><p><br></p>`;
 const label=labels[kind]||"特殊ブロック";
 return `<section class="sm-special kp-special" data-kind="${esc(kind)}" data-block-id="${esc(uid())}"><div class="kp-special-head" contenteditable="false"><span class="kind-chip">${esc(label)}</span></div><div class="kp-special-title">${esc(label)}</div><div class="kp-special-body"><p><br></p></div></section><p><br></p>`;
}
function toolbarHtml(){return `<div class="sm-rich-toolbar sm-rich-ui" contenteditable="false">
 <div class="sm-rich-group"><button type="button" data-rich-undo title="元に戻す">↶</button><button type="button" data-rich-redo title="やり直す">↷</button></div>
 <div class="sm-rich-group"><select data-rich-format aria-label="段落形式"><option value="p">本文</option><option value="h2">大見出し</option><option value="h3">小見出し</option><option value="blockquote">引用</option></select><button type="button" data-rich-cmd="bold"><b>B</b></button><button type="button" data-rich-cmd="italic"><i>I</i></button><button type="button" data-rich-cmd="underline"><u>U</u></button><button type="button" data-rich-cmd="strikeThrough"><s>S</s></button></div>
 <div class="sm-rich-group"><button type="button" data-rich-cmd="justifyLeft">左</button><button type="button" data-rich-cmd="justifyCenter">中</button><button type="button" data-rich-cmd="justifyRight">右</button><button type="button" data-rich-cmd="insertUnorderedList">• 箇条書き</button><button type="button" data-rich-cmd="insertOrderedList">1. 番号</button><button type="button" data-rich-link>🔗</button><button type="button" data-rich-hr>―</button></div>
 <div class="sm-rich-group"><button type="button" data-rich-special="note">＋ メモ</button><button type="button" data-rich-special="rp">＋ RP</button><button type="button" data-rich-special="secret">＋ 秘匿</button><button type="button" data-rich-special="dialogue">💬 会話</button><button type="button" data-rich-special="toggle">▸ トグル</button></div>
 </div>`}
function create(options={}){
 const mount=options.mount;if(!mount)throw new Error("RichEditor mount is required");
 mount.classList.add("sm-rich-shell");mount.innerHTML=toolbarHtml()+`<article class="sm-rich-editor blog-editor" contenteditable="true" role="textbox" aria-multiline="true"></article>`;
 const editor=mount.querySelector(".sm-rich-editor"),toolbar=mount.querySelector(".sm-rich-toolbar");
 editor.innerHTML=String(options.html||"").trim()||textToHtml(options.text||"");normalizeExistingEditor(editor);
 let range=null,history=[cleanupEditorHtml(editor)],index=0,timer=0,destroyed=false;
 const saveRange=()=>{const s=getSelection();if(s?.rangeCount&&editor.contains(s.getRangeAt(0).commonAncestorContainer))range=s.getRangeAt(0).cloneRange()};
 const restoreRange=()=>{editor.focus();const s=getSelection();s.removeAllRanges();if(range)s.addRange(range);else{const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);s.addRange(r)}};
 const value=()=>cleanupEditorHtml(editor,options.cleanup);
 const updateButtons=()=>{toolbar.querySelector("[data-rich-undo]").disabled=index<=0;toolbar.querySelector("[data-rich-redo]").disabled=index>=history.length-1};
 const notify=({record=true}={})=>{normalizeExistingEditor(editor);const html=value();if(record&&html!==history[index]){history=history.slice(0,index+1);history.push(html);if(history.length>31)history.shift();index=history.length-1}updateButtons();options.onChange?.({html,text:plainText(html)})};
 const exec=(cmd,arg=null)=>{restoreRange();document.execCommand(cmd,false,arg);saveRange();notify()};
 toolbar.addEventListener("mousedown",saveRange);
 toolbar.querySelectorAll("[data-rich-cmd]").forEach(b=>b.onclick=()=>exec(b.dataset.richCmd));
 toolbar.querySelector("[data-rich-format]").onchange=e=>exec("formatBlock",e.target.value);
 toolbar.querySelector("[data-rich-link]").onclick=()=>{const u=prompt("リンク先URL");if(u)exec("createLink",u)};
 toolbar.querySelector("[data-rich-hr]").onclick=()=>{restoreRange();document.execCommand("insertHTML",false,"<hr><p><br></p>");notify()};
 toolbar.querySelectorAll("[data-rich-special]").forEach(b=>b.onclick=()=>{restoreRange();document.execCommand("insertHTML",false,specialHtml(b.dataset.richSpecial));notify()});
 toolbar.querySelector("[data-rich-undo]").onclick=()=>{if(index<=0)return;index--;editor.innerHTML=history[index];normalizeExistingEditor(editor);range=null;updateButtons();options.onChange?.({html:value(),text:plainText(value())})};
 toolbar.querySelector("[data-rich-redo]").onclick=()=>{if(index>=history.length-1)return;index++;editor.innerHTML=history[index];normalizeExistingEditor(editor);range=null;updateButtons();options.onChange?.({html:value(),text:plainText(value())})};
 editor.addEventListener("keyup",saveRange);editor.addEventListener("mouseup",saveRange);editor.addEventListener("blur",saveRange);
 editor.addEventListener("input",()=>{saveRange();clearTimeout(timer);timer=setTimeout(()=>notify(),250)});
 editor.addEventListener("keydown",e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey)return;const k=e.key.toLowerCase();if(k==="z"||k==="y"){e.preventDefault();toolbar.querySelector(k==="y"||e.shiftKey?"[data-rich-redo]":"[data-rich-undo]").click()}});
 updateButtons();
 return {editor,getHtml:value,getText:()=>plainText(value()),setHtml(html){editor.innerHTML=html||"<p><br></p>";normalizeExistingEditor(editor);history=[value()];index=0;range=null;updateButtons()},focus(){editor.focus()},destroy(){destroyed=true;clearTimeout(timer);mount.innerHTML=""},get destroyed(){return destroyed}};
}

window.SAKUMERichEditor={create,textToHtml,plainText,sanitizeHtml,cleanupEditorHtml,normalizeExistingEditor,execCommand};
})();
