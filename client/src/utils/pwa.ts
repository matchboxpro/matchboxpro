// PWA Service Worker registration and installation prompt
let deferredPrompt: any;

// Service Worker registration
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(() => console.log('Service Worker registration failed'));
  }
};

// Install prompt handling
export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
};

const showInstallButton = () => {
  // Create install banner
  const installBanner = document.createElement('div');
  installBanner.id = 'install-banner';
  installBanner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #05637b;
      color: white;
      padding: 15px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: system-ui, sans-serif;
    ">
      <div style="flex: 1;">
        <div style="font-weight: bold; margin-bottom: 4px;">Installa MATCHBOX</div>
        <div style="font-size: 14px; opacity: 0.9;">Aggiungi l'app alla schermata home</div>
      </div>
      <div>
        <button onclick="dismissInstallBanner()" style="
          background: none;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          margin-right: 8px;
          cursor: pointer;
        ">Dopo</button>
        <button onclick="triggerInstall()" style="
          background: #f8b400;
          border: none;
          color: #052b3e;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        ">Installa</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // Add global functions
  (window as any).dismissInstallBanner = () => {
    const banner = document.getElementById('install-banner');
    if (banner) banner.remove();
  };
  
  (window as any).triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      deferredPrompt = null;
    }
    const banner = document.getElementById('install-banner');
    if (banner) banner.remove();
  };
};

// Initialize PWA features
export const initPWA = () => {
  registerServiceWorker();
  setupInstallPrompt();
};