const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('voltstake_token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('voltstake_token', token);
  else localStorage.removeItem('voltstake_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  balance: () => request('/wallet/balance'),
  transactions: () => request('/wallet/transactions'),
  faucet: () => request('/wallet/faucet', { method: 'POST' }),
  history: () => request('/wallet/history'),

  xrplDepositInfo: () => request('/xrpl/deposit-info'),
  xrplDeposits: () => request('/xrpl/deposits'),
  xrplWithdrawals: () => request('/xrpl/withdrawals'),
  xrplVaultStatus: () => request('/xrpl/vault-status'),
  xrplWithdraw: (payload) => request('/xrpl/withdraw', { method: 'POST', body: payload }),

  playDice: (payload) => request('/games/dice/play', { method: 'POST', body: payload }),
  playCrash: (payload) => request('/games/crash/play', { method: 'POST', body: payload }),
  startMines: (payload) => request('/games/mines/start', { method: 'POST', body: payload }),
  revealMines: (payload) => request('/games/mines/reveal', { method: 'POST', body: payload }),
  cashoutMines: (payload) => request('/games/mines/cashout', { method: 'POST', body: payload }),
};
