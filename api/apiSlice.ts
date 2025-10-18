import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import { API_BASE_URL } from '@env'; // <-- THE ONLY CHANGE NEEDED
import AppwriteService from "../appwrite/service";

// Define RootState type for cases where store import might not work
interface AppState {
  persisted?: {
    auth?: {
      appwriteJWT?: string;
    };
  };
}

// ===== TYPE DEFINITIONS (Your original types are unchanged) =====
export interface AuthResponse {
  account_type: "user" | "ngo" | "unknown";
  user_data?: any;
  ngo_data?: any;
  message?: string;
  success?: boolean;
  entity_id?: string;
  entity_data?: any;
}

export interface InjuryReport {
  id: string;
  report_id: string;
  user_id: string;
  image_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  location: string;
  latitude: number;
  longitude: number;
  ngo_assigned?: number | null;
  volunteer_assigned?: number | null;
  ngo_name?: string;
  volunteer_name?: string;
  title?: string;
  description?: string;
  species?: string;
  breed?: string;
  age?: string;
  gender?: string;
  weight?: string;
  severity?: string;
  injury_summary?: string;
  symptoms?: any;
  urgency?: string;
  behavior?: string;
  context?: string;
  confidence_score?: number | null;
  care_tips?: any;
  immediate_actions?: any;
  environment_factors?: string;
  ai_analysis?: any;
  predicted_species?: string;
  predicted_severity?: string;
  urgency_level?: "low" | "medium" | "high" | "critical";
  care_recommendations?: {
    immediate?: string;
    general?: string;
  };
  environmental_factors?: any;
  behavioral_indicators?: any;
  model_version?: string;
  injury_assessment?: any;
}

export interface AnalysisResult {
  id: string;
  predicted_species?: string;
  predicted_severity?: string;
  urgency_level?: "low" | "medium" | "high" | "critical";
  care_recommendations?: {
    immediate?: string;
    general?: string;
  };
  environmental_factors?: any;
  behavioral_indicators?: any;
  model_version?: string;
  injury_assessment?: any;
}

export interface NGO {
  appwrite_user_id: string;
  name: string;
  email: string;
  phone: string;
  latitude: string;
  longitude: string;
  category: "animal" | "environment" | "medical" | "education" | "other";
  description: string;
  website?: string;
}

export interface NGORegister {
  id: string;
  address: any;
  location: any;
  city: string;
  state: string;
  is_verified: any;
  verified: any;
  specialization: string;
  reports_count: any;
  volunteers_count: any;
  success_rate: any;
  image: any;
  logo_url: any;
  avatar_url: any;
  established: any;
  year_established: any;
  registration_number: string;
  license_number: string;
  accepts_volunteers: boolean;
  auto_assign_reports: boolean;
  notification_radius: number;
  operating_hours_start: string;
  operating_hours_end: string;
  emergency_contact: string;
  appwrite_user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  latitude: string;
  longitude: string;
  category: "animal" | "environment" | "medical" | "education" | "other";
  description?: string | null;
  website?: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface UserProfile {
  id?: string;
  appwrite_user_id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_volunteer: boolean;
  avatar_url?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bio?: string;
  notification_preferences?: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatus {
  onboarding_required: boolean;
  account_type: "user" | "ngo" | "unknown";
  profile_complete: boolean;
  onboarding_url?: string;
}

export interface WhoAmIResponse {
  account_type: "user" | "ngo" | "unknown";
  entity_id?: string;
  name?: string;
  email?: string;
  is_volunteer?: boolean;
  verified?: boolean;
  category?: string;
  error?: string;
}

export interface VolunteerApplication {
  user_email: any;
  user_name: any;
  id: number;
  user_id: string;
  ngo_id: string;
  status: "pending" | "accepted" | "rejected";
  application_date: string;
  message?: string;
}

export interface NotificationPreferences {
  push_notifications?: boolean;
  email_notifications?: boolean;
  report_updates?: boolean;
  volunteer_requests?: boolean;
  emergency_alerts?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}


// Your baseQuery and networking logic remains identical
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState, endpoint }) => {
    console.log("🔧 API Request Headers - Endpoint:", endpoint);
    const state = getState() as any;
    const token =
      state?.persisted?.auth?.appwriteJWT ||
      state?.auth?.appwriteJWT ||
      state?.appwriteJWT ||
      AppwriteService?.jwtToken;
    console.log("🔧 API Request Headers - Token exists:", !!token);
    console.log(
      "🔧 API Request Headers - Token preview:",
      token ? token.substring(0, 20) + "..." : "null"
    );
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      console.log("✅ Authorization header set");
    }
    if (endpoint === "createReport") {
      headers.set("Accept", "application/json");
      console.log("🔧 FormData endpoint - skipping content-type");
    } else {
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json");
      console.log("🔧 JSON endpoint - content-type set");
    }
    console.log("🔧 Final headers:", Object.fromEntries(headers.entries()));
    return headers;
  },
  fetchFn: async (input, init) => {
    const fullUrl = typeof input === "string" ? input : input.url;
    const requestUrl = fullUrl || "UNKNOWN_URL";
    console.log(
      "🌐 =================== NETWORK DEBUG START ==================="
    );
    console.log("🌐 Base URL from config:", API_BASE_URL);
    console.log("🌐 Full URL being requested:", requestUrl);
    console.log("🌐 Request method:", init?.method || "GET");
    console.log("🌐 Request headers:", init?.headers || {});
    console.log("🌐 Request body:", init?.body || "No body");
    const hasFullUrl =
      requestUrl.startsWith("http://") || requestUrl.startsWith("https://");
    if (!hasFullUrl) {
      console.error("🌐 ❌ CRITICAL: Request URL is not complete!");
      console.error(" Expected: https://karunanidhan.app/users/auth/register");
      console.error(" Received:", requestUrl);
      console.error(" Base URL:", API_BASE_URL);
    }
    const isLocalhost =
      requestUrl.includes("localhost") || requestUrl.includes("127.0.0.1");
    const isIP = /\d+\.\d+\.\d+\.\d+/.test(requestUrl);
    const isDomain = requestUrl.includes("karunanidhan.app");
    console.log("🌐 URL Analysis:", {
      isLocalhost,
      isIP,
      isDomain,
      hasFullUrl,
      protocol: requestUrl.startsWith("https://")
        ? "HTTPS"
        : requestUrl.startsWith("http://")
        ? "HTTP"
        : "UNKNOWN",
    });
    const startTime = Date.now();
    try {
      console.log("🌐 🚀 Starting network request...");
      const response = await fetch(input, init);
      const duration = Date.now() - startTime;
      console.log("🌐 ✅ Network request successful!");
      console.log("🌐 Response status:", response.status);
      console.log("🌐 Response status text:", response.statusText);
      console.log("🌐 Response headers:", [...response.headers.entries()]);
      console.log("🌐 Request duration:", duration + "ms");
      console.log("🌐 Response type:", response.type);
      console.log("🌐 Response redirected:", response.redirected);
      console.log("🌐 Response URL:", response.url);
      console.log(
        "🌐 =================== NETWORK DEBUG END ==================="
      );
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        "🌐 ❌ =================== NETWORK ERROR DEBUG ==================="
      );
      console.error("🌐 ❌ Network request failed after:", duration + "ms");
      console.error("🌐 ❌ Error type:", error.constructor.name);
      console.error("🌐 ❌ Error message:", error.message);
      console.error("🌐 ❌ Error stack:", error.stack);
      console.error("🌐 ❌ Failed URL:", requestUrl);
      console.error("🌐 ❌ Failed method:", init?.method || "GET");
      console.error("🌐 ❌ Device info:", {
        platform: Platform.OS,
        isSimulator: __DEV__,
      });
      console.error(
        "🌐 ❌ =================== NETWORK ERROR DEBUG END ==================="
      );
      throw error;
    }
  },
  timeout: 30000,
});

const baseQueryWithRetry: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  console.log("🌐 Making API request:", args);
  let result = await baseQuery(args, api, extraOptions);
  if (result.error) {
    console.error("❌ API Request failed:", {
      status: result.error.status,
      data: result.error.data,
      error: result.error,
    });
    if (result.error.status === 413) {
      console.error(
        "❌ Request Entity Too Large (413): File size exceeds server limits"
      );
      const existingData =
        typeof result.error.data === "object" ? result.error.data : {};
      result.error.data = {
        ...(existingData as object),
        message:
          "Image file is too large. Please try a smaller image or compress the current one.",
      };
    } else if (result.error.status === 401 || result.error.status === 403) {
      console.log("🔒 Authentication error, clearing invalid token");
    } else if (result.error.status === "FETCH_ERROR") {
      console.log("🔄 Retrying request due to network error...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await baseQuery(args, api, extraOptions);
    }
  } else {
    console.log("✅ API Request successful:", typeof result.data);
  }
  return result;
};


// All your endpoints are unchanged
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    "User",
    "Report",
    "NGO",
    "Notification",
    "Auth",
    "VolunteerApplication",
  ],
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 30,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    // All of your original endpoint definitions go here, exactly as they were.
    // ...
    // ===== AUTHENTICATION ENDPOINTS =====
    getUserType: builder.mutation({
      query: ({ appwrite_user_id }) => {
        console.log("🔍 Getting user type for:", appwrite_user_id);
        return {
          url: "/users/auth/get_type",
          method: "POST",
          body: { appwrite_user_id },
        };
      },
      invalidatesTags: ["Auth", "User"],
    }),

    registerUserType: builder.mutation<
      AuthResponse,
      {
        appwrite_user_id: string;
        email: string;
        name: string;
        account_type: "user" | "ngo";
      }
    >({
      query: (userData) => {
        console.log("🔐 Registering user with Django API:", {
          ...userData,
          appwrite_user_id: userData.appwrite_user_id.substring(0, 8) + "...",
        });
        return {
          url: "/users/auth/register",
          method: "POST",
          body: userData,
          headers: {
            "Content-Type": "application/json",
          },
        };
      },
      invalidatesTags: ["Auth", "User"],
      transformErrorResponse: (response: any) => {
        console.error("❌ Registration failed with response:", response);
        return response;
      },
    }),

    // ===== USER PROFILE ENDPOINTS =====
    getCurrentUser: builder.query<UserProfile, void>({
      query: () => ({
        url: "/users/profile/me/",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "CURRENT" }],
      keepUnusedDataFor: 600,
    }),

    getAccountType: builder.query<WhoAmIResponse, void>({
      query: () => ({
        url: "/users/profile/whoami/",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "ACCOUNT_TYPE" }],
    }),

    checkOnboardingStatus: builder.query<OnboardingStatus, void>({
      query: () => ({
        url: "/users/profile/onboarding-status/",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "ONBOARDING" }],
    }),

    completeOnboarding: builder.mutation<
      UserProfile,
      {
        name?: string;
        email?: string;
        is_volunteer?: boolean;
        bio?: string;
        location?: {
          latitude?: number;
          longitude?: number;
        };
      }
    >({
      query: (data) => ({
        url: "/users/profile/onboard/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User", "Auth"],
    }),

    updateUserProfile: builder.mutation<UserProfile, Partial<UserProfile>>({
      query: (data) => ({
        url: "/users/profile/update/",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: [{ type: "User", id: "CURRENT" }],
    }),

    toggleVolunteerStatus: builder.mutation<
      { is_volunteer: boolean },
      { is_volunteer: boolean }
    >({
      query: ({ is_volunteer }) => ({
        url: "/users/profile/toggle-volunteer/",
        method: "PATCH",
        body: { is_volunteer },
      }),
      invalidatesTags: [{ type: "User", id: "CURRENT" }],
    }),

    uploadAvatar: builder.mutation<
      { message: string; avatar_url: string },
      FormData
    >({
      query: (formData) => ({
        url: "/users/profile/upload-avatar/",
        method: "POST",
        body: formData,
        prepareHeaders: (headers) => {
          headers.delete("Content-Type");
          return headers;
        },
      }),
      invalidatesTags: [{ type: "User", id: "CURRENT" }],
    }),

    removeAvatar: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/users/profile/remove-avatar/",
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "User", id: "CURRENT" }],
    }),

    registerDevice: builder.mutation<
      { success: boolean; created: boolean; user_type: string },
      {
        push_token: string;
        device_id?: string;
        platform?: string;
      }
    >({
      query: (data) => ({
        url: "/users/profile/register-device/",
        method: "POST",
        body: data,
      }),
    }),

    updateNotificationPreferences: builder.mutation<
      {
        message: string;
        preferences: NotificationPreferences;
      },
      NotificationPreferences
    >({
      query: (preferences) => ({
        url: "/users/profile/notification-preferences/",
        method: "POST",
        body: preferences,
      }),
      invalidatesTags: [{ type: "Notification", id: "PREFERENCES" }],
    }),

    patchNotificationPreferences: builder.mutation<
      {
        message: string;
        preferences: NotificationPreferences;
      },
      Partial<NotificationPreferences>
    >({
      query: (preferences) => ({
        url: "/users/profile/notification-preferences/",
        method: "PATCH",
        body: preferences,
      }),
      invalidatesTags: [{ type: "Notification", id: "PREFERENCES" }],
    }),

    // Reverse Geocode
    reverseGeocode: builder.query<
      { display_name: string; lat: string; lon: string } | null,
      { lat: number; lon: number }
    >({
      queryFn: async ({ lat, lon }) => {
        console.log("🔍 Geocoding disabled - using coordinates only");
        return {
          data: {
            display_name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            lat: lat.toString(),
            lon: lon.toString(),
          },
        };
      },
      keepUnusedDataFor: 300,
    }),

    // App Config
    getAppConfig: builder.query<
      {
        version: string;
        maintenance_mode: boolean;
        features: { ai_analysis: boolean };
      },
      void
    >({
      query: () => ({
        url: "/app/config/",
        method: "GET",
      }),
      keepUnusedDataFor: 600,
    }),

    // Health Check
    healthCheck: builder.query<
      { status: "healthy" | "degraded" | "unhealthy" },
      void
    >({
      query: () => ({
        url: "/health/",
        method: "GET",
      }),
      keepUnusedDataFor: 60,
    }),

    // ===== USER REPORTS ENDPOINTS =====
    getUserReports: builder.query<PaginatedResponse<InjuryReport>, void>({
      query: () => ({
        url: "/users/reports/own/",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        console.log("🔍 getUserReports - Raw API response:", response);
        if (Array.isArray(response)) {
          return {
            results: response,
            count: response.length,
            next: null,
            previous: null,
          };
        }
        return response?.results
          ? response
          : {
              results: response?.data || [],
              count: response?.count || 0,
              next: null,
              previous: null,
            };
      },
      providesTags: [{ type: "Report", id: "OWN" }],
    }),

    getHelpedReports: builder.query<InjuryReport[], void>({
      query: () => {
        console.log(
          "🔍 getHelpedReports - Making API call to /users/reports/helped/"
        );
        return {
          url: "/users/reports/helped/",
          method: "GET",
        };
      },
      transformResponse: (response: any) => {
        console.log("🔍 getHelpedReports - Raw API response:", response);
        console.log("🔍 getHelpedReports - Response type:", typeof response);
        console.log("🔍 getHelpedReports - Is array?", Array.isArray(response));
        if (Array.isArray(response)) {
          console.log(
            "✅ getHelpedReports - Returning array:",
            response.length,
            "items"
          );
          return response;
        }

        const result = response?.results || response?.data || [];
        console.log(
          "✅ getHelpedReports - Returning extracted result:",
          result.length,
          "items"
        );
        return result;
      },
      providesTags: [{ type: "Report", id: "HELPED" }],
    }),

    acceptReport: builder.mutation<
      {
        message: string;
        report_id: string;
        route?: {
          from: { lat: number; lon: number };
          to: { lat: number; lon: number };
        };
      },
      {
        report_id: string;
        lat?: number;
        lon?: number;
      }
    >({
      query: ({ report_id, lat, lon }) => ({
        url: "/users/reports/accept-report/",
        method: "POST",
        body: { report_id, lat, lon },
      }),
      invalidatesTags: [
        { type: "Report", id: "LIST" },
        { type: "Report", id: "OWN" },
        { type: "Report", id: "HELPED" },
      ],
    }),

    // ===== VOLUNTEER APPLICATIONS =====
    applyAsVolunteer: builder.mutation<
      { message: string },
      {
        ngo_id: string;
        message?: string;
      }
    >({
      query: (applicationData) => ({
        url: "/users/volunteer-applications/",
        method: "POST",
        body: applicationData,
      }),
      invalidatesTags: ["VolunteerApplication"],
    }),

    // ===== REPORTS ENDPOINTS =====
    listReports: builder.query<PaginatedResponse<InjuryReport>, any>({
      query: (params) => {
        console.log("🌐 RTK Query - Request params:", params);
        return {
          url: "/reports/reports/",
          params: {
            page: params.page || 1,
            page_size: params.page_size || 10,
            search: params.search || undefined,
            status: params.status || undefined,
            lat: params.lat || undefined,
            lon: params.lon || undefined,
            radius: params.radius || undefined,
          },
        };
      },
      providesTags: (result, error, params) => [
        { type: "Report", id: `LIST-${JSON.stringify(params)}` },
      ],
      serializeQueryArgs: ({ queryArgs }) => {
        return JSON.stringify(queryArgs);
      },
      transformResponse: (response: any, meta, arg) => {
        console.log("🔄 RTK Query - Transform response:", {
          type: Array.isArray(response) ? "array" : "object",
          count: Array.isArray(response) ? response.length : response?.count,
          page: arg.page,
          page_size: arg.page_size,
        });
        return response;
      },
    }),

    getReportDetail: builder.query<InjuryReport, string>({
      query: (id) => `/reports/reports/${id}/`,
      providesTags: (result, error, id) => [{ type: "Report", id }],
    }),

    createReport: builder.mutation<InjuryReport, FormData>({
      query: (formData) => {
        console.log(
          "🚀 RTK createReport - Setting up POST request with FormData"
        );
        console.log("📦 FormData contents:");
        for (let [key, value] of formData.entries()) {
          if (key === "image") {
            console.log(
              `  📷 ${key}: [File] ${(value as any).name || "image.jpg"} (${
                (value as any).size || "unknown"
              } bytes)`
            );
          } else if (key === "data") {
            console.log(
              `  📄 ${key}: ${
                typeof value === "string"
                  ? value.substring(0, 200) + "..."
                  : "[Object]"
              }`
            );
          } else {
            console.log(`  🔧 ${key}: ${value}`);
          }
        }
        return {
          url: "/reports/reports/",
          method: "POST",
          body: formData,
          prepareHeaders: (headers, { getState }) => {
            headers.delete("content-type");
            headers.delete("Content-Type");
            const token = (getState() as any).persisted?.auth?.appwriteJWT;
            if (token) {
              headers.set("authorization", `Bearer ${token}`);
              console.log("✅ Auth header set for createReport");
            }
            console.log(
              "🔧 createReport final headers:",
              Object.fromEntries(headers.entries())
            );
            return headers;
          },
        };
      },
      invalidatesTags: [
        { type: "Report", id: "LIST" },
        { type: "Report", id: "NEARBY" },
        { type: "Report", id: "OWN" },
      ],
    }),

    updateReport: builder.mutation<
      InjuryReport,
      { id: number; data: Partial<InjuryReport> }
    >({
      query: ({ id, data }) => ({
        url: `/reports/reports/${id}/`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Report", id }],
    }),

    patchReport: builder.mutation<
      InjuryReport,
      { id: number; data: Partial<InjuryReport> }
    >({
      query: ({ id, data }) => ({
        url: `/reports/reports/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Report", id }],
    }),

    deleteReport: builder.mutation<void, number>({
      query: (id) => ({
        url: `/reports/reports/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Report", id: "LIST" }],
    }),

    updateReportStatus: builder.mutation<
      InjuryReport,
      {
        id: number;
        status: string;
        notes?: string;
      }
    >({
      query: ({ id, status, notes }) => ({
        url: `/reports/reports/${id}/update_status/`,
        method: "PATCH",
        body: { status, notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Report", id }],
    }),

    getNearbyReports: builder.query<
      InjuryReport[],
      {
        latitude?: number;
        longitude?: number;
        radius?: number;
      }
    >({
      query: ({ latitude, longitude, radius = 10 }) => {
        const params = new URLSearchParams();
        if (latitude !== undefined) params.append("lat", latitude.toString());
        if (longitude !== undefined) params.append("lon", longitude.toString());
        params.append("radius", radius.toString());
        return `/reports/reports/nearby/?${params.toString()}`;
      },
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.results) return response.results;
        if (response?.data) return response.data;
        return [];
      },
      providesTags: [{ type: "Report", id: "NEARBY" }],
    }),

    updateNGOApplicationStatus: builder.mutation<
      { success: boolean; message: string },
      {
        appwrite_user_id: string;
        application_id: string;
        status: "pending" | "accepted" | "rejected";
      }
    >({
      query: ({ appwrite_user_id, application_id, status }) => ({
        url: `/ngo/${appwrite_user_id}/update-application-status/`,
        method: "PATCH",
        body: { application_id, status },
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: "VolunteerApplication", id: `NGO_${appwrite_user_id}` },
        { type: "VolunteerApplication", id: "LIST" },
      ],
    }),

    // ===== NOTIFICATION ENDPOINTS =====
    getNotificationHistory: builder.query<
      Notification[],
      { pageSize?: number }
    >({
      query: ({ pageSize = 50 } = {}) =>
        `/noti/notifications/?page_size=${pageSize}`,
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response;
        return response?.notifications || response?.results || response || [];
      },
      providesTags: [{ type: "Notification", id: "LIST" }],
    }),

    markNotificationAsRead: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/noti/notifications/${notificationId}/mark_read/`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),

    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/noti/notifications/mark_all_read/",
        method: "POST",
      }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),

    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => "/noti/notifications/preferences/",
      providesTags: [{ type: "Notification", id: "PREFERENCES" }],
    }),

    updateNotificationPreferencesNoti: builder.mutation<
      NotificationPreferences,
      NotificationPreferences
    >({
      query: (preferences) => ({
        url: "/noti/notifications/preferences/",
        method: "POST",
        body: preferences,
      }),
      invalidatesTags: [{ type: "Notification", id: "PREFERENCES" }],
    }),

    sendTestNotification: builder.mutation<void, void>({
      query: () => ({
        url: "/noti/notifications/send_test_notification/",
        method: "POST",
      }),
    }),

    // ===== HELPER MUTATIONS FOR IMAGE ANALYSIS =====
    analyzeImage: builder.mutation<
      InjuryReport,
      {
        imageUri: string;
        latitude: number;
        longitude: number;
      }
    >({
      query: ({ imageUri, latitude, longitude }) => {
        const formData = new FormData();
        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: "analysis-image.jpg",
        } as any);
        formData.append("location", JSON.stringify({ latitude, longitude }));
        return {
          url: "/reports/reports/",
          method: "POST",
          body: formData,
          prepareHeaders: (headers) => {
            headers.delete("Content-Type");
            return headers;
          },
        };
      },
      invalidatesTags: [
        { type: "Report", id: "LIST" },
        { type: "Report", id: "NEARBY" },
      ],
    }),

    // ===== NGO ENDPOINTS =====
    getNGODetail: builder.query<NGO, string>({
      query: (appwrite_user_id) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: "GET",
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: "NGO", id: appwrite_user_id },
      ],
    }),

    getNGOs: builder.query<
      {
        count: number;
        next: string | null;
        previous: string | null;
        results: NGO[];
      },
      {
        page?: number;
        page_size?: number;
        search?: string;
        category?: string;
      }
    >({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params && "page" in params && params.page) {
          queryParams.append("page", params.page.toString());
        }
        if (params && "page_size" in params && params.page_size) {
          queryParams.append("page_size", params.page_size.toString());
        }
        if (params && "search" in params && params.search) {
          queryParams.append("search", params.search);
        }
        if (params && "category" in params && params.category) {
          queryParams.append("category", params.category);
        }

        const queryString = queryParams.toString();
        return {
          url: `/ngo/${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ appwrite_user_id }) => ({
                type: "NGO" as const,
                id: appwrite_user_id,
              })),
              { type: "NGO", id: "LIST" },
            ]
          : [{ type: "NGO", id: "LIST" }],
    }),

    applyVolunteerToNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string; message?: string }
    >({
      query: ({ appwrite_user_id, message }) => ({
        url: `/ngo/${appwrite_user_id}/apply-volunteer/`,
        method: "POST",
        body: {
          message:
            message || "I would like to volunteer for your organization.",
        },
      }),
      invalidatesTags: [{ type: "VolunteerApplication", id: "LIST" }],
    }),

    getNGOAssignedReports: builder.query<InjuryReport[], string>({
      query: (appwrite_user_id) => ({
        url: `/ngo/${appwrite_user_id}/assigned-reports/`,
        method: "GET",
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: "Report", id: `ASSIGNED_${appwrite_user_id}` },
      ],
    }),

    getNGODashboardStats: builder.query<
      {
        active_reports: number;
        completed_reports: number;
        total_volunteers: number;
        success_rate: number;
      },
      string
    >({
      query: (appwrite_user_id) => ({
        url: `/ngo/${appwrite_user_id}/dashboard-stats/`,
        method: "GET",
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: "NGO", id: `STATS_${appwrite_user_id}` },
      ],
    }),

    getNGOVolunteerRequests: builder.query<VolunteerApplication[], string>({
      query: (appwrite_user_id) => ({
        url: `/ngo/${appwrite_user_id}/volunteer-requests/`,
        method: "GET",
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: "VolunteerApplication", id: `NGO_${appwrite_user_id}` },
      ],
    }),

    createNGO: builder.mutation<
      NGO,
      {
        name: string;
        email: string;
        phone: string;
        latitude: string;
        longitude: string;
        category: "animal" | "environment" | "medical" | "education" | "other";
        description: string;
        website?: string;
      }
    >({
      query: (ngoData) => ({
        url: "/ngo/",
        method: "POST",
        body: ngoData,
      }),
      invalidatesTags: [{ type: "NGO", id: "LIST" }],
    }),

    updateNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string } & Partial<Omit<NGO, "appwrite_user_id">>
    >({
      query: ({ appwrite_user_id, ...updateData }) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: "PUT",
        body: updateData,
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: "NGO", id: appwrite_user_id },
        { type: "NGO", id: "LIST" },
      ],
    }),

    patchNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string } & Partial<NGO>
    >({
      query: ({ appwrite_user_id, ...updateData }) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: "PATCH",
        body: updateData,
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: "NGO", id: appwrite_user_id },
        { type: "NGO", id: "LIST" },
      ],
    }),

    deleteNGO: builder.mutation<{ success: boolean }, string>({
      query: (appwrite_user_id) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, appwrite_user_id) => [
        { type: "NGO", id: appwrite_user_id },
        { type: "NGO", id: "LIST" },
      ],
    }),

    // ===== MISSING ENDPOINTS - NOW ADDED =====
    updateExtraFields: builder.mutation<
      { success: boolean; message: string },
      {
        phone_number?: string;
        date_of_birth?: string;
        location?: string;
        [key: string]: any;
      }
    >({
      query: (userData) => ({
        url: "/users/profile/extra-fields/",
        method: "PATCH",
        body: userData,
      }),
      invalidatesTags: [{ type: "User", id: "CURRENT" }],
    }),

    getOnboardingStatus: builder.query<
      {
        success: boolean;
        onboarding_completed: boolean;
        missing_fields: string[];
      },
      void
    >({
      query: () => ({
        url: "/users/profile/onboarding-status/",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "ONBOARDING_STATUS" }],
    }),
  }),
});


// All of your exported hooks are unchanged
export const {
  // Auth & User
  useGetUserTypeMutation,
  useRegisterUserTypeMutation,
  useGetCurrentUserQuery,
  useGetAccountTypeQuery,
  useCheckOnboardingStatusQuery,
  useGetOnboardingStatusQuery,
  useCompleteOnboardingMutation,
  useUpdateUserProfileMutation,
  useToggleVolunteerStatusMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useRegisterDeviceMutation,
  useUpdateExtraFieldsMutation,
  useReverseGeocodeQuery,
  useGetAppConfigQuery,
  useHealthCheckQuery,

  // Notifications
  useUpdateNotificationPreferencesMutation,
  usePatchNotificationPreferencesMutation,
  useGetNotificationHistoryQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesNotiMutation,
  useSendTestNotificationMutation,

  // Reports
  useGetUserReportsQuery,
  useGetHelpedReportsQuery,
  useAcceptReportMutation,
  useApplyAsVolunteerMutation,
  useListReportsQuery,
  useGetReportDetailQuery,
  useCreateReportMutation,
  useUpdateReportMutation,
  usePatchReportMutation,
  useDeleteReportMutation,
  useUpdateReportStatusMutation,
  useGetNearbyReportsQuery,

  // NGO
  useGetNGOsQuery,
  useGetNGODetailQuery,
  useApplyVolunteerToNGOMutation,
  useGetNGOAssignedReportsQuery,
  useGetNGODashboardStatsQuery,
  useGetNGOVolunteerRequestsQuery,
  useUpdateNGOApplicationStatusMutation,
  useCreateNGOMutation,
  useUpdateNGOMutation,
  usePatchNGOMutation,
  useDeleteNGOMutation,

  // ML
  useAnalyzeImageMutation,
} = apiSlice;

export default apiSlice;
