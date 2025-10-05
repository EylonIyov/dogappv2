import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CustomAlert from '../components/CustomAlert';
import { useAlerts } from '../components/useCustomAlert';

export default function SignupScreen({ navigation }) {
  const [isSignupMode, setIsSignupMode] = useState(true); // Toggle between signup and login
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  
  // Form data
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  const { alertState, hideAlert, showError, showSuccess } = useAlerts();

  const totalSteps = 3;

  const handleNext = () => {
    // LOGIN MODE - Simple validation
    if (!isSignupMode) {
      handleLogin();
      return;
    }

    // SIGNUP MODE - Validate current step
    if (currentStep === 1) {
      if (!fullName.trim()) {
        showError('Please enter your full name');
        return;
      }
      if (!email.trim()) {
        showError('Please enter your email address');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        return;
      }
      if (!password.trim()) {
        showError('Please create a password');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }
      if (!verifyPassword.trim()) {
        showError('Please verify your password');
        return;
      }
      if (password !== verifyPassword) {
        showError('Passwords do not match');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSignup();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        console.log('User logged in successfully');
        // Navigation happens automatically via auth state change
      } else {
        showError(result.error || 'Login failed', 'Login Error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('An unexpected error occurred. Please try again.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!dateOfBirth.trim() || !gender.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password, fullName, dateOfBirth, gender);
      if (result.success) {
        showSuccess('Account created successfully! Welcome! 🐕', 'Success');
      } else {
        showError(result.error || 'Registration failed', 'Sign Up Error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError('An unexpected error occurred. Please try again.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignupMode(!isSignupMode);
    setCurrentStep(1);
    // Clear form when switching modes
    setFullName('');
    setEmail('');
    setPassword('');
    setVerifyPassword('');
    setDateOfBirth('');
    setGender('');
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.progressBar,
            currentStep >= step ? styles.progressBarActive : styles.progressBarInactive,
          ]}
        />
      ))}
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Log In</Text>

      {/* Email Field */}
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

      {/* Password Field */}
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
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Account Setup</Text>

      {/* Name Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="What's your full name"
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          editable={!isLoading}
        />
      </View>

      {/* Email Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="What's your email address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      {/* Password Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Create a password for your account"
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

      {/* Verify Password Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Verify Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Re-enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!showVerifyPassword}
            value={verifyPassword}
            onChangeText={setVerifyPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowVerifyPassword(!showVerifyPassword)}
          >
            <Text style={styles.eyeIconText}>{showVerifyPassword ? '👁️' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Additional Information</Text>

      {/* Date of Birth Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date of Birth</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          editable={!isLoading}
        />
      </View>

      {/* Gender Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender</Text>
        <TextInput
          style={styles.input}
          placeholder="Male/Female/Other"
          placeholderTextColor="#999"
          value={gender}
          onChangeText={setGender}
          editable={!isLoading}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Review Information</Text>
      
      <View style={styles.reviewContainer}>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Name:</Text>
          <Text style={styles.reviewValue}>{fullName}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Email:</Text>
          <Text style={styles.reviewValue}>{email}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Date of Birth:</Text>
          <Text style={styles.reviewValue}>{dateOfBirth}</Text>
        </View>
        
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Gender:</Text>
          <Text style={styles.reviewValue}>{gender}</Text>
        </View>
      </View>

      <Text style={styles.reviewNote}>
        Please review your information before completing signup
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Progress Indicator */}
      {isSignupMode && renderProgressIndicator()}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Render current step */}
        {isSignupMode ? (
          <>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </>
        ) : (
          renderLoginForm()
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, isLoading && styles.disabledButton]}
            onPress={handleNext}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>
              {isLoading ? 'Please wait...' : isSignupMode && currentStep === totalSteps ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password Button - Only show in login mode */}
        {!isSignupMode && (
          <View style={styles.forgotPasswordButtonContainer}>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => showError('Password reset feature coming soon!')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordButtonText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sign In Link - Fixed at bottom */}
      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>
          {isSignupMode ? 'Already have an account? ' : "Don't have an account? "}
        </Text>
        <TouchableOpacity 
          onPress={toggleMode}
          disabled={isLoading}
        >
          <Text style={styles.signInLink}>
            {isSignupMode ? 'Sign in here' : 'Sign up here'}
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#F5F5F5',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 80,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#6B6B6B',
  },
  progressBarInactive: {
    backgroundColor: '#D3D3D3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B6B6B',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    right: 15,
    top: 12,
    padding: 5,
  },
  eyeIconText: {
    fontSize: 20,
  },
  reviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  reviewNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 60,
    gap: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F5F5F5',
  },
  signInText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  signInLink: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007BFF',
  },
  forgotPasswordButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordButton: {
    backgroundColor: '#D3D3D3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  forgotPasswordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});