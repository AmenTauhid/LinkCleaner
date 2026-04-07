const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

chrome.runtime.sendMessage({ action: "getStatus" }, (res) => {
  if (!res) return;
  toggle.checked = res.enabled;
  status.textContent = res.enabled ? "On" : "Off";
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  status.textContent = enabled ? "On" : "Off";
  chrome.runtime.sendMessage({ action: "toggle", enabled });
});
