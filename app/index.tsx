import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  const [lampu, setLampu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [espOnline, setEspOnline] = useState(false);
  const [lastHeartbeatReceivedAt, setLastHeartbeatReceivedAt] = useState<number>(0);

  // membaca status lampu dan heartbeat dari ESP32
  useEffect(() => {
    const lampuRef = ref(db, 'kontrol/led_relay_status');
    const heartbeatRef = ref(db, 'kontrol/heartbeat');

    const unsubscribeLampu = onValue(lampuRef, (snapshot) => {
      const data = snapshot.val();
      setLampu(data === 1 || data === true || data === 'ON');
      setLoading(false);
    });

    const unsubscribeHeartbeat = onValue(heartbeatRef, (snapshot) => {
      setLastHeartbeatReceivedAt(Date.now());
      setEspOnline(true);
    });

    return () => {
      unsubscribeLampu();
      unsubscribeHeartbeat();
    };
  }, []);

  // Cek secara berkala apakah ESP32 masih mengirim heartbeat
  useEffect(() => {
    if (lastHeartbeatReceivedAt === 0) {
      setEspOnline(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const timeDiff = Date.now() - lastHeartbeatReceivedAt;
      setEspOnline(timeDiff < 12000); // Batas 12 detik
    }, 4000); // Cek setiap 4 detik

    return () => clearInterval(checkInterval);
  }, [lastHeartbeatReceivedAt]);

  // kirim perintah ke ESP32
  const kontrolLampu = async (status: boolean) => {
    if (!espOnline) {
      return;
    }

    await update(ref(db, 'kontrol'), {
      app: status ? 'ON' : 'OFF',
      led_relay_status: status ? 1 : 0,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Menghubungkan ke Smart Home...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>SYSTEM DASHBOARD</Text>
          <Text style={styles.headerTitle}>Smart Hub</Text>
        </View>
        <View style={[styles.connectionBadge, !espOnline && styles.connectionBadgeOffline]}>
          <View style={[styles.badgeDot, !espOnline && styles.badgeDotOffline]} />
          <Text style={[styles.badgeText, !espOnline && styles.badgeTextOffline]}>
            {espOnline ? 'ESP32: Online' : 'ESP32: Offline'}
          </Text>
        </View>
      </View>

      {/* Main Lamp Status Orb Card */}
      <View style={[
        styles.mainCard, 
        !espOnline ? styles.mainCardOffline : (lampu ? styles.mainCardOn : styles.mainCardOff)
      ]}>
        <View style={[
          styles.orbContainer, 
          !espOnline ? styles.orbContainerOffline : (lampu ? styles.orbContainerOn : styles.orbContainerOff)
        ]}>
          <MaterialCommunityIcons 
            name={!espOnline ? "wifi-off" : (lampu ? "lightbulb-on" : "lightbulb-outline")} 
            size={72} 
            color={!espOnline ? "#64748B" : (lampu ? "#F59E0B" : "#94A3B8")} 
          />
        </View>
        <Text style={styles.statusLabel}>STATUS LAMPU UTAMA</Text>
        <Text style={[
          styles.statusValue, 
          !espOnline ? styles.statusValueOffline : (lampu ? styles.statusValueOn : styles.statusValueOff)
        ]}>
          {!espOnline ? "OFFLINE" : (lampu ? "MENYALA" : "PADAM")}
        </Text>
      </View>

      {/* Quick Action / Control Panel */}
      <View style={styles.controlPanel}>
        <Text style={styles.sectionTitle}>KONTROL PERANGKAT</Text>
        
        {!espOnline ? (
          <View style={styles.offlineWarningCard}>
            <MaterialCommunityIcons name="wifi-off" size={24} color="#EF4444" />
            <Text style={styles.offlineWarningText}>
              Alat ESP32 Terputus (Offline). Pastikan alat menyala dan terhubung ke WiFi rumah Anda.
            </Text>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                styles.buttonOff,
                lampu === false && styles.buttonOffActive,
                pressed && styles.buttonPressed
              ]}
              onPress={() => kontrolLampu(false)}
            >
              <MaterialCommunityIcons name="power" size={20} color={lampu === false ? "#F8FAFC" : "#64748B"} />
              <Text style={[
                styles.buttonText, 
                lampu === false ? styles.buttonTextActive : styles.buttonTextInactive
              ]}>
                MATIKAN
              </Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                styles.buttonOn,
                lampu === true && styles.buttonOnActive,
                pressed && styles.buttonPressed
              ]}
              onPress={() => kontrolLampu(true)}
            >
              <MaterialCommunityIcons name="power" size={20} color={lampu === true ? "#F8FAFC" : "#F59E0B"} />
              <Text style={[
                styles.buttonText, 
                lampu === true ? styles.buttonTextActive : styles.buttonTextInactive
              ]}>
                HIDUPKAN
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerSubtitle: {
    color: '#6366F1', // Indigo 500
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  connectionBadgeOffline: {
    borderColor: '#EF4444',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Emerald 500
    marginRight: 6,
  },
  badgeDotOffline: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextOffline: {
    color: '#EF4444',
  },
  mainCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainCardOn: {
    borderColor: '#D97706', // Subtle amber border when ON
  },
  mainCardOff: {
    borderColor: '#334155',
  },
  mainCardOffline: {
    borderColor: '#334155',
    opacity: 0.6,
  },
  orbContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  orbContainerOn: {
    backgroundColor: '#FEF3C7', // Soft amber glow background
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  orbContainerOff: {
    backgroundColor: '#334155',
  },
  orbContainerOffline: {
    backgroundColor: '#1E293B',
  },
  statusLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusValueOn: {
    color: '#F59E0B',
  },
  statusValueOff: {
    color: '#94A3B8',
  },
  statusValueOffline: {
    color: '#64748B',
  },
  controlPanel: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  offlineWarningCard: {
    backgroundColor: '#2D1B1E',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineWarningText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonOff: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    marginRight: 8,
  },
  buttonOffActive: {
    borderColor: '#EF4444',
    backgroundColor: '#271B20',
  },
  buttonOn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    marginLeft: 8,
  },
  buttonOnActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#272015',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonTextActive: {
    color: '#F8FAFC',
  },
  buttonTextInactive: {
    color: '#64748B',
  },
});
