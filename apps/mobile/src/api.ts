import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';
let token: string | null = null;

export async function loadToken() {
  token = await AsyncStorage.getItem('token');
  return token;
}
export async function setToken(t: string | null) {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}
export async function setRole(r: string | null) {
  if (r) await AsyncStorage.setItem('role', r);
  else await AsyncStorage.removeItem('role');
}
export async function loadRole() {
  return AsyncStorage.getItem('role');
}
export const homeOf = (role: string | null) =>
  role === 'owner' ? '/owner' : role === 'admin' ? '/admin' : '/(tabs)';

async function req(path: string, options: RequestInit = {}) {
  const hasBody = !!options.body;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body: object) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  verifyRequest: (channel: 'email' | 'phone', target: string) =>
    req('/verify/request', { method: 'POST', body: JSON.stringify({ channel, target }) }),
  verifyConfirm: (channel: 'email' | 'phone', target: string, code: string) =>
    req('/verify/confirm', { method: 'POST', body: JSON.stringify({ channel, target, code }) }),
  me: () => req('/me'),
  arenas: (q = '', sport = '') =>
    req(`/arenas?q=${encodeURIComponent(q)}&sport=${encodeURIComponent(sport)}`),
  arena: (id: string) => req(`/arenas/${id}`),
  availability: (courtId: string, date: string) =>
    req(`/courts/${courtId}/availability?date=${date}`),
  createBooking: (body: object) =>
    req('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  openMatches: () => req('/bookings/open'),
  myBookings: () => req('/bookings/mine'),
  booking: (id: string) => req(`/bookings/${id}`),
  cancelBooking: (id: string) => req(`/bookings/${id}/cancel`, { method: 'POST', body: '{}' }),
  searchUsers: (q: string) => req(`/users/search?q=${encodeURIComponent(q)}`),
  recentInvites: () => req('/users/recent-invites'),
  inviteUser: (bookingId: string, userId: string) =>
    req(`/bookings/${bookingId}/invite`, { method: 'POST', body: JSON.stringify({ userId }) }),
  pendingInvites: () => req('/invites'),
  acceptInvite: (shareId: string) => req(`/invites/${shareId}/accept`, { method: 'POST', body: '{}' }),
  declineInvite: (shareId: string) => req(`/invites/${shareId}/decline`, { method: 'POST', body: '{}' }),
  payMyShare: (bookingId: string) => req(`/bookings/${bookingId}/pay-share`, { method: 'POST', body: '{}' }),
  updatePublicMatch: (bookingId: string, body: object) =>
    req(`/bookings/${bookingId}/public`, { method: 'PATCH', body: JSON.stringify(body) }),
  // Dono da arena
  ownerSummary: () => req('/owner/summary'),
  ownerArenas: () => req('/owner/arenas'),
  ownerPerformance: (days: number) => req(`/owner/performance?days=${days}`),
  ownerReviews: () => req('/owner/reviews'),
  reviewArena: (id: string, body: object) =>
    req(`/arenas/${id}/reviews`, { method: 'POST', body: JSON.stringify(body) }),
  ownerAgenda: (courtId: string, date: string) =>
    req(`/owner/agenda?courtId=${courtId}&date=${date}`),
  ownerBlock: (body: object) => req('/owner/block', { method: 'POST', body: JSON.stringify(body) }),
  ownerUnblock: (id: string) => req(`/owner/unblock/${id}`, { method: 'POST' }),
  createArena: (body: object) => req('/arenas', { method: 'POST', body: JSON.stringify(body) }),
  createCourt: (arenaId: string, body: object) =>
    req(`/arenas/${arenaId}/courts`, { method: 'POST', body: JSON.stringify(body) }),
  // Admin
  adminStats: () => req('/admin/stats'),
  adminUsers: () => req('/admin/users'),
  adminArenas: () => req('/admin/arenas'),
  adminSetRole: (id: string, role: string) =>
    req(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminCancelBooking: (id: string) => req(`/admin/bookings/${id}/cancel`, { method: 'POST' }),
};
