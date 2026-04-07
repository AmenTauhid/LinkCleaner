const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status-text");
const sessionCount = document.getElementById("session-count");
const totalCount = document.getElementById("total-count");
const cleanBtn = document.getElementById("clean-current");
const optionsLink = document.getElementById("open-options");

// ─── Load state ───

chrome.runtime.sendMessage({ action: "getStatus" }, (data) => {
  if (!data) return;

  toggle.checked = data.enabled;
  statusText.textContent = data.enabled
    ? (chrome.i18n.getMessage("statusActive") || "Active")
    : (chrome.i18n.getMessage("statusPaused") || "Paused");

  sessionCount.textContent = formatNum(data.stats.session);
  totalCount.textContent = formatNum(data.stats.total);

  if (data.theme) {
    document.body.setAttribute("data-theme", data.theme);
  }
});

// ─── Toggle ───

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled
    ? (chrome.i18n.getMessage("statusActive") || "Active")
    : (chrome.i18n.getMessage("statusPaused") || "Paused");
  chrome.runtime.sendMessage({ action: "toggle", enabled });
});

// ─── Clean current URL ───

cleanBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.runtime.sendMessage({ action: "cleanURL", url: tabs[0].url }, ({ url }) => {
      if (url !== tabs[0].url) {
        navigator.clipboard.writeText(url);
        cleanBtn.textContent = chrome.i18n.getMessage("copied") || "Copied!";
        cleanBtn.classList.add("copied");
        setTimeout(() => {
          cleanBtn.textContent = chrome.i18n.getMessage("cleanCurrent") || "Clean Current URL";
          cleanBtn.classList.remove("copied");
        }, 1500);
      } else {
        cleanBtn.textContent = chrome.i18n.getMessage("alreadyClean") || "Already clean!";
        setTimeout(() => {
          cleanBtn.textContent = chrome.i18n.getMessage("cleanCurrent") || "Clean Current URL";
        }, 1500);
      }
    });
  });
});

// ─── Options link ───

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ─── i18n ───

document.querySelectorAll("[data-i18n]").forEach((el) => {
  const msg = chrome.i18n.getMessage(el.dataset.i18n);
  if (msg) el.textContent = msg;
});

// ─── Helpers ───

function formatNum(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}
