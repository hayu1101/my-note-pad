import React, { useState } from 'react';

const TAG_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#06b6d4','#3b82f6',
];

export default function Sidebar({
  activeView, onViewChange, folders, tags,
  onCreateFolder, onDeleteFolder, onCreateTag, onDeleteTag,
  theme, onThemeToggle,
  activeCount, favoriteCount, trashCount, folderCounts,
  serverStatus,
}) {
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName]     = useState('');
  const [addingTag, setAddingTag]       = useState(false);
  const [tagName, setTagName]           = useState('');
  const [tagColor, setTagColor]         = useState(TAG_COLORS[0]);

  const handleAddFolder = async () => {
    if (!folderName.trim()) return;
    await onCreateFolder(folderName.trim());
    setFolderName(''); setAddingFolder(false);
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) return;
    await onCreateTag(tagName.trim(), tagColor);
    setTagName(''); setTagColor(TAG_COLORS[0]); setAddingTag(false);
  };

  const isActive = (type, id) =>
    activeView.type === type && activeView.id === id;

  return (
    <div className="sidebar">
      {/* ── Brand ── */}
      <div className="sidebar-brand">
        <div className="brand-logo">🗒</div>
        <div className="brand-text">
          <span className="brand-name">NoteFlow</span>
          <span className="brand-tagline">Professional Notes</span>
        </div>
        <div
          className={`brand-status ${serverStatus}`}
          title={`API server: ${serverStatus}`}
        />
      </div>

      <div className="sidebar-body">
        {/* ── Main Nav ── */}
        <div className="sidebar-section">
          {[
            { type: 'all',       icon: '📋', label: 'All Notes',  count: activeCount  },
            { type: 'favorites', icon: '⭐', label: 'Favorites',  count: favoriteCount },
            { type: 'trash',     icon: '🗑', label: 'Trash',      count: trashCount    },
          ].map(({ type, icon, label, count }) => (
            <div
              key={type}
              className={`nav-item ${activeView.type === type && !activeView.id ? 'active' : ''}`}
              onClick={() => onViewChange({ type })}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {count > 0 && <span className="nav-count">{count}</span>}
            </div>
          ))}
        </div>

        <div className="sidebar-divider" />

        {/* ── Folders ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">
            <span>Folders</span>
            <button
              className="sidebar-label-btn"
              onClick={() => { setAddingFolder(p => !p); setAddingTag(false); }}
              title="New folder"
            >+</button>
          </div>

          {addingFolder && (
            <div className="inline-add">
              <input
                className="inline-add-input"
                placeholder="Folder name…"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleAddFolder();
                  if (e.key === 'Escape') setAddingFolder(false);
                }}
                autoFocus
              />
              <button className="inline-add-submit" onClick={handleAddFolder}>✓</button>
            </div>
          )}

          {folders.map(f => (
            <div
              key={f.id}
              className={`nav-item ${isActive('folder', f.id) ? 'active' : ''}`}
              onClick={() => onViewChange({ type: 'folder', id: f.id })}
              title={f.name}
            >
              <span className="nav-icon">
                <span className="nav-color-dot" style={{ background: f.color || '#6366f1' }} />
              </span>
              <span className="nav-label">📁 {f.name}</span>
              <span className="nav-count">{folderCounts[f.id] || 0}</span>
            </div>
          ))}

          {folders.length === 0 && !addingFolder && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 12px' }}>
              No folders yet
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        {/* ── Tags ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">
            <span>Tags</span>
            <button
              className="sidebar-label-btn"
              onClick={() => { setAddingTag(p => !p); setAddingFolder(false); }}
              title="New tag"
            >+</button>
          </div>

          {addingTag && (
            <div style={{ padding: '0 8px 8px' }}>
              <input
                className="inline-add-input"
                placeholder="Tag name…"
                value={tagName}
                onChange={e => setTagName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleAddTag();
                  if (e.key === 'Escape') setAddingTag(false);
                }}
                autoFocus
                style={{ width: '100%', marginBottom: 6 }}
              />
              <div className="color-palette">
                {TAG_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-swatch ${tagColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setTagColor(c)}
                  />
                ))}
              </div>
              <button
                className="inline-add-submit"
                onClick={handleAddTag}
                style={{ width: '100%', borderRadius: 8, height: 30, marginTop: 6 }}
              >Create Tag</button>
            </div>
          )}

          {tags.map(t => (
            <div
              key={t.id}
              className={`nav-item ${isActive('tag', t.id) ? 'active' : ''}`}
              onClick={() => onViewChange({ type: 'tag', id: t.id })}
              title={t.name}
            >
              <span className="nav-icon">
                <span className="nav-color-dot" style={{ background: t.color || '#6366f1' }} />
              </span>
              <span className="nav-label"># {t.name}</span>
            </div>
          ))}

          {tags.length === 0 && !addingTag && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 12px' }}>
              No tags yet
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={onThemeToggle}>
          <span className="nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </div>
  );
}
