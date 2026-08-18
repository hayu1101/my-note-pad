import React, { useState, useEffect, useRef, useCallback } from 'react';

const NOTE_COLORS = [
  { label: 'None',   value: 'none'    },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber',  value: '#f59e0b' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Teal',   value: '#14b8a6' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink',   value: '#ec4899' },
];

function wordCount(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  const txt = (el.textContent || el.innerText || '').trim();
  return txt ? txt.split(/\s+/).filter(Boolean).length : 0;
}

function readTime(wc) {
  const m = Math.ceil(wc / 200);
  return m < 1 ? '< 1 min' : `~${m} min read`;
}

function charCount(html = '') {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').length;
}

export default function Editor({
  note, tags, folders,
  onUpdateNote, onDeleteNote, onExport,
  onBack, mobileActive, addToast,
}) {
  const editorRef     = useRef(null);
  const titleRef      = useRef(null);
  const saveTimer     = useRef(null);
  const [saveStatus, setSaveStatus]   = useState('saved');
  const [wc, setWc]                   = useState(0);
  const [showColor,  setShowColor]    = useState(false);
  const [showTags,   setShowTags]     = useState(false);
  const [showFolder, setShowFolder]   = useState(false);

  useEffect(() => {
    if (!note) return;
    if (editorRef.current) {
      
      editorRef.current.innerHTML = note.content || '';
      setWc(wordCount(note.content));
    }
    setSaveStatus('saved');
  
  }, [note?.id]);

  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('.dropdown-wrap') && !e.target.closest('.eab')) {
        setShowColor(false); setShowTags(false); setShowFolder(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scheduleSave = useCallback((id, content) => {
    setSaveStatus('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onUpdateNote(id, { content });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 900);
  }, [onUpdateNote]);

  const handleEditorInput = useCallback(() => {
    if (!note || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setWc(wordCount(html));
    scheduleSave(note.id, html);
  }, [note, scheduleSave]);

  const handleTitleBlur = useCallback(async (e) => {
    if (!note) return;
    await onUpdateNote(note.id, { title: e.target.value });
  }, [note, onUpdateNote]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleEditorInput();
  }, [handleEditorInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      exec('insertHTML', '\u00a0\u00a0\u00a0\u00a0');
    }
  }, [exec]);
  const toggleTag = async (tagId) => {
    const current = note.tags || [];
    const newIds = current.some(t => t.id === tagId)
      ? current.filter(t => t.id !== tagId).map(t => t.id)
      : [...current.map(t => t.id), tagId];
    await onUpdateNote(note.id, { tags: newIds });
  };

  const hasTag = (tagId) => note.tags?.some(t => t.id === tagId);

  if (!note) {
    return (
      <div className={`editor-panel ${mobileActive ? 'mob-active' : ''}`}>
        <div className="editor-idle">
          <div className="editor-idle-icon">🗒</div>
          <h3>Select or create a note</h3>
          <p>Choose a note from the list on the left, or press + to start writing.</p>
          <div className="editor-idle-kbd">
            <span>K</span><span style={{ color: 'var(--text-muted)' }}>or</span><span>Ctrl+K</span>
            <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>to open command palette</span>
          </div>
        </div>
      </div>
    );
  }

  const cc = charCount(note.content);

  return (
    <div className={`editor-panel ${mobileActive ? 'mob-active' : ''}`}>

    
      <div className="editor-header">
      
        <button
          className="eab mob-back"
          onClick={onBack}
          style={{ display: 'none', marginRight: 4 }}
          title="Back"
        >←</button>

        <div className="editor-title-wrap">
          <input
            ref={titleRef}
            className="editor-title"
            placeholder="Untitled Note"
            defaultValue={note.title || ''}
            key={note.id}           
            onBlur={handleTitleBlur}
            onKeyDown={e => e.key === 'Enter' && editorRef.current?.focus()}
          />
        </div>

        <div className="editor-actions">
          {/* Pin */}
          <button
            className={`eab ${note.is_pinned ? 'on' : ''}`}
            onClick={() => onUpdateNote(note.id, { is_pinned: !note.is_pinned })}
            title={note.is_pinned ? 'Unpin' : 'Pin note'}
          >📌</button>

          <button
            className={`eab ${note.is_favorite ? 'on' : ''}`}
            onClick={() => onUpdateNote(note.id, { is_favorite: !note.is_favorite })}
            title={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >⭐</button>

          <div className="dropdown-wrap">
            <button className="eab" onClick={() => { setShowColor(p => !p); setShowTags(false); setShowFolder(false); }} title="Color label">🎨</button>
            {showColor && (
              <div className="dropdown" style={{ minWidth: 'auto', padding: 12 }}>
                <div className="dropdown-label">Note color</div>
                <div className="color-palette">
                  {NOTE_COLORS.map(c => (
                    <div
                      key={c.value}
                      className={`color-swatch ${note.color === c.value ? 'selected' : ''}`}
                      style={{ background: c.value === 'none' ? 'var(--border)' : c.value }}
                      onClick={() => { onUpdateNote(note.id, { color: c.value }); setShowColor(false); }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="dropdown-wrap">
            <button
              className={`eab ${note.tags?.length ? 'on' : ''}`}
              onClick={() => { setShowTags(p => !p); setShowColor(false); setShowFolder(false); }}
              title="Manage tags"
            >🏷</button>
            {showTags && (
              <div className="dropdown">
                <div className="dropdown-label">Tags</div>
                {tags.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px 8px' }}>Create tags in the sidebar</div>
                  : tags.map(t => (
                    <div key={t.id} className="dropdown-item" onClick={() => toggleTag(t.id)}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{t.name}</span>
                      {hasTag(t.id) && <span className="dropdown-check">✓</span>}
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div className="dropdown-wrap">
            <button
              className={`eab ${note.folder_id ? 'on' : ''}`}
              onClick={() => { setShowFolder(p => !p); setShowColor(false); setShowTags(false); }}
              title="Move to folder"
            >📁</button>
            {showFolder && (
              <div className="dropdown">
                <div className="dropdown-label">Move to folder</div>
                <div
                  className="dropdown-item"
                  onClick={() => { onUpdateNote(note.id, { folder_id: null }); setShowFolder(false); }}
                >
                  <span>📋</span><span style={{ flex: 1 }}>No folder</span>
                  {!note.folder_id && <span className="dropdown-check">✓</span>}
                </div>
                {folders.map(f => (
                  <div
                    key={f.id}
                    className="dropdown-item"
                    onClick={() => { onUpdateNote(note.id, { folder_id: f.id }); setShowFolder(false); }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>📁 {f.name}</span>
                    {note.folder_id === f.id && <span className="dropdown-check">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="eab" onClick={onExport} title="Export note">📤</button>

          <button className="eab danger" onClick={() => onDeleteNote(note.id)} title="Move to trash">🗑</button>
        </div>
      </div>

      <div className="editor-toolbar">
        <select
          className="tb-select"
          defaultValue="div"
          onChange={e => {
            exec('formatBlock', e.target.value);
        
            e.target.value = 'div';
          }}
          title="Text style"
        >
          <option value="div"        disabled>Style…</option>
          <option value="p"          >Paragraph</option>
          <option value="h1"         >Heading 1</option>
          <option value="h2"         >Heading 2</option>
          <option value="h3"         >Heading 3</option>
          <option value="blockquote" >Quote</option>
          <option value="pre"        >Code Block</option>
        </select>

        <div className="tb-sep" />

        <button className="tb-btn" onClick={() => exec('bold')}          title="Bold (Ctrl+B)"><b>B</b></button>
        <button className="tb-btn" onClick={() => exec('italic')}        title="Italic (Ctrl+I)"><i>I</i></button>
        <button className="tb-btn" onClick={() => exec('underline')}     title="Underline (Ctrl+U)"><u>U</u></button>
        <button className="tb-btn" onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></button>

        <div className="tb-sep" />

        <button className="tb-btn" onClick={() => exec('insertUnorderedList')} title="Bullet list">• ≡</button>
        <button className="tb-btn" onClick={() => exec('insertOrderedList')}   title="Numbered list">1. ≡</button>
        <button className="tb-btn" onClick={() => exec('indent')}              title="Indent" style={{ fontSize: 15 }}>→</button>
        <button className="tb-btn" onClick={() => exec('outdent')}             title="Outdent" style={{ fontSize: 15 }}>←</button>

        <div className="tb-sep" />

        <button className="tb-btn" onClick={() => exec('justifyLeft')}   title="Align left">⫷</button>
        <button className="tb-btn" onClick={() => exec('justifyCenter')} title="Center">☰</button>
        <button className="tb-btn" onClick={() => exec('justifyRight')}  title="Align right">⫸</button>

        <div className="tb-sep" />

        <button
          className="tb-btn"
          onClick={() => {
            const url = window.prompt('Link URL:');
            if (url) exec('createLink', url);
          }}
          title="Insert link"
        >🔗</button>

        <button
          className="tb-btn"
          onClick={() => exec('insertHorizontalRule')}
          title="Horizontal divider"
        >─</button>

        <div className="tb-sep" />

        <button className="tb-btn" onClick={() => exec('undo')} title="Undo (Ctrl+Z)">↩</button>
        <button className="tb-btn" onClick={() => exec('redo')} title="Redo">↪</button>

        <div className="tb-sep" />

        <button className="tb-btn" onClick={() => exec('removeFormat')} title="Clear formatting" style={{ fontSize: 11, padding: '0 8px' }}>Clear</button>
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="note-tags-strip">
          {note.tags.map(t => (
            <span key={t.id} className="tag-chip" style={{ background: t.color || '#6366f1' }}>
              {t.name}
              <span
                style={{ marginLeft: 4, cursor: 'pointer', opacity: .7, fontSize: 11 }}
                onClick={() => toggleTag(t.id)}
              >✕</span>
            </span>
          ))}
        </div>
      )}

      <div className="editor-scroll">
        <div className="editor-content-wrap">
          <div
            ref={editorRef}
            className="editor-body"
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Start writing… Use the toolbar above to format your text."
            spellCheck
          />
        </div>
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <span>{wc} {wc === 1 ? 'word' : 'words'}</span>
          <span>·</span>
          <span>{cc} chars</span>
          {wc > 0 && <><span>·</span><span>{readTime(wc)}</span></>}
        </div>
        <div className="editor-save-status">
          <div className={`save-dot ${saveStatus}`} />
          <span>
            {saveStatus === 'saved'   ? 'Saved' :
             saveStatus === 'saving'  ? 'Saving…' :
             'Unsaved changes'}
          </span>
        </div>
      </div>
    </div>
  );
}
