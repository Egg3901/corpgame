import axios from 'axios';

// Automatically detect API URL based on current location
// In production (behind nginx), use same origin and proxy /api to backend.
// In local dev, default to backend on port 3001.
// Falls back to environment variable or localhost for SSR/build time.
const getApiUrl = (): string => {
  // If explicitly set, always respect it (works for both browser + SSR)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    // Always use current origin (localhost:3000 in dev)
    // Next.js rewrites will handle proxying to backend on 3001 if route doesn't exist
    return origin;
  }

  // SSR/build time: default to local backend unless overridden
  return 'http://localhost:3000';
};

// Debug function - logs API URL detection
const debugApiUrl = (): void => {
  if (typeof window !== 'undefined') {
    console.log('API URL Detection:', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      detectedUrl: getApiUrl()
    });
  }
};

// Call debug function (only in browser)
if (typeof window !== 'undefined') {
  debugApiUrl();
}

// Create axios instance - baseURL will be set dynamically per request
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor: Set baseURL dynamically and add auth token
api.interceptors.request.use((config) => {
  // Dynamically set baseURL based on current window location (for browser requests)
  if (typeof window !== 'undefined' && !config.baseURL) {
    config.baseURL = getApiUrl();
  } else if (!config.baseURL) {
    // Fallback for SSR
    config.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  
  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error for debugging
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - is the backend server running?');
    } else if (error.message === 'Network Error') {
      console.error('Network error - check CORS settings and server availability');
    }
    return Promise.reject(error);
  }
);

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  registration_secret?: string;
  admin_secret?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    profile_id: number;
    email: string;
    username: string;
    player_name?: string;
    gender?: 'm' | 'f' | 'nonbinary';
    age?: number;
    starting_state?: string;
    is_admin?: boolean;
    profile_slug?: string;
    profile_image_url?: string | null;
    bio?: string;
    actions?: number;
    is_banned?: boolean;
    registration_ip?: string;
    last_login_ip?: string;
    last_login_at?: string;
  };
}

export interface ProfileResponse {
  id: number;
  profile_id: number;
  email: string;
  username: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  profile_slug?: string;
  profile_image_url?: string | null;
  bio?: string;
  cash?: number;
  actions?: number;
  is_admin?: boolean;
  is_banned?: boolean;
  last_seen_at?: string;
  is_online?: boolean;
  created_at: string;
}

export type CorpFocus = 'extraction' | 'production' | 'retail' | 'service' | 'diversified';

export interface CorporationResponse {
  id: number;
  ceo_id: number;
  name: string;
  description?: string | null;
  logo?: string | null;
  shares: number;
  public_shares: number;
  share_price: number;
  capital?: number;
  cash?: number;
  type?: string | null;
  hq_state?: string | null;
  board_size?: number;
  elected_ceo_id?: number | null;
  ceo_salary?: number;
  dividend_percentage?: number;
  special_dividend_last_paid_at?: string | null;
  special_dividend_last_amount?: number | null;
  focus?: CorpFocus;
  created_at: string;
  price_change_4h?: number;
  ceo?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_slug: string;
    profile_image_url?: string | null;
  } | null;
  shareholders?: ShareholderResponse[];
}

export interface CorporationListItemResponse {
  id: number;
  name: string;
  logo: string | null;
  sector: string;
  ceo: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_slug: string;
    profile_image_url?: string | null;
  } | null;
  shares: number;
  share_price: number;
  market_cap: number;
  revenue_96h: number;
  costs_96h: number;
  profit_96h: number;
  assets: number;
  book_value: number;
}

export interface ShareholderResponse {
  id: number;
  corporation_id: number;
  user_id: number;
  shares: number;
  purchased_at: string;
  user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_slug: string;
    profile_image_url?: string | null;
  } | null;
}

export interface PortfolioHolding {
  corporation: {
    id: number;
    name: string;
    logo?: string | null;
    share_price: number;
    total_shares: number;
    type?: string | null;
  };
  shares_owned: number;
  current_value: number;
  ownership_percentage: number;
  purchased_at: string;
}

export interface PortfolioResponse {
  user_id: number;
  holdings: PortfolioHolding[];
  total_value: number;
  dividend_income: number;
}

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/auth/register', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Registration API error:', error);
      throw error;
    }
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/auth/login', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  getMe: async (): Promise<ProfileResponse> => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error: unknown) {
      console.error('GetMe API error:', error);
      throw error;
    }
  },
};

export interface CorporateHistoryItem {
  type: 'founded' | 'elected_ceo' | 'lost_ceo' | 'ceo_resigned';
  corporation_id: number;
  corporation_name: string;
  date: string;
  details?: string;
}

export interface UserHistoryResponse {
  user_id: number;
  history: CorporateHistoryItem[];
}

export const profileAPI = {
  getById: async (profileId: string | number): Promise<ProfileResponse> => {
    const response = await api.get(`/api/profile/${profileId}`);
    return response.data;
  },
  getHistory: async (userId: number): Promise<UserHistoryResponse> => {
    const response = await api.get(`/api/profile/${userId}/history`);
    return response.data;
  },
  uploadAvatar: async (file: File): Promise<{ profile_image_url: string }> => {
    console.log('API: Starting avatar upload for file:', file.name, 'size:', file.size);
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/api/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('API: Avatar upload response:', response.data);
    return response.data;
  },
  updateProfile: async (data: { bio?: string }): Promise<ProfileResponse> => {
    const response = await api.patch('/api/profile/update', data);
    return response.data;
  },
};

export const corporationAPI = {
  getAll: async (): Promise<CorporationResponse[]> => {
    const response = await api.get('/api/corporation');
    return response.data;
  },
  getList: async (params: {
    page?: number;
    limit?: number;
    sort?: 'revenue' | 'profit' | 'assets' | 'market_cap' | 'share_price' | 'book_value' | 'name';
    dir?: 'asc' | 'desc';
    sector?: string;
    q?: string;
    ceo?: string;
  }): Promise<{ items: CorporationListItemResponse[]; total: number; page: number; limit: number; available_metrics: string[]; sectors: string[] }> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.sort) query.append('sort', params.sort);
    if (params.dir) query.append('dir', params.dir);
    if (params.sector) query.append('sector', params.sector);
    if (params.q) query.append('q', params.q);
    if (params.ceo) query.append('ceo', params.ceo);
    const response = await api.get(`/api/corporation/list${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data;
  },
  getById: async (id: number): Promise<CorporationResponse> => {
    const response = await api.get(`/api/corporation/${id}`);
    return response.data;
  },
  create: async (data: { name: string; type?: string; focus?: CorpFocus }): Promise<CorporationResponse> => {
    const response = await api.post('/api/corporation', data);
    return response.data;
  },
  uploadLogo: async (id: number, file: File): Promise<{ logo: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post(`/api/corporation/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  update: async (id: number, data: { name?: string; type?: string; share_price?: number }): Promise<CorporationResponse> => {
    const response = await api.patch(`/api/corporation/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/corporation/${id}`);
  },
  getShareholders: async (id: number): Promise<ShareholderResponse[]> => {
    const corp = await corporationAPI.getById(id);
    return corp.shareholders || [];
  },
};

export const portfolioAPI = {
  getByUserId: async (userId: number): Promise<PortfolioResponse> => {
    const response = await api.get(`/api/portfolio/${userId}`);
    return response.data;
  },
};

export interface ShareTransactionResponse {
  success: boolean;
  shares: number;
  price_per_share: number;
  total_cost?: number;
  total_revenue?: number;
  new_share_price: number;
}

export interface IssueSharesResponse {
  success: boolean;
  shares_issued: number;
  price_per_share: number;
  total_capital_raised: number;
  new_total_shares: number;
  new_share_price: number;
}

export interface SharePriceHistoryResponse {
  id: number;
  corporation_id: number;
  share_price: number;
  capital: number;
  recorded_at: string;
}

export const sharesAPI = {
  buy: async (corporationId: number, shares: number): Promise<ShareTransactionResponse> => {
    const response = await api.post(`/api/shares/${corporationId}/buy`, { shares });
    return response.data;
  },
  sell: async (corporationId: number, shares: number): Promise<ShareTransactionResponse> => {
    const response = await api.post(`/api/shares/${corporationId}/sell`, { shares });
    return response.data;
  },
  issue: async (corporationId: number, shares: number): Promise<IssueSharesResponse> => {
    const response = await api.post(`/api/shares/${corporationId}/issue`, { shares });
    return response.data;
  },
  getPriceHistory: async (
    corporationId: number,
    hours?: number,
    limit?: number
  ): Promise<SharePriceHistoryResponse[]> => {
    const params = new URLSearchParams();
    if (hours) params.append('hours', hours.toString());
    if (limit) params.append('limit', limit.toString());
    const query = params.toString();
    const response = await api.get(
      `/api/shares/${corporationId}/history${query ? `?${query}` : ''}`
    );
    return response.data;
  },
  getValuation: async (corporationId: number): Promise<{
    corporation_id: number;
    current_price: number;
    valuation: {
      book_value: number;
      earnings_value: number;
      dividend_yield: number;
      cash_per_share: number;
      trade_weighted_price: number;
      fundamental_value: number;
      calculated_price: number;
      recent_trade_count: number;
      has_trade_history: boolean;
      annual_profit: number;
      annual_dividend_per_share: number;
    };
    balance_sheet: BalanceSheet;
  }> => {
    const response = await api.get(`/api/shares/${corporationId}/valuation`);
    return response.data;
  },
};

export interface IssueReportData {
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'ui' | 'performance' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface IssueReportResponse {
  success: boolean;
  issue_id?: number;
  github_issue_url?: string;
  message: string;
  report_id?: number;
}

export const issueAPI = {
  report: async (data: IssueReportData): Promise<IssueReportResponse> => {
    const response = await api.post('/api/issues/report', data);
    return response.data;
  },
};

export interface AdminUser {
  id: number;
  profile_id: number;
  email: string;
  username: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  is_admin?: boolean;
  profile_slug?: string;
  profile_image_url?: string | null;
  bio?: string;
  registration_ip?: string;
  last_login_ip?: string;
  last_login_at?: string;
  is_banned?: boolean;
  banned_at?: string;
  banned_reason?: string;
  banned_by?: number;
  created_at: string;
}

export interface ReportedChat {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason?: string | null;
  reviewed: boolean;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
  reporter?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  reported_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  reviewed_by_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
  } | null;
}

export interface AdminGameTimeResetResponse {
  success: boolean;
  message: string;
  game_time: { year: number; quarter: number };
  game_start_date: string;
  quarters_from_start: number;
  applied_at: string;
}

// Transaction types
export type TransactionType = 
  | 'corp_revenue'
  | 'ceo_salary'
  | 'user_transfer'
  | 'share_purchase'
  | 'share_sale'
  | 'share_issue'
  | 'market_entry'
  | 'unit_build'
  | 'corp_founding';

export interface Transaction {
  id: number;
  transaction_type: TransactionType;
  amount: number;
  from_user_id: number | null;
  to_user_id: number | null;
  corporation_id: number | null;
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  created_at: string;
  from_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  } | null;
  to_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  } | null;
  corporation?: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
}

export interface TransactionFilters {
  user_id?: number;
  corporation_id?: number;
  type?: TransactionType;
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export const adminAPI = {
  getAllUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  toggleAdminStatus: async (userId: number): Promise<AdminUser> => {
    const response = await api.patch(`/api/admin/users/${userId}/admin`);
    return response.data;
  },
  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/api/admin/users/${userId}`);
  },
  getReportedChats: async (includeReviewed?: boolean): Promise<ReportedChat[]> => {
    const params = new URLSearchParams();
    if (includeReviewed) params.append('include_reviewed', 'true');
    const query = params.toString();
    const response = await api.get(`/api/admin/reported-chats${query ? `?${query}` : ''}`);
    return response.data;
  },
  clearReportedChat: async (reportId: number): Promise<{ message: string; report: ReportedChat }> => {
    const response = await api.delete(`/api/admin/reported-chats/${reportId}`);
    return response.data;
  },
  getConversation: async (userId1: number, userId2: number, limit?: number, offset?: number): Promise<{
    messages: MessageResponse[];
    user1: {
      id: number;
      profile_id: number;
      username: string;
      player_name?: string;
      profile_image_url?: string | null;
    };
    user2: {
      id: number;
      profile_id: number;
      username: string;
      player_name?: string;
      profile_image_url?: string | null;
    };
  }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    const response = await api.get(`/api/admin/conversation/${userId1}/${userId2}${query ? `?${query}` : ''}`);
    return response.data;
  },
  runTurn: async (): Promise<{
    success: boolean;
    actions: { users_updated: number; ceo_count: number };
    market_revenue: { corporations_processed: number; total_profit: number };
    ceo_salaries: { ceos_paid: number; total_paid: number; salaries_zeroed: number };
  }> => {
    const response = await api.post('/api/admin/run-turn');
    return response.data;
  },
  recalculatePrices: async (): Promise<{
    success: boolean;
    corporations_updated: number;
    changes: Array<{ corporation_id: number; name: string; old_price: number; new_price: number }>;
  }> => {
    const response = await api.post('/api/admin/recalculate-prices');
    return response.data;
  },
  setGameTime: async (year: number, quarter: number): Promise<AdminGameTimeResetResponse> => {
    const response = await api.post('/api/admin/set-game-time', { year, quarter });
    return response.data;
  },
  getTransactions: async (filters?: TransactionFilters): Promise<TransactionsResponse> => {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.corporation_id) params.append('corporation_id', filters.corporation_id.toString());
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    const query = params.toString();
    const response = await api.get(`/api/admin/transactions${query ? `?${query}` : ''}`);
    return response.data;
  },
  forceStockSplit: async (corpId: number): Promise<{
    success: boolean;
    corporation_id: number;
    corporation_name: string;
    split_ratio: string;
    before: { total_shares: number; public_shares: number; share_price: number };
    after: { total_shares: number; public_shares: number; share_price: number };
    shareholders_updated: number;
  }> => {
    const response = await api.post(`/api/admin/force-stock-split/${corpId}`);
    return response.data;
  },
  resetBoard: async (corpId: number): Promise<ResetBoardResponse> => {
    const response = await api.post(`/api/admin/corporation/${corpId}/reset-board`);
    return response.data;
  },
  forceEndVote: async (corpId: number, proposalId: number): Promise<{
    success: boolean;
    message: string;
    proposal_id: number;
    corporation_id: number;
    corporation_name: string;
    votes: { aye: number; nay: number; total: number };
  }> => {
    const response = await api.post(`/api/admin/corporation/${corpId}/force-end-vote/${proposalId}`);
    return response.data;
  },
  searchCorporations: async (query?: string): Promise<Array<{
    id: number;
    name: string;
    sector: string;
    logo: string | null;
  }>> => {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const response = await api.get(`/api/admin/corporations/search${params}`);
    return response.data;
  },
  deleteUserShares: async (corpId: number, userId: number, amount: number): Promise<DeleteSharesResponse> => {
    const response = await api.delete(`/api/admin/corporation/${corpId}/shares/${userId}`, {
      data: { amount }
    });
    return response.data;
  },
  deletePublicShares: async (corpId: number, amount: number): Promise<DeletePublicSharesResponse> => {
    const response = await api.delete(`/api/admin/corporation/${corpId}/public-shares`, {
      data: { amount }
    });
    return response.data;
  },
  searchUsers: async (query?: string): Promise<Array<{
    id: number;
    username: string;
    player_name: string | null;
    profile_image_url: string | null;
  }>> => {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const response = await api.get(`/api/admin/users/search${params}`);
    return response.data;
  },
  addCashToAllUsers: async (amount: number): Promise<{
    success: boolean;
    users_updated: number;
    amount: number;
    message: string;
  }> => {
    const response = await api.post('/api/admin/users/add-cash-all', { amount });
    return response.data;
  },
  addCashToUser: async (userId: number, amount: number): Promise<{
    success: boolean;
    user_id: number;
    username: string;
    player_name: string | null;
    old_cash: number;
    new_cash: number;
    amount: number;
    message: string;
  }> => {
    const response = await api.post(`/api/admin/users/${userId}/add-cash`, { amount });
    return response.data;
  },
  addCapitalToAllCorporations: async (amount: number): Promise<{
    success: boolean;
    corporations_updated: number;
    amount: number;
    message: string;
  }> => {
    const response = await api.post('/api/admin/corporations/add-capital-all', { amount });
    return response.data;
  },
  addCapitalToCorporation: async (corpId: number, amount: number): Promise<{
    success: boolean;
    corporation_id: number;
    corporation_name: string;
    old_capital: number;
    new_capital: number;
    new_share_price: number;
    amount: number;
    message: string;
  }> => {
    const response = await api.post(`/api/admin/corporations/${corpId}/add-capital`, { amount });
    return response.data;
  },
  migrateManufacturingToLightIndustry: async (): Promise<{
    success: boolean;
    corporations_updated: number;
    corporations: Array<{ id: number; name: string }>;
    market_entries_updated: number;
    market_entries: Array<{ id: number; state_code: string; corporation_id: number }>;
    message: string;
  }> => {
    const response = await api.post('/api/admin/migrate-manufacturing-to-light-industry');
    return response.data;
  },
  resetUser: async (userId: number): Promise<{
    success: boolean;
    message: string;
    corporations_deleted: number;
    corporation_names: string[];
    shareholder_positions_cleared: number;
  }> => {
    const response = await api.post(`/api/admin/users/${userId}/reset`);
    return response.data;
  },

  deploy: async (): Promise<{
    success: boolean;
    message?: string;
    output?: string;
    errorOutput?: string;
    timestamp: string;
  }> => {
    const response = await api.post('/api/admin/deploy');
    return response.data;
  },

  getLastDeployment: async (): Promise<{
    success: boolean;
    lastDeployment: {
      success: boolean;
      timestamp: string | null;
      log: string;
    } | null;
  }> => {
    const response = await api.get('/api/admin/deploy/last');
    return response.data;
  },
};

export interface MessageResponse {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject?: string | null;
  body: string;
  read: boolean;
  created_at: string;
  sender?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  recipient?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
}

export interface ConversationResponse {
  other_user_id: number;
  other_user: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
    last_seen_at?: string;
    is_online?: boolean;
  };
  last_message: MessageResponse;
  unread_count: number;
}

export interface SendMessageData {
  recipient_id: number;
  subject?: string;
  body: string;
}

export interface TransferCashData {
  recipient_id: number;
  amount: number;
  note?: string;
}

export interface TransferCashResponse {
  success: boolean;
  amount: number;
  sender_id: number;
  recipient_id: number;
  sender_new_balance: number;
  recipient_new_balance: number;
  note?: string | null;
}

export const messagesAPI = {
  send: async (data: SendMessageData): Promise<MessageResponse> => {
    const response = await api.post('/api/messages', data);
    return response.data;
  },
  getAll: async (type?: 'sent' | 'conversations', limit?: number, offset?: number, includeRead?: boolean): Promise<MessageResponse[] | ConversationResponse[]> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (includeRead !== undefined) params.append('include_read', includeRead.toString());
    const query = params.toString();
    const response = await api.get(`/api/messages${query ? `?${query}` : ''}`);
    return response.data;
  },
  getById: async (id: number): Promise<MessageResponse> => {
    const response = await api.get(`/api/messages/${id}`);
    return response.data;
  },
  getConversation: async (userId: number, limit?: number, offset?: number): Promise<MessageResponse[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    const response = await api.get(`/api/messages/conversation/${userId}${query ? `?${query}` : ''}`);
    return response.data;
  },
  markAsRead: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/api/messages/${id}/read`);
    return response.data;
  },
  markConversationAsRead: async (userId: number): Promise<{ success: boolean }> => {
    const response = await api.patch(`/api/messages/conversation/${userId}/read`);
    return response.data;
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/api/messages/unread/count');
    return response.data;
  },
  delete: async (id: number): Promise<{ success: boolean }> => {
    const response = await api.delete(`/api/messages/${id}`);
    return response.data;
  },
  reportConversation: async (userId: number, reason?: string): Promise<{ success: boolean; report_id: number; message: string }> => {
    const response = await api.post(`/api/messages/conversation/${userId}/report`, { reason });
    return response.data;
  },
};

export const cashAPI = {
  transfer: async (data: TransferCashData): Promise<TransferCashResponse> => {
    const response = await api.post('/api/cash/transfer', data);
    return response.data;
  },
};

// Board types
export interface BoardMember {
  user_id: number;
  shares: number;
  username: string;
  player_name?: string;
  profile_id: number;
  profile_slug?: string;
  profile_image_url?: string | null;
  is_ceo: boolean;
  is_acting_ceo: boolean;
}

export interface BoardProposal {
  id: number;
  corporation_id: number;
  proposer_id: number;
  proposal_type: 'ceo_nomination' | 'sector_change' | 'hq_change' | 'board_size' | 'appoint_member' | 'ceo_salary_change' | 'dividend_change' | 'special_dividend' | 'stock_split' | 'focus_change';
  proposal_data: {
    nominee_id?: number;
    nominee_name?: string;
    new_sector?: string;
    new_state?: string;
    new_size?: number;
    appointee_id?: number;
    appointee_name?: string;
    new_salary?: number;
    new_percentage?: number;
    capital_percentage?: number;
    new_focus?: CorpFocus;
  };
  status: 'active' | 'passed' | 'failed';
  created_at: string;
  resolved_at: string | null;
  expires_at: string;
  proposer?: {
    id: number;
    username: string;
    player_name?: string;
    profile_id: number;
  };
  votes: {
    aye: number;
    nay: number;
    total: number;
  };
  user_vote?: 'aye' | 'nay' | null;
  voter_details?: {
    aye: BoardMember[];
    nay: BoardMember[];
    abstained: BoardMember[];
  };
}

export interface BoardResponse {
  corporation: {
    id: number;
    name: string;
    type?: string | null;
    hq_state?: string | null;
    board_size: number;
    elected_ceo_id?: number | null;
    ceo_salary: number;
    dividend_percentage?: number;
    special_dividend_last_paid_at?: string | null;
    special_dividend_last_amount?: number | null;
    focus?: CorpFocus;
  };
  board_members: BoardMember[];
  effective_ceo: { userId: number; isActing: boolean } | null;
  active_proposals: BoardProposal[];
  shareholders: {
    user_id: number;
    shares: number;
    username?: string;
    player_name?: string;
    profile_id?: number;
  }[];
  is_on_board: boolean;
  is_ceo: boolean;
  sectors: string[];
  us_states: string[];
}

export interface CreateProposalData {
  proposal_type: 'ceo_nomination' | 'sector_change' | 'hq_change' | 'board_size' | 'appoint_member' | 'ceo_salary_change' | 'dividend_change' | 'special_dividend' | 'stock_split' | 'focus_change';
  proposal_data: {
    nominee_id?: number;
    new_sector?: string;
    new_state?: string;
    new_size?: number;
    appointee_id?: number;
    new_salary?: number;
    new_percentage?: number;
    capital_percentage?: number;
    new_focus?: CorpFocus;
  };
}

export const boardAPI = {
  getBoard: async (corpId: number): Promise<BoardResponse> => {
    const response = await api.get(`/api/board/${corpId}`);
    return response.data;
  },
  getProposals: async (corpId: number): Promise<BoardProposal[]> => {
    const response = await api.get(`/api/board/${corpId}/proposals`);
    return response.data;
  },
  createProposal: async (corpId: number, data: CreateProposalData): Promise<BoardProposal> => {
    const response = await api.post(`/api/board/${corpId}/proposals`, data);
    return response.data;
  },
  castVote: async (corpId: number, proposalId: number, vote: 'aye' | 'nay'): Promise<{
    vote: { id: number; proposal_id: number; voter_id: number; vote: string };
    votes: { aye: number; nay: number; total: number };
    resolved: boolean;
  }> => {
    const response = await api.post(`/api/board/${corpId}/proposals/${proposalId}/vote`, { vote });
    return response.data;
  },
  resignCeo: async (corpId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/board/${corpId}/ceo/resign`);
    return response.data;
  },
};

// Server time types
export interface ServerTimeResponse {
  server_time: string;
  game_start_date: string;
  next_action_update: string;
  next_proposal_check: string;
  seconds_until_action_update: number;
  seconds_until_proposal_check: number;
}

export const gameAPI = {
  getTime: async (): Promise<ServerTimeResponse> => {
    const response = await api.get('/api/game/time');
    return response.data;
  },
};

// Markets/States types
export interface StateInfo {
  code: string;
  name: string;
  region: string;
  multiplier: number;
  growth_factor?: number;
  capacity?: number;
  capacity_tier?: string;
  extractable_resources?: string[];
}

export interface StatesListResponse {
  regions: string[];
  states_by_region: Record<string, StateInfo[]>;
  total_states: number;
}

export interface MarketEntryWithUnits {
  id: number;
  corporation_id: number;
  state_code: string;
  sector_type: string;
  created_at: string;
  retail_count: number;
  production_count: number;
  service_count: number;
  extraction_count: number;
  state_name?: string;
  state_region?: string;
  state_multiplier?: number;
}

export interface UnitCounts {
  retail: number;
  production: number;
  service: number;
  extraction: number;
}

export interface MarketWithDetails {
  id: number;
  corporation_id: number;
  state_code: string;
  sector_type: string;
  created_at: string;
  corporation: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
  units: UnitCounts;
}

export interface StateResourceInfo {
  resource: string;
  amount: number;
  percentage: number;
  stateShareOfUS: number;
  currentPrice: number;
  totalValue: number;
}

export interface StateResourceBreakdown {
  stateCode: string;
  stateName: string;
  resources: StateResourceInfo[];
  totalResourceValue: number;
}

export interface StateDetailResponse {
  state: StateInfo & { growth_factor?: number };
  markets: MarketWithDetails[];
  sectors: string[];
  sector_resources: Record<string, string | null>;
  resources: StateResourceBreakdown;
  user_corporation: {
    id: number;
    name: string;
    capital: number;
  } | null;
  user_market_entries: Array<{
    id: number;
    corporation_id: number;
    state_code: string;
    sector_type: string;
    created_at: string;
    units: UnitCounts;
  }>;
}

export interface CorporationFinances {
  corporation_id: number;
  hourly_revenue: number;
  hourly_costs: number;
  hourly_profit: number;
  display_revenue: number;  // 96-hour sector revenue
  display_costs: number;    // 96-hour sector costs
  display_profit: number;   // 96-hour sector profit (gross profit)
  // Full income statement (96-hour period)
  gross_profit_96h: number;      // Sector Revenue - Sector Costs (THE SOURCE OF TRUTH)
  ceo_salary_96h: number;        // CEO Salary for the period
  operating_income_96h: number;  // Gross Profit - CEO Salary
  dividend_payout_96h: number;   // Operating Income * dividend % (only if positive)
  net_income_96h: number;        // Operating Income - Dividends (retained earnings)
  // Unit counts
  total_retail_units: number;
  total_production_units: number;
  total_service_units: number;
  total_extraction_units: number;
  markets_count: number;
  // Per-share metrics
  dividend_per_share_96h?: number;
  special_dividend_last_paid_at?: string | null;
  special_dividend_last_amount?: number | null;
  special_dividend_per_share_last?: number | null;
}

export interface BalanceSheet {
  cash: number;
  businessUnitAssets: number;
  totalAssets: number;
  retailAssetValue: number;
  productionAssetValue: number;
  serviceAssetValue: number;
  extractionAssetValue: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  bookValuePerShare: number;
  totalRetailUnits: number;
  totalProductionUnits: number;
  totalServiceUnits: number;
  totalExtractionUnits: number;
  marketsCount: number;
}

export interface CorporationFinancesResponse {
  corporation_id: number;
  finances: CorporationFinances;
  balance_sheet?: BalanceSheet;
  market_entries: MarketEntryWithUnits[];
}

export interface EnterMarketResponse {
  success: boolean;
  market_entry: {
    id: number;
    corporation_id: number;
    state_code: string;
    sector_type: string;
    created_at: string;
  };
  capital_deducted: number;
  actions_deducted: number;
  new_capital: number;
}

export interface BuildUnitResponse {
  success: boolean;
  unit: {
    id: number;
    market_entry_id: number;
    unit_type: string;
    count: number;
  };
  unit_counts: UnitCounts;
  capital_deducted: number;
  actions_deducted: number;
  new_capital: number;
}

// Commodity pricing types
export interface CommodityTopProducer {
  stateCode: string;
  stateName: string;
  amount: number;
  percentage: number;
}

export interface CommodityPrice {
  resource: string;
  basePrice: number;
  currentPrice: number;
  priceChange: number;
  totalSupply: number;
  scarcityFactor: number;
  topProducers: CommodityTopProducer[];
  demandingSectors: string[];
}

// Product market types (manufactured goods)
export interface ProductMarketData {
  product: string;
  supply: number;
  demand: number;
  currentPrice: number;
  scarcityFactor: number;
  referenceValue: number;
  producingSectors: string[];
  demandingSectors: string[];
}

export interface CommoditiesResponse {
  commodities: CommodityPrice[];
  products: ProductMarketData[];
  resources: string[];
  product_types: string[];
  sector_resources: Record<string, string | null>;
  sector_products: Record<string, string | null>;
  sector_product_demands: Record<string, string[] | null>;
  commodity_supply: Record<string, number>;
  commodity_demand: Record<string, number>;
  product_supply: Record<string, number>;
  product_demand: Record<string, number>;
}

export type MarketUnitType = 'retail' | 'production' | 'service' | 'extraction';

export interface MarketUnitFlow {
  inputs: {
    resources: Record<string, number>;
    products: Record<string, number>;
  };
  outputs: {
    resources: Record<string, number>;
    products: Record<string, number>;
  };
}

export interface MarketMetadataResponse {
  sector_unit_flows: Record<string, Record<MarketUnitType, MarketUnitFlow>>;
  product_consumers: Record<string, string[]>;
  product_suppliers: Record<string, string[]>;
  resource_consumers: Record<string, string[]>;
  resource_suppliers: Record<string, string[]>;
}

// Resource detail types
export interface ResourceSupplierDemander {
  corporation_id: number;
  corporation_name: string;
  corporation_logo: string | null;
  sector_type: string;
  state_code: string;
  state_name: string;
  production_units: number;
  resource_demand?: number;
  units?: number;
  type?: 'supplier' | 'demander';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ResourceDetailResponse {
  resource: string;
  price: CommodityPrice;
  info: {
    name: string;
    totalPool: number;
    topStates: Array<{
      stateCode: string;
      stateName: string;
      amount: number;
      percentage: number;
    }>;
  };
  total_supply: number;
  total_demand: number;
  demanding_sectors: string[];
  top_producing_states: Array<{
    stateCode: string;
    stateName: string;
    extractionUnits: number;
    productionLevel: number;
    rank: number;
  }>;
  demanders: ResourceSupplierDemander[];
  producers: Array<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string | null;
    sector_type: string;
    state_code: string;
    state_name: string;
    extraction_units: number;
    production_level: number;
  }>;
  filter: 'producers' | 'demanders';
  pagination: PaginationInfo;
}

export interface ResourcePieDataEntry {
  corporation_id: number;
  corporation_name: string;
  corporation_logo: string | null;
  value: number;
}

export interface ResourcePieDataResponse {
  resource: string;
  producers: {
    data: ResourcePieDataEntry[];
    others: number;
    total: number;
  };
  demanders: {
    data: ResourcePieDataEntry[];
    others: number;
    total: number;
  };
}

export interface ProductDetailResponse {
  product: string;
  price: ProductMarketData;
  info: {
    name: string;
    referenceValue: number;
    producingSectors: string[];
    demandingSectors: string[];
    inputResource: string | null;
  };
  total_supply: number;
  total_demand: number;
  producing_sectors: string[];
  demanding_sectors: string[];
  suppliers?: ResourceSupplierDemander[];
  demanders?: ResourceSupplierDemander[];
  pagination: PaginationInfo;
}

export interface ProductPieDataResponse {
  product: string;
  suppliers: {
    data: ResourcePieDataEntry[];
    others: number;
    total: number;
  };
  demanders: {
    data: ResourcePieDataEntry[];
    others: number;
    total: number;
  };
}

export const marketsAPI = {
  getCommodities: async (): Promise<CommoditiesResponse> => {
    const response = await api.get('/api/markets/commodities');
    return response.data;
  },
  getMarketMetadata: async (): Promise<MarketMetadataResponse> => {
    const response = await api.get('/api/markets/metadata');
    return response.data;
  },
  getResourceDetail: async (resourceName: string, page: number = 1, limit: number = 10, filter: 'producers' | 'demanders' = 'demanders'): Promise<ResourceDetailResponse> => {
    const response = await api.get(`/api/markets/resource/${encodeURIComponent(resourceName)}`, {
      params: { page, limit, filter },
    });
    return response.data;
  },
  getResourcePriceHistory: async (resourceName: string, hours: number = 96, limit: number = 1000): Promise<Array<{
    id: number;
    resource_name: string;
    price: number;
    supply: number;
    demand: number;
    recorded_at: string;
  }>> => {
    const response = await api.get(`/api/markets/resource/${encodeURIComponent(resourceName)}/history`, {
      params: { hours, limit },
    });
    return response.data;
  },
  getResourcePieData: async (resourceName: string): Promise<ResourcePieDataResponse> => {
    const response = await api.get(`/api/markets/resource/${encodeURIComponent(resourceName)}/pie-data`);
    return response.data;
  },
  getProductDetail: async (productName: string, page: number = 1, limit: number = 10, tab: 'suppliers' | 'demanders' = 'suppliers'): Promise<ProductDetailResponse> => {
    const response = await api.get(`/api/markets/product/${encodeURIComponent(productName)}`, {
      params: { page, limit, tab },
    });
    return response.data;
  },
  getProductPriceHistory: async (productName: string, hours: number = 96, limit: number = 1000): Promise<Array<{
    id: number;
    product_name: string;
    price: number;
    supply: number;
    demand: number;
    recorded_at: string;
  }>> => {
    const response = await api.get(`/api/markets/product/${encodeURIComponent(productName)}/history`, {
      params: { hours, limit },
    });
    return response.data;
  },
  getProductPieData: async (productName: string): Promise<ProductPieDataResponse> => {
    const response = await api.get(`/api/markets/product/${encodeURIComponent(productName)}/pie-data`);
    return response.data;
  },
  getStates: async (): Promise<StatesListResponse> => {
    const response = await api.get('/api/markets/states');
    return response.data;
  },
  getState: async (stateCode: string): Promise<StateDetailResponse> => {
    const response = await api.get(`/api/markets/states/${stateCode}`);
    return response.data;
  },
  enterMarket: async (
    stateCode: string,
    sectorType: string,
    corporationId: number
  ): Promise<EnterMarketResponse> => {
    const response = await api.post(`/api/markets/states/${stateCode}/enter`, {
      sector_type: sectorType,
      corporation_id: corporationId,
    });
    return response.data;
  },
  buildUnit: async (
    entryId: number,
    unitType: 'retail' | 'production' | 'service' | 'extraction'
  ): Promise<BuildUnitResponse> => {
    const response = await api.post(`/api/markets/entries/${entryId}/build`, {
      unit_type: unitType,
    });
    return response.data;
  },
  getCorporationFinances: async (corpId: number): Promise<CorporationFinancesResponse> => {
    const response = await api.get(`/api/markets/corporation/${corpId}/finances`);
    return response.data;
  },
  getCorporationEntries: async (corpId: number): Promise<MarketEntryWithUnits[]> => {
    const response = await api.get(`/api/markets/corporation/${corpId}/entries`);
    return response.data;
  },
  abandonSector: async (entryId: number): Promise<{ success: boolean; message: string; units_removed: number; new_stock_price: number }> => {
    const response = await api.delete(`/api/markets/entries/${entryId}/abandon`);
    return response.data;
  },
  abandonUnit: async (entryId: number, unitType: 'retail' | 'production' | 'service' | 'extraction'): Promise<{ success: boolean; message: string; unit_type: string; units_remaining: number; new_stock_price: number }> => {
    const response = await api.delete(`/api/markets/entries/${entryId}/units/${unitType}`);
    return response.data;
  },
  getSectorRules: async (): Promise<UnifiedSectorConfig> => {
    const response = await api.get('/api/markets/config');
    return response.data;
  },
  updateSectorRules: async (rules: UnifiedSectorConfig): Promise<{ ok: boolean }> => {
    const response = await api.put('/api/markets/config', rules);
    return response.data;
  },
};

// Corporate Actions API types
export interface CorporateAction {
  id: number;
  corporation_id: number;
  action_type: 'supply_rush' | 'marketing_campaign';
  cost: number;
  started_at: string;
  expires_at: string;
  created_at: string;
}

// Corporate Actions API
export const corporateActionsAPI = {
  getAllActions: async (corporationId: number): Promise<CorporateAction[]> => {
    const response = await api.get(`/api/corporate-actions/${corporationId}`);
    return response.data;
  },
  getActiveActions: async (corporationId: number): Promise<CorporateAction[]> => {
    const response = await api.get(`/api/corporate-actions/${corporationId}/active`);
    return response.data;
  },
  activateSupplyRush: async (corporationId: number): Promise<CorporateAction> => {
    const response = await api.post(`/api/corporate-actions/${corporationId}/supply-rush`);
    return response.data;
  },
  activateMarketingCampaign: async (corporationId: number): Promise<CorporateAction> => {
    const response = await api.post(`/api/corporate-actions/${corporationId}/marketing-campaign`);
    return response.data;
  },
};

/**
 * Normalizes image URLs to ensure they work correctly.
 * - If the URL is already absolute (starts with http:// or https://), returns it as-is
 * - If the URL is relative (starts with /), returns it as-is (will resolve relative to current origin)
 * - If the URL is empty or null, returns the default image path
 * - Strips any backend hostname from relative paths that might have been incorrectly stored
 */
export const normalizeImageUrl = (url: string | null | undefined, defaultPath: string = '/defaultpfp.jpg'): string => {
  if (!url || url.trim() === '') {
    return defaultPath;
  }

  const trimmed = url.trim();

  // If it's already an absolute URL (http:// or https://), return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If it's a relative path starting with /, return as-is
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If it doesn't start with /, assume it's a relative path and prepend /
  return '/' + trimmed;
};

// Admin API types
export interface ResetBoardResponse {
  success: boolean;
  message: string;
  board_members: BoardMember[];
  removed_count: number;
}

export interface DeleteSharesResponse {
  success: boolean;
  message: string;
  user_id: number;
  previous_shares: number;
  new_shares: number;
  deleted_shares: number;
}

export interface DeletePublicSharesResponse {
  success: boolean;
  message: string;
  previous_public_shares: number;
  new_public_shares: number;
  previous_total_shares: number;
  new_total_shares: number;
  deleted_shares: number;
}

// ============================================================================
// SECTOR CONFIG API TYPES
// FID-20251228-001: Unified Sector Configuration System
// ============================================================================

export type UnitType = 'production' | 'retail' | 'service' | 'extraction';

export interface SectorConfig {
  id: number;
  sector_name: string;
  display_order: number;
  is_production_only: boolean;
  can_extract: boolean;
  produced_product: string | null;
  primary_resource: string | null;
}

export interface SectorUnitConfig {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  is_enabled: boolean;
  base_revenue: number;
  base_cost: number;
  labor_cost: number;
  output_rate: number | null;
}

export interface SectorUnitInput {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  input_type: 'resource' | 'product';
  input_name: string;
  consumption_rate: number;
}

export interface SectorUnitOutput {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  output_type: 'resource' | 'product';
  output_name: string;
  output_rate: number;
}

export interface ProductConfig {
  id: number;
  product_name: string;
  reference_value: number;
  min_price: number;
  display_order: number;
}

export interface ResourceConfig {
  id: number;
  resource_name: string;
  base_price: number;
  display_order: number;
}

export interface UnifiedSectorConfig {
  version: string;
  sectors: Record<string, {
    displayOrder: number;
    isProductionOnly: boolean;
    canExtract: boolean;
    producedProduct: string | null;
    primaryResource: string | null;
    units: Record<UnitType, {
      isEnabled: boolean;
      baseRevenue: number;
      baseCost: number;
      laborCost: number;
      outputRate: number | null;
      inputs: Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
      outputs: Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
    }>;
  }>;
  products: Record<string, {
    referenceValue: number;
    minPrice: number;
    displayOrder: number;
  }>;
  resources: Record<string, {
    basePrice: number;
    displayOrder: number;
  }>;
}

export interface AdminSectorConfigData {
  sectors: SectorConfig[];
  unitConfigs: SectorUnitConfig[];
  inputs: SectorUnitInput[];
  outputs: SectorUnitOutput[];
  products: ProductConfig[];
  resources: ResourceConfig[];
}

// Sector Config API
export const sectorConfigAPI = {
  // Public endpoints
  getConfig: async (): Promise<UnifiedSectorConfig> => {
    const response = await api.get('/api/sector-config');
    return response.data;
  },
  getVersion: async (): Promise<{ version: string }> => {
    const response = await api.get('/api/sector-config/version');
    return response.data;
  },
  // Admin endpoints
  getAdminConfig: async (): Promise<AdminSectorConfigData> => {
    const response = await api.get('/api/sector-config/admin');
    return response.data;
  },
  updateUnitConfig: async (
    sector: string,
    unitType: UnitType,
    data: Partial<Pick<SectorUnitConfig, 'is_enabled' | 'base_revenue' | 'base_cost' | 'labor_cost' | 'output_rate'>>
  ): Promise<SectorUnitConfig> => {
    const response = await api.put(`/api/sector-config/admin/unit/${encodeURIComponent(sector)}/${unitType}`, data);
    return response.data;
  },
  updateInput: async (id: number, consumption_rate: number): Promise<SectorUnitInput> => {
    const response = await api.put(`/api/sector-config/admin/input/${id}`, { consumption_rate });
    return response.data;
  },
  updateOutput: async (id: number, output_rate: number): Promise<SectorUnitOutput> => {
    const response = await api.put(`/api/sector-config/admin/output/${id}`, { output_rate });
    return response.data;
  },
  updateProduct: async (name: string, data: Partial<Pick<ProductConfig, 'reference_value' | 'min_price'>>): Promise<ProductConfig> => {
    const response = await api.put(`/api/sector-config/admin/products/${encodeURIComponent(name)}`, data);
    return response.data;
  },
  updateResource: async (name: string, data: { base_price: number }): Promise<ResourceConfig> => {
    const response = await api.put(`/api/sector-config/admin/resources/${encodeURIComponent(name)}`, data);
    return response.data;
  },

  // FID-20251228-003: CRUD operations for inputs/outputs
  createInput: async (params: {
    sectorName: string;
    unitType: UnitType;
    inputName: string;
    inputType: 'resource' | 'product';
    consumptionRate: number;
  }): Promise<{ id: number; message: string; input: SectorUnitInput }> => {
    const response = await api.post('/api/sector-config/admin/input', params);
    return response.data;
  },

  deleteInput: async (inputId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/sector-config/admin/input/${inputId}`);
    return response.data;
  },

  createOutput: async (params: {
    sectorName: string;
    unitType: UnitType;
    outputName: string;
    outputType: 'resource' | 'product';
    outputRate: number;
  }): Promise<{ id: number; message: string; output: SectorUnitOutput }> => {
    const response = await api.post('/api/sector-config/admin/output', params);
    return response.data;
  },

  deleteOutput: async (outputId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/sector-config/admin/output/${outputId}`);
    return response.data;
  },

  updateProducedProduct: async (sectorName: string, producedProduct: string): Promise<{ message: string }> => {
    const response = await api.put(
      `/api/sector-config/admin/sectors/${encodeURIComponent(sectorName)}/product`,
      { producedProduct }
    );
    return response.data;
  },
};

export default api;
