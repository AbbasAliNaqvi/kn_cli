import React, { useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Card, Text, Chip, Badge } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useThemeContext } from '../../../theme';

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

interface MiniRescueCardProps {
  rescue: any;
  onPress: () => void;
}

const MiniRescueCard: React.FC<MiniRescueCardProps> = React.memo(
  ({ rescue, onPress }) => {
    const { theme } = useThemeContext();
    const [imageError, setImageError] = useState(false);
    const [showFallback, setShowFallback] = useState(false);

    // Severity and status colors
    const getSeverityColor = useCallback(
      (severity: string) => {
        const colors = {
          Critical: '#D32F2F',
          High: '#FF5722',
          Medium: '#FF9800',
          Low: '#4CAF50',
          Unknown: '#9E9E9E',
        };
        return (
          colors[severity as keyof typeof colors] ||
          theme.colors.outline ||
          '#9E9E9E'
        );
      },
      [theme.colors.outline],
    );

    const getStatusColor = useCallback((status: string) => {
      const colors = {
        pending: '#FF9800',
        in_progress: '#2196F3',
        tracking: '#2196F3',
        resolved: '#4CAF50',
        completed: '#4CAF50',
        cancelled: '#9E9E9E',
      };
      return colors[status as keyof typeof colors] || '#FF9800';
    }, []);

    const imageSource = useMemo(() => {
      if (!rescue.image_url || imageError || showFallback) return null;
      let imageUrl = rescue.image_url;
      if (typeof imageUrl === 'string') {
        imageUrl = imageUrl
          .replace('/v1/v1/', '/v1/')
          .replace(/[?&]mode=admin/, '');
      }
      return { uri: imageUrl };
    }, [rescue.image_url, imageError, showFallback]);

    const safeText = useCallback(
      (value: any, fallback: string = 'Not mentioned') =>
        value ? value.toString() : fallback,
      [],
    );

    const renderImageFallback = useCallback(
      () => (
        <View
          style={[
            styles.imageFallback,
            {
              backgroundColor: theme.colors.surfaceVariant || '#f0f0f0',
              borderColor: theme.colors.outline || '#e0e0e0',
            },
          ]}
        >
          <Ionicons
            name="paw-outline"
            size={26}
            color={theme.colors.onSurfaceVariant || '#666'}
          />
          <Text
            style={[
              styles.noImageText,
              { color: theme.colors.onSurfaceVariant || '#666' },
            ]}
          >
            No Image
          </Text>
        </View>
      ),
      [theme.colors],
    );

    const healthPreview = useMemo(() => {
      if (rescue.injury_summary) return rescue.injury_summary;
      if (
        rescue.symptoms &&
        Array.isArray(rescue.symptoms) &&
        rescue.symptoms.length > 0
      ) {
        return rescue.symptoms.slice(0, 2).join(', ');
      }
      if (rescue.description) return rescue.description;
      return 'Health assessment pending...';
    }, [rescue.injury_summary, rescue.symptoms, rescue.description]);

    const animalInfo = useMemo(() => {
      return `${safeText(rescue.species)} • ${safeText(
        rescue.age,
      )} • ${safeText(rescue.breed)}`;
    }, [rescue.species, rescue.age, rescue.breed, safeText]);

    const formattedDate = useMemo(() => {
      if (!rescue.created_at) return 'Unknown';
      try {
        return new Date(rescue.created_at).toLocaleDateString();
      } catch {
        return 'Unknown';
      }
    }, [rescue.created_at]);

    const severityColor = useMemo(
      () => getSeverityColor(rescue.severity),
      [rescue.severity, getSeverityColor],
    );
    const statusColor = useMemo(
      () => getStatusColor(rescue.status),
      [rescue.status, getStatusColor],
    );
    const urgencyColor = useMemo(
      () => getSeverityColor(rescue.urgency || rescue.severity),
      [rescue.urgency, rescue.severity, getSeverityColor],
    );

    const handleImageError = useCallback(() => {
      setImageError(true);
      setShowFallback(true);
    }, []);

    const handleImageLoad = useCallback(() => {
      setImageError(false);
      setShowFallback(false);
    }, []);

    const handlePress = useCallback(() => {
      onPress();
    }, [onPress]);

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.75}
        style={styles.touchable}
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          {/* Severity bar */}
          <View
            style={[styles.severityBar, { backgroundColor: severityColor }]}
          />
          <View style={styles.contentRow}>
            {imageSource && !showFallback ? (
              <Image
                source={imageSource}
                style={styles.image}
                resizeMode="cover"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            ) : (
              renderImageFallback()
            )}
            <View style={styles.detailContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {safeText(rescue.title)}
                </Text>
                <Badge
                  style={[styles.badge, { backgroundColor: severityColor }]}
                  size={22}
                >
                  {safeText(rescue.severity)}
                </Badge>
              </View>
              <Text
                style={[
                  styles.animalInfo,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {animalInfo}
              </Text>
              <Text
                style={[
                  styles.healthPreview,
                  { color: theme.colors.onSurface },
                ]}
                numberOfLines={2}
              >
                🩺 {healthPreview}
              </Text>
              <View style={styles.statusRow}>
                <Chip
                  mode="flat"
                  compact
                  style={[
                    styles.statusChip,
                    { backgroundColor: addAlpha(statusColor, 0.3) },
                  ]}
                  textStyle={[styles.statusChipText, { color: statusColor }]}
                >
                  {rescue.status?.toUpperCase() || 'PENDING'}
                </Chip>
                <Text
                  style={[
                    styles.dateText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  📅 {formattedDate}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderTopColor: addAlpha(
                  theme.colors.outline || '#e0e0e0',
                  0.3,
                ),
              },
            ]}
          >
            <View style={styles.footerItem}>
              <Text
                style={[
                  styles.footerLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Urgency
              </Text>
              <Text style={[styles.footerValue, { color: urgencyColor }]}>
                {safeText(rescue.urgency || rescue.severity, 'Low')}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text
                style={[
                  styles.footerLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                AI Score
              </Text>
              <Text
                style={[styles.footerValue, { color: theme.colors.primary }]}
              >
                {rescue.confidence_score || 7}/10
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text
                style={[
                  styles.footerLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Distance
              </Text>
              <View style={styles.distanceRow}>
                <Ionicons
                  name="location"
                  size={12}
                  color={theme.colors.tertiary}
                />
                <Text
                  style={[
                    styles.distanceText,
                    { color: theme.colors.tertiary },
                  ]}
                >
                  {rescue.distance ? `${rescue.distance} km` : 'Near'}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  },
);

MiniRescueCard.displayName = 'MiniRescueCard';

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: 8,
    marginVertical: 6,
  },
  card: {
    width: 270,
    borderRadius: 14,
    elevation: 4,
  },
  severityBar: {
    height: 5,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  contentRow: {
    flexDirection: 'row',
    padding: 14,
    paddingBottom: 12,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginRight: 14,
  },
  imageFallback: {
    width: 70,
    height: 70,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  noImageText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  detailContainer: {
    flex: 1,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    height: 24,
    alignSelf: 'flex-start',
  },
  animalInfo: {
    fontSize: 13,
    marginTop: 2,
  },
  healthPreview: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    alignItems: 'center',
  },
  statusChip: {
    height: 32,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default MiniRescueCard;
