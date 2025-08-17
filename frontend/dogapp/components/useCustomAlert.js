import { useState } from 'react';

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK'
  });

  const showAlert = ({ title, message, type = 'info', confirmText = 'OK' }) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      confirmText
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
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
    showAlert({ title, message, type: 'success' });
  };

  const showError = (message, title = 'Error') => {
    showAlert({ title, message, type: 'error' });
  };

  const showWarning = (message, title = 'Warning') => {
    showAlert({ title, message, type: 'warning' });
  };

  const showInfo = (message, title = 'Info') => {
    showAlert({ title, message, type: 'info' });
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