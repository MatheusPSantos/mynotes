const $ = (id) => document.getElementById(id);
const home = $('home'), editor = $('editor'), list = $('list'), text = $('text'), title = $('title'), status = $('status');
let current = null;
let timer = null;

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(res.status);
  return res.status === 204 ? null : res.json();
};

async function showHome() {
  await flush();
  current = null;
  editor.hidden = true;
  home.hidden = false;
  const notes = await api('/api/notes');
  list.innerHTML = '';
  $('empty').hidden = notes.length > 0;
  for (const n of notes) {
    const li = document.createElement('li');
    const body = document.createElement('div');
    body.className = 'body';
    if (n.title) {
      const h = document.createElement('div');
      h.className = 'title';
      h.textContent = n.title;
      body.append(h);
    }
    const p = document.createElement('div');
    p.className = 'preview' + (n.preview.trim() || n.title ? '' : ' blank');
    p.textContent = n.preview.trim() ? n.preview : (n.title ? '' : '(empty note)');
    const t = document.createElement('time');
    t.textContent = new Date(n.createdAt).toLocaleString();
    body.append(p, t);
    body.onclick = () => openNote(n.id);
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.className = 'danger';
    del.onclick = async () => {
      if (!confirm('Delete this note?')) return;
      await api(`/api/notes/${n.id}`, 'DELETE');
      showHome();
    };
    li.append(body, del);
    list.append(li);
  }
}

function showEditor(note) {
  current = note.id;
  title.value = note.title || '';
  text.value = note.content;
  status.textContent = '';
  home.hidden = true;
  editor.hidden = false;
  text.focus();
}

async function openNote(id) {
  showEditor(await api(`/api/notes/${id}`));
}

async function flush() {
  if (timer === null || !current) return;
  clearTimeout(timer);
  timer = null;
  await api(`/api/notes/${current}`, 'PUT', { title: title.value, content: text.value });
}

const onEdit = () => {
  status.textContent = 'Saving…';
  clearTimeout(timer);
  const id = current;
  timer = setTimeout(async () => {
    timer = null;
    await api(`/api/notes/${id}`, 'PUT', { title: title.value, content: text.value });
    status.textContent = 'Saved';
  }, 500);
};
text.addEventListener('input', onEdit);
title.addEventListener('input', onEdit);

$('new').onclick = async () => showEditor(await api('/api/notes', 'POST', { content: '' }));
$('back').onclick = showHome;
$('del').onclick = async () => {
  if (!confirm('Delete this note?')) return;
  clearTimeout(timer);
  timer = null;
  await api(`/api/notes/${current}`, 'DELETE');
  showHome();
};

window.addEventListener('beforeunload', () => {
  if (timer !== null && current) {
    navigator.sendBeacon && fetch(`/api/notes/${current}`, {
      method: 'PUT', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.value, content: text.value }),
    });
  }
});

showHome();
