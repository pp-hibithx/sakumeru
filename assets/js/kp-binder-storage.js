"use strict";
// KP BINDER storage. Phase 2 retires verified legacy LocalStorage copies.
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
 let dbPromise=null,readyPromise=null,active=false,queue=Promise.resolve(),createdNewDb=false,lastRetirement=null;
 function open(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB_NAME,VERSION);
   req.onupgradeneeded=event=>{
    if(event.oldVersion===0)createdNewDb=true;
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
 function storageBytes(){
  const encoder=new TextEncoder();let bytes=0;
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i),value=localStorage.getItem(key)||"";
   bytes+=encoder.encode(key).byteLength+encoder.encode(value).byteLength;
  }
  return bytes;
 }
 function validObject(value){return !!value&&typeof value==="object"&&!Array.isArray(value)}
 async function verifyForRetirement(){
  await queue;
  const db=await open(),required=["binders","snapshots","meta"];
  if(required.some(name=>!db.objectStoreNames.contains(name)))throw new Error("KP BINDER IndexedDB stores are incomplete");
  const [activeMeta,migration,binderRows,snapshotRows]=await Promise.all([
   getMeta("active"),getMeta("migration"),rows("binders"),rows("snapshots")
  ]);
  if(activeMeta?.value!==true||migration?.value?.status!=="verified")throw new Error("KP BINDER migration is not verified");
  if(!Array.isArray(binderRows)||!Array.isArray(snapshotRows))throw new Error("KP BINDER IndexedDB could not be read");
  const scenarioIds=new Set();
  for(const row of binderRows){
   const scenarioId=String(row?.scenarioId||"");
   if(!scenarioId||scenarioIds.has(scenarioId)||!validObject(row?.binder))throw new Error("KP BINDER scenarioId is invalid");
   scenarioIds.add(scenarioId);
   if(!Array.isArray(row.binder.pages))throw new Error(`KP BINDER pages are missing: ${scenarioId}`);
   for(const page of row.binder.pages){
    if(!validObject(page)||typeof page.__v11ArticleHtml!=="string")throw new Error(`KP BINDER article HTML is missing: ${scenarioId}`);
   }
   if(row.binder.currentShareSession!==undefined&&!validObject(row.binder.currentShareSession))throw new Error(`KP BINDER current share session is invalid: ${scenarioId}`);
   if(row.binder.shareSessions!==undefined&&!Array.isArray(row.binder.shareSessions))throw new Error(`KP BINDER share sessions are invalid: ${scenarioId}`);
  }
  const expectedBinders=Number(migration.value.binderCount);
  if(Number.isFinite(expectedBinders)&&expectedBinders>0&&binderRows.length<expectedBinders)throw new Error("KP BINDER count is lower than the verified migration count");
  for(const row of snapshotRows){
   if(!String(row?.scenarioId||"")||!Array.isArray(row?.rows)||row.rows.some(entry=>!validObject(entry?.binder)))throw new Error("KP BINDER snapshots are invalid");
  }
  const legacyBinders=legacy(BINDER_KEY),legacySnapshots=legacy(SNAPSHOT_KEY);
  const legacyBinderIds=Object.keys(legacyBinders.value);
  if(legacyBinderIds.length&&binderRows.length===0)throw new Error("KP BINDER IndexedDB is empty while legacy binders exist");
  for(const scenarioId of legacyBinderIds){
   const current=binderRows.find(row=>String(row.scenarioId)===String(scenarioId))?.binder;
   if(!current)throw new Error(`KP BINDER is missing from IndexedDB: ${scenarioId}`);
   const old=legacyBinders.value[scenarioId];
   if(old?.currentShareSession!==undefined&&current.currentShareSession===undefined)throw new Error(`KP BINDER current share session is missing: ${scenarioId}`);
   if(old?.shareSessions!==undefined&&current.shareSessions===undefined)throw new Error(`KP BINDER share sessions are missing: ${scenarioId}`);
  }
  for(const [scenarioId,oldRows] of Object.entries(legacySnapshots.value)){
   if(Array.isArray(oldRows)&&oldRows.length&&!snapshotRows.some(row=>String(row.scenarioId)===String(scenarioId)&&Array.isArray(row.rows)&&row.rows.length))throw new Error(`KP BINDER snapshots are missing: ${scenarioId}`);
  }
  return {binderCount:binderRows.length,scenarioIds:[...scenarioIds],pageCount:binderRows.reduce((n,row)=>n+row.binder.pages.length,0),snapshotCount:snapshotRows.reduce((n,row)=>n+row.rows.length,0)};
 }
 async function retireLegacyCopies(){
  if(!active)throw new Error("KP BINDER IndexedDB is not authoritative");
  const verified=await verifyForRetirement(),beforeBytes=storageBytes();
  const binderRaw=localStorage.getItem(BINDER_KEY),snapshotRaw=localStorage.getItem(SNAPSHOT_KEY);
  if(binderRaw===null&&snapshotRaw===null){
   const prior=await getMeta("retirement");
   lastRetirement=prior?.value||{status:"already-retired",beforeBytes,afterBytes:beforeBytes,releasedBytes:0,...verified};
   return lastRetirement;
  }
  try{
   localStorage.removeItem(BINDER_KEY);localStorage.removeItem(SNAPSHOT_KEY);
   if(localStorage.getItem(BINDER_KEY)!==null||localStorage.getItem(SNAPSHOT_KEY)!==null)throw new Error("KP BINDER legacy keys remain after retirement");
   // Read again after removal. Missing LocalStorage must never trigger migration.
   await verifyForRetirement();
  }catch(error){
   try{if(binderRaw!==null)localStorage.setItem(BINDER_KEY,binderRaw);if(snapshotRaw!==null)localStorage.setItem(SNAPSHOT_KEY,snapshotRaw)}catch(rollbackError){console.error("KP BINDER legacy rollback failed",rollbackError)}
   throw error;
  }
  const afterBytes=storageBytes();
  lastRetirement={status:"complete",retiredAt:new Date().toISOString(),beforeBytes,afterBytes,releasedBytes:Math.max(0,beforeBytes-afterBytes),...verified};
  try{
   const db=await open(),tx=db.transaction("meta","readwrite");
   tx.objectStore("meta").put({key:"retirement",value:lastRetirement});await complete(tx);
  }catch(error){console.warn("KP BINDER retirement report could not be recorded",error)}
  console.info("KP BINDER Phase 2 legacy LocalStorage retired",lastRetirement);
  return lastRetirement;
 }
async function migrate(){
  const db=await open();
  // Never overwrite an already-active DB with a stale LocalStorage backup.
  if((await getMeta("active"))?.value===true){active=true;return {active:true,migrated:false}}
  const binders=legacy(BINDER_KEY),snapshots=legacy(SNAPSHOT_KEY);
  if(!createdNewDb&&binders.raw===null&&snapshots.raw===null)throw new Error("KP BINDER legacy data is absent; refusing an empty migration over an existing database");
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
  if(!readyPromise)readyPromise=migrate().then(async result=>{
   if(result.active)result.retirement=await retireLegacyCopies();
   return result;
  }).catch(error=>{
   console.error("KP BINDER IndexedDB unavailable; legacy LocalStorage was not retired",error);
   active=false;
   if(localStorage.getItem(BINDER_KEY)!==null||localStorage.getItem(SNAPSHOT_KEY)!==null)return {active:false,error};
   throw error;
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
 window.KPBinderStorage={DB_NAME,BINDER_KEY,SNAPSHOT_KEY,ready,loadAll,loadSnapshots,saveBinder,saveSnapshot,flush,verifyForRetirement,retireLegacyCopies,isActive:()=>active,getLastRetirement:()=>lastRetirement};
})();
