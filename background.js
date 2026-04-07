// ─── Default tracking parameters ───
const DEFAULT_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_cid", "utm_reader", "utm_name", "utm_referrer", "utm_social", "utm_social-type",
  "fbclid", "fb_action_ids", "fb_action_types", "fb_ref", "fb_source",
  "gclid", "gclsrc",
  "msclkid",
  "hsa_cam", "hsa_grp", "hsa_mt", "hsa_src", "hsa_ad", "hsa_acc",
  "hsa_net", "hsa_ver", "hsa_la", "hsa_ol", "hsa_kw",
  "mc_cid", "mc_eid",
  "_ga", "_gl", "_hsenc", "_hsmi", "_openstat",
  "igshid", "si", "ref", "ref_src", "ref_url",
  "yclid", "twclid", "ttclid", "dclid",
  "soc_src", "soc_trk", "s_kwcid", "ef_id",
  "vero_id", "nr_email_referer", "mkt_tok"
];

// ─── Known redirect wrappers ───
const REDIRECT_DOMAINS = {
  "l.facebook.com":      { path: "/l.php",        param: "u" },
  "lm.facebook.com":     { path: "/l.php",        param: "u" },
  "www.google.com":      { path: "/url",           param: "q" },
  "www.google.co.uk":    { path: "/url",           param: "q" },
  "www.google.ca":       { path: "/url",           param: "q" },
  "www.google.de":       { path: "/url",           param: "q" },
  "www.google.fr":       { path: "/url",           param: "q" },
  "click.linksynergy.com": { param: "murl" },
  "redirect.viglink.com":  { param: "u" },
  "steamcommunity.com":  { path: "/linkfilter/",   param: "url" },
  "exit.sc":             { param: "url" },
  "slack-redir.net":     { path: "/link",          param: "url" },
  "href.li":             { param: null },
  "t.umblr.com":         { path: "/redirect",      param: "z" },
  "out.reddit.com":      { param: "url" },
};

const DYNAMIC_RULE_ID = 1;
const tabCounts = new Map();

// ─── Initialization ───

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ["tracking_rules"]
  });
  await rebuildRules();
  setupContextMenu();

  const defaults = {
    enabled: true,
    customParams: [],
    whitelist: [],
    stats: { total: 0, session: 0, byDomain: {} },
    showNotifications: true,
    notificationType: "badge",
    theme: "system"
  };
  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const merged = { ...defaults, ...existing };
  await chrome.storage.local.set(merged);
});

chrome.runtime.onStartup.addListener(async () => {
  await rebuildRules();
  setupContextMenu();
  const { stats } = await chrome.storage.local.get({
    stats: { total: 0, session: 0, byDomain: {} }
  });
  stats.session = 0;
  await chrome.storage.local.set({ stats });
});

// ─── Dynamic rule management ───

async function rebuildRules() {
  const { enabled, customParams = [], whitelist = [] } =
    await chrome.storage.local.get(["enabled", "customParams", "whitelist"]);

  if (enabled === false) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [DYNAMIC_RULE_ID]
    });
    return;
  }

  const allParams = [...DEFAULT_PARAMS, ...customParams];
  const rule = {
    id: DYNAMIC_RULE_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { transform: { queryTransform: { removeParams: allParams } } }
    },
    condition: { resourceTypes: ["main_frame", "sub_frame"] }
  };

  if (whitelist.length > 0) {
    rule.condition.excludedRequestDomains = whitelist;
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [DYNAMIC_RULE_ID],
    addRules: [rule]
  });
}

// ─── Stats tracking ───

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const { enabled, whitelist = [], customParams = [] } =
    await chrome.storage.local.get(["enabled", "whitelist", "customParams"]);
  if (!enabled) return;

  try {
    const url = new URL(details.url);
    if (whitelist.some(d => url.hostname === d || url.hostname.endsWith("." + d))) return;

    const allParams = [...DEFAULT_PARAMS, ...customParams];
    let count = 0;
    for (const p of allParams) {
      if (url.searchParams.has(p)) count++;
    }
    if (count === 0) return;

    // Update persistent stats
    const { stats } = await chrome.storage.local.get({
      stats: { total: 0, session: 0, byDomain: {} }
    });
    stats.total += count;
    stats.session += count;
    stats.byDomain[url.hostname] = (stats.byDomain[url.hostname] || 0) + count;
    await chrome.storage.local.set({ stats });

    // Badge counter
    const prev = tabCounts.get(details.tabId) || 0;
    tabCounts.set(details.tabId, prev + count);
    chrome.action.setBadgeText({ text: String(prev + count), tabId: details.tabId });

    // Badge flash
    chrome.action.setBadgeBackgroundColor({ color: "#ff4444", tabId: details.tabId });
    setTimeout(() => {
      chrome.action.setBadgeBackgroundColor({ color: "#0078d4", tabId: details.tabId });
    }, 800);

    // Toast
    const { showNotifications, notificationType } = await chrome.storage.local.get({
      showNotifications: true, notificationType: "badge"
    });
    if (showNotifications && (notificationType === "toast" || notificationType === "both")) {
      try {
        chrome.tabs.sendMessage(details.tabId, {
          action: "showToast", count, domain: url.hostname
        });
      } catch {}
    }
  } catch {}
});

chrome.tabs.onRemoved.addListener((tabId) => tabCounts.delete(tabId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts.delete(tabId);
    chrome.action.setBadgeText({ text: "", tabId });
  }
});

// ─── Context menu ───

function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "copy-clean-url",
      title: chrome.i18n.getMessage("contextMenuCopyClean") || "Copy Clean URL",
      contexts: ["link"]
    });
    chrome.contextMenus.create({
      id: "copy-clean-current",
      title: chrome.i18n.getMessage("contextMenuCopyCleanCurrent") || "Copy Clean Page URL",
      contexts: ["page"]
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const raw = info.menuItemId === "copy-clean-url" ? info.linkUrl : info.pageUrl;
  if (!raw) return;

  const { customParams = [] } = await chrome.storage.local.get(["customParams"]);
  const clean = cleanURL(raw, customParams);

  try {
    await chrome.tabs.sendMessage(tab.id, { action: "copyToClipboard", text: clean });
  } catch {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (text) => navigator.clipboard.writeText(text),
      args: [clean]
    });
  }
});

// ─── URL cleaning ───

function cleanURL(urlString, customParams = []) {
  try {
    let url = new URL(urlString);
    const unwrapped = unwrapRedirect(url);
    if (unwrapped) url = new URL(unwrapped);

    const allParams = [...DEFAULT_PARAMS, ...customParams];
    for (const p of allParams) url.searchParams.delete(p);
    return url.toString();
  } catch {
    return urlString;
  }
}

function unwrapRedirect(url) {
  const cfg = REDIRECT_DOMAINS[url.hostname];
  if (!cfg) return null;
  if (cfg.path && !url.pathname.startsWith(cfg.path)) return null;

  if (cfg.param === null) {
    // href.li style: destination is the path
    const dest = url.pathname.substring(1) + url.search;
    return dest.startsWith("http") ? dest : null;
  }

  const dest = url.searchParams.get(cfg.param);
  if (!dest) return null;
  try { return decodeURIComponent(dest); } catch { return dest; }
}

// ─── Message handling ───

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "toggle":
      handleToggle(message.enabled).then(() => sendResponse({ success: true }));
      return true;

    case "getStatus":
      chrome.storage.local.get({
        enabled: true,
        stats: { total: 0, session: 0, byDomain: {} },
        theme: "system"
      }, sendResponse);
      return true;

    case "getDefaultParams":
      sendResponse({ params: DEFAULT_PARAMS });
      return;

    case "getSettings":
      chrome.storage.local.get({
        enabled: true, customParams: [], whitelist: [],
        stats: { total: 0, session: 0, byDomain: {} },
        showNotifications: true, notificationType: "badge", theme: "system"
      }, (data) => {
        data.defaultParams = DEFAULT_PARAMS;
        sendResponse(data);
      });
      return true;

    case "updateSettings":
      chrome.storage.local.set(message.settings, async () => {
        await rebuildRules();
        sendResponse({ success: true });
      });
      return true;

    case "resetStats":
      chrome.storage.local.set({
        stats: { total: 0, session: 0, byDomain: {} }
      }, () => sendResponse({ success: true }));
      return true;

    case "exportSettings":
      chrome.storage.local.get({
        customParams: [], whitelist: [],
        showNotifications: true, notificationType: "badge", theme: "system"
      }, (data) => sendResponse({ data }));
      return true;

    case "importSettings":
      const d = message.data;
      chrome.storage.local.set({
        customParams: d.customParams || [],
        whitelist: d.whitelist || [],
        showNotifications: d.showNotifications !== undefined ? d.showNotifications : true,
        notificationType: d.notificationType || "badge",
        theme: d.theme || "system"
      }, async () => {
        await rebuildRules();
        sendResponse({ success: true });
      });
      return true;

    case "cleanURL":
      chrome.storage.local.get({ customParams: [] }, ({ customParams }) => {
        sendResponse({ url: cleanURL(message.url, customParams) });
      });
      return true;
  }
});

async function handleToggle(enabled) {
  await chrome.storage.local.set({ enabled });

  if (enabled) {
    await rebuildRules();
    chrome.action.setIcon({
      path: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
    });
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [DYNAMIC_RULE_ID]
    });
    chrome.action.setIcon({
      path: { "16": "icons/icon16-off.png", "48": "icons/icon48-off.png", "128": "icons/icon128-off.png" }
    });
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) chrome.action.setBadgeText({ text: "", tabId: t.id });
  }
}
