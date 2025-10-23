import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

// Utility function to validate image URLs
const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  // Remove common invalid values
  const invalidValues = ["", "/", "null", "undefined", "none", "N/A"];
  const trimmedUrl = url.toLowerCase().trim();
  if (invalidValues.includes(trimmedUrl)) return false;

  // Check for minimum length (S3 URLs are quite long)
  if (url.length < 10) return false;

  // Check if it's a valid URL format (including S3 presigned URLs with query params)
  try {
    new URL(url);
    return true;
  } catch {
    // If URL constructor fails, check for other valid formats
    return (
      url.startsWith("/") ||
      url.startsWith("./") ||
      url.startsWith("http") ||
      url.startsWith("https") ||
      url.startsWith("data:")
    );
  }
};

// Enhanced Image component with better error handling and caching
const DogImage = ({ source, style, placeholder = "🐕", ...props }) => {
  const [hasError, setHasError] = React.useState(false);
  const [imageKey, setImageKey] = React.useState(0);

  // Check if URL is valid
  const isValid = source?.uri && isValidImageUrl(source.uri);

  // Log the full URL for debugging
  React.useEffect(() => {
    if (source?.uri) {
      console.log("🖼️ DogImage received URL:", source.uri);
      // Check if URL has expired by looking at the timestamp
      try {
        const url = new URL(source.uri);
        const dateParam = url.searchParams.get("X-Amz-Date");
        const expiresParam = url.searchParams.get("X-Amz-Expires");
        if (dateParam && expiresParam) {
          const year = dateParam.substring(0, 4);
          const month = dateParam.substring(4, 6);
          const day = dateParam.substring(6, 8);
          const signDate = new Date(`${year}-${month}-${day}`);
          const expiresSeconds = parseInt(expiresParam);
          const expiryDate = new Date(
            signDate.getTime() + expiresSeconds * 1000
          );
          const now = new Date();
          console.log(`📅 URL signed on: ${signDate.toLocaleString()}`);
          console.log(`⏰ URL expires on: ${expiryDate.toLocaleString()}`);
          console.log(`⏱️ Current time: ${now.toLocaleString()}`);
          console.log(
            `${
              now > expiryDate ? "❌ URL HAS EXPIRED" : "✅ URL is still valid"
            }`
          );
        }
      } catch (e) {
        console.log("⚠️ Could not parse URL date");
      }
    }
  }, [source?.uri]);

  if (!isValid || hasError) {
    return (
      <View
        style={[
          style,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#E0E0E0",
          },
        ]}
      >
        <Text
          style={{
            fontSize: style?.width ? style.width * 0.4 : 28,
            textAlign: "center",
          }}
        >
          {placeholder}
        </Text>
      </View>
    );
  }

  // For web platform, use native img element for better S3 URL support
  if (Platform.OS === "web") {
    // Create a container div to hold the img
    const containerStyle = {
      width: style?.width || 50,
      height: style?.height || 50,
      borderRadius: style?.borderRadius || 0,
      overflow: "hidden",
      backgroundColor: "#E0E0E0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    const imgStyle = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: hasError ? "none" : "block",
    };

    return (
      <div style={containerStyle}>
        <img
          key={imageKey}
          src={source.uri}
          style={imgStyle}
          alt={placeholder}
          onLoad={() => {
            console.log("✅ Image loaded successfully");
            setHasError(false);
          }}
          onError={(error) => {
            console.error(
              "❌ Image failed to load:",
              source.uri?.substring(0, 80)
            );
            console.error("Full error:", error);
            // Try to test the URL directly
            console.log(
              "🔗 Try opening this URL directly in browser:",
              source.uri
            );
            setHasError(true);
          }}
        />
        {hasError && (
          <Text
            style={{
              fontSize: containerStyle.width * 0.4,
              textAlign: "center",
            }}
          >
            {placeholder}
          </Text>
        )}
      </div>
    );
  }

  // For native platforms, use expo-image
  return (
    <Image
      key={imageKey}
      source={source}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      placeholder={placeholder}
      transition={200}
      onError={(error) => {
        console.log("❌ Image load error");
        setHasError(true);
      }}
      onLoad={() => {
        setHasError(false);
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
  type = "info", // 'success', 'error', 'warning', 'info'
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false, // Show cancel button for confirmations
}) => {
  const getIconForType = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "!";
      case "info":
      default:
        return "i";
    }
  };

  const getColorForType = () => {
    switch (type) {
      case "success":
        return "#6B6B6B";
      case "error":
        return "#6B6B6B";
      case "warning":
        return "#6B6B6B";
      case "info":
      default:
        return "#6B6B6B";
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
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: getColorForType() },
            ]}
          >
            <Text style={styles.icon}>{getIconForType()}</Text>
          </View>

          {title && <Text style={styles.title}>{title}</Text>}

          <Text style={styles.message}>{message}</Text>

          <View
            style={[
              styles.buttonContainer,
              !showCancel && styles.singleButtonContainer,
            ]}
          >
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
              style={[
                styles.button,
                styles.confirmButton,
                !showCancel && styles.singleButton,
              ]}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 20,
    width: width > 400 ? 320 : width - 40,
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  singleButtonContainer: {
    justifyContent: "center",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 90,
  },
  singleButton: {
    alignSelf: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#333333",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "#6B6B6B",
  },
});

export default CustomAlert;
export { isValidImageUrl, DogImage };
