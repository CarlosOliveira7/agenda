/**
 * ==========================================================================
 * APP CONTROLLER & BOOTSTRAP
 * Orquestra o estado da aplicação, listeners e inicialização.
 * ==========================================================================
 */
(function () {
  'use strict';

  // Estado da aplicação
  const state = {
    items: [],
    currentFilter: 'todos',
    searchQuery: '',
    firebaseUrl: '',
    isOnline: false,
    pendingDeleteId: null
  };

  function getSampleItems() {
    const today = new Date();

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 3);

    const urgentDate = new Date(today);
    urgentDate.setDate(today.getDate() + 1);

    const todayDate = new Date(today);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 6);

    const doneDate = new Date(today);
    doneDate.setDate(today.getDate() - 5);

    return [
      {
        id: 'sample-1',
        title: 'Revisão do Artigo Científico - IEEE Template',
        link: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        assignee: 'Beatriz Lima',
        dueDate: window.DateUtils.formatDateForInput(pastDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-2',
        title: 'Apresentação Final do Projeto Integrador',
        link: 'https://docs.google.com/presentation/d/1_exemplo_apresentacao/edit',
        assignee: 'Carlos Eduardo',
        dueDate: window.DateUtils.formatDateForInput(todayDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-3',
        title: 'Protótipo de Interface e Teste com Usuários (Figma)',
        link: 'https://www.figma.com/design/exemplo-painel',
        assignee: 'Mariana Souza',
        dueDate: window.DateUtils.formatDateForInput(urgentDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-4',
        title: 'Repositório de Código & Documentação da API',
        link: 'https://github.com',
        assignee: 'Lucas Ferreira',
        dueDate: window.DateUtils.formatDateForInput(futureDate),
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-5',
        title: 'Termo de Abertura e Cronograma Preliminar',
        link: 'https://drive.google.com',
        assignee: 'Rafaela Lima',
        dueDate: window.DateUtils.formatDateForInput(doneDate),
        completed: true,
        completedAt: new Date().toISOString(),
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

    if (state.firebaseUrl) {
      const res = await window.SyncEngine.syncWithCloud(state.firebaseUrl, 'SAVE', state.items);
      state.isOnline = res !== null;
      window.UIEngine.updateSyncUI(state.isOnline, state.firebaseUrl);
    }
  }

  function updateShareUrlPreview() {
    const preview = document.getElementById('shareUrlPreview');
    if (!preview) return;

    if (state.firebaseUrl) {
      preview.textContent = window.SyncEngine.generateShareUrl(state.firebaseUrl);
    } else {
      preview.textContent = 'Preencha a URL do Firebase acima para gerar o link compartilhado da equipe.';
    }
  }

  // ==========================================================================
  // REGISTRO DE EVENTOS
  // ==========================================================================
  function setupEventListeners() {
    // 1. Fechamento genérico de modais
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

    // 2. Formulário de adição de trabalho
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
        window.UIEngine.showToast('Trabalho adicionado com sucesso!');
      });
    }

    // 3. Atalhos de data
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

    // 4. Ações dos cartões
    const cardsGrid = document.getElementById('cardsGrid');
    if (cardsGrid) {
      cardsGrid.addEventListener('click', async function (e) {
        // Toggle Concluído
        const toggleBtn = e.target.closest('[data-action="toggle"]');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-id');
          const item = state.items.find(i => i.id === id);
          if (item) {
            item.completed = !item.completed;
            item.completedAt = item.completed ? new Date().toISOString() : null;
            await persistData();
            window.UIEngine.showToast(item.completed ? 'Trabalho marcado como concluído!' : 'Trabalho reaberto!');
          }
          return;
        }

        // Copiar Link
        const copyBtn = e.target.closest('[data-action="copy-link"]');
        if (copyBtn) {
          const link = copyBtn.getAttribute('data-link');
          if (link) {
            navigator.clipboard.writeText(link).then(() => {
              window.UIEngine.showToast('Link copiado para a área de transferência!');
            }).catch(() => {
              prompt('Copie o link:', link);
            });
          }
          return;
        }

        // Excluir (abre modal)
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
          window.UIEngine.showToast('Trabalho excluído!');
        }
      });
    }

    // 5. Filtros e Busca
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

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        state.searchQuery = e.target.value.trim();
        renderApp();
      });
    }

    // 6. Cabeçalho e Banner
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

    const openSyncModal = () => {
      const urlInput = document.getElementById('firebaseUrlInput');
      if (urlInput) urlInput.value = state.firebaseUrl || '';
      updateShareUrlPreview();
      window.UIEngine.openModal('syncModal');
    };

    const syncStatusBtn = document.getElementById('syncStatusBtn');
    if (syncStatusBtn) syncStatusBtn.addEventListener('click', openSyncModal);

    const bannerConfigBtn = document.getElementById('bannerConfigBtn');
    if (bannerConfigBtn) bannerConfigBtn.addEventListener('click', openSyncModal);

    const bannerCloseBtn = document.getElementById('bannerCloseBtn');
    if (bannerCloseBtn) {
      bannerCloseBtn.addEventListener('click', () => {
        document.getElementById('syncBanner').classList.add('hidden');
        sessionStorage.setItem('sync_banner_closed', 'true');
      });
    }

    // Input dinâmico do Firebase
    const firebaseUrlInput = document.getElementById('firebaseUrlInput');
    if (firebaseUrlInput) {
      firebaseUrlInput.addEventListener('input', function (e) {
        const preview = document.getElementById('shareUrlPreview');
        const url = window.SyncEngine.cleanFirebaseUrl(e.target.value);
        if (url) {
          preview.textContent = window.SyncEngine.generateShareUrl(url);
        } else {
          preview.textContent = 'Preencha a URL do Firebase acima para gerar o link compartilhado da equipe.';
        }
      });
    }

    // Salvar configuração de sincronização
    const saveSyncConfigBtn = document.getElementById('saveSyncConfigBtn');
    if (saveSyncConfigBtn) {
      saveSyncConfigBtn.addEventListener('click', async function () {
        const url = document.getElementById('firebaseUrlInput').value.trim();
        if (url && !url.includes('firebaseio.com')) {
          if (!confirm('A URL informada não se parece com uma URL padrão do Firebase Realtime Database. Deseja continuar mesmo assim?')) {
            return;
          }
        }

        const config = window.SyncEngine.saveSyncConfig(url);
        state.firebaseUrl = config.firebaseUrl;
        window.UIEngine.closeModal('syncModal');

        if (state.firebaseUrl) {
          window.UIEngine.showToast('Conectando à base em nuvem...');
          const cloudItems = await window.SyncEngine.syncWithCloud(state.firebaseUrl, 'FETCH');
          if (cloudItems !== null) {
            if (cloudItems.length > 0) {
              state.items = cloudItems;
              window.SyncEngine.saveLocalItems(state.items, false);
              renderApp();
              window.UIEngine.showToast('Base em nuvem conectada e sincronizada!');
            } else if (state.items.length > 0) {
              await window.SyncEngine.syncWithCloud(state.firebaseUrl, 'SAVE', state.items);
              window.UIEngine.showToast('Dados locais enviados para a nuvem!');
            }
          }

          window.SyncEngine.startRealtimeSync(
            state.firebaseUrl,
            (newItems) => {
              state.items = newItems;
              window.SyncEngine.saveLocalItems(state.items, false);
              renderApp();
            },
            (online) => {
              state.isOnline = online;
              window.UIEngine.updateSyncUI(online, state.firebaseUrl);
            }
          );
        } else {
          window.SyncEngine.stopRealtimeSync();
          window.UIEngine.updateSyncUI(false, '');
        }
      });
    }

    // Redefinir para local
    const resetToLocalBtn = document.getElementById('resetToLocalBtn');
    if (resetToLocalBtn) {
      resetToLocalBtn.addEventListener('click', function () {
        window.SyncEngine.saveSyncConfig('');
        window.SyncEngine.stopRealtimeSync();
        state.firebaseUrl = '';
        state.isOnline = false;
        window.UIEngine.updateSyncUI(false, '');
        window.UIEngine.closeModal('syncModal');
        window.UIEngine.showToast('Modo somente local ativado.');
      });
    }

    // Copiar link da equipe
    const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
    if (copyShareLinkBtn) {
      copyShareLinkBtn.addEventListener('click', function () {
        const preview = document.getElementById('shareUrlPreview');
        const link = preview.textContent;
        if (link && link.startsWith('http')) {
          navigator.clipboard.writeText(link).then(() => {
            window.UIEngine.showToast('Link da equipe copiado com sucesso!');
          }).catch(() => {
            prompt('Copie o link abaixo para enviar ao grupo:', link);
          });
        } else {
          alert('Por favor, informe primeiro uma URL válida do Firebase Realtime Database para gerar o link.');
        }
      });
    }

    // 7. Exportar / Importar JSON
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', function () {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.items, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `painel_entregas_unibalsas_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
        dlAnchorElem.remove();
        window.UIEngine.showToast('Backup exportado com sucesso!');
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
              if (confirm(`Deseja importar ${imported.length} entregas? Isto substituirá os dados atuais.`)) {
                state.items = imported;
                await persistData();
                window.UIEngine.showToast('Dados importados com sucesso!');
              }
            } else {
              alert('O arquivo JSON não possui formato válido de lista de trabalhos.');
            }
          } catch (err) {
            alert('Falha ao processar arquivo JSON: ' + err.message);
          }
          importFileInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // 8. Ouvinte de BroadcastChannel (comunicação entre abas)
    window.SyncEngine.onBroadcastMessage(function (items) {
      state.items = items;
      renderApp();
      window.UIEngine.showToast('Dados sincronizados da outra aba');
    });
  }

  // ==========================================================================
  // INICIALIZAÇÃO
  // ==========================================================================
  async function init() {
    setupEventListeners();

    const config = window.SyncEngine.loadSyncConfig();
    state.firebaseUrl = config.firebaseUrl;

    if (state.firebaseUrl) {
      window.UIEngine.updateSyncUI(false, state.firebaseUrl);
      const cloudData = await window.SyncEngine.syncWithCloud(state.firebaseUrl, 'FETCH');
      if (cloudData !== null) {
        state.items = cloudData.length > 0 ? cloudData : (window.SyncEngine.loadLocalItems() || getSampleItems());
        window.SyncEngine.saveLocalItems(state.items, false);
        state.isOnline = true;
        window.UIEngine.updateSyncUI(true, state.firebaseUrl);

        window.SyncEngine.startRealtimeSync(
          state.firebaseUrl,
          (newItems) => {
            state.items = newItems;
            window.SyncEngine.saveLocalItems(state.items, false);
            renderApp();
          },
          (online) => {
            state.isOnline = online;
            window.UIEngine.updateSyncUI(online, state.firebaseUrl);
          }
        );
      } else {
        state.items = window.SyncEngine.loadLocalItems() || getSampleItems();
        window.UIEngine.updateSyncUI(false, state.firebaseUrl);
      }
    } else {
      const local = window.SyncEngine.loadLocalItems();
      state.items = local !== null ? local : getSampleItems();
      window.SyncEngine.saveLocalItems(state.items, false);
      window.UIEngine.updateSyncUI(false, '');
    }

    renderApp();
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
