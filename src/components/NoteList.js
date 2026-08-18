import React from 'react';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function stripHtml(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

const VIEW_TITLES = {
  all: 'All Notes',
  favorites: 'Favorites',
  trash: 'Trash',
  folder: 'Folder',
  tag: 'Tag',
};

export default function NoteList({
  notes, selectedNote, onSelectNote, onCreateNote,
  search, onSearchChange, sortBy, onSortChange,
  activeView, mobileActive,
  onRestoreNote, onDeleteNotePermanent,
}) {
  const isTrash = activeView.type === 'trash';
  const pinned   = isTrash ? [] : notes.filter(n => n.is_pinned);
  const regular  = isTrash ? notes : notes.filter(n => !n.is_pinned);

  const title = VIEW_TITLES[activeView.type] || 'Notes';

  const renderCard = (note) => {
    const preview = stripHtml(note.content).slice(0, 110);
    const hasTags = note.tags && note.tags.length > 0;

    return (
      <div
        key={note.id}
        className={`note-card ${selectedNote?.id === note.id ? 'active' : ''}`}
        onClick={() => onSelectNote(note)}
      >
        <div className="note-card-accent" />

        {/* Color stripe on right */}
        {note.color && note.color !== 'none' && (
          <div className="note-color-stripe" style={{ background: note.color }} />
        )}

        <div className="note-card-top">
          {note.is_pinned    && <span className="note-badge">📌</span>}
          {note.is_favorite  && <span className="note-badge">⭐</span>}
          <span className={`note-title ${!note.title ? 'untitled' : ''}`}>
            {note.title || 'Untitled'}
          </span>
        </div>

        {preview && <div className="note-preview">{preview}</div>}

        <div className="note-meta">
          <span className="note-date">{timeAgo(note.updated_at)}</span>
          {hasTags && note.tags.slice(0, 2).map(t => (
            <span key={t.id} className="tag-chip" style={{ background: t.color || '#6366f1' }}>
              {t.name}
            </span>
          ))}
          {hasTags && note.tags.length > 2 && (
            <span className="tag-chip" style={{ background: 'var(--text-muted)' }}>
              +{note.tags.length - 2}
            </span>
          )}
          {note.word_count > 0 && (
            <span className="note-date">{note.word_count}w</span>
          )}
        </div>

        {isTrash && (
          <div className="trash-actions">
            <button
              className="trash-btn restore"
              onClick={e => { e.stopPropagation(); onRestoreNote(note.id); }}
            >↩ Restore</button>
            <button
              className="trash-btn delete-perm"
              onClick={e => { e.stopPropagation(); onDeleteNotePermanent(note.id); }}
            >🗑 Delete Forever</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`note-list-panel ${mobileActive ? 'mob-active' : ''}`}>
      {/* Header */}
      <div className="nlp-header">
        <div className="nlp-header-row">
          <span className="nlp-title">{title}</span>
          {!isTrash && (
            <button
              className="new-note-btn"
              onClick={onCreateNote}
              title="New note  (Ctrl+N)"
            >+</button>
          )}
        </div>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search notes…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Toolbar */}
      {!isTrash && (
        <div className="nlp-toolbar">
          <select
            className="sort-select"
            value={sortBy}
            onChange={e => onSortChange(e.target.value)}
          >
            <option value="date">Newest first</option>
            <option value="title">A → Z</option>
            <option value="words">Most words</option>
          </select>
          <span className="note-count">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
      )}

      {/* List */}
      <div className="notes-scroll">
        {notes.length === 0 ? (
          <div className="empty-panel">
            <div className="empty-icon">
              {isTrash ? '🗑' : activeView.type === 'favorites' ? '⭐' : '📝'}
            </div>
            <div className="empty-text">
              {isTrash
                ? 'Trash is empty'
                : activeView.type === 'favorites'
                ? 'No favorites yet\nStar a note to see it here'
                : search
                ? 'No notes match your search'
                : 'No notes yet\nPress + to create one'}
            </div>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <div className="section-mini-label">📌 Pinned</div>
                {pinned.map(renderCard)}
                {regular.length > 0 && (
                  <div className="section-mini-label" style={{ marginTop: 8 }}>Notes</div>
                )}
              </>
            )}
            {regular.map(renderCard)}
          </>
        )}
      </div>
    </div>
  );
}
