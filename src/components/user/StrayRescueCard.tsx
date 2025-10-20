import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';
import { Card, Text, Chip, Divider, Button } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../../theme';
import { RootState } from '../../core/redux/store';
import {
  addAcceptedReport,
  updateReportStatus,
} from '../../core/redux/slices/reportSlice';
import {
  useAcceptReportMutation,
  useUpdateReportStatusMutation,
} from '../../api/apiSlice';

interface StrayRescueCardProps {
  rescue: any;
  theme?: any;
  onReportStatusUpdate?: (reportId: string, newStatus: string) => void;
}

// Color helper
const addAlpha = (color: string, alpha: number): string => {
  if (!color) return 'transparent';
  if (color.startsWith('#')) {
    let r = 0,
      g = 0,
      b = 0;
    if (color.length === 7) {
      r = parseInt(color.substr(1, 2), 16);
      g = parseInt(color.substr(3, 2), 16);
      b = parseInt(color.substr(5, 2), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
};

const StrayRescueCard: React.FC<StrayRescueCardProps> = ({
  rescue,
  theme: propTheme,
  onReportStatusUpdate,
}) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const user = useSelector((state: RootState) => state.persisted?.auth?.user);
  const appwriteUserId = useSelector(
    (state: RootState) => state.persisted?.auth?.appwriteUserId,
  );
  const acceptedReports = useSelector(
    (state: RootState) => state.persisted?.reports?.acceptedReports || [],
  );

  const { theme: contextTheme } = useThemeContext();
  const theme = propTheme || contextTheme;

  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const [acceptReport, { isLoading: isAccepting }] = useAcceptReportMutation();
  const [updateReportStatusMutation, { isLoading: isUpdating }] =
    useUpdateReportStatusMutation();

  // Memoized
  const reportId = useMemo(
    () => rescue.report_id || rescue.id,
    [rescue.report_id, rescue.id],
  );
  const isAcceptedByUser = useMemo(
    () => acceptedReports.includes(reportId),
    [acceptedReports, reportId],
  );

  // Image
  const getImageSource = useCallback(() => {
    if (!rescue.image_url || imageError || showFallback) return null;
    let imageUrl = rescue.image_url;
    if (typeof imageUrl === 'string') {
      imageUrl = imageUrl
        .replace('/v1/v1/', '/v1/')
        .replace(/[?&]mode=admin/, '');
    }
    return { uri: imageUrl };
  }, [rescue.image_url, imageError, showFallback]);
  const renderImageFallback = useCallback(
    () => (
      <View
        style={[
          styles.imageFallback,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Ionicons
          name="camera-outline"
          size={32}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.imageFallbackText}>No Photo</Text>
      </View>
    ),
    [theme.colors],
  );

  // Animal info
  const safeText = useCallback(
    (value: any) => (value ? value.toString() : 'Not mentioned'),
    [],
  );
  const animalCareInfo = useMemo(() => {
    const species = rescue.species || 'Animal';
    const careTips = {
      Dog: [
        '🥛 Fresh water',
        '🍖 Small bland meals',
        '🏠 Quiet rest',
        '🩹 Clean wounds',
        '⚕️ Monitor infection',
      ],
      Cat: [
        '🥛 Water access',
        '🍗 Soft food',
        '📦 Safe hideout',
        '🩹 Gentle cleaning',
        '👁️ Watch dehydration',
      ],
      Bird: [
        '🌡️ Warmth',
        '💧 Shallow water',
        '🌱 Seeds/pellets',
        '📦 Secure container',
        '🔍 Less handling',
      ],
    };
    return careTips[species] || careTips.Dog;
  }, [rescue.species]);

  // Severities/colors
  const getSeverityColor = useCallback(
    (severity: string) => {
      const colors = {
        Critical: '#D32F2F',
        High: theme.colors.warning || '#FF5722',
        Medium: theme.colors.accent || '#FF9800',
        Low: theme.colors.success || '#4CAF50',
      };
      return colors[severity] || theme.colors.outline;
    },
    [theme.colors],
  );

  // Accept handler
  const handleAcceptReport = useCallback(async () => {
    if (isAccepting || isUpdating) return;
    if (!appwriteUserId || !reportId) {
      Alert.alert('Error', 'User or report info missing.');
      return;
    }
    Alert.alert(
      'Accept Rescue Case',
      'Are you sure you want to accept this rescue case?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Case',
          style: 'default',
          onPress: async () => {
            try {
              dispatch(addAcceptedReport(reportId));
              dispatch(
                updateReportStatus({ id: reportId, status: 'in_progress' }),
              );
              if (onReportStatusUpdate)
                onReportStatusUpdate(reportId, 'in_progress');
              await acceptReport({ report_id: reportId }).unwrap();
              Alert.alert('Success!', "You've accepted this case.", [
                {
                  text: 'Track Progress',
                  onPress: () =>
                    navigation.navigate('ReportTracking', { reportId }),
                },
                { text: 'OK' },
              ]);
            } catch (error: any) {
              dispatch(
                updateReportStatus({
                  id: reportId,
                  status: rescue.status || 'pending',
                }),
              );
              Alert.alert(
                'Error',
                error?.data?.message || 'Could not accept this case.',
              );
            }
          },
        },
      ],
    );
  }, [
    isAccepting,
    isUpdating,
    appwriteUserId,
    reportId,
    dispatch,
    rescue.status,
    onReportStatusUpdate,
    acceptReport,
    navigation,
  ]);

  const openImage = useCallback(() => {
    if (rescue.image_url && !imageError)
      Linking.openURL(rescue.image_url).catch(() =>
        Alert.alert('Error', 'Unable to open image.'),
      );
    else Alert.alert('Image not available');
  }, [rescue.image_url, imageError]);

  // Contact
  const handleContactReporter = useCallback(() => {
    const phone = rescue.contact_phone || rescue.reporter_phone;
    const email = rescue.contact_email || rescue.reporter_email;
    if (phone || email) {
      Alert.alert(
        'Contact Reporter',
        'How would you like to contact the reporter?',
        [
          ...(phone
            ? [{ text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) }]
            : []),
          ...(email
            ? [
                {
                  text: 'Email',
                  onPress: () =>
                    Linking.openURL(
                      `mailto:${email}?subject=Regarding Rescue Report: ${rescue.title}`,
                    ),
                },
              ]
            : []),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      Alert.alert('No contact info', 'Reporter details not available.');
    }
  }, [rescue]);

  return (
    <Card style={styles.card}>
      {/* Image and basic info */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={openImage}
          style={styles.imageContainer}
          activeOpacity={0.8}
        >
          {getImageSource() && !showFallback ? (
            <Image
              source={getImageSource()!}
              style={styles.animalImage}
              resizeMode="cover"
              onError={() => {
                setImageError(true);
                setShowFallback(true);
              }}
              onLoad={() => {
                setImageError(false);
                setShowFallback(false);
              }}
            />
          ) : (
            renderImageFallback()
          )}
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText} numberOfLines={1}>
              {safeText(rescue.title)}
            </Text>
          </View>
          <View style={styles.severityContainer}>
            <Chip
              style={[
                styles.severityChip,
                { backgroundColor: getSeverityColor(rescue.severity) },
              ]}
              textStyle={styles.severityChipText}
              compact
              icon={
                rescue.severity === 'Critical'
                  ? () => <Ionicons name="warning" size={14} color="#fff" />
                  : undefined
              }
            >
              {rescue.severity === 'Critical'
                ? '⚠️ CRITICAL'
                : safeText(rescue.severity)}
            </Chip>
          </View>
          <Text style={styles.locationText}>Location available</Text>
          <Text style={styles.dateText}>
            {rescue.created_at
              ? new Date(rescue.created_at).toLocaleDateString()
              : 'Date Unknown'}
          </Text>
        </View>
      </View>
      <Divider />
      {/* Animal Info */}
      <View style={styles.contentSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="paw-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.sectionHeaderText}>Animal Profile</Text>
        </View>
        <View style={styles.chipsContainer}>
          <Chip mode="outlined" compact>
            🐕 {safeText(rescue.species)}
          </Chip>
          {rescue.breed && (
            <Chip mode="outlined" compact>
              🏷️ {safeText(rescue.breed)}
            </Chip>
          )}
          {rescue.age && (
            <Chip mode="outlined" compact>
              Age: {safeText(rescue.age)}
            </Chip>
          )}
        </View>
        <Text style={styles.descriptionText}>
          {safeText(rescue.injury_summary || rescue.description)}
        </Text>
      </View>
      {/* Quick actions */}
      <Divider />
      <View
        style={[
          styles.actionsContainer,
          { paddingBottom: Math.max(insets.bottom, 16), marginBottom: 16 },
        ]}
      >
        {!isAcceptedByUser && rescue.status === 'pending' ? (
          <Button
            mode="contained"
            onPress={handleAcceptReport}
            loading={isAccepting}
            disabled={isAccepting}
            style={styles.acceptButton}
          >
            {isAccepting ? 'Accepting...' : 'Accept This Case'}
          </Button>
        ) : isAcceptedByUser ? (
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() =>
                navigation.navigate('ReportTracking', { reportId })
              }
            >
              Track Progress
            </Button>
            <Button
              mode="contained"
              onPress={handleContactReporter}
              style={styles.contactButton}
            >
              Contact Reporter
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={handleContactReporter}
            style={styles.contactButton}
          >
            Contact Reporter
          </Button>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 16, elevation: 4, marginBottom: 22 },
  headerContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  imageContainer: { borderRadius: 12, overflow: 'hidden', marginRight: 16 },
  animalImage: { width: 80, height: 80, backgroundColor: '#f0f0f0' },
  imageFallback: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  imageFallbackText: { fontSize: 10, textAlign: 'center', marginTop: 4 },
  headerContent: { flex: 1 },
  titleContainer: { marginBottom: 8 },
  titleText: { fontSize: 16, fontWeight: 'bold', lineHeight: 20 },
  severityContainer: { alignItems: 'flex-start', marginBottom: 8 },
  severityChip: { alignSelf: 'flex-start' },
  severityChipText: { fontWeight: 'bold', fontSize: 13 },
  locationText: {
    fontSize: 13,
    marginLeft: 4,
    flex: 1,
    marginBottom: 4,
    color: '#4c7c80',
  },
  dateText: { fontSize: 12, color: '#888' },
  contentSection: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderText: { fontWeight: 'bold', marginLeft: 8 },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  descriptionText: { lineHeight: 20, fontSize: 14, marginBottom: 12 },
  actionsContainer: { padding: 16, gap: 8 },
  acceptButton: { borderRadius: 12 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  contactButton: { borderRadius: 12 },
});

export default StrayRescueCard;
