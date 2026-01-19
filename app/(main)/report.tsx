import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { CleanerBadge } from '@/components/CleanerBadge';
import { theme } from '@/constants/theme';

export default function ReportScreen() {
  const authenticatedCleaner = useAuthStore((state) => state.authenticatedCleaner);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report an Issue</Text>
        {authenticatedCleaner && (
          <View style={styles.cleanerInfo}>
            <CleanerBadge cleaner={authenticatedCleaner} size="small" />
            <Text style={styles.cleanerName}>{authenticatedCleaner.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => router.push('/(main)/lost-property/report')}
        >
          <Text style={styles.reportIcon}>📦</Text>
          <View style={styles.reportCardContent}>
            <Text style={styles.reportCardTitle}>Lost Property</Text>
            <Text style={styles.reportCardDescription}>
              Report an item left behind by a guest
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportCard, styles.reportCardMaintenance]}
          onPress={() => router.push('/(main)/maintenance/report')}
        >
          <Text style={styles.reportIcon}>🔧</Text>
          <View style={styles.reportCardContent}>
            <Text style={styles.reportCardTitle}>Maintenance Issue</Text>
            <Text style={styles.reportCardDescription}>
              Report something that needs repair or attention
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
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
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  cleanerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cleanerName: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardMaintenance: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  reportIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  reportCardContent: {
    flex: 1,
  },
  reportCardTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reportCardDescription: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
  chevron: {
    fontSize: 24,
    color: '#CCC',
    marginLeft: 12,
  },
});
