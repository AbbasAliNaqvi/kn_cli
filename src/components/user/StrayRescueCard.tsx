import React, { useState, useCallback, useMemo } from 'react';
import { View, Image, TouchableOpacity, Linking, Alert, StyleSheet, Platform, PermissionsAndroid } from 'react-native';
import { Card, Text, Chip, Button, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons'; // ✅ CHANGED
import Geolocation from 'react-native-geolocation-service'; // ✅ CHANGED
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../core/redux/store';
import { addAcceptedReport, updateReportStatus } from '../../core/redux/slices/reportSlice';
import { useAcceptReportMutation, useUpdateReportStatusMutation } from '../../api/apiSlice';

const StrayRescueCard: React.FC<any> = ({ rescue, onReportStatusUpdate }) => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const [acceptReport, { isLoading: isAccepting }] = useAcceptReportMutation();
    const acceptedReports = useSelector((state: RootState) => state.reports.acceptedReports || []);
    const reportId = useMemo(() => rescue.report_id || rescue.id, [rescue]);
    const isAcceptedByUser = useMemo(() => acceptedReports.includes(reportId), [acceptedReports, reportId]);

    const handleAcceptReport = useCallback(async () => {
        Alert.alert(
            "Accept Rescue Case",
            "Are you sure you want to accept this rescue case?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Accept Case",
                    onPress: async () => {
                        if (Platform.OS === 'android') {
                            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                                Alert.alert("Permission Denied", "Location permission is needed to accept a report.");
                                return;
                            }
                        }
                        Geolocation.getCurrentPosition(
                            (position) => {
                                onReportStatusUpdate(reportId, 'accepted');
                            },
                            (error) => Alert.alert("Location Error", "Could not get your location to accept the report."),
                            { enableHighAccuracy: true }
                        );
                    }
                }
            ]
        );
    }, [reportId, onReportStatusUpdate]);

    return (
        <Card style={styles.card}>
            <Card.Cover source={{ uri: rescue.image_url }} />
            <Card.Title title={rescue.title || "Rescue Report"} subtitle={`Severity: ${rescue.severity}`} />
            <Card.Content>
                <Text>{rescue.description || "No description provided."}</Text>
            </Card.Content>
            <Card.Actions>
                {!isAcceptedByUser && rescue.status === 'pending' && (
                    <Button onPress={handleAcceptReport} disabled={isAccepting} loading={isAccepting}>
                        Accept This Case
                    </Button>
                )}
                 {isAcceptedByUser && (
                     <Button onPress={() => navigation.navigate("ReportTracking", { reportId })}>
                        Track Progress
                    </Button>
                 )}
            </Card.Actions>
        </Card>
    );
};
const styles = StyleSheet.create({ card: { margin: 16 } }); // Add more styles as needed
export default StrayRescueCard;
