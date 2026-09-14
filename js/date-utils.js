/**
 * ==========================================================================
 * DATE UTILS & STATUS ENGINE
 * Regras funcionais:
 * - Pendente: mais de 2 dias (> 2)
 * - Urgente: 0 a 2 dias (0 a 2)
 * - Atrasado: data passada (< 0)
 * - Concluído: marcado manualmente
 * ==========================================================================
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DateUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function calculateDiffDays(dueDateStr) {
    if (!dueDateStr) return 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parts = dueDateStr.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dueStart = new Date(year, month, day);

    const diffTime = dueStart.getTime() - todayStart.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  function getItemStatus(item) {
    if (item.completed) return 'concluido';
    const diffDays = calculateDiffDays(item.dueDate);
    if (diffDays < 0) return 'atrasado';
    if (diffDays <= 2) return 'urgente';
    return 'pendente';
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'atrasado': return 'Atrasado';
      case 'urgente': return 'Urgente';
      case 'pendente': return 'Pendente';
      default: return 'Pendente';
    }
  }

  function getRelativeDateLabel(item) {
    if (item.completed) {
      return 'Concluído';
    }
    const diffDays = calculateDiffDays(item.dueDate);
    if (diffDays < 0) {
      const abs = Math.abs(diffDays);
      return abs === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${abs} dias`;
    }
    if (diffDays === 0) {
      return 'Vence hoje!';
    }
    if (diffDays === 1) {
      return 'Vence amanhã';
    }
    if (diffDays === 2) {
      return 'Faltam 2 dias';
    }
    return `Faltam ${diffDays} dias`;
  }

  function formatDueDate(dueDateStr) {
    if (!dueDateStr) return '';
    const parts = dueDateStr.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function extractDomain(urlStr) {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'Link externo';
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Ordenação funcional:
   * Pendentes, urgentes e atrasados primeiro (por data mais próxima),
   * concluídos por último.
   */
  function sortItems(items) {
    return [...items].sort((a, b) => {
      // Concluídos sempre ao final
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // Ordenar pela data mais próxima
      const dateA = new Date(a.dueDate.split('T')[0]).getTime();
      const dateB = new Date(b.dueDate.split('T')[0]).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return a.title.localeCompare(b.title);
    });
  }

  return {
    calculateDiffDays,
    getItemStatus,
    getStatusLabel,
    getRelativeDateLabel,
    formatDueDate,
    formatDateForInput,
    extractDomain,
    getInitials,
    sortItems
  };
});
