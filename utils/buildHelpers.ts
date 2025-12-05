import { BuildStatus } from '../types';

// Helper: Ubah Nama App jadi Package ID
export const generatePackageId = (appName: string): string => {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  return `com.${slug || 'myapp'}.app`;
};

// Helper: Hitung persentase progress
export const getProgress = (status: BuildStatus): number => {
  switch (status) {
    case BuildStatus.IDLE: return 0;
    case BuildStatus.CLONING: return 10;
    case BuildStatus.INSTALLING: return 30;
    case BuildStatus.BUILDING_WEB: return 50;
    case BuildStatus.CAPACITOR_INIT: return 70;
    case BuildStatus.ANDROID_SYNC: return 80;
    case BuildStatus.COMPILING_APK: return 90;
    case BuildStatus.SUCCESS: return 100;
    case BuildStatus.ERROR: return 100;
    default: return 0;
  }
};

// Helper: Translate Log Robot ke Manusia
export const parseLogMessage = (message: string): { text: string; isError: boolean } => {
  const lower = message.toLowerCase();
  
  if (lower.includes('npm err!') || lower.includes('command failed')) 
    return { text: "⚠️ Gagal install dependencies. Cek package.json.", isError: true };
  if (lower.includes('repository not found') || lower.includes('fatal:')) 
    return { text: "🚫 Repo tidak ditemukan/Private. Cek URL.", isError: true };
  if (lower.includes('build failed')) 
    return { text: "💥 Build web gagal. Cek script 'build'.", isError: true };
  
  if (lower.includes('cloning into')) return { text: "📦 Mengunduh kode dari GitHub...", isError: false };
  if (lower.includes('npm install')) return { text: "📚 Install library (agak lama)...", isError: false };
  if (lower.includes('vite v')) return { text: "⚡ Build aset web dengan Vite...", isError: false };
  if (lower.includes('gradle')) return { text: "🐘 Merakit APK Android...", isError: false };
  if (lower.includes('apk generated')) return { text: "✅ APK siap!", isError: false };

  return { text: message, isError: false };
};