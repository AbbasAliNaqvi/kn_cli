import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator, Card, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListReportsQuery } from '../../api/apiSlice';

interface Report {
  id?: number | string;
  report_id?: string;
  title?: string;
  description?: string;
  image_url?: string;
  status?: string;
  created_at?: string;
  severity?: string;
  species?: string;
}

const PAGE_SIZE = 10;

const getStatusColor = (status: string | undefined, theme: any) => {
  switch (status?.toLowerCase()) {
    case 'pending': return theme.colors.warning || '#FF9800';
    case 'in_progress': return theme.colors.info || '#2196F3';
    case 'resolved':
    case 'completed': return theme.colors.success || '#4CAF50';
    case 'cancelled': return theme.colors.disabled || '#9E9E9E';
    default: return theme.colors.primary;
  }
};

const getSeverityColor = (severity: string | undefined, theme: any) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return theme.colors.error || '#D32F2F';
      case 'high': return '#FF5722';
      case 'medium': return theme.colors.warning || '#FF9800';
      case 'low': return theme.colors.success || '#4CAF50';
      default: return theme.colors.disabled || '#9E9E9E';
    }
};

const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
};


export default function ReportsScreen({ navigation }: { navigation: any }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    
    const [reports, setReports] = useState<Report[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    
    const queryParams = useMemo(() => ({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearchQuery || undefined,
    }), [page, debouncedSearchQuery]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    
    const { data, error, isLoading, isFetching, refetch } = useListReportsQuery(queryParams);

    useEffect(() => {
        if (data) {
            let newReports: Report[] = [];
            if (data.results && Array.isArray(data.results)) { newReports = data.results; } 
            else if (data.data && Array.isArray(data.data)) { newReports = data.data; } 
            else if (Array.isArray(data)) { newReports = data; }

            if (page === 1) { setReports(newReports); } 
            else {
                setReports(prev => {
                    const existingIds = new Set(prev.map(r => r.id || r.report_id));
                    return [...prev, ...newReports.filter(nr => !existingIds.has(nr.id || nr.report_id))];
                });
            }
            setHasMore(!!data.next || newReports.length === PAGE_SIZE);
        }
    }, [data, page]);

    useEffect(() => {
        if (error) {
            Alert.alert("Error", "Could not fetch reports. Please try again.");
            console.error("Fetch Reports Error:", error);
        }
    }, [error]);

    const onRefresh = useCallback(() => {
        setPage(1);
        refetch();
    }, [refetch]);

    const loadMore = () => {
        if (!isFetching && hasMore) { setPage(prev => prev + 1); }
    };
    
    const renderReportCard = ({ item }: { item: Report }) => (
        <TouchableOpacity onPress={() => navigation.navigate('ReportDetails', { reportId: item.id || item.report_id })} activeOpacity={0.8}>
            <Card style={styles.reportCard}>
                <Card.Cover source={{ uri: item.image_url }} />
                <Card.Title 
                    title={item.title || "Rescue Report"}
                    titleStyle={styles.cardTitle}
                    subtitle={getTimeAgo(item.created_at)}
                    subtitleStyle={styles.cardSubtitle}
                    right={(props) => (
                        <Chip 
                            {...props} 
                            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status, theme) }]}
                            textStyle={styles.statusChipText}
                        >
                            {item.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </Chip>
                    )} 
                />
                <Card.Content>
                    <Text style={styles.description} numberOfLines={3}>
                      {item.description || "No description available."}
                    </Text>
                    <View style={styles.infoContainer}>
                        <View style={styles.infoRow}>
                            <Ionicons name="paw-outline" size={16} color={theme.colors.primary} />
                            <Text style={styles.infoText}>{item.species || 'Unknown Species'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="pulse-outline" size={16} color={getSeverityColor(item.severity, theme)} />
                            <Text style={[styles.infoText, {color: getSeverityColor(item.severity, theme), fontWeight: 'bold'}]}>{item.severity || 'Medium'} Severity</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Rescue Feed</Text>
                <Searchbar
                    placeholder="Search reports..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                    iconColor={theme.colors.primary}
                />
            </View>

            <FlatList
                data={reports}
                renderItem={renderReportCard}
                keyExtractor={(item, index) => (item.id || item.report_id || index).toString()}
                contentContainerStyle={styles.listContent}
                onRefresh={onRefresh}
                refreshing={isLoading && page === 1}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetching && page > 1 ? <ActivityIndicator style={{ marginVertical: 32 }} /> : null}
                ListEmptyComponent={
                    !isFetching ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-stacked-outline" size={72} color={theme.colors.onSurfaceDisabled} />
                            <Text style={styles.emptyText}>No Reports Found</Text>
                            <Text style={styles.emptySubText}>When new reports are created, they will appear here.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    title: { 
        fontSize: 32, 
        fontWeight: '900', 
        marginBottom: 16,
        color: '#1c1c1e',
    },
    searchbar: { 
        borderRadius: 12, 
        elevation: 0,
        backgroundColor: '#f3f4f6'
    },
    listContent: { 
        paddingHorizontal: 20, 
        paddingTop: 8,
        paddingBottom: 100 
    },
    reportCard: { 
        marginBottom: 24, 
        elevation: 4,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#777',
    },
    statusChip: { 
        marginRight: 16,
    },
    statusChipText: { 
        color: '#fff', 
        fontWeight: 'bold', 
        fontSize: 10,
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        paddingBottom: 12,
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderColor: '#f0f0f0',
        paddingTop: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        marginLeft: 8,
        fontWeight: '500',
        fontSize: 13,
    },
    emptyContainer: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
        paddingTop: 80,
        paddingBottom: 80,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#424242',
    },
    emptySubText: {
        marginTop: 8,
        fontSize: 15,
        color: '#9E9E9E',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
});