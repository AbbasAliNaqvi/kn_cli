import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Alert, StyleSheet, Platform, PermissionsAndroid, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, IconButton, TextInput, Switch, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons'; // ✅ CHANGED
import * as ImagePicker from 'react-native-image-picker'; // ✅ CHANGED
import Geolocation from 'react-native-geolocation-service'; // ✅ CHANGED
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, RootState } from '../../core/redux/store';
import { logoutUser } from '../../core/redux/slices/authSlice';
import {
  useGetCurrentUserQuery,
  useUpdateUserProfileMutation,
  useUploadAvatarMutation,
} from '../../api/apiSlice';
import { useSelector } from 'react-redux';

export default function UserProfileScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const dispatch = useAppDispatch();
    const { data: userProfile, isLoading, refetch } = useGetCurrentUserQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateUserProfileMutation();
    const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({ name: '', bio: '' });

    useEffect(() => {
        if (userProfile) {
            setEditData({ name: userProfile.name, bio: userProfile.bio || '' });
        }
    }, [userProfile]);

    const handleUpdateProfile = async () => {
        try {
            await updateProfile(editData).unwrap();
            setEditMode(false);
            Alert.alert("Success", "Profile updated successfully.");
        } catch {
            Alert.alert("Error", "Failed to update profile.");
        }
    };
    
    // ✅ CHANGED: Image Picker for RN CLI
    const handleAvatarUpload = async () => {
        const result = await ImagePicker.launchImageLibrary({
            mediaType: 'photo',
            quality: 0.7,
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
            return;
        }

        const file = result.assets[0];
        const formData = new FormData();
        formData.append('avatar', {
            uri: file.uri,
            type: file.type,
            name: file.fileName,
        });

        try {
            await uploadAvatar(formData).unwrap();
            Alert.alert("Success", "Avatar updated!");
        } catch {
            Alert.alert("Error", "Failed to upload avatar.");
        }
    };

    // ✅ CHANGED: Geolocation for RN CLI
    const handleLocationUpdate = async () => {
         if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            if (granted !== 'granted') {
                Alert.alert("Permission Denied", "Location permission is required.");
                return;
            }
        }
        
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await updateProfile({ latitude, longitude }).unwrap();
                    Alert.alert("Success", "Location updated.");
                } catch {
                    Alert.alert("Error", "Failed to update location.");
                }
            },
            (error) => Alert.alert("Error", "Could not get location."),
            { enableHighAccuracy: true }
        );
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => dispatch(logoutUser()) }
        ]);
    };

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={handleAvatarUpload}>
                    <Avatar.Image size={100} source={{ uri: userProfile?.avatar_url || 'https://via.placeholder.com/100' }} />
                    <View style={styles.avatarEditIcon}>
                        <Ionicons name="camera" size={20} color="white" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.name}>{userProfile?.name}</Text>
                <Text style={styles.email}>{userProfile?.email}</Text>
            </View>

            <Card style={styles.card}>
                <Card.Title title="Profile Information" right={() => <Button onPress={() => setEditMode(!editMode)}>{editMode ? "Cancel" : "Edit"}</Button>} />
                <Card.Content>
                    {editMode ? (
                        <>
                            <TextInput label="Name" value={editData.name} onChangeText={(t) => setEditData(p => ({...p, name: t}))} style={styles.input} />
                            <TextInput label="Bio" value={editData.bio} onChangeText={(t) => setEditData(p => ({...p, bio: t}))} style={styles.input} multiline />
                            <Button onPress={handleUpdateProfile} loading={isUpdating} disabled={isUpdating} mode="contained">Save Changes</Button>
                        </>
                    ) : (
                        <>
                            <Text style={styles.bio}>{userProfile?.bio || "No bio set."}</Text>
                            <Button icon="map-marker" onPress={handleLocationUpdate}>Update Location</Button>
                        </>
                    )}
                </Card.Content>
            </Card>

            {/* Other cards for stats, settings, etc. would go here */}

            <Button onPress={handleLogout} style={styles.logoutButton} mode="outlined" textColor={theme.colors.error}>Logout</Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { alignItems: 'center', padding: 20 },
    avatarEditIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
    name: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
    email: { fontSize: 16, color: 'gray' },
    card: { margin: 16 },
    input: { marginBottom: 10 },
    bio: { marginBottom: 10, fontStyle: 'italic', color: 'gray' },
    logoutButton: { margin: 16 }
});
