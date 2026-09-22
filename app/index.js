import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../src/config/firebase';
import { Stack } from 'expo-router';

// Screens Imports
import LoginScreen from '../src/screens/LoginScreen';
import DoctorQueueScreen from '../src/screens/DoctorQueueScreen';
import DoctorPrescriptionScreen from '../src/screens/DoctorPrescriptionScreen';
import DoctorSettingsScreen from '../src/screens/DoctorSettingsScreen';
import PatientHomeScreen from '../src/screens/PatientHomeScreen';
import PatientHistoryScreen from '../src/screens/PatientHistoryScreen';
import PharmacyScreen from '../src/screens/PharmacyScreen';

export default function Index() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userRole = userDoc.exists() ? (userDoc.data().role || 'patient') : 'patient';
          setRole(userRole);
          
          // Default tab set කිරීම
          if (userRole === 'doctor') setActiveTab('Doctor');
          else if (userRole === 'pharmacy') setActiveTab('Pharmacy');
          else setActiveTab('Patient');

        } catch (error) {
          console.log("Role fetch error:", error);
          setRole('patient');
          setActiveTab('Patient');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LoginScreen />
      </>
    );
  }

  // Active Screen එක තෝරා ගැනීම
  const renderScreen = () => {
    switch (activeTab) {
      case 'Doctor': return <DoctorQueueScreen />;
      case 'Write Rx': return <DoctorPrescriptionScreen />;
      case 'DoctorSettings': return <DoctorSettingsScreen />;
      case 'Pharmacy': return <PharmacyScreen />;
      case 'Patient': return <PatientHomeScreen />;
      case 'History': return <PatientHistoryScreen />;
      default: return <PatientHomeScreen />;
    }
  };

  // Header Title එක සකස් කිරීම
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'Doctor': return 'Doctor Queue';
      case 'Write Rx': return 'Write Prescription';
      case 'DoctorSettings': return 'Settings';
      case 'Pharmacy': return 'Pharmacy Queue';
      case 'Patient': return 'Patient Home';
      case 'History': return 'My History';
      default: return 'SmartCare';
    }
  };

  // Role එක අනුව Tab Buttons තීරණය කිරීම
  const tabs = role === 'doctor' 
    ? [
        { id: 'Doctor', title: 'Queue', icon: 'medical' },
        { id: 'Write Rx', title: 'Write Rx', icon: 'document-text' },
        { id: 'DoctorSettings', title: 'Settings', icon: 'settings' },
      ]
    : role === 'pharmacy'
    ? [
        { id: 'Pharmacy', title: 'Pharmacy', icon: 'medkit' },
      ]
    : [
        { id: 'Patient', title: 'Home', icon: 'person' },
        { id: 'History', title: 'History', icon: 'time' },
      ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Active Screen View */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? '#0284c7' : '#64748b'}
              />
              <Text style={[styles.tabLabel, { color: isActive ? '#0284c7' : '#64748b' }]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 56,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});