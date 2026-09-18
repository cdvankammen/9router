/**
 * Trae (ByteDance marscode) usage — quota from entitlement endpoints.
 *
 * Trae usage data is entitlement-pack based, NOT a simple {used, limit} API.
 * Reference implementation: jlcodes99/cockpit-tools (Trae suite) and
 * missuo/tokens (trae.rs) — both verified against the live Trae backend.
 *
 * Endpoints (POST, body {} except ent_usage which sends {"require_usage": true}):
 *   {origin}/trae/api/v1/pay/ide_user_pay_status   → code, user_pay_identity_str (plan),
 *                                                     detail.subscription_renew_time (reset)
 *   {origin}/trae/api/v1/pay/ide_user_ent_usage    → user_entitlement_pack_list[] with
 *                                                     entitlement_base_info.quota + usage
 *   CN (api.trae.cn) uses v2 paths:
 *   {origin}/trae/api/v2/pay/ide_user_pay_status
 *   {origin}/trae/api/v2/pay/ide_user_ent_usage
 *   {origin}/trae/api/v2/pay/user_current_entitlement_list (CN fallback for packs)
 *
 * Auth: Authorization: Cloud-IDE-JWT <access token>
 * Origins: grow-normal.trae.ai (default) / growsg-normal.trae.ai (SG+US) /
 *          grow-normal.traeapi.us (USTTP) / api.trae.cn (CN)
 *
 * Quota model (per selected pack, priority 6→4→1→9→8→0, product_type 3 excluded):
 * - total:   entitlement_base_info.quota.basic_usage_limit (or basic_quota)
 * - used:    usage.basic_usage_amount (or basic_usage)
 * - bonus:   entitlement_base_info.quota.bonus_usage_limit / usage.bonus_usage_amount
 * - paygo:   usage.pay_go_amount (on-demand $, shown when > 0)
 * - reset:   entitlement_base_info.end_time (+1) OR quota_reset_time OR next_reset_time
 * - plan:    usage.identity_str OR user_pay_identity_str
 * - product_type: 0=Free, 1=Pro, 3=On-Demand(excluded), 4=Pro+, 6=Ultra, 8=Lite, 9=Trial
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { parseResetTime, toFiniteNumber } from "./shared.js";

const API_ORIGINS = {
  NORMAL: "https://grow-normal.trae.ai",
  SG: "https://growsg-normal.trae.ai",
  US: "https://growsg-normal.trae.ai",
  USTTP: "https://grow-normal.traeapi.us",
  CN: "https://api.trae.cn",
};

// CN uses v2 paths; international uses v1.
const PAY_STATUS_PATH_V1 = "/trae/api/v1/pay/ide_user_pay_status";
const ENT_USAGE_PATH_V1 = "/trae/api/v1/pay/ide_user_ent_usage";
const PAY_STATUS_PATH_V2 = "/trae/api/v2/pay/ide_user_pay_status";
const ENT_USAGE_PATH_V2 = "/trae/api/v2/pay/ide_user_ent_usage";
const CN_ENT_LIST_PATH_V2 = "/trae/api/v2/pay/user_current_entitlement_list";

/** Map providerSpecificData.aiRegion/region → store region key (SG/US/USTTP/CN). */
function toStoreRegion(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "cn" || value === "china-north" || value.includes("cn")) return "CN";
  if (value === "sg" || value === "singapore-central" || value === "singapore" || value.includes("sg")) return "SG";
  if (value === "usttp" || value.includes("usttp")) return "USTTP";
  if (value === "us" || value === "us-east" || value === "us-east-1" || value === "us-west" || value.startsWith("us")) return "US";
  return "NORMAL";
}

function originForStoreRegion(storeRegion) {
  switch (storeRegion) {
    case "SG": return API_ORIGINS.SG;
    case "US": return API_ORIGINS.US;
    case "USTTP": return API_ORIGINS.USTTP;
    case "CN": return API_ORIGINS.CN;
    default: return API_ORIGINS.NORMAL;
  }
}

function pathsForStoreRegion(storeRegion) {
  if (storeRegion === "CN") {
    return { payStatusPath: PAY_STATUS_PATH_V2, entUsagePath: ENT_USAGE_PATH_V2, entListPath: CN_ENT_LIST_PATH_V2 };
  }
  return { payStatusPath: PAY_STATUS_PATH_V1, entUsagePath: ENT_USAGE_PATH_V1, entListPath: null };
}

/** Product types (3 = On-Demand/promo excluded). Priority matches cockpit-tools. */
const PRODUCT_TYPE_PRIORITY = [6, 4, 1, 9, 8, 0];
const PRODUCT_TYPE_LABEL = {
  6: "Ultra",
  4: "Pro+",
  1: "Pro",
  9: "Trial",
  8: "Lite",
  0: "Free",
};

function productTypeOf(pack) {
  const raw = pack?.entitlement_base_info?.product_type ?? pack?.product_type;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return -1;
}

/** Pick the best pack: priority 6→4→1→9→8→0, product_type 3 excluded. */
function pickPreferredPack(packList) {
  const validPacks = (packList || []).filter((pack) => productTypeOf(pack) !== 3);
  if (validPacks.length === 0) return null;

  for (const productType of PRODUCT_TYPE_PRIORITY) {
    const found = validPacks.find((pack) => productTypeOf(pack) === productType);
    if (found) return found;
  }
  return validPacks[0];
}

function numberAt(pack, paths) {
  for (const path of paths) {
    let node = pack;
    let ok = true;
    for (const key of path) {
      if (!node || typeof node !== "object" || node[key] === undefined) { ok = false; break; }
      node = node[key];
    }
    if (!ok) continue;
    const value = node;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeTimestamp(raw) {
  if (typeof raw !== "number" || raw <= 0) return null;
  const value = raw > 10_000_000_000 ? raw / 1000 : raw;
  return value + 1; // cockpit-tools adds +1 to end_time
}

function stringAt(pack, paths) {
  for (const path of paths) {
    let node = pack;
    let ok = true;
    for (const key of path) {
      if (!node || typeof node !== "object" || node[key] === undefined) { ok = false; break; }
      node = node[key];
    }
    if (!ok) continue;
    if (typeof node === "string" && node.trim()) return node.trim();
  }
  return null;
}

function makeQuotaRow(name, usedRaw, limitRaw, resetAt = null) {
  const used = Math.max(0, toFiniteNumber(usedRaw, 0));

  if (limitRaw === -1 || (typeof limitRaw === "string" && limitRaw.trim() === "-1")) {
    return {
      used,
      total: 0,
      remainingPercentage: 100,
      resetAt: resetAt || null,
      unlimited: true,
    };
  }

  const total = toFiniteNumber(limitRaw, 0);
  if (total <= 0) {
    return {
      used,
      total: 0,
      remainingPercentage: 0,
      resetAt: resetAt || null,
      unlimited: false,
    };
  }

  const clampedUsed = Math.min(used, total);
  const remaining = Math.max(0, total - clampedUsed);
  return {
    used: clampedUsed,
    total,
    remainingPercentage: (remaining / total) * 100,
    resetAt: resetAt || null,
    unlimited: false,
  };
}

function planLabelFrom(pack, payStatus) {
  const identity = stringAt(pack, [["usage", "identity_str"]]);
  if (identity) return identity;
  const payIdentity = stringAt(payStatus, [
    ["user_pay_identity_str"],
    ["data", "user_pay_identity_str"],
  ]);
  if (payIdentity) return payIdentity;
  const type = productTypeOf(pack);
  return PRODUCT_TYPE_LABEL[type] || "Trae";
}

function resetAtFrom(pack, payStatus) {
  let raw = numberAt(pack, [
    ["entitlement_base_info", "end_time"],
    ["entitlement_base_info", "quota_reset_time"],
    ["next_reset_time"],
  ]);
  if (raw == null) {
    raw = numberAt(payStatus, [
      ["detail", "subscription_renew_time"],
      ["data", "detail", "subscription_renew_time"],
    ]);
  }
  if (raw == null || raw <= 0) return null;
  const ts = normalizeTimestamp(raw);
  return ts ? parseResetTime(ts) : null;
}

/**
 * Build quotas from the entitlement usage response.
 * Returns { plan, quotas } where quotas maps name → row.
 */
function buildQuotas(entUsage, payStatus) {
  const packs = entUsage?.user_entitlement_pack_list ?? entUsage?.data?.user_entitlement_pack_list;
  if (!Array.isArray(packs) || packs.length === 0) return null;

  const pack = pickPreferredPack(packs);
  if (!pack) return null;

  const plan = planLabelFrom(pack, payStatus);
  const resetAt = resetAtFrom(pack, payStatus);

  const basicUsed = numberAt(pack, [["usage", "basic_usage_amount"], ["usage", "basic_usage"]]);
  const basicTotal = numberAt(pack, [
    ["entitlement_base_info", "quota", "basic_usage_limit"],
    ["entitlement_base_info", "quota", "basic_quota"],
  ]);
  const bonusUsed = numberAt(pack, [["usage", "bonus_usage_amount"], ["usage", "bonus_usage"]]);
  const bonusTotal = numberAt(pack, [["entitlement_base_info", "quota", "bonus_usage_limit"]]);
  const payGo = numberAt(pack, [["usage", "pay_go_amount"]]);

  const quotas = {};

  if (basicTotal != null && basicTotal > 0) {
    quotas["Basic Usage"] = makeQuotaRow("Basic Usage", basicUsed, basicTotal, resetAt);
  } else if (basicUsed != null && basicUsed > 0 && basicTotal == null) {
    quotas["Basic Usage"] = makeQuotaRow("Basic Usage", basicUsed, 0, resetAt);
  }

  if (bonusTotal != null && bonusTotal > 0) {
    quotas["Bonus Usage"] = makeQuotaRow("Bonus Usage", bonusUsed, bonusTotal, resetAt);
  } else if (bonusUsed != null && bonusUsed > 0 && bonusTotal == null) {
    quotas["Bonus Usage"] = makeQuotaRow("Bonus Usage", bonusUsed, 0, resetAt);
  }

  if (payGo != null && payGo > 0) {
    quotas["On-Demand Usage"] = {
      used: toFiniteNumber(payGo, 0),
      total: 0,
      remainingPercentage: 0,
      resetAt: null,
      unlimited: false,
      note: "Pay-as-you-go spend (USD)",
    };
  }

  if (Object.keys(quotas).length === 0) return null;
  return { plan, quotas };
}

async function postTraeJson(origin, path, accessToken, body = {}) {
  const url = `${origin.replace(/\/+$/, "")}${path}`;
  const response = await proxyAwareFetch(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Trae/1.0.0 antigravity-cockpit-tools",
        Authorization: `Cloud-IDE-JWT ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    },
    null,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Trae ${path} returned ${response.status}: ${text.slice(0, 200)}`);
  }

  return await response.json().catch(() => null);
}

function isSuccessResponse(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (raw.code === undefined || raw.code === null) return true;
  return raw.code === 0;
}

/**
 * @param {string|null|undefined} accessToken - Cloud-IDE-JWT access token
 * @param {object|null|undefined} providerSpecificData - { aiRegion, region, ... }
 * @param {object|null|undefined} proxyOptions
 */
export async function getTraeUsage(accessToken = null, providerSpecificData = {}, proxyOptions = null) {
  const psd = providerSpecificData || {};

  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
    return { message: "Trae access token not available. Re-connect Trae to view quota." };
  }

  const rawRegion = psd.aiRegion || psd.region;
  const storeRegion = rawRegion ? toStoreRegion(rawRegion) : "NORMAL";
  const origin = originForStoreRegion(storeRegion);
  const paths = pathsForStoreRegion(storeRegion);
  const token = accessToken.trim();

  let lastError = null;

  // 1) Pay status → plan identity + subscription reset.
  let payStatus = null;
  try {
    const response = await postTraeJson(origin, paths.payStatusPath, token);
    if (isSuccessResponse(response)) payStatus = response;
  } catch (error) {
    lastError = error; // non-fatal; ent_usage may still work
  }

  // 2) Entitlement usage → quota rows (primary source).
  //    Body {"require_usage": true} matches cockpit-tools refresh exactly.
  let response;
  try {
    response = await postTraeJson(origin, paths.entUsagePath, token, { require_usage: true });
  } catch (error) {
    lastError = error;
  }

  if (response && isSuccessResponse(response)) {
    const built = buildQuotas(response, payStatus);
    if (built) {
      return { plan: built.plan, quotas: built.quotas };
    }

    // Response OK but no pack data — try CN entitlement list fallback (CN only).
    if (paths.entListPath) {
      try {
        const listResponse = await postTraeJson(origin, paths.entListPath, token);
        if (isSuccessResponse(listResponse)) {
          const listBuilt = buildQuotas(
            listResponse?.data ?? listResponse?.user_current_entitlement_list ?? listResponse,
            payStatus,
          );
          if (listBuilt) return { plan: listBuilt.plan, quotas: listBuilt.quotas };
        }
      } catch { /* fall through */ }
    }
  } else if (response) {
    lastError = new Error(`Trae ${paths.entUsagePath} code=${response?.code}`);
  }

  // 3) Pay status alone may carry plan identity.
  if (payStatus && isSuccessResponse(payStatus)) {
    const identity = stringAt(payStatus, [
      ["user_pay_identity_str"],
      ["data", "user_pay_identity_str"],
    ]);
    return {
      plan: identity || "Trae",
      message: "Trae connected. No entitlement quota data returned for this account.",
      quotas: {},
    };
  }

  if (lastError) {
    const statusMatch = lastError?.message?.match(/\b(4\d\d)\b/);
    if (statusMatch) {
      return {
        plan: "Trae",
        message:
          statusMatch[1] === "401" || statusMatch[1] === "403"
            ? "Trae authentication failed. Sign in again from the dashboard or Trae editor."
            : `Trae usage API error (${statusMatch[1]}).`,
      };
    }
    return { message: `Trae usage error: ${lastError.message}` };
  }

  return {
    plan: "Trae",
    message: "Trae connected. No quota data returned for this account.",
    quotas: {},
  };
}