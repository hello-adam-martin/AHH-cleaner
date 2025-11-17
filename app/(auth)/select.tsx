import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useCleanerStore } from '@/stores/cleanerStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useHistoryStore } from '@/stores/historyStore';
import { theme } from '@/constants/theme';
import type { Cleaner } from '@/types';
import { storageHelpers } from '@/services/storage';
import { initializeApp } from '@/services/initializeApp';

export default function SelectCleanerScreen() {
  const { cleaners, selectCleaner } = useCleanerStore();

  const handleSelectCleaner = (cleaner: Cleaner) => {
    selectCleaner(cleaner);
    router.replace('/(main)/properties');
  };

  const handleClearStorage = async () => {
    // Reset all stores to initial state
    useCleanerStore.getState().reset();
    usePropertiesStore.getState().reset();
    useSessionStore.getState().reset();
    useHistoryStore.getState().reset();

    // Clear storage and wait for it to complete
    await storageHelpers.clear();

    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      // Re-initialize app with seed data
      initializeApp();
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.debugButton}
        onPress={handleClearStorage}
        activeOpacity={0.7}
      >
        <Text style={styles.debugButtonText}>Clear & Reload</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Select your name to continue</Text>

        <View style={styles.cleanerList}>
          {cleaners.map((cleaner) => (
            <TouchableOpacity
              key={cleaner.id}
              style={styles.cleanerButton}
              onPress={() => handleSelectCleaner(cleaner)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: cleaner.avatarColor },
                ]}
              >
                <Text style={styles.avatarText}>
                  {cleaner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cleanerName}>{cleaner.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugButtonText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  cleanerList: {
    gap: 16,
  },
  cleanerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  cleanerName: {
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
});
