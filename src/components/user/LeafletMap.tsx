import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMap = ({ reports }: { reports: any[] }) => {
    const markers = reports.map(r => ({ lat: r.latitude, lon: r.longitude, title: r.title }));
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Rescue Map</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
            <style>
                body { padding: 0; margin: 0; }
                html, body, #map { height: 100%; width: 100%; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map').setView([${reports[0]?.latitude || 20.5937}, ${reports[0]?.longitude || 78.9629}], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                var markers = ${JSON.stringify(markers)};
                markers.forEach(function(marker) {
                    L.marker([marker.lat, marker.lon]).addTo(map).bindPopup(marker.title);
                });
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { height: 250, borderRadius: 12, overflow: 'hidden', margin: 16 },
    webview: { flex: 1 }
});

export default LeafletMap;
