import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { usePropertiesStore } from '@/stores/propertiesStore';
import { useMaintenanceStore } from '@/stores/maintenanceStore';
import { theme } from '@/constants/theme';
import type { MaintenanceCategory, MaintenancePriority } from '@/types';
import { MAINTENANCE_CATEGORY_LABELS } from '@/types';
import * as Haptics from 'expo-haptics';

const CATEGORIES: MaintenanceCategory[] = [
  'plumbing',
  'electrical',
  'appliance',
  'hvac',
  'structural',
  'furniture',
  'outdoor',
  'other',
];

export default function ReportMaintenanceScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const properties = usePropertiesStore((state) => state.properties);
  const addMaintenanceIssue = useMaintenanceStore((state) => state.addMaintenanceIssue);
  const isSyncing = useMaintenanceStore((state) => state.isSyncing);

  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setPriority('normal');
      setCategory(null);
      setShowCategoryPicker(false);
      setDescription('');
      setPhotoBase64(null);
      setError(null);
      setSuccess(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, [])
  );

  const property = properties.find((p) => p.id === propertyId);

  if (!property) {
    return null;
  }

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if wider than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Compress image: max 800px wide, 60% quality
        const compressed = await compressImage(file, 800, 0.6);
        setPhotoBase64(compressed);
        setError(null);
      } catch (e) {
        setError('Failed to process photo');
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available on web
    }

    setError(null);

    const result = await addMaintenanceIssue(
      {
        bookingId: property.id,
        category,
        priority,
        description: description.trim(),
      },
      photoBase64 || undefined
    );

    if (result.success) {
      setSuccess(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available on web
      }
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
      setError(result.error || 'Failed to report maintenance issue');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Maintenance Issue Reported</Text>
          <Text style={styles.successSubtext}>Returning...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid = category && description.trim() && !isSyncing;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Maintenance</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyLabel}>Property</Text>
          <Text style={styles.propertyName}>{property.name}</Text>
        </View>

        {/* Priority Toggle */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Priority *</Text>
          <View style={styles.priorityToggle}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'normal' && styles.priorityButtonActive,
              ]}
              onPress={() => setPriority('normal')}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === 'normal' && styles.priorityButtonTextActive,
                ]}
              >
                Normal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                priority === 'urgent' && styles.priorityButtonUrgent,
              ]}
              onPress={() => setPriority('urgent')}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === 'urgent' && styles.priorityButtonTextActive,
                ]}
              >
                Urgent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Picker */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Category *</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text
              style={[
                styles.categorySelectorText,
                !category && styles.categorySelectorPlaceholder,
              ]}
            >
              {category ? MAINTENANCE_CATEGORY_LABELS[category] : 'Select a category...'}
            </Text>
            <Text style={styles.categorySelectorArrow}>
              {showCategoryPicker ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={styles.categoryList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {MAINTENANCE_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Photo */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Photo (optional)</Text>

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          )}

          {photoBase64 ? (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: photoBase64 }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={handleRemovePhoto}
              >
                <Text style={styles.removePhotoText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => fileInputRef.current?.click()}
            >
              <Text style={styles.photoButtonIcon}>📷</Text>
              <Text style={styles.photoButtonText}>Take or Choose Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !isFormValid && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!isFormValid}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Report Maintenance Issue</Text>
          )}
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
    marginBottom: 20,
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
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  // Priority toggle styles
  priorityToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  priorityButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  priorityButtonUrgent: {
    backgroundColor: theme.colors.error,
  },
  priorityButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  // Category picker styles
  categorySelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySelectorText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
  },
  categorySelectorPlaceholder: {
    color: '#999',
  },
  categorySelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  categoryList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  categoryOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  categoryOptionText: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
  },
  categoryOptionTextSelected: {
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.primary,
  },
  // Text input styles
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: theme.colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  // Photo styles
  photoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito_600SemiBold',
    color: '#666',
  },
  photoPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhotoButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  removePhotoText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.error,
  },
  // Error and footer styles
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: theme.colors.error,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
    color: '#FFFFFF',
  },
  // Success styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    fontSize: 64,
    color: theme.colors.success,
    marginBottom: 16,
  },
  successText: {
    fontSize: 24,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
  },
});
