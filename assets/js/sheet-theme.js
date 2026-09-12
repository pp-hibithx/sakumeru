(()=>{
  "use strict";
  const STORAGE_KEY="trpg39_sheet_theme_v1";
  const THEMES=["standard","black","white","ivory","gray","pink","red","orange","yellow","green","blue","purple"];
  const LABELS={standard:"標準",black:"ブラック",white:"ホワイト",ivory:"アイボリー",gray:"グレー",pink:"ピンク",red:"レッド",orange:"オレンジ",yellow:"イエロー",green:"グリーン",blue:"ブルー",purple:"パープル"};
  const normalize=value=>THEMES.includes(String(value||""))?String(value):"standard";
  const globalTheme=()=>{try{return normalize(localStorage.getItem(STORAGE_KEY))}catch{return "standard"}};
  const setGlobalTheme=value=>{const theme=normalize(value);try{localStorage.setItem(STORAGE_KEY,theme)}catch{}applyGlobal(theme);window.dispatchEvent(new CustomEvent("sakumeru:sheet-theme",{detail:{theme}}));return theme};
  const sheetRoots=()=>document.querySelectorAll("main>.wrap:last-child:not(.share-page),main .wrap.directory-page,main .wrap.library-page,.share-manage-page .share-manage-sheet");
  function applyGlobal(value=globalTheme()){
    const theme=normalize(value);
    document.documentElement.dataset.sheetThemeCurrent=theme;
    sheetRoots().forEach(root=>root.dataset.sheetTheme=theme);
    return theme;
  }
  function resolvePcTheme(pc){const own=normalize(pc?.sheetTheme);return own==="standard"?globalTheme():own}
  function applyTo(element,value){if(!element)return globalTheme();const theme=normalize(value);element.dataset.sheetTheme=theme==="standard"?globalTheme():theme;return element.dataset.sheetTheme}
  window.TRPG39SheetTheme={STORAGE_KEY,THEMES,LABELS,normalize,globalTheme,setGlobalTheme,applyGlobal,resolvePcTheme,applyTo};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>applyGlobal(),{once:true});else applyGlobal();
  window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY)applyGlobal()});
})();
