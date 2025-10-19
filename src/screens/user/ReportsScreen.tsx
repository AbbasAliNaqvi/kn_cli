import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, Modal, TouchableOpacity, StyleSheet, Dimensions, Alert, ScrollView } from 'react-native';
import { Text, Button, Searchbar, IconButton, Chip, Divider, Surface, ActivityIndicator, Card, useTheme } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient'; // ✅ CHANGED
import Ionicons from 'react-native-vector-icons/Ionicons'; // ✅ CHANGED
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../../core/redux/store';
import { useListReportsQuery } from '../../api/apiSlice';

const PAGE_SIZE = 10;

export default function ReportsScreen({ navigation }: { navigation: any }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    
    const [reports, setReports] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [filterBy, setFilterBy] = useState('all');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset page on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    
    const queryParams = useMemo(() => ({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearchQuery || undefined,
        status: filterBy === 'all' ? undefined : filterBy,
    }), [page, debouncedSearchQuery, filterBy]);

    const { data, error, isLoading, isFetching, refetch } = useListReportsQuery(queryParams);

    useEffect(() => {
        if (data) {
            const newReports = data.results || [];
            if (page === 1) {
                setReports(newReports);
            } else {
                // Prevent duplicates
                setReports(prev => [...prev, ...newReports.filter(nr => !prev.some(pr => pr.id === nr.id))]);
            }
            setHasMore(!!data.next);
        }
    }, [data, page]);

    const onRefresh = useCallback(() => {
        setPage(1);
        refetch();
    }, [refetch]);

    const loadMore = () => {
        if (!isFetching && hasMore) {
            setPage(prev => prev + 1);
        }
    };
    
    const renderReportCard = ({ item }: { item: any }) => (
        <Card style={styles.reportCard}>
            <Card.Cover source={{ uri: item.image_url }} />
            <Card.Title title={item.title || "Rescue Report"} subtitle={`Status: ${item.status}`} />
            <Card.Content>
                <Text numberOfLines={2}>{item.description || "No description."}</Text>
            </Card.Content>
            <Card.Actions>
                <Button onPress={() => Alert.alert("Details", "Navigate to report details screen.")}>View</Button>
            </Card.Actions>
        </Card>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Reports</Text>
                <Searchbar
                    placeholder="Search reports..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                />
            </View>
            <FlatList
                data={reports}
                renderItem={renderReportCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                onRefresh={onRefresh}
                refreshing={isFetching && page === 1}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
                ListEmptyComponent={!isLoading && !isFetching ? <View style={styles.emptyContainer}><Text>No reports found.</Text></View> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
    searchbar: { borderRadius: 30, elevation: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },
    reportCard: { marginBottom: 16 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
});
