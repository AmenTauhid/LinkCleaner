let settings = {};

// ─── Init ───

document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ action: "getSettings" }, (data) => {
    settings = data;
    applyTheme(data.theme);
    renderStats(data.stats);
    renderCustomParams(data.customParams);
    renderDefaultParams(data.defaultParams);
    renderWhitelist(data.whitelist);

    document.getElementById("show-notifications").checked = data.showNotifications;
    document.getElementById("notification-type").value = data.notificationType;
    document.getElementById("theme-select").value = data.theme;
  });

  bindEvents();
  localizeDOM();
});

// ─── Theme ───

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme || "system");
}

// ─── Stats ───

function renderStats(stats) {
  document.getElementById("stat-total").textContent = formatNum(stats.total);
  document.getElementById("stat-session").textContent = formatNum(stats.session);
  const domainCount = Object.keys(stats.byDomain).length;
  document.getElementById("stat-domains").textContent = formatNum(domainCount);

  const container = document.getElementById("domain-stats");
  const sorted = Object.entries(stats.byDomain).sort((a, b) => b[1] - a[1]).slice(0, 20);

  if (sorted.length === 0) {
    container.innerHTML = `<div class="domain-empty">${chrome.i18n.getMessage("statsEmpty") || "No data yet"}</div>`;
    return;
  }

  container.innerHTML = sorted.map(([domain, count]) =>
    `<div class="domain-row">
      <span class="domain-name">${escapeHtml(domain)}</span>
      <span class="domain-count">${formatNum(count)}</span>
    </div>`
  ).join("");
}

// ─── Custom parameters ───

function renderCustomParams(params) {
  const container = document.getElementById("custom-params-list");
  container.innerHTML = params.map((p, i) =>
    `<span class="tag">${escapeHtml(p)}<button class="remove-tag" data-index="${i}" data-type="param">&times;</button></span>`
  ).join("");
}

function renderDefaultParams(params) {
  const container = document.getElementById("default-params-list");
  container.innerHTML = params.map(p =>
    `<span class="tag">${escapeHtml(p)}</span>`
  ).join("");
}

// ─── Whitelist ───

function renderWhitelist(domains) {
  const container = document.getElementById("whitelist-list");
  container.innerHTML = domains.map((d, i) =>
    `<span class="tag">${escapeHtml(d)}<button class="remove-tag" data-index="${i}" data-type="domain">&times;</button></span>`
  ).join("");
}

// ─── Event bindings ───

function bindEvents() {
  // Add custom param
  document.getElementById("add-param").addEventListener("click", addParam);
  document.getElementById("new-param").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addParam();
  });

  // Add whitelist domain
  document.getElementById("add-domain").addEventListener("click", addDomain);
  document.getElementById("new-domain").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDomain();
  });

  // Remove tags (delegated)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-tag");
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    if (btn.dataset.type === "param") removeParam(index);
    if (btn.dataset.type === "domain") removeDomain(index);
  });

  // Reset stats
  document.getElementById("reset-stats").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "resetStats" }, () => {
      renderStats({ total: 0, session: 0, byDomain: {} });
    });
  });

  // Notifications
  document.getElementById("show-notifications").addEventListener("change", (e) => {
    saveOption("showNotifications", e.target.checked);
  });
  document.getElementById("notification-type").addEventListener("change", (e) => {
    saveOption("notificationType", e.target.value);
  });

  // Theme
  document.getElementById("theme-select").addEventListener("change", (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    saveOption("theme", theme);
  });

  // Export
  document.getElementById("export-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "exportSettings" }, ({ data }) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "link-cleaner-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // Import
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        chrome.runtime.sendMessage({ action: "importSettings", data }, () => {
          // Reload to reflect new settings
          chrome.runtime.sendMessage({ action: "getSettings" }, (fresh) => {
            settings = fresh;
            applyTheme(fresh.theme);
            renderCustomParams(fresh.customParams);
            renderWhitelist(fresh.whitelist);
            document.getElementById("show-notifications").checked = fresh.showNotifications;
            document.getElementById("notification-type").value = fresh.notificationType;
            document.getElementById("theme-select").value = fresh.theme;
          });
        });
      } catch {
        alert("Invalid settings file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}

// ─── Actions ───

function addParam() {
  const input = document.getElementById("new-param");
  const value = input.value.trim().toLowerCase();
  if (!value) return;

  const params = settings.customParams || [];
  if (params.includes(value) || (settings.defaultParams || []).includes(value)) return;

  params.push(value);
  input.value = "";
  settings.customParams = params;
  renderCustomParams(params);
  chrome.runtime.sendMessage({ action: "updateSettings", settings: { customParams: params } });
}

function removeParam(index) {
  const params = settings.customParams || [];
  params.splice(index, 1);
  settings.customParams = params;
  renderCustomParams(params);
  chrome.runtime.sendMessage({ action: "updateSettings", settings: { customParams: params } });
}

function addDomain() {
  const input = document.getElementById("new-domain");
  let value = input.value.trim().toLowerCase();
  if (!value) return;

  // Strip protocol and path
  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const whitelist = settings.whitelist || [];
  if (whitelist.includes(value)) return;

  whitelist.push(value);
  input.value = "";
  settings.whitelist = whitelist;
  renderWhitelist(whitelist);
  chrome.runtime.sendMessage({ action: "updateSettings", settings: { whitelist } });
}

function removeDomain(index) {
  const whitelist = settings.whitelist || [];
  whitelist.splice(index, 1);
  settings.whitelist = whitelist;
  renderWhitelist(whitelist);
  chrome.runtime.sendMessage({ action: "updateSettings", settings: { whitelist } });
}

function saveOption(key, value) {
  settings[key] = value;
  chrome.runtime.sendMessage({ action: "updateSettings", settings: { [key]: value } });
}

// ─── i18n ───

function localizeDOM() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
}

// ─── Helpers ───

function formatNum(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
