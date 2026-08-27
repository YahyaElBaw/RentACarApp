import React from 'react';
import { Tabs } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import FloatingTabBar from '../../src/components/FloatingTabBar';

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const isSuperAdmin = role === 'super_admin';
  const isUserOrAdmin = role === 'user' || role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="fleet"
        options={{
          title: 'Voitures',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
        }}
      />
      <Tabs.Screen
        name="spectator"
        options={{
          title: 'Spectateur',
          href: isSuperAdmin ? '/spectator' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          href: isUserOrAdmin ? '/profile' : null,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reservation"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="accounting"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
