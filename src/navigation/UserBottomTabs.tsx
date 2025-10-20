import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { FAB, useTheme } from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "react-native-image-picker";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens
import UserHomeScreen from "../screens/user/UserHomeScreen";
import ReportsScreen from "../screens/user/ReportsScreen";
import NGOListScreen from "../screens/user/NGOListScreen";
import ProfileScreen from "../screens/user/UserProfileScreen";

// --- MAIN TYPES ---
type BottomTabParamList = {
  Home: undefined;
  Reports: undefined;
  FABPlaceholder: undefined;
  NGOs: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_BAR_COLOR = "#4C7380";
const ACTIVE_COLOR = "#FFF";
const INACTIVE_ICON_COLOR = "#ccd9c9ff";
const ACTIVE_ICON_TEXT_COLOR = TAB_BAR_COLOR;

// Small, dense, circular icon size
const TAB_ICON_SIZE = 22;
const TAB_ICON_CONTAINER = 38; // px

const EmptyScreen = () => <View style={{ flex: 1, backgroundColor: "transparent" }} />;

// --- Custom Tab Bar Icon ---
type CustomTabBarIconProps = {
  focused: boolean;
  icon: string;
  iconOutline?: string;
};
const CustomTabBarIcon: React.FC<CustomTabBarIconProps> = ({
  focused,
  icon,
  iconOutline,
}) => (
  <View
    style={[
      styles.tabIconContainer,
      {
        backgroundColor: focused ? ACTIVE_COLOR : "transparent",
        transform: [{ scale: focused ? 1.08 : 1 }],
      },
    ]}
  >
    <Ionicons
      name={focused ? icon : iconOutline || icon}
      size={TAB_ICON_SIZE}
      color={focused ? ACTIVE_ICON_TEXT_COLOR : INACTIVE_ICON_COLOR}
    />
  </View>
);

// --- Camera FAB Component ---
type CameraFABProps = { handleCameraPress: () => void };
const CameraFAB: React.FC<CameraFABProps> = ({ handleCameraPress }) => {
  const theme = useTheme();
  return (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraWrapper}>
        <FAB
          icon={() => <Ionicons name="camera" size={24} color="#FFFFFF" />}
          onPress={handleCameraPress}
          style={[styles.cameraFab, { backgroundColor: theme.colors.primary }]}
          size="medium"
        />
      </View>
    </View>
  );
};

// --- Custom Tab Bar ---
const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme();
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCameraPress = async () => {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert(
        "No Internet Connection",
        "An internet connection is required to upload a rescue report."
      );
      return;
    }

    if (Platform.OS === "android") {
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

    try {
      const result = await ImagePicker.launchCamera({
        mediaType: "photo",
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert("Camera Error", result.errorMessage || "An unknown error occurred.");
        return;
      }

      if (
        result.assets &&
        Array.isArray(result.assets) &&
        result.assets.length > 0 &&
        result.assets[0].uri
      ) {
        navigation.navigate("UploadRescue" as never, { imageUri: result.assets[0].uri } as never);
      } else {
        Alert.alert("Image Error", "Failed to get image URI.");
      }
    } catch (error) {
      console.error("Camera launch error:", error);
      Alert.alert("Error", "Could not open camera.");
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setIsOffline(!netState.isConnected);
    });
    return unsubscribe;
  }, []);

  if (isOffline) {
    return (
      <View
        style={[
          styles.offlineTabBar,
          { backgroundColor: theme.colors.errorContainer, paddingBottom: insets.bottom },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.onErrorContainer} />
        <Text style={[styles.offlineText, { color: theme.colors.onErrorContainer }]}>
          No internet connection
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.tabBarSafeArea, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarContent}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCenterFAB = route.name === "FABPlaceholder";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                onPress={isCenterFAB ? handleCameraPress : onPress}
                style={styles.tabItem}
                activeOpacity={0.8}
              >
                {isCenterFAB ? (
                  <CameraFAB handleCameraPress={handleCameraPress} />
                ) : typeof options.tabBarIcon === "function" ? (
                  options.tabBarIcon({ focused: isFocused, color: "", size: TAB_ICON_SIZE })
                ) : null}
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
      <Tab.Screen
        name="Home"
        component={UserHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon focused={focused} icon="home" iconOutline="home-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon focused={focused} icon="heart" iconOutline="heart-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="FABPlaceholder"
        component={EmptyScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen
        name="NGOs"
        component={NGOListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon focused={focused} icon="people" iconOutline="people-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTabBarIcon focused={focused} icon="person" iconOutline="person-outline" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  tabBarSafeArea: { position: "absolute", bottom: 0, left: 0, right: 0 },
  tabBarContainer: {
    backgroundColor: TAB_BAR_COLOR,
    height: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabBarContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: "100%",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: TAB_ICON_CONTAINER,
    height: TAB_ICON_CONTAINER,
    borderRadius: TAB_ICON_CONTAINER / 2,
    overflow: "hidden",
  },
  cameraContainer: { position: "absolute", top: -32, alignItems: "center", justifyContent: "center" },
  cameraWrapper: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.21,
    shadowRadius: 8,
    borderRadius: 28,
  },
  cameraFab: { width: 56, height: 56, borderRadius: 28 },
  offlineTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  offlineText: { fontSize: 14, fontWeight: "500" },
});
