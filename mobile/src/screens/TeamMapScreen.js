import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { fetchTeamLocations } from '../api/teamLeader';
import EmptyState from '../components/EmptyState';
import { ErrorState, LoadingState } from '../components/ScreenState';
import PrimaryButton from '../components/PrimaryButton';
import { formatDateTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';

function validLocation(item) {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export default function TeamMapScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await fetchTeamLocations();
      setLocations(Array.isArray(result.locations) ? result.locations.filter(validLocation) : []);
    } catch (loadError) {
      setError(loadError.response?.data?.error?.message || 'Live team locations could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <LoadingState colors={colors} label="Loading live team locations…" />;
  if (error && !locations.length) return <ErrorState colors={colors} message={error} onRetry={load} />;
  const first = locations[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <Text style={styles.eyebrow}>FIELD COVERAGE</Text>
        <Text style={styles.heading}>Live team map</Text>
        <Text style={styles.subtitle}>{locations.length} member{locations.length === 1 ? '' : 's'} with a recent location ping</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {locations.length ? (
          <>
            <View style={styles.mapFrame}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: first.latitude,
                  longitude: first.longitude,
                  latitudeDelta: 0.12,
                  longitudeDelta: 0.12,
                }}
              >
                {locations.map((member) => (
                  <Marker
                    key={`${member.teamId}-${member.repId}`}
                    coordinate={{ latitude: member.latitude, longitude: member.longitude }}
                    pinColor={member.role === 'brand_ambassador' ? colors.accent : colors.primary}
                    title={member.name}
                    description={`${member.role.replace(/_/g, ' ')} · ${formatDateTime(member.timestamp)}`}
                  />
                ))}
              </MapView>
            </View>
            {locations.map((member) => (
              <View key={`${member.teamId}-${member.repId}`} style={styles.memberRow}>
                <View style={[styles.dot, { backgroundColor: member.role === 'brand_ambassador' ? colors.accent : colors.primary }]} />
                <View style={styles.memberCopy}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.role}>{member.role.replace(/_/g, ' ')} · updated {formatDateTime(member.timestamp)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <EmptyState icon="⌖" title="No recent locations" message="Field team members appear here while their latest GPS ping is within the active window. Desk-based telemarketers are not tracked." />
        )}
        <PrimaryButton title={refreshing ? 'Refreshing…' : 'Refresh locations'} variant="secondary" onPress={() => load(true)} loading={refreshing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 11, letterSpacing: 1.2 },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  subtitle: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  mapFrame: { height: 430, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  memberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  memberCopy: { flex: 1 },
  name: { color: colors.ink, fontFamily: typography.fontFamilyBold, fontSize: typography.small },
  role: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 10, textTransform: 'capitalize' },
});
