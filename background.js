// まだ一度も表示（フォアグラウンド化）されていないタブを管理
let pendingNewTabs = new Set();

// 1. タブが新しく作成されたとき（バックグラウンドで開かれた場合など）
chrome.tabs.onCreated.addListener((tab) => {
  // まだアクティブでないなら「未再生リスト」に入れる
  if (!tab.active) {
    pendingNewTabs.add(tab.id);
  }
});

// 2. タブの状態変化を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // audibleが「falseからtrueに変わった瞬間」だけ実行する
  if (changeInfo.audible === true) {
    stopAllOtherTabs(tabId);
  }
});

// 他のタブを停止・ミュートする共通関数
async function stopAllOtherTabs(activeTabId) {
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    // 1. 自分自身、または ID がないタブ（特殊ページなど）をスキップ
    if (tab.id === activeTabId || !tab.id) continue;

    // 2. URLが "chrome://" で始まるページは操作できないのでスキップ
    if (tab.url && tab.url.startsWith("chrome://")) continue;

    try {
      // ミュート処理（awaitで実行し、エラーをcatchできるようにする）
      await chrome.tabs.update(tab.id, { muted: true });
      
      // メッセージ送信（Content Scriptが読み込まれていない場合もエラーになるためcatch必須）
      await chrome.tabs.sendMessage(tab.id, { action: "pause" }).catch(() => {
        /* メッセージを受け取れる状態にないタブは無視してOK */
      });
    } catch (error) {
      // ここで「No tab with id」などのエラーを飲み込む
      console.warn(`タブ ${tab.id} の操作に失敗しました:`, error.message);
    }
  }
}

// 3. タブが切り替わった（表示された）ときの処理
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  
  // ミュート解除（共通）
  chrome.tabs.update(tabId, { muted: false });

  // もし「新しく開かれてから一度も表示されていないタブ」だったら再生する
  if (pendingNewTabs.has(tabId)) {
    console.log("新規タブを初めて表示：自動再生を開始します");
    chrome.tabs.sendMessage(tabId, { action: "play" }).catch(() => {});
    // リストから削除（二回目以降の表示では勝手に再生させないため）
    pendingNewTabs.delete(tabId);
  }
});

// タブが閉じられたらリストから削除
chrome.tabs.onRemoved.addListener((tabId) => {
  pendingNewTabs.delete(tabId);
});