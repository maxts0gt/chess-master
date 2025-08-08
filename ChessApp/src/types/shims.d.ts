declare module 'react-native-svg';
declare module 'react-native-qrcode-svg';
declare module 'react-native-qrcode-scanner';
declare module 'react-native-permissions';
declare module 'react-native-sha256';
declare module 'stockfish.wasm';
declare module 'react-native-libsignal-protocol';
declare module 'react-native-randombytes';
declare module 'react-native-linear-gradient';
declare module 'expo-haptics';

declare type Worker = any;
declare var Worker: any;

declare interface RTCPeerConnection {
  onicecandidate?: any;
  onconnectionstatechange?: any;
  ondatachannel?: any;
  connectionState?: string;
}

// NodeJS timer compatibility
declare namespace NodeJS {
  interface Timeout {}
}