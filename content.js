// YouTube Pro Enhancer Content Script

let isPanelOpen = false;
let enableAntiAutoPause = true;
let enableHideShorts = true;
let enableRedirectShorts = true;

const stats = {
  blockedPauses: 0,
  redirectedShorts: 0
};

let currentVideoId = "";

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Logger utility
const log = (msg, type = 'info') => {
  const logContainer = document.querySelector('.yt-pro-logs');
  if (!logContainer) return;
  const item = document.createElement('div');
  item.className = `yt-pro-log-item ${type}`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  item.innerText = `[${time}] ${msg}`;
  logContainer.appendChild(item);
  logContainer.scrollTop = logContainer.scrollHeight;
};

// Extract Video ID from URL
const getVideoId = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
};

// Check for YouTube's "Are you still watching?" popup and click yes
const checkAutoPause = () => {
  if (!enableAntiAutoPause) return;
  
  // yt-confirm-dialog-renderer is the actual element containing the confirmation dialog
  const dialog = document.querySelector('yt-confirm-dialog-renderer');
  if (dialog) {
    const isVisible = window.getComputedStyle(dialog).display !== 'none' && dialog.offsetHeight > 0;
    if (isVisible) {
      const text = dialog.innerText || "";
      const isAutoPauseDialog = /tiếp tục xem|continue watching|still watching|tạm dừng/i.test(text);
      
      if (isAutoPauseDialog) {
        // Find the confirm button specifically inside the confirm dialog
        const confirmBtn = dialog.querySelector('#confirm-button button, yt-button-renderer#confirm-button button');
        if (confirmBtn) {
          confirmBtn.click();
          
          // Also resume play if paused
          const video = document.querySelector('video');
          if (video && video.paused) {
            video.play();
          }
          
          stats.blockedPauses++;
          updateUI();
          log('Đã chặn tự động dừng video (Are you still watching)!', 'success');
        }
      }
    }
  }
};

// Update CSS visibility class for blocking Shorts in sidebar/feeds
const updateShortsVisibility = () => {
  if (enableHideShorts) {
    document.documentElement.classList.add('yt-hide-shorts');
  } else {
    document.documentElement.classList.remove('yt-hide-shorts');
  }
};

// UI Panel Creation
const createPanel = () => {
  if (document.getElementById('yt-pro-panel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'yt-pro-panel';
  panel.style.display = 'none'; // Hidden by default, controlled by background.js click
  
  panel.innerHTML = `
    <div class="yt-pro-header">
      <div class="yt-pro-title-container">
        <span class="yt-pro-sparkle">✦</span>
        <span class="yt-pro-title">YouTube Pro Enhancer</span>
      </div>
      <button class="yt-pro-toggle-btn" id="yt-pro-close-btn" title="Ẩn bảng điều khiển">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="yt-pro-body">
      <!-- Stats -->
      <div class="yt-pro-stats-grid">
        <div class="yt-pro-stat-card">
          <span class="yt-pro-stat-num" id="yt-stat-shorts">0</span>
          <span class="yt-pro-stat-label">Shorts Đã Chuyển</span>
        </div>
        <div class="yt-pro-stat-card">
          <span class="yt-pro-stat-num" id="yt-stat-pause">0</span>
          <span class="yt-pro-stat-label">Dừng Bị Chặn</span>
        </div>
      </div>
      
      <!-- Option Checkboxes -->
      <div class="yt-pro-options">
        <label class="yt-pro-option-row">
          <input type="checkbox" id="yt-chk-pause" class="yt-pro-checkbox" checked>
          <span>Chặn tự động dừng video (Keep Play)</span>
        </label>
        <label class="yt-pro-option-row">
          <input type="checkbox" id="yt-chk-hide-shorts" class="yt-pro-checkbox" checked>
          <span>Ẩn hoàn toàn Shorts (Hide-Shorts)</span>
        </label>
        <label class="yt-pro-option-row">
          <input type="checkbox" id="yt-chk-redirect-shorts" class="yt-pro-checkbox" checked>
          <span>Tự động chuyển hướng Shorts (Redirect)</span>
        </label>
      </div>
      
      <!-- Logs Toggle -->
      <div style="display: flex; justify-content: flex-end;">
        <button class="yt-pro-btn yt-pro-btn-secondary" id="yt-pro-toggle-log-btn" style="padding: 4px 8px; font-size: 10px; width: auto; box-shadow: 2px 2px 0px #ea4335; margin-top: 4px; border: 2px solid #ffffff; background: #1e1e1e; color: #ffffff; font-family: inherit; font-weight: 900; text-transform: uppercase; cursor: pointer;">
          Hiện nhật ký
        </button>
      </div>

      <!-- Logs -->
      <div class="yt-pro-logs" style="display: none;">
        <div class="yt-pro-log-item info">[Hệ thống] Đã kích hoạt YT Pro Enhancer.</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Listeners
  const closeBtn = panel.querySelector('#yt-pro-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = 'none';
  });
  
  const toggleLogBtn = panel.querySelector('#yt-pro-toggle-log-btn');
  toggleLogBtn.addEventListener('click', () => {
    const logBox = panel.querySelector('.yt-pro-logs');
    if (logBox.style.display === 'none') {
      logBox.style.display = 'flex';
      toggleLogBtn.innerText = 'Ẩn nhật ký';
    } else {
      logBox.style.display = 'none';
      toggleLogBtn.innerText = 'Hiện nhật ký';
    }
  });
  
  // Toggles setup
  const chkPause = panel.querySelector('#yt-chk-pause');
  chkPause.addEventListener('change', (e) => {
    enableAntiAutoPause = e.target.checked;
    log(`Chặn tự động dừng đã ${enableAntiAutoPause ? 'bật' : 'tắt'}.`, 'warning');
  });
  
  const chkHide = panel.querySelector('#yt-chk-hide-shorts');
  chkHide.addEventListener('change', (e) => {
    enableHideShorts = e.target.checked;
    updateShortsVisibility();
    log(`Ẩn hoàn toàn Shorts đã ${enableHideShorts ? 'bật' : 'tắt'}.`, 'warning');
  });
  
  const chkRedirect = panel.querySelector('#yt-chk-redirect-shorts');
  chkRedirect.addEventListener('change', (e) => {
    enableRedirectShorts = e.target.checked;
    log(`Tự động chuyển hướng Shorts đã ${enableRedirectShorts ? 'bật' : 'tắt'}.`, 'warning');
  });
};

const updateUI = () => {
  const shortsNum = document.getElementById('yt-stat-shorts');
  const pauseNum = document.getElementById('yt-stat-pause');
  
  if (shortsNum) shortsNum.innerText = stats.redirectedShorts;
  if (pauseNum) pauseNum.innerText = stats.blockedPauses;
};

// Main loop initialization
const init = () => {
  createPanel();
  updateShortsVisibility();
  
  // Monitor video change (SPA navigation) and run checks
  setInterval(() => {
    // 1. YouTube Shorts Redirect
    if (enableRedirectShorts && window.location.pathname.startsWith('/shorts/')) {
      const videoId = window.location.pathname.split('/shorts/')[1].split('?')[0];
      if (videoId) {
        log('Phát hiện Shorts. Đang chuyển hướng thành video thông thường...', 'info');
        stats.redirectedShorts++;
        updateUI();
        window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
        return; // Redirect resets window location, exit current tick
      }
    }
    
    // 2. Video Change Detection
    const videoId = getVideoId();
    if (videoId && videoId !== currentVideoId) {
      currentVideoId = videoId;
      log(`Đang phát video mới: ${videoId}`, 'info');
    }
    
    checkAutoPause();
  }, 1000);
  
  // Toggle message listener from background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_panel") {
      const panel = document.getElementById('yt-pro-panel');
      if (panel) {
        if (panel.style.display === 'none') {
          panel.style.display = 'block';
          log('YT Pro Enhancer đã hiển thị.', 'info');
        } else {
          panel.style.display = 'none';
        }
      }
    }
  });
};

// Run
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}