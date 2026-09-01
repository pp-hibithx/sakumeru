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
      participants: Array.isArray(input.participants) ? input.participants : [],
      participantIds: Array.isArray(input.participantIds) ? input.participantIds : [],
      participantRows: Array.isArray(input.participantRows) ? input.participantRows.map(r => ({
        role: String(r?.role || "PL"),
        ho: String(r?.ho || ""),
        plName: String(r?.plName || ""),
        playerId: String(r?.playerId || ""),
        pcId: String(r?.pcId || ""),
        pcName: String(r?.pcName || ""),
        relation: String(r?.relation || "")
      })) : [],
      selfHo: input.selfHo || "",
      pcName: input.pcName || "",
      pcId: input.pcId || "",
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
      selfHo: input.selfHo || "",
      pcName: input.pcName || "",
      pcId: input.pcId || "",
      selfPcRows: Array.isArray(input.selfPcRows) ? input.selfPcRows.map(r => ({
        ho: String(r?.ho || ""),
        pcName: String(r?.pcName || ""),
        pcId: String(r?.pcId || "")
      })).filter(r => r.ho || r.pcName || r.pcId) : [],
      participants: Array.isArray(input.participants) ? input.participants : [],
      participantIds: Array.isArray(input.participantIds) ? input.participantIds : [],
      participantRows: Array.isArray(input.participantRows) ? input.participantRows.map(r => ({
        role: String(r?.role || "PL"),
        ho: String(r?.ho || ""),
        plName: String(r?.plName || ""),
        playerId: String(r?.playerId || ""),
        pcId: String(r?.pcId || ""),
        pcName: String(r?.pcName || ""),
        relation: String(r?.relation || "")
      })) : [],
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

  function mergeParticipantRows(eventRows = [], libraryRows = []) {
    const norm = v => String(v || "").normalize("NFKC").trim().toLowerCase();
    const events = (Array.isArray(eventRows) ? eventRows : []).map(r => ({...r}));
    const libs = (Array.isArray(libraryRows) ? libraryRows : []).map(r => ({...r}));
    const used = new Set();
    const findMatch = r => {
      let i = -1;
      if (r?.pcId) i = libs.findIndex((q,n)=>!used.has(n)&&q?.pcId&&String(q.pcId)===String(r.pcId));
      if (i < 0 && r?.playerId && r?.pcName) i = libs.findIndex((q,n)=>!used.has(n)&&q?.playerId&&String(q.playerId)===String(r.playerId)&&norm(q.pcName)===norm(r.pcName));
      if (i < 0 && r?.playerId && r?.ho) i = libs.findIndex((q,n)=>!used.has(n)&&q?.playerId&&String(q.playerId)===String(r.playerId)&&norm(q.ho)===norm(r.ho));
      if (i < 0 && r?.playerId) i = libs.findIndex((q,n)=>!used.has(n)&&q?.playerId&&String(q.playerId)===String(r.playerId));
      if (i < 0 && r?.plName && r?.pcName) i = libs.findIndex((q,n)=>!used.has(n)&&norm(q.plName)===norm(r.plName)&&norm(q.pcName)===norm(r.pcName));
      if (i < 0 && r?.plName) i = libs.findIndex((q,n)=>!used.has(n)&&norm(q.plName)===norm(r.plName));
      return i;
    };
    const merged = events.map(r => {
      const i=findMatch(r), lib=i>=0?libs[i]:{}; if(i>=0)used.add(i);
      return {...lib,...r,role:String(r?.role||lib.role||"PL"),ho:String(r?.ho||lib.ho||""),plName:String(r?.plName||lib.plName||""),playerId:String(r?.playerId||lib.playerId||""),pcId:String(r?.pcId||lib.pcId||""),pcName:String(r?.pcName||lib.pcName||""),relation:String(r?.relation||lib.relation||"")};
    });
    // CALENDARにまだ存在しないLIBRARY側の複数PC行なども消さない。
    libs.forEach((r,i)=>{if(!used.has(i))merged.push({...r});});
    return merged;
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
      save(KEYS.events, events);
      save(KEYS.album, album);
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
    loadEvents: () => load(KEYS.events),
    saveEvents: v => save(KEYS.events,
    v),
    loadAlbum: () => load(KEYS.album),
    saveAlbum: v => save(KEYS.album,
    v),
    normalizeEvent,
    normalizeAlbum,
    mergeParticipantRows,
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
  if(!api.savePCs) api.savePCs=v=>save("trpg39_pcs",v);
  if(!api.loadPlayers) api.loadPlayers=()=>parse("trpg39_players");
  if(!api.savePlayers) api.savePlayers=v=>save("trpg39_players",v);
})();

;(function(){
  const api=window.TRPG39=window.TRPG39||{};
  const norm=s=>String(s||"").normalize("NFKC").trim().toLowerCase();
  api.findPCByName=api.findPCByName||function(name){
    const pcs=api.loadPCs?api.loadPCs():[];
    return pcs.find(p=>norm(p.name)===norm(name))||null;
  };
  api.ensurePC=api.ensurePC||function(name,defaults={}){
    const clean=String(name||"").trim(); if(!clean)return null;
    let pcs=api.loadPCs?api.loadPCs():[];
    const ownerPlayerId=String(defaults.ownerPlayerId||defaults.playerId||"");
    let found=pcs.find(p=>norm(p.name)===norm(clean) && (!ownerPlayerId || !p.ownerPlayerId || String(p.ownerPlayerId)===ownerPlayerId));
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
    keys.forEach(k=>{if(localStorage.getItem(k)!==null)data.storage[k]=localStorage.getItem(k)});
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
  run();
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
    [ALBUM_KEY,EVENT_KEY,SELF_PC_KEY,RUN_ROSTER_KEY].forEach(k=>{if(localStorage.getItem(k)!==null)data.storage[k]=localStorage.getItem(k)});
    try{localStorage.setItem(BACKUP_KEY,JSON.stringify(data));return true}catch(err){
      console.error("[SAKU+MERU] ID migration v2 backup failed; migration aborted.",err);return false;
    }
  }

  function run(){
    if(localStorage.getItem(MIGRATION_KEY)==="1")return;
    if(!backup())return;
    const report={version:2,startedAt:new Date().toISOString(),selfPcRowsRecovered:0,runParticipantsRecovered:0,runSelfPcsRecovered:0,eventParticipantsRecovered:0,eventSelfPcRecovered:0};
    try{
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

      localStorage.setItem(ALBUM_KEY,JSON.stringify(album));
      localStorage.setItem(EVENT_KEY,JSON.stringify(events));
      report.finishedAt=new Date().toISOString();report.album=album.length;report.events=events.length;
      localStorage.setItem(REPORT_KEY,JSON.stringify(report));localStorage.setItem(MIGRATION_KEY,"1");
      window.dispatchEvent(new CustomEvent("sakumeru:identity-migrated-v2",{detail:report}));
      console.info("[SAKU+MERU] Identity rescue migration v2 completed.",report);
    }catch(err){console.error("[SAKU+MERU] Identity rescue migration v2 failed; source backup is preserved.",err);}
  }
  api.getIdentityMigrationV2Report=function(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||"null")}catch{return null}};
  api.getIdentityMigrationV2Backup=function(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"null")}catch{return null}};
  api.runIdentityMigrationV2=run;
  run();
})();
