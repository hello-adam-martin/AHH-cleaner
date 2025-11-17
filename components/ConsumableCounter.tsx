import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface ConsumableCounterProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function ConsumableCounter({
  label,
  value,
  onIncrement,
  onDecrement,
}: ConsumableCounterProps) {
  const handleIncrement = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics not available on web
    }
    onIncrement();
  };

  const handleDecrement = async () => {
    if (value > 0) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Haptics not available on web
      }
      onDecrement();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, value === 0 && styles.buttonDisabled]}
          onPress={handleDecrement}
          disabled={value === 0}
        >
          <Text style={[styles.buttonText, value === 0 && styles.buttonTextDisabled]}>
            −
          </Text>
        </TouchableOpacity>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleIncrement}>
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#999',
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
});
