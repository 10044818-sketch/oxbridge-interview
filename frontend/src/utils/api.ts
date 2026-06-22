const API_BASE = '';  // 使用相对路径，通过统一服务器代理

// --- Types ---
export interface UserInfo {
  username: string;
  role: string;
  display_name: string;
}

export interface SessionInfo {
  id: number;
  user_id: number;
  subject: string;
  mode: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  score: number | null;
  feedback: string | null;
}

export interface SessionDetail {
  id: number;
  user_id: number;
  subject: string;
  mode: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  score: number | null;
  feedback: string | null;
  ai_feedback?: string;
  question?: string;
  conversation?: string;
  messages: { role: string; content: string; timestamp: string }[];
  drawing_data: string | null;
}

export interface SessionSummary {
  id: number;
  subject: string;
  mode: string;
  status: string;
  start_time: string;
  score: number | null;
  user_name?: string;
}

// --- Token helpers ---
function getToken(): string | null {
  return localStorage.getItem('oxbridge_token');
}

function setToken(token: string): void {
  localStorage.setItem('oxbridge_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('oxbridge_token');
}

// --- Core request ---
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- API functions ---

export async function login(username: string, password: string): Promise<{ token: string; username: string; role: string; display_name: string }> {
  const data = await request<{ token: string; username: string; role: string; display_name: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<UserInfo> {
  return request('/api/me');
}

// 获取题目（后端直接通过 /api/sessions 创建时返回题目）
export async function getQuestions(subject: string, mode: string): Promise<{ question: string }> {
  // 后端在创建 session 时直接返回题目，这里先返回一个默认题目
  const questions: Record<string, string> = {
    'math': '请用积分法求曲线 y=x² 与直线 y=2x+3 所围成的面积。请写出完整解题步骤。',
    'physics': '一个质量为 m 的物体从倾角为 30° 的斜面顶端静止释放，斜面光滑，高度为 h。求物体到达底端时的速度，并讨论能量转化过程。',
  };
  return { question: questions[subject] || '请解这道题。' };
}

export async function createSession(subject: string, mode: string): Promise<SessionDetail> {
  const data = await request<any>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ subject, mode }),
  });
  return {
    id: data.id,
    user_id: 0,
    subject: data.subject,
    mode: data.mode,
    status: 'active',
    start_time: new Date().toISOString(),
    end_time: null,
    duration: null,
    score: null,
    feedback: null,
    ai_feedback: '',
    question: data.question || '',
    conversation: '',
    messages: [],
    drawing_data: null,
  };
}

export async function getSession(id: number): Promise<SessionDetail> {
  const data = await request<any>(`/api/sessions/${id}`);
  return {
    id: data.id,
    user_id: data.user_id || 0,
    subject: data.subject,
    mode: data.mode,
    status: 'active',
    start_time: data.created_at || new Date().toISOString(),
    end_time: null,
    duration: data.duration,
    score: data.score,
    feedback: data.ai_feedback || null,
    ai_feedback: data.ai_feedback || '',
    question: data.question || '',
    conversation: data.conversation || '',
    messages: [],
    drawing_data: data.canvas_data || null,
  };
}

export async function getSessions(): Promise<SessionSummary[]> {
  const data = await request<any[]>('/api/sessions');
  return data.map((s: any) => ({
    id: s.id,
    subject: s.subject,
    mode: s.mode,
    status: 'active',
    start_time: s.created_at || '',
    score: s.score,
    user_name: s.user_name || '',
  }));
}

// 通过 WebSocket 发送消息（后端无 REST 消息接口）
export async function sendMessage(sessionId: number, content: string): Promise<{ role: string; content: string }> {
  // 实际通过 WebSocket 发送，这里返回模拟响应
  return { role: 'assistant', content: '（请通过面试界面与 AI 交互）' };
}

export async function saveDrawing(sessionId: number, drawingData: string): Promise<{ ok: boolean }> {
  // 通过 WebSocket 保存，这里返回成功
  return { ok: true };
}

export async function requestFeedback(sessionId: number, drawingData: string): Promise<{ feedback: string }> {
  return request(`/api/sessions/${sessionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ question: '', canvas_data: drawingData }),
  });
}

export async function getInterviewResponse(sessionId: number, message: string): Promise<{ content: string }> {
  // 面试模式通过 WebSocket，这里提供 REST 备选
  const data = await request<any>('/api/interview', {
    method: 'POST',
    body: JSON.stringify({ subject: 'math', topic: message, history: [], stage: 'warmup', elapsed: 0 }),
  });
  return { content: data.response || '' };
}

export async function completeSession(sessionId: number, duration: number, score?: number): Promise<{ ok: boolean }> {
  return request(`/api/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ duration, score }),
  });
}

export async function getSessionReport(sessionId: number): Promise<SessionDetail> {
  return getSession(sessionId);
}

// Admin APIs
export interface UserRecord {
  id: number;
  username: string;
  role: string;
  display_name: string;
  session_count: number;
  created_at: string;
}

export async function getUsers(): Promise<UserRecord[]> {
  return request('/api/users');
}

export async function createUser(username: string, password: string, displayName: string): Promise<{ ok: boolean }> {
  await request('/api/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, display_name: displayName }),
  });
  return { ok: true };
}

export async function deleteUser(userId: number): Promise<{ ok: boolean }> {
  await request(`/api/users/${userId}`, {
    method: 'DELETE',
  });
  return { ok: true };
}

// --- Default export (api object) ---
export default {
  login, getMe, getQuestions, createSession, getSession, getSessions,
  sendMessage, saveDrawing, requestFeedback, getInterviewResponse,
  completeSession, getSessionReport,
  getUsers, createUser, deleteUser,
};
