import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { PropertyWithStatus } from '@/types';
import { PropertyStatus } from '@/types';
import { CleanerBadge } from './CleanerBadge';
import { formatCheckinDate, formatHoursAndMinutes } from '@/utils/time';
import { theme } from '@/constants/theme';

interface PropertyCardProps {
  property: PropertyWithStatus;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const handlePress = () => {
    router.push(`/(main)/property/${property.id}`);
  };

  const getStatusColor = () => {
    switch (property.status) {
      case PropertyStatus.COMPLETED:
        return '#4CAF50';
      case PropertyStatus.IN_PROGRESS:
        return '#FF9800';
      case PropertyStatus.PENDING:
      default:
        return '#757575';
    }
  };

  const getStatusText = () => {
    switch (property.status) {
      case PropertyStatus.COMPLETED:
        return 'Completed';
      case PropertyStatus.IN_PROGRESS:
        return 'In Progress';
      case PropertyStatus.PENDING:
      default:
        return 'Pending';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.address}>{property.address}</Text>
        </View>
        {property.status !== PropertyStatus.PENDING && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        )}
      </View>

      {property.nextCheckinDate && (
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Next check-in:</Text>
          <Text style={styles.timeValue}>{formatCheckinDate(property.nextCheckinDate)}</Text>
        </View>
      )}

      {(property.cleaningTime !== undefined && property.cleaningTime > 0) ||
       (property.consumablesCost !== undefined && property.consumablesCost > 0) ? (
        <View style={styles.summarySection}>
          {property.cleaningTime !== undefined && property.cleaningTime > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>⏱</Text>
              <Text style={styles.summaryText}>
                {formatHoursAndMinutes(property.cleaningTime)}
              </Text>
            </View>
          )}
          {property.consumablesCost !== undefined && property.consumablesCost > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>💰</Text>
              <Text style={styles.summaryText}>
                ${property.consumablesCost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {property.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {property.notes}
        </Text>
      )}

      {property.activeCleaners.length > 0 && (
        <View style={styles.cleanersSection}>
          <Text style={styles.cleanersLabel}>Cleaning now:</Text>
          <View style={styles.cleanersList}>
            {property.activeCleaners.map((cleaner) => (
              <View key={cleaner.id} style={styles.cleanerItem}>
                <CleanerBadge cleaner={cleaner} size="small" />
                <Text style={styles.cleanerName}>{cleaner.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  propertyName: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginRight: 8,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FF5722',
  },
  summarySection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryIcon: {
    fontSize: 14,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  notes: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cleanersSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cleanersLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  cleanersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cleanerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cleanerName: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.text,
  },
});
