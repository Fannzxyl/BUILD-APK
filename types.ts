export enum BuildStatus {
  IDLE = 'IDLE',
  CLONING = 'CLONING',
  INSTALLING = 'INSTALLING',
  BUILDING_WEB = 'BUILDING_WEB',
  CAPACITOR_INIT = 'CAPACITOR_INIT',
  ANDROID_SYNC = 'ANDROID_SYNC',
  COMPILING_APK = 'COMPILING_APK',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'command';
}

export interface BuildResponse {
  success: boolean;
  apkUrl?: string;
  error?: string;
}

export interface BuildRequest {
  repoUrl: string;
  projectName?: string;
}