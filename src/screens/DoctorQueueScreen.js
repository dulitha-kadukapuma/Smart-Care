import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  updateDoc, 
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { sendNowServingSMS } from '../services/smsService';

export default function DoctorQueueScreen() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [queueInfo, setQueueInfo] = useState(null);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [loadingNext, setLoadingNext] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) setFetching(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const doctorId = currentUser?.uid;

  useEffect(() => {
    if (!doctorId) return;

    const queueDocRef = doc(db, 'queues', doctorId);
    const unsubscribeQueue = onSnapshot(queueDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setQueueInfo(docSnap.data());
      } else {
        setQueueInfo({
          doctorName: currentUser?.displayName || 'Dr. Doctor',
          roomNo: 'Room 01',
          currentServingToken: 0,
          currentPatientName: '',
          status: 'active'
        });
      }
      setFetching(false);
    });

    return () => unsubscribeQueue();
  }, [doctorId, currentUser]);

  useEffect(() => {
    if (!doctorId) return;

    const tokensRef = collection(db, 'tokens');
    const q = query(
      tokensRef,
      where('doctorId', '==', doctorId),
      where('status', '==', 'waiting')
    );

    const unsubscribeTokens = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      list.sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
      setWaitingPatients(list);
    });

    return () => unsubscribeTokens();
  }, [doctorId]);

  const handleCallNext = async () => {
    if (!doctorId) return;

    if (waitingPatients.length === 0) {
      Alert.alert("දැනුම්දීමයි", "පෝලිමේ තවත් රෝගීන් නොමැත.");
      return;
    }

    setLoadingNext(true);

    try {
      const nextPatient = waitingPatients[0];

      // Mark previously serving patient(s) as completed
      const servingQuery = query(
        collection(db, 'tokens'),
        where('doctorId', '==', doctorId),
        where('status', '==', 'serving')
      );
      const servingSnap = await getDocs(servingQuery);
      const completePromises = servingSnap.docs.map((docSnap) =>
        updateDoc(doc(db, 'tokens', docSnap.id), { status: 'completed' })
      );
      await Promise.all(completePromises);

      const queueDocRef = doc(db, 'queues', doctorId);
      await setDoc(queueDocRef, {
        currentServingToken: nextPatient.tokenNumber,
        currentPatientName: nextPatient.patientName,
        doctorName: queueInfo?.doctorName || 'Dr. Doctor',
        roomNo: queueInfo?.roomNo || 'Room 01',
        status: queueInfo?.status || 'active'
      }, { merge: true });

      const tokenDocRef = doc(db, 'tokens', nextPatient.id);
      await updateDoc(tokenDocRef, { status: 'serving' });

      // Send SMS via Notify.lk
      if (nextPatient.patientPhone) {
        sendNowServingSMS({
          phone: nextPatient.patientPhone,
          patientName: nextPatient.patientName,
          tokenNumber: nextPatient.tokenNumber,
          doctorName: queueInfo?.doctorName || 'Dr. Doctor',
          roomNo: queueInfo?.roomNo || 'Room 01',
        }).catch((err) => console.log('Notify.lk Now Serving SMS error:', err));
      }

    } catch (error) {
      Alert.alert("Error", "Call Next Patient අසාර්ථක විය: " + error.message);
    } finally {
      setLoadingNext(false);
    }
  };

  const handleResetQueue = () => {
    Alert.alert(
      "Queue එක Reset කරන්නද?",
      "මෙමගින් අද දිනට අදාළ සියලුම Tokens මකා දැමෙන අතර Current Token එක 0 බවට පත් වේ.",
      [
        { text: "අවලංගු කරන්න", style: "cancel" },
        {
          text: "ඔව්, Reset කරන්න",
          style: "destructive",
          onPress: async () => {
            if (!doctorId) return;
            setResetting(true);
            try {
              const q = query(collection(db, 'tokens'), where('doctorId', '==', doctorId));
              const querySnapshot = await getDocs(q);

              const deletePromises = querySnapshot.docs.map((docSnap) =>
                deleteDoc(doc(db, 'tokens', docSnap.id))
              );
              await Promise.all(deletePromises);

              const queueRef = doc(db, 'queues', doctorId);
              await setDoc(queueRef, {
                currentServingToken: 0,
                currentPatientName: ''
              }, { merge: true });

              Alert.alert("සාර්ථකයි!", "Queue එක සාර්ථකව Reset කරන ලදී.");
            } catch (error) {
              Alert.alert("දෝෂයක්", "Queue Reset කිරීමට නොහැකි විය: " + error.message);
            } finally {
              setResetting(false);
            }
          }
        }
      ]
    );
  };

  if (fetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  const currentToken = queueInfo?.currentServingToken || 0;
  const currentPatientName = queueInfo?.currentPatientName;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>{queueInfo?.doctorName || 'Dr. Doctor'}</Text>
          <Text style={styles.roomNo}>{queueInfo?.roomNo || 'Room --'}</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerResetBtn} 
          onPress={handleResetQueue}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="refresh-circle-outline" size={32} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.servingCard}>
        <Text style={styles.servingLabel}>NOW SERVING TOKEN</Text>
        <Text style={styles.servingTokenNumber}>
          {currentToken > 0 ? `#${currentToken}` : '--'}
        </Text>

        <View style={styles.patientBadge}>
          <Ionicons name="person" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.patientNameText}>
            {currentToken > 0 
              ? (currentPatientName || 'රෝගියා ලියාපදිංචි වී නැත')
              : 'රෝගීන් නොමැත'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.callButton} 
        onPress={handleCallNext}
        disabled={loadingNext}
      >
        {loadingNext ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.buttonRow}>
            <Text style={styles.callButtonText}>CALL NEXT PATIENT</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Waiting Patients</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{waitingPatients.length}</Text>
        </View>
      </View>

      <FlatList
        data={waitingPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.patientCard}>
            <View style={styles.tokenCircle}>
              <Text style={styles.tokenText}>#{item.tokenNumber}</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{item.patientName}</Text>
              {item.patientPhone ? (
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📱 {item.patientPhone}</Text>
              ) : null}
              <Text style={styles.statusLabel}>WAITING</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>පෝලිමේ රෝගීන් කිසිවෙකු නොමැත.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  doctorName: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  roomNo: { fontSize: 14, color: '#64748b', marginTop: 2 },
  headerResetBtn: { padding: 4 },
  servingCard: { backgroundColor: '#0284c7', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 3, marginBottom: 16 },
  servingLabel: { color: '#bae6fd', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  servingTokenNumber: { color: '#ffffff', fontSize: 56, fontWeight: 'bold', marginVertical: 4 },
  patientBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  patientNameText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  callButton: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 2 },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  callButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginRight: 8 },
  countBadge: { backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  countText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  patientCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  tokenCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenText: { color: '#0284c7', fontWeight: 'bold', fontSize: 15 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  statusLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 20, fontSize: 14 }
});