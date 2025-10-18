// src/components/SplashScreen.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text as RNText } from "react-native";

type SplashScreenProps = {
  onFinish?: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Smooth sequence: delay → fade + move + scale → trigger onFinish
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (onFinish) {
        timeoutRef.current = setTimeout(onFinish, 1200);
      }
    });

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fadeAnim, scaleAnim, translateY, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY }, { scale: scaleAnim }],
          },
        ]}
      >
        <RNText style={[styles.title, styles.karuna]}>Karuna</RNText>
        <RNText style={[styles.title, styles.nidhan]}>Nidhan</RNText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCE9D3",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
    letterSpacing: 3,
    textAlign: "center",
    textShadowColor: "rgba(139, 69, 19, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  karuna: {
    fontFamily: "Samarkan",
    color: "#8B4513",
    textShadowColor: "rgba(255, 129, 39, 0.9)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    fontWeight: "600",
    marginTop: -10,
    letterSpacing: 0,
    fontSize: 98,
  },
  nidhan: {
    fontFamily: "Samarkan",
    color: "#8B4513",
    textShadowColor: "rgba(255, 129, 39, 0.9)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    fontSize: 88,
    fontWeight: "600",
    marginTop: -15,
    letterSpacing: 0,
  },
});
