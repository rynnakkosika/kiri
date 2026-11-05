// Platform glue that the game itself never depends on: offline support when the game is served
// over the web, and the Android back button when it runs inside the Play Store app (Capacitor).
(function (Kiri) {
  'use strict';
  // Where the game is published. Invite links from the app point here, because the app's own
  // address (https://localhost) only exists inside the app.
  Kiri.PUBLIC_URL = 'https://rynnakkosika.github.io/kiri/';

  const cap = window.Capacitor;
  Kiri.isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  if (!Kiri.isNative && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
    });
  }

  // Android back: press the screen's own Back/Cancel button if it has one, otherwise leave the app.
  const AppPlugin = Kiri.isNative && cap.Plugins && cap.Plugins.App;
  if (AppPlugin) {
    AppPlugin.addListener('backButton', () => {
      const back = document.querySelector('#app #back');
      if (back && !back.disabled) back.click();
      else AppPlugin.exitApp();
    });
  }
})(window.Kiri = window.Kiri || {});
