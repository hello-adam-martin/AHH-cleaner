import { View, Text, StyleSheet } from 'react-native';
import { formatDuration } from '@/utils/time';

interface TimerDisplayProps {
  elapsedTime: number;
  size?: 'small' | 'large';
}

export function TimerDisplay({ elapsedTime, size = 'large' }: TimerDisplayProps) {
  const isLarge = size === 'large';

  const totalSeconds = Math.floor(elapsedTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.timeContainer}>
        <Text style={[styles.timeDigits, isLarge ? styles.timeLarge : styles.timeSmall]}>
          {formatNumber(hours)}
        </Text>
        <Text style={[styles.separator, isLarge ? styles.separatorLarge : styles.separatorSmall]}>
          :
        </Text>
        <Text style={[styles.timeDigits, isLarge ? styles.timeLarge : styles.timeSmall]}>
          {formatNumber(minutes)}
        </Text>
        <Text style={[styles.separator, isLarge ? styles.separatorLarge : styles.separatorSmall]}>
          :
        </Text>
        <Text style={[styles.timeDigits, isLarge ? styles.timeLarge : styles.timeSmall]}>
          {formatNumber(seconds)}
        </Text>
      </View>
      {isLarge && (
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>HRS</Text>
          <Text style={[styles.label, styles.labelMiddle]}>MIN</Text>
          <Text style={styles.label}>SEC</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDigits: {
    fontFamily: 'Nunito_700Bold',
    color: '#000000',
  },
  timeLarge: {
    fontSize: 56,
  },
  timeSmall: {
    fontSize: 24,
  },
  separator: {
    fontFamily: 'Nunito_700Bold',
    color: '#000000',
  },
  separatorLarge: {
    fontSize: 56,
    marginHorizontal: 4,
  },
  separatorSmall: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  labelsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    width: '100%',
    justifyContent: 'space-around',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#999',
    letterSpacing: 1,
  },
  labelMiddle: {
    marginRight: 8,
  },
});
