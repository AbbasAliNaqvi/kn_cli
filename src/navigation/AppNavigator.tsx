import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAppSelector } from '../core/redux/store';
import { selectIsAuthenticated, selectAccountType } from '../core/redux/slices/authSlice';
import { useCheckOnboardingStatusQuery } from '../api/apiSlice';

// --- Screen Imports ---
import LoginScreen from '../screens/auth/LoginScreen';

// --- Placeholder Screens (to be replaced with your actual components) ---
const UserOnboardingScreen = () => (
  <View style={styles.container}>
    <Text style={styles.placeholderText}>User Onboarding Screen</Text>
  </View>
);

const NGOOnboardingScreen = () => (
  <View style={styles.container}>
    <Text style={styles.placeholderText}>NGO Onboarding Screen</Text>
  </View>
);

const UserBottomTabs = () => (
  <View style={styles.container}>
    <Text style={styles.placeholderText}>User Main App (Bottom Tabs)</Text>
  </View>
);

const NGOBottomTabs = () => (
  <View style={styles.container}>
    <Text style={styles.placeholderText}>NGO Main App (Bottom Tabs)</Text>
  </View>
);

const LoadingScreen = () => (
  <View style={[styles.container, { backgroundColor: '#fce9d3ff' }]}>
    <ActivityIndicator size="large" color="#8B4513" />
    <Text style={styles.loadingText}>Loading Profile...</Text>
  </View>
);

const Stack = createStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const accountType = useAppSelector(selectAccountType);

  // This RTK Query hook checks if the logged-in user needs onboarding.
  // We skip this API call if the user is not authenticated.
  const { data: onboardingStatus, isLoading, isError } = useCheckOnboardingStatusQuery(undefined, {
    skip: !isAuthenticated,
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // **Auth Flow**: User is not logged in. Show the login screen.
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : isLoading ? (
          // **Loading Flow**: User is logged in, but we are checking their onboarding status.
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : isError ? (
          // **Error Fallback**: If checking onboarding fails, kick user back to login.
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : onboardingStatus?.onboarding_required ? (
          // **Onboarding Flow**: User is authenticated but needs to complete their profile.
          // Show a different onboarding screen based on their account type.
          onboardingStatus.account_type === 'ngo' ? (
            <Stack.Screen name="NGOOnboarding" component={NGOOnboardingScreen} />
          ) : (
            <Stack.Screen name="UserOnboarding" component={UserOnboardingScreen} />
          )
        ) : (
          // **Main App Flow**: User is authenticated and fully onboarded.
          // Show the correct main app interface based on their account type.
          accountType === 'ngo' ? (
            <Stack.Screen name="NGOApp" component={NGOBottomTabs} />
          ) : (
            <Stack.Screen name="UserApp" component={UserBottomTabs} />
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
    color: '#8B4513',
  },
});
