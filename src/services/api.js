const BASE = 'http://localhost:5000/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request('/health'),

  // Notes
  getNotes: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
    ).toString();
    return request(`/notes${qs ? `?${qs}` : ''}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  permanentDelete: (id) => request(`/notes/${id}/permanent`, { method: 'DELETE' }),
  restoreNote: (id) => request(`/notes/${id}/restore`, { method: 'POST' }),
  getNoteVersions: (id) => request(`/notes/${id}/versions`),

  // Folders
  getFolders: () => request('/folders'),
  createFolder: (data) => request('/folders', { method: 'POST', body: JSON.stringify(data) }),
  updateFolder: (id, data) => request(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => request('/tags'),
  createTag: (data) => request('/tags', { method: 'POST', body: JSON.stringify(data) }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => request('/stats'),
};
