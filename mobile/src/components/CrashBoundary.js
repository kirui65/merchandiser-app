import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function errorDetails(error, info) {
  const componentLines = String(info?.componentStack || '').split('\n').filter(Boolean).slice(0, 8);
  return [String(error?.message || error || 'Unknown error'), ...componentLines].join('\n');
}

export default class CrashBoundary extends React.Component {
  state = { error: null, details: '' };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ details: errorDetails(error, info) });
    console.error('Screen render failed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.help}>The screen hit an error. Retry to reopen the app.</Text>
          <Text selectable style={styles.details}>{this.state.details || String(this.state.error.message || this.state.error)}</Text>
          <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null, details: '' })} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#142b47', fontSize: 24, fontWeight: '800' },
  help: { color: '#52647a', fontSize: 15 },
  details: { color: '#263548', fontSize: 13, lineHeight: 19, padding: 14, backgroundColor: '#eaf1f8' },
  button: { alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: '#1e3a5f' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
