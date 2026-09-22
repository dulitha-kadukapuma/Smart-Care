import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('patient');
  const [specialization, setSpecialization] = useState('General Physician');
  const [loading, setLoading] = useState(false);

  const categories = [
    'General Physician',
    'Cardiologist',
    'Pediatrician',
    'Dermatologist',
    'ENT Specialist',
    'Dental Surgeon'
  ];

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('අවධානයට', 'කරුණාකර Email සහ Password ඇතුළත් කරන්න.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!name) {
          Alert.alert('අවධානයට', 'කරුණාකර ඔබේ නම ඇතුළත් කරන්න.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name.trim(),
          email: email.trim(),
          role: role,
          specialization: role === 'doctor' ? specialization : null,
          createdAt: new Date().toISOString()
        });

        if (role === 'doctor') {
          await setDoc(doc(db, 'queues', user.uid), {
            doctorName: `Dr. ${name.trim()}`,
            specialization: specialization,
            roomNo: 'Room 01',
            currentServingToken: 0,
            status: 'active'
          });
        }

        Alert.alert('සාර්ථකයි!', 'ගිණුම සාර්ථකව සාදන ලදී.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      Alert.alert('දෝෂයක්', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

      {isSignUp && (
        <View style={{ width: '100%' }}>
          <Text style={styles.label}>සම්පූර්ණ නම</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Nimal Silva"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>පරිශීලක වර්ගය (Select Role)</Text>
          <View style={styles.roleContainer}>
            {['patient', 'doctor', 'pharmacy'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnSelected]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>
                  {r.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {role === 'doctor' && (
            <View>
              <Text style={styles.label}>වෛද්‍ය විශේසඥතාව (Doctor Category)</Text>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, specialization === cat && styles.categoryChipSelected]}
                    onPress={() => setSpecialization(cat)}
                  >
                    <Text style={[styles.chipText, specialization === cat && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={{ width: '100%' }}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText}>{isSignUp ? 'SIGN UP' : 'SIGN IN'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 15 }}>
        <Text style={styles.switchText}>
          {isSignUp ? 'දැනටමත් ගිණුමක් තිබේද? Sign In වන්න' : 'ගිණුමක් නැද්ද? අලුතින් Sign Up වන්න'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#ffffff', flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0284c7', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  roleBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  roleBtnSelected: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  roleText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  roleTextSelected: { color: '#ffffff' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4 },
  categoryChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  categoryChipSelected: { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
  chipText: { fontSize: 12, color: '#475569' },
  chipTextSelected: { color: '#0284c7', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#0284c7', width: '100%', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  switchText: { color: '#0284c7', fontSize: 14, fontWeight: '600' }
});