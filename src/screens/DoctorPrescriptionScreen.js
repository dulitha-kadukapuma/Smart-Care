import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorPrescriptionScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  
  const [patientName, setPatientName] = useState('');
  const [medicines, setMedicines] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [queuePatients, setQueuePatients] = useState([]);

  const [searchName, setSearchName] = useState('');
  const [history, setHistory] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    textMain: isDarkMode ? '#f8fafc' : '#0f172a',
    textSub: isDarkMode ? '#94a3b8' : '#64748b',
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    inputBg: isDarkMode ? '#0f172a' : '#f1f5f9',
    highlight: isDarkMode ? '#38bdf8' : '#0284c7',
  };

  useEffect(() => {
    const fetchDoctorAndQueue = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctorInfo(docSnap.data());
        }

        const q = query(
          collection(db, 'tokens'), 
          where('doctorId', '==', auth.currentUser.uid),
          where('status', 'in', ['waiting', 'serving'])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          list.sort((a, b) => a.tokenNumber - b.tokenNumber);
          setQueuePatients(list);
        });

        return () => unsubscribe();
      }
    };
    fetchDoctorAndQueue();
  }, []);

  const handleSavePrescription = async () => {
    if (!patientName.trim() || !medicines.trim()) {
      Alert.alert('අවධානයට', 'කරුණාකර රෝගියාගේ නම සහ ඖෂධ ඇතුළත් කරන්න.');
      return;
    }

    setSaving(true);
    try {
      const docName = doctorInfo?.firstName 
        ? `${doctorInfo.firstName} ${doctorInfo.lastName || ''}` 
        : (doctorInfo?.name || 'Doctor');

      await addDoc(collection(db, 'prescriptions'), {
        patientName: patientName.trim(),
        medicines: medicines.trim(),
        notes: notes.trim(),
        doctorId: auth.currentUser.uid,
        doctorName: docName,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      Alert.alert('සාර්ථකයි!', 'ඖෂධ වට්ටෝරුව සාර්ථකව Pharmacy වෙත යවන ලදී.');
      setPatientName('');
      setMedicines('');
      setNotes('');
    } catch (error) {
      Alert.alert('Error', 'දෝෂයක් මතු විය.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchHistory = async () => {
    if (!searchName.trim()) {
      Alert.alert('අවධානයට', 'කරුණාකර රෝගියාගේ නම ඇතුළත් කරන්න.');
      return;
    }

    setFetching(true);
    setHasSearched(true);
    try {
      const q = query(collection(db, 'prescriptions'), where('patientName', '==', searchName.trim()));
      const querySnapshot = await getDocs(q);
      
      const historyList = [];
      querySnapshot.forEach((docSnap) => {
        historyList.push({ id: docSnap.id, ...docSnap.data() });
      });

      historyList.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setHistory(historyList);
    } catch (error) {
      Alert.alert('Error', 'ඉතිහාසය ලබා ගැනීමේදී දෝෂයක් මතු විය.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.bg }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.headerBar, { backgroundColor: theme.cardBg, borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.headerTitleText, { color: theme.highlight }]}>Doctor Prescription Portal</Text>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={{ padding: 5 }}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={24} color={isDarkMode ? "#fbbf24" : "#475569"} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'write' && { backgroundColor: theme.highlight }]}
          onPress={() => setActiveTab('write')}
        >
          <Ionicons name="create-outline" size={20} color={activeTab === 'write' ? '#ffffff' : theme.textSub} />
          <Text style={[styles.tabText, { color: activeTab === 'write' ? '#ffffff' : theme.textSub }]}>නව වට්ටෝරුව</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'history' && { backgroundColor: theme.highlight }]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="search-outline" size={20} color={activeTab === 'history' ? '#ffffff' : theme.textSub} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#ffffff' : theme.textSub }]}>රෝගී වාර්තා</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'write' && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Text style={[styles.cardTitle, { color: theme.textMain }]}>ඖෂධ නිකුත් කිරීම</Text>
            
            <Text style={[styles.label, { color: theme.textSub }]}>රෝගියාගේ නම *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.borderColor, color: theme.textMain }]}
              placeholder="නම ඇතුළත් කරන්න හෝ පහතින් තෝරන්න"
              placeholderTextColor={theme.textSub}
              value={patientName}
              onChangeText={setPatientName}
            />

            {queuePatients.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.highlight, marginBottom: 6 }}>
                  ⚡ පෝලිමේ (Queue) සිටින රෝගීන්ගෙන් තෝරන්න:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {queuePatients.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{ 
                        backgroundColor: patientName === item.patientName ? theme.highlight : (isDarkMode ? '#334155' : '#e0f2fe'), 
                        paddingHorizontal: 12, 
                        paddingVertical: 8, 
                        borderRadius: 8, 
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: theme.borderColor
                      }}
                      onPress={() => setPatientName(item.patientName)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: patientName === item.patientName ? '#fff' : theme.highlight }}>
                        #{item.tokenNumber} - {item.patientName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.label, { color: theme.textSub }]}>ඖෂධ ලැයිස්තුව (Medicines) *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.borderColor, color: theme.textMain }]}
              placeholder="1. Panadol 2 tabs x 3 times"
              placeholderTextColor={theme.textSub}
              value={medicines}
              onChangeText={setMedicines}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: theme.textSub }]}>විශේෂ සටහන් (Notes)</Text>
            <TextInput
              style={[styles.input, { height: 80, backgroundColor: theme.inputBg, borderColor: theme.borderColor, color: theme.textMain }]}
              placeholder="සටහන් ඇතුළත් කරන්න"
              placeholderTextColor={theme.textSub}
              value={notes}
              onChangeText={setNotes}
              multiline={true}
            />

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.highlight }]} 
              onPress={handleSavePrescription}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#ffffff" /> : (
                <>
                  <Ionicons name="save-outline" size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>වාර්තාව සුරකින්න</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            <Text style={[styles.cardTitle, { color: theme.textMain }]}>රෝගියාගේ ඉතිහාසය සෙවීම</Text>
            
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: theme.inputBg, borderColor: theme.borderColor, color: theme.textMain }]}
                placeholder="රෝගියාගේ නම"
                placeholderTextColor={theme.textSub}
                value={searchName}
                onChangeText={setSearchName}
              />
              <TouchableOpacity style={[styles.searchButton, { backgroundColor: theme.highlight }]} onPress={handleSearchHistory}>
                <Ionicons name="search" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {fetching ? (
              <ActivityIndicator size="large" color={theme.highlight} style={{ marginTop: 30 }} />
            ) : hasSearched && history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={50} color={theme.textSub} />
                <Text style={{ color: theme.textSub, marginTop: 10 }}>මෙම නමින් වාර්තා කිසිවක් හමු නොවීය.</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.map((record) => (
                  <View key={record.id} style={[styles.historyCard, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
                    <View style={[styles.historyHeader, { borderBottomColor: theme.borderColor }]}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.highlight }}>
                        {record.createdAt?.toDate ? new Date(record.createdAt.toDate()).toLocaleDateString() : ''}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.textSub }}>Dr. {record.doctorName}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.textSub, marginBottom: 4 }}>ඖෂධ:</Text>
                    <Text style={{ fontSize: 15, color: theme.textMain, lineHeight: 22 }}>{record.medicines}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitleText: { fontSize: 16, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', padding: 10, elevation: 2 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  tabText: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  scrollContent: { padding: 16 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16 },
  textArea: { height: 120 },
  saveButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 10, marginTop: 10 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginRight: 10 },
  searchButton: { padding: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  historyList: { marginTop: 10 },
  historyCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 10 }
});