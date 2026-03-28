import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Address, AddressStatus } from '../../../lib/types';
import { AddressPin } from '../../../components/AddressPin';
import { VisitModal } from '../../../components/VisitModal';

export default function TerritoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  useEffect(() => {
    supabase
      .from('addresses')
      .select('*')
      .eq('territory_id', id)
      .then(({ data, error }) => {
        if (!error && data) setAddresses(data as Address[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`addresses:territory_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'addresses', filter: `territory_id=eq.${id}` },
        (payload) => {
          setAddresses((prev) =>
            prev.map((a) => (a.id === payload.new.id ? (payload.new as Address) : a))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleSave = async (status: AddressStatus, notes: string) => {
    if (!selectedAddress) return;
    await supabase
      .from('addresses')
      .update({ status, notes, visited_at: new Date().toISOString() })
      .eq('id', selectedAddress.id);
    setAddresses((prev) =>
      prev.map((a) =>
        a.id === selectedAddress.id ? { ...a, status, notes } : a
      )
    );
    setSelectedAddress(null);
  };

  const initialRegion = addresses.length > 0
    ? {
        latitude: addresses[0].lat,
        longitude: addresses[0].lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : { latitude: -23.543, longitude: -46.632, latitudeDelta: 0.005, longitudeDelta: 0.005 };

  return (
    <View style={styles.container}>
      <MapView testID="map" style={styles.map} initialRegion={initialRegion}>
        {addresses.map((addr) => (
          <AddressPin
            key={addr.id}
            id={addr.id}
            lat={addr.lat}
            lng={addr.lng}
            status={addr.status}
            onPress={() => setSelectedAddress(addr)}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {selectedAddress && (
        <VisitModal
          visible={true}
          address={selectedAddress}
          onClose={() => setSelectedAddress(null)}
          onSave={handleSave}
        />
      )}
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
});
