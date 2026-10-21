/* ============================================================
   Góc Tâm Thư — Admin Panel JavaScript
   ============================================================ */
(function () {
  'use strict';

  const content = document.querySelector('#admin-content');
  const list = document.querySelector('#admin-list');
  const statusBox = document.querySelector('#admin-status');
  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  function status(message, error = false) {
    statusBox.textContent = message;
    statusBox.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(status.timer);
    status.timer = setTimeout(() => (statusBox.className = 'toast'), 3000);
  }

  async function loadLetters() {
    const response = await fetch('/api/admin/letters');
    if (!response.ok) throw new Error('Không thể tải danh sách.');
    const letters = await response.json();
    list.innerHTML = letters.length
      ? letters
          .map((letter) => {
            const hidden = letter.status === 'hidden';
            return `<article class="admin-letter">
              <div style="flex:1;min-width:0">
                <strong>${esc(letter.name || 'Ẩn danh')}</strong>
                <span style="display:block;font-size:12px;color:var(--c-text-3);margin-top:4px">
                  ${esc(letter.type)} · ${new Date(letter.createdAt).toLocaleString('vi-VN')} · ${hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                </span>
                <p style="margin-top:8px;white-space:pre-wrap">${esc(letter.message)}</p>
              </div>
              <div class="admin-actions">
                <button data-action="${hidden ? 'approve' : 'hide'}" data-id="${letter.id}" type="button">${hidden ? 'Hiện' : 'Ẩn'}</button>
                <button data-action="delete" data-id="${letter.id}" type="button" class="delete">Xóa</button>
              </div>
            </article>`;
          })
          .join('')
      : '<p style="color:var(--c-text-3);text-align:center;padding:40px">Chưa có tâm thư.</p>';
  }

  document.querySelector('#refresh').onclick = () =>
    loadLetters().catch((error) => status(error.message, true));

  list.onclick = async (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    if (button.dataset.action === 'delete' && !confirm('Xóa tâm thư này?')) return;
    const response = await fetch(`/api/letters/${button.dataset.id}`, {
      method: button.dataset.action === 'delete' ? 'DELETE' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:
        button.dataset.action === 'delete'
          ? undefined
          : JSON.stringify({ status: button.dataset.action === 'hide' ? 'hidden' : 'approved' }),
    });
    if (!response.ok) {
      status('Thao tác thất bại.', true);
      return;
    }
    await loadLetters();
    status('Đã cập nhật.');
  };

  loadLetters().catch((error) => status(error.message, true));
})();
