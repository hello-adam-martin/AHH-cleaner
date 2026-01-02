import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useCleanerStore } from '@/stores/cleanerStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useLostPropertyStore } from '@/stores/lostPropertyStore';
import { CleanerBadge } from '@/components/CleanerBadge';
import { getTimeUntil, formatTime, formatCheckinDate, formatHoursAndMinutes } from '@/utils/time';
import { theme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const cleaners = useCleanerStore((state) => state.cleaners);
  const properties = usePropertiesStore((state) => state.properties);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const startSession = useSessionStore((state) => state.startSession);

  const getLostPropertiesForProperty = useLostPropertyStore(
    (state) => state.getLostPropertiesForProperty
  );

  const property = properties.find((p) => p.id === id);
  const lostProperties = id ? getLostPropertiesForProperty(id) : [];
  const reportedLostProperties = lostProperties.filter((p) => p.status === 'reported');

  if (!property || !authenticatedCleaner) {
    return null;
  }

  const propertySessions = activeSessions.filter((s) => s.propertyId === id);
  const activeCleaners = propertySessions
    .map((session) => cleaners.find((c) => c.id === session.cleanerId))
    .filter((c) => c !== undefined);

  const currentCleanerSessions = activeSessions.filter((s) => s.cleanerId === authenticatedCleaner.id);
  const isCurrentlyCleaningThis = currentCleanerSessions.some((s) => s.propertyId === id);
  // Check if cleaner has an ACTIVE timer running on another property (can't start new while active)
  const hasActiveTimerElsewhere = currentCleanerSessions.some((s) => s.propertyId !== id && s.status === 'active');

  const handleStartCleaning = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available on web
    }
    startSession(id, authenticatedCleaner.id);
    router.push('/(main)/active');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.propertyName}>{property.name}</Text>
        <Text style={styles.address}>{property.address}</Text>

        {property.guestCount !== undefined && property.guestCount > 0 && (
          <View style={styles.guestCountBadge}>
            <Text style={styles.guestCountText}>
              👤 {property.guestCount} {property.guestCount === 1 ? 'guest' : 'guests'} stayed
            </Text>
          </View>
        )}

        <View style={styles.cleanerIndicator}>
          <Text style={styles.cleanerLabel}>Logged in as:</Text>
          <Text style={styles.cleanerNameText}>{authenticatedCleaner.name}</Text>
        </View>

        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Current Totals (Debug)</Text>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Cleaning Time:</Text>
            <Text style={styles.debugValue}>
              {property.cleaningTime !== undefined
                ? formatHoursAndMinutes(property.cleaningTime)
                : '0m'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Linen Costs:</Text>
            <Text style={styles.debugValue}>
              {property.consumablesCost !== undefined
                ? `$${property.consumablesCost.toFixed(2)}`
                : '$0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Next Check-in:</Text>
            <Text style={styles.value}>
              {property.nextCheckinDate
                ? formatCheckinDate(property.nextCheckinDate)
                : 'N/A'}
            </Text>
          </View>
        </View>

        {property.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{property.notes}</Text>
          </View>
        )}

        {activeCleaners.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Currently Cleaning</Text>
            <View style={styles.cleanersList}>
              {activeCleaners.map((cleaner) => (
                <View key={cleaner.id} style={styles.cleanerItem}>
                  <CleanerBadge cleaner={cleaner} size="medium" />
                  <Text style={styles.cleanerName}>{cleaner.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.lostPropertyHeader}>
            <Text style={styles.sectionTitle}>Lost Property</Text>
            {reportedLostProperties.length > 0 && (
              <View style={styles.lostPropertyBadge}>
                <Text style={styles.lostPropertyBadgeText}>{reportedLostProperties.length}</Text>
              </View>
            )}
          </View>
          <View style={styles.lostPropertyButtons}>
            <TouchableOpacity
              style={styles.lostPropertyViewButton}
              onPress={() => router.push({ pathname: '/(main)/lost-property', params: { propertyId: id } })}
            >
              <Text style={styles.lostPropertyViewButtonText}>
                View Items ({lostProperties.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lostPropertyReportButton}
              onPress={() => router.push({ pathname: '/(main)/lost-property/report', params: { propertyId: id } })}
            >
              <Text style={styles.lostPropertyReportButtonText}>+ Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasActiveTimerElsewhere && !isCurrentlyCleaningThis && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              You must stop your current timer before starting a new property.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isCurrentlyCleaningThis ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/(main)/active')}
          >
            <Text style={styles.buttonText}>Continue Cleaning</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, hasActiveTimerElsewhere && styles.disabledButton]}
            onPress={handleStartCleaning}
            disabled={hasActiveTimerElsewhere}
          >
            <Text style={styles.buttonText}>Start Cleaning</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  propertyName: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 12,
  },
  guestCountBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  guestCountText: {
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
    color: '#1976D2',
  },
  cleanerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignSelf: 'center',
  },
  cleanerLabel: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#999',
  },
  cleanerNameText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  debugSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  debugTitle: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#996600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  debugLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  debugValue: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#996600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  notes: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  cleanersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cleanerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cleanerName: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  lostPropertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  lostPropertyBadge: {
    backgroundColor: theme.colors.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  lostPropertyBadgeText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  lostPropertyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  lostPropertyViewButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  lostPropertyViewButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  lostPropertyReportButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  lostPropertyReportButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#856404',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#1976D2',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
});
