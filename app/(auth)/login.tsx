import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useCleanerStore } from '@/stores/cleanerStore';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { CleanerBadge } from '@/components/CleanerBadge';
import { theme } from '@/constants/theme';
import type { Cleaner } from '@/types';

export default function LoginScreen() {
  const cleaners = useCleanerStore((state) => state.cleaners);
  const login = useAuthStore((state) => state.login);
  const refreshFromAirtable = usePropertiesStore((state) => state.refreshFromAirtable);

  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when screen comes into focus (after logout)
  useFocusEffect(
    useCallback(() => {
      setSelectedCleaner(null);
      setPin('');
      setError('');
      setIsLoading(false);
    }, [])
  );

  const handleCleanerSelect = (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setPin('');
    setError('');
  };

  const handlePinPress = (digit: string) => {
    if (isLoading) return; // Prevent input during loading

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isLoading) return; // Prevent input during loading

    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (pinToSubmit: string = pin) => {
    if (!selectedCleaner || pinToSubmit.length !== 4 || isLoading) return;

    const success = login(selectedCleaner, pinToSubmit);

    if (success) {
      setIsLoading(true);
      // Refresh properties data from Airtable on successful login
      await refreshFromAirtable();
      setIsLoading(false);
      router.replace('/(main)/properties');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleBack = () => {
    setSelectedCleaner(null);
    setPin('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Akaroa Holiday Homes</Text>
        <Text style={styles.subtitle}>Cleaner App</Text>

        {!selectedCleaner && (
          <View style={styles.selectionContainer}>
            <Text style={styles.prompt}>Who are you?</Text>
            <View style={styles.cleanersList}>
              {cleaners.map((cleaner) => (
                <TouchableOpacity
                  key={cleaner.id}
                  style={styles.cleanerButton}
                  onPress={() => handleCleanerSelect(cleaner)}
                  activeOpacity={0.7}
                >
                  <CleanerBadge cleaner={cleaner} size="large" />
                  <Text style={styles.cleanerName}>{cleaner.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedCleaner && (
          <View style={styles.pinContainer}>
            <TouchableOpacity onPress={handleBack} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.selectedCleanerInfo}>
              <CleanerBadge cleaner={selectedCleaner} size="large" />
              <Text style={styles.selectedCleanerName}>{selectedCleaner.name}</Text>
            </View>

            <Text style={styles.pinPrompt}>Enter your PIN</Text>

            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    pin.length > index && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading Schedule</Text>
              </View>
            )}

            {!isLoading && error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {!isLoading && !error && (
              <View style={styles.spacer} />
            )}

            <View style={[styles.keypad, isLoading && styles.keypadHidden]}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handlePinPress(String(num))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.keypadButton} />
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={() => handlePinPress('0')}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.keypadButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={handleBackspace}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.keypadButtonText}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 60,
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  prompt: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  cleanersList: {
    gap: 16,
  },
  cleanerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cleanerName: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginLeft: 16,
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    position: 'absolute',
    top: 20,
    left: 0,
  },
  backLinkText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.primary,
  },
  selectedCleanerInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  selectedCleanerName: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginTop: 12,
  },
  pinPrompt: {
    fontSize: 18,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    marginBottom: 20,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCC',
  },
  pinDotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    height: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.primary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#F44336',
    marginBottom: 20,
    height: 40,
  },
  spacer: {
    height: 40,
    marginBottom: 20,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
  },
  keypadHidden: {
    opacity: 0,
  },
  keypadButton: {
    width: 72,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keypadButtonText: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
});
