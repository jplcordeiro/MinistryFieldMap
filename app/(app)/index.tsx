import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Territory, GeoJSONPolygon } from '../../lib/types';
import { TerritoryPolygon } from '../../components/TerritoryPolygon';

function geoJsonToLatLng(polygon: GeoJSONPolygon) {
  return polygon.coordinates[0].map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function MainMapScreen() {
  const router = useRouter();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('territories')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) setTerritories(data as Territory[]);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        testID="map"
        style={styles.map}
        initialRegion={{
          latitude: -23.543,
          longitude: -46.632,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {territories.map((t) => (
          <TerritoryPolygon
            key={t.id}
            coordinates={geoJsonToLatLng(t.coordinates)}
            status={t.status}
            onPress={() => router.push(`/(app)/territory/${t.id}`)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      <TouchableOpacity
        testID="profile-button"
        style={styles.profileButton}
        onPress={() => router.push('/(app)/profile')}
      >
        <Text style={styles.profileButtonText}>Perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  profileButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a5f',
  },
});
