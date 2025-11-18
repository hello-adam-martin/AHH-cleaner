import { View, Text, StyleSheet } from 'react-native';
import type { Cleaner } from '@/types';

interface CleanerBadgeProps {
  cleaner: Cleaner;
  size?: 'small' | 'medium';
}

export function CleanerBadge({ cleaner, size = 'small' }: CleanerBadgeProps) {
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: cleaner.avatarColor },
        isSmall ? styles.avatarSmall : styles.avatarMedium,
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          isSmall ? styles.avatarTextSmall : styles.avatarTextMedium,
        ]}
      >
        {cleaner.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  avatarSmall: {
    width: 28,
    height: 28,
  },
  avatarMedium: {
    width: 40,
    height: 40,
  },
  avatarText: {
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  avatarTextSmall: {
    fontSize: 12,
  },
  avatarTextMedium: {
    fontSize: 18,
  },
});
