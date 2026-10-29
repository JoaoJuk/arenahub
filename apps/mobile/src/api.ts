import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 3333;

/**
 * Endereço da API.
 *
 * No celular, `localhost` é o próprio aparelho — apontar para lá dá
 * "Network request failed" sem nunca chegar no seu PC. Como o bundle veio do
 * Metro rodando na sua máquina, o host dele é exatamente o IP que o celular
 * precisa usar para a API. Isso cobre celular na mesma rede e o emulador do
 * Android (10.0.2.2) sem configuração manual.
 *
 * Com `--tunnel`, ou em produção, defina `EXPO_PUBLIC_API_URL` — o host do
 * bundle ali não serve a API.
 */
function resolveBase(): string {
  // 1. Configuração explícita sempre ganha.
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const fromHost = (h?: string) => {
    const host = h?.split(':')[0];
    return host && host !== 'localhost' && host !== '127.0.0.1' ? `http://${host}:${API_PORT}` : null;
  };

  // 2. Via oficial do Expo: "192.168.0.10:8081".
  const viaExpo = fromHost(Constants.expoConfig?.hostUri);
  if (viaExpo) return viaExpo;

  // 3. Reserva, caso o manifesto não traga hostUri: o host de quem serviu o bundle.
  const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
  const viaBundle = fromHost(scriptURL?.match(/^http:\/\/([^/]+)/)?.[1]);
  if (viaBundle) return viaBundle;

  // 4. Web: a mesma máquina que serviu a página.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

const BASE = resolveBase();
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
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    // "Network request failed" / "Failed to fetch" não dizem nada para quem está
    // testando no celular. Aqui a mensagem já entrega o endereço tentado e as
    // duas causas reais: servidor desligado ou aparelho em outra rede.
    throw new Error(
      `Não conectou na API (${BASE}). Confira se o servidor está rodando ` +
      `(cd apps/api && npm run dev) e se o celular está no mesmo Wi-Fi do PC.`,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

/** Endereço em uso — útil para depurar conexão a partir de uma tela. */
export const apiBaseUrl = () => BASE;

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
  /** Jogador pede para entrar num racha aberto — fica aguardando o organizador. */
  requestToJoin: (bookingId: string) =>
    req(`/bookings/${bookingId}/join-request`, { method: 'POST', body: '{}' }),
  approveRequest: (bookingId: string, shareId: string) =>
    req(`/bookings/${bookingId}/requests/${shareId}/approve`, { method: 'POST', body: '{}' }),
  rejectRequest: (bookingId: string, shareId: string) =>
    req(`/bookings/${bookingId}/requests/${shareId}/reject`, { method: 'POST', body: '{}' }),
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
