import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function WritePrescriptionScreen({ navigation }) {
  const doctorId = auth.currentUser?.uid;

  const [currentServingToken, setCurrentServingToken] = useState('');
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  
  // Medicines List State
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', duration: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [fetchingPatient, setFetchingPatient] = useState(true);

  // 1. දැනට පරීක්ෂා කරන (Now Serving) Patient ගේ විස්තර ලබා ගැනීම
  useEffect(() => {
    if (!doctorId) return;

    const fetchCurrentServing = async () => {
      try {
        const queueRef = doc(db, 'queues', doctorId);
        const docSnap = await getDoc(queueRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.currentServingToken > 0) {
            setCurrentServingToken(data.currentServingToken.toString());
            setPatientName(data.currentPatientName || '');
          }
        }
      } catch (error) {
        console.log("Error fetching current serving patient:", error);
      } finally {
        setFetchingPatient(false);
      }
    };

    fetchCurrentServing();
  }, [doctorId]);

  // 2. ඖෂධ එකතු කිරීම / ඉවත් කිරීම
  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  const handleMedicineChange = (text, index, field) => {
    const updated = [...medicines];
    updated[index][field] = text;
    setMedicines(updated);
  };

  // 3. Prescription එක Save කිරීම
  const handleSavePrescription = async () => {
    if (!patientName.trim()) {
      Alert.alert("අවධානයට", "කරුණාකර රෝගියාගේ නම ඇතුළත් කරන්න.");
      return;
    }

    if (!diagnosis.trim()) {
      Alert.alert("අවධානයට", "කරුණාකර රෝග විනිශ්චය (Diagnosis) ඇතුළත් කරන්න.");
      return;
    }

    setLoading(true);

    try {
      const prescriptionData = {
        doctorId: doctorId,
        doctorName: auth.currentUser?.displayName || 'Dr. Doctor',
        tokenNumber: currentServingToken ? parseInt(currentServingToken) : null,
        patientName: patientName.trim(),
        diagnosis: diagnosis.trim(),
        symptoms: symptoms.trim(),
        medicines: medicines.filter(m => m.name.trim() !== ''),
        notes: notes.trim(),
        createdAt: serverTimestamp()
      };

      // `prescriptions` Collection එකට Save කිරීම
      await addDoc(collection(db, 'prescriptions'), prescriptionData);

      Alert.alert("සාර්ථකයි!", "Prescription එක සාර්ථකව සුරකින ලදී.", [
        {
          text: "OK",
          onPress: () => {
            // Form එක Clear කිරීම
            setDiagnosis('');
            setSymptoms('');
            setNotes('');
            setMedicines([{ name: '', dosage: '', duration: '' }]);
          }
        }
      ]);

    } catch (error) {
      Alert.alert("දෝෂයක්", "Prescription එක Save කිරීමට නොහැකි විය: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingPatient) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Write Prescription</Text>

      {/* PATIENT INFO CARD */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>රෝගියාගේ තොරතුරු (Patient Info)</Text>
        
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Token อංකය</Text>
            <TextInput
              style={styles.input}
              value={currentServingToken}
              onChangeText={setCurrentServingToken}
              placeholder="e.g. 3"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={styles.label}>රෝගියාගේ නම</Text>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Patient Name"
            />
          </View>
        </View>
      </View>

      {/* DIAGNOSIS & SYMPTOMS */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>රෝග විනිශ්චය (Clinical Notes)</Text>

        <Text style={styles.label}>ලක්ෂණ (Symptoms)</Text>
        <TextInput
          style={styles.input}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Fever, Cough, Headache..."
        />

        <Text style={styles.label}>රෝග විනිශ්චය (Diagnosis)</Text>
        <TextInput
          style={styles.input}
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="e.g. Viral Fever"
        />
      </View>

      {/* MEDICINES SECTION */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionHeader}>ඖෂධ ලැයිස්තුව (Medicines)</Text>
          <TouchableOpacity onPress={handleAddMedicine} style={styles.addButton}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {medicines.map((med, index) => (
          <View key={index} style={styles.medRow}>
            <View style={{ flex: 2, marginRight: 6 }}>
              <TextInput
                style={styles.medInput}
                placeholder="Medicine Name"
                value={med.name}
                onChangeText={(text) => handleMedicineChange(text, index, 'name')}
              />
            </View>
            <View style={{ flex: 1, marginRight: 6 }}>
              <TextInput
                style={styles.medInput}
                placeholder="Dosage (1-0-1)"
                value={med.dosage}
                onChangeText={(text) => handleMedicineChange(text, index, 'dosage')}
              />
            </View>
            <View style={{ flex: 1, marginRight: 6 }}>
              <TextInput
                style={styles.medInput}
                placeholder="Duration (5 Days)"
                value={med.duration}
                onChangeText={(text) => handleMedicineChange(text, index, 'duration')}
              />
            </View>
            {medicines.length > 1 && (
              <TouchableOpacity onPress={() => handleRemoveMedicine(index)}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* ADDITIONAL NOTES */}
      <View style={styles.card}>
        <Text style={styles.label}>අමතර උපදෙස් (Special Notes)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Drink plenty of water, Rest for 3 days..."
          multiline
        />
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity 
        style={styles.saveButton} 
        onPress={handleSavePrescription}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveButtonText}>SAVE PRESCRIPTION</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0284c7',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});