import { useState } from 'react';

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null
  });

  const showAlert = ({ 
    title, 
    message, 
    type = 'info', 
    confirmText = 'OK', 
    cancelText = 'Cancel',
    showCancel = false,
    onConfirm = null
  }) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancel,
      onConfirm
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false, onConfirm: null }));
  };

  return {
    alertState,
    showAlert,
    hideAlert
  };
};

// Convenience methods for different alert types
export const useAlerts = () => {
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  const showSuccess = (message, title = 'Success') => {
    console.log('🟢 [useAlerts] showSuccess called:', title, message);
    showAlert({ title, message, type: 'success' });
  };

  const showError = (message, title = 'Error') => {
    console.log('🔴 [useAlerts] showError called:', title, message);
    showAlert({ title, message, type: 'error' });
  };

  const showWarning = (message, title = 'Warning') => {
    console.log('🟡 [useAlerts] showWarning called:', title, message);
    showAlert({ title, message, type: 'warning' });
  };

  const showInfo = (message, title = 'Info', onConfirm = null, confirmText = 'OK', cancelText = 'Cancel') => {
    console.log('🔵 [useAlerts] showInfo called:', title, message);
    console.log('🔵 [useAlerts] onConfirm callback provided:', onConfirm ? 'YES' : 'NO');
    console.log('🔵 [useAlerts] confirmText:', confirmText);
    console.log('🔵 [useAlerts] cancelText:', cancelText);
    
    showAlert({ 
      title, 
      message, 
      type: 'info',
      confirmText,
      cancelText,
      showCancel: onConfirm ? true : false,
      onConfirm
    });
  };

  return {
    alertState,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAlert
  };
};