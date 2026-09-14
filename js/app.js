/**
 * ==========================================================================
 * APP CONTROLLER
 * Orquestração do estado, sincronização direta com Firebase e eventos da UI.
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

  // Exemplos acadêmicos realistas da UniBalsas para primeiro acesso
  function getSampleItems() {
    const today = new Date();

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 2);

    const urgentDate = new Date(today);
    urgentDate.setDate(today.getDate() + 1);

    const todayDate = new Date(today);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 5);

    return [
      {
        id: 'item-1',
        title: 'Artigo de Metodologia Científica - Normas ABNT',
        link: 'https://docs.google.com',
        assignee: 'Lara Beatriz',
        dueDate: window.DateUtils.formatDateForInput(pastDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'item-2',
        title: 'Estudo de Caso - Gestão e Processos',
        link: 'https://drive.google.com',
        assignee: 'Carlos Oliveira',
        dueDate: window.DateUtils.formatDateForInput(todayDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'item-3',
        title: 'Slides da Apresentação do Projeto',
        link: 'https://docs.google.com/presentation',
        assignee: 'Mariana Souza',
        dueDate: window.DateUtils.formatDateForInput(urgentDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'item-4',
        title: 'Relatório Final de Atividades Acadêmicas',
        link: 'https://docs.google.com',
        assignee: 'Lucas Ferreira',
        dueDate: window.DateUtils.formatDateForInput(futureDate),
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

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
    // Fechamento de modais
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
    });

    // Formulário de Nova Entrega
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
          alert('Por favor, preencha todos os campos.');
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
        window.UIEngine.showToast('Entrega adicionada com sucesso');
      });
    }

    // Atalhos rápidos de data
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

    // Ações dos cartões (Concluir / Copiar / Excluir)
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

    // Confirmação de exclusão
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

    // Filtros por status
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

    // Busca
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value.trim();
        renderApp();
      });
    }

    // Botão Adicionar do Header
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

    // Exportar / Importar JSON (Backup)
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
            alert('Erro ao ler JSON: ' + err.message);
          }
          importFileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // Sincronização entre abas
    window.SyncEngine.onBroadcastMessage(function (items) {
      state.items = items;
      renderApp();
    });
  }

  // Inicialização
  async function init() {
    setupEventListeners();

    // 1. Tenta carregar do Firebase diretamente
    const cloudData = await window.SyncEngine.syncWithCloud('FETCH');

    if (cloudData && cloudData.error === 'PERMISSION_DENIED') {
      state.permissionDenied = true;
      state.isOnline = false;
      window.UIEngine.updateSyncUI(false, true);

      // Carrega localmente para que o usuário consiga usar imediatamente
      const local = window.SyncEngine.loadLocalItems();
      state.items = local !== null ? local : getSampleItems();
    } else if (Array.isArray(cloudData)) {
      state.permissionDenied = false;
      state.isOnline = true;
      window.UIEngine.updateSyncUI(true, false);

      if (cloudData.length > 0) {
        state.items = cloudData;
        window.SyncEngine.saveLocalItems(state.items, false);
      } else {
        // Nuvem vazia: usa cache ou semente e envia para a nuvem
        const local = window.SyncEngine.loadLocalItems();
        state.items = local !== null && local.length > 0 ? local : getSampleItems();
        window.SyncEngine.syncWithCloud('SAVE', state.items);
      }

      // Inicia escuta em tempo real (Server-Sent Events)
      window.SyncEngine.startRealtimeSync(
        (newItems) => {
          state.items = newItems;
          window.SyncEngine.saveLocalItems(state.items, false);
          renderApp();
        },
        (online) => {
          state.isOnline = online;
          window.UIEngine.updateSyncUI(online, false);
        }
      );
    } else {
      // Falha temporária de rede: fallback local
      const local = window.SyncEngine.loadLocalItems();
      state.items = local !== null ? local : getSampleItems();
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
