import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#F4D58D',
          contentStyle: { backgroundColor: '#0B0B0B' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Python Method Center' }} />
      </Stack>
    </>
  );
}
