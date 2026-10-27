import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function PatientHistoryScreen() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions' | 'visits'
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    // 🛑 1. User Authenticate වී නැත්නම් Listener Run නොකර නවත්වන්න (Permission Error නතර කිරීමට)
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let unsubscribePrescriptions = () => {};
    let unsubscribeTokens = () => {};

    const setup = async () => {
      let userName = '';
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().name) {
          userName = userDoc.data().name.trim();
        }
      } catch (err) {}

      // 2. Prescriptions Query
      const prescriptionsRef = collection(db, 'prescriptions');
      const qPrescriptions = query(
        prescriptionsRef,
        where('patientUid', '==', currentUser.uid)
      );

      unsubscribePrescriptions = onSnapshot(
        qPrescriptions, 
        async (snapshot) => {
          const list = [];
          const seen = new Set();
          snapshot.forEach((docSnap) => {
            seen.add(docSnap.id);
            list.push({ id: docSnap.id, ...docSnap.data() });
          });

          // Fallback for legacy prescriptions without patientUid
          if (userName) {
            try {
              const legacyQ = query(prescriptionsRef, where('patientName', '==', userName));
              const legacySnap = await getDocs(legacyQ);
              legacySnap.forEach((docSnap) => {
                if (!seen.has(docSnap.id)) {
                  seen.add(docSnap.id);
                  list.push({ id: docSnap.id, ...docSnap.data() });
                }
              });
            } catch (e) {}
          }

          // අලුත්ම දත්ත උඩින් පෙන්වන පරිදි Sort කිරීම
          list.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return timeB - timeA;
          });

          setPrescriptions(list);
          setLoading(false);
        }, 
        (error) => {
          console.log('Prescriptions Listener Error:', error);
          setLoading(false);
        }
      );

      // 3. Tokens (Visits) Query
      const tokensRef = collection(db, 'tokens');
      const qTokens = query(
        tokensRef,
        where('patientUid', '==', currentUser.uid)
      );

      unsubscribeTokens = onSnapshot(
        qTokens, 
        async (snapshot) => {
          const tokenList = [];
          const seenTokens = new Set();
          snapshot.forEach((docSnap) => {
            seenTokens.add(docSnap.id);
            tokenList.push({ id: docSnap.id, ...docSnap.data() });
          });

          // Fallback for legacy tokens without patientUid
          if (userName) {
            try {
              const legacyTokenQ = query(tokensRef, where('patientName', '==', userName));
              const legacyTokenSnap = await getDocs(legacyTokenQ);
              legacyTokenSnap.forEach((docSnap) => {
                if (!seenTokens.has(docSnap.id)) {
                  seenTokens.add(docSnap.id);
                  tokenList.push({ id: docSnap.id, ...docSnap.data() });
                }
              });
            } catch (e) {}
          }

          tokenList.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return timeB - timeA;
          });

          setTokens(tokenList);
        }, 
        (error) => {
          console.log('Tokens Listener Error:', error);
        }
      );
    };

    setup();

    return () => {
      unsubscribePrescriptions();
      unsubscribeTokens();
    };
  }, [currentUser?.uid]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'දිනය සඳහන් නැත';
    try {
      const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return dateObj.toLocaleDateString('si-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'දිනය සඳහන් නැත';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>පෙර විස්තර ලබා ගනිමින් පවතී...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sub Header Tabs (Prescriptions vs Visits) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'prescriptions' && styles.activeTabButton]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={18} 
            color={activeTab === 'prescriptions' ? '#ffffff' : '#0284c7'} 
          />
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabText]}>
            Prescriptions ({prescriptions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'visits' && styles.activeTabButton]}
          onPress={() => setActiveTab('visits')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={activeTab === 'visits' ? '#ffffff' : '#0284c7'} 
          />
          <Text style={[styles.tabText, activeTab === 'visits' && styles.activeTabText]}>
            Visits ({tokens.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📄 PRESCRIPTIONS TAB CONTENT */}
      {activeTab === 'prescriptions' && (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="medical" size={20} color="#0284c7" />
                  <Text style={styles.doctorTitle}>{item.doctorName || 'Dr. Perera'}</Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              {item.diagnosis ? (
                <View style={styles.diagnosisBox}>
                  <Text style={styles.sectionLabel}>රෝග විනිශ්චය (Diagnosis):</Text>
                  <Text style={styles.diagnosisText}>{item.diagnosis}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>ඖෂධ ලැයිස්තුව (Medicines):</Text>
              {Array.isArray(item.medicines) && item.medicines.length > 0 ? (
                item.medicines.map((med, index) => (
                  <View key={index} style={styles.medItem}>
                    <Ionicons name="ellipse" size={8} color="#0284c7" style={{ marginTop: 6 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.medName}>{med.name || med}</Text>
                      {med.dosage ? (
                        <Text style={styles.medDetails}>
                          ප්‍රමාණය: {med.dosage} | කාලය: {med.duration || '-'}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.plainMedText}>{item.medicinesText || 'ඖෂධ ලබා දී ඇත.'}</Text>
              )}

              {item.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>විශේෂ උපදෙස්:</Text>
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>පෙර Prescriptions නොමැත</Text>
              <Text style={styles.emptySubtitle}>වෛද්‍යවරයා නිකුත් කරන Prescriptions මෙහි පෙනෙනු ඇත.</Text>
            </View>
          }
        />
      )}

      {/* 🗓️ VISITS TAB CONTENT */}
      {activeTab === 'visits' && (
        <FlatList
          data={tokens}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.visitCard}>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenBadgeText}>#{item.tokenNumber}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.visitDoctor}>SmartCare Clinic Visit</Text>
                <Text style={styles.visitDate}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>පෙර පැමිණීම් නොමැත</Text>
              <Text style={styles.emptySubtitle}>ඔබ ලබාගන්නා Token පත් මෙහි සටහන් වේ.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
  },
  activeTabButton: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#0284c7',
    fontSize: 13,
  },
  activeTabText: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  doctorTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#0f172a',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  diagnosisBox: {
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  diagnosisText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 14,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  medName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  medDetails: {
    fontSize: 13,
    color: '#64748b',
  },
  plainMedText: {
    fontSize: 14,
    color: '#334155',
  },
  notesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
  },
  visitCard: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tokenBadge: {
    backgroundColor: '#e0f2fe',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenBadgeText: {
    color: '#0284c7',
    fontWeight: 'bold',
    fontSize: 16,
  },
  visitDoctor: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  visitDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
    emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center', // 👈 justifyContent ලෙස වෙනස් කරන්න
  },
    emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});