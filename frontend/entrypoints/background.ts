export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'proxyFetchFile') {
      const { url, token } = message;

      fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.blob();
        })
        .then(blob => {
          
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ success: true, base64: reader.result });
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.error('[RAE Background] Fetch failed:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; 
    }
  });
});