import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  TextInput,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import ImageResizer from 'react-native-image-resizer';
import NetInfo from '@react-native-community/netinfo';
import { useCreateReportMutation } from '../../../api/apiSlice';

export default function UploadRescueScreen() {
  // Navigation aur route se parameters nikalne ke liye hooks.
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri } = route.params; // Jo image pichli screen se aayi hai.

  // Screen ki state manage karne ke liye useState hooks.
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null); // Location store karne ke liye.
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state ke liye.
  const [description, setDescription] = useState(''); // Description text input ke liye.
  const [title, setTitle] = useState('Animal Rescue Report'); // Title text input ke liye.

  // RTK Query se API call ke liye mutation hook.
  const [createReport] = useCreateReportMutation();

  // Ye function user ki current location fetch karega.
  const fetchLocation = useCallback(async () => {
    try {
      // Android ke liye location permission maang rahe hain.
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Report banane ke liye location permission zaroori hai.',
          );
          return;
        }
      }
      // Permission milne ke baad, current position get kar rahe hain.
      Geolocation.getCurrentPosition(
        position => setLocation(position.coords), // Location milne par state update hogi.
        error => Alert.alert('Location Error', 'Location nahi mil paayi.'),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (err) {
      // Agar koi error aaye toh console pe dikha do.
      console.warn(err);
    }
  }, []);

  // Jab bhi component load hoga, ye useEffect location fetch karega.
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Ye function image ko chhota (compress) karega upload se pehle.
  const compressImage = async (uri: string) => {
    try {
      // yahan react-native-image-resizer ka use kiya hai.
      const resizedImage = await ImageResizer.createResizedImage(
        uri, 1024, 1024, 'JPEG', 80,
      );
      return resizedImage.uri;
    } catch (error) {
      console.error('Image compression fail ho gayi:', error);
      return uri; // Agar fail ho, toh original image hi bhej do.
    }
  };

  // Jab user "Submit Report" button pe click karega, ye function chalega.
  const handleSubmit = async () => {
    // Pehle internet connection check kar rahe hain.
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert('No Internet', 'Internet connection zaroori hai.');
      return;
    }
    // Check kar rahe hain ki location mili ya nahi.
    if (!location) {
      Alert.alert('Location Required', 'Location fetch hone ka wait karein.');
      return;
    }

    // Loading state true kar di, taaki user dubara click na kar paaye.
    setIsSubmitting(true);
    
    try {
      // Image ko compress karwaya.
      const compressedUri = await compressImage(imageUri);
      
      // FormData object banaya API pe bhejne ke liye.
      const formData = new FormData();

      // 1. Image file ko 'image' key ke saath append kiya.
      formData.append('image', {
        uri: compressedUri,
        type: 'image/jpeg',
        name: `rescue_${Date.now()}.jpg`,
      });

      // 2. Report ka baaki data (bina location ke) 'data' key me daala.
      const reportData = {
        title,
        description,
        severity: 'Medium',
        species: 'Unknown',
      };
      formData.append('data', JSON.stringify(reportData));

      // 3. Location data ko alag se 'location' key me daala. Backend yahi expect kar raha hai.
      const locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      };
      formData.append('location', JSON.stringify(locationData));
      
      // Yahan maine Console karwaya, check karne ke liye ki data sahi jaa raha hai.
      console.log('FormData API pe bhej rahe hain...');
      
      // Yahan se API call hui. createReport mutation ko call kiya formData ke saath.
      await createReport(formData).unwrap();
      
      // Agar API call successful hui, toh success message dikhao.
      Alert.alert('Success', 'Report successfully submit ho gaya!', [
        { text: 'OK', onPress: () => navigation.goBack() }, // OK pe click karke pichli screen pe chale jao.
      ]);

    } catch (error: any) {
      // Agar API call me koi error aaya, toh use console pe dikhao aur user ko alert do.
      console.error('Submission Fail ho gaya:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Submission Failed',
        error?.data?.error || error?.data?.message || 'Koi anjaan error aayi hai.',
      );
    } finally {
      // Chahe success ho ya error, loading state ko false kar do.
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Cover source={{ uri: imageUri }} />
        <Card.Title title="New Rescue Report" />
        <Card.Content>
          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.input}
            mode="outlined"
          />

          {/* Jab tak location nahi milti, loading indicator dikhao. */}
          {!location && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator animating={true} style={{ marginRight: 8 }} />
              <Text>Fetching location...</Text>
            </View>
          )}

          {/* Location milne par coordinates dikhao. */}
          {location && (
            <Text style={styles.locationText}>
              📍 Location Acquired: {location.latitude.toFixed(4)},{' '}
              {location.longitude.toFixed(4)}
            </Text>
          )}
        </Card.Content>

        <Card.Actions style={styles.actions}>
          <Button onPress={() => navigation.goBack()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!location || isSubmitting}
            mode="contained"
            icon="send"
          >
            Submit Report
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8, backgroundColor: '#f5f5f5' },
  input: { marginBottom: 12 },
  locationText: {
    marginTop: 10,
    fontStyle: 'italic',
    color: 'gray',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  actions: {
    justifyContent: 'flex-end',
    padding: 8,
  },
});