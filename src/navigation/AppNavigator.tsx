import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

import { useAppSelector } from '../core/redux/store';
import { selectIsAuthenticated, selectAccountType } from '../core/redux/slices/authSlice';
import { useCheckOnboardingStatusQuery } from '../api/apiSlice';

// --- Real Screen Imports ---
import LoginScreen from '../screens/auth/LoginScreen';
import UserBottomTabs from './UserBottomTabs'; // ✅ NOW THE REAL COMPONENT
import UploadRescueScreen from '../components/user/camera/UploadRescueScreen'; // For the modal stack

// --- Placeholder Screens (For features not yet built) ---
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

const NGOBottomTabs = () => (
  <View style={styles.container}>
    <Text style={styles.placeholderText}>NGO Main App</Text>
  </View>
);

const LoadingScreen = () => (
  <View style={[styles.container, { backgroundColor: '#fce9d3ff' }]}>
    <ActivityIndicator size="large" color="#8B4513" />
    <Text style={styles.loadingText}>Loading Profile...</Text>
  </View>
);

const Stack = createStackNavigator();

/**
 * This nested stack contains the main user experience. It includes the
 * bottom tabs and any full-screen modals that should appear over them,
 * such as the camera upload screen.
 */
function UserAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={UserBottomTabs} />
      <Stack.Screen 
        name="UploadRescue" 
        component={UploadRescueScreen}
        options={{ 
          // This makes the screen slide up from the bottom like a modal
          cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
          presentation: 'modal',
        }}
      />
      {/* You can add other modal screens here, e.g., a full-screen notification viewer */}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const accountType = useAppSelector(selectAccountType);

  const { data: onboardingStatus, isLoading, isError } = useCheckOnboardingStatusQuery(undefined, {
    skip: !isAuthenticated,
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // **Auth Flow**: User is not logged in.
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : isLoading ? (
          // **Loading Flow**: Checking user's onboarding status.
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : isError ? (
          // **Error Fallback**: If the API fails, send back to login.
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : onboardingStatus?.onboarding_required ? (
          // **Onboarding Flow**: User needs to complete their profile.
          onboardingStatus.account_type === 'ngo' ? (
            <Stack.Screen name="NGOOnboarding" component={NGOOnboardingScreen} />
          ) : (
            <Stack.Screen name="UserOnboarding" component={UserOnboardingScreen} />
          )
        ) : (
          // **Main App Flow**: User is fully authenticated and onboarded.
          accountType === 'ngo' ? (
            <Stack.Screen name="NGOApp" component={NGOBottomTabs} />
          ) : (
            // ✅ DIRECTS TO THE FULLY-FEATURED USER APP STACK
            <Stack.Screen name="UserApp" component={UserAppStack} />
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
