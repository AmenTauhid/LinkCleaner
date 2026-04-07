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
  "vero_id", "nr_email_referer", "mkt_tok", "source"
];

const power = document.getElementById("power");
const domainEl = document.getElementById("domain");
const copyBtn = document.getElementById("copy-btn");
const copyText = document.getElementById("copy-text");

let enabled = true;
let cleanUrl = null;

// Load state
chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
  if (!res) return;
  enabled = res.enabled;
  updatePower();
});

// Check current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0] || !tabs[0].url) return;
  const raw = tabs[0].url;

  try {
    const url = new URL(raw);
    domainEl.textContent = url.hostname;

    let dirty = false;
    for (const p of TRACKING_PARAMS) {
      if (url.searchParams.has(p)) { dirty = true; url.searchParams.delete(p); }
    }
    if (dirty) cleanUrl = url.toString();
  } catch {
    domainEl.textContent = "---";
  }
});

// Power toggle
power.addEventListener("click", () => {
  enabled = !enabled;
  updatePower();
  chrome.runtime.sendMessage({ action: "toggle", enabled });
});

// Copy clean URL
copyBtn.addEventListener("click", () => {
  if (!cleanUrl) return;
  navigator.clipboard.writeText(cleanUrl);
  copyText.textContent = "Copied";
  copyBtn.classList.add("done");
  setTimeout(() => {
    copyText.textContent = "Copy clean URL";
    copyBtn.classList.remove("done");
  }, 1500);
});

function updatePower() {
  power.classList.toggle("off", !enabled);
}
