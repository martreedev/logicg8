(() => {
  const status = document.getElementById('status');
  const version = document.getElementById('version');
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');

  const params = new URLSearchParams(window.location.search);
  const current = params.get('version');
  version.textContent = current ? `Version ${current}` : '';

  window.splash.onStatus((text) => {
    if (status.textContent === text) {
      return;
    }
    status.textContent = text;
  });

  window.splash.onProgress((percent) => {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    progress.hidden = false;
    progressBar.style.width = `${value}%`;
    progress.setAttribute('aria-valuenow', String(Math.round(value)));
  });
})();
