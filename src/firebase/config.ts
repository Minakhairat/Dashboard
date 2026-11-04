import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import importedConfig from '../../firebase-applet-config.json';

const fallbackConfig = {
  projectId: "gen-lang-client-0761904551",
  appId: "1:764794012228:web:a671a024bb3373b67d7211",
  apiKey: "AIzaSyBGqUUGsyIrNMVmCYMTR4uoxLQkzwLfHqU",
  authDomain: "gen-lang-client-0761904551.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-fa1b3ce1-6e9b-4ad6-a26e-a2775f57d93f",
  storageBucket: "gen-lang-client-0761904551.firebasestorage.app",
  messagingSenderId: "764794012228",
  measurementId: "",
  oAuthClientId: "764794012228-qmmve4isi5luqq5di63h4l3r61gf9m4f.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const firebaseConfig = importedConfig || fallbackConfig;
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-fa1b3ce1-6e9b-4ad6-a26e-a2775f57d93f');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Diagnostic check as required by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'app_settings', 'general'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting...');
    }
    return false;
  }
}

// Error handling standard per skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
