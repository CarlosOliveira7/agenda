/**
 * ==========================================================================
 * SYNC & PERSISTENCE ENGINE
 * Conexão direta com Firebase Realtime Database (agendaub-6d420-default-rtdb).
 * Suporte a cache local transparente (localStorage) e sincronização entre abas.
 * ==========================================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SyncEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Configuração fornecida pelo usuário
  const FIREBASE_DB_URL = 'https://agendaub-6d420-default-rtdb.firebaseio.com';
  const STORAGE_KEY = 'agendaub_entregas_v1';
  const BROADCAST_CHANNEL_NAME = 'agendaub_sync_channel';

  let broadcastChannel = null;
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel não suportado neste navegador:', e);
  }

  let eventSource = null;
  let pollTimer = null;

  function loadLocalItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Erro ao ler cache local:', e);
    }
    return null;
  }

  function saveLocalItems(items, broadcast = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      if (broadcast && broadcastChannel) {
        broadcastChannel.postMessage({ type: 'UPDATE_ITEMS', items: items });
      }
    } catch (e) {
      console.error('Erro ao salvar no cache local:', e);
    }
  }

  async function syncWithCloud(action, data = null) {
    const endpoint = `${FIREBASE_DB_URL}/entregas.json`;

    try {
      if (action === 'FETCH') {
        const res = await fetch(endpoint);
        if (res.status === 401 || res.status === 403) {
          return { error: 'PERMISSION_DENIED' };
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json ? (Array.isArray(json) ? json : Object.values(json)) : [];
      } else if (action === 'SAVE') {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.status === 401 || res.status === 403) {
          return { error: 'PERMISSION_DENIED' };
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { success: true };
      }
    } catch (err) {
      console.warn('Aviso: Sincronização em nuvem temporariamente inacessível:', err);
      return null;
    }
  }

  function startRealtimeSync(onDataReceived, onStatusChange) {
    stopRealtimeSync();

    const endpoint = `${FIREBASE_DB_URL}/entregas.json`;

    try {
      eventSource = new EventSource(endpoint);

      eventSource.addEventListener('put', function (e) {
        try {
          const data = JSON.parse(e.data);
          if (data && data.data !== undefined) {
            const cloudItems = data.data ? (Array.isArray(data.data) ? data.data : Object.values(data.data)) : [];
            if (onDataReceived) onDataReceived(cloudItems);
            if (onStatusChange) onStatusChange(true);
          }
        } catch (err) {
          console.error('Erro no parser SSE:', err);
        }
      });

      eventSource.onopen = function () {
        if (onStatusChange) onStatusChange(true);
      };

      eventSource.onerror = function () {
        if (onStatusChange) onStatusChange(false);
        // Polling de contingência a cada 10 segundos
        if (!pollTimer) {
          pollTimer = setInterval(async () => {
            const result = await syncWithCloud('FETCH');
            if (result && !result.error) {
              if (onDataReceived) onDataReceived(result);
              if (onStatusChange) onStatusChange(true);
            }
          }, 10000);
        }
      };
    } catch (err) {
      if (onStatusChange) onStatusChange(false);
    }
  }

  function stopRealtimeSync() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function onBroadcastMessage(callback) {
    if (broadcastChannel) {
      broadcastChannel.onmessage = function (event) {
        if (event.data && event.data.type === 'UPDATE_ITEMS') {
          callback(event.data.items || []);
        }
      };
    }
  }

  return {
    FIREBASE_DB_URL,
    loadLocalItems,
    saveLocalItems,
    syncWithCloud,
    startRealtimeSync,
    stopRealtimeSync,
    onBroadcastMessage
  };
});
