document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');

  function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'alert';
    if (type === 'success') toast.classList.add('alert--success');
    if (type === 'danger') toast.classList.add('alert--danger');

    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.bottom = '20px';
    toast.style.zIndex = 9999;
    toast.style.transition = 'transform .22s ease, opacity .22s ease';
    toast.style.transform = 'translateY(8px)';
    toast.style.opacity = '0';

    toast.textContent = message;
    document.body.appendChild(toast);

    // animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // remove after 3.2s
    setTimeout(() => {
      toast.style.transform = 'translateY(8px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 240);
    }, 3200);

    return toast;
  }

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = (form.querySelector('#name') || {}).value || '';
    const email = (form.querySelector('#email') || {}).value || '';
    const message = (form.querySelector('#message') || {}).value || '';

    if (!name.trim() || !email.trim()) {
      createToast('Please enter your name and email.', 'danger');
      return;
    }
    if (!validateEmail(email)) {
      createToast('Please enter a valid email address.', 'danger');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      const prevText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending...';
      try {
        // simulate network request
        await new Promise((r) => setTimeout(r, 900));
        createToast('Message sent — thank you!', 'success');
        form.reset();
      } catch (err) {
        createToast('Failed to send message. Try again.', 'danger');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = prevText;
        }
      }
    }
  });

  // Optional: simple keyboard shortcut to focus form (press "c")
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const firstInput = form.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }
  });
});
