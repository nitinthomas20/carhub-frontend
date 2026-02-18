import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDk37e5RP-k5Kc3CqX7Hv3DgPF2Q0mlNOM',
  authDomain: 'firehawk-auto-487807.firebaseapp.com',
  projectId: 'firehawk-auto-487807',
  storageBucket: 'firehawk-auto-487807.firebasestorage.app',
  messagingSenderId: '417485167247',
  appId: '1:417485167247:web:11a435ca8ac0101fd76efa',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
