import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);

// The following code block is for web-only and sets up global styles
// to ensure the app fills the entire browser screen and handles scrolling correctly.
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      min-height: 100%;
      margin: 0;
      padding: 0;
      overflow: visible; /* Use browser-level scrolling */
    }
    #root {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 100%;
    }
  `;
  document.head.appendChild(style);
}
