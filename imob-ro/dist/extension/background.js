chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["inject.js"],
    });
  } catch (e) {
    console.error("Injection failed", e);
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert("Failed to inject extractor"),
    });
  }
});
