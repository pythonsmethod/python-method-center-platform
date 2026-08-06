import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatDuration(seconds?: number | null) {
  const value = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function VoiceMessage({ url, duration }: { url: string; duration?: number | null }) {
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.button} onPress={toggle}>
        <Text style={styles.buttonText}>{status.playing ? 'Пауза' : 'Слушать'}</Text>
      </Pressable>
      <Text style={styles.duration}>{formatDuration(duration)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  button: { borderColor: '#8A713C', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  buttonText: { color: '#F6E7BA', fontWeight: '700', fontSize: 13 },
  duration: { color: '#AFA89C', fontSize: 12 },
});
