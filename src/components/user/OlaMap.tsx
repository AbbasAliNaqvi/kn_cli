// components/user/OlaMap.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 250;
const BORDER_RADIUS = 20;

interface OlaMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  rescueCases: Array<{ latitude: number; longitude: number; title?: string; severity?: string; species?: string; status?: string }>;
  radius: string;
  theme: any;
  olaApiKey: string; // Required API key from Ola Maps
}

const OlaMap: React.FC<OlaMapProps> = ({
  userLocation,
  rescueCases,
  radius,
  theme,
  olaApiKey,
}) => {
  // Convert radius to number in km
  const parseRadiusKm = (radiusStr: string): number => {
    const num = parseFloat(radiusStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 5 : num; // default 5km if invalid
  };
  const radiusKm = useMemo(() => parseRadiusKm(radius), [radius]);

  // User's center position fallback
  const centerLat = userLocation?.latitude || 28.6497956;
  const centerLng = userLocation?.longitude || 77.132018;

  // Generate markers JS for Ola Maps
  const generateMarkersJS = (): string => {
    return rescueCases
      .filter(r => r.latitude && r.longitude)
      .map(r => {
        const cleanTitle = r.title ? r.title.replace(/`|'|"|\\/g, '') : 'Rescue Case';
        const cleanSpecies = r.species ? r.species.replace(/`|'|"|\\/g, '') : 'Animal';
        const cleanSeverity = r.severity ? r.severity.replace(/`|'|"|\\/g, '') : 'Medium';
        const cleanStatus = r.status ? r.status.replace(/`|'|"|\\/g, '') : 'Pending';
        return `
          var marker = new krutrim.maps.Marker({
            position: { lat: ${r.latitude}, lng: ${r.longitude} },
            map: map,
            title: '${cleanTitle}'
          });
          var infoWindow = new krutrim.maps.InfoWindow({
            content: \`
              <div style="font-family:sans-serif; font-size: 13px;">
                <b>${cleanTitle}</b><br/>
                ${cleanSpecies} - Severity: ${cleanSeverity}<br/>
                Status: ${cleanStatus}
              </div>
            \`
          });
          marker.addListener('click', function() {
            infoWindow.open(map, marker);
          });
        `;
      })
      .join('\n');
  };

  // Build full html with Ola SDK and markers
  const htmlContent = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Ola Map</title>
      <style>html, body, #map { height: 100%; margin: 0; padding: 0; border-radius: ${BORDER_RADIUS}px; }</style>
      <script src="https://maps.olakrutrim.com/sdk/js?key=${olaApiKey}"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          try {
            var map = new krutrim.maps.Map(document.getElementById('map'), {
              center: { lat: ${centerLat}, lng: ${centerLng} },
              zoom: 12,
              disableDefaultUI: false,
            });

            // User location marker, customized with color from theme
            var userIconSVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="${theme.colors.primary || '#00e676'}" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/></svg>';
            var userMarker = new krutrim.maps.Marker({
              position: { lat: ${centerLat}, lng: ${centerLng} },
              map: map,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userIconSVG),
                scaledSize: new krutrim.maps.Size(24, 24)
              },
              title: 'Your Location'
            });
            var userInfo = new krutrim.maps.InfoWindow({content: '<b>Your Location</b>'});
            userMarker.addListener('click', function() { userInfo.open(map, userMarker); });

            // Rescue case markers
            ${generateMarkersJS()}

            // Circle for radius around user
            var radiusCircle = new krutrim.maps.Circle({
              strokeColor: '${theme.colors.primary || '#6200ee'}',
              strokeOpacity: 0.5,
              strokeWeight: 2,
              fillColor: '${theme.colors.primary || '#6200ee'}',
              fillOpacity: 0.1,
              map: map,
              center: { lat: ${centerLat}, lng: ${centerLng} },
              radius: ${radiusKm * 1000}
            });

            // Adjust bounds to radius circle
            var bounds = radiusCircle.getBounds();
            map.fitBounds(bounds, { padding: 30 });

            // Notify React Native ready
            if(window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_LOADED',
                cases: ${rescueCases.length},
                radius: ${radiusKm},
              }));
            }
          } catch(e) {
            if(window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_ERROR',
                error: e.message
              }));
            }
          }
        });
      </script>
    </body>
    </html>
  `, [centerLat, centerLng, rescueCases, radiusKm, theme.colors.primary, olaApiKey]);

  if (!userLocation) {
    return (
      <View style={[styles.card, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scalesPageToFit
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('OlaMap WebView message:', data);
          } catch {}
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    alignSelf: 'center',
    height: MAP_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    marginVertical: 12,
  },
  webView: {
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default OlaMap;
