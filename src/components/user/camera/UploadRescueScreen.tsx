import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Image, Alert, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import { Text, Button, Card, ActivityIndicator, useTheme, TextInput } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Geolocation from 'react-native-geolocation-service'; // ✅ CHANGED
import ImageResizer from 'react-native-image-resizer'; // ✅ CHANGED
import NetInfo from "@react-native-community/netinfo";
import { RootState } from '../../../core/redux/store';
import { useCreateReportMutation } from '../../../api/apiSlice';

export default function UploadRescueScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { imageUri } = route.params;

    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [description, setDescription] = useState('');
    const [title, setTitle] = useState('Animal Rescue Report');

    const [createReport, { isLoading }] = useCreateReportMutation();

    // ✅ CHANGED: Location fetching logic
    const fetchLocation = useCallback(async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            if (granted !== 'granted') {
                Alert.alert("Permission Denied", "Location is needed to create an accurate report.");
                return;
            }
        }
        Geolocation.getCurrentPosition(
            (position) => setLocation(position.coords),
            (error) => Alert.alert("Location Error", "Could not fetch location."),
            { enableHighAccuracy: true }
        );
    }, []);

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    // ✅ CHANGED: Image compression logic
    const compressImage = async (uri: string) => {
        try {
            const resizedImage = await ImageResizer.createResizedImage(
                uri,
                1024, // maxWidth
                1024, // maxHeight
                'JPEG', // format
                80, // quality
            );
            return resizedImage.uri;
        } catch (error) {
            console.error("Image compression failed:", error);
            return uri; // Return original if fails
        }
    };

    const handleSubmit = async () => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
            Alert.alert("No Internet", "An internet connection is required to submit a report.");
            return;
        }
        if (!location) {
            Alert.alert("Location Required", "Please wait for location to be fetched or enable permissions.");
            return;
        }
        
        setIsSubmitting(true);
        const compressedUri = await compressImage(imageUri);
        
        const formData = new FormData();
        formData.append('image', {
            uri: compressedUri,
            type: 'image/jpeg',
            name: `rescue_${Date.now()}.jpg`,
        });

        const reportData = {
            title,
            description,
            latitude: location.latitude,
            longitude: location.longitude,
            severity: 'Medium', // Default or from user input
        };
        formData.append('data', JSON.stringify(reportData));
        
        try {
            await createReport(formData).unwrap();
            Alert.alert("Success", "Report submitted successfully!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert("Submission Failed", error?.data?.message || "An unknown error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card>
                <Card.Cover source={{ uri: imageUri }} />
                <Card.Title title="New Rescue Report" />
                <Card.Content>
                    <TextInput label="Title" value={title} onChangeText={setTitle} style={styles.input} />
                    <TextInput label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} style={styles.input} />
                    {!location && <ActivityIndicator animating={true} style={{marginTop: 10}} />}
                    {location && <Text style={styles.locationText}>Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
                </Card.Content>
                <Card.Actions>
                    <Button onPress={() => navigation.goBack()} disabled={isSubmitting}>Cancel</Button>
                    <Button onPress={handleSubmit} loading={isSubmitting} disabled={!location || isSubmitting} mode="contained">
                        Submit Report
                    </Button>
                </Card.Actions>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 8 },
    input: { marginBottom: 12 },
    locationText: { marginTop: 10, fontStyle: 'italic', color: 'gray' },
});