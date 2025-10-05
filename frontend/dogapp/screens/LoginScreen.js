import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView, StatusBar } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Main Heading with Blue Underlines */}
        <View style={styles.headingContainer}>
          <View style={styles.headingLineWrapper}>
            <Text style={styles.heading}>Welcome to Dog</Text>
            <View style={styles.blueUnderline} />
          </View>
          <View style={styles.headingLineWrapper}>
            <Text style={styles.heading}>community</Text>
            <View style={styles.blueUnderline} />
          </View>
        </View>

        {/* Subheading */}
        <View style={styles.subheadingContainer}>
          <Text style={styles.subheading}>Connect with dog owners and</Text>
          <Text style={styles.subheading}>see who is at the park</Text>
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>Log In/ Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0', // Light beige/cream background
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headingLineWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heading: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#6B6B6B', // Medium-dark gray
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  blueUnderline: {
    width: '100%',
    height: 6,
    backgroundColor: '#00BFFF', // Bright cyan/turquoise blue
    marginTop: 4,
    borderRadius: 3,
  },
  subheadingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  subheading: {
    fontSize: 19,
    color: '#8B8B8B', // Medium gray (lighter than heading)
    textAlign: 'center',
    lineHeight: 28,
  },
  actionButton: {
    backgroundColor: '#D3D3D3', // Light gray
    paddingVertical: 22,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: 310,
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
  actionButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333', // Dark gray/black
    letterSpacing: 0.3,
  },
});