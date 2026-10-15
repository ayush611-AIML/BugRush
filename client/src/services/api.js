const API_BASE = '/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('bugrush_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  guest: () => request('/auth/guest', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Challenges
  getChallenges: () => request('/challenges'),
  getChallenge: (id) => request(`/challenges/${id}`),

  // Leaderboard
  getLeaderboard: () => request('/leaderboard'),
  getRecentMatches: () => request('/leaderboard/recent-matches'),

  // Profile
  getProfile: (username) => request(`/profile/${encodeURIComponent(username)}`)
};
