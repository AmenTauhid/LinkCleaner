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
  "vero_id", "nr_email_referer", "mkt_tok"
];

const toggle = document.getElementById("toggle");
const dot = document.getElementById("dot");
const statusText = document.getElementById("status-text");
const currentSection = document.getElementById("current");
const currentUrl = document.getElementById("current-url");
const copyBtn = document.getElementById("copy-btn");

let cleanUrl = null;

// Load state
chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
  if (!res) return;
  toggle.checked = res.enabled;
  updateStatus(res.enabled);
});

// Check current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0] || !tabs[0].url) return;
  const raw = tabs[0].url;

  try {
    const url = new URL(raw);
    let dirty = false;
    for (const p of TRACKING_PARAMS) {
      if (url.searchParams.has(p)) { dirty = true; url.searchParams.delete(p); }
    }
    if (dirty) {
      cleanUrl = url.toString();
      currentUrl.textContent = cleanUrl;
      currentSection.hidden = false;
    }
  } catch {}
});

// Toggle
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  updateStatus(enabled);
  chrome.runtime.sendMessage({ action: "toggle", enabled });
});

// Copy
copyBtn.addEventListener("click", () => {
  if (!cleanUrl) return;
  navigator.clipboard.writeText(cleanUrl);
  copyBtn.textContent = "Copied";
  copyBtn.classList.add("done");
  setTimeout(() => {
    copyBtn.textContent = "Copy clean URL";
    copyBtn.classList.remove("done");
  }, 1500);
});

function updateStatus(enabled) {
  dot.classList.toggle("off", !enabled);
  statusText.textContent = enabled ? "Cleaning links" : "Paused";
}
