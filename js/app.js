/**
 * ==========================================================================
 * APP CONTROLLER
 * Orquestração do estado, sincronização direta com Firebase e eventos da UI.
 * Banco de dados limpo (sem itens fictícios).
 * ==========================================================================
 */
(function () {
  'use strict';

  const state = {
    items: [],
    currentFilter: 'todos',
    searchQuery: '',
    isOnline: false,
    permissionDenied: false,
    pendingDeleteId: null
  };

  function renderApp() {
    window.UIEngine.renderFiltersAndCounts(state.items, state.currentFilter);
    window.UIEngine.renderCards(
      state.items,
      state.currentFilter,
      state.searchQuery,
      () => window.UIEngine.openModal('addModal')
    );
  }

  async function persistData() {
    window.SyncEngine.saveLocalItems(state.items, true);
    renderApp();

    const res = await window.SyncEngine.syncWithCloud('SAVE', state.items);
    if (res && res.error === 'PERMISSION_DENIED') {
      state.permissionDenied = true;
      state.isOnline = false;
      window.UIEngine.updateSyncUI(false, true);
    } else if (res && res.success) {
      state.permissionDenied = false;
      state.isOnline = true;
      window.UIEngine.updateSyncUI(true, false);
    }
  }

  function setupEventListeners() {
    // 1. Alternador de Tema (Dark / Light)
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('agendaub_theme', next); } catch (e) {}
        this.setAttribute('aria-label', next === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro');
        window.UIEngine.showToast(next === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
      });
    }

    // 2. Fechamento de modais
    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('modal-backdrop')) {
        window.UIEngine.closeModal(e.target.id);
      }
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const targetModalId = closeBtn.getAttribute('data-close-modal');
        window.UIEngine.closeModal(targetModalId);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
          window.UIEngine.closeModal(modal.id);
        });
      }
      // Atalho "/" para pesquisar
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const search = document.getElementById('searchInput');
        if (search) search.focus();
      }
    });

    // 3. Formulário de Nova Entrega
    const addForm = document.getElementById('addForm');
    if (addForm) {
      addForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const titleInput = document.getElementById('taskTitle');
        const linkInput = document.getElementById('taskLink');
        const assigneeInput = document.getElementById('taskAssignee');
        const dueDateInput = document.getElementById('taskDueDate');

        const title = titleInput.value.trim();
        let link = linkInput.value.trim();
        const assignee = assigneeInput.value.trim();
        const dueDate = dueDateInput.value;

        if (!title || !link || !assignee || !dueDate) {
          alert('Por favor, preencha todos os campos obrigatórios.');
          return;
        }

        if (!/^https?:\/\//i.test(link)) {
          link = 'https://' + link;
        }

        const newItem = {
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          title,
          link,
          assignee,
          dueDate,
          completed: false,
          createdAt: new Date().toISOString()
        };

        state.items.push(newItem);
        await persistData();

        addForm.reset();
        window.UIEngine.closeModal('addModal');
        window.UIEngine.showToast('Entrega adicionada');
      });
    }

    // 4. Atalhos rápidos de data
    document.querySelectorAll('.date-shortcut-chip').forEach(chip => {
      chip.addEventListener('click', function () {
        const days = parseInt(this.getAttribute('data-days'), 10);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const input = document.getElementById('taskDueDate');
        if (input) {
          input.value = window.DateUtils.formatDateForInput(targetDate);
        }
      });
    });

    // 5. Ações dos cartões
    const cardsGrid = document.getElementById('cardsGrid');
    if (cardsGrid) {
      cardsGrid.addEventListener('click', async function (e) {
        const toggleBtn = e.target.closest('[data-action="toggle"]');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-id');
          const item = state.items.find(i => i.id === id);
          if (item) {
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
            await persistData();
            window.UIEngine.showToast(item.completed ? 'Marcado como concluído' : 'Trabalho reaberto');
          }
          return;
        }

        const copyBtn = e.target.closest('[data-action="copy-link"]');
        if (copyBtn) {
          const link = copyBtn.getAttribute('data-link');
          if (link) {
            navigator.clipboard.writeText(link).then(() => {
              window.UIEngine.showToast('Link copiado');
            }).catch(() => {
              prompt('Copie o link:', link);
            });
          }
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          const title = deleteBtn.getAttribute('data-title');
          state.pendingDeleteId = id;
          const deleteTitleEl = document.getElementById('deleteItemTitle');
          if (deleteTitleEl) {
            deleteTitleEl.textContent = `"${title}"`;
          }
          window.UIEngine.openModal('deleteModal');
          return;
        }
      });
    }

    // 6. Confirmação de exclusão
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async function () {
        if (state.pendingDeleteId) {
          state.items = state.items.filter(item => item.id !== state.pendingDeleteId);
          state.pendingDeleteId = null;
          await persistData();
          window.UIEngine.closeModal('deleteModal');
          window.UIEngine.showToast('Entrega excluída');
        }
      });
    }

    // 7. Filtros por status
    const filtersGroup = document.getElementById('filtersGroup');
    if (filtersGroup) {
      filtersGroup.addEventListener('click', function (e) {
        const filterBtn = e.target.closest('.filter-btn');
        if (filterBtn) {
          state.currentFilter = filterBtn.getAttribute('data-filter');
          renderApp();
        }
      });
    }

    // 8. Busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value.trim();
        renderApp();
      });
    }

    // 9. Botão Adicionar do Header
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    if (openAddModalBtn) {
      openAddModalBtn.addEventListener('click', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateInput = document.getElementById('taskDueDate');
        if (dateInput) {
          dateInput.value = window.DateUtils.formatDateForInput(tomorrow);
        }
        window.UIEngine.openModal('addModal');
      });
    }

    // 10. Limpar Banco de Dados (Ação Administrativa / Limpeza)
    const clearDbBtn = document.getElementById('clearDbBtn');
    if (clearDbBtn) {
      clearDbBtn.addEventListener('click', async function () {
        if (state.items.length === 0) {
          window.UIEngine.showToast('O banco de dados já está vazio.');
          return;
        }
        if (confirm('Tem certeza de que deseja limpar todas as entregas do painel? Esta ação não pode ser desfeita.')) {
          state.items = [];
          await persistData();
          window.UIEngine.showToast('Banco de dados limpo com sucesso.');
        }
      });
    }

    // 11. Exportar / Importar JSON
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', function () {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.items, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `entregas_unibalsas_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
        dlAnchorElem.remove();
        window.UIEngine.showToast('Backup baixado com sucesso');
      });
    }

    const importFileInput = document.getElementById('importFileInput');
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn && importFileInput) {
      importDataBtn.addEventListener('click', () => importFileInput.click());

      importFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (event) {
          try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
              if (confirm(`Importar ${imported.length} entregas? Isto atualizará o painel.`)) {
                state.items = imported;
                await persistData();
                window.UIEngine.showToast('Dados restaurados com sucesso');
              }
            } else {
              alert('Arquivo inválido.');
            }
          } catch (err) {
            alert('Erro ao processar JSON: ' + err.message);
          }
          importFileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // 12. Sincronização entre abas
    window.SyncEngine.onBroadcastMessage(function (items) {
      state.items = items;
      renderApp();
    });
  }

  // Inicialização Limpa
  async function init() {
    setupEventListeners();

    // Remove qualquer item de exemplo anterior do cache local
    const cached = window.SyncEngine.loadLocalItems();
    if (cached && Array.isArray(cached) && cached.some(i => i.id && (i.id.startsWith('sample-') || i.id.startsWith('item-')))) {
      window.SyncEngine.saveLocalItems([], false);
    }

    // Tenta conectar à nuvem
    const cloudData = await window.SyncEngine.syncWithCloud('FETCH');

    if (cloudData && cloudData.error === 'PERMISSION_DENIED') {
      state.permissionDenied = true;
      state.isOnline = false;
      window.UIEngine.updateSyncUI(false, true);

      // Inicia com lista limpa ou cache local real
      const local = window.SyncEngine.loadLocalItems();
      state.items = Array.isArray(local) ? local : [];
    } else if (Array.isArray(cloudData)) {
      state.permissionDenied = false;
      state.isOnline = true;
      window.UIEngine.updateSyncUI(true, false);

      state.items = cloudData;
      window.SyncEngine.saveLocalItems(state.items, false);

      // Ouvinte SSE em tempo real
      window.SyncEngine.startRealtimeSync(
        (newItems) => {
          state.items = Array.isArray(newItems) ? newItems : [];
          window.SyncEngine.saveLocalItems(state.items, false);
          renderApp();
        },
        (online) => {
          state.isOnline = online;
          window.UIEngine.updateSyncUI(online, false);
        }
      );
    } else {
      const local = window.SyncEngine.loadLocalItems();
      state.items = Array.isArray(local) ? local : [];
      window.UIEngine.updateSyncUI(false, false);
    }

    renderApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
