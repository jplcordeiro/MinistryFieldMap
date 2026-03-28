import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { AddressStatus, ADDRESS_STATUS_COLORS } from '../lib/types';

interface Props {
  id: string;
  lat: number;
  lng: number;
  status: AddressStatus;
  onPress: () => void;
}

export function AddressPin({ id, lat, lng, status, onPress }: Props) {
  const color = ADDRESS_STATUS_COLORS[status];
  return (
    <Marker
      key={id}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
    >
      <View style={[styles.pin, { backgroundColor: color }]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
