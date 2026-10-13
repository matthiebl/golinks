// Address-bar keyword: "go<space>foo bar" → go.mhiebl.com/?q=foo bar.
// Plain "go/foo" navigations are handled by the redirect rules in rules.json.
chrome.omnibox.onInputEntered.addListener((text) => {
  const targetUrl = `https://go.mhiebl.com/?q=${encodeURIComponent(text)}`;
  chrome.tabs.update({ url: targetUrl });
});
