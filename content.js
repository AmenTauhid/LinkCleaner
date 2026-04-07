chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showToast") {
    showToast(`Removed ${message.count} tracking parameter${message.count !== 1 ? "s" : ""}`);
    sendResponse({ success: true });
  }

  if (message.action === "copyToClipboard") {
    navigator.clipboard.writeText(message.text).then(() => {
      showToast(chrome.i18n.getMessage("copiedToClipboard") || "Clean URL copied!");
    });
    sendResponse({ success: true });
  }
});

function showToast(text) {
  const existing = document.getElementById("link-cleaner-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "link-cleaner-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span class="lc-toast-icon">\u2714</span><span>${text}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("lc-toast-show"));

  setTimeout(() => {
    toast.classList.remove("lc-toast-show");
    toast.classList.add("lc-toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
