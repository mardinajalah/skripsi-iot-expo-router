import { Pressable, StyleSheet, Text, View } from 'react-native';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';

export default function Index() {
  const [lampu, setLampu] = useState(false);
  const [saklarAktif, setSaklarAktif] = useState(false);
  const [loading, setLoading] = useState(true);

  // membaca status lampu dan saklar fisik dari ESP32
  useEffect(() => {
    const lampuRef = ref(db, 'kontrol/led_relay_status');
    const saklarRef = ref(db, 'kontrol/saklar');

    const unsubscribeLampu = onValue(lampuRef, (snapshot) => {
      const data = snapshot.val();
      setLampu(data === 1 || data === true || data === 'ON');
      setLoading(false);
    });

    const unsubscribeSaklar = onValue(saklarRef, (snapshot) => {
      const data = snapshot.val();
      setSaklarAktif(data === 'ON' || data === 1 || data === true);
    });

    return () => {
      unsubscribeLampu();
      unsubscribeSaklar();
    };
  }, []);

  // kirim perintah ke ESP32
  const kontrolLampu = async (status: boolean) => {
    if (saklarAktif) {
      return;
    }

    await update(ref(db, 'kontrol'), {
      app: status ? 'ON' : 'OFF',
      led_relay_status: status ? 1 : 0,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Menghubungkan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Home Control</Text>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: lampu ? 'green' : 'gray',
          },
        ]}
      />
      <Text style={styles.status}>Lampu :{lampu ? ' ON' : ' OFF'}</Text>
      <Text style={styles.statusSaklar}>Saklar fisik :{saklarAktif ? ' ON' : ' OFF'}</Text>
      <Pressable
        disabled={saklarAktif}
        style={[styles.button, saklarAktif && styles.buttonDisabled]}
        onPress={() => kontrolLampu(true)}
      >
        <Text style={styles.textButton}>HIDUPKAN</Text>
      </Pressable>
      <Pressable
        disabled={saklarAktif}
        style={[styles.button, saklarAktif && styles.buttonDisabled]}
        onPress={() => kontrolLampu(false)}
      >
        <Text style={styles.textButton}>MATIKAN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  indicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },

  status: {
    fontSize: 20,
    marginBottom: 10,
  },

  statusSaklar: {
    fontSize: 16,
    marginBottom: 30,
  },

  button: {
    width: 200,
    padding: 15,
    backgroundColor: '#2196f3',
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },

  buttonDisabled: {
    backgroundColor: '#9e9e9e',
  },

  textButton: {
    color: 'white',
    fontWeight: 'bold',
  },
});
