document.addEventListener('DOMContentLoaded', () => {
  const bypassCheckbox = document.getElementById('bypass-autopause');
  const shortsCheckbox = document.getElementById('hide-shorts');
  const statusText = document.getElementById('status-text');
  const saveBtn = document.getElementById('save-btn');

  // Load saved configurations (default to true)
  chrome.storage.local.get({
    bypassAutopause: true,
    hideShorts: true
  }, (items) => {
    bypassCheckbox.checked = items.bypassAutopause;
    shortsCheckbox.checked = items.hideShorts;
    updateStatusText();
  });

  // Save changes instantly on input toggling
  const saveSettings = () => {
    const bypassVal = bypassCheckbox.checked;
    const shortsVal = shortsCheckbox.checked;
    
    chrome.storage.local.set({
      bypassAutopause: bypassVal,
      hideShorts: shortsVal
    }, () => {
      updateStatusText();
    });
  };

  const updateStatusText = () => {
    const bypassVal = bypassCheckbox.checked;
    const shortsVal = shortsCheckbox.checked;
    const dot = document.querySelector('.status-dot');
    
    if (bypassVal || shortsVal) {
      statusText.textContent = "Đang bảo vệ";
      dot.style.backgroundColor = '#39FF14'; // Green
    } else {
      statusText.textContent = "Tắt bảo vệ";
      dot.style.backgroundColor = '#FF3131'; // Red
    }
  };

  bypassCheckbox.addEventListener('change', saveSettings);
  shortsCheckbox.addEventListener('change', saveSettings);

  // Close popup and show animation feedback when clicking "Lưu lại"
  saveBtn.addEventListener('click', () => {
    saveSettings();
    saveBtn.textContent = "Đã lưu!";
    saveBtn.style.transform = "translate(2px, 2px)";
    saveBtn.style.boxShadow = "1px 1px 0px #000";
    setTimeout(() => {
      window.close();
    }, 300);
  });
});
