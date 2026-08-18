import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Sidebar  from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor   from './components/Editor';
import { api } from './services/api';

/* ─── Toast hook ────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return { toasts, addToast: add };
}

/* ─── Export helpers ────────────────────────────────────────────────── */
function htmlToText(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

function htmlToMd(html, title) {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '_$1_')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
    .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `# ${title || 'Untitled'}\n\n${md}`;
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const SAFE_NAME = (s = 'untitled') => s.replace(/[^a-zA-Z0-9\-_ ]/g, '_').slice(0, 60) || 'untitled';

/* ─── ExportModal ─────────────────────────────────────────────────── */
function ExportModal({ note, onClose, addToast }) {
  const name = SAFE_NAME(note.title);
  const html = note.content || '';

  const doExport = (label, filename, content, mime) => {
    download(content, filename, mime);
    addToast(`Exported as ${filename}`, 'success');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">📤</div>
        <div className="modal-title">Export Note</div>
        <div className="export-grid">
          <button
            className="export-card"
            onClick={() => doExport('txt', `${name}.txt`, htmlToText(html), 'text/plain')}
          >
            <span className="export-card-icon">📄</span>
            <span className="export-card-name">Plain Text</span>
            <span className="export-card-ext">.txt</span>
          </button>
          <button
            className="export-card"
            onClick={() => doExport('md', `${name}.md`, htmlToMd(html, note.title), 'text/markdown')}
          >
            <span className="export-card-icon">📝</span>
            <span className="export-card-name">Markdown</span>
            <span className="export-card-ext">.md</span>
          </button>
          <button
            className="export-card"
            onClick={() => doExport('html', `${name}.html`,
              `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title || 'Note'}</title>` +
              `<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.75;color:#1a1a2e}` +
              `h1,h2,h3{letter-spacing:-.5px}code,pre{font-family:monospace;background:#f3f4f6;border-radius:6px}` +
              `pre{padding:1em;overflow-x:auto}code{padding:2px 6px}</style></head>` +
              `<body><h1>${note.title || 'Untitled'}</h1>${html}</body></html>`,
              'text/html'
            )}
          >
            <span className="export-card-icon">🌐</span>
            <span className="export-card-name">HTML</span>
            <span className="export-card-ext">.html</span>
          </button>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Command Palette ───────────────────────────────────────────────── */
function CommandPalette({ notes, folders, onSelectNote, onCreateNote, onToggleTheme, onClose }) {
  const [q, setQ]   = useState('');
  const [hi, setHi] = useState(0);
  const inputRef    = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  const commands = [
    { id: 'new',   icon: '✏️',  label: 'New Note',      shortcut: 'Ctrl+N', action: () => { onCreateNote(); onClose(); } },
    { id: 'theme', icon: '🌓',  label: 'Toggle Theme',  shortcut: '',        action: () => { onToggleTheme(); onClose(); } },
  ];

  const noteResults = q
    ? notes.filter(n => {
        const lq = q.toLowerCase();
        const el = document.createElement('div');
        el.innerHTML = n.content || '';
        const text = el.textContent || '';
        return (n.title || '').toLowerCase().includes(lq) || text.toLowerCase().includes(lq);
      }).slice(0, 7).map(n => ({
        id: n.id, icon: '📝',
        label: n.title || 'Untitled',
        sub: (() => { const el = document.createElement('div'); el.innerHTML = n.content || ''; return (el.textContent || '').trim().slice(0, 60); })(),
        action: () => { onSelectNote(n); onClose(); },
      }))
    : [];

  const cmdResults = commands.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()));
  const all = [...noteResults, ...cmdResults];

  const handleKey = e => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHi(h => Math.min(h + 1, all.length - 1)); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter')      { e.preventDefault(); all[hi]?.action?.(); }
    if (e.key === 'Escape')     onClose();
  };

  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="cp-box" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cp-input"
          placeholder="Search notes or type a command…"
          value={q}
          onChange={e => { setQ(e.target.value); setHi(0); }}
          onKeyDown={handleKey}
        />
        <div className="cp-results">
          {all.length === 0
            ? <div className="cp-empty">No results</div>
            : <>
                {noteResults.length > 0 && <div className="cp-group-label">Notes</div>}
                {noteResults.map((r, i) => (
                  <div key={r.id} className={`cp-item ${i === hi ? 'hi' : ''}`} onClick={r.action} onMouseEnter={() => setHi(i)}>
                    <span className="cp-item-icon">{r.icon}</span>
                    <span className="cp-item-label">{r.label}</span>
                    {r.sub && <span className="cp-item-sub">{r.sub}</span>}
                  </div>
                ))}
                {cmdResults.length > 0 && <div className="cp-group-label" style={{ marginTop: noteResults.length ? 8 : 0 }}>Commands</div>}
                {cmdResults.map((r, i) => {
                  const idx = noteResults.length + i;
                  return (
                    <div key={r.id} className={`cp-item ${idx === hi ? 'hi' : ''}`} onClick={r.action} onMouseEnter={() => setHi(idx)}>
                      <span className="cp-item-icon">{r.icon}</span>
                      <span className="cp-item-label">{r.label}</span>
                      {r.shortcut && <span className="cp-item-shortcut">{r.shortcut}</span>}
                    </div>
                  );
                })}
              </>
          }
        </div>
        <div className="cp-footer">
          <span className="cp-hint"><span className="cp-key">↑↓</span> navigate</span>
          <span className="cp-hint"><span className="cp-key">↵</span> open</span>
          <span className="cp-hint"><span className="cp-key">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

/* ─── App ───────────────────────────────────────────────────────────── */
const THEME_KEY     = 'noteflow_theme';
const LAST_NOTE_KEY = 'noteflow_last_note';

export default function App() {
  const [theme,    setTheme]    = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [notes,    setNotes]    = useState([]);
  const [folders,  setFolders]  = useState([]);
  const [tags,     setTags]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [view,     setView]     = useState({ type: 'all' });
  const [search,   setSearch]   = useState('');
  const [sortBy,   setSortBy]   = useState('date');
  const [server,   setServer]   = useState('connecting'); // connecting | online | offline
  const [palette,  setPalette]  = useState(false);
  const [delModal, setDelModal] = useState(null);   // { id, permanent }
  const [expModal, setExpModal] = useState(false);
  const [mPanel,   setMPanel]   = useState('list'); // 'list' | 'editor'
  const { toasts, addToast }    = useToast();

  /* ── Theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  /* ── Initial load ── */
  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const loadData = async () => {
    try {
      const [n, f, t] = await Promise.all([api.getNotes(), api.getFolders(), api.getTags()]);
      setNotes(n); setFolders(f); setTags(t);
      setServer('online');
      // Restore last open note
      const lastId = localStorage.getItem(LAST_NOTE_KEY);
      if (lastId) {
        const found = n.find(x => x.id === lastId);
        if (found) { setSelected(found); setMPanel('editor'); }
      }
    } catch {
      setServer('offline');
      addToast('⚠️  Could not reach server — start it with: cd notepad/server && npm start', 'error');
    }
  };

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPalette(p => !p); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createNote(); }
      if (e.key === 'Escape') { setPalette(false); setDelModal(null); setExpModal(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }); // intentionally no deps — createNote needs latest state

  /* ── Derived note list ── */
  const displayNotes = (() => {
    let list = [...notes];
    if (view.type === 'trash') {
      return list.filter(n => n.is_deleted);
    }
    list = list.filter(n => !n.is_deleted);
    if (view.type === 'favorites') list = list.filter(n => n.is_favorite);
    if (view.type === 'folder')    list = list.filter(n => n.folder_id === view.id);
    if (view.type === 'tag')       list = list.filter(n => n.tags?.some(t => t.id === view.id));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(n => {
        const el = document.createElement('div'); el.innerHTML = n.content || '';
        return (n.title || '').toLowerCase().includes(q) || (el.textContent || '').toLowerCase().includes(q);
      });
    }
    list.sort((a, b) => {
      if (Boolean(b.is_pinned) !== Boolean(a.is_pinned)) return Boolean(b.is_pinned) ? 1 : -1;
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'words') return (b.word_count || 0) - (a.word_count || 0);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
    return list;
  })();

  /* ── CRUD actions ── */
  const createNote = useCallback(async () => {
    try {
      const folderId = view.type === 'folder' ? view.id : null;
      const n = await api.createNote({ title: '', content: '', folder_id: folderId });
      setNotes(p => [n, ...p]);
      setSelected(n);
      setMPanel('editor');
      localStorage.setItem(LAST_NOTE_KEY, n.id);
    } catch { addToast('Failed to create note', 'error'); }
  }, [view, addToast]);

  const updateNote = useCallback(async (id, data) => {
    try {
      const updated = await api.updateNote(id, data);
      setNotes(p => p.map(n => n.id === id ? updated : n));
      setSelected(p => p?.id === id ? updated : p);
      return updated;
    } catch { addToast('Failed to save', 'error'); }
  }, [addToast]);

  const deleteNote = useCallback(async (id, permanent) => {
    try {
      if (permanent) {
        await api.permanentDelete(id);
        setNotes(p => p.filter(n => n.id !== id));
        addToast('Note permanently deleted', 'info');
      } else {
        await api.deleteNote(id);
        setNotes(p => p.map(n => n.id === id ? { ...n, is_deleted: true } : n));
        addToast('Moved to Trash', 'info');
      }
      if (selected?.id === id) { setSelected(null); setMPanel('list'); }
    } catch { addToast('Failed to delete', 'error'); }
    setDelModal(null);
  }, [selected, addToast]);

  const restoreNote = useCallback(async (id) => {
    try {
      await api.restoreNote(id);
      setNotes(p => p.map(n => n.id === id ? { ...n, is_deleted: false } : n));
      addToast('Note restored ✓', 'success');
    } catch { addToast('Failed to restore', 'error'); }
  }, [addToast]);

  const selectNote = useCallback(note => {
    setSelected(note);
    setMPanel('editor');
    if (note) localStorage.setItem(LAST_NOTE_KEY, note.id);
  }, []);

  /* ── Folder actions ── */
  const createFolder = useCallback(async (name) => {
    try {
      const f = await api.createFolder({ name });
      setFolders(p => [...p, f]);
      addToast(`Folder "${name}" created`, 'success');
    } catch { addToast('Failed to create folder', 'error'); }
  }, [addToast]);

  const deleteFolder = useCallback(async (id) => {
    try {
      await api.deleteFolder(id);
      setFolders(p => p.filter(f => f.id !== id));
      setNotes(p => p.map(n => n.folder_id === id ? { ...n, folder_id: null } : n));
      if (view.type === 'folder' && view.id === id) setView({ type: 'all' });
      addToast('Folder deleted', 'info');
    } catch { addToast('Failed to delete folder', 'error'); }
  }, [view, addToast]);

  /* ── Tag actions ── */
  const createTag = useCallback(async (name, color) => {
    try {
      const t = await api.createTag({ name, color });
      setTags(p => [...p, t]);
      addToast(`Tag "${name}" created`, 'success');
    } catch (err) { addToast(err.message || 'Failed to create tag', 'error'); }
  }, [addToast]);

  const deleteTag = useCallback(async (id) => {
    try {
      await api.deleteTag(id);
      setTags(p => p.filter(t => t.id !== id));
      setNotes(p => p.map(n => ({ ...n, tags: (n.tags || []).filter(t => t.id !== id) })));
      addToast('Tag deleted', 'info');
    } catch { addToast('Failed to delete tag', 'error'); }
  }, [addToast]);

  /* ── Counts for sidebar ── */
  const active   = notes.filter(n => !n.is_deleted);
  const folderCounts = Object.fromEntries(
    folders.map(f => [f.id, active.filter(n => n.folder_id === f.id).length])
  );

  return (
    <div className="app">
      <Sidebar
        activeView={view}
        onViewChange={v => { setView(v); setSelected(null); setMPanel('list'); setSearch(''); }}
        folders={folders}
        tags={tags}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        activeCount={active.length}
        favoriteCount={active.filter(n => n.is_favorite).length}
        trashCount={notes.filter(n => n.is_deleted).length}
        folderCounts={folderCounts}
        serverStatus={server}
      />

      <NoteList
        notes={displayNotes}
        selectedNote={selected}
        onSelectNote={selectNote}
        onCreateNote={createNote}
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeView={view}
        mobileActive={mPanel === 'list'}
        onRestoreNote={restoreNote}
        onDeleteNotePermanent={id => setDelModal({ id, permanent: true })}
      />

      <Editor
        note={selected}
        tags={tags}
        folders={folders}
        onUpdateNote={updateNote}
        onDeleteNote={id => setDelModal({ id, permanent: false })}
        onExport={() => setExpModal(true)}
        onBack={() => setMPanel('list')}
        mobileActive={mPanel === 'editor'}
        addToast={addToast}
      />

      {/* ── Delete confirmation modal ── */}
      {delModal && (
        <div className="modal-backdrop" onClick={() => setDelModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">{delModal.permanent ? '⚠️' : '🗑'}</div>
            <div className="modal-title">
              {delModal.permanent ? 'Delete permanently?' : 'Move to Trash?'}
            </div>
            <div className="modal-body">
              {delModal.permanent
                ? 'This note will be permanently deleted and cannot be recovered.'
                : 'This note will be moved to Trash. You can restore it any time.'}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDelModal(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => deleteNote(delModal.id, delModal.permanent)}
              >
                {delModal.permanent ? 'Delete Forever' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export modal ── */}
      {expModal && selected && (
        <ExportModal
          note={selected}
          onClose={() => setExpModal(false)}
          addToast={addToast}
        />
      )}

      {/* ── Command palette ── */}
      {palette && (
        <CommandPalette
          notes={notes.filter(n => !n.is_deleted)}
          folders={folders}
          onSelectNote={selectNote}
          onCreateNote={createNote}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onClose={() => setPalette(false)}
        />
      )}

      {/* ── Toast stack ── */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}