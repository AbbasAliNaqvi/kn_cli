import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AuthService from '../../../api/authService';

interface User {
  $id: string;
  id?: string;
  name: string;
  email: string;
  account_type?: string;
  verified?: boolean;
}

interface AuthState {
  // Core auth state
  user: User | null;
  token: string | null;
  accountType: string | null;
  isNewUser: boolean;
  
  // Appwrite specific
  appwriteUserId: string | null;
  appwriteJWT: string | null;
  
  // UI state
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  accountType: null,
  isNewUser: false,
  appwriteUserId: null,
  appwriteJWT: null,
  initialized: false,
  loading: false,
  error: null,
};

// ===== APPWRITE LOGIN THUNK =====
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, thunkAPI) => {
    try {
      console.log('🔐 Starting Appwrite authentication...');
      
      const result = await AuthService.login(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Appwrite login failed');
      }

      console.log('✅ Appwrite authentication successful');
      
      return {
        appwriteUserId: result.appwrite_user.$id,
        appwriteJWT: result.appwrite_jwt,
        appwriteUser: result.appwrite_user,
        userInfo: result.user_info,
        accountType: result.user_info?.account_type || 'user',
      };
    } catch (err: any) {
      console.error('❌ Appwrite login error:', err);
      throw err.message || 'Login failed';
    }
  }
);

// ===== REGISTRATION THUNK =====
export const createUserAccount = createAsyncThunk(
  'auth/createAccount',
  async ({ 
    email, 
    password, 
    name, 
    accountType 
  }: { 
    email: string; 
    password: string; 
    name: string; 
    accountType: 'user' | 'ngo' 
  }, thunkAPI) => {
    try {
      console.log('🔐 Starting Appwrite registration...');
      
      const result = await AuthService.register(email, password, name, accountType);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      console.log('✅ Appwrite registration successful');
      
      return {
        appwriteUserId: result.appwrite_user.$id,
        appwriteJWT: result.appwrite_jwt,
        appwriteUser: result.appwrite_user,
        userInfo: result.user_info,
        accountType: result.user_info?.account_type || accountType,
        isNewUser: true, // ✅ FIXED: Always true for new registrations
      };
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      throw err.message || 'Registration failed';
    }
  }
);

// ===== LOGOUT THUNK =====
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      await AuthService.logout();
      console.log('✅ Appwrite logout successful');
    } catch (err: any) {
      console.warn('⚠️ Appwrite logout failed, but clearing local state:', err);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        accountType: string;
        isNewUser?: boolean;
      }>
    ) => {
      const { user, token, accountType, isNewUser } = action.payload;
      state.user = user;
      state.token = token;
      state.accountType = accountType;
      
      // ✅ FIXED: Only set isNewUser if explicitly provided, otherwise keep current value
      if (isNewUser !== undefined) {
        state.isNewUser = isNewUser;
      }
      
      state.initialized = true;
      state.error = null;
      
      console.log('✅ Credentials set in Redux store', {
        isNewUser: state.isNewUser,
        accountType: state.accountType,
      });
    },

    setAppwriteCredentials: (
      state,
      action: PayloadAction<{
        appwriteUserId: string;
        appwriteJWT: string;
        appwriteUser: any;
        userInfo?: any;
        accountType: string;
        isNewUser?: boolean;
      }>
    ) => {
      const { appwriteUserId, appwriteJWT, appwriteUser, userInfo, accountType, isNewUser = false } = action.payload;
      state.appwriteUserId = appwriteUserId;
      state.appwriteJWT = appwriteJWT;
      state.accountType = accountType;
      state.isNewUser = isNewUser;
      
      if (appwriteUser) {
        state.user = {
          $id: appwriteUser.$id,
          id: appwriteUser.$id,
          name: appwriteUser.name,
          email: appwriteUser.email,
          account_type: accountType,
        };
      }
      
      console.log('✅ Appwrite credentials set in Redux store');
    },

    logOut: (state) => {
      Object.assign(state, initialState, { initialized: true });
      console.log('✅ User logged out - state cleared');
    },

    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },

    setNewUserFlag: (state, action: PayloadAction<boolean>) => {
      state.isNewUser = action.payload;
      console.log('✅ isNewUser flag set to:', action.payload);
    },

    resetNewUserFlag: (state) => {
      state.isNewUser = false;
      console.log('✅ isNewUser flag reset to false');
    },

    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN USER
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        state.appwriteUserId = action.payload.appwriteUserId;
        state.appwriteJWT = action.payload.appwriteJWT;
        state.accountType = action.payload.accountType;
        
        if (action.payload.appwriteUser) {
          state.user = {
            $id: action.payload.appwriteUser.$id,
            id: action.payload.appwriteUser.$id,
            name: action.payload.appwriteUser.name,
            email: action.payload.appwriteUser.email,
            account_type: action.payload.accountType,
          };
        }
        
        // ✅ FIXED: Don't set isNewUser here - let getUserType mutation handle it
        state.initialized = true;
        console.log('✅ Login thunk completed successfully');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
        state.user = null;
        state.appwriteUserId = null;
        state.appwriteJWT = null;
        state.accountType = null;
        console.error('❌ Login thunk failed:', action.error.message);
      })
      
      // CREATE ACCOUNT
      .addCase(createUserAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUserAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        state.appwriteUserId = action.payload.appwriteUserId;
        state.appwriteJWT = action.payload.appwriteJWT;
        state.accountType = action.payload.accountType;
        state.isNewUser = action.payload.isNewUser; // ✅ Set from payload
        
        if (action.payload.appwriteUser) {
          state.user = {
            $id: action.payload.appwriteUser.$id,
            id: action.payload.appwriteUser.$id,
            name: action.payload.appwriteUser.name,
            email: action.payload.appwriteUser.email,
            account_type: action.payload.accountType,
          };
        }
        
        state.initialized = true;
        console.log('✅ Registration thunk completed successfully - isNewUser:', state.isNewUser);
      })
      .addCase(createUserAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
        state.isNewUser = false;
        console.error('❌ Registration thunk failed:', action.error.message);
      })
      
      // LOGOUT USER
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState, { initialized: true });
        console.log('✅ Logout thunk completed');
      })
      .addCase(logoutUser.rejected, (state) => {
        Object.assign(state, initialState, { initialized: true });
        console.log('✅ Logout thunk completed (with errors)');
      });
  },
});

export const {
  setCredentials,
  setAppwriteCredentials,
  logOut,
  setInitialized,
  setNewUserFlag,
  resetNewUserFlag,
  resetError,
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: any) => state.persisted?.auth?.user;
export const selectCurrentToken = (state: any) => state.persisted?.auth?.token;
export const selectAppwriteUserId = (state: any) => state.persisted?.auth?.appwriteUserId;
export const selectAppwriteJWT = (state: any) => state.persisted?.auth?.appwriteJWT;
export const selectIsAuthenticated = (state: any) => 
  !!state.persisted?.auth?.appwriteUserId && !!state.persisted?.auth?.appwriteJWT;
export const selectAccountType = (state: any) => state.persisted?.auth?.accountType;
export const selectIsNewUser = (state: any) => state.persisted?.auth?.isNewUser;
export const selectAuthInitialized = (state: any) => state.persisted?.auth?.initialized;
export const selectAuthLoading = (state: any) => state.persisted?.auth?.loading;
export const selectAuthError = (state: any) => state.persisted?.auth?.error;

export default authSlice.reducer;
