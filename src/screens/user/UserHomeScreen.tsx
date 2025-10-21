// screens/user/UserHomeScreen.tsx
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
  Modal,
  Portal,
} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '../../core/redux/store';
import {
  setTrackingReports,
  addAcceptedReport,
} from '../../core/redux/slices/reportSlice';

import {
  useGetCurrentUserQuery,
  useGetNotificationHistoryQuery,
  useGetNearbyReportsQuery,
  useAcceptReportMutation,
} from '../../api/apiSlice';

import StrayRescueCard from '../../components/user/StrayRescueCard';
import MiniRescueCard from '../../components/user/MiniRescueCard';
import TrackingReportMiniCard from '../../components/user/TrackingReportMiniCard';
import LeafletMap from '../../components/user/LeafletMap';
import OlaMap from '../../components/user/OlaMap';
import AdBanner from '../../components/AdBanner';

const screenWidth = Dimensions.get('window').width;
const radiusOptions = ['1 km', '2 km', '5 km', '10 km', '25 km', '50 km'];

type RouteParams = {
  newRescue?: any;
  refresh?: boolean;
  showSuccess?: boolean;
};

type RootStackParamList = {
  UserHome: RouteParams;
  NotificationScreen: { notifications: any[] };
  ReportDetails: { reportId: string };
};

export default function UserHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UserHome'>>();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.persisted?.auth?.user);
  const appwriteUserId = useSelector(
    (state: RootState) => state.persisted?.auth?.appwriteUserId,
  );
  const appwriteJWT = useSelector(
    (state: RootState) => state.persisted?.auth?.appwriteJWT,
  );
  const acceptedReports = useSelector(
    (state: RootState) => state.persisted?.reports?.acceptedReports || [],
  );
  const trackingReports = useSelector(
    (state: RootState) => state.persisted?.reports?.trackingReports || [],
  );

  const [radius, setRadius] = useState('1 km');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState('Getting location...');
  const [refreshing, setRefreshing] = useState(false);
  const [mapRefreshing, setMapRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedRescue, setSelectedRescue] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [helpedReports, setHelpedReports] = useState<any[]>([]);
  const [helpedReportsLoading, setHelpedReportsLoading] = useState(false);
  const [helpedReportsError, setHelpedReportsError] = useState<any>(null);

  const {
    data: userProfile,
    isLoading: userProfileLoading,
    refetch: refetchUserProfile,
  } = useGetCurrentUserQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const { data: notificationsData, refetch: refetchNotifications } =
    useGetNotificationHistoryQuery(
      { pageSize: 50 },
      { refetchOnMountOrArgChange: true },
    );

  const nearbyParams = useMemo(() => {
    if (!userLocation) return { skip: true };
    const radiusKm = parseFloat(radius.replace(/[^0-9.]/g, ''));
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      radius: radiusKm,
    };
  }, [userLocation, radius]);

  const {
    data: nearbyReportsData,
    isLoading: nearbyReportsLoading,
    error: nearbyReportsError,
    refetch: refetchNearbyReports,
  } = useGetNearbyReportsQuery(nearbyParams, {
    skip: !userLocation,
    refetchOnMountOrArgChange: true,
  });

  const [acceptReport] = useAcceptReportMutation();

  const fetchHelpedReports = useCallback(async () => {
    if (!appwriteUserId || !appwriteJWT) return;

    setHelpedReportsLoading(true);
    setHelpedReportsError(null);
    try {
      const response = await fetch(
        'https://karunanidhan.app/users/reports/helped/',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${appwriteJWT}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to fetch helped reports`,
        );
      }
      const data = await response.json();
      const reports = Array.isArray(data) ? data : [];
      setHelpedReports(reports);
      dispatch(setTrackingReports(reports));
    } catch (error: any) {
      setHelpedReportsError(error);
      setHelpedReports([]);
      dispatch(setTrackingReports([]));
    } finally {
      setHelpedReportsLoading(false);
    }
  }, [appwriteUserId, appwriteJWT, dispatch]);

  const refetchHelpedReports = useCallback(() => {
    fetchHelpedReports();
  }, [fetchHelpedReports]);

  const rescueCases = useMemo(() => {
    if (!nearbyReportsData) return [];
    return Array.isArray(nearbyReportsData) ? nearbyReportsData : [];
  }, [nearbyReportsData]);

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371;
      const toRad = (deg: number) => deg * (Math.PI / 180);
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  const filteredRescueCases = useMemo(() => {
    let filtered = rescueCases.filter(rescue => {
      const reportId = rescue.report_id || rescue.id;
      return !acceptedReports.includes(reportId);
    });
    if (userLocation) {
      const radiusKm = parseFloat(radius.replace(/[^0-9.]/g, ''));
      filtered = filtered.filter(rescue => {
        if (!rescue.latitude || !rescue.longitude) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          rescue.latitude,
          rescue.longitude,
        );
        return distance <= radiusKm;
      });
    }
    return filtered.sort((a, b) => {
      const urgencyOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const aUrgency =
        urgencyOrder[a.severity as keyof typeof urgencyOrder] ?? 4;
      const bUrgency =
        urgencyOrder[b.severity as keyof typeof urgencyOrder] ?? 4;
      return aUrgency - bUrgency;
    });
  }, [rescueCases, acceptedReports, userLocation, radius, calculateDistance]);

  useEffect(() => {
    if (notificationsData) {
      const processedNotifications = Array.isArray(notificationsData)
        ? notificationsData
        : [];
      setNotifications(processedNotifications);
    }
  }, [notificationsData]);

  const getGreeting = useCallback(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) return 'Good Morning';
    if (currentHour >= 12 && currentHour < 17) return 'Good Afternoon';
    if (currentHour >= 17 && currentHour < 21) return 'Good Evening';
    return 'Good Night';
  }, []);

  const getUserDisplayName = useCallback(() => {
    if (userProfile?.name) return userProfile.name;
    if (user?.name) return user.name;
    return 'User';
  }, [userProfile, user]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Karuna Nidhan needs access to your location to find nearby rescue cases.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  const fetchLocationAndAddress = useCallback(async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setAddress('Location Permission Denied');
        Alert.alert(
          'Location Required',
          'Location access is needed to find nearby rescue cases. Please enable location permissions.',
        );
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        error => {
          console.error('Location error:', error);
          setAddress('Location Error');
          Alert.alert('Location Error', 'Unable to get your current location.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          forceRequestLocation: true,
        },
      );
    } catch (error) {
      console.error('Location error:', error);
      setAddress('Location Error');
      Alert.alert('Location Error', 'Unable to get your current location.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchLocationAndAddress(),
        refetchUserProfile(),
        refetchNotifications(),
        refetchNearbyReports(),
        fetchHelpedReports(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    fetchLocationAndAddress,
    refetchUserProfile,
    refetchNotifications,
    refetchNearbyReports,
    fetchHelpedReports,
  ]);

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('NotificationScreen', { notifications });
  }, [navigation, notifications]);

  const handleTrackingCardPress = useCallback((report: any) => {
    Alert.alert(
      'Track Report',
      `Report: ${report.title || 'Unknown'}\nStatus: ${
        report.status?.toUpperCase() || 'TRACKING'
      }\nSpecies: ${report.species || 'Animal'}\nSeverity: ${
        report.severity || 'Medium'
      }\n\nTracking ID: ${(report.id || report.report_id)
        ?.toString()
        .slice(-8)}`,
      [
        { text: 'OK', style: 'default' },
        {
          text: 'View Details',
          onPress: () => {
            setSelectedRescue(report);
            setShowModal(true);
          },
        },
      ],
    );
  }, []);

  const handleMiniCardPress = useCallback((rescue: any) => {
    setSelectedRescue(rescue);
    setShowModal(true);
  }, []);

  const handleReportStatusUpdate = useCallback(
    async (reportId: string, newStatus: string) => {
      if (newStatus === 'accepted' || newStatus === 'in_progress') {
        try {
          if (!userLocation) {
            Alert.alert(
              'Location Required',
              'Location is needed to accept reports.',
            );
            return;
          }
          await acceptReport({
            report_id: reportId,
            lat: userLocation.latitude,
            lon: userLocation.longitude,
          }).unwrap();

          if (!acceptedReports.includes(reportId)) {
            dispatch(addAcceptedReport(reportId));
          }
          setShowModal(false);
          setSelectedRescue(null);

          setTimeout(() => {
            fetchHelpedReports();
          }, 1000);

          Alert.alert('Success', 'You have accepted this rescue case!');
        } catch (error: any) {
          Alert.alert(
            'Error',
            error?.data?.message ||
              'Failed to accept report. Please try again.',
          );
        }
      }
    },
    [acceptReport, acceptedReports, dispatch, fetchHelpedReports, userLocation],
  );

  const closeModal = useCallback(() => {
    setSelectedRescue(null);
    setShowModal(false);
  }, []);

  const onRadiusSelect = useCallback((newRadius: string) => {
    setRadius(newRadius);
  }, []);

  const renderMiniRescueCard = useCallback(
    ({ item }: { item: any }) => (
      <MiniRescueCard rescue={item} onPress={() => handleMiniCardPress(item)} />
    ),
    [handleMiniCardPress],
  );

  const renderTrackingCard = useCallback(
    ({ item }: { item: any }) => (
      <TrackingReportMiniCard
        report={item}
        onPress={() => handleTrackingCardPress(item)}
      />
    ),
    [handleTrackingCardPress],
  );

  const keyExtractor = useCallback(
    (item: any, index: number) =>
      item.report_id || item.id || `rescue-${index}`,
    [],
  );

  useEffect(() => {
    fetchLocationAndAddress();
  }, [fetchLocationAndAddress]);

  useEffect(() => {
    if (appwriteUserId && appwriteJWT) {
      fetchHelpedReports();
    }
  }, [appwriteUserId, appwriteJWT, fetchHelpedReports]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(netState => {
      setIsOffline(!netState.isConnected);
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.newRescue) {
        if (route.params.showSuccess) {
          Alert.alert(
            'Success! 🎉',
            `Your rescue report "${
              route.params.newRescue.title || 'AI-Generated Report'
            }" was created successfully!`,
            [{ text: 'OK' }],
          );
        }
        navigation.setParams({
          newRescue: undefined,
          refresh: undefined,
          showSuccess: undefined,
        });
      }
      if (route.params?.refresh) {
        onRefresh();
      }
      if (appwriteUserId && appwriteJWT) {
        fetchHelpedReports();
      }
    }, [
      route.params,
      navigation,
      appwriteUserId,
      appwriteJWT,
      fetchHelpedReports,
      onRefresh,
    ]),
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications],
  );
  const badgeCount = useMemo(
    () => unreadNotificationCount || filteredRescueCases.length,
    [unreadNotificationCount, filteredRescueCases.length],
  );

  if (isOffline) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="wifi-outline"
          size={64}
          color={theme.colors.onSurface}
        />
        <Text style={styles.offlineText}>No internet connection</Text>
        <Text style={styles.offlineSubtext}>
          Please check your network settings and try again
        </Text>
        <Button
          mode="contained"
          onPress={() => NetInfo.refresh()}
          style={{ marginTop: 16 }}
        >
          Retry Connection
        </Button>
      </View>
    );
  }

  // Render map: toggle LeafletMap or OlaMap by commenting/uncommenting
  const renderMapSection = () => {
    if (!userLocation) return null;
    return (
      <>
        {/* LeafletMap */}

        <LeafletMap
          userLocation={userLocation}
          rescueCases={filteredRescueCases}
          radius={radius}
          theme={theme}
        />

        {/* OlaMap */}

        {/*         
        <OlaMap
          userLocation={userLocation}
          rescueCases={filteredRescueCases}
          radius={radius}
          theme={theme}
          olaApiKey="   "
        />
        */}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              {userProfileLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.userName, { marginLeft: 8 }]}>
                    Loading...
                  </Text>
                </View>
              ) : (
                <Text style={styles.userName}>{getUserDisplayName()}</Text>
              )}

              <View style={styles.headerSubRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={styles.subText}>{address}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.headerNotifContainer}
              onPress={handleNotificationPress}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.onSurface}
              />
              {badgeCount > 0 && (
                <Badge style={styles.notifBadge} size={20}>
                  {badgeCount}
                </Badge>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Ad Banner */}
        <AdBanner />

        {/* Emergency Cases Section */}
        <Surface style={styles.miniCardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🚨 Emergency Cases{' '}
              {acceptedReports.length > 0 &&
                `(${filteredRescueCases.length} remaining)`}
            </Text>
            <IconButton
              icon="refresh"
              size={20}
              onPress={() => refetchNearbyReports()}
            />
          </View>

          {nearbyReportsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.emptyStateText}>
                Loading emergency cases...
              </Text>
            </View>
          ) : nearbyReportsError ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="alert-circle"
                size={32}
                color={theme.colors.error}
              />
              <Text
                style={[styles.emptyStateText, { color: theme.colors.error }]}
              >
                Error loading cases
              </Text>
              <Button
                mode="contained"
                onPress={() => refetchNearbyReports()}
                style={{ marginTop: 10 }}
              >
                Retry
              </Button>
            </View>
          ) : filteredRescueCases.length > 0 ? (
            <FlatList
              data={filteredRescueCases}
              renderItem={renderMiniRescueCard}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              maxToRenderPerBatch={5}
              windowSize={10}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {acceptedReports.length > 0
                  ? 'All nearby cases are being tracked!'
                  : 'No emergency cases in your area'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {acceptedReports.length > 0
                  ? "Check 'My Tracking Reports' below 📊"
                  : 'All animals are safe! 🐾'}
              </Text>
            </View>
          )}
        </Surface>

        {/* Map Section */}
        <Surface style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.sectionTitle}>📍 Live Rescue Map</Text>
              <Text style={styles.mapSubtitle}>
                {filteredRescueCases.length}{' '}
                {filteredRescueCases.length === 1 ? 'case' : 'cases'} within{' '}
                {radius}
              </Text>
            </View>
            <IconButton
              icon="refresh"
              size={20}
              onPress={() => {
                setMapRefreshing(true);
                refetchNearbyReports().finally(() => setMapRefreshing(false));
              }}
            />
          </View>

          {mapRefreshing ? (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.mapLoadingText}>Refreshing map...</Text>
            </View>
          ) : (
            renderMapSection()
          )}

          {/* ✅ Radius Selection (Updated layout + styles) */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>🎯 Search Radius:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.radiusChipsRow}
            >
              {radiusOptions.map(option => (
                <Chip
                  key={option}
                  selected={radius === option}
                  onPress={() => onRadiusSelect(option)}
                  style={[
                    styles.radiusChip,
                    radius === option && styles.selectedRadiusChip,
                  ]}
                  textStyle={[
                    styles.radiusChipText,
                    radius === option && styles.selectedRadiusChipText,
                  ]}
                >
                  {option}
                </Chip>
              ))}
            </ScrollView>
          </View>
        </Surface>

        {/* Tracking Reports Section */}
        <Surface style={styles.trackingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📊 My Tracking Reports{' '}
              {trackingReports.length > 0 && `(${trackingReports.length})`}
            </Text>
            <IconButton
              icon="refresh"
              size={20}
              onPress={() => refetchHelpedReports()}
            />
          </View>

          {helpedReportsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.emptyStateText}>
                Loading tracking reports...
              </Text>
            </View>
          ) : helpedReportsError ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="alert-circle"
                size={32}
                color={theme.colors.error}
              />
              <Text
                style={[styles.emptyStateText, { color: theme.colors.error }]}
              >
                Error loading tracking reports
              </Text>
              <Button
                mode="contained"
                onPress={() => refetchHelpedReports()}
                style={{ marginTop: 10 }}
              >
                Retry
              </Button>
            </View>
          ) : trackingReports.length > 0 ? (
            <FlatList
              data={trackingReports}
              renderItem={renderTrackingCard}
              keyExtractor={keyExtractor}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              maxToRenderPerBatch={3}
              windowSize={5}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tracking reports yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Accept some emergency cases to start tracking! 📋
              </Text>
            </View>
          )}
        </Surface>

        {/* Ad Banner */}
        <AdBanner />

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <Surface style={styles.notificationSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Recent Updates</Text>
            </View>
            {notifications.slice(0, 3).map((notification, index) => (
              <TouchableOpacity
                key={notification.id || index}
                style={styles.notificationItem}
                onPress={() =>
                  notification.report &&
                  handleMiniCardPress(notification.report)
                }
              >
                <View style={styles.notificationContent}>
                  <View
                    style={[
                      styles.notificationDot,
                      {
                        backgroundColor: notification.is_read
                          ? theme.colors.outline
                          : theme.colors.primary,
                      },
                    ]}
                  />
                  <View style={styles.notificationTextContainer}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.is_read && styles.notificationTitleUnread,
                      ]}
                    >
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Surface>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContentContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rescue Report Details</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeModal}
              style={styles.modalCloseButton}
            />
          </View>
          {selectedRescue && (
            <ScrollView style={styles.modalScrollView}>
              <StrayRescueCard
                rescue={selectedRescue}
                onReportStatusUpdate={handleReportStatusUpdate}
              />
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
}



const styles = StyleSheet.create({
  // [All same styles as before]
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
    paddingBottom: 90,
    marginBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
    radiusChip: {
    backgroundColor: '#f1f1f1',
    marginHorizontal: 4,
    borderRadius: 20,
  },
  selectedRadiusChip: {
    backgroundColor: 'rgba(0, 123, 255, 0.15)', // light tint of primary
  },
  radiusChipText: {
    fontSize: 14,
    color: '#333',
  },
  selectedRadiusChipText: {
    fontWeight: '700',
    color: '#007bff', // highlight text in theme primary
  },
  offlineText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  offlineSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
  },
  header: { paddingBottom: 5, paddingHorizontal: 18, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextContainer: { flex: 1 },
  greeting: { fontSize: 21, color: '#666', fontWeight: '400', fontFamily: 'cursive' },
  userName: {
    fontSize: 28,
    fontWeight: '600',
    fontStyle: 'italic',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  subText: { fontSize: 14, color: '#666', marginLeft: 6, flex: 1 },
  headerNotifContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
  },
  trackingSection: {
    marginTop: 12,
    marginHorizontal: 14,
    marginBottom: 5,
    borderRadius: 16,
    elevation: 1,
    paddingVertical: 12,
    height: 280,
    backgroundColor: '#fff',
  },
    mapSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  miniCardsSection: {
    marginTop: 5,
    marginHorizontal: 14,
    marginBottom: 1,
    borderRadius: 16,
    elevation: 1,
    paddingVertical: 12,
    height: 280,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 9,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    justifyContent: 'center',
    flex: 1,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
 
  mapLoadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapLoadingText: { fontSize: 14, color: '#666', marginTop: 8 },
  radiusContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  radiusChipsContainer: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  notificationSection: {
    margin: 16,
    borderRadius: 16,
    elevation: 1,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
    radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  radiusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  radiusChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  notificationContent: { flexDirection: 'row', alignItems: 'center' },
  notificationDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  notificationTextContainer: { flex: 1 },
  notificationTitle: { fontSize: 14, marginBottom: 2 },
  notificationTitleUnread: { fontWeight: '600' },
  notificationMessage: { fontSize: 12, color: '#666' },
  notificationTime: { fontSize: 10, color: '#999', marginTop: 4 },
  modalContentContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    maxHeight: '90%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalCloseButton: { backgroundColor: '#f0f0f0' },
  modalScrollView: { flex: 1 },
});
