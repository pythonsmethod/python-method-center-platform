import { Redirect } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';

import { useAuth } from '@/lib/auth-context';

export default function IndexScreen() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return <Redirect href={session ? '/cabinet' : '/login'} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
