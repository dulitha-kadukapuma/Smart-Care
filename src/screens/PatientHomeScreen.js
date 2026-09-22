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
  Modal, 
  Vibration 
} from 'react-native';
import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

const AVG_MINUTES_PER_PATIENT = 5;
const CATEGORIES = ['All', 'General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist', 'ENT Specialist', 'Dental Surgeon'];

export default function PatientHomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [doctors, setDoctors] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [myToken, setMyToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);
  
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [soundObject, setSoundObject] = useState(null);
  
  const [docDetailsModal, setDocDetailsModal] = useState(false);
  const [medicinesModal, setMedicinesModal] = useState(false);
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  
  const [isMedicineReadyAlert, setIsMedicineReadyAlert] = useState(false);

  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    textMain: isDarkMode ? '#f8fafc' : '#0f172a',
    textSub: isDarkMode ? '#94a3b8' : '#64748b',
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    inputBg: isDarkMode ? '#0f172a' : '#f8fafc',
    highlight: isDarkMode ? '#38bdf8' : '#0284c7',
  };

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docList = [];
      snapshot.forEach((docSnap) => {
        docList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setDoctors(docList);
      setFetchingDocs(false);
    }, (error) => {
      setFetchingDocs(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredDoctors = doctors.filter((docItem) => {
    if (selectedCategory === 'All') return true;
    const spec = docItem.specialization || docItem.speciality || docItem.category || '';
    return spec.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  useEffect(() => {
    if (filteredDoctors.length > 0) {
      const isStillInList = filteredDoctors.some(d => d.id === selectedDoctor?.id);
      if (!isStillInList) {
        setSelectedDoctor(filteredDoctors[0]);
        setMyToken(null);
      }
    } else {
      setSelectedDoctor(null);
      setMyToken(null);
    }
  }, [selectedCategory, doctors]);

  useEffect(() => {
    if (!selectedDoctor?.id) {
      setQueueData(null);
      return;
    }
    const docRef = doc(db, 'queues', selectedDoctor.id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setQueueData(docSnap.data());
      } else {
        setQueueData({ status: selectedDoctor.status || 'active', currentServingToken: 0 });
      }
    });
    return () => unsubscribe();
  }, [selectedDoctor]);

  const currentToken = queueData?.currentServingToken || 0;

  useEffect(() => {
    if (myToken && currentToken === myToken.tokenNumber && !isAlertVisible) {
      triggerAlert();
    }
  }, [currentToken, myToken]);

  useEffect(() => {
    const searchTarget = myToken ? myToken.patientName?.trim() : patientName?.trim();
    if (!searchTarget) return;

    const q = query(collection(db, 'prescriptions'), where('patientName', '==', searchTarget));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'ready') {
          setIsMedicineReadyAlert(true);
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
        }
      });
    });

    return () => unsubscribe();
  }, [myToken, patientName]);

  const getDocName = (doc) => {
    if (!doc) return 'Select a Doctor';
    if (doc.firstName) return `${doc.firstName} ${doc.lastName || ''}`;
    return doc.name || doc.doctorName || doc.fullName || doc.displayName || 'Dr. Doctor';
  };

  const formatWaitTime = (patientsAhead) => {
    if (patientsAhead <= 0) return null;
    const totalMinutes = patientsAhead * AVG_MINUTES_PER_PATIENT;
    if (totalMinutes < 60) return `මිනිත්තු ${totalMinutes}ක් පමණ`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `පැය ${hours}යි මිනිත්තු ${mins}ක් පමණ` : `පැය ${hours}ක් පමණ`;
  };

  async function triggerAlert() {
    setIsAlertVisible(true);
    Vibration.vibrate([500, 500, 500, 500]);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
    try {
      const player = createAudioPlayer('https://actions.google.com/sounds/v1/alarms/digital_clock_alarm.ogg');
      setSoundObject(player);
      player.play();
    } catch (error) {}
  }

  async function dismissAlert() {
    setIsAlertVisible(false);
    Vibration.cancel();
    if (soundObject) {
      try {
        soundObject.pause();
        soundObject.remove();
      } catch (error) {} finally { setSoundObject(null); }
    }
  }

  const handleGetToken = async () => {
    if (!patientName.trim()) return Alert.alert("අවධානයට", "කරුණාකර ඔබේ නම ඇතුළත් කරන්න.");
    if (!selectedDoctor?.id) return Alert.alert("අවධානයට", "කරුණාකර වෛද්‍යවරයෙකු තෝරන්න.");
    const currentStatus = queueData?.status || selectedDoctor?.status || 'active';
    if (currentStatus === 'offline') return Alert.alert("සායනය වසා ඇත", "මෙම වෛද්‍යවරයාගේ සායන වාරය අවසන් වී ඇත.");

    setLoading(true);
    try {
      const tokensRef = collection(db, 'tokens');
      const q = query(tokensRef, where('doctorId', '==', selectedDoctor.id));
      const querySnapshot = await getDocs(q);
      const tokenNum = querySnapshot.size + 1;

      const tokenData = {
        patientName: patientName.trim(),
        doctorId: selectedDoctor.id,
        doctorName: getDocName(selectedDoctor),
        tokenNumber: tokenNum,
        status: 'waiting',
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'tokens'), tokenData);
      setMyToken(tokenData);
      Alert.alert("සාර්ථකයි!", `ඔබේ Token අංකය #${tokenNum} වේ.`);
    } catch (error) {
      Alert.alert("Error", "Token එක ලබා ගැනීමට නොහැකි විය.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyMedicines = async () => {
    if (!patientName.trim() && !myToken) {
      Alert.alert("අවධානයට", "ඔබගේ ඖෂධ බැලීමට පළමුව Token පතක් ලබාගෙන හෝ නම ලබාදී සිටිය යුතුය.");
      return;
    }
    setMedicinesModal(true);
    setLoadingMeds(true);
    try {
      const searchName = myToken ? myToken.patientName : patientName.trim();
      const medsRef = collection(db, 'prescriptions');
      const q = query(medsRef, where('patientName', '==', searchName));
      const snapshot = await getDocs(q);
      
      const medsList = [];
      snapshot.forEach(doc => medsList.push({ id: doc.id, ...doc.data() }));
      setMyPrescriptions(medsList);
    } catch (error) {
      console.log("Error fetching meds:", error);
    } finally {
      setLoadingMeds(false);
    }
  };

  const patientsAhead = myToken ? myToken.tokenNumber - currentToken : 0;
  const clinicStatus = queueData?.status || selectedDoctor?.status || 'active';

  if (fetchingDocs) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.highlight} />
        <Text style={{ marginTop: 10, color: theme.textSub }}>තොරතුරු ලබා ගනිමින් පවතී...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: 10 }}>
        <Text style={[styles.hospitalTitle, { color: theme.highlight }]}>SmartCare Clinic</Text>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={{ padding: 5 }}>
          <Ionicons name={isDarkMode ? "sunny" : "moon"} size={26} color={isDarkMode ? "#fbbf24" : "#475569"} />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat, index) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.chip, isActive ? { backgroundColor: theme.highlight } : { backgroundColor: theme.cardBg, borderColor: theme.borderColor, borderWidth: 1 }]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : theme.textSub }}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[styles.sectionHeader, { color: theme.textMain }]}>වෛද්‍යවරයා තෝරන්න (Select Doctor):</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.docListWrapper}>
        {filteredDoctors.length > 0 ? filteredDoctors.map((docItem) => {
          const isSelected = selectedDoctor?.id === docItem.id;
          return (
            <TouchableOpacity
              key={docItem.id}
              style={[
                styles.docCard, 
                { backgroundColor: theme.cardBg, borderColor: isSelected ? theme.highlight : theme.borderColor },
                isSelected && { borderWidth: 2 }
              ]}
              onPress={() => { setSelectedDoctor(docItem); setMyToken(null); }}
            >
              <Ionicons name="person-circle-outline" size={32} color={isSelected ? theme.highlight : theme.textSub} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isSelected ? theme.highlight : theme.textMain, marginTop: 4 }} numberOfLines={1}>
                {getDocName(docItem)}
              </Text>
              <Text style={{ fontSize: 10, color: theme.textSub, marginTop: 2 }}>
                {docItem.specialization || docItem.speciality || docItem.category || 'General'}
              </Text>
            </TouchableOpacity>
          );
        }) : (
          <Text style={{ color: theme.textSub, marginVertical: 10 }}>මෙම අංශය යටතේ වෛද්‍යවරුන් නොමැත.</Text>
        )}
      </ScrollView>

      {selectedDoctor && (
        <View style={styles.doctorHeader}>
          <Text style={[styles.doctorName, { color: theme.textMain }]}>{getDocName(selectedDoctor)}</Text>
          <Text style={{ fontSize: 14, color: theme.textSub, marginTop: 2 }}>
            {queueData?.roomNo || selectedDoctor?.roomNumber || 'Room --'}
          </Text>

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: isDarkMode ? '#0284c730' : '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
            onPress={() => setDocDetailsModal(true)}
          >
            <Ionicons name="information-circle" size={16} color={theme.highlight} />
            <Text style={{ fontSize: 12, color: theme.highlight, fontWeight: 'bold', marginLeft: 4 }}>වෛද්‍යවරයාගේ විස්තර</Text>
          </TouchableOpacity>

          <View style={[styles.statusBadge, clinicStatus === 'active' ? styles.statusActive : clinicStatus === 'break' ? styles.statusBreak : styles.statusOffline]}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e293b' }}>
              {clinicStatus === 'active' ? '● Available' : clinicStatus === 'break' ? '● On Break' : '● Clinic Closed'}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.servingCard, { backgroundColor: theme.highlight }]}>
        <Text style={styles.cardLabel}>NOW SERVING</Text>
        <Text style={styles.servingToken}>{currentToken > 0 ? `#${currentToken}` : '--'}</Text>
      </View>

      {!myToken ? (
        <View style={[styles.bookingCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <Text style={[styles.formTitle, { color: theme.textMain }]}>නව Token පතක් ලබාගන්න</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.borderColor, color: theme.textMain }]}
            placeholder="ඔබේ නම ඇතුළත් කරන්න"
            value={patientName}
            onChangeText={setPatientName}
            placeholderTextColor={theme.textSub}
            editable={clinicStatus !== 'offline' && !!selectedDoctor}
          />

          <TouchableOpacity 
            style={[styles.bookButton, (clinicStatus === 'offline' || !selectedDoctor) ? { backgroundColor: theme.textSub } : { backgroundColor: theme.highlight }]} 
            onPress={handleGetToken}
            disabled={loading || clinicStatus === 'offline' || !selectedDoctor}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : (
              <Text style={styles.buttonText}>{clinicStatus === 'offline' ? 'CLINIC CLOSED' : 'GET TOKEN'}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.myTokenCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <Text style={[styles.myTokenLabel, { color: theme.textSub }]}>YOUR TOKEN NUMBER</Text>
          <Text style={[styles.myTokenNumber, { color: theme.textMain }]}>#{myToken.tokenNumber}</Text>
          <Text style={{ fontSize: 16, color: theme.textMain, fontWeight: '600', marginBottom: 10 }}>නම: {myToken.patientName}</Text>
          
          <View style={[styles.statusBox, { borderTopColor: theme.borderColor }]}>
            {patientsAhead > 0 ? (
              <>
                <Text style={{ fontSize: 15, color: theme.textMain }}>ඔබට පෙර තව <Text style={{ fontWeight: 'bold', color: theme.highlight }}>{patientsAhead}</Text> දෙනෙකු සිටී.</Text>
                <View style={[styles.timeCard, { backgroundColor: isDarkMode ? '#0284c720' : '#e0f2fe', borderColor: isDarkMode ? '#0284c750' : '#bae6fd' }]}>
                  <Ionicons name="time-outline" size={20} color={theme.highlight} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ fontSize: 11, color: theme.highlight, fontWeight: 'bold' }}>බලාපොරොත්තු වන කාලය</Text>
                    <Text style={{ fontSize: 15, color: theme.textMain, fontWeight: 'bold' }}>{formatWaitTime(patientsAhead)}</Text>
                  </View>
                </View>
              </>
            ) : patientsAhead === 0 ? (
              <Text style={{ fontSize: 15, color: '#16a34a', fontWeight: 'bold' }}>🔔 ඔබේ වාරය පැමිණ ඇත!</Text>
            ) : (
              <Text style={{ fontSize: 15, color: '#dc2626' }}>ඔබේ වාරය පසුවී ඇත.</Text>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.medicineButton, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: theme.highlight }]}
        onPress={fetchMyMedicines}
      >
        <Ionicons name="medkit-outline" size={24} color={theme.highlight} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.highlight, marginLeft: 10 }}>මගේ ඖෂධ (My Medicines)</Text>
      </TouchableOpacity>

      {/* Modals */}
      <Modal visible={isAlertVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.iconCircle}><Ionicons name="notifications" size={50} color="#ffffff" /></View>
            <Text style={[styles.alertTitle, { color: theme.textMain }]}>ඔබගේ වාරය පැමිණ ඇත!</Text>
            <Text style={{ fontSize: 14, color: theme.textSub, textAlign: 'center', marginBottom: 16 }}>කරුණාකර පරීක්ෂණ කාමරයට ඇතුළු වන්න.</Text>
            <Text style={styles.alertTokenNumber}>Token #{myToken?.tokenNumber}</Text>
            <TouchableOpacity style={styles.confirmButton} onPress={dismissAlert}>
              <Text style={styles.confirmButtonText}>තහවුරු කළා (OK)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMedicineReadyAlert} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: '#16a34a' }]}>
              <Ionicons name="medical" size={50} color="#ffffff" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.textMain }]}>ඖෂධ සූදානම්ය!</Text>
            <Text style={{ fontSize: 14, color: theme.textSub, textAlign: 'center', marginBottom: 20 }}>
              ඔබගේ ඖෂධ Pharmacy එකෙන් සූදානම් කර ඇත. කරුණාකර ගොස් ලබා ගන්න.
            </Text>
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: '#16a34a', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }]} 
              onPress={() => setIsMedicineReadyAlert(false)}
            >
              <Text style={styles.confirmButtonText}>තේරුණා (OK)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={docDetailsModal} transparent={true} animationType="fade" onRequestClose={() => setDocDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.textMain }}>වෛද්‍යවරයාගේ තොරතුරු</Text>
              <TouchableOpacity onPress={() => setDocDetailsModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="person-circle" size={60} color={theme.highlight} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.textMain }}>{getDocName(selectedDoctor)}</Text>
                <Text style={{ fontSize: 14, color: theme.textSub }}>{selectedDoctor?.specialization || 'General Practitioner'}</Text>
              </View>
            </View>

            <View style={{ width: '100%', backgroundColor: theme.inputBg, padding: 15, borderRadius: 10 }}>
              <Text style={{ fontSize: 14, color: theme.textMain, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>🩺 විශේෂඥතාව:</Text> {selectedDoctor?.specialization || 'සඳහන් කර නැත'}</Text>
              <Text style={{ fontSize: 14, color: theme.textMain, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>🏥 කාමර අංකය:</Text> {selectedDoctor?.roomNumber || 'සඳහන් කර නැත'}</Text>
              <Text style={{ fontSize: 14, color: theme.textMain, marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>🎓 සුදුසුකම්:</Text> {selectedDoctor?.qualifications || 'MBBS'}</Text>
              <Text style={{ fontSize: 14, color: theme.textMain }}><Text style={{ fontWeight: 'bold' }}>🕒 වේලාවන්:</Text> {selectedDoctor?.workingHours || 'පෙ.ව 8:00 - ප.ව 5:00'}</Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={medicinesModal} transparent={true} animationType="slide" onRequestClose={() => setMedicinesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, flex: 0.8, width: '100%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.textMain }}>මගේ ඖෂධ</Text>
              <TouchableOpacity onPress={() => setMedicinesModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            {loadingMeds ? (
              <ActivityIndicator size="large" color={theme.highlight} style={{ marginTop: 50 }} />
            ) : myPrescriptions.length > 0 ? (
              <ScrollView style={{ width: '100%' }}>
                {myPrescriptions.map((presc, index) => {
                  const isReady = presc.status === 'ready';

                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.input, 
                        { 
                          backgroundColor: theme.inputBg, 
                          borderColor: isReady ? '#16a34a' : theme.borderColor, 
                          borderWidth: isReady ? 2 : 1,
                          height: 'auto',
                          padding: 15 
                        }
                      ]}
                    >
                      {isReady ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', padding: 8, borderRadius: 8, marginBottom: 10 }}>
                          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#16a34a', marginLeft: 6 }}>
                            ඔබගේ ඖෂධ ලබා ගැනීමට සූදානම්ය! (Ready to Collect)
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3', padding: 8, borderRadius: 8, marginBottom: 10 }}>
                          <Ionicons name="time-outline" size={18} color="#ca8a04" />
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ca8a04', marginLeft: 6 }}>
                            ඖෂධ සූදානම් කරමින් පවතී...
                          </Text>
                        </View>
                      )}

                      <Text style={{ fontSize: 14, color: theme.highlight, fontWeight: 'bold' }}>Dr. {presc.doctorName}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSub, marginBottom: 8 }}>
                        {presc.createdAt?.toDate ? new Date(presc.createdAt.toDate()).toLocaleDateString() : ''}
                      </Text>
                      <Text style={{ fontSize: 15, color: theme.textMain }}>{presc.medicines}</Text>
                      
                      {presc.notes ? (
                        <Text style={{ fontSize: 13, color: theme.textSub, fontStyle: 'italic', marginTop: 6 }}>
                          සටහන්: {presc.notes}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Ionicons name="document-text-outline" size={60} color={theme.textSub} />
                <Text style={{ color: theme.textSub, marginTop: 15, textAlign: 'center' }}>
                  දැනට ඔබට නිකුත් කළ ඖෂධ වාර්තා නොමැත.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center', flexGrow: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hospitalTitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  categoryWrapper: { marginVertical: 12, width: '100%' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, marginRight: 8 },
  sectionHeader: { alignSelf: 'flex-start', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  docListWrapper: { width: '100%', marginBottom: 16 },
  docCard: { borderRadius: 12, padding: 10, marginRight: 10, width: 130, alignItems: 'center', borderWidth: 1 },
  doctorHeader: { alignItems: 'center', marginBottom: 10 },
  doctorName: { fontSize: 20, fontWeight: 'bold' },
  statusBadge: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusBreak: { backgroundColor: '#fef9c3' },
  statusOffline: { backgroundColor: '#fee2e2' },
  servingCard: { width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 16 },
  cardLabel: { color: '#bae6fd', fontSize: 12, fontWeight: 'bold' },
  servingToken: { color: '#ffffff', fontSize: 48, fontWeight: 'bold' },
  bookingCard: { width: '100%', padding: 20, borderRadius: 16, borderWidth: 1, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 15 },
  bookButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  myTokenCard: { width: '100%', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  myTokenLabel: { fontSize: 12, fontWeight: '600' },
  myTokenNumber: { fontSize: 40, fontWeight: 'bold' },
  statusBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, width: '100%', alignItems: 'center' },
  timeCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginTop: 12, borderWidth: 1, width: '100%' },
  medicineButton: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 2, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', elevation: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  alertTokenNumber: { fontSize: 32, fontWeight: 'bold', color: '#ef4444', marginBottom: 24 },
  confirmButton: { backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  confirmButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});