chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const mediaElements = document.querySelectorAll("video, audio");

  if (request.action === "pause") {
    mediaElements.forEach(media => {
      if (!media.paused) media.pause();
    });
  } else if (request.action === "play") {
    mediaElements.forEach(media => {
      media.play().catch(() => {
        console.log("自動再生がブロックされました。クリックが必要です。");
      });
    });
  }
});