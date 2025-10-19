import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FAB, useTheme } from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "react-native-image-picker";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo"; // ✅ IMPORT NetInfoState
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens (Ensure paths are correct)
import UserHomeScreen from "../screens/user/UserHomeScreen";
import ReportsScreen from "../screens/user/ReportsScreen";
import NGOListScreen from "../screens/user/NGOListScreen";
import ProfileScreen from "../screens/user/UserProfileScreen";

const Tab = createBottomTabNavigator();

// --- CONSTANTS ---
const TAB_BAR_COLOR = '#4C7380'; 
const ACTIVE_COLOR = '#FFF'; 
const INACTIVE_ICON_COLOR = '#ccd9c9ff'; 
const ACTIVE_ICON_TEXT_COLOR = TAB_BAR_COLOR; 

const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: "transparent" }} />;

// --- Custom Tab Bar Icon ---
const CustomTabBarIcon = ({
  focused,
  icon,
  iconOutline,
}: {
  focused: boolean;
  icon: string;
  iconOutline?: string;
}) => (
  <View style={[ styles.tabIconContainer, { backgroundColor: focused ? ACTIVE_COLOR : "transparent" } ]}>
    <Ionicons name={focused ? icon : iconOutline || icon} size={22} color={focused ? ACTIVE_ICON_TEXT_COLOR : INACTIVE_ICON_COLOR} />
  </View>
);

// --- Camera FAB Component ---
const CameraFAB = ({ handleCameraPress }: { handleCameraPress: () => void }) => {
  const theme = useTheme();
  return (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraWrapper}>
        <FAB
          icon={() => <Ionicons name="camera" size={24} color={'#FFFFFF'} />}
          onPress={handleCameraPress}
          style={[styles.cameraFab, { backgroundColor: theme.colors.primary }]}
          size="medium"
        />
      </View>
    </View>
  );
};

// --- Custom Tab Bar ---
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const theme = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCameraPress = async () => {
    // 1. Check Network
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert("No Internet Connection", "An internet connection is required to upload a rescue report.");
      return;
    }

    // 2. Request Permissions (Android)
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "This app needs access to your camera to report rescues.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission Denied", "Camera permission is required to continue.");
        return;
      }
    }

    // 3. Launch Camera
    try {
      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.didCancel) {
        console.log("User cancelled camera picker");
      } else if (result.errorCode) {
        Alert.alert("Camera Error", result.errorMessage || "An unknown error occurred.");
      } else if (result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (imageUri) {
          navigation.navigate("UploadRescue", { imageUri });
        } else {
           Alert.alert("Image Error", "Failed to get image URI.");
        }
      }
    } catch (error) {
      console.error("Launch camera error:", error);
      Alert.alert("Error", "Could not open camera.");
    }
  };

  useEffect(() => {
    // ✅ APPLY THE TYPE TO THE STATE OBJECT
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setIsOffline(!netState.isConnected);
    });
    return unsubscribe;
  }, []);

  if (isOffline) {
    return (
      <View style={[ styles.offlineTabBar, { backgroundColor: theme.colors.errorContainer, paddingBottom: insets.bottom } ]}>
        <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.onErrorContainer} />
        <Text style={[styles.offlineText, { color: theme.colors.onErrorContainer }]}>
          No internet connection
        </Text>
      </View>
    );
  }

  return (
    <View style={[ styles.tabBarSafeArea, { paddingBottom: insets.bottom, backgroundColor: 'transparent' } ]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarContent}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCenterFAB = route.name === "FABPlaceholder";

            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
            
            return (
              <TouchableOpacity key={route.key} accessibilityRole="button" onPress={isCenterFAB ? handleCameraPress : onPress} style={styles.tabItem}>
                {isCenterFAB ? <CameraFAB handleCameraPress={handleCameraPress} /> : (typeof options.tabBarIcon === 'function' ? options.tabBarIcon({ focused: isFocused }) : null)}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// --- Main Navigator Component ---
export default function UserBottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tab.Screen name="Home" component={UserHomeScreen} options={{ tabBarIcon: ({ focused }) => <CustomTabBarIcon focused={focused} icon="home" iconOutline="home-outline" /> }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: ({ focused }) => <CustomTabBarIcon focused={focused} icon="heart" iconOutline="heart-outline" /> }} />
      <Tab.Screen name="FABPlaceholder" component={EmptyScreen} options={{ tabBarButton: () => null }}/>
      <Tab.Screen name="NGOs" component={NGOListScreen} options={{ tabBarIcon: ({ focused }) => <CustomTabBarIcon focused={focused} icon="people" iconOutline="people-outline" /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <CustomTabBarIcon focused={focused} icon="person" iconOutline="person-outline" /> }} />
    </Tab.Navigator>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  tabBarSafeArea: { position: "absolute", bottom: 0, left: 0, right: 0 },
  tabBarContainer: { marginHorizontal: 20, backgroundColor: TAB_BAR_COLOR, borderRadius: 25, height: 75, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  tabBarContent: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", height: "100%" },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIconContainer: { alignItems: "center", justifyContent: "center", borderRadius: 25, height: 45, width: 45 },
  cameraContainer: { position: "absolute", top: -35, alignItems: "center", justifyContent: "center" },
  cameraWrapper: { elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, borderRadius: 28 },
  cameraFab: { width: 56, height: 56, borderRadius: 28 },
  offlineTabBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  offlineText: { fontSize: 14, fontWeight: "500" },
});
