import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import type { LostPropertyItem } from '@/types';
import { theme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface LostPropertyCardProps {
  item: LostPropertyItem;
  canResolve: boolean;
  onResolve: () => void;
  isResolving: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function LostPropertyCard({
  item,
  canResolve,
  onResolve,
  isResolving,
}: LostPropertyCardProps) {
  const handleResolve = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available on web
    }
    onResolve();
  };

  const isResolved = item.status === 'resolved';

  return (
    <View style={[styles.container, isResolved && styles.containerResolved]}>
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              isResolved ? styles.statusDotResolved : styles.statusDotReported,
            ]}
          />
          <Text style={styles.statusText}>
            {isResolved ? 'Resolved' : 'Reported'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.reportedAt)}</Text>
      </View>

      <View style={styles.content}>
        {item.photoUrl && (
          <Image
            source={{ uri: item.photoUrl }}
            style={styles.photo}
            contentFit="cover"
          />
        )}
        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.reporterText}>
            Reported by {item.cleanerName}
          </Text>
        </View>
      </View>

      {canResolve && (
        <TouchableOpacity
          style={styles.resolveButton}
          onPress={handleResolve}
          disabled={isResolving}
        >
          {isResolving ? (
            <ActivityIndicator size="small" color={theme.colors.success} />
          ) : (
            <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
          )}
        </TouchableOpacity>
      )}

      {isResolved && item.resolvedAt && (
        <Text style={styles.resolvedText}>
          Resolved {formatDate(item.resolvedAt)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  containerResolved: {
    borderLeftColor: theme.colors.success,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotReported: {
    backgroundColor: theme.colors.warning,
  },
  statusDotResolved: {
    backgroundColor: theme.colors.success,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  details: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reporterText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
  resolveButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.success,
    alignItems: 'center',
  },
  resolveButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.success,
  },
  resolvedText: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
    fontStyle: 'italic',
  },
});
