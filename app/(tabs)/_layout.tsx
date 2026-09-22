import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0284c7',
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="medical-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="prescription"
        options={{
          title: 'Prescription',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="document-text-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy"
        options={{
          title: 'Pharmacy',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="medkit-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="settings-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}