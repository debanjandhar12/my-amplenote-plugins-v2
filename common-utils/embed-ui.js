export function showEmbedLoader() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'embed-loader-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      /*height: 100%;*/
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      animation: fadeIn 0.3s ease-in-out;
    `;

    // Create loader
    const loader = document.createElement('div');
    loader.id = 'embed-loader';
    loader.style.cssText = `
      position: fixed;
      left: 50%;
      transform: translate(-50%, 0%);
      width: 50px;
      height: 50px;
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      z-index: 9999;
    `;

    const keyframes = document.createElement('style');
    keyframes.textContent = `
      @keyframes spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;

    document.head.appendChild(keyframes);
    document.body.appendChild(overlay);
    document.body.appendChild(loader);

    // Show loader after 320ms
    overlay.style.display = 'none';
    loader.style.display = 'none';
    setTimeout(() => {
        if(document.getElementById('embed-loader'))
            loader.style.display = 'block';
        if(document.getElementById('embed-loader-overlay'))
            overlay.style.display = 'block';
    }, 240);
}

export function hideEmbedLoader() {
    const loader = document.getElementById('embed-loader');
    const overlay = document.getElementById('embed-loader-overlay');
    if (loader) {
        loader.remove();
    }
    if (overlay) {
        overlay.remove();
    }
}