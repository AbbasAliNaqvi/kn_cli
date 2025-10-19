import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons'; // ✅ CHANGED

const MiniRescueCard = ({ rescue, onPress }: { rescue: any, onPress: () => void }) => {
    const theme = useTheme();
    return (
        <TouchableOpacity onPress={onPress}>
            <Card style={styles.card}>
                <Card.Cover source={{ uri: rescue.image_url }} style={styles.cover} />
                <View style={styles.overlay} />
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={2}>{rescue.title || "Emergency Case"}</Text>
                    <Chip icon={() => <Ionicons name="flash" size={14} color="white" />} style={styles.chip}>
                       <Text style={{color: 'white'}}>{rescue.severity}</Text>
                    </Chip>
                </View>
            </Card>
        </TouchableOpacity>
    );
};
const styles = StyleSheet.create({
    card: { width: 180, height: 220, marginRight: 12, borderRadius: 12 },
    cover: { height: 220, borderRadius: 12 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 },
    content: { position: 'absolute', bottom: 10, left: 10, right: 10 },
    title: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
    chip: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.3)' },
});
export default MiniRescueCard;
