import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import { Action } from 'redux';
import { ThunkAction } from '@reduxjs/toolkit';

// Import API slice
import { apiSlice } from '../../api/apiSlice';

// Import your existing slices
import authSlice from './slices/authSlice';
import reportSlice from './slices/reportSlice';
// Add other slices as needed

// ✅ ENHANCED: Configure persistence to EXCLUDE API slice
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  version: 1,
  // ✅ ONLY persist your regular slices, NEVER the API slice
  whitelist: ['auth', 'reports'],
  // ✅ Explicitly blacklist API slice to be extra safe
  blacklist: [apiSlice.reducerPath, 'api'],
  // ✅ Add timeout for async storage operations
  timeout: 10000,
  // ✅ Enable debug mode in development
  debug: __DEV__,
};

// ✅ Combine your regular reducers (these will be persisted)
const persistedReducers = combineReducers({
  auth: authSlice,
  reports: reportSlice,
  // Add other non-API slices here
});

// ✅ Create persisted reducer
const persistedReducer = persistReducer(persistConfig, persistedReducers);

// ✅ ENHANCED store configuration
export const store = configureStore({
  reducer: {
    // ✅ Persisted reducers (user data, auth, etc.)
    persisted: persistedReducer,
    // ✅ API slice (NOT persisted - stays fresh)
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  
  // ✅ IMPROVED middleware setup
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          // ✅ SIMPLIFIED: Ignore all RTK Query actions
          'api/executeQuery/pending',
          'api/executeQuery/fulfilled',
          'api/executeQuery/rejected',
          'api/executeMutation/pending',
          'api/executeMutation/fulfilled',
          'api/executeMutation/rejected',
        ],
        // ✅ Ignore these paths in state for serialization
        ignoredPaths: [
          'api.queries',
          'api.mutations',
          'api.provided',
          'api.subscriptions',
          'api.config',
        ],
      },
      // ✅ Add timing middleware in development
      immutableCheck: __DEV__,
      // ✅ Enable thunk middleware (RTK Query needs this)
      thunk: {
        extraArgument: undefined,
      },
    })
    // ✅ Add API middleware FIRST (important for RTK Query)
    .concat(apiSlice.middleware),
    
  // ✅ Enable Redux DevTools in development only
  devTools: __DEV__ && {
    name: 'KarunaNidhan Store',
    trace: true,
    traceLimit: 25,
  },
});

// ✅ IMPORTANT: Setup RTK Query listeners for auto-refetch, background sync
setupListeners(store.dispatch);

// ✅ Create persistor
export const persistor = persistStore(store);

// ✅ Type definitions
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

// ✅ CRITICAL: Define typed hooks for use throughout your app
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = () => useStore<typeof store>();

// ✅ Utility functions for store management
export const resetApiState = () => {
  store.dispatch(apiSlice.util.resetApiState());
};

export const invalidateAllTags = () => {
  store.dispatch(apiSlice.util.invalidateTags(['User', 'Report', 'NGO', 'Notification', 'Auth']));
};

// ✅ ENHANCED debug logging
if (__DEV__) {
  console.log('🏪 Redux store configured successfully');
  console.log('🔧 API slice path:', apiSlice.reducerPath);
  console.log('📦 Store reducers:', Object.keys(store.getState()));
  console.log('🔄 RTK Query listeners enabled');
  console.log('💾 Persistence configured for:', persistConfig.whitelist);
  console.log('🚫 Persistence blacklist:', persistConfig.blacklist);
}

export default store;
