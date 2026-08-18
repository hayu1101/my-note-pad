const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb, run, all, get, persist } = require('./db');

const app  = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let ready = false;
getDb().then(() => {
  ready = true;
  console.log('  💾  Database ready');
}).catch(e => console.error('DB init failed:', e));

app.use((req, res, next) => {
  if (!ready) return res.status(503).json({ error: 'Database initialising, try again shortly' });
  next();
});

const wordCount = (html = '') => {
  const txt = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return txt ? txt.split(/\s+/).filter(Boolean).length : 0;
};

const now = () => new Date().toISOString();

const bool = v => v === 1 || v === true;

const withTags = (note) => {
  if (!note) return null;
  const tags = all(
    'SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?',
    [note.id]
  );
  return { ...note, is_pinned: bool(note.is_pinned), is_favorite: bool(note.is_favorite), is_deleted: bool(note.is_deleted), tags };
};

const setTags = (noteId, tagIds = []) => {
  run('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
  tagIds.forEach(tid => run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tid]));
};

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: now() }));

app.get('/api/folders', (_, res) => {
  res.json(all('SELECT * FROM folders ORDER BY name'));
});

app.post('/api/folders', (req, res) => {
  const { name, color = '#6366f1' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const id = uuidv4(), n = now();
  run('INSERT INTO folders (id,name,color,created_at,updated_at) VALUES (?,?,?,?,?)', [id, name.trim(), color, n, n]);
  res.json({ id, name: name.trim(), color, created_at: n, updated_at: n });
});

app.put('/api/folders/:id', (req, res) => {
  const { name, color } = req.body;
  const n = now();
  run('UPDATE folders SET name=?,color=?,updated_at=? WHERE id=?', [name, color, n, req.params.id]);
  res.json({ id: req.params.id, name, color, updated_at: n });
});

app.delete('/api/folders/:id', (req, res) => {
  run('UPDATE notes SET folder_id=NULL WHERE folder_id=?', [req.params.id]);
  run('DELETE FROM folders WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/tags', (_, res) => {
  res.json(all('SELECT * FROM tags ORDER BY name'));
});

app.post('/api/tags', (req, res) => {
  const { name, color = '#6366f1' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const existing = get('SELECT id FROM tags WHERE name=?', [name.trim()]);
  if (existing) return res.status(400).json({ error: 'Tag already exists' });
  const id = uuidv4();
  run('INSERT INTO tags (id,name,color) VALUES (?,?,?)', [id, name.trim(), color]);
  res.json({ id, name: name.trim(), color });
});

app.delete('/api/tags/:id', (req, res) => {
  run('DELETE FROM note_tags WHERE tag_id=?', [req.params.id]);
  run('DELETE FROM tags WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/notes', (req, res) => {
  const { folder_id, tag_id, is_deleted, is_favorite, search } = req.query;
  const conditions = [];
  const params = [];

  conditions.push(is_deleted === 'true' ? 'n.is_deleted=1' : 'n.is_deleted=0');
  if (folder_id)             { conditions.push('n.folder_id=?');              params.push(folder_id); }
  if (is_favorite === 'true'){ conditions.push('n.is_favorite=1'); }
  if (search) {
    conditions.push('(n.title LIKE ? OR n.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  let notes = all(
    `SELECT n.*, f.name AS folder_name FROM notes n LEFT JOIN folders f ON n.folder_id=f.id ${where} ORDER BY n.is_pinned DESC, n.updated_at DESC`,
    params
  ).map(withTags);

  if (tag_id) notes = notes.filter(n => n.tags.some(t => t.id === tag_id));
  res.json(notes);
});

app.get('/api/notes/:id', (req, res) => {
  const note = get('SELECT * FROM notes WHERE id=?', [req.params.id]);
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(withTags(note));
});

app.post('/api/notes', (req, res) => {
  const { title = '', content = '', folder_id = null, color = 'none', tags = [] } = req.body;
  const id = uuidv4(), n = now(), wc = wordCount(content);
  run(
    'INSERT INTO notes (id,title,content,folder_id,color,word_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, title, content, folder_id, color, wc, n, n]
  );
  setTags(id, tags);
  res.json(withTags(get('SELECT * FROM notes WHERE id=?', [id])));
});

app.put('/api/notes/:id', (req, res) => {
  const { title, content, folder_id, color, is_pinned, is_favorite, tags } = req.body;
  const n = now();

  const curr = get('SELECT * FROM notes WHERE id=?', [req.params.id]);
  if (curr && (content !== undefined || title !== undefined)) {
    const vid = uuidv4();
    run('INSERT INTO note_versions (id,note_id,title,content,created_at) VALUES (?,?,?,?,?)',
        [vid, req.params.id, curr.title, curr.content, n]);
    
    const vers = all('SELECT id FROM note_versions WHERE note_id=? ORDER BY created_at DESC', [req.params.id]);
    vers.slice(5).forEach(v => run('DELETE FROM note_versions WHERE id=?', [v.id]));
  }

  const sets = [], vals = [];
  if (title !== undefined)      { sets.push('title=?');      vals.push(title); }
  if (content !== undefined)    { sets.push('content=?','word_count=?'); vals.push(content, wordCount(content)); }
  if (folder_id !== undefined)  { sets.push('folder_id=?');  vals.push(folder_id); }
  if (color !== undefined)      { sets.push('color=?');       vals.push(color); }
  if (is_pinned !== undefined)  { sets.push('is_pinned=?');   vals.push(is_pinned ? 1 : 0); }
  if (is_favorite !== undefined){ sets.push('is_favorite=?'); vals.push(is_favorite ? 1 : 0); }
  sets.push('updated_at=?'); vals.push(n, req.params.id);

  if (sets.length > 1) run(`UPDATE notes SET ${sets.join(',')} WHERE id=?`, vals);
  if (tags !== undefined) setTags(req.params.id, tags);

  res.json(withTags(get('SELECT * FROM notes WHERE id=?', [req.params.id])));
});

// Trash
app.delete('/api/notes/:id', (req, res) => {
  run('UPDATE notes SET is_deleted=1,deleted_at=? WHERE id=?', [now(), req.params.id]);
  res.json({ success: true });
});

// Permanent delete
app.delete('/api/notes/:id/permanent', (req, res) => {
  run('DELETE FROM note_tags WHERE note_id=?',    [req.params.id]);
  run('DELETE FROM note_versions WHERE note_id=?',[req.params.id]);
  run('DELETE FROM notes WHERE id=?',             [req.params.id]);
  res.json({ success: true });
});

// Restore from trash
app.post('/api/notes/:id/restore', (req, res) => {
  run('UPDATE notes SET is_deleted=0,deleted_at=NULL WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// Version history
app.get('/api/notes/:id/versions', (req, res) => {
  res.json(all('SELECT * FROM note_versions WHERE note_id=? ORDER BY created_at DESC', [req.params.id]));
});

app.get('/api/stats', (_, res) => {
  const totalNotes   = get('SELECT COUNT(*) AS c FROM notes WHERE is_deleted=0').c;
  const totalWords   = get('SELECT SUM(word_count) AS w FROM notes WHERE is_deleted=0').w || 0;
  const totalFolders = get('SELECT COUNT(*) AS c FROM folders').c;
  res.json({ totalNotes, totalWords, totalFolders });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  🗒   NoteFlow API Server');
  console.log(`  🚀   http://localhost:${PORT}`);
  console.log('');
});
