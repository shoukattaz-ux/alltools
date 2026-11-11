export {};
const form = document.getElementById('contact-form') as HTMLFormElement | null;
const statusEl = document.getElementById('contact-statusEl')!;
function show(kind: 'error' | 'success', msg: string) {
  statusEl.innerHTML = '';
  const d = document.createElement('div');
  d.className = `notice notice-${kind}`;
  d.textContent = msg;
  if (kind === 'error') d.setAttribute('role', 'alert');
  statusEl.appendChild(d);
}
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const to = form.dataset.email;
  if (!to) return show('error', 'A contact address has not been configured yet.');
  const fd = new FormData(form);
  const name = String(fd.get('name') ?? '').trim().slice(0, 80);
  const email = String(fd.get('email') ?? '').trim().slice(0, 120);
  const message = String(fd.get('message') ?? '').trim().slice(0, 3000);
  const topic = String(fd.get('topic') ?? '').slice(0, 60);
  if (!name) return show('error', 'Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('error', 'Please enter a valid email address.');
  if (message.length < 10) return show('error', 'Please write a message of at least 10 characters.');
  const subject = `[Website] ${topic}`;
  const body = `${message}\n\n— ${name} <${email}>`;
  location.href = `mailto:${encodeURIComponent(to).replace('%40', '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  show('success', 'Your email app should open with the message ready to send. If nothing happens, copy the address above and write to us directly.');
});
