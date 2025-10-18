import AsyncStorage from '@react-native-async-storage/async-storage';
import { appwriteConfig } from './env';

export interface CreateUserAccount {
  email: string;
  password: string;
  name: string;
}

export interface LoginUserAccount {
  email: string;
  password: string;
}

function decodeJWT(token: string): { exp?: number } {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return {};
  }
}

class AppwriteService {
  private endpoint: string;
  private projectId: string;
  private jwt: string | null = null;
  private sessionId: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.endpoint = appwriteConfig.endpoint;
    this.projectId = appwriteConfig.projectId;
    console.log('🔧 AppwriteService initialized:', {
      endpoint: this.endpoint,
      projectId: this.projectId,
      hasValidConfig: !!(this.endpoint && this.projectId)
    });
    this.restoreSession();
  }

  // Improved diagnostics with better error handling
  private async diagnosePreliminaryIssues(): Promise<void> {
    console.log('🔍 APPWRITE DIAGNOSTICS START');
    
    // Check 1: Configuration
    if (!this.endpoint || !this.projectId) {
      console.error('❌ Missing Appwrite configuration:', {
        endpoint: this.endpoint,
        projectId: this.projectId
      });
      throw new Error('Appwrite configuration is incomplete');
    }

    console.log('✅ Configuration check passed');

    // Simple connectivity test to Appwrite endpoint (not the problematic httpbin.org)
    try {
      const testResponse = await Promise.race([
        fetch(`${this.endpoint}/health`, { 
          method: 'GET',
          headers: {
            'X-Appwrite-Project': this.projectId,
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]) as Response;
      
      console.log('✅ Appwrite endpoint connectivity check passed');
    } catch (error) {
      console.warn('⚠️ Appwrite health check failed, but continuing:', error);
      // Don't throw here, as the endpoint might still work for actual requests
    }

    console.log('✅ All preliminary checks passed');
  }

  private async request(path: string, method = 'GET', body?: object, retryCount = 0): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': this.projectId,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    };

    if (this.sessionId) {
      headers['X-Appwrite-Session'] = this.sessionId;
    } else if (this.jwt) {
      headers['X-Appwrite-JWT'] = this.jwt;
    }

    const requestUrl = `${this.endpoint}${path}`;
    console.log(`AppwriteService :: request (${method} ${path}) :: URL: "${requestUrl}"`);
    console.log(`AppwriteService :: request :: Headers:`, { 
      ...headers, 
      'X-Appwrite-JWT': this.jwt ? '[REDACTED]' : undefined 
    });

    try {
      const requestOptions: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      };

      console.log(`AppwriteService :: Making request with options:`, {
        ...requestOptions,
        body: body ? '[REQUEST_BODY]' : undefined
      });

      // Enhanced timeout and retry logic
      const timeoutDuration = retryCount > 0 ? 30000 : 20000; // Longer timeout on retries
      const response = await Promise.race([
        fetch(requestUrl, requestOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutDuration/1000} seconds`)), timeoutDuration)
        )
      ]) as Response;

      console.log(`AppwriteService :: request (${method} ${path}) :: Response status: ${response.status}`);
      console.log(`AppwriteService :: request :: Response headers:`, Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        console.log(`AppwriteService :: request :: Raw response:`, text);
        data = text ? JSON.parse(text) : {};
      } else {
        const text = await response.text();
        console.log(`AppwriteService :: request :: Non-JSON response:`, text);
        data = { message: text || 'Non-JSON response' };
      }

      if (!response.ok) {
        console.error(`AppwriteService :: request :: Error response:`, {
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        // Handle specific error cases
        if (response.status === 401 && data.type === 'general_unauthorized_scope') {
          await this.clearSession();
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 429) {
          // Rate limited - wait and retry
          if (retryCount < 2) {
            console.log(`⏳ Rate limited, retrying in ${(retryCount + 1) * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
            return this.request(path, method, body, retryCount + 1);
          }
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          // Server error - retry once
          if (retryCount < 1) {
            console.log('🔄 Server error, retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.request(path, method, body, retryCount + 1);
          }
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
      
    } catch (error: any) {
      console.error(`AppwriteService :: request (${method} ${path}) ::`, error);
      
      // Enhanced error handling with specific messages
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        if (retryCount < 1) {
          console.log('🔄 Network failed, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.request(path, method, body, retryCount + 1);
        }
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
      
      if (error.message?.includes('timeout')) {
        if (retryCount < 1) {
          console.log('🔄 Request timed out, retrying...');
          return this.request(path, method, body, retryCount + 1);
        }
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      if (error.message?.includes('401') || error.message?.includes('missing scope')) {
        await this.clearSession();
      }
      
      throw error;
    }
  }

  private async saveSession(jwt?: string, sessionId?: string) {
    try {
      if (jwt) {
        this.jwt = jwt;
        await AsyncStorage.setItem('appwrite_jwt', jwt);
        console.log('✅ JWT token saved to storage');
      }
      if (sessionId) {
        this.sessionId = sessionId;
        await AsyncStorage.setItem('appwrite_session_id', sessionId);
        console.log('✅ Session ID saved to storage');
      }
    } catch (e) {
      console.warn('Could not save session to AsyncStorage:', e);
    }
  }

  private async restoreSession() {
    try {
      const [savedJwt, savedSessionId] = await Promise.all([
        AsyncStorage.getItem('appwrite_jwt'),
        AsyncStorage.getItem('appwrite_session_id')
      ]);
      if (savedJwt) {
        this.jwt = savedJwt;
        console.log('✅ JWT restored from storage');
      }
      if (savedSessionId) {
        this.sessionId = savedSessionId;
        console.log('✅ Session ID restored from storage');
      }
    } catch (e) {
      console.warn('Could not restore session from AsyncStorage:', e);
    }
  }

  private async clearSession() {
    this.jwt = null;
    this.sessionId = null;
    this.refreshPromise = null;
    try {
      await Promise.all([
        AsyncStorage.removeItem('appwrite_jwt'),
        AsyncStorage.removeItem('appwrite_session_id')
      ]);
      console.log('✅ Session cleared from storage');
    } catch (e) {
      console.warn('Could not clear session from AsyncStorage:', e);
    }
  }

  async createAccount(email: string, password: string, name: string) {
    try {
      console.log('🔐 Starting Appwrite account creation...');
      
      // Run diagnostics
      await this.diagnosePreliminaryIssues();
      
      const account = await this.request('/account', 'POST', {
        userId: 'unique()',
        email,
        password,
        name,
      });
      
      console.log('✅ Appwrite account created successfully');
      return { success: true, user: account };
      
    } catch (error) {
      console.error('AppwriteService :: createAccount ::', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Account creation failed' 
      };
    }
  }

  async loginWithEmail(email: string, password: string) {
    try {
      console.log('🔐 Starting Appwrite login...');

      // Check if already logged in with same email
      try {
        const currentUser = await this.getCurrentUser();
        if (currentUser && currentUser.email === email) {
          console.log('User already logged in with same email');
          return {
            success: true,
            user: currentUser,
            jwt: this.jwt,
            session: this.sessionId ? { $id: this.sessionId } : null
          };
        } else if (currentUser) {
          await this.logout();
        }
      } catch (e) {
        await this.clearSession();
      }

      // Create session
      console.log('🔐 Creating session...');
      const session = await this.request('/account/sessions/email', 'POST', {
        email,
        password,
      });

      console.log('✅ Session created:', session);
      await this.saveSession(undefined, session.$id);

      // Small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get JWT token with retry logic
      console.log('🔐 Getting JWT token...');
      let jwtToken = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const jwtResponse = await this.request('/account/jwt', 'POST');
          if (jwtResponse && jwtResponse.jwt) {
            jwtToken = jwtResponse.jwt;
            await this.saveSession(jwtResponse.jwt);
            console.log('✅ JWT token obtained');
            break;
          }
        } catch (jwtError) {
          console.warn(`JWT attempt ${attempt} failed:`, jwtError);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      const user = await this.getCurrentUser();
      console.log('✅ Login successful');
      
      return {
        success: true,
        user: user,
        jwt: jwtToken,
        session: session
      };
      
    } catch (error) {
      console.error('AppwriteService :: loginWithEmail ::', error);
      await this.clearSession();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  async login({ email, password }: LoginUserAccount) {
    return this.loginWithEmail(email, password);
  }

  async getCurrentUser() {
    try {
      return await this.request('/account', 'GET');
    } catch (error) {
      console.error('AppwriteService :: getCurrentUser ::', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.sessionId) {
        await this.request('/account/sessions/current', 'DELETE');
      }
    } catch (error: any) {
      console.warn('AppwriteService :: logout API call failed:', error);
    } finally {
      await this.clearSession();
    }
  }

  async forceLogout() {
    await this.clearSession();
  }

  async validateSession(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      await this.clearSession();
      return false;
    }
  }

  private isJWTExpired(): boolean {
    if (!this.jwt) return true;
    const { exp } = decodeJWT(this.jwt);
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  }

  async getValidJWT(): Promise<string | null> {
    if (this.jwt && !this.isJWTExpired()) {
      return this.jwt;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    try {
      if (!this.sessionId) {
        await this.restoreSession();
        if (!this.sessionId) {
          return null;
        }
      }

      this.refreshPromise = new Promise(async (resolve) => {
        try {
          const jwtResponse = await this.request('/account/jwt', 'POST');
          if (jwtResponse && jwtResponse.jwt) {
            await this.saveSession(jwtResponse.jwt);
            resolve(jwtResponse.jwt);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Failed to get JWT token:', e);
          resolve(null);
        } finally {
          this.refreshPromise = null;
        }
      });

      return this.refreshPromise;
    } catch (e) {
      console.error('Unexpected error during JWT refresh setup:', e);
      this.refreshPromise = null;
      return null;
    }
  }

  async refreshSession() {
    try {
      const jwt = await this.getValidJWT();
      const user = await this.getCurrentUser();
      return {
        success: true,
        user: user,
        jwt: jwt,
        session: this.sessionId ? { $id: this.sessionId } : null
      };
    } catch (error) {
      console.error('AppwriteService :: refreshSession ::', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Session refresh failed' 
      };
    }
  }

  get hasJWT() {
    return !!this.jwt;
  }

  get jwtToken() {
    return this.jwt;
  }

  get hasSession() {
    return !!this.jwt || !!this.sessionId;
  }

  // Password Recovery Methods
  async createRecovery(email: string, url: string) {
    try {
      console.log('🔐 Starting password recovery for:', email);
      
      const recovery = await this.request('/account/recovery', 'POST', {
        email,
        url,
      });
      
      console.log('✅ Password recovery email sent successfully');
      return { success: true, recovery };
      
    } catch (error) {
      console.error('AppwriteService :: createRecovery ::', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send recovery email' 
      };
    }
  }

  async updateRecovery(userId: string, secret: string, password: string, passwordAgain: string) {
    try {
      console.log('🔐 Completing password recovery...');
      
      const result = await this.request('/account/recovery', 'PUT', {
        userId,
        secret,
        password,
        passwordAgain,
      });
      
      console.log('✅ Password reset successfully');
      return { success: true, result };
      
    } catch (error) {
      console.error('AppwriteService :: updateRecovery ::', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset password' 
      };
    }
  }
}

export default new AppwriteService();

function atob(arg0: string): string {
  throw new Error('Function not implemented.');
}
