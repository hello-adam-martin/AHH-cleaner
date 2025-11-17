import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useCleanerStore } from '@/stores/cleanerStore';
import { useAuthStore } from '@/stores/authStore';
import { CleanerBadge } from '@/components/CleanerBadge';
import { theme } from '@/constants/theme';
import type { Cleaner } from '@/types';

export default function LoginScreen() {
  const cleaners = useCleanerStore((state) => state.cleaners);
  const login = useAuthStore((state) => state.login);

  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Reset state when screen comes into focus (after logout)
  useFocusEffect(
    useCallback(() => {
      console.log('Login screen focused - resetting state');
      setSelectedCleaner(null);
      setPin('');
      setError('');
    }, [])
  );

  const handleCleanerSelect = (cleaner: Cleaner) => {
    console.log('Cleaner selected:', cleaner.name);
    setSelectedCleaner(cleaner);
    setPin('');
    setError('');
  };

  const handlePinPress = (digit: string) => {
    console.log('PIN press:', digit, 'current PIN length:', pin.length);
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        console.log('Auto-submitting PIN');
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = (pinToSubmit: string = pin) => {
    console.log('Submitting PIN for:', selectedCleaner?.name);
    if (!selectedCleaner || pinToSubmit.length !== 4) return;

    const success = login(selectedCleaner, pinToSubmit);

    if (success) {
      // Navigate to main app
      console.log('Login successful');
      router.replace('/(main)/properties');
    } else {
      console.log('Login failed');
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleBack = () => {
    console.log('Back button pressed - clearing selection');
    setSelectedCleaner(null);
    setPin('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Akaroa Holiday Homes</Text>
        <Text style={styles.subtitle}>Cleaner App</Text>

        {!selectedCleaner ? (
          // Name Selection Screen
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
        ) : (
          // PIN Entry Screen
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

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.keypad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handlePinPress(String(num))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.keypadButton} />
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={() => handlePinPress('0')}
                activeOpacity={0.7}
              >
                <Text style={styles.keypadButtonText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={handleBackspace}
                activeOpacity={0.7}
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
  errorText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#F44336',
    marginBottom: 20,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
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
