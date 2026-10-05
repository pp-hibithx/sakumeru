(() => {
"use strict";

const cfg = window.SUPABASE_CONFIG || {};
const EDIT_TOKEN_STORAGE_KEY = "sakumeru_share_edit_tokens_v1";

function configured() {
  return /^https:\/\/.+\.supabase\.co$/i.test(cfg.projectUrl || "") &&
    /^sb_publishable_/i.test(cfg.publishableKey || "");
}

function headers() {
  return {
    "apikey": cfg.publishableKey,
    "Content-Type": "application/json"
  };
}

function randomId(len=14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b=>b.toString(16).padStart(2,"0")).join("");
}

function loadEditTokens() {
  try {
    const value=JSON.parse(localStorage.getItem(EDIT_TOKEN_STORAGE_KEY)||"{}");
    return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  } catch {
    return {};
  }
}

function saveEditToken(id,token) {
  const tokens=loadEditTokens();
  tokens[id]=token;
  localStorage.setItem(EDIT_TOKEN_STORAGE_KEY,JSON.stringify(tokens));
}

function editTokenFor(id) {
  return String(loadEditTokens()[id]||"");
}

function forgetEditToken(id) {
  const tokens=loadEditTokens();
  delete tokens[id];
  localStorage.setItem(EDIT_TOKEN_STORAGE_KEY,JSON.stringify(tokens));
}

async function rpc(name,body) {
  const res=await fetch(cfg.projectUrl+"/rest/v1/rpc/"+name,{
    method:"POST",headers:headers(),body:JSON.stringify(body)
  });
  if(res.ok)return {ok:true,res};
  return {ok:false,res,body:await res.text()};
}

async function createSharedPage(data) {
  if (!configured()) throw new Error("SupabaseのPublishable keyが未設定です。");

  for (let attempt=0; attempt<3; attempt++) {
    const id = randomId();
    const editToken=randomToken();
    const secure=await rpc("create_shared_page_secure",{p_id:id,p_data:data,p_edit_token:editToken});
    if(secure.ok){saveEditToken(id,editToken);return id}

    // Deployments created before the secure RPC remain usable during migration.
    if(secure.res.status===404){
      const legacy=await rpc("create_shared_page",{p_id:id,p_data:data});
      if(legacy.ok)return id;
      if(legacy.res.status===409)continue;
      throw new Error("共有データの保存に失敗しました。"+(legacy.body?" "+legacy.body.slice(0,180):""));
    }

    // collision is extremely unlikely, but retry on a conflict-like response.
    if (secure.res.status === 409) continue;

    throw new Error("共有データの保存に失敗しました。"+(secure.body?" "+secure.body.slice(0,180):""));
  }
  throw new Error("共有IDの作成に失敗しました。");
}

async function getSharedPage(id) {
  if (!configured()) throw new Error("SupabaseのPublishable keyが未設定です。");

  const res = await fetch(cfg.projectUrl + "/rest/v1/rpc/get_shared_page", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ p_id: id })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error("共有データの読み込みに失敗しました。" + (body ? " " + body.slice(0,180) : ""));
  }

  return await res.json();
}




async function updateSharedPage(id,data) {
  if (!configured()) throw new Error("SupabaseのPublishable keyが未設定です。");
  let editToken=editTokenFor(id);
  if(!editToken){
    editToken=randomToken();
    const claim=await rpc("claim_shared_page",{p_id:id,p_edit_token:editToken});
    if(!claim.ok){
      if(claim.res.status===404){
        const legacy=await rpc("update_shared_page",{p_id:id,p_data:data});
        if(legacy.ok)return;
        throw new Error("固定共有URLの更新に失敗しました。"+(legacy.body?" "+legacy.body.slice(0,180):""));
      }
      throw new Error("この共有URLの編集権限を確認できませんでした。元の端末またはバックアップからお試しください。");
    }
    saveEditToken(id,editToken);
  }
  const result=await rpc("update_shared_page_secure",{p_id:id,p_data:data,p_edit_token:editToken});
  if(!result.ok)throw new Error("固定共有URLの更新に失敗しました。編集権限が一致しない可能性があります。"+(result.body?" "+result.body.slice(0,180):""));
}

async function deleteSharedPage(id) {
  if(!configured())throw new Error("SupabaseのPublishable keyが未設定です。");
  const editToken=editTokenFor(id);
  if(!editToken)throw new Error("この共有URLの削除権限がこの端末にありません。");
  const result=await rpc("delete_shared_page_secure",{p_id:id,p_edit_token:editToken});
  if(!result.ok)throw new Error("共有ページを停止できませんでした。"+(result.body?" "+result.body.slice(0,180):""));
  forgetEditToken(id);
}

async function unlockSharedPage(id,passwordHash) {
  if(!configured())throw new Error("SupabaseのPublishable keyが未設定です。");
  const result=await rpc("unlock_shared_page",{p_id:id,p_password_hash:passwordHash});
  if(!result.ok)return null;
  return await result.res.json();
}

window.TRPG39Cloud = { configured, createSharedPage, getSharedPage, updateSharedPage, deleteSharedPage, unlockSharedPage, editTokenFor };
})();
