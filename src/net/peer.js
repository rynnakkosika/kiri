// Transport for online play: a thin wrapper over PeerJS WebRTC data channels.
// PeerJS is loaded only when online play starts, so offline play never touches the network.
(function (Kiri) {
  'use strict';

  const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const ID_PREFIX = 'kiri-trot-';
  let loading = null;

  function load() {
    if (window.Peer) return Promise.resolve();
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PEERJS_URL;
        s.onload = () => resolve();
        s.onerror = () => { loading = null; reject(new Error('Could not load the online library. Check your internet connection.')); };
        document.head.appendChild(s);
      });
    }
    return loading;
  }

  const PING_MS = 3000;
  const TIMEOUT_MS = 12000;

  // One open data channel plus its peer. handlers: onOpen, onMessage, onClose, onError.
  // WebRTC often doesn't notice a closed tab for a long time, so both sides ping and
  // treat silence as a disconnect.
  function wrap(peer, handlers) {
    let conn = null;
    let lastSeen = 0;
    let timer = null;
    let closed = false;
    const lost = () => {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      if (handlers.onClose) handlers.onClose();
    };
    const sayBye = () => link.send({ type: 'bye', reason: 'unload' });
    const link = {
      send(msg) { if (conn && conn.open) conn.send(msg); },
      close() {
        closed = true;
        clearInterval(timer);
        window.removeEventListener('pagehide', sayBye);
        try { if (conn) conn.close(); peer.destroy(); } catch (e) { /* already closed */ }
      },
      attach(c) {
        conn = c;
        c.on('open', () => {
          lastSeen = Date.now();
          timer = setInterval(() => {
            if (Date.now() - lastSeen > TIMEOUT_MS) lost();
            else link.send({ type: 'ping' });
          }, PING_MS);
          window.addEventListener('pagehide', sayBye);
          if (handlers.onOpen) handlers.onOpen();
        });
        c.on('data', (m) => {
          lastSeen = Date.now();
          if (m && m.type === 'ping') return;
          if (handlers.onMessage) handlers.onMessage(m);
        });
        c.on('close', lost);
        c.on('error', lost);
      },
      get connected() { return !!(conn && conn.open); },
    };
    return link;
  }

  // Host: register the code with the signalling server, accept exactly one friend.
  // handlers.onReady(code) fires once the code is usable; a taken code is retried.
  function host(makeCode, handlers) {
    return load().then(() => new Promise((resolve) => {
      const attempt = (tries) => {
        const code = makeCode();
        const peer = new window.Peer(ID_PREFIX + code);
        const link = wrap(peer, handlers);
        peer.on('open', () => { handlers.onReady && handlers.onReady(code); resolve(link); });
        peer.on('connection', (c) => {
          if (link.connected) { c.on('open', () => c.close()); return; }
          link.attach(c);
        });
        peer.on('error', (err) => {
          if (err.type === 'unavailable-id' && tries < 5) { peer.destroy(); attempt(tries + 1); return; }
          handlers.onError && handlers.onError(err.type || 'error');
        });
        peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* signalling only */ } });
      };
      attempt(0);
    }));
  }

  // Guest: connect to the host's code. handlers.onError('notfound') if no such game.
  function join(code, handlers) {
    return load().then(() => new Promise((resolve) => {
      const peer = new window.Peer();
      const link = wrap(peer, handlers);
      peer.on('open', () => {
        link.attach(peer.connect(ID_PREFIX + code, { reliable: true }));
        resolve(link);
      });
      peer.on('error', (err) => {
        handlers.onError && handlers.onError(err.type === 'peer-unavailable' ? 'notfound' : (err.type || 'error'));
      });
    }));
  }

  Kiri.Net = { load, host, join };
})(window.Kiri = window.Kiri || {});
