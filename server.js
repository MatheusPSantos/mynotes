const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(process.env.NOTES_DATA_DIR || path.join(__dirname, 'data'), 'notes.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PREVIEW_LENGTH = 140;

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

const readNotes = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeNotes = (notes) => {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(notes));
  fs.renameSync(tmp, DATA_FILE);
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const summary = (n) => ({
  id: n.id,
  title: n.title || '',
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  preview:
    n.content.length > PREVIEW_LENGTH
      ? n.content.slice(0, PREVIEW_LENGTH).trimEnd() + '…'
      : n.content,
});

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && STATIC[pathname]) {
      const [file, type] = STATIC[pathname];
      return send(res, 200, fs.readFileSync(path.join(PUBLIC_DIR, file)), type);
    }

    if (pathname === '/api/notes' && req.method === 'GET') {
      // Chronological: newest first
      const notes = readNotes().sort((a, b) => b.createdAt - a.createdAt);
      return send(res, 200, notes.map(summary));
    }

    if (pathname === '/api/notes' && req.method === 'POST') {
      const { content = '', title = '' } = JSON.parse((await readBody(req)) || '{}');
      const now = Date.now();
      const note = { id: crypto.randomUUID(), title: String(title).trim(), content: String(content), createdAt: now, updatedAt: now };
      const notes = readNotes();
      notes.push(note);
      writeNotes(notes);
      return send(res, 201, note);
    }

    const m = pathname.match(/^\/api\/notes\/([\w-]+)$/);
    if (m) {
      const notes = readNotes();
      const idx = notes.findIndex((n) => n.id === m[1]);
      if (idx === -1) return send(res, 404, { error: 'Not found' });

      if (req.method === 'GET') return send(res, 200, notes[idx]);

      if (req.method === 'PUT') {
        const { content = '', title = '' } = JSON.parse((await readBody(req)) || '{}');
        notes[idx].title = String(title).trim();
        notes[idx].content = String(content);
        notes[idx].updatedAt = Date.now();
        writeNotes(notes);
        return send(res, 200, notes[idx]);
      }

      if (req.method === 'DELETE') {
        notes.splice(idx, 1);
        writeNotes(notes);
        return send(res, 204, '', 'text/plain');
      }
    }

    send(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'Server error' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Notes app running at http://localhost:${PORT}`));
}

module.exports = server;
