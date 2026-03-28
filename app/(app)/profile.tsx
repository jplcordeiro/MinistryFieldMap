import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? 'Usuário';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutBtnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  email: { fontSize: 16, color: '#111827', fontWeight: '500' },
  logoutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
