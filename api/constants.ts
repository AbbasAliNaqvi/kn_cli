export const API_ENDPOINTS = {
  // Auth
  GET_USER_TYPE: '/users/auth/get_type',
  REGISTER_USER: '/users/auth/register',
  
  // User Profile
  PROFILE_ME: '/users/profile/me/',
  WHOAMI: '/users/profile/whoami/',
  ONBOARDING_STATUS: '/users/profile/onboarding-status/',
  ONBOARD: '/users/profile/onboard/',
  UPDATE_PROFILE: '/users/profile/update/',
  TOGGLE_VOLUNTEER: '/users/profile/toggle-volunteer/',
  UPLOAD_AVATAR: '/users/profile/upload-avatar/',
  REMOVE_AVATAR: '/users/profile/remove-avatar/',
  REGISTER_DEVICE: '/users/profile/register-device/',
  NOTIFICATION_PREFERENCES: '/users/profile/notification-preferences/',
  
  // User Reports
  OWN_REPORTS: '/users/reports/own/',
  HELPED_REPORTS: '/users/reports/helped/',
  ACCEPT_REPORT: '/users/reports/accept-report/',
  
  // Volunteer Applications
  VOLUNTEER_APPLICATIONS: '/users/volunteer-applications/',
  
  // Reports
  REPORTS: '/reports/reports/',
  REPORT_DETAIL: '/reports/reports/{id}/',
  UPDATE_REPORT_STATUS: '/reports/reports/{id}/update-status/',
  NEARBY_REPORTS: '/reports/reports/nearby/',
  NGO_SPECIFIC_REPORTS: '/reports/reports/ngo-specific/',
  
  // NGO
  NGO: '/ngo/',
  NGO_DETAIL: '/ngo/{appwrite_user_id}/',
  NGO_ACCEPT_REPORT: '/ngo/{appwrite_user_id}/accept-report/',
  NGO_APPLY_VOLUNTEER: '/ngo/{appwrite_user_id}/apply-volunteer/',
  NGO_ASSIGNED_REPORTS: '/ngo/{appwrite_user_id}/assigned-reports/',
  NGO_DASHBOARD_STATS: '/ngo/{appwrite_user_id}/dashboard-stats/',
  NGO_REPORT_TIMELINE: '/ngo/{appwrite_user_id}/report-timeline/',
  NGO_UPDATE_APPLICATION_STATUS: '/ngo/{appwrite_user_id}/update-application-status/',
  NGO_UPDATE_REPORT_STATUS: '/ngo/{appwrite_user_id}/update-report-status/',
  NGO_VOLUNTEER_REQUESTS: '/ngo/{appwrite_user_id}/volunteer-requests/',
  
  // Notifications
  NOTIFICATIONS: '/noti/notifications/',
  NOTIFICATION_PREFERENCES_NOTI: '/noti/notifications/preferences/',
  MARK_READ: '/noti/notifications/{id}/mark-read/',
  MARK_ALL_READ: '/noti/notifications/mark-all-read/',
  TEST_NOTIFICATION: '/noti/notifications/send-test-notification/',
} as const;