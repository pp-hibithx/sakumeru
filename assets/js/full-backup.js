(()=>{
"use strict";

const BACKUP_KIND="SAKUMERU_FULL_BACKUP";
const BACKUP_VERSION=2;
const DB_ALLOWLIST=[
  "sakumeru_kp_binder_v1",
  "saku_meru_article_media_v1",
  "saku_meru_guest_pc_images_db_v1",
  "saku_meru_media_v1",
  "sakumeru_display_maker"
];
const KP_DB="sakumeru_kp_binder_v1";
function kpBackupRecords(dbs){
 const db=dbs.find(x=>x.name===KP_DB);
 if(!db)return null;
 const store=name=>db.stores.find(x=>x.name===name);
 if(!store("binders")||!store("snapshots")||!store("meta"))throw new Error("KP BINDER IndexedDBの保存構造が不完全です。");
 const binders=store("binders").records.map(x=>decodeValue(x.value));
 const snapshots=store("snapshots").records.map(x=>decodeValue(x.value));
 const active=store("meta").records.map(x=>decodeValue(x.value)).some(x=>x.key==="active"&&x.value===true);
 for(const row of binders){
  if(!row||!row.scenarioId||!row.binder||!Array.isArray(row.binder.pages))throw new Error("KP BINDER本文をバックアップで確認できません。");
  if(row.binder.pages.some(page=>!page||typeof page!=="object"))throw new Error("KP BINDERページがバックアップにありません。");
  if(row.binder.currentShareSession!==undefined&&typeof row.binder.currentShareSession!=="object")throw new Error("KP BINDER共有セッションが不正です。");
  if(row.binder.shareSessions!==undefined&&!Array.isArray(row.binder.shareSessions))throw new Error("KP BINDER共有履歴が不正です。");
 }
 for(const row of snapshots)if(!row||!row.scenarioId||!Array.isArray(row.rows)||row.rows.some(x=>!x?.binder))throw new Error("KP BINDER snapshotが不正です。");
 return {active,binders,snapshots};
}
const EXCLUDED_KEYS=new Set([
  "sakumeru_beta_access_v1",
  "39x2_cloud_sync_id_v1",
  "39x2_cloud_auto_sync_v1",
  "39x2_cloud_last_sync_at_v1",
  "39x2_cloud_reloaded"
]);

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function isSakumeruKey(key){
  if(!key||EXCLUDED_KEYS.has(key))return false;
  return /^(?:39x2_|trpg39(?:[._]|$)|saku_meru_|sakumeru_)/i.test(key);
}
function collectLocalStorage(){
  const out={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(isSakumeruKey(key))out[key]=localStorage.getItem(key);
  }
  return out;
}
function clearSakumeruLocalStorage(){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(isSakumeruKey(key)&&key!=="39x2_scenario_kp_binders_v1"&&key!=="39x2_kp_binder_snapshots_v2")keys.push(key);
  }
  keys.forEach(k=>localStorage.removeItem(k));
}
function safeArrayCount(key){
  try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v.length:0}catch{return 0}
}
function safeObjectCount(key){
  try{const v=JSON.parse(localStorage.getItem(key)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?Object.keys(v).length:0}catch{return 0}
}
function coreCounts(){
  return {
    scenarios:safeArrayCount("39x2_scenarios_v3"),
    events:safeArrayCount("39x2_events_v1"),
    library:safeArrayCount("39x2_album_v2"),
    pcs:Math.max(safeArrayCount("trpg39_pcs"),safeArrayCount("trpg39_pcs_v3")),
    players:Math.max(safeArrayCount("trpg39_players"),safeArrayCount("39x2_players_v1")),
    kpBinders:safeObjectCount("39x2_scenario_kp_binders_v1")
  };
}

function reqPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("IndexedDB error"));});}
function txPromise(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error("IndexedDB transaction error"));tx.onabort=()=>reject(tx.error||new Error("IndexedDB transaction aborted"));});}
function openDb(name){return reqPromise(indexedDB.open(name));}

function bytesToBase64(bytes){
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}
function base64ToBytes(s){
  const binary=atob(s);const out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}
async function encodeValue(value,seen=new WeakSet()){
  if(value===null||value===undefined||typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;
  if(value instanceof Date)return {__sakumeruType:"Date",value:value.toISOString()};
  if(value instanceof Blob){
    const bytes=new Uint8Array(await value.arrayBuffer());
    return {__sakumeruType:"Blob",type:value.type||"",name:value instanceof File?value.name:"",lastModified:value instanceof File?value.lastModified:0,data:bytesToBase64(bytes)};
  }
  if(value instanceof ArrayBuffer)return {__sakumeruType:"ArrayBuffer",data:bytesToBase64(new Uint8Array(value))};
  if(ArrayBuffer.isView(value))return {__sakumeruType:"TypedArray",ctor:value.constructor?.name||"Uint8Array",data:bytesToBase64(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))};
  if(typeof value==="object"){
    if(seen.has(value))throw new Error("循環参照を含むIndexedDBデータはバックアップできません。");
    seen.add(value);
    if(Array.isArray(value)){
      const out=[];for(const x of value)out.push(await encodeValue(x,seen));seen.delete(value);return out;
    }
    const out={};for(const [k,v] of Object.entries(value))out[k]=await encodeValue(v,seen);seen.delete(value);return out;
  }
  return String(value);
}
function decodeValue(value){
  if(value===null||value===undefined||typeof value!=="object")return value;
  if(Array.isArray(value))return value.map(decodeValue);
  if(value.__sakumeruType==="Date")return new Date(value.value);
  if(value.__sakumeruType==="Blob"){
    const bytes=base64ToBytes(value.data||"");
    if(value.name)return new File([bytes],value.name,{type:value.type||"",lastModified:Number(value.lastModified||0)});
    return new Blob([bytes],{type:value.type||""});
  }
  if(value.__sakumeruType==="ArrayBuffer")return base64ToBytes(value.data||"").buffer;
  if(value.__sakumeruType==="TypedArray"){
    const bytes=base64ToBytes(value.data||"");
    const C=globalThis[value.ctor]||Uint8Array;
    try{return new C(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}catch{return bytes;}
  }
  const out={};for(const [k,v] of Object.entries(value))out[k]=decodeValue(v);return out;
}

async function snapshotStore(db,storeName,onProgress){
  const tx=db.transaction(storeName,"readonly");
  const done=txPromise(tx);
  const store=tx.objectStore(storeName);
  const meta={
    name:storeName,
    keyPath:store.keyPath??null,
    autoIncrement:!!store.autoIncrement,
    indexes:[]
  };
  for(const name of Array.from(store.indexNames)){
    const idx=store.index(name);
    meta.indexes.push({name,keyPath:idx.keyPath,unique:!!idx.unique,multiEntry:!!idx.multiEntry});
  }
  // IndexedDB transactions may auto-close while awaiting Blob/File encoding.
  // Read keys and values completely while the transaction is active, then
  // perform the asynchronous encoding after the transaction has finished.
  const [keys,values]=await Promise.all([
    reqPromise(store.getAllKeys()),
    reqPromise(store.getAll())
  ]);
  await done;
  const records=[];
  for(let i=0;i<values.length;i++){
    records.push({key:await encodeValue(keys[i]),value:await encodeValue(values[i])});
    if(onProgress)onProgress();
  }
  meta.records=records;
  return meta;
}
async function snapshotDb(name,onProgress){
  let db;
  try{db=await openDb(name)}catch{return null}
  try{
    if(!db.objectStoreNames.length){db.close();return null}
    const snap={name,version:db.version,stores:[]};
    for(const storeName of Array.from(db.objectStoreNames))snap.stores.push(await snapshotStore(db,storeName,onProgress));
    return snap;
  }finally{try{db.close()}catch{}}
}
async function snapshotAllDbs(onProgress){
  const out=[];
  for(const name of DB_ALLOWLIST){const snap=await snapshotDb(name,onProgress);if(snap)out.push(snap)}
  return out;
}
async function countAllDbs(){
  let total=0;const perDb={};
  for(const name of DB_ALLOWLIST){
    let db;try{db=await openDb(name)}catch{continue}
    try{
      let n=0;
      for(const s of Array.from(db.objectStoreNames)){
        const tx=db.transaction(s,"readonly");
        try{n+=await reqPromise(tx.objectStore(s).count())}catch{}
      }
      if(n||db.objectStoreNames.length)perDb[name]=n;
      total+=n;
    }finally{db.close()}
  }
  return {total,perDb};
}

function deleteDb(name){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.deleteDatabase(name);
    req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error||new Error("DB delete failed"));req.onblocked=()=>reject(new Error(`${name} が他のタブで使用中です。SAKU+MERUの他のタブを閉じてから再試行してください。`));
  });
}
async function restoreDb(snap){
  await deleteDb(snap.name).catch(async e=>{throw e});
  const req=indexedDB.open(snap.name,Math.max(1,Number(snap.version||1)));
  req.onupgradeneeded=()=>{
    const db=req.result;
    for(const s of snap.stores||[]){
      let store;
      const opts={autoIncrement:!!s.autoIncrement};
      if(s.keyPath!==null&&s.keyPath!==undefined)opts.keyPath=s.keyPath;
      store=db.createObjectStore(s.name,opts);
      for(const idx of s.indexes||[]){try{store.createIndex(idx.name,idx.keyPath,{unique:!!idx.unique,multiEntry:!!idx.multiEntry})}catch{}}
    }
  };
  const db=await reqPromise(req);
  try{
    for(const s of snap.stores||[]){
      const tx=db.transaction(s.name,"readwrite");const store=tx.objectStore(s.name);
      for(const rec of s.records||[]){
        const value=decodeValue(rec.value);const key=decodeValue(rec.key);
        if(store.keyPath===null)store.put(value,key);else store.put(value);
      }
      await txPromise(tx);
    }
  }finally{db.close()}
}
async function restoreKpDb(snap){
 kpBackupRecords([snap]);
 const req=indexedDB.open(KP_DB,1);
 req.onupgradeneeded=()=>{
  const db=req.result;
  for(const name of ["binders","snapshots","meta"])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:name==="meta"?"key":"scenarioId"});
 };
 const db=await reqPromise(req);
 try{
  const names=["binders","snapshots","meta"];
  const tx=db.transaction(names,"readwrite"),done=txPromise(tx);
  for(const name of names){
   const store=tx.objectStore(name),source=snap.stores.find(x=>x.name===name);
   store.clear();
   for(const rec of source.records||[])store.put(decodeValue(rec.value));
  }
  await done;
 }finally{db.close()}
 const check=kpBackupRecords([await snapshotDb(KP_DB)]),expected=kpBackupRecords([snap]);
 if(JSON.stringify(check)!==JSON.stringify(expected))throw new Error("復元後のKP BINDER内容がバックアップと一致しません。再読み込みせずに確認してください。");
}

async function gzipBytes(text){
  const bytes=new TextEncoder().encode(text);
  if(typeof CompressionStream!=="function")return bytes;
  const cs=new CompressionStream("gzip");
  const writer=cs.writable.getWriter();writer.write(bytes);writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function decodeBackupBytes(buf){
  let bytes=new Uint8Array(buf);
  if(bytes[0]===0x1f&&bytes[1]===0x8b){
    if(typeof DecompressionStream!=="function")throw new Error("このブラウザは圧縮バックアップの復元に対応していません。最新のChrome等をお使いください。");
    const ds=new DecompressionStream("gzip");
    const writer=ds.writable.getWriter();writer.write(bytes);writer.close();
    bytes=new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  return new TextDecoder("utf-8").decode(bytes);
}
function filename(){
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  return `SAKUMERU_backup_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.sakumeru`;
}
function downloadBytes(bytes,name){
  const blob=new Blob([bytes],{type:"application/octet-stream"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function fmtBytes(n){
  if(!Number.isFinite(n))return "-";const u=["B","KB","MB","GB"];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++}return `${v.toFixed(i?1:0)} ${u[i]}`;
}
function status(msg,type=""){
  const el=$("fullBackupStatus");if(!el)return;el.textContent=msg;el.dataset.type=type;
}
async function renderSummary(){
  const c=coreCounts(),local=collectLocalStorage();
  let idb={total:0,perDb:{}};try{idb=await countAllDbs()}catch{}
  try{const db=await openDb(KP_DB);try{if(db.objectStoreNames.contains("meta")&&db.objectStoreNames.contains("binders")){const active=await reqPromise(db.transaction("meta","readonly").objectStore("meta").get("active"));if(active?.value===true)c.kpBinders=await reqPromise(db.transaction("binders","readonly").objectStore("binders").count())}}finally{db.close()}}catch{}
  let est={};try{est=await navigator.storage?.estimate?.()||{}}catch{}
  const el=$("backupSummary");if(!el)return;
  el.innerHTML=`<div class="backup-stat"><b>${c.scenarios}</b><span>SCENARIO</span></div><div class="backup-stat"><b>${c.events}</b><span>CALENDAR</span></div><div class="backup-stat"><b>${c.library}</b><span>LIBRARY</span></div><div class="backup-stat"><b>${c.pcs}</b><span>PC</span></div><div class="backup-stat"><b>${c.players}</b><span>PLAYERS</span></div><div class="backup-stat"><b>${c.kpBinders}</b><span>KPバインダー</span></div><div class="backup-stat"><b>${idb.total}</b><span>端末画像・音声等</span></div><div class="backup-stat"><b>${Object.keys(local).length}</b><span>保存キー</span></div>${est.usage?`<div class="backup-stat"><b>${fmtBytes(est.usage)}</b><span>このサイトの使用量</span></div>`:""}`;
}

async function exportFullBackup(){
  const btn=$("exportFull");if(btn)btn.disabled=true;
  try{
    status("バックアップを作成しています。画像・音声が多い場合は少し時間がかかります…");
    let processed=0;
    const dbs=await snapshotAllDbs(()=>{processed++;if(processed%10===0)status(`端末画像・音声等を回収中… ${processed}件`)});
    const kp=kpBackupRecords(dbs);
    if(kp?.active){
      const live=kpBackupRecords([await snapshotDb(KP_DB)]);
      if(!live?.active||JSON.stringify(kp)!==JSON.stringify(live))throw new Error("KP BINDERのバックアップ内容が保存中に変化しました。再実行してください。");
    }else if(safeObjectCount("39x2_scenario_kp_binders_v1") && !collectLocalStorage()["39x2_scenario_kp_binders_v1"]){
      throw new Error("KP BINDERの旧データをバックアップに含められませんでした。");
    }
    const payload={
      kind:BACKUP_KIND,
      formatVersion:BACKUP_VERSION,
      app:"SAKU+MERU",
      exportedAt:new Date().toISOString(),
      source:{origin:location.origin,path:location.pathname},
      exclusions:[...EXCLUDED_KEYS],
      counts:{...coreCounts(),kpBinders:kp?.active?kp.binders.length:coreCounts().kpBinders,kpSnapshots:kp?.active?kp.snapshots.reduce((n,x)=>n+x.rows.length,0):undefined},
      localStorage:collectLocalStorage(),
      indexedDB:dbs
    };
    status("バックアップファイルを圧縮しています…");
    const bytes=await gzipBytes(JSON.stringify(payload));
    downloadBytes(bytes,filename());
    localStorage.setItem("sakumeru_last_full_backup_at_v1",payload.exportedAt);
    status(`✓ 完全バックアップを書き出しました（${fmtBytes(bytes.byteLength)}）。安全な場所に保管してください。`,`ok`);
    await renderSummary();
  }catch(e){console.error(e);status(`バックアップできませんでした：${e.message||e}`,"error")}
  finally{if(btn)btn.disabled=false}
}
async function importFullBackup(file){
  if(!file)return;
  const btn=$("importFull");if(btn)btn.disabled=true;
  try{
    status("バックアップファイルを確認しています…");
    const text=await decodeBackupBytes(await file.arrayBuffer());
    const payload=JSON.parse(text);
    if(payload?.kind!==BACKUP_KIND||!payload.localStorage||!Array.isArray(payload.indexedDB))throw new Error("SAKU+MERU完全バックアップではありません。");
    const kpSnap=payload.indexedDB.find(db=>db.name===KP_DB),kp=kpBackupRecords(payload.indexedDB);
    if(kpSnap&&Number(payload.counts?.kpBinders??kp?.binders.length)!==kp.binders.length)throw new Error("KP BINDERのバックアップ件数が一致しません。");
    if(!kpSnap&&kpBackupRecords([await snapshotDb(KP_DB)])?.active)throw new Error("この旧形式バックアップには現在のKP BINDER IndexedDBが含まれません。先に最新版の完全バックアップを作成してください。");
    for(const [key,value] of Object.entries(payload.localStorage))if(typeof value!=="string")throw new Error(`保存キー ${key} の内容が不正です。`);
    const when=payload.exportedAt?new Date(payload.exportedAt).toLocaleString("ja-JP"):"日時不明";
    const c=payload.counts||{};
    const summary=`作成：${when}\nSCENARIO：${c.scenarios??"?"}件\nCALENDAR：${c.events??"?"}件\nLIBRARY：${c.library??"?"}件\nPC：${c.pcs??"?"}件\nPLAYERS：${c.players??"?"}件\nKPバインダー：${c.kpBinders??"?"}件\n\n現在のSAKU+MERUブラウザ保存データを、このバックアップ内容で置き換えます。続けますか？`;
    if(!confirm(summary))return;
    status("復元しています。SAKU+MERUの他のタブは閉じたままにしてください…");
    for(const db of payload.indexedDB)if(DB_ALLOWLIST.includes(db.name)&&db.name!==KP_DB)await restoreDb(db);
    const previousKp=kpSnap?await snapshotDb(KP_DB):null;
    try{
      if(kpSnap)await restoreKpDb(kpSnap);
      clearSakumeruLocalStorage();
      for(const [k,v] of Object.entries(payload.localStorage)){
        if(!isSakumeruKey(k))continue;
        // A restored active IndexedDB is authoritative; keep the pre-restore
        // legacy KP values untouched as a recoverable Phase 1 safety copy.
        if(kp?.active&&(k==="39x2_scenario_kp_binders_v1"||k==="39x2_kp_binder_snapshots_v2"))continue;
        localStorage.setItem(k,v);
      }
    }catch(error){
      if(previousKp)try{await restoreKpDb(previousKp)}catch(rollbackError){console.error("KP BINDER rollback failed",rollbackError)}
      throw error;
    }
    localStorage.setItem("sakumeru_last_full_restore_at_v1",new Date().toISOString());
    status("✓ 復元しました。ページを再読み込みします…","ok");
    await sleep(900);location.reload();
  }catch(e){console.error(e);status(`復元できませんでした：${e.message||e}`,"error")}
  finally{if(btn)btn.disabled=false;const f=$("fullBackupFile");if(f)f.value=""}
}

async function init(){
  await renderSummary();
  const last=localStorage.getItem("sakumeru_last_full_backup_at_v1");
  if(last){const el=$("lastBackupAt");if(el)el.textContent=new Date(last).toLocaleString("ja-JP")}
  $("exportFull")?.addEventListener("click",exportFullBackup);
  $("importFull")?.addEventListener("click",()=>$("fullBackupFile")?.click());
  $("fullBackupFile")?.addEventListener("change",e=>importFullBackup(e.target.files?.[0]));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
