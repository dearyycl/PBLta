const BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'kaika_admin_token';
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, auth = false, form = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let payload;
  if (body !== undefined) {
    if (form) payload = body;
    else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respon kosong */
  }
  if (!res.ok) {
    const err = new Error(data?.message || `Permintaan gagal (${res.status})`);
    err.status = res.status;
    err.errors = data?.errors;
    throw err;
  }
  return data;
}

/** URL gambar dari DB: absolut dipakai apa adanya, path relatif diawali BASE */
export function imageSrc(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const api = {
  categories: () => request('/categories'),
  menus: () => request('/menus'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  createQris: (payload) => request('/payments/qris', { method: 'POST', body: payload }),
  getPayment: (id) => request(`/payments/${id}`),
  simulatePaid: (id) => request(`/payments/${id}/simulate-paid`, { method: 'POST', body: {} }),

  login: (password) => request('/admin/login', { method: 'POST', body: { password } }),
  logout: () => request('/admin/logout', { method: 'POST', body: {}, auth: true }),
  adminOrders: () => request('/admin/orders', { auth: true }),
  setOrderStatus: (id, kitchen_status) =>
    request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { kitchen_status }, auth: true }),
  markOrderPaid: (id) => request(`/admin/orders/${id}/paid`, { method: 'PATCH', body: {}, auth: true }),
  adminMenus: () => request('/admin/menus', { auth: true }),
  saveMenu: (id, formData) => {
    if (id) formData.append('_method', 'PUT');
    return request(id ? `/admin/menus/${id}` : '/admin/menus', {
      method: 'POST',
      body: formData,
      form: true,
      auth: true,
    });
  },
  toggleMenu: (id) => request(`/admin/menus/${id}/toggle`, { method: 'PATCH', body: {}, auth: true }),
  deleteMenu: (id) => request(`/admin/menus/${id}`, { method: 'DELETE', auth: true }),
  report: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/reports${q ? `?${q}` : ''}`, { auth: true });
  },
};
