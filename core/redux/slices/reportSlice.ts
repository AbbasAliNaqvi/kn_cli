// store/slices/reportSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ReportState {
  acceptedReports: string[]; // Array of report IDs user has accepted
  trackingReports: any[]; // Full report objects for tracking
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  acceptedReports: [],
  trackingReports: [],
  loading: false,
  error: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    addAcceptedReport: (state, action: PayloadAction<string>) => {
      const reportId = action.payload;
      console.log('🔍 REDUCER - addAcceptedReport called with:', reportId);
      console.log('🔍 REDUCER - Current acceptedReports:', state.acceptedReports);
      console.log('🔍 REDUCER - State before:', JSON.stringify(state));
      
      if (!state.acceptedReports.includes(reportId)) {
        state.acceptedReports.push(reportId);
        console.log('🔍 REDUCER - After push:', state.acceptedReports);
      } else {
        console.log('🔍 REDUCER - Report already exists');
      }
      
      console.log('🔍 REDUCER - Final state:', JSON.stringify(state));
    },
    removeAcceptedReport: (state, action: PayloadAction<string>) => {
      state.acceptedReports = state.acceptedReports.filter(id => id !== action.payload);
    },
    setTrackingReports: (state, action: PayloadAction<any[]>) => {
      console.log('🔍 REDUCER - setTrackingReports called with:', action.payload);
      state.trackingReports = action.payload;
    },
    updateReportStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;
      const reportIndex = state.trackingReports.findIndex(report => report.id === id);
      if (reportIndex !== -1) {
        state.trackingReports[reportIndex].status = status;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearReports: (state) => {
      state.acceptedReports = [];
      state.trackingReports = [];
      state.error = null;
    },
  },
});

export const {
  addAcceptedReport,
  removeAcceptedReport,
  setTrackingReports,
  updateReportStatus,
  setLoading,
  setError,
  clearReports,
} = reportsSlice.actions;

export default reportsSlice.reducer;
