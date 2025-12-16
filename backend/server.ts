// server.ts - Production-Ready v6.4 (Gradle Settings Fix)
import express from 'express';
import cors from 'cors';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.json({ limit: '50mb' }) as any);
app.use(express.urlencoded({ limit: '50mb', extended: true }) as any);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const WORKSPACE_DIR = path.join(__dirname, 'workspace');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true, mode: 0o777 });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true, mode: 0o777 });

// Auto-detect and set JAVA_HOME if not set
if (!process.env.JAVA_HOME) {
  const javaHomeCandidates = [
    '/usr/lib/jvm/java-17-openjdk-amd64',
    '/usr/lib/jvm/java-17-openjdk',
    '/usr/lib/jvm/java-11-openjdk-amd64',
    '/usr/lib/jvm/java-11-openjdk',
    '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home',
    '/opt/java/openjdk'
  ];

  for (const candidate of javaHomeCandidates) {
    if (fs.existsSync(candidate)) {
      process.env.JAVA_HOME = candidate;
      console.log(`✅ Auto-detected JAVA_HOME: ${candidate}`);
      break;
    }
  }
}

// Workspace cleanup - remove folders older than 24 hours
function cleanupOldWorkspaces() {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (!fs.existsSync(WORKSPACE_DIR)) return;

    const dirs = fs.readdirSync(WORKSPACE_DIR);
    let cleaned = 0;

    for (const dir of dirs) {
      const dirPath = path.join(WORKSPACE_DIR, dir);
      try {
        const stat = fs.statSync(dirPath);
        if (stat.isDirectory() && (now - stat.mtimeMs) > maxAge) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          cleaned++;
        }
      } catch (e) {
        // Skip if can't access
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old workspace(s)`);
    }
  } catch (e) {
    console.error('Workspace cleanup error:', e);
  }
}

// Run cleanup on startup and every 6 hours
cleanupOldWorkspaces();
setInterval(cleanupOldWorkspaces, 6 * 60 * 60 * 1000);

app.get('/', (req, res) => res.status(200).send('AppBuilder-AI v6.4 (Gradle Fix) is Running. 🚀'));
app.use('/download', express.static(PUBLIC_DIR) as any);

// Build log file helper
let currentLogFile: string | null = null;
function logToFile(message: string) {
  if (currentLogFile) {
    try {
      fs.appendFileSync(currentLogFile, `${new Date().toISOString()} - ${message}\n`, 'utf-8');
    } catch (e) { /* ignore */ }
  }
}

const sendEvent = (res: any, data: any) => {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (e) { /* ignore */ }
};

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  logFn?: (msg: string, type: 'info' | 'error' | 'command') => void,
  retries: number = 0,
  timeoutMs: number = 600000 // 10 minutes default
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmdStr = [command, ...args].join(' ');
    if (logFn) logFn(cmdStr, 'command');

    const child = spawn(command, args, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        CI: 'true',
        TERM: 'dumb',
        ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || '',
        JAVA_HOME: process.env.JAVA_HOME || ''
      }
    });

    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      child.kill();
      reject(new Error(`Command "${cmdStr}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach((l: string) => { if (l.trim() && logFn) logFn(l.trim(), 'info'); });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach((l: string) => { if (l.trim() && logFn) logFn(l.trim(), 'error'); });
    });

    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        const isNetworkCommand = cmdStr.includes('npm install') || cmdStr.includes('git clone');
        if (retries > 0 && isNetworkCommand) {
          if (logFn) logFn(`Command failed, retrying... (${retries} attempts left)`, 'info');
          setTimeout(() => {
            runCommand(command, args, cwd, logFn, retries - 1, timeoutMs)
              .then(resolve)
              .catch(reject);
          }, 2000);
        } else {
          reject(new Error(`Command "${cmdStr}" failed with exit code ${code}`));
        }
      }
    });
    child.on('error', (err) => {
      if (timeout) clearTimeout(timeout);
      reject(err);
    });
  });
}

async function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const e of entries) {
      await copyRecursive(path.join(src, e), path.join(dest, e));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function readFileSafe(p: string): string | null {
  try { return fs.readFileSync(p, 'utf-8'); } catch (e) { return null; }
}
function writeFileSafe(p: string, content: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf-8');
}

// === Helper: Disable Strict Type Checking ===
function disableStrictChecks(projectDir: string, logFn: any) {
  try {
    // 1. Patch package.json to remove 'tsc' from build command
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts && pkg.scripts.build) {
        const originalBuild = pkg.scripts.build;
        if (originalBuild.includes('tsc')) {
          const newBuild = originalBuild.replace(/(vue-)?tsc[^&]*&&\s*/g, '').trim();
          if (newBuild !== originalBuild) {
            pkg.scripts.build = newBuild;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            logFn(`🛡️ Relaxed build requirements: "${originalBuild}" -> "${newBuild}"`, 'info');
          }
        }
      }
    }

    // 2. Patch tsconfig.json to ignore unused locals
    const tsConfigPath = path.join(projectDir, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      let content = fs.readFileSync(tsConfigPath, 'utf-8');
      let modified = false;
      if (content.includes('"noUnusedLocals": true')) {
        content = content.replace('"noUnusedLocals": true', '"noUnusedLocals": false');
        modified = true;
      }
      if (content.includes('"noEmitOnError": true')) {
        content = content.replace('"noEmitOnError": true', '"noEmitOnError": false');
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(tsConfigPath, content);
        logFn('🛡️ Disabled strict TypeScript checks in tsconfig.json', 'info');
      }
    }
  } catch (e) {
    logFn('Warning: Failed to auto-patch strict checks (continuing anyway)', 'info');
  }
}

// Enhanced environment verification
async function verifyEnvironment(logFn: (msg: string, type: 'info' | 'error' | 'success') => void): Promise<boolean> {
  logFn('🔍 Verifying build environment...', 'info');

  const checks = {
    node: false,
    npm: false,
    java: false,
    androidSdk: false,
    git: false
  };

  try {
    await runCommand('node', ['-v'], process.cwd());
    checks.node = true;
    logFn('✅ Node.js: Available', 'success');
  } catch (e) {
    logFn('❌ Node.js: Not found', 'error');
  }

  try {
    await runCommand('npm', ['-v'], process.cwd());
    checks.npm = true;
    logFn('✅ npm: Available', 'success');
  } catch (e) {
    logFn('❌ npm: Not found', 'error');
  }

  try {
    await runCommand('java', ['-version'], process.cwd());
    checks.java = true;
    const javaHome = process.env.JAVA_HOME;
    if (javaHome) {
      logFn(`✅ Java: Available (JAVA_HOME=${javaHome})`, 'success');
    } else {
      logFn('⚠️ Java: Available but JAVA_HOME not set', 'error');
    }
  } catch (e) {
    logFn('❌ Java: Not found or wrong version', 'error');
  }

  try {
    await runCommand('git', ['--version'], process.cwd());
    checks.git = true;
    logFn('✅ Git: Available', 'success');
  } catch (e) {
    logFn('❌ Git: Not found', 'error');
  }

  const androidSdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  if (androidSdkRoot && fs.existsSync(androidSdkRoot)) {
    checks.androidSdk = true;
    logFn(`✅ Android SDK: Found at ${androidSdkRoot}`, 'success');

    // Check for build-tools
    const buildToolsDir = path.join(androidSdkRoot, 'build-tools');
    if (fs.existsSync(buildToolsDir)) {
      const versions = fs.readdirSync(buildToolsDir);
      logFn(`   Build-tools versions: ${versions.join(', ')}`, 'info');
    }
  } else {
    logFn('⚠️ Android SDK: ANDROID_SDK_ROOT not set (will likely fail)', 'error');
  }

  const allRequired = checks.node && checks.npm && checks.java && checks.git;
  return allRequired;
}

// === CRITICAL FIX: Only apply to build.gradle, NEVER settings.gradle ===
function applyKotlinResolutionStrategy(androidRoot: string, kotlinVersion = '1.8.22'): boolean {
  const resolutionBlock = `
// === APPBUILDER_KOTLIN_FIX_APPLIED ===
subprojects {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:${kotlinVersion}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:${kotlinVersion}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:${kotlinVersion}"
        }
    }
}

allprojects {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:${kotlinVersion}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:${kotlinVersion}"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:${kotlinVersion}"
        }
    }
}
`;

  // FIX: Removed settings.gradle from this list. 
  // 'subprojects' block causes crash in settings.gradle.
  const candidates = [
    path.join(androidRoot, 'build.gradle'),
    path.join(androidRoot, 'build.gradle.kts')
  ];

  let applied = false;
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    try {
      let content = fs.readFileSync(candidate, 'utf-8');
      if (content.includes('APPBUILDER_KOTLIN_FIX_APPLIED')) {
        applied = true;
        continue;
      }
      content += `\n${resolutionBlock}\n`;
      fs.writeFileSync(candidate, content, 'utf-8');
      applied = true;
    } catch (e) { /* continue */ }
  }

  // Also patch app/build.gradle
  const appBuildGradle = path.join(androidRoot, 'app', 'build.gradle');
  if (fs.existsSync(appBuildGradle)) {
    try {
      let content = fs.readFileSync(appBuildGradle, 'utf-8');
      if (!content.includes('APPBUILDER_KOTLIN_FIX_APPLIED')) {
        const appBlock = `
// === APPBUILDER_KOTLIN_FIX_APPLIED ===
configurations.all {
    resolutionStrategy {
        force "org.jetbrains.kotlin:kotlin-stdlib:${kotlinVersion}"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:${kotlinVersion}"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:${kotlinVersion}"
    }
}
`;
        content = appBlock + content;
        fs.writeFileSync(appBuildGradle, content, 'utf-8');
        applied = true;
      }
    } catch (e) { /* ignore */ }
  }

  return applied;
}

// Add native libs handling for game/AI projects
function addNativeLibsPackaging(androidRoot: string): boolean {
  const appBuildGradle = path.join(androidRoot, 'app', 'build.gradle');
  if (!fs.existsSync(appBuildGradle)) return false;

  try {
    let content = fs.readFileSync(appBuildGradle, 'utf-8');

    // Skip if already has packaging options for natives
    if (content.includes('APPBUILDER_NATIVE_LIBS_FIX')) {
      return true;
    }

    // Add packaging options to handle duplicate native libs (common in game/AI)
    const packagingBlock = `
    // === APPBUILDER_NATIVE_LIBS_FIX ===
    packagingOptions {
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
    }
`;

    // Insert inside android block
    if (content.includes('android {')) {
      content = content.replace('android {', `android {${packagingBlock}`);
      fs.writeFileSync(appBuildGradle, content, 'utf-8');
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

// Update gradle.properties with production settings
function updateGradleProperties(androidRoot: string, isLargeProject: boolean = false): boolean {
  const gradlePropsPath = path.join(androidRoot, 'gradle.properties');

  try {
    let content = '';
    if (fs.existsSync(gradlePropsPath)) {
      content = fs.readFileSync(gradlePropsPath, 'utf-8');
    }

    const baseProps = [
      'android.useAndroidX=true',
      'android.enableJetifier=true',
      'kotlin.version=1.8.22',
      'org.gradle.daemon=false'
    ];

    // Adjust memory for large projects (game/AI)
    const memoryProp = isLargeProject
      ? 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError'
      : 'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m';

    const allProps = [...baseProps, memoryProp];

    let modified = false;
    for (const prop of allProps) {
      const key = prop.split('=')[0];
      // Remove existing key if present
      const regex = new RegExp(`^${key}=.*$`, 'gm');
      if (regex.test(content)) {
        content = content.replace(regex, prop);
        modified = true;
      } else {
        content += `\n${prop}`;
        modified = true;
      }
    }

    if (modified || !fs.existsSync(gradlePropsPath)) {
      fs.writeFileSync(gradlePropsPath, content, 'utf-8');
      return true;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Detect if project is likely a game/AI (large native libs)
function detectLargeProject(projectDir: string): boolean {
  try {
    const pkg = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkg)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkg, 'utf-8'));
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

      // Check for game/AI frameworks
      const indicators = [
        'three', 'phaser', 'babylon', 'unity', 'tensorflow', 'tfjs',
        '@tensorflow/tfjs', 'onnxruntime', 'torch', 'ml-kit'
      ];

      return Object.keys(deps).some(dep =>
        indicators.some(ind => dep.toLowerCase().includes(ind))
      );
    }
  } catch (e) {
    return false;
  }
  return false;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        if (response.headers.location) {
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        } else {
          reject(new Error('Redirect without location'));
        }
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function ensureAndroidManifestOrientation(manifestPath: string, orientation: string): boolean {
  const content = readFileSafe(manifestPath);
  if (!content) return false;
  if (content.includes('android:screenOrientation')) return false;
  const newContent = content.replace(/<activity\b/, `<activity android:screenOrientation="${orientation}"`);
  if (newContent !== content) { writeFileSafe(manifestPath, newContent); return true; }
  return false;
}

function patchStylesAppendItems(stylesPath: string, itemsXml: string): boolean {
  const content = readFileSafe(stylesPath);
  if (!content) return false;
  if (content.includes(itemsXml)) return false;
  if (content.includes('</style>')) {
    const newContent = content.replace('</style>', `${itemsXml}</style>`);
    if (newContent !== content) { writeFileSafe(stylesPath, newContent); return true; }
  }
  return false;
}

app.post('/api/build/stream', async (req, res) => {
  const {
    repoUrl, appName, appId, orientation, iconUrl, fullscreen, versionCode, versionName,
    // NEW: Build configuration options
    buildType, outputFormat, minSdk, targetSdk, enableProguard, permissions, splashColor, splashDuration, splashImage
  } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const buildId = uuidv4();
  const projectDir = path.join(WORKSPACE_DIR, buildId);

  // Reset log file initially to prevent writing to non-existent folder
  currentLogFile = null;

  const log = (message: string, type: 'info' | 'command' | 'error' | 'success' = 'info') => {
    const logEntry = { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), message, type };
    sendEvent(res, { type: 'log', log: logEntry });
    // Only write to file if it has been initialized (after clone)
    logToFile(`[${type.toUpperCase()}] ${message}`);
  };
  const updateStatus = (s: string) => {
    sendEvent(res, { type: 'status', status: s });
    logToFile(`[STATUS] ${s}`);
  };

  if (!repoUrl || typeof repoUrl !== 'string') {
    sendEvent(res, { type: 'error', message: 'No Repository URL provided' });
    res.end();
    return;
  }

  const finalAppName = (appName as string) || 'My App';
  const finalAppId = (appId as string) || 'com.appbuilder.generated';
  const finalOrientation = (orientation as string) || 'portrait';
  const isFullscreen = fullscreen === true || fullscreen === 'true';
  const vCode = (versionCode as string) || '1';
  const vName = (versionName as string) || '1.0';

  // NEW: Parse build configuration
  const isReleaseBuild = buildType === 'release';
  const outputIsAAB = outputFormat === 'aab';
  const finalMinSdk = parseInt(minSdk as string) || 21;
  const finalTargetSdk = parseInt(targetSdk as string) || 34;
  const useProguard = enableProguard === true;
  const appPermissions = permissions || { INTERNET: true };
  const finalSplashColor = (splashColor as string) || '#000000';
  const finalSplashDuration = parseInt(splashDuration as string) || 2000;

  try {
    // 1. Ensure target directory does NOT exist
    if (fs.existsSync(projectDir)) {
      log('⚠️ Project directory exists, cleaning...', 'info');
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    log(`🚀 Starting build process ID: ${buildId}`, 'info');
    log(`📦 Config: ${finalAppName} (${finalAppId}) | v${vName} | ${isReleaseBuild ? 'RELEASE' : 'DEBUG'} | ${outputIsAAB ? 'AAB' : 'APK'}`, 'info');
    log(`⚙️ SDK: ${finalMinSdk}-${finalTargetSdk} | ProGuard: ${useProguard} | Fullscreen: ${isFullscreen}`, 'info');

    // Environment verification
    updateStatus('VERIFYING_ENVIRONMENT');
    const envOk = await verifyEnvironment(log);
    if (!envOk) {
      log('⚠️ Some critical environment checks failed. Build may fail.', 'error');
    }

    updateStatus('CLONING');
    log(`Cloning ${repoUrl}...`, 'command');

    // 2. Clone from WORKSPACE_DIR into buildId folder
    await runCommand('git', ['clone', '--depth', '1', repoUrl, buildId], WORKSPACE_DIR, log, 2);

    // 3. Initialize Log File NOW (after folder exists)
    currentLogFile = path.join(projectDir, 'build.log');
    logToFile(`Build ${buildId} Log Initialized`);

    // Detect if large project (game/AI)
    const isLargeProject = detectLargeProject(projectDir);
    if (isLargeProject) {
      log('🎮 Large project detected (Game/AI framework found). Applying enhanced configurations...', 'info');
    }

    // detect structure
    const rootPkg = path.join(projectDir, 'package.json');
    const frontendDir = path.join(projectDir, 'frontend');
    let buildProducedDir = '';

    const hasRootPkg = fs.existsSync(rootPkg);
    const hasFrontend = fs.existsSync(frontendDir) && fs.statSync(frontendDir).isDirectory();

    if (hasFrontend) {
      log('✅ Detected nested frontend at `./frontend`. Using Nested Node.js Build Mode.', 'success');
      updateStatus('INSTALLING_FRONTEND');
      await runCommand('npm', ['install'], frontendDir, log, 2);

      // === FIX: Disable Strict Checks ===
      disableStrictChecks(frontendDir, log);

      updateStatus('BUILDING_FRONTEND');
      const frontendPkg = path.join(frontendDir, 'package.json');
      if (fs.existsSync(frontendPkg)) {
        const pkgJson = JSON.parse(fs.readFileSync(frontendPkg, 'utf-8'));
        if (pkgJson.scripts && pkgJson.scripts.build) {
          await runCommand('npm', ['run', 'build'], frontendDir, log, 0, 900000); // 15 min for large builds
        } else {
          log('No `build` script in `frontend/package.json`. Skipping frontend build.', 'info');
        }
      }
      if (fs.existsSync(path.join(frontendDir, 'dist'))) buildProducedDir = path.join(frontendDir, 'dist');
      else if (fs.existsSync(path.join(frontendDir, 'build'))) buildProducedDir = path.join(frontendDir, 'build');
      else if (fs.existsSync(path.join(frontendDir, 'out'))) buildProducedDir = path.join(frontendDir, 'out');
    } else if (hasRootPkg) {
      log('✅ Detected package.json at project root. Using Node.js Build Mode.', 'success');
      updateStatus('INSTALLING_ROOT');
      await runCommand('npm', ['install'], projectDir, log, 2);

      // === FIX: Disable Strict Checks ===
      disableStrictChecks(projectDir, log);

      updateStatus('BUILDING_ROOT');
      const pkg = JSON.parse(fs.readFileSync(rootPkg, 'utf-8'));
      if (pkg.scripts && pkg.scripts.build) {
        await runCommand('npm', ['run', 'build'], projectDir, log, 0, 900000);
      } else {
        log('No `build` script found at root. Will try to use static files.', 'info');
      }
      if (fs.existsSync(path.join(projectDir, 'dist'))) buildProducedDir = path.join(projectDir, 'dist');
      else if (fs.existsSync(path.join(projectDir, 'build'))) buildProducedDir = path.join(projectDir, 'build');
      else if (fs.existsSync(path.join(projectDir, 'out'))) buildProducedDir = path.join(projectDir, 'out');
    } else {
      log('⚠️ No package.json found and no `frontend/`. Using Static HTML Mode.', 'info');
      if (fs.existsSync(path.join(projectDir, 'public'))) buildProducedDir = path.join(projectDir, 'public');
      else if (fs.existsSync(path.join(projectDir, 'web'))) buildProducedDir = path.join(projectDir, 'web');
      else {
        const possible = fs.readdirSync(projectDir).find(f => {
          try { return fs.statSync(path.join(projectDir, f)).isFile() && f.toLowerCase() === 'index.html'; }
          catch (e) { return false; }
        });
        if (possible) buildProducedDir = projectDir;
      }
    }

    const finalWebDirOnFs = path.join(projectDir, 'web');
    if (!fs.existsSync(finalWebDirOnFs)) fs.mkdirSync(finalWebDirOnFs, { recursive: true });

    if (buildProducedDir && fs.existsSync(buildProducedDir)) {
      log(`Copying build output from ${path.relative(projectDir, buildProducedDir)} to ./web ...`, 'info');
      await copyRecursive(buildProducedDir, finalWebDirOnFs);
    } else {
      log('No build output folder detected — copying repo root files into ./web as fallback.', 'info');
      const files = fs.readdirSync(projectDir);
      for (const f of files) {
        if (['android', 'node_modules', 'workspace', '.git'].includes(f)) continue;
        await copyRecursive(path.join(projectDir, f), path.join(finalWebDirOnFs, f));
      }
      if (!fs.existsSync(path.join(finalWebDirOnFs, 'index.html'))) {
        const candidate = fs.existsSync(path.join(projectDir, 'frontend', 'index.html')) ? './frontend/index.html' : null;
        if (candidate) {
          const redirectHtml = `<!doctype html><meta http-equiv="refresh" content="0; url=${candidate}">`;
          writeFileSafe(path.join(finalWebDirOnFs, 'index.html'), redirectHtml);
          log('Created index.html redirect to nested frontend index.', 'info');
        }
      }
    }

    // Safe-area injection
    if (!isFullscreen) {
      const indexPath = fs.existsSync(path.join(finalWebDirOnFs, 'index.html')) ? path.join(finalWebDirOnFs, 'index.html') : null;
      if (indexPath) {
        try {
          log('Injecting Safe-Area Logic (Meta + CSS)...', 'info');
          let html = fs.readFileSync(indexPath, 'utf-8');
          if (html.includes('<meta name="viewport"')) {
            html = html.replace('<meta name="viewport" content="', '<meta name="viewport" content="viewport-fit=cover, ');
          } else if (html.includes('<head>')) {
            html = html.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">');
          }
          const safeAreaCSS = `
<style>
:root { --sat: env(safe-area-inset-top, 35px); }
body { padding-top: var(--sat) !important; background-color: #000000; min-height:100vh; box-sizing:border-box; }
#root, #app, #__next { padding-top: 0px !important; min-height:100vh; }
header, nav, .fixed-top { margin-top: var(--sat) !important; }
</style>
`;
          if (html.includes('</head>')) {
            html = html.replace('</head>', `${safeAreaCSS}</head>`);
            writeFileSafe(indexPath, html);
            log('✅ Safe-Area Logic Injected Successfully!', 'success');
          }
        } catch (e: any) {
          log('Safe-Area injection failed: ' + (e.message || e), 'error');
        }
      }
    }

    // Ensure root package.json exists
    const rootPkgPath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(rootPkgPath)) {
      log('Root package.json not found. Creating dummy package.json.', 'info');
      const dummy = { name: finalAppName.toLowerCase().replace(/\s+/g, '-'), version: vName, description: 'Generated by AppBuilder-AI', main: 'index.js', scripts: {} };
      writeFileSafe(rootPkgPath, JSON.stringify(dummy, null, 2));
    }

    // Install Capacitor
    log('Installing Capacitor dependencies...', 'command');
    await runCommand('npm', ['install', '@capacitor/core', '@capacitor/cli', '@capacitor/android', '--save-dev'], projectDir, log, 2);

    updateStatus('CAPACITOR_INIT');
    log('Initializing Capacitor...', 'command');
    await runCommand('npx', ['cap', 'init', finalAppName, finalAppId, '--web-dir', 'web'], projectDir, log);

    log('Adding Android platform...', 'command');
    await runCommand('npx', ['cap', 'add', 'android'], projectDir, log);

    // Apply Android patches
    updateStatus('APPLYING_ANDROID_CUSTOM');
    const androidDir = path.join(projectDir, 'android');
    const androidManifestPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
    const stylesPath = path.join(androidDir, 'app/src/main/res/values/styles.xml');
    const buildGradlePath = path.join(androidDir, 'app/build.gradle');

    // patch build.gradle versionCode & versionName
    if (fs.existsSync(buildGradlePath)) {
      try {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
        const vcRegex = /versionCode\s+\d+/;
        const vnRegex = /versionName\s+"[^"]*"/;
        if (vcRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(vcRegex, `versionCode ${vCode}`);
        } else {
          buildGradle = buildGradle.replace(/defaultConfig\s*{/, `defaultConfig {\n        versionCode ${vCode}`);
        }
        if (vnRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(vnRegex, `versionName "${vName}"`);
        } else {
          buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${vCode}\n        versionName "${vName}"`);
        }
        fs.writeFileSync(buildGradlePath, buildGradle, 'utf-8');
        log('✅ Patched build.gradle versionCode/versionName', 'success');
      } catch (e: any) {
        log('Warning: failed to patch build.gradle: ' + (e.message || e), 'error');
      }
    }

    // patch AndroidManifest orientation
    if (fs.existsSync(androidManifestPath) && finalOrientation !== 'user') {
      try {
        const changed = ensureAndroidManifestOrientation(androidManifestPath, finalOrientation);
        if (changed) log('✅ Injected android:screenOrientation into AndroidManifest.xml', 'success');
      } catch (e: any) {
        log('Warning: failed to patch AndroidManifest: ' + (e.message || e), 'error');
      }
    }

    // patch styles.xml
    if (fs.existsSync(stylesPath)) {
      try {
        let stylesContent = fs.readFileSync(stylesPath, 'utf-8');
        if (stylesContent.includes('parent="AppTheme.NoActionBar"')) {
          stylesContent = stylesContent.replace('parent="AppTheme.NoActionBar"', isFullscreen ? 'parent="Theme.AppCompat.NoActionBar.FullScreen"' : 'parent="Theme.AppCompat.NoActionBar"');
          fs.writeFileSync(stylesPath, stylesContent, 'utf-8');
        }
        if (!isFullscreen) {
          const styleFix = '<item name="android:windowFullscreen">false</item><item name="android:windowTranslucentStatus">false</item><item name="android:fitsSystemWindows">true</item><item name="android:statusBarColor">@android:color/black</item><item name="android:windowLightStatusBar">false</item>';
          patchStylesAppendItems(stylesPath, styleFix);
        } else {
          const fsItem = '<item name="android:windowFullscreen">true</item>';
          patchStylesAppendItems(stylesPath, fsItem);
        }
        log('✅ Applied style tweaks', 'success');
      } catch (e: any) {
        log('Warning: failed to patch styles.xml: ' + (e.message || e), 'error');
      }
    }

    // Apply comprehensive fixes
    try {
      log('🔧 Applying Kotlin & dependency resolution fixes...', 'info');

      const kotlinFixed = applyKotlinResolutionStrategy(androidDir, '1.8.22');
      const nativeLibsFixed = addNativeLibsPackaging(androidDir);
      const propsUpdated = updateGradleProperties(androidDir, isLargeProject);

      if (kotlinFixed && propsUpdated) {
        log('✅ Applied Kotlin stdlib conflict resolution at ALL levels!', 'success');
      }
      if (nativeLibsFixed) {
        log('✅ Applied native libs packaging (for Game/AI projects)', 'success');
      }
    } catch (e: any) {
      log('Warning: Some patches failed: ' + (e.message || e), 'error');
    }

    updateStatus('ANDROID_SYNC');
    await runCommand('npx', ['cap', 'sync'], projectDir, log);

    // Icon handling with fallback
    if (iconUrl && typeof iconUrl === 'string' && fs.existsSync(path.join(androidDir, 'app', 'src', 'main', 'res'))) {
      const resDir = path.join(androidDir, 'app/src/main/res');
      const folders = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
      const adaptiveIconDir = path.join(resDir, 'mipmap-anydpi-v26');
      if (fs.existsSync(adaptiveIconDir)) {
        fs.rmSync(adaptiveIconDir, { recursive: true, force: true });
        log('Removed adaptive icons to force custom icon.', 'info');
      }
      if (iconUrl.startsWith('http')) {
        log('Downloading custom icon from URL...', 'command');
        const tempIconPath = path.join(projectDir, 'temp_icon.png');
        try {
          await downloadFile(iconUrl, tempIconPath);
          for (const folder of folders) {
            const folderPath = path.join(resDir, folder);
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
            const target = path.join(folderPath, 'ic_launcher.png');
            const targetRound = path.join(folderPath, 'ic_launcher_round.png');
            fs.copyFileSync(tempIconPath, target);
            fs.copyFileSync(tempIconPath, targetRound);
          }
          log('✅ Custom icon applied successfully!', 'success');
        } catch (err: any) {
          log('Failed to download icon: ' + (err.message || err), 'error');
        }
      } else if (iconUrl.startsWith('data:image')) {
        log('Processing uploaded icon (Base64)...', 'info');
        try {
          const base64Data = iconUrl.split(';base64,').pop();
          if (base64Data) {
            const iconBuffer = Buffer.from(base64Data, 'base64');
            const tempIconPath = path.join(projectDir, 'temp_icon.png');
            fs.writeFileSync(tempIconPath, iconBuffer);
            for (const folder of folders) {
              const folderPath = path.join(resDir, folder);
              if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
              const target = path.join(folderPath, 'ic_launcher.png');
              const targetRound = path.join(folderPath, 'ic_launcher_round.png');
              fs.copyFileSync(tempIconPath, target);
              fs.copyFileSync(tempIconPath, targetRound);
            }
            log('✅ Custom icon applied successfully!', 'success');
          }
        } catch (err: any) {
          log('Failed to process custom icon: ' + (err.message || err), 'error');
        }
      }
    }

    // Clean before build
    updateStatus('CLEANING');
    log('Cleaning previous build artifacts...', 'command');
    const gradleDir = androidDir;
    if (fs.existsSync(path.join(gradleDir, 'gradlew'))) {
      try {
        await runCommand('chmod', ['+x', 'gradlew'], gradleDir, log);
        await runCommand('./gradlew', ['clean'], gradleDir, log);
      } catch (e: any) {
        log('Clean failed, continuing anyway: ' + (e.message || e), 'error');
      }
    }

    // === NEW: Patch build.gradle with SDK versions and ProGuard ===
    const appBuildGradlePath = path.join(androidDir, 'app/build.gradle');
    if (fs.existsSync(appBuildGradlePath)) {
      try {
        let buildGradleContent = fs.readFileSync(appBuildGradlePath, 'utf-8');

        // Patch minSdk
        buildGradleContent = buildGradleContent.replace(
          /minSdkVersion\s+\d+/,
          `minSdkVersion ${finalMinSdk}`
        );

        // Patch targetSdk
        buildGradleContent = buildGradleContent.replace(
          /targetSdkVersion\s+\d+/,
          `targetSdkVersion ${finalTargetSdk}`
        );

        // Add ProGuard/R8 if enabled and release build
        if (useProguard && isReleaseBuild) {
          if (!buildGradleContent.includes('minifyEnabled true')) {
            buildGradleContent = buildGradleContent.replace(
              /buildTypes\s*\{[\s\S]*?release\s*\{/,
              `buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'`
            );
            log('✅ Enabled R8/ProGuard code shrinking for release build', 'success');
          }
        }

        fs.writeFileSync(appBuildGradlePath, buildGradleContent, 'utf-8');
        log(`✅ Patched SDK versions: minSdk=${finalMinSdk}, targetSdk=${finalTargetSdk}`, 'success');
      } catch (e: any) {
        log('Warning: Failed to patch SDK versions: ' + (e.message || e), 'error');
      }
    }

    // === NEW: Inject Permissions into AndroidManifest.xml ===
    if (fs.existsSync(androidManifestPath)) {
      try {
        let manifestContent = fs.readFileSync(androidManifestPath, 'utf-8');
        const permissionXmlLines: string[] = [];

        const permissionMap: Record<string, string> = {
          INTERNET: 'android.permission.INTERNET',
          CAMERA: 'android.permission.CAMERA',
          LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
          MICROPHONE: 'android.permission.RECORD_AUDIO',
          VIBRATE: 'android.permission.VIBRATE',
          NOTIFICATION: 'android.permission.POST_NOTIFICATIONS',
        };

        for (const [key, enabled] of Object.entries(appPermissions)) {
          if (enabled && permissionMap[key]) {
            const permLine = `<uses-permission android:name="${permissionMap[key]}" />`;
            if (!manifestContent.includes(permissionMap[key])) {
              permissionXmlLines.push(permLine);
            }
          }
        }

        if (permissionXmlLines.length > 0) {
          manifestContent = manifestContent.replace(
            '<application',
            permissionXmlLines.join('\n    ') + '\n    <application'
          );
          fs.writeFileSync(androidManifestPath, manifestContent, 'utf-8');
          log(`✅ Injected ${permissionXmlLines.length} permission(s) into AndroidManifest.xml`, 'success');
        }
      } catch (e: any) {
        log('Warning: Failed to inject permissions: ' + (e.message || e), 'error');
      }
    }

    // === NEW: Configure Splash Screen ===
    const capacitorConfigPath = path.join(projectDir, 'capacitor.config.json');
    if (fs.existsSync(capacitorConfigPath)) {
      try {
        const capConfig = JSON.parse(fs.readFileSync(capacitorConfigPath, 'utf-8'));
        capConfig.plugins = capConfig.plugins || {};
        capConfig.plugins.SplashScreen = {
          launchShowDuration: finalSplashDuration,
          launchAutoHide: true,
          backgroundColor: finalSplashColor,
          androidScaleType: 'CENTER_CROP',
          showSpinner: false,
        };
        fs.writeFileSync(capacitorConfigPath, JSON.stringify(capConfig, null, 2), 'utf-8');
        log(`✅ Configured splash screen: ${finalSplashColor}, ${finalSplashDuration}ms`, 'success');
      } catch (e: any) {
        log('Warning: Failed to configure splash screen: ' + (e.message || e), 'error');
      }
    }

    // Build APK/AAB with extended timeout for large projects
    updateStatus('COMPILING_APK');
    const buildTimeout = isLargeProject ? 1800000 : 900000; // 30 min for large, 15 min for normal

    // Determine Gradle command based on build type and output format
    let gradleTask: string;
    if (outputIsAAB) {
      gradleTask = isReleaseBuild ? 'bundleRelease' : 'bundleDebug';
    } else {
      gradleTask = isReleaseBuild ? 'assembleRelease' : 'assembleDebug';
    }

    log(`🔨 Building ${outputIsAAB ? 'AAB' : 'APK'} (${isReleaseBuild ? 'Release' : 'Debug'}) with Gradle...`, 'command');

    if (fs.existsSync(path.join(gradleDir, 'gradlew'))) {
      const gradleArgs = isLargeProject
        ? [gradleTask, '--refresh-dependencies', '--stacktrace', '--no-daemon']
        : [gradleTask, '--refresh-dependencies', '--stacktrace'];

      await runCommand('./gradlew', gradleArgs, gradleDir, log, 0, buildTimeout);
    } else {
      throw new Error('gradlew script not found in android folder.');
    }

    // Determine output path based on format and build type
    let expectedOutputPath: string;
    let outputFileName: string;
    const buildTypeFolder = isReleaseBuild ? 'release' : 'debug';

    if (outputIsAAB) {
      expectedOutputPath = path.join(gradleDir, `app/build/outputs/bundle/${buildTypeFolder}/app-${buildTypeFolder}.aab`);
      outputFileName = `${finalAppName.replace(/\s+/g, '_')}_v${vName}.aab`;
    } else {
      expectedOutputPath = path.join(gradleDir, `app/build/outputs/apk/${buildTypeFolder}/app-${buildTypeFolder}.apk`);
      outputFileName = `${finalAppName.replace(/\s+/g, '_')}_v${vName}.apk`;
    }

    if (fs.existsSync(expectedOutputPath)) {
      const publicOutputPath = path.join(PUBLIC_DIR, outputFileName);
      fs.renameSync(expectedOutputPath, publicOutputPath);

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
      const downloadUrl = `${protocol}://${host}/download/${outputFileName}`;

      updateStatus('SUCCESS');
      log(`🎉 ${outputIsAAB ? 'AAB' : 'APK'} generated successfully!`, 'success');
      log(`📥 Download: ${downloadUrl}`, 'success');
      sendEvent(res, { type: 'result', success: true, downloadUrl });
    } else {
      throw new Error(`${outputIsAAB ? 'AAB' : 'APK'} not found after gradle build. Check gradle output for errors.`);
    }

  } catch (error: any) {
    console.error(error);
    updateStatus('ERROR');
    log('❌ Build failed: ' + (error.message || String(error)), 'error');
    sendEvent(res, { type: 'result', success: false, error: error.message || String(error) });
  } finally {
    try { res.end(); } catch { }
    currentLogFile = null;
  }
});

app.listen(PORT, () => console.log(`🚀 Build Server v6.4 running on port ${PORT}`));