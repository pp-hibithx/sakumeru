"use strict";
// KP BINDER Phase 1. The old LocalStorage values are deliberately retained.
(()=>{
 const DB_NAME="sakumeru_kp_binder_v1",VERSION=1;
 const BINDER_KEY="39x2_scenario_kp_binders_v1";
 const SNAPSHOT_KEY="39x2_kp_binder_snapshots_v2";
 const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
 const complete=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("KP BINDER transaction aborted"))});
 const copy=value=>JSON.parse(JSON.stringify(value));
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==="object"
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 let dbPromise=null,readyPromise=null,active=false,queue=Promise.resolve();
 function open(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB_NAME,VERSION);
   req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains("binders"))db.createObjectStore("binders",{keyPath:"scenarioId"});
    if(!db.objectStoreNames.contains("snapshots"))db.createObjectStore("snapshots",{keyPath:"scenarioId"});
    if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"});
   };
   req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();resolve(db)};
   req.onerror=()=>reject(req.error);
   req.onblocked=()=>reject(new Error("KP BINDER DB is blocked by another tab"));
  });
  return dbPromise;
 }
 function legacy(key){
  const raw=localStorage.getItem(key);
  if(raw===null)return {raw:null,value:{}};
  const value=JSON.parse(raw);
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(`Invalid ${key}`);
  return {raw,value};
 }
 async function rows(store){const db=await open();return request(db.transaction(store,"readonly").objectStore(store).getAll())}
 async function getMeta(key){const db=await open();return request(db.transaction("meta","readonly").objectStore("meta").get(key))}
 function enqueue(task){const result=queue.then(task);queue=result.catch(()=>{});return result}
async function migrate(){
  const db=await open();
  // Never overwrite an already-active DB with a stale LocalStorage backup.
  if((await getMeta("active"))?.value===true){active=true;return {active:true,migrated:false}}
  const binders=legacy(BINDER_KEY),snapshots=legacy(SNAPSHOT_KEY);
  const tx=db.transaction(["binders","snapshots","meta"],"readwrite");
  tx.objectStore("binders").clear();tx.objectStore("snapshots").clear();
  for(const [scenarioId,binder] of Object.entries(binders.value))tx.objectStore("binders").put({scenarioId,binder:copy(binder)});
  for(const [scenarioId,snapshotRows] of Object.entries(snapshots.value))tx.objectStore("snapshots").put({scenarioId,rows:copy(snapshotRows)});
  tx.objectStore("meta").put({key:"migration",value:{status:"written",version:VERSION}});
  await complete(tx);
  const [binderRows,snapshotRecords]=await Promise.all([rows("binders"),rows("snapshots")]);
  const checkBinders=Object.fromEntries(binderRows.map(x=>[x.scenarioId,x.binder]));
  const checkSnapshots=Object.fromEntries(snapshotRecords.map(x=>[x.scenarioId,x.rows]));
  if(!equal(checkBinders,binders.value)||!equal(checkSnapshots,snapshots.value) ||
     localStorage.getItem(BINDER_KEY)!==binders.raw||localStorage.getItem(SNAPSHOT_KEY)!==snapshots.raw){
   throw new Error("KP BINDER migration verification failed; LocalStorage remains authoritative");
  }
  const mark=db.transaction("meta","readwrite");
  mark.objectStore("meta").put({key:"active",value:true});
  mark.objectStore("meta").put({key:"migration",value:{status:"verified",version:VERSION,binderCount:binderRows.length,snapshotCount:snapshotRecords.length}});
  await complete(mark);active=true;
  return {active:true,migrated:true,binderCount:binderRows.length,snapshotCount:snapshotRecords.length};
 }
 function ready(){
  if(!readyPromise)readyPromise=migrate().catch(error=>{
   console.error("KP BINDER IndexedDB unavailable; LocalStorage retained",error);
   active=false;return {active:false,error};
  });
  return readyPromise;
 }
 async function loadAll(){
  await ready();
  if(!active)return legacy(BINDER_KEY).value;
  return Object.fromEntries((await rows("binders")).map(x=>[x.scenarioId,x.binder]));
 }
 async function loadSnapshots(){
  await ready();
  if(!active)return legacy(SNAPSHOT_KEY).value;
  return Object.fromEntries((await rows("snapshots")).map(x=>[x.scenarioId,x.rows]));
 }
async function saveBinder(scenarioId,binder){
  const value=copy(binder);await ready();scenarioId=String(scenarioId);
  if(!active){const all=legacy(BINDER_KEY).value;all[scenarioId]=value;localStorage.setItem(BINDER_KEY,JSON.stringify(all));return}
  return enqueue(async()=>{const db=await open(),tx=db.transaction("binders","readwrite");tx.objectStore("binders").put({scenarioId,binder:value});await complete(tx)});
}
async function saveSnapshot(scenarioId,entry){
  const value=copy(entry);await ready();scenarioId=String(scenarioId);
  if(!active){const all=legacy(SNAPSHOT_KEY).value;all[scenarioId]=[value,...(all[scenarioId]||[])].slice(0,3);localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(all));return}
  return enqueue(async()=>{
   const db=await open(),tx=db.transaction("snapshots","readwrite"),store=tx.objectStore("snapshots");
   const old=await request(store.get(scenarioId));
   store.put({scenarioId,rows:[value,...(Array.isArray(old?.rows)?old.rows:[])].slice(0,3)});
   await complete(tx);
  });
 }
 async function flush(){await queue}
 window.KPBinderStorage={DB_NAME,BINDER_KEY,SNAPSHOT_KEY,ready,loadAll,loadSnapshots,saveBinder,saveSnapshot,flush,isActive:()=>active};
})();
