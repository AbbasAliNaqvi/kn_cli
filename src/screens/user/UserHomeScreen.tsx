import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Alert,
  TouchableOpacity,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  Text,
  Chip,
  Surface,
  Badge,
  Button,
  IconButton,
  ActivityIndicator,
  useTheme,
  Modal, // ✅ FIXED: Import Modal from react-native-paper
} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import NetInfo from "@react-native-community/netinfo";
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '../../core/redux/store';
import { addAcceptedReport } from '../../core/redux/slices/reportSlice';
import {
  useGetCurrentUserQuery,
  useGetNotificationHistoryQuery,
  useGetNearbyReportsQuery,
  useAcceptReportMutation,
} from '../../api/apiSlice';

// Components
import StrayRescueCard from '../../components/user/StrayRescueCard';
import MiniRescueCard from '../../components/user/MiniRescueCard';
import TrackingReportMiniCard from '../../components/user/TrackingReportMiniCard';
import LeafletMap from '../../components/user/LeafletMap';
import AdBanner from '../../components/AdBanner'; // Adjusted path to common

const radiusOptions = ["1 km", "2 km", "5 km", "10 km", "25 km"];

export default function UserHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  // ✅ FIXED: Correctly access persisted state
  const user = useSelector((state: RootState) => state.persisted.auth.user);
  const acceptedReports = useSelector((state: RootState) => state.persisted.reports.acceptedReports || []);

  // Local State
  const [radius, setRadius] = useState("5 km");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("Getting location...");
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedRescue, setSelectedRescue] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  // RTK Query Hooks
  const { data: userProfile, refetch: refetchUserProfile } = useGetCurrentUserQuery();
  const { data: notificationsData, refetch: refetchNotifications } = useGetNotificationHistoryQuery({ pageSize: 50 });
  
  const nearbyParams = useMemo(() => ({
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    radius: parseFloat(radius.replace(/[^0-9.]/g, '')),
  }), [userLocation, radius]);

  const {
    data: nearbyReportsData,
    isLoading: nearbyReportsLoading,
    error: nearbyReportsError,
    refetch: refetchNearbyReports,
  } = useGetNearbyReportsQuery(nearbyParams, { skip: !userLocation });

  const [acceptReport] = useAcceptReportMutation();

  const fetchLocation = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "[translate:Karuna Nidhan] needs your location to find nearby rescues.",
          buttonPositive: "OK",
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setAddress("Location Permission Denied");
        return;
      }
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        setAddress("Location Error");
        Alert.alert("Location Error", error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchLocation(),
      refetchUserProfile(),
      refetchNotifications(),
      refetchNearbyReports(),
    ]);
    setRefreshing(false);
  }, [fetchLocation, refetchUserProfile, refetchNotifications, refetchNearbyReports]);
  
  useEffect(() => {
    fetchLocation();
    const unsubscribe = NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
    return unsubscribe;
  }, [fetchLocation]);

  const handleReportStatusUpdate = async (reportId: string, newStatus: string) => {
     if (newStatus === 'accepted' || newStatus === 'in_progress') {
        if (!userLocation) {
            Alert.alert("Location Required", "Your location is needed to accept reports.");
            return;
        }
        try {
            await acceptReport({ report_id: reportId, lat: userLocation.latitude, lon: userLocation.longitude }).unwrap();
            dispatch(addAcceptedReport(reportId));
            setShowModal(false);
            Alert.alert("Success", "You have accepted this rescue case!");
        } catch (error: any) {
            Alert.alert("Error", error?.data?.message || "Failed to accept report.");
        }
     }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const unreadNotificationCount = useMemo(() => (notificationsData ?? []).filter((n: any) => !n.is_read).length, [notificationsData]);

  // ✅ FIXED: Handle undefined data and access array directly
  const emergencyCases = useMemo(() => nearbyReportsData ?? [], [nearbyReportsData]);
  
  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
              <View style={styles.headerRow}>
                  <View>
                      <Text style={styles.greeting}>{getGreeting()},</Text>
                      <Text style={styles.userName}>{userProfile?.name || user?.name || 'User'}</Text>
                      <View style={styles.headerSubRow}>
                          <Ionicons name="location-sharp" size={16} color={theme.colors.primary} />
                          <Text style={styles.subText}>{address}</Text>
                      </View>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate("NotificationScreen", { notifications: notificationsData })}>
                      <Surface style={styles.headerNotifContainer}>
                           <Ionicons name="notifications" size={24} color={theme.colors.primary} />
                           {unreadNotificationCount > 0 && <Badge style={styles.notifBadge}>{unreadNotificationCount}</Badge>}
                      </Surface>
                  </TouchableOpacity>
              </View>
          </View>
          
          {/* Emergency Cases */}
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚨 Emergency Cases</Text>
              <IconButton icon="refresh" size={20} onPress={() => refetchNearbyReports()} />
          </View>
          {nearbyReportsLoading ? (
              <ActivityIndicator style={{ marginVertical: 40 }} />
          ) : emergencyCases.length > 0 ? (
              <FlatList
                  horizontal
                  data={emergencyCases}
                  renderItem={({ item }) => <MiniRescueCard rescue={item} onPress={() => { setSelectedRescue(item); setShowModal(true); }} />}
                  keyExtractor={(item) => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
              />
          ) : (
              <View style={styles.emptyState}><Text>No emergencies nearby. All safe! 🐾</Text></View>
          )}

          {/* ... Other sections like Map, AdBanner, etc. ... */}
      
      </ScrollView>

      {/* ✅ FIXED: Using react-native-paper Modal which accepts contentContainerStyle */}
      <Modal visible={showModal} onDismiss={() => setShowModal(false)} contentContainerStyle={styles.modalContainer}>
          <ScrollView>
              {selectedRescue && (
                  <StrayRescueCard
                      rescue={selectedRescue}
                      onReportStatusUpdate={handleReportStatusUpdate}
                  />
              )}
          </ScrollView>
          <IconButton icon="close-circle" style={styles.modalCloseButton} size={30} onPress={() => setShowModal(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 16, color: 'gray' },
    userName: { fontSize: 24, fontWeight: 'bold' },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    subText: { marginLeft: 5, color: 'gray' },
    headerNotifContainer: { padding: 8, borderRadius: 20, elevation: 3, backgroundColor: 'white' },
    notifBadge: { position: 'absolute', top: -5, right: -5 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    modalContainer: { backgroundColor: 'white', margin: 20, borderRadius: 15, padding: 10, maxHeight: '90%' },
    modalCloseButton: { position: 'absolute', top: 5, right: 5, zIndex: 1 },
});
