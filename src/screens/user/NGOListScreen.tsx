import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Searchbar, Chip, ActivityIndicator, Button, useTheme, Avatar } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons'; // ✅ CHANGED
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetNGOsQuery, useApplyVolunteerToNGOMutation } from '../../api/apiSlice';

export default function NGOListScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const queryParams = useMemo(() => ({
        page,
        page_size: 10,
        search: debouncedSearchQuery || undefined,
    }), [page, debouncedSearchQuery]);

    const { data, error, isLoading, isFetching, refetch } = useGetNGOsQuery(queryParams);
    const [applyToVolunteer, { isLoading: isApplying }] = useApplyVolunteerToNGOMutation();

    const [ngos, setNgos] = useState<any[]>([]);

    useEffect(() => {
        if (data?.results) {
            setNgos(prev => page === 1 ? data.results : [...prev, ...data.results]);
        }
    }, [data, page]);

    const handleApply = useCallback(async (ngoId: string, ngoName: string) => {
        Alert.alert(
            "Confirm Application",
            `Are you sure you want to apply to be a volunteer at ${ngoName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Apply",
                    onPress: async () => {
                        try {
                            await applyToVolunteer({ ngo_id: ngoId, message: "I'd like to volunteer!" }).unwrap();
                            Alert.alert("Success", "Your application has been sent!");
                        } catch (err) {
                            Alert.alert("Error", "Failed to send application.");
                        }
                    }
                }
            ]
        );
    }, [applyToVolunteer]);

    const renderNgoCard = ({ item }: { item: any }) => (
        <Card style={styles.ngoCard} onPress={() => navigation.navigate('NGOProfileView', { ngoId: item.id })}>
            <Card.Title
                title={item.name}
                subtitle={item.location || "Location not specified"}
                left={(props) => <Avatar.Icon {...props} icon="domain" />}
                right={(props) => item.is_verified && <Ionicons {...props} name="checkmark-circle" color="green" size={24} />}
            />
            <Card.Content>
                <Text numberOfLines={2}>{item.description}</Text>
            </Card.Content>
            <Card.Actions>
                <Button onPress={() => handleApply(item.id, item.name)} disabled={isApplying}>Volunteer</Button>
            </Card.Actions>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>NGO Directory</Text>
                <Searchbar
                    placeholder="Search NGOs..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                />
            </View>
            <FlatList
                data={ngos}
                renderItem={renderNgoCard}
                keyExtractor={(item) => item.id.toString()}
                onRefresh={refetch}
                refreshing={isFetching && page === 1}
                onEndReached={() => { if (data?.next) setPage(p => p + 1); }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
                ListEmptyComponent={!isLoading ? <View style={styles.emptyContainer}><Text>No NGOs found.</Text></View> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // Similar styles to ReportsScreen
    container: { flex: 1 },
    header: { padding: 16 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
    searchbar: { borderRadius: 30, elevation: 1 },
    ngoCard: { marginHorizontal: 16, marginBottom: 16 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});
