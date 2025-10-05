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
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '!';
      case 'info':
      default: return 'i';
    }
  };

  const getColorForType = () => {
    switch (type) {
      case 'success': return '#6B6B6B';
      case 'error': return '#6B6B6B';
      case 'warning': return '#6B6B6B';
      case 'info':
      default: return '#6B6B6B';
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
          
          <View style={[styles.buttonContainer, !showCancel && styles.singleButtonContainer]}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, !showCancel && styles.singleButton]}
              onPress={handleConfirm}
              activeOpacity={0.8}
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    width: width > 400 ? 320 : width - 40,
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  singleButtonContainer: {
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 90,
  },
  singleButton: {
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#6B6B6B',
  },
});

export default CustomAlert;
export { isValidImageUrl, DogImage };