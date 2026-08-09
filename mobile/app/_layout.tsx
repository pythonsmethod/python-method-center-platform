import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#F4D58D',
          contentStyle: { backgroundColor: '#0B0B0B' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Вход' }} />
        <Stack.Screen name="sign-up" options={{ title: 'Регистрация' }} />
        <Stack.Screen name="recovery" options={{ title: 'Восстановление доступа' }} />
        <Stack.Screen name="reset-password" options={{ title: 'Новый пароль' }} />
        <Stack.Screen name="cabinet" options={{ title: 'Мой кабинет', headerBackVisible: false }} />
        <Stack.Screen name="documents" options={{ title: 'Документы' }} />
        <Stack.Screen name="history" options={{ title: 'История кейса' }} />
        <Stack.Screen name="team-chat" options={{ title: 'Чат с командой' }} />
      </Stack>
    </AuthProvider>
  );
}
