import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@env';
import AppwriteService from '../appwrite/service';

interface AppState {
  persisted?: {
    auth?: {
      appwriteJWT?: string;
    };
  };
}

export interface AuthResponse {
  account_type: 'user' | 'ngo' | 'unknown';
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
  urgency_level?: 'low' | 'medium' | 'high' | 'critical';
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
  urgency_level?: 'low' | 'medium' | 'high' | 'critical';
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
  category: 'animal' | 'environment' | 'medical' | 'education' | 'other';
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
  category: 'animal' | 'environment' | 'medical' | 'education' | 'other';
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
  account_type: 'user' | 'ngo' | 'unknown';
  profile_complete: boolean;
  onboarding_url?: string;
}

export interface WhoAmIResponse {
  account_type: 'user' | 'ngo' | 'unknown';
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
  status: 'pending' | 'accepted' | 'rejected';
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

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (
    headers: Headers,
    { getState, endpoint }: { getState: () => unknown; endpoint: string },
  ) => {
    const state = getState() as AppState;
    const token =
      state?.persisted?.auth?.appwriteJWT || AppwriteService?.jwtToken;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (endpoint === 'createReport') {
      headers.set('Accept', 'application/json');
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
    }
    return headers;
  },
  fetchFn: async (input, init) => {
    const response = await fetch(input, init);
    return response;
  },
  timeout: 30000,
});

const baseQueryWithRetry: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 'FETCH_ERROR') {
    await new Promise(resolve => setTimeout(() => resolve(null), 1000));
    result = await baseQuery(args, api, extraOptions);
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRetry,
  tagTypes: [
    'User',
    'Report',
    'NGO',
    'Notification',
    'Auth',
    'VolunteerApplication',
  ],
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 30,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: builder => ({
    getUserType: builder.mutation({
      query: ({ appwrite_user_id }) => ({
        url: '/users/auth/get_type',
        method: 'POST',
        body: { appwrite_user_id },
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    registerUserType: builder.mutation<
      AuthResponse,
      {
        appwrite_user_id: string;
        email: string;
        name: string;
        account_type: 'user' | 'ngo';
      }
    >({
      query: userData => ({
        url: '/users/auth/register',
        method: 'POST',
        body: userData,
        headers: { 'Content-Type': 'application/json' },
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    getCurrentUser: builder.query<UserProfile, void>({
      query: () => ({ url: '/users/profile/me/', method: 'GET' }),
      providesTags: [{ type: 'User', id: 'CURRENT' }],
      keepUnusedDataFor: 600,
    }),
    getAccountType: builder.query<WhoAmIResponse, void>({
      query: () => ({ url: '/users/profile/whoami/', method: 'GET' }),
      providesTags: [{ type: 'User', id: 'ACCOUNT_TYPE' }],
    }),
    checkOnboardingStatus: builder.query<OnboardingStatus, void>({
      query: () => ({
        url: '/users/profile/onboarding-status/',
        method: 'GET',
      }),
      providesTags: [{ type: 'User', id: 'ONBOARDING' }],
    }),
    completeOnboarding: builder.mutation<
      UserProfile,
      {
        name?: string;
        email?: string;
        is_volunteer?: boolean;
        bio?: string;
        location?: { latitude?: number; longitude?: number };
      }
    >({
      query: data => ({
        url: '/users/profile/onboard/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Auth'],
    }),
    updateUserProfile: builder.mutation<UserProfile, Partial<UserProfile>>({
      query: data => ({
        url: '/users/profile/update/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    toggleVolunteerStatus: builder.mutation<
      { is_volunteer: boolean },
      { is_volunteer: boolean }
    >({
      query: ({ is_volunteer }) => ({
        url: '/users/profile/toggle-volunteer/',
        method: 'PATCH',
        body: { is_volunteer },
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    uploadAvatar: builder.mutation<
      { message: string; avatar_url: string },
      FormData
    >({
      query: formData => ({
        url: '/users/profile/upload-avatar/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    removeAvatar: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/users/profile/remove-avatar/', method: 'DELETE' }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
    }),
    registerDevice: builder.mutation<
      { success: boolean; created: boolean; user_type: string },
      { push_token: string; device_id?: string; platform?: string }
    >({
      query: data => ({
        url: '/users/profile/register-device/',
        method: 'POST',
        body: data,
      }),
    }),
    updateNotificationPreferences: builder.mutation<
      { message: string; preferences: NotificationPreferences },
      NotificationPreferences
    >({
      query: preferences => ({
        url: '/users/profile/notification-preferences/',
        method: 'POST',
        body: preferences,
      }),
      invalidatesTags: [{ type: 'Notification', id: 'PREFERENCES' }],
    }),
    patchNotificationPreferences: builder.mutation<
      { message: string; preferences: NotificationPreferences },
      Partial<NotificationPreferences>
    >({
      query: preferences => ({
        url: '/users/profile/notification-preferences/',
        method: 'PATCH',
        body: preferences,
      }),
      invalidatesTags: [{ type: 'Notification', id: 'PREFERENCES' }],
    }),
    reverseGeocode: builder.query<
      { display_name: string; lat: string; lon: string } | null,
      { lat: number; lon: number }
    >({
      queryFn: async ({ lat, lon }) => ({
        data: {
          display_name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          lat: lat.toString(),
          lon: lon.toString(),
        },
      }),
      keepUnusedDataFor: 300,
    }),
    getAppConfig: builder.query<
      {
        version: string;
        maintenance_mode: boolean;
        features: { ai_analysis: boolean };
      },
      void
    >({
      query: () => ({ url: '/app/config/', method: 'GET' }),
      keepUnusedDataFor: 600,
    }),
    healthCheck: builder.query<
      { status: 'healthy' | 'degraded' | 'unhealthy' },
      void
    >({
      query: () => ({ url: '/health/', method: 'GET' }),
      keepUnusedDataFor: 60,
    }),
    getUserReports: builder.query<PaginatedResponse<InjuryReport>, void>({
      query: () => ({ url: '/users/reports/own/', method: 'GET' }),
      transformResponse: (response: any) =>
        Array.isArray(response)
          ? {
              results: response,
              count: response.length,
              next: null,
              previous: null,
            }
          : response,
      providesTags: [{ type: 'Report', id: 'OWN' }],
    }),
    getHelpedReports: builder.query<InjuryReport[], void>({
      query: () => ({ url: '/users/reports/helped/', method: 'GET' }),
      transformResponse: (response: any) =>
        response?.results ||
        response?.data ||
        (Array.isArray(response) ? response : []),
      providesTags: [{ type: 'Report', id: 'HELPED' }],
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
      { report_id: string; lat?: number; lon?: number }
    >({
      query: ({ report_id, lat, lon }) => ({
        url: '/users/reports/accept-report/',
        method: 'POST',
        body: { report_id, lat, lon },
      }),
      invalidatesTags: [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id: 'OWN' },
        { type: 'Report', id: 'HELPED' },
      ],
    }),
    applyAsVolunteer: builder.mutation<
      { message: string },
      { ngo_id: string; message?: string }
    >({
      query: applicationData => ({
        url: '/users/volunteer-applications/',
        method: 'POST',
        body: applicationData,
      }),
      invalidatesTags: ['VolunteerApplication'],
    }),
    listReports: builder.query<PaginatedResponse<InjuryReport>, any>({
      query: params => ({ url: '/reports/reports/', params }),
      providesTags: (result, error, params) => [
        { type: 'Report', id: `LIST-${JSON.stringify(params)}` },
      ],
    }),
    getReportDetail: builder.query<InjuryReport, string>({
      query: id => `/reports/reports/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Report', id }],
    }),
    createReport: builder.mutation<InjuryReport, FormData>({
      query: formData => ({
        url: '/reports/reports/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id: 'NEARBY' },
        { type: 'Report', id: 'OWN' },
      ],
    }),
    updateReport: builder.mutation<
      InjuryReport,
      { id: number; data: Partial<InjuryReport> }
    >({
      query: ({ id, data }) => ({
        url: `/reports/reports/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Report', id }],
    }),
    patchReport: builder.mutation<
      InjuryReport,
      { id: number; data: Partial<InjuryReport> }
    >({
      query: ({ id, data }) => ({
        url: `/reports/reports/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Report', id }],
    }),
    deleteReport: builder.mutation<void, number>({
      query: id => ({ url: `/reports/reports/${id}/`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Report', id: 'LIST' }],
    }),
    updateReportStatus: builder.mutation<
      InjuryReport,
      { id: number; status: string; notes?: string }
    >({
      query: ({ id, status, notes }) => ({
        url: `/reports/reports/${id}/update_status/`,
        method: 'PATCH',
        body: { status, notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Report', id }],
    }),
    getNearbyReports: builder.query<
      InjuryReport[],
      { latitude?: number; longitude?: number; radius?: number }
    >({
      query: ({ latitude, longitude, radius = 10 }) =>
        `/reports/reports/nearby/?lat=${latitude}&lon=${longitude}&radius=${radius}`,
      transformResponse: (response: any) =>
        response?.results || (Array.isArray(response) ? response : []),
      providesTags: [{ type: 'Report', id: 'NEARBY' }],
    }),
    updateNGOApplicationStatus: builder.mutation<
      { success: boolean; message: string },
      {
        appwrite_user_id: string;
        application_id: string;
        status: 'pending' | 'accepted' | 'rejected';
      }
    >({
      query: ({ appwrite_user_id, application_id, status }) => ({
        url: `/ngo/${appwrite_user_id}/update-application-status/`,
        method: 'PATCH',
        body: { application_id, status },
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: 'VolunteerApplication', id: `NGO_${appwrite_user_id}` },
        { type: 'VolunteerApplication', id: 'LIST' },
      ],
    }),
    getNotificationHistory: builder.query<
      Notification[],
      { pageSize?: number }
    >({
      query: ({ pageSize = 50 } = {}) =>
        `/noti/notifications/?page_size=${pageSize}`,
      transformResponse: (response: any) =>
        response?.notifications ||
        response?.results ||
        (Array.isArray(response) ? response : []),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationAsRead: builder.mutation<void, string>({
      query: notificationId => ({
        url: `/noti/notifications/${notificationId}/mark_read/`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/noti/notifications/mark_all_read/',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getNotificationPreferences: builder.query<NotificationPreferences, void>({
      query: () => '/noti/notifications/preferences/',
      providesTags: [{ type: 'Notification', id: 'PREFERENCES' }],
    }),
    updateNotificationPreferencesNoti: builder.mutation<
      NotificationPreferences,
      NotificationPreferences
    >({
      query: preferences => ({
        url: '/noti/notifications/preferences/',
        method: 'POST',
        body: preferences,
      }),
      invalidatesTags: [{ type: 'Notification', id: 'PREFERENCES' }],
    }),
    sendTestNotification: builder.mutation<void, void>({
      query: () => ({
        url: '/noti/notifications/send_test_notification/',
        method: 'POST',
      }),
    }),
    analyzeImage: builder.mutation<
      InjuryReport,
      { imageUri: string; latitude: number; longitude: number }
    >({
      query: ({ imageUri, latitude, longitude }) => {
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'analysis-image.jpg',
        } as any);
        formData.append('location', JSON.stringify({ latitude, longitude }));
        return { url: '/reports/reports/', method: 'POST', body: formData };
      },
      invalidatesTags: [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id: 'NEARBY' },
      ],
    }),
    getNGODetail: builder.query<NGO, string>({
      query: appwrite_user_id => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: 'GET',
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: 'NGO', id: appwrite_user_id },
      ],
    }),
    getNGOs: builder.query<
      {
        count: number;
        next: string | null;
        previous: string | null;
        results: NGO[];
      },
      { page?: number; page_size?: number; search?: string; category?: string }
    >({
      query: (params = {}) => ({ url: '/ngo/', params }),
      providesTags: result =>
        result?.results
          ? [
              ...result.results.map(({ appwrite_user_id }) => ({
                type: 'NGO' as const,
                id: appwrite_user_id,
              })),
              { type: 'NGO', id: 'LIST' },
            ]
          : [{ type: 'NGO', id: 'LIST' }],
    }),
    applyVolunteerToNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string; message?: string }
    >({
      query: ({ appwrite_user_id, message }) => ({
        url: `/ngo/${appwrite_user_id}/apply-volunteer/`,
        method: 'POST',
        body: {
          message:
            message || 'I would like to volunteer for your organization.',
        },
      }),
      invalidatesTags: [{ type: 'VolunteerApplication', id: 'LIST' }],
    }),
    getNGOAssignedReports: builder.query<InjuryReport[], string>({
      query: appwrite_user_id => ({
        url: `/ngo/${appwrite_user_id}/assigned-reports/`,
        method: 'GET',
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: 'Report', id: `ASSIGNED_${appwrite_user_id}` },
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
      query: appwrite_user_id => ({
        url: `/ngo/${appwrite_user_id}/dashboard-stats/`,
        method: 'GET',
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: 'NGO', id: `STATS_${appwrite_user_id}` },
      ],
    }),
    getNGOVolunteerRequests: builder.query<VolunteerApplication[], string>({
      query: appwrite_user_id => ({
        url: `/ngo/${appwrite_user_id}/volunteer-requests/`,
        method: 'GET',
      }),
      providesTags: (result, error, appwrite_user_id) => [
        { type: 'VolunteerApplication', id: `NGO_${appwrite_user_id}` },
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
        category: 'animal' | 'environment' | 'medical' | 'education' | 'other';
        description: string;
        website?: string;
      }
    >({
      query: ngoData => ({ url: '/ngo/', method: 'POST', body: ngoData }),
      invalidatesTags: [{ type: 'NGO', id: 'LIST' }],
    }),
    updateNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string } & Partial<Omit<NGO, 'appwrite_user_id'>>
    >({
      query: ({ appwrite_user_id, ...updateData }) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: 'NGO', id: appwrite_user_id },
        { type: 'NGO', id: 'LIST' },
      ],
    }),
    patchNGO: builder.mutation<
      NGO,
      { appwrite_user_id: string } & Partial<NGO>
    >({
      query: ({ appwrite_user_id, ...updateData }) => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: 'PATCH',
        body: updateData,
      }),
      invalidatesTags: (result, error, { appwrite_user_id }) => [
        { type: 'NGO', id: appwrite_user_id },
        { type: 'NGO', id: 'LIST' },
      ],
    }),
    deleteNGO: builder.mutation<{ success: boolean }, string>({
      query: appwrite_user_id => ({
        url: `/ngo/${appwrite_user_id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, appwrite_user_id) => [
        { type: 'NGO', id: appwrite_user_id },
        { type: 'NGO', id: 'LIST' },
      ],
    }),
    updateExtraFields: builder.mutation<
      { success: boolean; message: string },
      {
        phone_number?: string;
        date_of_birth?: string;
        location?: string;
        [key: string]: any;
      }
    >({
      query: userData => ({
        url: '/users/profile/extra-fields/',
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'CURRENT' }],
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
        url: '/users/profile/onboarding-status/',
        method: 'GET',
      }),
      providesTags: [{ type: 'User', id: 'ONBOARDING_STATUS' }],
    }),
  }),
});

export const {
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
  useUpdateNotificationPreferencesMutation,
  usePatchNotificationPreferencesMutation,
  useGetNotificationHistoryQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesNotiMutation,
  useSendTestNotificationMutation,
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
  useAnalyzeImageMutation,
} = apiSlice;

export default apiSlice;
