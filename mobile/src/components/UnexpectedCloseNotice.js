import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clearLastUnexpectedError, readLastUnexpectedError } from '../auth/crashReporter';

export default function UnexpectedCloseNotice() {
  const [details, setDetails] = useState(null);
  useEffect(() => {
    let mounted = true;
    readLastUnexpectedError().then((saved) => { if (mounted) setDetails(saved); });
    return () => { mounted = false; };
  }, []);
  if (!details) return null;
  async function dismiss() {
    await clearLastUnexpectedError();
    setDetails(null);
  }
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Text style={styles.title}>The app closed unexpectedly</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss crash details" onPress={dismiss}>
          <Text style={styles.dismiss}>Dismiss</Text>
        </Pressable>
      </View>
      <Text selectable style={styles.details}>{details}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 12, padding: 14, borderRadius: 12, backgroundColor: '#fff4e5', borderColor: '#d97706', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: '#713f12', fontSize: 15, fontWeight: '800' },
  dismiss: { color: '#713f12', fontWeight: '700', padding: 4 },
  details: { color: '#713f12', marginTop: 8, fontSize: 12, lineHeight: 17 },
});
