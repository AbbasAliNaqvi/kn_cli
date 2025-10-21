// AdBanner.tsx
import React from "react";
import { View, Text, Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

const AdBanner = () => {
  // Responsive sizing
  const horizontalMargin = 16;
  const bannerWidth = screenWidth - horizontalMargin * 2;

  return (
    <View
      style={{
        marginVertical: 12,
        marginHorizontal: horizontalMargin,
        alignItems: "flex-start",
        justifyContent: "center",
        width: bannerWidth,
        height: 115,
        backgroundColor: "rgba(255, 255, 240, 1)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ffefd2ff",
        padding: 12,
        flexDirection: "row",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Sponsored Label */}
        <Text
          style={{
            fontSize: 11,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 2,
          }}
        >
          Sponsored Ad
        </Text>

        {/* Headline */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: "#222",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          Amazing Pet Rescue App
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 12,
            color: "#555",
            lineHeight: 16,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          Track rescues, get live updates, and help stray animals with ease.
        </Text>

        {/* CTA */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#1e88e5",
          }}
        >
          Learn More →
        </Text>
      </View>
    </View>
  );
};

export default AdBanner;