import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { getApiUrl, getEnvironmentInfo, debugLog } from '../config';

const DevPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState('unknown');
  const [environmentInfo, setEnvironmentInfo] = useState(null);

  useEffect(() => {
    setEnvironmentInfo(getEnvironmentInfo());
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      debugLog('Checking server status...');
      const response = await fetch(getApiUrl('/health'), {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerStatus('connected');
        debugLog('Server status check successful', data);
      } else {
        setServerStatus('error');
      }
    } catch (error) {
      debugLog('Server status check failed', error);
      setServerStatus('disconnected');
    }
  };

  const testApiEndpoint = async (endpoint, method = 'GET') => {
    try {
      const url = getApiUrl(endpoint);
      debugLog(`Testing endpoint: ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      Alert.alert(
        'API Test Result',
        `Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('API Test Error', error.message);
    }
  };

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      case 'error': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'connected': return '🟢 Connected';
      case 'disconnected': return '🔴 Disconnected';
      case 'error': return '🟠 Error';
      default: return '⚪ Unknown';
    }
  };

  if (!environmentInfo?.isDevelopment) {
    return null; // Don't show in production
  }

  return (
    <>
      {/* Floating Dev Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.floatingButtonText}>DEV</Text>
      </TouchableOpacity>

      {/* Dev Panel Modal */}
      {isVisible && (
        <View style={styles.devPanel}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.header}>
              <Text style={styles.title}>🛠️ Development Panel</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Environment Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment Info</Text>
              <Text style={styles.infoText}>Environment: {environmentInfo?.environment}</Text>
              <Text style={styles.infoText}>API Base URL: {environmentInfo?.apiBaseUrl}</Text>
              <Text style={[styles.infoText, { color: getStatusColor() }]}>
                Server Status: {getStatusText()}
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={checkServerStatus}
              >
                <Text style={styles.actionButtonText}>🔄 Refresh Server Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => testApiEndpoint('/health')}
              >
                <Text style={styles.actionButtonText}>🏥 Test Health Endpoint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => testApiEndpoint('/dev/test')}
              >
                <Text style={styles.actionButtonText}>🧪 Test Dev Endpoint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => testApiEndpoint('/debug/firebase')}
              >
                <Text style={styles.actionButtonText}>🔥 Test Firebase Connection</Text>
              </TouchableOpacity>
            </View>

            {/* API Testing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API Testing</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => testApiEndpoint('/api/dog-breeds')}
              >
                <Text style={styles.actionButtonText}>🐕 Get Dog Breeds</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => testApiEndpoint('/api/dog-parks')}
              >
                <Text style={styles.actionButtonText}>🏞️ Get Dog Parks</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Development Mode Active</Text>
            </View>
          </ScrollView>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  devPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 999,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#FF6B35',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
  footerText: {
    color: '#888',
    fontSize: 12,
  },
});

export default DevPanel;