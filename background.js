const RULE_ID = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true }, (data) => {
    if (data.enabled) {
      enableRules();
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle") {
    if (message.enabled) {
      enableRules();
    } else {
      disableRules();
    }
    sendResponse({ success: true });
  }
  if (message.action === "getStatus") {
    chrome.storage.local.get({ enabled: true }, (data) => {
      sendResponse({ enabled: data.enabled });
    });
    return true; // keep channel open for async response
  }
});

function enableRules() {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: ["tracking_rules"]
  });
  chrome.storage.local.set({ enabled: true });
  chrome.action.setIcon({
    path: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  });
}

function disableRules() {
  chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ["tracking_rules"]
  });
  chrome.storage.local.set({ enabled: false });
  chrome.action.setIcon({
    path: {
      "16": "icons/icon16-off.png",
      "48": "icons/icon48-off.png",
      "128": "icons/icon128-off.png"
    }
  });
}
