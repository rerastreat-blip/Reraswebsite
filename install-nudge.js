(function () {
  var DISMISS_KEY = 'rera_install_dismissed';

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function wasDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (e) {}
  }

  if (isStandalone() || wasDismissed()) return;

  var style = document.createElement('style');
  style.textContent =
    '.install-pill{position:fixed;left:50%;bottom:20px;transform:translate(-50%,140%);' +
    'display:flex;align-items:center;gap:8px;background:#1A1A1A;color:#fff;border:none;' +
    'border-radius:999px;padding:12px 20px;font-family:"DM Sans",sans-serif;font-size:13px;' +
    'font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999;' +
    'transition:transform .3s ease;max-width:88vw;text-align:center}' +
    '.install-pill.show{transform:translate(-50%,0)}';
  document.head.appendChild(style);

  var pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'install-pill';
  document.body.appendChild(pill);

  if (isIOS()) {
    // Safari never fires beforeinstallprompt - there is no programmatic
    // install API on iOS, so just point people at the manual steps.
    pill.textContent = '📲 Tap Share, then "Add to Home Screen"';
    pill.addEventListener('click', function () {
      pill.classList.remove('show');
      dismiss();
    });
    setTimeout(function () {
      pill.classList.add('show');
    }, 2500);
    return;
  }

  var deferredPrompt = null;
  pill.textContent = "📲 Add Rera's Treat to Home Screen";

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    pill.classList.add('show');
  });

  pill.addEventListener('click', function () {
    pill.classList.remove('show');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
      });
    }
    dismiss();
  });

  window.addEventListener('appinstalled', function () {
    pill.classList.remove('show');
    dismiss();
  });
})();
