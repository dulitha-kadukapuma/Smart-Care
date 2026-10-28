import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { sendMedicineReadySMS } from '../services/smsService';

export default function PharmacyScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    textMain: isDarkMode ? '#f8fafc' : '#0f172a',
    textSub: isDarkMode ? '#94a3b8' : '#64748b',
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    highlight: isDarkMode ? '#38bdf8' : '#0284c7',
  };

  useEffect(() => {
    const q = query(collection(db, 'prescriptions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPrescriptions(list);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsReady = async (prescriptionId, patientName, patientPhone) => {
    try {
      setUpdatingId(prescriptionId);
      const prescriptionRef = doc(db, 'prescriptions', prescriptionId);
      await updateDoc(prescriptionRef, { 
        status: 'ready',
        readyAt: serverTimestamp() 
      });

      // Send SMS via Notify.lk
      if (patientPhone) {
        sendMedicineReadySMS({
          phone: patientPhone,
          patientName: patientName || 'Patient',
        }).catch((err) => console.log('Notify.lk Pharmacy SMS error:', err));
      }

      Alert.alert(
        "සාර්ථකයි",
        `${patientName} රෝගියාගේ ඖෂධ සූදානම් බව දන්වන ලදී.${patientPhone ? '\nSMS පණිවිඩයක් යවන ලදී.' : ''}`
      );
    } catch (error) {
      Alert.alert("දෝෂයක් මතු විය", "යාවත්කාලීන කිරීමට නොහැකි විය.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderMedicines = (medicines) => {
    if (!medicines) return <Text style={{ color: theme.textSub }}>ඖෂධ සඳහන් කර නැත</Text>;
    if (typeof medicines === 'string') return <Text style={{ color: theme.textMain, fontSize: 15, lineHeight: 22 }}>{medicines}</Text>;
    if (Array.isArray(medicines)) {
      return medicines.map((med, idx) => (
        <Text key={idx} style={{ color: theme.textMain, fontSize: 15, lineHeight: 22 }}>
          • {typeof med === 'object' ? `${med.name || ''} - ${med.dosage || ''}` : med}
        </Text>
      ));
    }
    return <Text style={{ color: theme.textMain }}>{JSON.stringify(medicines)}</Text>;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.highlight} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.headerBar, { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.headerTitleText, { color: theme.highlight }]}>Pharmacy Portal</Text>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={{ padding: 5 }}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? "#fbbf24" : "#475569"} />
        </TouchableOpacity>
      </View>

      {prescriptions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="medkit-outline" size={60} color={theme.textSub} />
          <Text style={{ color: theme.textSub, marginTop: 10 }}>දැනට නිකුත් කළ යුතු බෙහෙත් වට්ටෝරු නොමැත.</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isReady = item.status === 'ready';
            const isUpdating = updatingId === item.id;

            return (
              <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: isReady ? '#16a34a' : theme.borderColor, borderWidth: isReady ? 2 : 1 }]}>
                <View style={[styles.cardHeader, { borderBottomColor: theme.borderColor }]}>
                  <View>
                    <Text style={[styles.patientName, { color: theme.highlight }]}>{item.patientName || 'Patient'}</Text>
                    {item.patientPhone ? (
                      <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>📱 {item.patientPhone}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, color: theme.textSub }}>Dr. {item.doctorName || 'Doctor'}</Text>
                </View>

                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSub, marginBottom: 4 }}>අවශ්‍ය ඖෂධ:</Text>
                {renderMedicines(item.medicines)}

                {item.notes ? (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSub, marginTop: 8, marginBottom: 2 }}>සටහන්:</Text>
                    <Text style={{ fontSize: 14, color: theme.textSub, fontStyle: 'italic', marginBottom: 10 }}>{item.notes}</Text>
                  </>
                ) : null}

                <View style={[styles.cardFooter, { borderTopColor: theme.borderColor }]}>
                  <Text style={{ fontSize: 11, color: theme.textSub }}>
                    {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleString() : ''}
                  </Text>

                  <TouchableOpacity 
                    style={[styles.readyButton, isReady ? { backgroundColor: '#16a34a' } : { backgroundColor: theme.highlight }]}
                    onPress={() => handleMarkAsReady(item.id, item.patientName, item.patientPhone)}
                    disabled={isReady || isUpdating}
                  >
                    {isUpdating ? <ActivityIndicator size="small" color="#ffffff" /> : (
                      <>
                        <Ionicons name={isReady ? "checkmark-circle" : "notifications-outline"} size={16} color="#ffffff" />
                        <Text style={styles.readyButtonText}>{isReady ? "Medicines Ready" : "Mark as Ready"}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitleText: { fontSize: 16, fontWeight: 'bold' },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 10 },
  patientName: { fontSize: 16, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, paddingTop: 10 },
  readyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  readyButtonText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }
});