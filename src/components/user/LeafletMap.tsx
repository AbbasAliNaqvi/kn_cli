// components/user/LeafletMap.tsx - React Native CLI Compatible
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import WebView from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeafletMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  rescueCases: any[]; // Should already be filtered by parent
  radius: string;
  theme: any;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  userLocation,
  rescueCases,
  radius,
  theme,
}) => {
  // Parse radius value
  const getRadiusMeters = (radiusStr: string): number => {
    const num = parseFloat(radiusStr.replace(/[^0-9.]/g, ''));
    return num * 1000; // Convert km to meters
  };

  const getRadiusKm = (radiusStr: string): number => {
    return parseFloat(radiusStr.replace(/[^0-9.]/g, ''));
  };

  // Calculate appropriate zoom level
  const calculateZoomLevel = (radiusKm: number): number => {
    if (radiusKm >= 100) return 6;
    if (radiusKm >= 50) return 7;
    if (radiusKm >= 25) return 8;
    if (radiusKm >= 15) return 9;
    if (radiusKm >= 10) return 10;
    if (radiusKm >= 5) return 11;
    if (radiusKm >= 2) return 12;
    return 13;
  };

  const radiusKm = useMemo(() => getRadiusKm(radius), [radius]);
  const radiusMeters = useMemo(() => getRadiusMeters(radius), [radius]);
  const zoomLevel = useMemo(() => calculateZoomLevel(radiusKm), [radiusKm]);

  const centerLat = userLocation?.latitude || 28.6497956;
  const centerLng = userLocation?.longitude || 77.132018;

  // Calculate map bounds
  const calculateBounds = (lat: number, lng: number, radiusKm: number) => {
    const latDiff = radiusKm / 111;
    const lngDiff = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    return {
      north: lat + latDiff * 1.2, // Add 20% padding
      south: lat - latDiff * 1.2,
      east: lng + lngDiff * 1.2,
      west: lng - lngDiff * 1.2,
    };
  };

  // Escape special characters for JSON embedding
  const escapeHtml = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  };

  const createMapHTML = () => {
    const markers = rescueCases
      .filter(rescue => rescue.latitude && rescue.longitude)
      .map(rescue => {
        const severityColors: Record<
          'High' | 'Critical' | 'Medium' | 'Low',
          string
        > = {
          High: '#FF5252',
          Critical: '#D32F2F',
          Medium: '#FF9800',
          Low: '#4CAF50',
        };

        const severityKey =
          (rescue.severity as 'High' | 'Critical' | 'Medium' | 'Low') ||
          'Medium';
        const severityColor = severityColors[severityKey] || '#FFC107';

        const title = escapeHtml(rescue.title || 'Rescue Case');
        const species = escapeHtml(rescue.species || 'Animal');
        const severity = escapeHtml(rescue.severity || 'Medium');
        const status = escapeHtml(rescue.status || 'Pending');

        return `
        L.marker([${rescue.latitude}, ${rescue.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: ${severityColor}; width: 22px; height: 22px; border-radius: 11px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })
        }).addTo(map).bindPopup(\`
          <div style="min-width: 150px;">
            <b style="font-size: 14px;">${title}</b><br/>
            <span style="font-size: 12px;">${species} - ${severity}</span><br/>
            <span style="font-size: 11px; color: #666;">Status: ${status}</span>
          </div>
        \`);
        `;
      })
      .join('');

    const userMarker = userLocation
      ? `
      L.marker([${centerLat}, ${centerLng}], {
        icon: L.divIcon({
          className: 'user-marker',
          html: '<div style="background-color: ${
            theme.colors.primary || '#00ee34ff'
          }; width: 18px; height: 18px; border-radius: 9px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); position: relative;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background: white; border-radius: 4px;"></div></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map).bindPopup('<b>Your Location</b>');
      
      // Radius circle - always visible and properly aligned
      var radiusCircle = L.circle([${centerLat}, ${centerLng}], {
        color: '${theme.colors.primary || '#6200ee'}',
        fillColor: '${theme.colors.primary || '#6200ee'}',
        fillOpacity: 0.08,
        weight: 2,
        radius: ${radiusMeters}
      }).addTo(map);
      `
      : '';

    const bounds = userLocation
      ? calculateBounds(centerLat, centerLng, radiusKm)
      : null;

    const fitBoundsLogic = bounds
      ? `
      // Always fit to radius circle bounds with padding
      var radiusBounds = L.latLngBounds(
        [${bounds.south}, ${bounds.west}],
        [${bounds.north}, ${bounds.east}]
      );
      
      map.fitBounds(radiusBounds, {
        padding: [30, 30],
        maxZoom: ${Math.min(zoomLevel, 15)},
        animate: true
      });
      `
      : `map.setView([${centerLat}, ${centerLng}], ${zoomLevel});`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Rescue Map</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 250px; }
          .custom-marker, .user-marker { background: transparent; border: none; }
          .leaflet-popup-content-wrapper { border-radius: 8px; }
          .leaflet-popup-content { margin: 8px 10px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            // Initialize map
            var map = L.map('map', {
              center: [${centerLat}, ${centerLng}],
              zoom: ${zoomLevel},
              zoomControl: true,
              scrollWheelZoom: false,
              doubleClickZoom: true,
              touchZoom: true,
              dragging: true
            });
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap',
              maxZoom: 18,
              minZoom: 2
            }).addTo(map);
            
            // Add user location marker and radius circle
            ${userMarker}
            
            // Add rescue case markers
            ${markers}
            
            // Fit bounds to show radius area
            ${fitBoundsLogic}
            
            console.log('Map loaded: ${rescueCases.length} cases within ${radiusKm}km radius');
            
            // Notify React Native that map is loaded
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_LOADED',
                cases: ${rescueCases.length},
                radius: ${radiusKm}
              }));
            }
          } catch (error) {
            console.error('Map error:', error);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_ERROR',
                error: error.message
              }));
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  const htmlContent = useMemo(
    () => createMapHTML(),
    [userLocation, rescueCases, radius, theme],
  );

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Map WebView message:', data);
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        onMessage={handleWebViewMessage}
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        mixedContentMode="always"
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 250,
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: 250,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default LeafletMap;
