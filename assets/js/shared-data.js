(() => {
  "use strict";

  const KEYS = {
    scenarios: "39x2_scenarios_v3",
    events: "39x2_events_v1",
    album: "39x2_album_v2"
  };

  const uuid = () => {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,10);
  };

  const load = key => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const nowISO = () => new Date().toISOString();

  function normalizeEvent(input = {}) {
    const id = input.id || uuid();
    const legacyStatus = input.status === "confirmed" ? "planned" : input.status;
    return {
      schemaVersion: 2,
      id,
      type: input.type || "trpg",
      source: input.source || "39x2",
      title: input.title || "",
      scenarioId: input.scenarioId || "",
      scenarioTitle: input.scenarioTitle || input.title || "",
      start: input.start || "",
      end: input.end || "",
      status: legacyStatus || "planned",
      role: input.role || "",
      ...normalizeParticipantFields(input),
      ...normalizeSelfPCFields(input),
      system: input.system || "",
      facilitatorLabel: input.facilitatorLabel || "",
      facilitatorless: !!input.facilitatorless,
      visibility: input.visibility || "private",
      linkedAlbumId: input.linkedAlbumId || "",
      runId: input.runId || "",
      runLabel: input.runLabel || "",
      sessionDay: Number(input.sessionDay || 0),
      sessionKind: ["prelude","main","reserve","aftertalk"].includes(input.sessionKind) ? input.sessionKind : "main",
      calendarMemo: input.calendarMemo || "",
      calendarColor: input.calendarColor || "",
      timeBand: input.timeBand || "",
      timeSpecified: input.timeSpecified !== undefined ? !!input.timeSpecified : /T\d{2}:\d{2}/.test(String(input.start || "")),
      createdAt: input.createdAt || nowISO(),
      updatedAt: nowISO()
    };
  }

  function normalizeAlbum(input = {}) {
    const legacyStatus = input.status === "confirmed" ? "planned" : input.status;
    const start = input.start || (input.date ? input.date + "T21:00" : "");
    return {
      schemaVersion: 4,
      id: input.id || uuid(),
      eventId: input.eventId || "",
      scenarioId: input.scenarioId || "",
      title: input.title || "",
      date: input.date || String(start || "").slice(0,10),
      start,
      end: input.end || "",
      status: legacyStatus || (input.eventId ? "planned" : "done"),
      system: input.system || "",
      facilitatorLabel: input.facilitatorLabel || "",
      facilitatorless: !!input.facilitatorless,
      role: input.role || "PL",
      ...normalizeSelfPCFields(input),
      ...normalizeParticipantFields(input),
      imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls : [],
      comment: input.comment || "",
      articleBody: input.articleBody || "",
      spoilerBody: input.spoilerBody || "",
      spoiler: input.spoiler || "",
      spoilerVisibility: input.spoilerVisibility || "private",
      externalLinks: Array.isArray(input.externalLinks) ? input.externalLinks : [],
      diceAnalyses: Array.isArray(input.diceAnalyses) ? input.diceAnalyses : [],
      visibility: input.visibility || "private",
      runId: input.runId || "",
      runLabel: input.runLabel || "",
      sessionDay: Number(input.sessionDay || 0),
      timeBand: input.timeBand || "",
      timeSpecified: input.timeSpecified !== undefined ? !!input.timeSpecified : /T\d{2}:\d{2}/.test(String(input.start || "")),
      shareId: input.shareId || "",
      shareVersion: Number(input.shareVersion || 0),
      calendarLinked: !!input.eventId,
      createdAt: input.createdAt || nowISO(),
      updatedAt: nowISO()
    };
  }

  const participantNorm=v=>String(v||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase();
  let identityReferenceCache=null;
  (window.TRPG39=window.TRPG39||{}).invalidateIdentityReferenceCache=()=>{identityReferenceCache=null};
  function identityLists(){
    if(identityReferenceCache)return identityReferenceCache;
    const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return []}};
    identityReferenceCache={pcs:read("trpg39_pcs"),players:read("trpg39_players")};
    return identityReferenceCache;
  }
  function repairParticipantReference(raw={}){
    const row=cleanParticipantRow(raw),{pcs,players}=identityLists();
    let player=row.playerId?players.find(p=>String(p.id||"")===row.playerId):null;
    if(!row.playerId&&row.plName){
      const hits=players.filter(p=>participantNorm(p.name)===participantNorm(row.plName));
      if(hits.length===1){player=hits[0];row.playerId=String(player.id||"")}
    }
    let pc=row.pcId?pcs.find(p=>String(p.id||"")===row.pcId):null;
    if(pc&&row.playerId&&String(pc.ownerPlayerId||"")!==row.playerId){row.pcId="";pc=null}
    if(!pc&&row.pcName){
      let hits=pcs.filter(p=>participantNorm(p.name)===participantNorm(row.pcName));
      if(row.playerId)hits=hits.filter(p=>String(p.ownerPlayerId||"")===row.playerId);
      if(hits.length===1){pc=hits[0];row.pcId=String(pc.id||"")}
    }
    if(pc&&pc.ownerPlayerId&&!row.playerId){
      row.playerId=String(pc.ownerPlayerId);
      player=players.find(p=>String(p.id||"")===row.playerId)||null;
    }
    if(player&&!row.plName)row.plName=String(player.name||"");
    if(pc&&!row.pcName)row.pcName=String(pc.name||"");
    return row;
  }
  function normalizeSelfPCFields(input={}){
    const {pcs}=identityLists();
    const fix=raw=>{
      const row={ho:String(raw?.ho||""),pcName:String(raw?.pcName||""),pcId:String(raw?.pcId||"")};
      let pc=row.pcId?pcs.find(p=>String(p.id||"")===row.pcId&&!String(p.ownerPlayerId||"").trim()):null;
      if(!pc&&row.pcName){const hits=pcs.filter(p=>!String(p.ownerPlayerId||"").trim()&&participantNorm(p.name)===participantNorm(row.pcName));if(hits.length===1)pc=hits[0]}
      row.pcId=pc?String(pc.id||""):"";
      if(pc&&!row.pcName)row.pcName=String(pc.name||"");
      return row;
    };
    let rows=Array.isArray(input.selfPcRows)?input.selfPcRows.map(fix).filter(r=>r.ho||r.pcName||r.pcId):[];
    const primary=fix({ho:input.selfHo,pcName:input.pcName,pcId:input.pcId});
    if(!rows.length&&(primary.ho||primary.pcName||primary.pcId))rows=[primary];
    const first=rows[0]||primary;
    return {selfHo:first.ho||"",pcName:first.pcName||"",pcId:first.pcId||"",selfPcRows:rows};
  }
  function cleanParticipantRow(r={}){return {role:String(r?.role||"PL"),ho:String(r?.ho||""),plName:String(r?.plName||""),playerId:String(r?.playerId||""),pcId:String(r?.pcId||""),pcName:String(r?.pcName||""),relation:String(r?.relation||"")}}
  function sameParticipantRow(a,b){
    const ap=String(a?.playerId||""),bp=String(b?.playerId||""),ac=String(a?.pcId||""),bc=String(b?.pcId||"");
    if(ap&&bp&&ap!==bp)return false;
    if(ac&&bc)return ac===bc;
    const an=participantNorm(a?.plName),bn=participantNorm(b?.plName),apc=participantNorm(a?.pcName),bpc=participantNorm(b?.pcName);
    if(ap&&bp){if(apc&&bpc&&apc!==bpc)return false;return true}
    if(ac||bc){return !!an&&an===bn&&!!apc&&apc===bpc}
    if(an&&bn&&an===bn){if(apc&&bpc&&apc!==bpc)return false;return true}
    return false;
  }
  function mergeParticipantRow(primary,extra){
    const a=cleanParticipantRow(primary),b=cleanParticipantRow(extra);
    return {...b,...a,role:a.role||b.role||"PL",ho:a.ho||b.ho||"",plName:a.plName||b.plName||"",playerId:a.playerId||b.playerId||"",pcId:a.pcId||b.pcId||"",pcName:a.pcName||b.pcName||"",relation:a.relation||b.relation||""};
  }
  function normalizeParticipantRows(rows=[]){
    const out=[];
    for(const raw of (Array.isArray(rows)?rows:[])){
      const row=repairParticipantReference(raw);if(!row.plName&&!row.playerId&&!row.pcName&&!row.pcId&&!row.ho)continue;
      const i=out.findIndex(x=>sameParticipantRow(x,row));if(i<0)out.push(row);else out[i]=mergeParticipantRow(out[i],row);
    }
    return out;
  }
  function normalizeParticipantFields(input={}){
    const rows=normalizeParticipantRows(input.participantRows);
    const legacyNames=Array.isArray(input.participants)?input.participants:[],legacyIds=Array.isArray(input.participantIds)?input.participantIds:[];
    const source=rows.length?rows:legacyNames.map((name,i)=>({plName:String(name||""),playerId:String(legacyIds[i]||"")}));
    const people=[];for(const r of source){const name=String(r.plName||"");if(!name)continue;const i=people.findIndex(x=>(r.playerId&&x.playerId===r.playerId)||(!r.playerId&&!x.playerId&&participantNorm(x.name)===participantNorm(name)));if(i<0)people.push({name,playerId:String(r.playerId||"")});else if(!people[i].playerId&&r.playerId)people[i].playerId=String(r.playerId)}
    return {participants:people.map(x=>x.name),participantIds:people.map(x=>x.playerId),participantRows:rows};
  }
  function mergeParticipantRows(eventRows = [], libraryRows = []) {return normalizeParticipantRows([...(Array.isArray(eventRows)?eventRows:[]),...(Array.isArray(libraryRows)?libraryRows:[])])}

  function albumFromEvent(event, existing = {}) {
    const e = normalizeEvent(event);
    const mergedParticipantRows = e.participantRows.length
      ? mergeParticipantRows(e.participantRows, existing.participantRows || [])
      : (existing.participantRows || []);
    return normalizeAlbum({
      ...existing,
      eventId: e.id,
      scenarioId: e.scenarioId,
      title: e.title,
      date: String(e.start || "").slice(0,10),
      start: e.start,
      end: e.end,
      status: e.status,
      system: e.system,
      facilitatorLabel: e.facilitatorLabel || existing.facilitatorLabel || "",
      facilitatorless: e.facilitatorless !== undefined ? e.facilitatorless : !!existing.facilitatorless,
      role: e.role || existing.role || "PL",
      selfHo: e.selfHo || existing.selfHo || "",
      pcName: e.pcName || existing.pcName || "",
      pcId: e.pcId || existing.pcId || "",
      participants: e.participants,
      participantIds: e.participantIds,
      participantRows: mergedParticipantRows,
      runId: e.runId || existing.runId || "",
      runLabel: e.runLabel || existing.runLabel || "",
      sessionDay: e.sessionDay || existing.sessionDay || 0,
      timeBand: e.timeBand || existing.timeBand || "",
      timeSpecified: e.timeSpecified,
      visibility: existing.visibility || e.visibility || "private"
    });
  }

  function syncEventToAlbum(event) {
    const e = normalizeEvent(event);
    if (e.type === "blocked") return null;
    const album = load(KEYS.album);
    const existing = album.find(a => a.eventId === e.id || (e.linkedAlbumId && a.id === e.linkedAlbumId));
    const item = albumFromEvent(e, existing || {});
    const i = existing ? album.findIndex(a => a.id === existing.id) : -1;
    if (i >= 0) album[i] = item; else album.unshift(item);
    save(KEYS.album, album);
    return item;
  }

  function syncAllEventsToAlbum() {
    const originalEventsRaw = localStorage.getItem(KEYS.events);
    const originalAlbumRaw = localStorage.getItem(KEYS.album);
    // 大容量ストアの全件同期は同期APIであるLocalStorage上では画面停止を招く。
    // 個別の保存時同期は維持し、起動時の一括移行だけをIndexedDB移行工程まで延期する。
    if((originalEventsRaw?.length||0)+(originalAlbumRaw?.length||0)>1_000_000){
      console.warn("[SAKU+MERU] Startup event/album full sync deferred because local data is large.");
      return {events:[],album:[],changed:false,deferred:true};
    }
    let events = load(KEYS.events).map(normalizeEvent);
    let album = load(KEYS.album);
    let changed = false;

    // CALENDAR-only blocked entries must never remain in LIBRARY.
    // v0.2.27.2 could have created linked album rows before blocked events
    // were separated, so clean those legacy linked rows during migration.
    const blockedEventIds = new Set(events.filter(e => e.type === "blocked" || e.status === "blocked").map(e => e.id));
    const blockedAlbumIds = new Set(events.filter(e => e.type === "blocked" || e.status === "blocked").map(e => e.linkedAlbumId).filter(Boolean));
    const beforeCleanup = album.length;
    album = album.filter(a => !(a.eventId && blockedEventIds.has(a.eventId)) && !blockedAlbumIds.has(a.id));
    if (album.length !== beforeCleanup) changed = true;

    events = events.map(e => {
      if (e.type === "blocked" || e.status === "blocked") {
        if (e.linkedAlbumId) { e.linkedAlbumId = ""; changed = true; }
        return e;
      }
      const existing = album.find(a => a.eventId === e.id || (e.linkedAlbumId && a.id === e.linkedAlbumId));
      const item = albumFromEvent(e, existing || {});
      if (existing) {
        const i = album.findIndex(a => a.id === existing.id);
        album[i] = item;
      } else {
        album.unshift(item);
      }
      if (e.linkedAlbumId !== item.id) { e.linkedAlbumId = item.id; changed = true; }
      return e;
    });
    if (events.length || album.length) {
      const nextEventsRaw=JSON.stringify(events),nextAlbumRaw=JSON.stringify(album);
      try{
        if(nextEventsRaw!==(originalEventsRaw||"[]"))localStorage.setItem(KEYS.events,nextEventsRaw);
        if(nextAlbumRaw!==(originalAlbumRaw||"[]"))localStorage.setItem(KEYS.album,nextAlbumRaw);
      }catch(err){
        // 容量不足で起動そのものを止めない。先に書いたキーがあれば元へ戻す。
        try{if(originalEventsRaw===null)localStorage.removeItem(KEYS.events);else localStorage.setItem(KEYS.events,originalEventsRaw)}catch{}
        try{if(originalAlbumRaw===null)localStorage.removeItem(KEYS.album);else localStorage.setItem(KEYS.album,originalAlbumRaw)}catch{}
        console.warn("[SAKU+MERU] Event/album startup sync skipped because browser storage is full. Existing data was kept.",err);
        return {events:load(KEYS.events),album:load(KEYS.album),changed:false,writeSkipped:true};
      }
    }
    return {events, album, changed};
  }


  
  function encodeShare(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }

  function makeShareUrl(data) {
    const base = new URL("../share/", location.href);
    base.hash = encodeShare(data);
    return base.href;
  }


  function makeShortShareUrl(id) {
    return new URL("../share/?id=" + encodeURIComponent(id), location.href).href;
  }

  function defaultFacilitatorLabel(system = "") {
    const t = String(system || "").normalize("NFKC").toLowerCase();
    if (/emoklore|エモクロア/.test(t)) return "DL";
    if (/coc|クトゥルフ|call of cthulhu/.test(t)) return "KP";
    if (/マダミス|マーダーミステリー|murder mystery/.test(t)) return "GM";
    return "GM";
  }

  function resolveFacilitatorLabel(system = "", source = {}) {
    const mode = String(source.facilitatorTermMode || "auto");
    if (mode === "custom") return String(source.facilitatorTermCustom || "GM").trim() || "GM";
    if (["KP","DL","GM"].includes(mode)) return mode;
    return defaultFacilitatorLabel(system);
  }

window.TRPG39 = {
    KEYS,
    uuid,
    loadScenarios: () => load(KEYS.scenarios),
    saveScenarios: v => save(KEYS.scenarios,
    v),
    loadEvents: () => load(KEYS.events).map(x=>({...x,...normalizeParticipantFields(x)})),
    saveEvents: v => save(KEYS.events,(Array.isArray(v)?v:[]).map(x=>({...x,...normalizeParticipantFields(x)}))),
    loadAlbum: () => load(KEYS.album).map(x=>({...x,...normalizeParticipantFields(x)})),
    saveAlbum: v => save(KEYS.album,(Array.isArray(v)?v:[]).map(x=>({...x,...normalizeParticipantFields(x)}))),
    normalizeEvent,
    normalizeAlbum,
    mergeParticipantRows,
    normalizeParticipantRows,
    albumFromEvent,
    syncEventToAlbum,
    syncAllEventsToAlbum,
    encodeShare,
    makeShareUrl,
    makeShortShareUrl,
    defaultFacilitatorLabel,
    resolveFacilitatorLabel
  };
})();
;(function(){
  const api=window.TRPG39=window.TRPG39||{};
  const parse=(k)=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return []}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  if(!api.loadPCs) api.loadPCs=()=>parse("trpg39_pcs");
  if(!api.savePCs) api.savePCs=v=>{save("trpg39_pcs",v);api.invalidateIdentityReferenceCache?.()};
  if(!api.loadPlayers) api.loadPlayers=()=>parse("trpg39_players");
  if(!api.savePlayers) api.savePlayers=v=>{save("trpg39_players",v);api.invalidateIdentityReferenceCache?.()};
})();

;(function(){
  const api=window.TRPG39=window.TRPG39||{};
  const norm=s=>String(s||"").normalize("NFKC").trim().toLowerCase();
  api.findPCByName=api.findPCByName||function(name){
    const pcs=api.loadPCs?api.loadPCs():[];
    return pcs.find(p=>norm(p.name)===norm(name))||null;
  };
  api.isSelfPC=function(pc){return !!pc&&!String(pc.ownerPlayerId||"").trim()};
  api.selfPCs=function(){return (api.loadPCs?api.loadPCs():[]).filter(api.isSelfPC)};
  api.resolvePCReference=function(ref={},options={}){
    const pcs=api.loadPCs?api.loadPCs():[];
    const pcId=String(ref.pcId||ref.id||"").trim();
    const playerId=String(ref.playerId||ref.ownerPlayerId||"").trim();
    const name=String(ref.pcName||ref.name||"").trim();
    const byId=pcId?pcs.find(p=>String(p.id||"")===pcId):null;
    if(byId){
      if(options.selfOnly&&!api.isSelfPC(byId))return null;
      if(playerId&&String(byId.ownerPlayerId||"")!==playerId)return null;
      return byId;
    }
    if(!name)return null;
    const named=pcs.filter(p=>norm(p.name)===norm(name));
    if(options.selfOnly){
      const self=named.filter(api.isSelfPC);
      return self.length===1?self[0]:null;
    }
    if(playerId){
      const owned=named.filter(p=>String(p.ownerPlayerId||"")===playerId);
      return owned.length===1?owned[0]:null;
    }
    return named.length===1?named[0]:null;
  };
  api.ensurePC=api.ensurePC||function(name,defaults={}){
    const clean=String(name||"").trim(); if(!clean)return null;
    let pcs=api.loadPCs?api.loadPCs():[];
    const ownerPlayerId=String(defaults.ownerPlayerId||defaults.playerId||"");
    const requestedId=String(defaults.pcId||defaults.id||"").trim();
    let found=requestedId?pcs.find(p=>String(p.id||"")===requestedId):null;
    if(found&&ownerPlayerId&&String(found.ownerPlayerId||"")!==ownerPlayerId)found=null;
    if(!found){
      const named=pcs.filter(p=>norm(p.name)===norm(clean));
      if(ownerPlayerId){
        found=named.find(p=>String(p.ownerPlayerId||"")===ownerPlayerId)||null;
        // 所有者なし旧データを引き継ぐのは、同名候補がその1件だけの時に限る。
        if(!found&&named.length===1&&!named[0].ownerPlayerId)found=named[0];
      }else{
        const self=named.filter(api.isSelfPC);
        if(self.length===1)found=self[0];
      }
    }
    if(found){
      let changed=false;
      if(ownerPlayerId&&!found.ownerPlayerId){found.ownerPlayerId=ownerPlayerId;changed=true}
      if(defaults.system&&!found.system){found.system=defaults.system;changed=true}
      if(changed)api.savePCs&&api.savePCs(pcs);
      return found;
    }
    const id=api.uuid?api.uuid():crypto.randomUUID();
    const pc={id,name:clean,ownerPlayerId,reading:"",system:defaults.system||"",job:"",image:"",sheet:"",visibility:"private",bio:"",autoCreated:true};
    pcs.push(pc); api.savePCs&&api.savePCs(pcs); return pc;
  };
})();

;(function(){
  const api=window.TRPG39=window.TRPG39||{};
  const norm=s=>String(s||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase();
  if(!api.findScenarioByTitle){
    api.findScenarioByTitle=function(title){
      const xs=api.loadScenarios?api.loadScenarios():[];
      return xs.find(x=>norm(x.title)===norm(title))||null;
    };
  }
  if(!api.ensureScenario){
    api.ensureScenario=function(title,defaults={}){
      const clean=String(title||"").trim(); if(!clean)return null;
      let xs=api.loadScenarios?api.loadScenarios():[];
      let found=xs.find(x=>norm(x.title)===norm(clean));
      if(found)return found;
      const id=api.uuid?api.uuid():(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
      const item={id,title:clean,system:defaults.system||"",author:"",status:"owned",sourceUrl:"",thumbnailUrl:"",playersMin:null,playersMax:null,hoursMin:null,hoursMax:null,flags:{},memo:"",autoCreated:true};
      xs.unshift(item); api.saveScenarios&&api.saveScenarios(xs); return item;
    };
  }
})();

;(function(){
 const api=window.TRPG39=window.TRPG39||{};
 const KEY="39x2_players_enabled_v1";
 api.playersEnabled=function(){return localStorage.getItem(KEY)==="1"};
 api.setPlayersEnabled=function(v){localStorage.setItem(KEY,v?"1":"0");window.dispatchEvent(new CustomEvent("39x2:players-setting",{detail:{enabled:!!v}}))};
})();

;(function(){
 const api=window.TRPG39=window.TRPG39||{};
 const norm=s=>String(s||"").normalize("NFKC").trim().toLowerCase();
 if(!api.ensurePlayer){
   api.ensurePlayer=function(name){
     const clean=String(name||"").trim();if(!clean)return null;
     let xs=api.loadPlayers?api.loadPlayers():JSON.parse(localStorage.getItem("39x2_players_v1")||"[]");
     let found=xs.find(x=>norm(x.name)===norm(clean));if(found)return found;
     const item={id:api.uuid?api.uuid():crypto.randomUUID(),name:clean,memo:"",autoCreated:true};
     xs.unshift(item);
     if(api.savePlayers)api.savePlayers(xs);else localStorage.setItem("39x2_players_v1",JSON.stringify(xs));
     return item;
   };
 }
})();

/* SAKU+MERU 2026-09-01 identity rescue migration v1
 * Conservative one-time migration for existing browser data.
 * - makes a rollback snapshot before writing anything
 * - never deletes source rows or legacy master data
 * - fills IDs only when a match is unique; otherwise leaves the value untouched
 */
;(function(){
  "use strict";
  const api=window.TRPG39=window.TRPG39||{};
  const MIGRATION_KEY="sakumeru_id_migration_v1_done";
  const BACKUP_KEY="sakumeru_id_migration_backup_v1";
  const REPORT_KEY="sakumeru_id_migration_v1_report";
  const KEYS={
    scenarios:"39x2_scenarios_v3",
    events:"39x2_events_v1",
    album:"39x2_album_v2",
    players:"trpg39_players",
    pcs:"trpg39_pcs"
  };
  const LEGACY_PLAYER_KEYS=["39x2_players_v1"];
  const LEGACY_PC_KEYS=["trpg39_pcs_v3","39x2_pcs_v3","39x2_pcs"];
  const norm=s=>String(s||"").normalize("NFKC").replace(/\s+/g,"").toLowerCase();
  const arr=k=>{try{const v=JSON.parse(localStorage.getItem(k)||"[]");return Array.isArray(v)?v:[]}catch{return []}};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const uid=()=>api.uuid?api.uuid():(crypto?.randomUUID?crypto.randomUUID():("id_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,10)));

  function uniqueByNorm(xs,name){
    const n=norm(name); if(!n)return {item:null,ambiguous:false};
    const found=xs.filter(x=>norm(x?.name)===n);
    return {item:found.length===1?found[0]:null,ambiguous:found.length>1};
  }
  function uniqueScenario(xs,title){
    const n=norm(title); if(!n)return {item:null,ambiguous:false};
    const found=xs.filter(x=>norm(x?.title)===n);
    return {item:found.length===1?found[0]:null,ambiguous:found.length>1};
  }
  function indexById(xs){return new Map(xs.filter(x=>x&&x.id).map(x=>[String(x.id),x]));}

  function takeBackup(){
    if(localStorage.getItem(BACKUP_KEY))return true;
    const keys=[...Object.values(KEYS),...LEGACY_PLAYER_KEYS,...LEGACY_PC_KEYS];
    const data={kind:"SAKUMERU_ID_MIGRATION_BACKUP",version:1,createdAt:new Date().toISOString(),storage:{}};
    let sourceChars=0;
    keys.forEach(k=>{const raw=localStorage.getItem(k);if(raw!==null){sourceChars+=raw.length;data.storage[k]=raw}});
    // LocalStorage内へ大容量データを丸ごと複製すると、同期処理だけで画面を停止させ得る。
    if(sourceChars>1_000_000){console.warn("[SAKU+MERU] ID migration v1 deferred: source is too large for an in-LocalStorage backup.");return false}
    try{localStorage.setItem(BACKUP_KEY,JSON.stringify(data));return true}catch(err){
      console.error("[SAKU+MERU] ID migration backup failed; migration aborted.",err);
      return false;
    }
  }

  function mergeLegacyPlayers(current,report){
    const out=current.map(x=>({...x}));
    const ids=new Set(out.map(x=>String(x?.id||"")).filter(Boolean));
    for(const key of LEGACY_PLAYER_KEYS){
      for(const old of arr(key)){
        if(!old||!String(old.name||"").trim())continue;
        if(old.id&&ids.has(String(old.id)))continue;
        const m=uniqueByNorm(out,old.name);
        if(m.ambiguous){report.ambiguousPlayers++;continue;}
        if(m.item){
          // Preserve current fields; only backfill missing legacy fields.
          for(const [k,v] of Object.entries(old))if((m.item[k]===undefined||m.item[k]==="")&&v!==undefined&&v!=="")m.item[k]=v;
          if(!m.item.id){m.item.id=old.id||uid();ids.add(String(m.item.id));report.playerIdsCreated++;}
        }else{
          const item={...old,id:old.id||uid(),name:String(old.name).trim(),migratedFrom:key};
          out.push(item);ids.add(String(item.id));report.legacyPlayersRecovered++;
        }
      }
    }
    return out;
  }

  function mergeLegacyPCs(current,report){
    const out=current.map(x=>({...x}));
    const ids=new Set(out.map(x=>String(x?.id||"")).filter(Boolean));
    for(const key of LEGACY_PC_KEYS){
      for(const old of arr(key)){
        if(!old||!String(old.name||"").trim())continue;
        if(old.id&&ids.has(String(old.id)))continue;
        const same=out.filter(x=>norm(x?.name)===norm(old.name));
        if(same.length===1){
          const target=same[0];
          for(const [k,v] of Object.entries(old))if((target[k]===undefined||target[k]==="")&&v!==undefined&&v!=="")target[k]=v;
          if(!target.id){target.id=old.id||uid();ids.add(String(target.id));report.pcIdsCreated++;}
        }else if(same.length>1){
          report.ambiguousPCs++;
        }else{
          const item={...old,id:old.id||uid(),name:String(old.name).trim(),migratedFrom:key};
          out.push(item);ids.add(String(item.id));report.legacyPCsRecovered++;
        }
      }
    }
    return out;
  }

  function ensurePlayerForName(players,name,report){
    const clean=String(name||"").trim(); if(!clean)return null;
    const m=uniqueByNorm(players,clean);
    if(m.ambiguous){report.ambiguousPlayers++;return null;}
    if(m.item){
      if(!m.item.id){m.item.id=uid();report.playerIdsCreated++;}
      return m.item;
    }
    const item={id:uid(),name:clean,memo:"",autoCreated:true,migratedFrom:"participantRows"};
    players.push(item);report.playersCreatedFromRows++;return item;
  }

  function resolvePC(pcs,pcName,playerId,system,report){
    const clean=String(pcName||"").trim(); if(!clean)return null;
    const pid=String(playerId||"");
    let candidates=pcs.filter(p=>norm(p?.name)===norm(clean));
    if(pid){
      const owned=candidates.filter(p=>String(p?.ownerPlayerId||"")===pid);
      if(owned.length===1)return owned[0];
      if(owned.length>1){report.ambiguousPCs++;return null;}
      const unowned=candidates.filter(p=>!p?.ownerPlayerId);
      // Claim an unowned PC only when the name is globally unique.
      if(candidates.length===1&&unowned.length===1){unowned[0].ownerPlayerId=pid;report.pcOwnersLinked++;return unowned[0];}
      if(candidates.length>0){report.ambiguousPCs++;return null;}
      const item={id:uid(),name:clean,ownerPlayerId:pid,reading:"",system:system||"",job:"",image:"",sheet:"",visibility:"private",bio:"",autoCreated:true,migratedFrom:"participantRows"};
      pcs.push(item);report.pcsCreatedFromRows++;return item;
    }
    if(candidates.length===1)return candidates[0];
    if(candidates.length>1){report.ambiguousPCs++;return null;}
    const item={id:uid(),name:clean,ownerPlayerId:"",reading:"",system:system||"",job:"",image:"",sheet:"",visibility:"private",bio:"",autoCreated:true,migratedFrom:"selfPc"};
    pcs.push(item);report.pcsCreatedFromRows++;return item;
  }

  function migrateParticipantRows(obj,players,pcs,playerById,pcById,report){
    if(!Array.isArray(obj.participantRows))return;
    obj.participantRows=obj.participantRows.map(raw=>{
      const r={...raw};
      let player=r.playerId?playerById.get(String(r.playerId)):null;
      if(!player&&r.plName){
        player=ensurePlayerForName(players,r.plName,report);
        if(player){r.playerId=player.id;playerById.set(String(player.id),player);report.participantPlayerIdsLinked++;}
      }else if(player&&!r.plName&&player.name){r.plName=player.name;report.participantNamesBackfilled++;}

      let pc=r.pcId?pcById.get(String(r.pcId)):null;
      if(!pc&&r.pcName){
        pc=resolvePC(pcs,r.pcName,r.playerId,obj.system||"",report);
        if(pc){r.pcId=pc.id;pcById.set(String(pc.id),pc);report.participantPCIdsLinked++;}
      }else if(pc&&!r.pcName&&pc.name){r.pcName=pc.name;report.participantPCNamesBackfilled++;}
      if(pc&&r.playerId&&!pc.ownerPlayerId){pc.ownerPlayerId=r.playerId;report.pcOwnersLinked++;}
      return r;
    });
  }

  function migrateParticipantArrays(obj,players,playerById,report){
    if(!Array.isArray(obj.participants)||!obj.participants.length)return;
    const oldIds=Array.isArray(obj.participantIds)?obj.participantIds.slice():[];
    const ids=obj.participants.map((name,i)=>{
      const existing=oldIds[i]&&playerById.get(String(oldIds[i]));
      if(existing)return String(existing.id);
      const p=ensurePlayerForName(players,name,report);
      if(p){playerById.set(String(p.id),p);report.participantArrayIdsLinked++;return String(p.id);}
      return oldIds[i]||"";
    });
    obj.participantIds=ids;
  }

  function migrateScenarioId(obj,scenarios,report){
    if(obj.scenarioId)return;
    const title=obj.scenarioTitle||obj.title||"";
    const m=uniqueScenario(scenarios,title);
    if(m.item){obj.scenarioId=m.item.id;report.scenarioIdsLinked++;}
    else if(m.ambiguous)report.ambiguousScenarios++;
  }

  function migrateSelfPC(obj,pcs,pcById,report){
    if(obj.pcId&&pcById.has(String(obj.pcId))){
      if(!obj.pcName){obj.pcName=pcById.get(String(obj.pcId)).name||"";if(obj.pcName)report.selfPCNamesBackfilled++;}
      return;
    }
    if(!obj.pcName)return;
    const pc=resolvePC(pcs,obj.pcName,"",obj.system||"",report);
    if(pc){obj.pcId=pc.id;pcById.set(String(pc.id),pc);report.selfPCIdsLinked++;}
  }

  function copyLinkedIdentity(events,album,report){
    const eventById=indexById(events), albumById=indexById(album);
    for(const a of album){
      const e=a.eventId?eventById.get(String(a.eventId)):null;
      if(!e)continue;
      if(!a.runId&&e.runId){a.runId=e.runId;report.runIdsCopied++;}
      if(!e.runId&&a.runId){e.runId=a.runId;report.runIdsCopied++;}
      if(!a.scenarioId&&e.scenarioId){a.scenarioId=e.scenarioId;report.scenarioIdsCopied++;}
      if(!e.scenarioId&&a.scenarioId){e.scenarioId=a.scenarioId;report.scenarioIdsCopied++;}
      if(!e.linkedAlbumId){e.linkedAlbumId=a.id;report.albumLinksBackfilled++;}
    }
    for(const e of events){
      if(!e.linkedAlbumId)continue;
      const a=albumById.get(String(e.linkedAlbumId)); if(!a)continue;
      if(!a.eventId){a.eventId=e.id;report.eventLinksBackfilled++;}
      if(!a.runId&&e.runId){a.runId=e.runId;report.runIdsCopied++;}
      if(!e.runId&&a.runId){e.runId=a.runId;report.runIdsCopied++;}
    }
  }

  function run(){
    if(localStorage.getItem(MIGRATION_KEY)==="1")return;
    if(!takeBackup())return;
    const report={
      version:1,startedAt:new Date().toISOString(),
      legacyPlayersRecovered:0,legacyPCsRecovered:0,playerIdsCreated:0,pcIdsCreated:0,
      playersCreatedFromRows:0,pcsCreatedFromRows:0,participantPlayerIdsLinked:0,participantPCIdsLinked:0,
      participantArrayIdsLinked:0,participantNamesBackfilled:0,participantPCNamesBackfilled:0,
      pcOwnersLinked:0,selfPCIdsLinked:0,selfPCNamesBackfilled:0,scenarioIdsLinked:0,scenarioIdsCopied:0,
      runIdsCopied:0,albumLinksBackfilled:0,eventLinksBackfilled:0,
      ambiguousPlayers:0,ambiguousPCs:0,ambiguousScenarios:0
    };
    try{
      const scenarios=arr(KEYS.scenarios).map(x=>({...x}));
      let players=mergeLegacyPlayers(arr(KEYS.players),report);
      let pcs=mergeLegacyPCs(arr(KEYS.pcs),report);
      const events=arr(KEYS.events).map(x=>clone(x));
      const album=arr(KEYS.album).map(x=>clone(x));
      const playerById=indexById(players), pcById=indexById(pcs);

      for(const obj of [...events,...album]){
        migrateScenarioId(obj,scenarios,report);
        migrateParticipantRows(obj,players,pcs,playerById,pcById,report);
        migrateParticipantArrays(obj,players,playerById,report);
        migrateSelfPC(obj,pcs,pcById,report);
      }
      copyLinkedIdentity(events,album,report);

      // Writes are additive/conservative: no record is removed.
      localStorage.setItem(KEYS.players,JSON.stringify(players));
      localStorage.setItem(KEYS.pcs,JSON.stringify(pcs));
      localStorage.setItem(KEYS.events,JSON.stringify(events));
      localStorage.setItem(KEYS.album,JSON.stringify(album));
      report.finishedAt=new Date().toISOString();
      report.players=players.length;report.pcs=pcs.length;report.events=events.length;report.album=album.length;
      localStorage.setItem(REPORT_KEY,JSON.stringify(report));
      localStorage.setItem(MIGRATION_KEY,"1");
      window.dispatchEvent(new CustomEvent("sakumeru:identity-migrated",{detail:report}));
      console.info("[SAKU+MERU] Identity rescue migration v1 completed.",report);
    }catch(err){
      console.error("[SAKU+MERU] Identity rescue migration v1 failed; source backup is preserved.",err);
    }
  }

  api.getIdentityMigrationReport=function(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||"null")}catch{return null}};
  api.getIdentityMigrationBackup=function(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"null")}catch{return null}};
  api.runIdentityMigrationV1=run;
  // ページ起動時には実行しない。バックアップ確認済みの専用移行工程から明示的に呼ぶ。
})();


/* SAKU+MERU 2026-09-01 identity rescue migration v2
 * Consolidates old LIBRARY side stores into canonical album/event fields.
 * Side stores are intentionally kept as compatibility caches and are never deleted here.
 */
;(function(){
  "use strict";
  const api=window.TRPG39=window.TRPG39||{};
  const MIGRATION_KEY="sakumeru_id_migration_v2_done";
  const BACKUP_KEY="sakumeru_id_migration_backup_v2";
  const REPORT_KEY="sakumeru_id_migration_v2_report";
  const ALBUM_KEY="39x2_album_v2";
  const EVENT_KEY="39x2_events_v1";
  const SELF_PC_KEY="trpg39_library_self_pc_rows_v1";
  const RUN_ROSTER_KEY="trpg39.library.runRoster.v1";
  const parse=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||"");return v??fallback}catch{return fallback}};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const cleanSelfRows=rows=>(Array.isArray(rows)?rows:[]).map(r=>({
    ho:String(r?.ho||""),pcName:String(r?.pcName||""),pcId:String(r?.pcId||"")
  })).filter(r=>r.ho||r.pcName||r.pcId);
  const cleanParticipantRows=rows=>(Array.isArray(rows)?rows:[]).map(r=>({
    role:String(r?.role||"PL"),ho:String(r?.ho||""),plName:String(r?.plName||""),
    playerId:String(r?.playerId||""),pcId:String(r?.pcId||""),pcName:String(r?.pcName||""),relation:String(r?.relation||"")
  })).filter(r=>r.plName||r.playerId||r.pcName||r.pcId||r.ho);

  function backup(){
    if(localStorage.getItem(BACKUP_KEY))return true;
    const data={kind:"SAKUMERU_ID_MIGRATION_BACKUP",version:2,createdAt:new Date().toISOString(),storage:{}};
    let sourceChars=0;
    [ALBUM_KEY,EVENT_KEY,SELF_PC_KEY,RUN_ROSTER_KEY].forEach(k=>{const raw=localStorage.getItem(k);if(raw!==null){sourceChars+=raw.length;data.storage[k]=raw}});
    // IndexedDB移行までは、大容量バックアップのJSON化・書き戻し自体を行わない。
    if(sourceChars>1_000_000){console.warn("[SAKU+MERU] ID migration v2 deferred: source is too large for an in-LocalStorage backup.");return false}
    try{localStorage.setItem(BACKUP_KEY,JSON.stringify(data));return true}catch(err){
      // バックアップを作れない容量ではmigrationを実行しない。既存キーには触れず、通常起動を続ける。
      console.warn("[SAKU+MERU] ID migration v2 skipped because browser storage is full. Existing data will be loaded without migration.",err);return false;
    }
  }

  function run(){
    if(localStorage.getItem(MIGRATION_KEY)==="1")return;
    if(!backup())return;
    const report={version:2,startedAt:new Date().toISOString(),selfPcRowsRecovered:0,runParticipantsRecovered:0,runSelfPcsRecovered:0,eventParticipantsRecovered:0,eventSelfPcRecovered:0};
    try{
      const originalAlbumRaw=localStorage.getItem(ALBUM_KEY),originalEventRaw=localStorage.getItem(EVENT_KEY);
      const album=(parse(ALBUM_KEY,[])||[]).map(x=>clone(x));
      const events=(parse(EVENT_KEY,[])||[]).map(x=>clone(x));
      const selfMap=parse(SELF_PC_KEY,{})||{};
      const rosterMap=parse(RUN_ROSTER_KEY,{})||{};

      for(const a of album){
        let selfRows=cleanSelfRows(a.selfPcRows);
        if(!selfRows.length)selfRows=cleanSelfRows(selfMap[String(a.id)]);
        if(!selfRows.length&&(a.pcName||a.pcId||a.selfHo))selfRows=cleanSelfRows([{ho:a.selfHo||"",pcName:a.pcName||"",pcId:a.pcId||""}]);
        if(selfRows.length&&!cleanSelfRows(a.selfPcRows).length){a.selfPcRows=selfRows;report.selfPcRowsRecovered++;}
      }

      for(const [runId,raw] of Object.entries(rosterMap)){
        const roster=raw&&typeof raw==="object"?raw:{};
        const participants=cleanParticipantRows(roster.participants);
        const selfPcs=cleanSelfRows(roster.selfPcs);
        for(const a of album){
          if(String(a.runId||"")!==String(runId))continue;
          if(participants.length&&!cleanParticipantRows(a.participantRows).length){
            a.participantRows=participants.map(r=>({...r}));
            a.participants=participants.map(r=>r.plName).filter(Boolean);
            a.participantIds=participants.filter(r=>r.plName).map(r=>r.playerId||"");
            report.runParticipantsRecovered++;
          }
          if(selfPcs.length&&!cleanSelfRows(a.selfPcRows).length){a.selfPcRows=selfPcs.map(r=>({...r}));report.runSelfPcsRecovered++;}
          if(!a.role&&roster.role)a.role=String(roster.role);
        }
        for(const e of events){
          if(String(e.runId||"")!==String(runId))continue;
          if(participants.length&&!cleanParticipantRows(e.participantRows).length){
            e.participantRows=participants.map(r=>({...r}));
            e.participants=participants.map(r=>r.plName).filter(Boolean);
            e.participantIds=participants.filter(r=>r.plName).map(r=>r.playerId||"");
            report.eventParticipantsRecovered++;
          }
          if(selfPcs.length&&!e.pcName&&!e.pcId){
            const p=selfPcs[0];e.pcName=p.pcName||"";e.pcId=p.pcId||"";e.selfHo=e.selfHo||p.ho||"";report.eventSelfPcRecovered++;
          }
        }
      }

      const nextAlbumRaw=JSON.stringify(album),nextEventRaw=JSON.stringify(events);
      try{
        localStorage.setItem(MIGRATION_KEY,"running");
        if(nextAlbumRaw!==(originalAlbumRaw||"[]"))localStorage.setItem(ALBUM_KEY,nextAlbumRaw);
        if(nextEventRaw!==(originalEventRaw||"[]"))localStorage.setItem(EVENT_KEY,nextEventRaw);
        localStorage.setItem(MIGRATION_KEY,"1");
      }catch(writeErr){
        // 途中まで書けた場合も元の文字列へ戻し、空配列などで上書きしない。
        try{if(originalAlbumRaw===null)localStorage.removeItem(ALBUM_KEY);else localStorage.setItem(ALBUM_KEY,originalAlbumRaw)}catch{}
        try{if(originalEventRaw===null)localStorage.removeItem(EVENT_KEY);else localStorage.setItem(EVENT_KEY,originalEventRaw)}catch{}
        try{localStorage.removeItem(MIGRATION_KEY)}catch{}
        console.warn("[SAKU+MERU] ID migration v2 write skipped because browser storage is full. Existing data was kept.",writeErr);
        return;
      }
      report.finishedAt=new Date().toISOString();report.album=album.length;report.events=events.length;
      try{localStorage.setItem(REPORT_KEY,JSON.stringify(report))}catch(err){console.warn("[SAKU+MERU] ID migration v2 report was not stored because browser storage is full.",err)}
      window.dispatchEvent(new CustomEvent("sakumeru:identity-migrated-v2",{detail:report}));
      console.info("[SAKU+MERU] Identity rescue migration v2 completed.",report);
    }catch(err){console.warn("[SAKU+MERU] Identity rescue migration v2 was skipped; normal data loading continues.",err);}
  }
  api.getIdentityMigrationV2Report=function(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||"null")}catch{return null}};
  api.getIdentityMigrationV2Backup=function(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"null")}catch{return null}};
  api.runIdentityMigrationV2=run;
  // ページ起動時には実行しない。容量不足時の再試行・全件書換えを通常表示から分離する。
})();
