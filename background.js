const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_cid", "utm_reader", "utm_name", "utm_referrer", "utm_social", "utm_social-type",
  "fbclid", "fb_action_ids", "fb_action_types", "fb_ref", "fb_source",
  "gclid", "gclsrc", "msclkid",
  "hsa_cam", "hsa_grp", "hsa_mt", "hsa_src", "hsa_ad", "hsa_acc",
  "hsa_net", "hsa_ver", "hsa_la", "hsa_ol", "hsa_kw",
  "mc_cid", "mc_eid",
  "_ga", "_gl", "_hsenc", "_hsmi", "_openstat",
  "igshid", "si", "ref", "ref_src", "ref_url",
  "yclid", "twclid", "ttclid", "dclid",
  "soc_src", "soc_trk", "s_kwcid", "ef_id",
  "vero_id", "nr_email_referer", "mkt_tok", "source", "gh_src"
];

// ─── Setup ───

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
    if (!enabled) disableRules();
  });
  chrome.contextMenus.create({
    id: "copy-clean-url",
    title: "Copy clean URL",
    contexts: ["link", "page"]
  });
});

// ─── Context menu ───

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const raw = info.linkUrl || info.pageUrl;
  if (!raw) return;

  try {
    const url = new URL(raw);
    for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
    const clean = url.toString();

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => navigator.clipboard.writeText(text),
      args: [clean]
    });
  } catch {}
});

// ─── Toggle ───

function enableRules() {
  chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ["tracking_rules"] });
  chrome.action.setIcon({
    path: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  });
}

function disableRules() {
  chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ["tracking_rules"] });
  chrome.action.setIcon({
    path: { "16": "icons/icon16-off.png", "48": "icons/icon48-off.png", "128": "icons/icon128-off.png" }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "toggle") {
    msg.enabled ? enableRules() : disableRules();
    chrome.storage.local.set({ enabled: msg.enabled });
  }
  if (msg.action === "getStatus") {
    chrome.storage.local.get({ enabled: true }, sendResponse);
    return true;
  }
});
