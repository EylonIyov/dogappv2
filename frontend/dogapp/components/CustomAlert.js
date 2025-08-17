import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

// Utility function to validate image URLs
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Remove common invalid values
  const invalidValues = ['', '/', 'null', 'undefined', 'none', 'N/A'];
  if (invalidValues.includes(url.toLowerCase().trim())) return false;
  
  // Check if it's a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    // If URL constructor fails, check for relative paths or other valid formats
    return url.startsWith('/') || url.startsWith('./') || url.startsWith('http') || url.startsWith('data:');
  }
};

// Enhanced Image component with better error handling for web
const DogImage = ({ source, style, placeholder = '🐕', ...props }) => {
  if (!source?.uri || !isValidImageUrl(source.uri)) {
    return <Text style={[style, { textAlign: 'center', textAlignVertical: 'center' }]}>{placeholder}</Text>;
  }

  return (
    <Image
      source={source}
      style={style}
      contentFit="cover"
      cachePolicy={Platform.OS === 'web' ? 'none' : 'memory-disk'}
      placeholder={placeholder}
      transition={200}
      onError={(error) => {
        console.log('❌ Image load error:', source.uri, error);
      }}
      onLoad={() => {
        console.log('✅ Image loaded successfully:', source.uri);
      }}
      {...props}
    />
  );
};

const CustomAlert = ({ 
  visible, 
  title, 
  message, 
  onClose,
  onConfirm, // New prop for confirmation actions
  type = 'info', // 'success', 'error', 'warning', 'info'
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false // Show cancel button for confirmations
}) => {
  const getIconForType = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  };

  const getColorForType = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#FF6B6B';
      case 'warning': return '#FF9800';
      case 'info':
      default: return '#4A90E2';
    }
  };

  if (!visible) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={[styles.iconContainer, { backgroundColor: getColorForType() }]}>
            <Text style={styles.icon}>{getIconForType()}</Text>
          </View>
          
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: getColorForType() }]}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width > 400 ? 350 : width - 40,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 30,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#CCCCCC',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CustomAlert;
export { isValidImageUrl, DogImage };