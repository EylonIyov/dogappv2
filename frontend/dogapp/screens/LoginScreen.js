import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { alertState, hideAlert, showError } = useAlerts();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        showError(result.error || 'Login failed', 'Login Error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred. Please try again.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headingLineWrapper}>
            <Text style={styles.heading}>Welcome to Dog</Text>
            <View style={styles.blueUnderline} />
          </View>
          <View style={styles.headingLineWrapper}>
            <Text style={styles.heading}>community</Text>
            <View style={styles.blueUnderline} />
          </View>
          <Text style={styles.subheading}>Connect with dog owners and see who's at the park</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Sign in to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => showError('Password reset feature coming soon!')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.divider} />
          <View style={styles.signupPrompt}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={hideAlert}
        confirmText={alertState.confirmText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  keyboardAvoid: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headingLineWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 48,
    fontWeight: '800',
    color: '#6B6B6B',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  blueUnderline: {
    width: '100%',
    height: 5,
    backgroundColor: '#00BFFF',
    marginTop: 6,
    borderRadius: 2.5,
  },
  subheading: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B8B8B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  formSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6B6B6B',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 6,
  },
  eyeIconText: {
    fontSize: 18,
  },

  signInButton: {
    marginTop: 8,
    backgroundColor: '#00BFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },

  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 14,
    fontWeight: '600',
  },

  footerSection: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 14,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signupText: {
    fontSize: 15,
    color: '#6B6B6B',
  },
  signupLink: {
    fontSize: 15,
    color: '#007BFF',
    fontWeight: '700',
  },
});