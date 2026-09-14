/**
 * ==========================================================================
 * UI RENDERING & COMPONENT ENGINE
 * Gerencia a renderização de filtros, cartões, modais e alertas toast.
 * ==========================================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UIEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      const firstInput = modal.querySelector('input, textarea, button:not(.modal-close-btn)');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 50);
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function updateSyncUI(isOnline, firebaseUrl) {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    const banner = document.getElementById('syncBanner');

    if (!dot || !text) return;

    if (firebaseUrl) {
      if (isOnline) {
        dot.className = 'sync-indicator-dot online';
        text.textContent = 'Nuvem Conectada';
        if (banner) banner.classList.add('hidden');
      } else {
        dot.className = 'sync-indicator-dot local';
        text.textContent = 'Conectando à Nuvem...';
      }
    } else {
      dot.className = 'sync-indicator-dot local';
      text.textContent = 'Modo Local';
      if (banner && !sessionStorage.getItem('sync_banner_closed')) {
        banner.classList.remove('hidden');
      }
    }
  }

  function renderFiltersAndCounts(items, currentFilter) {
    const counts = {
      todos: items.length,
      pendente: 0,
      urgente: 0,
      atrasado: 0,
      concluido: 0
    };

    items.forEach(item => {
      const status = window.DateUtils.getItemStatus(item);
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    const elTodos = document.getElementById('count-todos');
    const elPendente = document.getElementById('count-pendente');
    const elUrgente = document.getElementById('count-urgente');
    const elAtrasado = document.getElementById('count-atrasado');
    const elConcluido = document.getElementById('count-concluido');

    if (elTodos) elTodos.textContent = counts.todos;
    if (elPendente) elPendente.textContent = counts.pendente;
    if (elUrgente) elUrgente.textContent = counts.urgente;
    if (elAtrasado) elAtrasado.textContent = counts.atrasado;
    if (elConcluido) elConcluido.textContent = counts.concluido;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      const filter = btn.getAttribute('data-filter');
      if (filter === currentFilter) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });
  }

  function renderCards(items, currentFilter, searchQuery, onEmptyAddClick) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Filtragem
    let filtered = items.filter(item => {
      const status = window.DateUtils.getItemStatus(item);
      if (currentFilter !== 'todos' && status !== currentFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchAssignee = item.assignee.toLowerCase().includes(q);
        if (!matchTitle && !matchAssignee) return false;
      }
      return true;
    });

    // Ordenação
    filtered = window.DateUtils.sortItems(filtered);

    // Vazio
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 class="empty-state-title">Nenhum trabalho encontrado</h3>
        <p class="empty-state-desc">
          ${searchQuery 
            ? 'Nenhum resultado corresponde à sua pesquisa. Tente usar outros termos.' 
            : currentFilter !== 'todos'
              ? `Não há entregas com o status "${window.DateUtils.getStatusLabel(currentFilter)}" no momento.`
              : 'Seu painel ainda não possui trabalhos cadastrados. Clique no botão abaixo para começar!'}
        </p>
        ${!searchQuery && currentFilter === 'todos' ? `
          <button class="btn btn-primary" id="emptyAddBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Adicionar Primeiro Trabalho
          </button>
        ` : ''}
      `;
      grid.appendChild(empty);

      const emptyAddBtn = document.getElementById('emptyAddBtn');
      if (emptyAddBtn && onEmptyAddClick) {
        emptyAddBtn.addEventListener('click', onEmptyAddClick);
      }
      return;
    }

    // Renderização dos cartões
    filtered.forEach(item => {
      const status = window.DateUtils.getItemStatus(item);
      const domain = window.DateUtils.extractDomain(item.link);
      const initials = window.DateUtils.getInitials(item.assignee);
      const formattedDate = window.DateUtils.formatDueDate(item.dueDate);
      const relativeTime = window.DateUtils.getRelativeDateLabel(item);

      const card = document.createElement('article');
      card.className = `card status-${status}`;
      card.setAttribute('data-id', item.id);

      card.innerHTML = `
        <div class="card-body">
          <div class="card-meta-top">
            <span class="status-badge ${status}">
              <span class="status-badge-dot"></span>
              <span>${window.DateUtils.getStatusLabel(status)}</span>
            </span>
            <span class="link-host-pill" title="${escapeHtml(item.link)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              ${escapeHtml(domain)}
            </span>
          </div>

          <a href="${escapeHtml(item.link)}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="card-title-link"
             title="Abrir ${escapeHtml(item.title)} em nova aba">
            <span>${escapeHtml(item.title)}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>

          <div class="card-details">
            <div class="detail-item" title="Responsável pelo trabalho">
              <div class="assignee-avatar">${escapeHtml(initials)}</div>
              <span class="assignee-name">${escapeHtml(item.assignee)}</span>
            </div>

            <div class="detail-item" title="Prazo de entrega">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="due-date-text">${formattedDate}</span>
              <span class="relative-time-tag">${relativeTime}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button class="card-action-btn ${item.completed ? 'btn-reopen' : 'btn-toggle-done'}" 
                  data-action="toggle" 
                  data-id="${item.id}"
                  title="${item.completed ? 'Reabrir trabalho' : 'Marcar trabalho como concluído'}">
            ${item.completed ? `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Reabrir
            ` : `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Concluir
            `}
          </button>

          <div style="display: flex; gap: 0.25rem;">
            <button class="card-action-btn" 
                    data-action="copy-link" 
                    data-link="${escapeHtml(item.link)}"
                    title="Copiar link do trabalho">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>

            <button class="card-action-btn btn-delete" 
                    data-action="delete" 
                    data-id="${item.id}"
                    data-title="${escapeHtml(item.title)}"
                    title="Excluir trabalho">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  return {
    escapeHtml,
    showToast,
    openModal,
    closeModal,
    updateSyncUI,
    renderFiltersAndCounts,
    renderCards
  };
});
