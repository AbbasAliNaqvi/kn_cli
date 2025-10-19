import AsyncStorage from '@react-native-async-storage/async-storage';
import AppwriteService from '../appwrite/service';
import { API_CONFIG } from './config';
import { store } from '../core/redux/store';
import { apiSlice } from './apiSlice';

// Keep all your existing interfaces - they're perfect
interface AppwriteUser {
  $id: string;
  email: string;
  name: string;
  emailVerification?: boolean;
}

interface AppwriteLoginResponse {
  success: boolean;
  user?: AppwriteUser;
  jwt?: string;
  session?: any;
  error?: string;
}

interface LoginResponse {
  success: boolean;
  appwrite_jwt?: string;
  session?: {
    session_id: string;
    expires: string;
  };
  user_info?: {
    user_id: string;
    account_type: 'user' | 'ngo';
    entity_id?: string;
    name: string;
    email: string;
    verified: boolean;
  };
  appwrite_user?: AppwriteUser;
  error?: string;
}

interface RegisterResponse {
  success: boolean;
  appwrite_jwt?: string;
  user_info?: {
    user_id: string;
    account_type: 'user' | 'ngo';
    entity_id?: string;
    name: string;
    email: string;
    verified: boolean;
  };
  appwrite_user?: AppwriteUser;
  error?: string;
}

interface AccountTypeResponse {
  success: boolean;
  account_type: 'user' | 'ngo';
  entity_id?: string;
  name?: string;
  entity_data?: any;
  error?: string;
}

function decodeJWT(token: string): { exp?: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    return JSON.parse(atob(parts[1]));
  } catch {
    return {};
  }
}

function msUntilExpiry(token: string): number | null {
  const { exp } = decodeJWT(token);
  if (!exp) return null;
  return exp * 1000 - Date.now();
}

class AuthServiceClass {
  private jwt: string | null = null;
  private accountType: string | null = null;
  private userInfo: any = null;
  private refreshPromise: Promise<string | null> | null = null;
  private proactiveTimer: any = null;

  constructor() {
    this.restoreAuth();
  }

  private scheduleProactiveRefresh(jwt: string) {
    try {
      if (this.proactiveTimer) {
        clearTimeout(this.proactiveTimer);
        this.proactiveTimer = null;
      }
      const remaining = msUntilExpiry(jwt);
      if (remaining == null) return;
      const refreshDelay = Math.max(30_000, remaining - 120_000);
      if (!isFinite(refreshDelay) || refreshDelay <= 0) {
        setTimeout(() => this.refreshToken().catch(() => {}), 5_000);
        return;
      }
      this.proactiveTimer = setTimeout(
        () => this.refreshToken().catch(() => {}),
        refreshDelay
      );
    } catch (e) {
      console.warn('Failed to schedule proactive refresh:', e);
    }
  }

  private async restoreAuth() {
    try {
      const [jwt, accountType, userInfo] = await Promise.all([
        AsyncStorage.getItem('appwrite_jwt'),
        AsyncStorage.getItem('account_type'),
        AsyncStorage.getItem('user_info'),
      ]);

      if (jwt) {
        this.jwt = jwt;
        this.scheduleProactiveRefresh(jwt);
      }
      if (accountType) this.accountType = accountType;
      if (userInfo) this.userInfo = JSON.parse(userInfo);

      // Check if we should use mock data
      if (API_CONFIG.USE_MOCK_DATA && jwt === 'mock_jwt_token') {
        console.log('Using mock data for getCurrentUser');
        return;
      }

      const currentUser = await AppwriteService.getCurrentUser();
      if (!currentUser) {
        await this.clearAuth();
        return;
      }

      if (this.jwt) {
        const remaining = msUntilExpiry(this.jwt);
        if (remaining == null || remaining < 2 * 60_000) {
          await this.refreshToken();
        }
      }
    } catch (err) {
      console.error('Failed to restore auth:', err);
      await this.clearAuth();
    }
  }

  private async saveAuth(jwt: string, accountType: string, userInfo: any) {
    this.jwt = jwt;
    this.accountType = accountType;
    this.userInfo = userInfo;
    await Promise.all([
      AsyncStorage.setItem('appwrite_jwt', jwt),
      AsyncStorage.setItem('account_type', accountType),
      AsyncStorage.setItem('user_info', JSON.stringify(userInfo)),
    ]);
    this.scheduleProactiveRefresh(jwt);
  }

  private async clearAuth() {
    this.jwt = null;
    this.accountType = null;
    this.userInfo = null;
    await Promise.all([
      AsyncStorage.removeItem('appwrite_jwt'),
      AsyncStorage.removeItem('account_type'),
      AsyncStorage.removeItem('user_info'),
    ]);
    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Starting login process for:', email);

      // Check if we should use mock data
      if (API_CONFIG.USE_MOCK_DATA) {
        console.log('Using mock data for login');
        const mockUserData = {
          $id: 'mock_user_123',
          email: email,
          name: 'Mock User',
          emailVerification: true,
        };

        const mockResponse: LoginResponse = {
          success: true,
          appwrite_jwt: 'mock_jwt_token',
          session: {
            session_id: 'mock_session_123',
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          user_info: {
            user_id: 'mock_user_123',
            account_type: 'user',
            name: 'Mock User',
            email: email,
            verified: true,
          },
          appwrite_user: mockUserData,
        };

        await AsyncStorage.setItem('appwrite_session_id', 'mock_session_123');
        await AsyncStorage.setItem('appwrite_jwt', 'mock_jwt_token');
        return mockResponse;
      }

      const loginResponse = await AppwriteService.login({ email, password });
      if (!loginResponse.success || !loginResponse.user) {
        throw new Error('Login failed');
      }
      const userData = loginResponse.user;
      console.log('Appwrite login successful:', userData);

      let jwtToken: string | null = loginResponse.jwt || null;
      if (!jwtToken) {
        let lastError: any = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            jwtToken = await AppwriteService.getValidJWT();
            if (jwtToken) break;
          } catch (err) {
            lastError = err;
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      }
      if (!jwtToken) {
        throw new Error('Failed to get authentication token');
      }

      try {
        const getUserType = store.dispatch(
          apiSlice.endpoints.getUserType.initiate({ appwrite_user_id: userData.$id })
        );
        const accountData = await getUserType.unwrap();
        console.log('Django account type response:', accountData);

        if (!accountData.account_type) {
          throw new Error('Account type is missing in response');
        }

        const userInfo = {
          user_id: userData.$id,
          account_type: accountData.account_type,
          entity_id: accountData.entity_id,
          name: userData.name || accountData.name,
          email: userData.email,
          verified: userData.emailVerification || false,
          ...accountData.entity_data,
        };

        await this.saveAuth(jwtToken, userInfo.account_type, userInfo);

        return {
          success: true,
          appwrite_jwt: jwtToken,
          session: {
            session_id: 'current',
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          user_info: userInfo,
          appwrite_user: userData,
        };
      } catch (rtkError: any) {
        console.error('RTK Query getUserType failed:', rtkError);
        throw new Error(rtkError.data?.error || 'Failed to determine account type');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  async register(
    email: string,
    password: string,
    name: string,
    accountType: 'user' | 'ngo'
  ): Promise<RegisterResponse> {
    try {
      console.log('Starting registration process for:', email, accountType);

      const userResponse = await AppwriteService.createAccount(email, password, name);
      if (!userResponse.success || !userResponse.user) {
        throw new Error('Failed to create account');
      }
      const user = userResponse.user;
      console.log('Appwrite account created:', user);

      const loginResponse = await AppwriteService.login({ email, password });
      if (!loginResponse.success || !loginResponse.user) {
        throw new Error('Failed to login after account creation');
      }
      const userData = loginResponse.user;
      console.log('Session created for new user');

      const jwtToken = loginResponse.jwt || await AppwriteService.getValidJWT();
      if (!jwtToken) throw new Error('Failed to get authentication token');

      try {
        const registerUser = store.dispatch(
          apiSlice.endpoints.registerUserType.initiate({
            appwrite_user_id: userData.$id,
            email: userData.email,
            name: userData.name,
            account_type: accountType,
          })
        );
        const registrationData = await registerUser.unwrap();

        const userInfo = {
          user_id: userData.$id,
          account_type: accountType,
          entity_id: registrationData.entity_id,
          name: userData.name,
          email: userData.email,
          verified: false,
        };

        await this.saveAuth(jwtToken, accountType, userInfo);

        return {
          success: true,
          appwrite_jwt: jwtToken,
          user_info: userInfo,
          appwrite_user: userData,
        };
      } catch (rtkError: any) {
        console.error('RTK Query registerUserType failed:', rtkError);
        try {
          await AppwriteService.logout();
        } catch {}
        throw new Error(rtkError.data?.error || 'Profile creation failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await AppwriteService.logout();
    } catch (error) {
      console.warn('Appwrite logout failed:', error);
    } finally {
      await this.clearAuth();
    }
  }

  async checkAuthStatus(): Promise<any> {
    try {
      if (!this.jwt || !this.userInfo) {
        return { isLoggedIn: false };
      }

      const currentUser = await AppwriteService.getCurrentUser();
      if (!currentUser) {
        await this.clearAuth();
        return { isLoggedIn: false };
      }

      await this.ensureFreshToken(2 * 60 * 1000).catch(() => null);

      return {
        isLoggedIn: true,
        userInfo: this.userInfo,
        accountType: this.accountType,
      };
    } catch {
      await this.clearAuth();
      return { isLoggedIn: false };
    }
  }

  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        console.log('Attempting to refresh JWT token');
        const currentUser = await AppwriteService.getCurrentUser();
        if (!currentUser) {
          await this.logout();
          return null;
        }

        const newJwt = await AppwriteService.getValidJWT();
        if (newJwt) {
          this.jwt = newJwt;
          await AsyncStorage.setItem('appwrite_jwt', newJwt);
          this.scheduleProactiveRefresh(newJwt);
          console.log('JWT token successfully refreshed');
          return newJwt;
        } else {
          console.error('Failed to refresh JWT token');
          return null;
        }
      } catch (error) {
        console.error('Error during token refresh:', error);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async ensureFreshToken(minValidityMs = 60_000): Promise<string | null> {
    const token = this.jwt;
    if (!token) return null;
    const remaining = msUntilExpiry(token);
    if (remaining == null || remaining < minValidityMs) {
      return this.refreshToken();
    }
    return token;
  }

  get token(): string | null {
    return this.jwt;
  }
}

const AuthService = new AuthServiceClass();
export default AuthService;

export async function apiFetch(
  input: RequestInfo,
  init: any = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = await AuthService.ensureFreshToken().catch(() => null);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const doFetch = () => fetch(input, { ...init, headers });
  let res = await doFetch();

  if ((res.status === 401 || res.status === 403) && !init.skipAuthRetry) {
    const refreshed = await AuthService.refreshToken();
    if (refreshed) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshed}`);
      if (
        !retryHeaders.has('Content-Type') &&
        init.body &&
        !(init.body instanceof FormData)
      ) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      res = await fetch(input, {
        ...init,
        headers: retryHeaders,
        skipAuthRetry: true,
      });
    } else {
      await AuthService.logout();
    }
  }

  if (res.status === 401 || res.status === 403) {
    const err: any = new Error('Unauthorized');
    err.status = res.status;
    throw err;
  }

  return res;
}
