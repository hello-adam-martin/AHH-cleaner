import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { PropertyWithStatus } from '@/types';
import { PropertyStatus } from '@/types';
import { formatCheckinDate, formatHoursAndMinutes } from '@/utils/time';
import { theme } from '@/constants/theme';

interface PropertyCardProps {
  property: PropertyWithStatus;
  onQuickStart?: (propertyId: string) => void;
  canQuickStart?: boolean;
}

export function PropertyCard({ property, onQuickStart, canQuickStart = true }: PropertyCardProps) {
  const handlePress = () => {
    // Pending: start cleaning immediately
    if (property.status === PropertyStatus.PENDING && onQuickStart && canQuickStart) {
      onQuickStart(property.id);
      return;
    }
    // In Progress: go to active screen
    if (property.status === PropertyStatus.IN_PROGRESS) {
      router.push('/(main)/active');
      return;
    }
    // Completed: go to property details
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
      style={[styles.card, property.isBlocked && styles.blockedCard]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.address}>{property.address}</Text>
        </View>
        <View style={styles.headerRight}>
          {property.isBlocked && (
            <View style={styles.blockedBadge}>
              <Text style={styles.blockedBadgeText}>
                {property.blockedReason || 'Blocked'}
              </Text>
            </View>
          )}
          {property.isOverdue && !property.isBlocked && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>Overdue</Text>
            </View>
          )}
          {property.syncStatus === 'pending' && (
            <View style={styles.syncPendingBadge}>
              <Text style={styles.syncPendingText}>Not synced</Text>
            </View>
          )}
          {property.syncStatus === 'synced' && (
            <View style={styles.syncedBadge}>
              <Text style={styles.syncedText}>Synced</Text>
            </View>
          )}
          {property.status === PropertyStatus.IN_PROGRESS && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          )}
          {property.status === PropertyStatus.COMPLETED && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Booking Info */}
      {!property.isBlocked && (property.guestCount || property.nextCheckinDate) && (
        <View style={styles.bookingInfo}>
          {property.guestCount !== undefined && property.guestCount > 0 && (
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabelOut}>OUT</Text>
              <Text style={styles.bookingValue}>
                {property.guestCount} {property.guestCount === 1 ? 'guest' : 'guests'}
              </Text>
            </View>
          )}
          {property.nextCheckinDate && (
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabelIn}>IN</Text>
              <Text style={styles.bookingValue}>
                {property.nextGuestCount ? `${property.nextGuestCount} ${property.nextGuestCount === 1 ? 'guest' : 'guests'}` : 'TBC'}
                {property.nextCheckoutDate && property.nextCheckinDate && (() => {
                  const checkin = new Date(property.nextCheckinDate);
                  const checkout = new Date(property.nextCheckoutDate);
                  const nights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
                  return nights > 0 ? ` • ${nights}n` : '';
                })()}
              </Text>
              <Text style={styles.checkinTime}>{formatCheckinDate(property.nextCheckinDate)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Cleaning stats (only show if already cleaned) */}
      {((property.cleaningTime !== undefined && property.cleaningTime > 0) ||
       (property.consumablesCost !== undefined && property.consumablesCost > 0)) ? (
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
  blockedCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  blockedBadge: {
    backgroundColor: '#FF8F00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  blockedBadgeText: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  overdueBadge: {
    backgroundColor: '#E65100',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  overdueText: {
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  syncPendingBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  syncPendingText: {
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    color: '#FFFFFF',
  },
  syncedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  syncedText: {
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    color: '#4CAF50',
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
  bookingInfo: {
    marginBottom: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingLabelOut: {
    backgroundColor: '#EF5350',
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  bookingLabelIn: {
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  bookingValue: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#333',
  },
  checkinTime: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    marginLeft: 'auto',
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
});
