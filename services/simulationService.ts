import { BuildStatus, LogEntry } from '../types';

/**
 * Since we cannot run a real Node.js backend with Android SDK in this browser preview,
 * this service simulates the exact logs and timing of a real build process.
 */
export const simulateBuildProcess = async (
  repoUrl: string,
  setStatus: (status: BuildStatus) => void,
  addLog: (message: string, type: LogEntry['type']) => void,
  setApkUrl: (url: string) => void
) => {
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Step 1: Clone
  setStatus(BuildStatus.CLONING);
  addLog(`git clone ${repoUrl} ./workspace/temp-build-123`, 'command');
  await wait(1500);
  addLog('Cloning into \'.\'...', 'info');
  await wait(1000);
  addLog('remote: Enumerating objects: 143, done.', 'info');
  addLog('remote: Counting objects: 100% (143/143), done.', 'info');
  addLog('remote: Compressing objects: 100% (112/112), done.', 'info');
  addLog('Receiving objects: 100% (143/143), 2.14 MiB | 4.22 MiB/s, done.', 'success');

  // Step 2: Install
  setStatus(BuildStatus.INSTALLING);
  addLog('npm install', 'command');
  await wait(800);
  addLog('added 1422 packages in 4s', 'info');
  addLog('83 packages are looking for funding', 'info');
  await wait(1200);

  // Step 3: Web Build
  setStatus(BuildStatus.BUILDING_WEB);
  addLog('npm run build', 'command');
  addLog('> app@0.0.0 build', 'info');
  addLog('> vite build', 'info');
  await wait(2000);
  addLog('vite v4.4.5 building for production...', 'info');
  addLog('transforming...', 'info');
  await wait(1500);
  addLog('✓ 43 modules transformed.', 'info');
  addLog('dist/index.html                   0.45 kB', 'info');
  addLog('dist/assets/index-2d3s.js        142.32 kB', 'info');
  addLog('dist/assets/index-d21a.css        23.11 kB', 'success');

  // Step 4: Capacitor Init
  setStatus(BuildStatus.CAPACITOR_INIT);
  addLog('npx cap init AppBuilder com.example.app --web-dir=dist', 'command');
  await wait(1000);
  addLog('Initializing Capacitor project in /workspace/temp-build-123', 'info');
  addLog('√ Creating capacitor.config.json in workspace', 'success');

  addLog('npx cap add android', 'command');
  await wait(1500);
  addLog('√ Adding native android project in: android', 'success');

  // Step 5: Capacitor Sync
  setStatus(BuildStatus.ANDROID_SYNC);
  addLog('npx cap sync', 'command');
  await wait(1000);
  addLog('√ Copying web assets from dist to android/app/src/main/assets/public', 'info');
  addLog('√ Creating capacitor.config.json in android/app/src/main/assets', 'info');
  addLog('√ Updating Android plugins', 'success');

  // Step 6: Gradle Build (The heavy part)
  setStatus(BuildStatus.COMPILING_APK);
  addLog('cd android && ./gradlew assembleDebug', 'command');
  addLog('Starting a Gradle Daemon (subsequent builds will be faster)', 'info');
  await wait(3000);
  addLog('> Task :app:preBuild UP-TO-DATE', 'info');
  addLog('> Task :app:preDebugBuild UP-TO-DATE', 'info');
  await wait(1000);
  addLog('> Task :app:compileDebugJavaWithJavac', 'info');
  await wait(2000);
  addLog('> Task :app:mergeDebugResources', 'info');
  await wait(1500);
  addLog('> Task :app:packageDebug', 'info');
  addLog('BUILD SUCCESSFUL in 14s', 'success');
  addLog('43 actionable tasks: 43 executed', 'info');

  // Step 7: Finalize
  setStatus(BuildStatus.SUCCESS);
  addLog('Moving APK to public download directory...', 'info');
  await wait(500);
  addLog('Build pipeline completed successfully.', 'success');
  
  // Set fake download URL
  setApkUrl('#');
};