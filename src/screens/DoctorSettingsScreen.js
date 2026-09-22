import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DoctorSettingsScreen() {
  const [roomNo, setRoomNo] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);

  const doctorId = auth.currentUser?.uid;

  useEffect(() => {
    if (!doctorId) return;
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'queues', doctorId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomNo(data.roomNo || '');
        setStatus(data.status || 'active');
      }
    };
    fetchSettings();
  }, [doctorId]);

  const handleSave = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'queues', doctorId), { roomNo, status }, { merge: true });
      Alert.alert('සාර්ථකයි!', 'Settings සාර්ථකව Update කරන ලදී.');
    } catch (error) {
      Alert.alert('දෝෂයක්', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doctor Settings</Text>

      <Text style={styles.label}>Room Number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Room 02"
        value={roomNo}
        onChangeText={setRoomNo}
      />

      <Text style={styles.label}>Clinic Status</Text>
      <View style={styles.statusRow}>
        {['active', 'break', 'offline'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, status === s && styles.statusBtnSelected]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.statusText, status === s && styles.statusTextSelected]}>
              {s.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#ffffff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  statusBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  statusBtnSelected: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  statusTextSelected: { color: '#ffffff' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});