// YouTube Pro-Enhancer Background Script

// Listen for clicks on the extension's toolbar icon
chrome.action.onClicked.addListener((tab) => {
  // Only execute if we are on YouTube
  if (!tab.url || tab.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_panel" }).catch((err) => {
      console.warn("Could not communicate with content script. Try reloading the YouTube page.", err);
    });
  }
});
