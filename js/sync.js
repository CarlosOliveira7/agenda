/**
 * ==========================================================================
 * SYNC & PERSISTENCE ENGINE
 * Gerencia persistência local (localStorage), comunicação entre abas
 * (BroadcastChannel) e sincronização em nuvem via Firebase RTDB (REST + SSE).
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

  const STORAGE_KEY = 'painel_entregas_data_v1';
  const SYNC_CONFIG_KEY = 'painel_entregas_sync_config_v1';
  const BROADCAST_CHANNEL_NAME = 'painel_entregas_sync_channel';

  let broadcastChannel = null;
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
  } catch (e) {
    console.warn('BroadcastChannel indisponível:', e);
  }

  let eventSource = null;
  let pollTimer = null;

  function cleanFirebaseUrl(url) {
    if (!url) return '';
    let cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned.endsWith('.json')) {
      cleaned = cleaned.replace(/\.json$/, '');
    }
    return cleaned;
  }

  function loadSyncConfig() {
    // 1. Tenta carregar da URL (para compartilhamento direto pelo GitHub Pages)
    const params = new URLSearchParams(window.location.search);
    const dbParam = params.get('db') || params.get('firebase');
    if (dbParam) {
      const url = cleanFirebaseUrl(decodeURIComponent(dbParam));
      const config = { firebaseUrl: url };
      try {
        localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
      } catch (e) {}
      return config;
    }

    // 2. Carrega do localStorage
    try {
      const saved = localStorage.getItem(SYNC_CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao ler configuração de sincronização:', e);
    }

    return { firebaseUrl: '' };
  }

  function saveSyncConfig(url) {
    const config = { firebaseUrl: cleanFirebaseUrl(url) };
    try {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Erro ao salvar configuração:', e);
    }
    return config;
  }

  function loadLocalItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Erro ao ler do localStorage:', e);
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
      console.error('Erro ao salvar no localStorage:', e);
    }
  }

  async function syncWithCloud(firebaseUrl, action, data = null) {
    if (!firebaseUrl) return null;
    const endpoint = `${firebaseUrl}/entregas.json`;

    try {
      if (action === 'FETCH') {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json ? (Array.isArray(json) ? json : Object.values(json)) : [];
      } else if (action === 'SAVE') {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      }
    } catch (err) {
      console.warn('Falha na comunicação com a nuvem:', err);
      return null;
    }
  }

  function startRealtimeSync(firebaseUrl, onDataReceived, onStatusChange) {
    stopRealtimeSync();

    if (!firebaseUrl) {
      if (onStatusChange) onStatusChange(false);
      return;
    }

    const endpoint = `${firebaseUrl}/entregas.json`;

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
        // Fallback para polling se SSE falhar
        if (!pollTimer) {
          pollTimer = setInterval(async () => {
            const items = await syncWithCloud(firebaseUrl, 'FETCH');
            if (items !== null) {
              if (onDataReceived) onDataReceived(items);
              if (onStatusChange) onStatusChange(true);
            }
          }, 8000);
        }
      };
    } catch (err) {
      console.warn('EventSource não suportado ou erro:', err);
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

  function generateShareUrl(firebaseUrl) {
    if (!firebaseUrl) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('db', firebaseUrl);
    return url.toString();
  }

  return {
    cleanFirebaseUrl,
    loadSyncConfig,
    saveSyncConfig,
    loadLocalItems,
    saveLocalItems,
    syncWithCloud,
    startRealtimeSync,
    stopRealtimeSync,
    onBroadcastMessage,
    generateShareUrl
  };
});
