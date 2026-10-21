/* ============================================================
   Góc Tâm Thư — Admin Panel JavaScript
   ============================================================ */
(function () {
  'use strict';

  const login = document.querySelector('#admin-login');
  const loginForm = document.querySelector('#admin-login-form');
  const loginButton = document.querySelector('#admin-login-submit');
  const passwordInput = document.querySelector('#admin-password');
  const content = document.querySelector('#admin-content');
  const list = document.querySelector('#admin-list');
  const statusBox = document.querySelector('#admin-status');
  const deleteDialog = document.querySelector('.confirm-dialog');
  let adminPassword = '';
  let requestPending = false;

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  function status(message, error = false) {
    statusBox.textContent = message;
    statusBox.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(status.timer);
    status.timer = setTimeout(() => (statusBox.className = 'toast'), 3000);
  }

  function confirmDelete() {
    return new Promise((resolve) => {
      const handleClose = () => resolve(deleteDialog.returnValue === 'delete');
      deleteDialog.addEventListener('close', handleClose, { once: true });
      deleteDialog.showModal();
    });
  }

  deleteDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      deleteDialog.close('cancel');
    }
  });
  deleteDialog.addEventListener('click', (event) => {
    if (event.target === deleteDialog) deleteDialog.close('cancel');
  });

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${adminPassword}`,
      },
    });
    const result = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || `Yêu cầu không thành công (${response.status}).`);
    }
    return result;
  }

  async function loadLetters() {
    const letters = await request('/api/admin/letters');
    if (!Array.isArray(letters)) throw new Error('Máy chủ trả về danh sách tâm thư không hợp lệ.');
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

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (requestPending) return;
    requestPending = true;
    adminPassword = passwordInput.value;
    loginButton.disabled = true;
    loginButton.setAttribute('aria-busy', 'true');
    loginButton.querySelector('span').textContent = 'Đang xác thực...';
    try {
      await loadLetters();
      login.hidden = true;
      content.hidden = false;
      passwordInput.value = '';
      status('Đăng nhập thành công.');
    } catch (error) {
      adminPassword = '';
      passwordInput.value = '';
      passwordInput.focus();
      status(error.message, true);
    } finally {
      requestPending = false;
      loginButton.disabled = false;
      loginButton.removeAttribute('aria-busy');
      loginButton.querySelector('span').textContent = 'Đăng nhập';
    }
  });

  const refreshButton = document.querySelector('#refresh');
  refreshButton.addEventListener('click', async () => {
    if (requestPending) return;
    requestPending = true;
    refreshButton.disabled = true;
    refreshButton.setAttribute('aria-busy', 'true');
    refreshButton.textContent = 'Đang làm mới...';
    try {
      await loadLetters();
      status('Danh sách đã được làm mới.');
    } catch (error) {
      status(error.message, true);
    } finally {
      requestPending = false;
      refreshButton.disabled = false;
      refreshButton.removeAttribute('aria-busy');
      refreshButton.textContent = '↻ Làm mới';
    }
  });

  document.querySelector('#admin-logout').addEventListener('click', () => {
    if (requestPending) return;
    adminPassword = '';
    list.replaceChildren();
    content.hidden = true;
    login.hidden = false;
    passwordInput.focus();
  });

  list.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-id]');
    if (!button || requestPending) return;
    if (button.dataset.action === 'delete' && !(await confirmDelete())) return;
    requestPending = true;
    const action = button.dataset.action;
    const originalLabel = button.textContent;
    const actionButtons = [...list.querySelectorAll('button[data-id]')];
    actionButtons.forEach((actionButton) => { actionButton.disabled = true; });
    button.setAttribute('aria-busy', 'true');
    button.textContent = action === 'delete' ? 'Đang xóa...' : 'Đang cập nhật...';
    try {
      await request(`/api/letters/${encodeURIComponent(button.dataset.id)}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:
          action === 'delete'
            ? undefined
            : JSON.stringify({ status: action === 'hide' ? 'hidden' : 'approved' }),
      });
      await loadLetters();
      status(action === 'delete' ? 'Đã xóa tâm thư.' : action === 'hide' ? 'Đã ẩn tâm thư.' : 'Đã hiện tâm thư.');
    } catch (error) {
      button.textContent = originalLabel;
      status(error.message, true);
    } finally {
      requestPending = false;
      actionButtons.forEach((actionButton) => {
        if (actionButton.isConnected) actionButton.disabled = false;
      });
      if (button.isConnected) button.removeAttribute('aria-busy');
    }
  });
})();
