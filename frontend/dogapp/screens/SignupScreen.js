import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, Alert, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateOfBirth;
    // Only update the date, don't close the picker
    setDateOfBirth(currentDate);
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
  };

  const handleSignUp = async () => {
    // Validation for all required fields
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !fullName.trim() || !gender.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate that the date is not in the future
    const today = new Date();
    if (dateOfBirth > today) {
      Alert.alert('Error', 'Date of birth cannot be in the future');
      return;
    }

    // Validate minimum age (13 years old)
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    let calculatedAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      calculatedAge--;
    }
    
    if (calculatedAge < 13) {
      Alert.alert('Error', 'You must be at least 13 years old to register');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password, fullName, formatDate(dateOfBirth), gender);
      
      if (result.success) {
        console.log('User registered successfully');
        Alert.alert('Success', 'Account created successfully! Welcome to DogApp! 🐕', [
          { text: 'Get Started', onPress: () => {
            // Navigation will happen automatically due to auth state change
          }}
        ]);
      } else {
        Alert.alert('Sign Up Error', result.error);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Sign Up Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.dogEmoji}>🐾</Text>
          <Text style={styles.title}>Join DogApp</Text>
          <Text style={styles.subtitle}>Create your account to get started</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>👤 Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#A0A0A0"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>📧 Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>🎂 Date of Birth *</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={toggleDatePicker}
            >
              <Text style={styles.datePickerText}>
                {formatDate(dateOfBirth)} 📅
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={dateOfBirth}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()} // Prevent future dates
                minimumDate={new Date(1920, 0, 1)} // Set reasonable minimum date
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>⚧ Gender *</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'male' && styles.selectedGender]}
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.selectedGenderText]}>👨 Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'female' && styles.selectedGender]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.selectedGenderText]}>👩 Female</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'other' && styles.selectedGender]}
                onPress={() => setGender('other')}
              >
                <Text style={[styles.genderText, gender === 'other' && styles.selectedGenderText]}>🏳️‍⚧️ Other</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>🔒 Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min 6 characters)"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={true}
              value={password}
              onChangeText={setPassword}
              autoComplete="password-new"
              autoCorrect={false}
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>🔒 Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={true}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoComplete="password-new"
              autoCorrect={false}
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="done"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.signupButton, isLoading && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.signupButtonText}>
              {isLoading ? '🐾 Creating Account...' : '🐾 Create Account'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backToLoginButton} 
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.backToLoginText}>
              Already have an account? Sign In 🏠
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>* Required fields</Text>
          <Text style={styles.footerText}>By signing up, you agree to our Terms & Privacy Policy</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B6B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  dogEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFE5E5',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  signupButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backToLoginButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#FFE5E5',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledButton: {
    opacity: 0.6,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedGenderText: {
    color: '#FFFFFF',
  },
  datePickerButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
});