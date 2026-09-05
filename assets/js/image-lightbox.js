(()=>{
 let dialog=null,image=null;
 function ensure(){
  if(dialog?.isConnected)return dialog;
  dialog=document.createElement("dialog");
  dialog.className="sm-image-lightbox";
  dialog.setAttribute("aria-label","画像の拡大表示");
  dialog.innerHTML='<button class="sm-image-lightbox-close" type="button" aria-label="閉じる">×</button><div class="sm-image-lightbox-panel"><img class="sm-image-lightbox-image" alt=""></div>';
  document.body.appendChild(dialog);
  image=dialog.querySelector(".sm-image-lightbox-image");
  dialog.querySelector(".sm-image-lightbox-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{image.removeAttribute("src");image.alt=""});
  return dialog;
 }
 function sourceFor(trigger){
  const img=trigger.matches("img")?trigger:trigger.querySelector("img");
  return {url:trigger.dataset.smImageExpand||img?.currentSrc||img?.src||"",alt:img?.alt||"拡大画像"};
 }
 function open(url,alt="拡大画像"){
  if(!url)return;
  ensure();image.src=url;image.alt=alt;dialog.showModal();
 }
 document.addEventListener("click",e=>{
  const trigger=e.target.closest?.("[data-sm-image-expand]");
  if(!trigger)return;
  e.preventDefault();e.stopPropagation();
  const source=sourceFor(trigger);open(source.url,source.alt);
 });
 window.SAKUMERUImageViewer={open,close:()=>dialog?.close()};
 if(document.readyState!=="loading")ensure();else document.addEventListener("DOMContentLoaded",ensure,{once:true});
})();
