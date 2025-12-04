/**
 * NOTE: This is the Backend Code.
 * To run this, you need a Node.js environment with Android SDK, Java (JDK), and Gradle installed.
 * 
 * Install dependencies: 
 * npm install express cors body-parser simple-git uuid fs-extra
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
// Note: In a real environment, you would import these:
// import simpleGit from 'simple-git'; 
// import fsExtra from 'fs-extra';

// Mocking types for the file structure since we can't install packages in this preview
const app = express();
const PORT = 3001;

// Use 'as any' to bypass strict type checking for middleware in this mixed environment
app.use(cors() as any);
app.use(express.json());

// Path where builds happen
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');
// Path where APKs are served from
const PUBLIC_DIR = path.join(process.cwd(), 'public');

if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR);
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);

app.use('/download', express.static(PUBLIC_DIR) as any);

// Streaming logs helper
const sendEvent = (res: Response, data: any) => {
    // Cast to any because express types might be incomplete in this specific environment
    (res as any).write(`data: ${JSON.stringify(data)}\n\n`);
};

app.get('/api/build/stream', async (req: Request, res: Response) => {
    const { repoUrl } = req.query;
    
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!repoUrl || typeof repoUrl !== 'string') {
        sendEvent(res, { type: 'error', message: 'No Repository URL provided' });
        res.end();
        return;
    }

    const buildId = uuidv4();
    const projectDir = path.join(WORKSPACE_DIR, buildId);
    
    const log = (message: string, type: 'info' | 'command' | 'error' | 'success' = 'info') => {
        sendEvent(res, { type: 'log', log: { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), message, type } });
    };

    const updateStatus = (status: string) => {
        sendEvent(res, { type: 'status', status });
    };

    try {
        log(`Starting build process for ID: ${buildId}`, 'info');
        
        // 1. Git Clone
        updateStatus('CLONING');
        log(`Cloning ${repoUrl}...`, 'command');
        await runCommand('git', ['clone', repoUrl, '.'], projectDir);
        
        // 2. Install Dependencies
        updateStatus('INSTALLING');
        log('Installing dependencies (npm install)...', 'command');
        await runCommand('npm', ['install'], projectDir, log);

        // 3. Build Web Assets
        updateStatus('BUILDING_WEB');
        log('Building web assets (npm run build)...', 'command');
        // Check if build script exists, otherwise try common ones
        await runCommand('npm', ['run', 'build'], projectDir, log);

        // 4. Initialize Capacitor
        updateStatus('CAPACITOR_INIT');
        log('Initializing Capacitor...', 'command');
        // Heuristic: Check if 'dist' or 'build' exists to set webDir
        const webDir = fs.existsSync(path.join(projectDir, 'build')) ? 'build' : 'dist';
        await runCommand('npx', ['cap', 'init', 'AppBuilderApp', 'com.appbuilder.generated', '--web-dir', webDir], projectDir, log);

        // 5. Add Android Platform
        log('Adding Android platform...', 'command');
        await runCommand('npx', ['cap', 'add', 'android'], projectDir, log);

        // 6. Sync Capacitor
        updateStatus('ANDROID_SYNC');
        log('Syncing Capacitor...', 'command');
        await runCommand('npx', ['cap', 'sync'], projectDir, log);

        // 7. Build APK with Gradle
        updateStatus('COMPILING_APK');
        log('Compiling APK with Gradle (this may take a while)...', 'command');
        
        // Ensure gradlew is executable
        await runCommand('chmod', ['+x', 'android/gradlew'], projectDir, log);
        
        // Run assembleDebug inside the android directory
        const androidDir = path.join(projectDir, 'android');
        await runCommand('./gradlew', ['assembleDebug'], androidDir, log);

        // 8. Locate and Move APK
        log('Locating generated APK...', 'info');
        const expectedApkPath = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
        const publicApkName = `app-${buildId}.apk`;
        const publicApkPath = path.join(PUBLIC_DIR, publicApkName);

        if (fs.existsSync(expectedApkPath)) {
             fs.renameSync(expectedApkPath, publicApkPath);
             const downloadUrl = `http://localhost:${PORT}/download/${publicApkName}`;
             
             updateStatus('SUCCESS');
             log('APK generated successfully!', 'success');
             sendEvent(res, { type: 'result', success: true, downloadUrl });
        } else {
            throw new Error('APK file not found after build.');
        }

    } catch (error: any) {
        updateStatus('ERROR');
        log(error.message || 'Unknown build error', 'error');
        sendEvent(res, { type: 'result', success: false, error: error.message });
    } finally {
        // Cleanup: remove project dir
        // fs.rmSync(projectDir, { recursive: true, force: true });
        res.end();
    }
});

// Helper to run shell commands
function runCommand(command: string, args: string[], cwd: string, logFn?: (msg: string, type: 'info' | 'error') => void): Promise<void> {
    return new Promise((resolve, reject) => {
        // Ensure directory exists
        if (!fs.existsSync(cwd)) {
            fs.mkdirSync(cwd, { recursive: true });
        }

        const child = spawn(command, args, { cwd, shell: true });

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
                if(line.trim() && logFn) logFn(line.trim(), 'info');
            });
        });

        child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
                // Gradle warnings often come in stderr but aren't fatal errors
                if(line.trim() && logFn) logFn(line.trim(), 'info'); 
            });
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

// Only listen if not imported as module (optional check)
app.listen(PORT, () => {
    console.log(`Build Server running on http://localhost:${PORT}`);
});