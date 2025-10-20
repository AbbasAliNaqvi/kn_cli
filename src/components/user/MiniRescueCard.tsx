import React, { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Card, Text, Chip, Badge } from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons"; // RN CLI
import { useThemeContext } from "../../../theme";

// Helper for color alpha
const addAlpha = (color: string, alpha: number): string => {
  if (!color) return "transparent";
  if (color.startsWith("#")) {
    let r = 0, g = 0, b = 0;
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

const MiniRescueCard: React.FC<MiniRescueCardProps> = React.memo(({ rescue, onPress }) => {
  const { theme } = useThemeContext();
  const [imageError, setImageError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const getSeverityColor = useCallback((severity: string) => {
    const colors = {
      Critical: "#D32F2F",
      High: "#FF5722",
      Medium: "#FF9800",
      Low: "#4CAF50",
      Unknown: "#9E9E9E",
    };
    return colors[severity as keyof typeof colors] || theme.colors.outline || "#9E9E9E";
  }, [theme.colors.outline]);

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      pending: "#FF9800",
      in_progress: "#2196F3",
      tracking: "#2196F3",
      resolved: "#4CAF50",
      completed: "#4CAF50",
      cancelled: "#9E9E9E",
    };
    return colors[status as keyof typeof colors] || "#FF9800";
  }, []);

  const imageSource = useMemo(() => {
    if (!rescue.image_url || imageError || showFallback) return null;
    let imageUrl = rescue.image_url;
    if (typeof imageUrl === "string") {
      imageUrl = imageUrl.replace("/v1/v1/", "/v1/").replace(/[?&]mode=admin/, "");
    }
    return { uri: imageUrl };
  }, [rescue.image_url, imageError, showFallback]);

  const safeText = useCallback((value: any, fallback: string = "Not mentioned") => value ? value.toString() : fallback, []);
  const renderImageFallback = useCallback(() => (
    <View
      style={{
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: theme.colors.surfaceVariant || "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: theme.colors.outline || "#e0e0e0",
      }}
    >
      <Ionicons
        name="paw-outline"
        size={24}
        color={theme.colors.onSurfaceVariant || "#666666"}
      />
      <Text
        style={{
          fontSize: 8,
          color: theme.colors.onSurfaceVariant || "#666666",
          textAlign: "center",
          marginTop: 2,
        }}
      >
        No Image
      </Text>
    </View>
  ), [theme.colors]);

  const healthPreview = useMemo(() => {
    if (rescue.injury_summary) return rescue.injury_summary;
    if (rescue.symptoms && Array.isArray(rescue.symptoms) && rescue.symptoms.length > 0) {
      return rescue.symptoms.slice(0, 2).join(", ");
    }
    if (rescue.description) return rescue.description;
    return "Health assessment pending...";
  }, [rescue.injury_summary, rescue.symptoms, rescue.description]);

  const animalInfo = useMemo(() => {
    return `${safeText(rescue.species)} • ${safeText(rescue.age)} • ${safeText(rescue.breed)}`;
  }, [rescue.species, rescue.age, rescue.breed, safeText]);

  const formattedDate = useMemo(() => {
    if (!rescue.created_at) return "Unknown";
    try {
      return new Date(rescue.created_at).toLocaleDateString();
    } catch {
      return "Unknown";
    }
  }, [rescue.created_at]);

  const severityColor = useMemo(() => getSeverityColor(rescue.severity), [rescue.severity, getSeverityColor]);
  const statusColor = useMemo(() => getStatusColor(rescue.status), [rescue.status, getStatusColor]);
  const urgencyColor = useMemo(() => getSeverityColor(rescue.urgency || rescue.severity), [rescue.urgency, rescue.severity, getSeverityColor]);

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

  // RN CLI: Allow parent FlatList to set horizontal margin for best alignment

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={{ width: 260, elevation: 3, backgroundColor: theme.colors.surface, borderRadius: 12 }}>
        {/* Severity bar */}
        <View style={{ height: 4, backgroundColor: severityColor, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />

        <View style={{ flexDirection: "row", padding: 12, paddingBottom: 12 }}>
          {imageSource && !showFallback ? (
            <Image
              source={imageSource}
              style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: "#f0f0f0", marginRight: 12 }}
              resizeMode="cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : renderImageFallback()}

          <View style={{ flex: 1, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: theme.colors.onSurface, flex: 1, marginRight: 8 }} numberOfLines={1}>
                {safeText(rescue.title)}
              </Text>
              <Badge style={{ backgroundColor: severityColor, fontSize: 10 }}>
                {safeText(rescue.severity)}
              </Badge>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2, marginBottom: 4 }} numberOfLines={1}>
              {animalInfo}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurface, marginBottom: 6, fontWeight: "500" }} numberOfLines={2}>
              🩺 {healthPreview}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Chip mode="flat" compact style={{ backgroundColor: addAlpha(statusColor, 0.2), height: 30 }}
                textStyle={{ color: statusColor, fontSize: 10, fontWeight: "bold" }}>
                {rescue.status?.toUpperCase() || "PENDING"}
              </Chip>
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: "500" }}>
                📅 {formattedDate}
              </Text>
            </View>
          </View>
        </View>
        {/* Quick Health Stats Footer */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: theme.colors.surfaceVariant,
          borderTopWidth: 1,
          borderTopColor: (theme.colors.outline || "#e0e0e0") + "30",
        }}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>Urgency</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: urgencyColor }}>
              {safeText(rescue.urgency || rescue.severity, "Low")}
            </Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>AI Score</Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: theme.colors.primary }}>
              {rescue.confidence_score || 7}/10
            </Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>Distance</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="location" size={10} color={theme.colors.tertiary} />
              <Text style={{ fontSize: 10, color: theme.colors.tertiary, marginLeft: 2, fontWeight: "500" }}>
                {rescue.distance ? `${rescue.distance}km` : "Near"}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});

MiniRescueCard.displayName = 'MiniRescueCard';

export default MiniRescueCard;
