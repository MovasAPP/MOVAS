import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { brand } from '@/constants/brand';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.orangeDark,
        tabBarInactiveTintColor: brand.muted,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: brand.border, height: 64, paddingTop: 5, paddingBottom: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }} />
      <Tabs.Screen name="work" options={{ title: 'Trabalhos', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>↗</Text> }} />
      <Tabs.Screen name="safety" options={{ title: 'Segurança', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>◇</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 17 }}>◉</Text> }} />
      <Tabs.Screen name="verification" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="my-requests" options={{ href: null }} />
      <Tabs.Screen name="my-proposals" options={{ href: null }} />
      </Tabs>
    </AuthProvider>
  );
}
