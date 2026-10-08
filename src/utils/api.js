import { auth } from './firebase';

const API = import.meta.env.VITE_BACKEND_URL;

// Calls the backend as the signed in user. The backend verifies the Firebase ID token.
export async function api(path, { method = 'GET', json, form } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const headers = { Authorization: `Bearer ${await user.getIdToken()}` };
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  const res = await fetch(`${API}${path}`, { method, headers, body });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status });
  }
  return data;
}
