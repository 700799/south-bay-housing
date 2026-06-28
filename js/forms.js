/* Contact + valuation form submission via Web3Forms (works on static hosting).
   Submits over fetch so the visitor stays on the page and sees an inline
   confirmation instead of being redirected. */
(function () {
  // ▼▼▼ PASTE ANNA'S WEB3FORMS ACCESS KEY HERE (free key from https://web3forms.com) ▼▼▼
  const WEB3FORMS_ACCESS_KEY = 'YOUR_WEB3FORMS_ACCESS_KEY';
  // ▲▲▲ that's the only manual step — both forms use this one key ▲▲▲

  const ENDPOINT = 'https://api.web3forms.com/submit';

  function statusEl(form) {
    let s = form.querySelector('.form-status');
    if (!s) {
      s = document.createElement('p');
      s.className = 'form-status';
      s.setAttribute('role', 'status');
      s.setAttribute('aria-live', 'polite');
      form.appendChild(s);
    }
    return s;
  }

  function setStatus(el, msg, kind) {
    el.textContent = msg;
    el.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('[type="submit"]');
    const status = statusEl(form);
    const original = btn ? btn.textContent : '';

    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    setStatus(status, '', '');

    try {
      const data = new FormData(form);
      data.set('access_key', WEB3FORMS_ACCESS_KEY);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        form.reset();
        setStatus(status, "Thanks — your message was sent. Anna will be in touch soon.", 'ok');
      } else {
        setStatus(status, (json && json.message) || 'Something went wrong. Please call 408-823-1538.', 'err');
      }
    } catch (err) {
      setStatus(status, 'Network error — please call 408-823-1538 or email Anna@annabayhomes.com.', 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form[data-web3form]').forEach((f) => f.addEventListener('submit', onSubmit));
  });
})();
