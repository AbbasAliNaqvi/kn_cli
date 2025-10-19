import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

const AdBanner = () => (
    <Card style={styles.container}>
        <Card.Content>
            <Text style={styles.title}>Support Our Cause</Text>
            <Text>Your donations help us rescue more animals in need.</Text>
        </Card.Content>
    </Card>
);

const styles = StyleSheet.create({
    container: { marginHorizontal: 16, marginVertical: 20, backgroundColor: '#FFF8E1' },
    title: { fontWeight: 'bold', marginBottom: 5 }
});

export default AdBanner;
