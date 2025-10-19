import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Central Navigation Component
import AppNavigator from './src/navigation/AppNavigator';

// App-wide services and components
import { store, persistor } from './src/core/redux/store';
import SplashScreenComponent from './src/components/SplashScreen'; // Assuming path

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B4513',
    // You can extend the theme further here
  },
};

export default function App() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  // This is the only logic in App.tsx: managing the splash screen.
  if (!isSplashFinished) {
    return <SplashScreenComponent onFinish={() => setIsSplashFinished(true)} />;
  }

  // Once splash is done, render the main app structure.
  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PersistGate  persistor={persistor}>
          <PaperProvider theme={theme}>
            <StatusBar barStyle="dark-content" backgroundColor="#fce9d3ff" />
            <AppNavigator />
          </PaperProvider>
        </PersistGate>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}
