import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { saveComplexImageToDb, saveHeroImageToDb } from '../utils/indexedDb';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test as required by Firebase skill
export async function testFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection offline, using cached storage.');
    }
  }
}

// Automatic client-side image optimizer for ultra-fast web delivery
export function optimizeImageFile(file: File, maxWidth = 1600, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export high-quality JPEG (or WebP if supported)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedDataUrl);
      };
      img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsDataURL(file);
  });
}

// 1. Complexes Firestore Service
export async function saveComplexImageToCloud(complexId: string, imageData: string): Promise<void> {
  // Save to persistent Firestore Cloud Database
  const docRef = doc(db, 'complex_images', complexId);
  await setDoc(docRef, {
    id: complexId,
    imageData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Backup to IndexedDB as well for instant zero-latency loading
  await saveComplexImageToDb(complexId, imageData);
}

export async function loadAllComplexImagesFromCloud(): Promise<Record<string, string>> {
  try {
    const colRef = collection(db, 'complex_images');
    const snapshot = await getDocs(colRef);
    const result: Record<string, string> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.imageData) {
        result[docSnap.id] = data.imageData;
      }
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to load complex images from Firestore:', error);
    return {};
  }
}

// 2. Hero Slideshow Firestore Service
export async function saveHeroImageToCloud(slideId: string, imageData: string): Promise<void> {
  const docRef = doc(db, 'hero_images', slideId);
  await setDoc(docRef, {
    id: slideId,
    imageData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await saveHeroImageToDb(slideId, imageData);
}

export async function loadAllHeroImagesFromCloud(): Promise<Record<string, string>> {
  try {
    const colRef = collection(db, 'hero_images');
    const snapshot = await getDocs(colRef);
    const result: Record<string, string> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.imageData) {
        result[docSnap.id] = data.imageData;
      }
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to load hero images from Firestore:', error);
    return {};
  }
}

// 3. Complex Commentary Firestore Service
export interface ComplexCommentData {
  comment1: string;
  comment2: string;
  updatedAt?: string;
}

export async function saveComplexCommentToCloud(
  complexId: string, 
  comment1: string, 
  comment2: string
): Promise<void> {
  const docRef = doc(db, 'complex_comments', complexId);
  await setDoc(docRef, {
    complexId,
    comment1,
    comment2,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Local storage cache backup
  try {
    const raw = localStorage.getItem('bomnal_complex_custom_comments') || '{}';
    const parsed = JSON.parse(raw);
    parsed[complexId] = { comment1, comment2 };
    localStorage.setItem('bomnal_complex_custom_comments', JSON.stringify(parsed));
  } catch (_) {}
}

export async function loadAllComplexCommentsFromCloud(): Promise<Record<string, ComplexCommentData>> {
  try {
    const colRef = collection(db, 'complex_comments');
    const snapshot = await getDocs(colRef);
    const result: Record<string, ComplexCommentData> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        result[docSnap.id] = {
          comment1: data.comment1 || '',
          comment2: data.comment2 || '',
          updatedAt: data.updatedAt,
        };
      }
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to load complex comments from Firestore:', error);
    try {
      const raw = localStorage.getItem('bomnal_complex_custom_comments');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }
}

