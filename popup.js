const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status-text");

chrome.runtime.sendMessage({ action: "getStatus" }, (response) => {
  if (response) {
    toggle.checked = response.enabled;
    statusText.textContent = response.enabled ? "Active" : "Paused";
  }
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled ? "Active" : "Paused";
  chrome.runtime.sendMessage({ action: "toggle", enabled });
});
