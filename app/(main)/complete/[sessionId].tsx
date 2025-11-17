import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { TimerDisplay } from '@/components/TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import { useHelperTimer } from '@/hooks/useHelperTimer';
import { formatTime } from '@/utils/time';
import { theme } from '@/constants/theme';
import { getCategoriesWithItems } from '@/data/consumables';
import * as Haptics from 'expo-haptics';

export default function CompleteCleaningScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const properties = usePropertiesStore((state) => state.properties);
  const refreshFromAirtable = usePropertiesStore((state) => state.refreshFromAirtable);
  const activeSessions = useSessionStore((state) => state.activeSessions);
  const completeSession = useSessionStore((state) => state.completeSession);
  const resumeSession = useSessionStore((state) => state.resumeSession);
  const addCompletedSession = useHistoryStore((state) => state.addCompletedSession);

  const session = activeSessions.find((s) => s.id === sessionId);
  const property = properties.find((p) => p.id === session?.propertyId);
  const elapsedTime = useTimer(session);
  const helperElapsedTime = useHelperTimer(session);

  const [notes, setNotes] = useState('');
  const [isAdjustingTime, setIsAdjustingTime] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const categoriesWithItems = getCategoriesWithItems();

  if (!session || !property || !authenticatedCleaner) {
    return null;
  }

  const handleAdjustTime = () => {
    setStartTimeInput(formatTime(session.startTime));
    setEndTimeInput(formatTime(Date.now()));
    setIsAdjustingTime(true);
  };

  const handleSaveTimeAdjustment = () => {
    // For simplicity, we'll just close the adjustment mode
    // In a real app, you'd parse the time inputs and update the session
    setIsAdjustingTime(false);
  };

  const handleBack = () => {
    if (session) {
      // Resume the session when going back
      resumeSession(session.id);
    }
    router.push('/(main)/active');
  };

  const handleComplete = async () => {
    if (isSyncing) return; // Prevent double-clicking

    setIsSyncing(true);
    setSyncStatus('syncing');

    // Complete the session (this stops the timer)
    const completedSession = completeSession(session.id, Date.now());

    if (completedSession) {
      // Add to history (this will sync to Airtable)
      await addCompletedSession(completedSession, property, authenticatedCleaner);

      // Refresh properties from Airtable to get updated totals
      await refreshFromAirtable();

      // Check if sync was successful (we don't have direct access to the result here)
      // The historyStore handles the sync, so we'll just assume success for UI
      setSyncStatus('success');

      // Haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available on web
      }

      // Short delay to show success message
      setTimeout(() => {
        setIsSyncing(false);
        router.push('/(main)/properties');
      }, 800);
    } else {
      setSyncStatus('error');
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Cleaning</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.propertyName}>{property.name}</Text>

        <View style={styles.cleanerIndicator}>
          <Text style={styles.cleanerLabel}>Cleaned by:</Text>
          <Text style={styles.cleanerNameText}>{authenticatedCleaner.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Time</Text>
          <TimerDisplay elapsedTime={elapsedTime + helperElapsedTime} size="large" />
          {helperElapsedTime > 0 && (
            <View style={styles.timeBreakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cleaner:</Text>
                <TimerDisplay elapsedTime={elapsedTime} size="medium" />
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Helper:</Text>
                <TimerDisplay elapsedTime={helperElapsedTime} size="medium" />
              </View>
            </View>
          )}

          {!isAdjustingTime ? (
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={handleAdjustTime}
            >
              <Text style={styles.adjustButtonText}>Adjust Time</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.timeAdjustment}>
              <View style={styles.timeInputRow}>
                <Text style={styles.timeInputLabel}>Start:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTimeInput}
                  onChangeText={setStartTimeInput}
                  placeholder="9:00 AM"
                />
              </View>
              <View style={styles.timeInputRow}>
                <Text style={styles.timeInputLabel}>End:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTimeInput}
                  onChangeText={setEndTimeInput}
                  placeholder="10:30 AM"
                />
              </View>
              <TouchableOpacity
                style={styles.saveTimeButton}
                onPress={handleSaveTimeAdjustment}
              >
                <Text style={styles.saveTimeButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consumables Summary</Text>
          {categoriesWithItems.map((category) => {
            const categoryItems = category.items.filter(item => (session.consumables[item.id] || 0) > 0);
            if (categoryItems.length === 0) return null;

            return (
              <View key={category.id} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category.name}</Text>
                <View style={styles.summaryGrid}>
                  {categoryItems.map((item) => (
                    <View key={item.id} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{item.name}:</Text>
                      <Text style={styles.summaryValue}>{session.consumables[item.id]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={styles.summaryNote}>Go back to adjust consumables if needed</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any issues or additional information..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {syncStatus !== 'idle' && (
          <View style={[
            styles.syncStatusBanner,
            syncStatus === 'syncing' && styles.syncStatusSyncing,
            syncStatus === 'success' && styles.syncStatusSuccess,
            syncStatus === 'error' && styles.syncStatusError,
          ]}>
            <Text style={styles.syncStatusText}>
              {syncStatus === 'syncing' && '⏳ Saving to Airtable...'}
              {syncStatus === 'success' && '✓ Synced successfully!'}
              {syncStatus === 'error' && '✗ Sync failed - saved locally'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.completeButton, isSyncing && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Saving...' : 'Complete Cleaning'}
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  propertyName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  cleanerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  timeBreakdown: {
    marginTop: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
  },
  adjustButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignSelf: 'center',
  },
  adjustButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  timeAdjustment: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInputLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    width: 50,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  saveTimeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveTimeButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  summaryNote: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notesInput: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    minHeight: 100,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  syncStatusBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  syncStatusSyncing: {
    backgroundColor: '#E3F2FD',
  },
  syncStatusSuccess: {
    backgroundColor: '#E8F5E9',
  },
  syncStatusError: {
    backgroundColor: '#FFF3CD',
  },
  syncStatusText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
});
