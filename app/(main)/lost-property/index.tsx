import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useLostPropertyStore } from '@/stores/lostPropertyStore';
import { LostPropertyCard } from '@/components/LostPropertyCard';
import { theme } from '@/constants/theme';

export default function LostPropertyListScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);
  const properties = usePropertiesStore((state) => state.properties);
  const getLostPropertiesForProperty = useLostPropertyStore(
    (state) => state.getLostPropertiesForProperty
  );
  const resolveLostProperty = useLostPropertyStore((state) => state.resolveLostProperty);
  const isSyncing = useLostPropertyStore((state) => state.isSyncing);

  const property = properties.find((p) => p.id === propertyId);
  const lostProperties = propertyId ? getLostPropertiesForProperty(propertyId) : [];

  // Sort by date, most recent first, unreported items first
  const sortedLostProperties = [...lostProperties].sort((a, b) => {
    // First sort by status (reported before resolved)
    if (a.status !== b.status) {
      return a.status === 'reported' ? -1 : 1;
    }
    // Then by date, most recent first
    return b.reportedAt - a.reportedAt;
  });

  if (!property || !authenticatedCleaner) {
    return null;
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleReportNew = () => {
    router.push({ pathname: '/(main)/lost-property/report', params: { propertyId } });
  };

  const handleResolve = async (itemId: string) => {
    await resolveLostProperty(itemId, authenticatedCleaner.id);
  };

  const reportedCount = lostProperties.filter((p) => p.status === 'reported').length;
  const resolvedCount = lostProperties.filter((p) => p.status === 'resolved').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lost Property</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyLabel}>Property</Text>
          <Text style={styles.propertyName}>{property.name}</Text>
        </View>

        {lostProperties.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reportedCount}</Text>
              <Text style={styles.statLabel}>Reported</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{resolvedCount}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
        )}

        {sortedLostProperties.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Lost Property</Text>
            <Text style={styles.emptyText}>
              No items have been reported as left behind at this property.
            </Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            {sortedLostProperties.map((item) => (
              <LostPropertyCard
                key={item.id}
                item={item}
                canResolve={item.cleanerId === authenticatedCleaner.id && item.status === 'reported'}
                onResolve={() => handleResolve(item.id)}
                isResolving={isSyncing}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.reportButton} onPress={handleReportNew}>
          <Text style={styles.reportButtonText}>+ Report New Item</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
    minWidth: 60,
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
  headerSpacer: {
    minWidth: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  propertyInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  propertyLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  listSection: {
    gap: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  reportButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
});
