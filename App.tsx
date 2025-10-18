// App.tsx
import React, { useState } from "react";
import { View, StyleSheet, Text, StatusBar } from "react-native";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import SplashScreenComponent from "./src/components/SplashScreen"; // Correct path

// A simple theme for react-native-paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B4513',
  },
};

export default function App() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  // This function will be called by the splash screen when its animations are done
  const handleSplashFinish = () => {
    setIsSplashFinished(true);
  };

  if (!isSplashFinished) {
    return <SplashScreenComponent onFinish={handleSplashFinish} />;
  }

  // Once the splash screen is finished, render your main app content
  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="dark-content" backgroundColor="#fce9d3ff" />
      <View style={styles.mainContainer}>
        <Text style={styles.mainText}>Main Application Screen</Text>
        <Text style={styles.subText}>The splash screen has finished!</Text>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 16,
    marginTop: 8,
    color: '#666',
  },
});
