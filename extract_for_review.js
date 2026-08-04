const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = path.resolve('f:\\PROJECT\\DISGUISE-ID\\fullstack-disguise');
const STAGING = path.join(WORKSPACE, 'staging_extract');
const ZIP_NAME = path.join(WORKSPACE, 'disguise-ai-integration-source.zip');

function redactContent(content) {
    // JWT Secrets
    content = content.replace(/(JWT_SECRET=)[\w\-\.]+/g, '$1[REDACTED]');
    content = content.replace(/(jwt\.verify\(.*?, process\.env\.JWT_SECRET \|\| )['"].*?['"]/g, '$1"[REDACTED]"');
    
    // API Keys
    content = content.replace(/(x-api-key\s*:\s*)[\w\-]+/ig, '$1[REDACTED]');
    content = content.replace(/(IOT_API_KEY\s*=\s*)['"].*?['"]/g, '$1"[REDACTED]"');
    content = content.replace(/(validIotKey\s*=\s*process\.env\.IOT_API_KEY \|\| )['"].*?['"]/g, '$1"[REDACTED]"');
    
    // RTSP Credentials
    content = content.replace(/rtsp:\/\/[^@]+@/g, 'rtsp://[REDACTED_USER]:[REDACTED_PASSWORD]@');
    
    // Passwords / DB Credentials
    content = content.replace(/(POSTGRES_PASSWORD:\s*).*/g, '$1[REDACTED]');
    content = content.replace(/(MINIO_ROOT_PASSWORD:\s*).*/g, '$1[REDACTED]');
    content = content.replace(/(DATABASE_URL=).*/g, '$1postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DB]?schema=public');
    
    return content;
}

function copyFile(src, dst) {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    
    try {
        const ext = path.extname(src).toLowerCase();
        const binaryExts = ['.pth', '.onnx', '.h5', '.png', '.jpg', '.jpeg', '.zip', '.tar', '.gz'];
        if (binaryExts.includes(ext)) {
            // Exclude heavy binaries
            if (ext !== '.pth' && ext !== '.onnx' && ext !== '.h5') {
                 fs.copyFileSync(src, dst);
            }
            return true;
        }
        let content = fs.readFileSync(src, 'utf-8');
        let redacted = redactContent(content);
        fs.writeFileSync(dst, redacted, 'utf-8');
    } catch (e) {
        console.log(`Skipping file: ${src} (${e.message})`);
        return false;
    }
    return true;
}

function copyDir(src, dst, includeExts = null, excludeDirs = null) {
    if (!fs.existsSync(src)) return false;
    excludeDirs = excludeDirs || ['.git', 'node_modules', '.next', '__pycache__', 'venv', 'models'];
    
    let copied = false;
    const items = fs.readdirSync(src, { withFileTypes: true });
    for (const item of items) {
        const srcPath = path.join(src, item.name);
        const dstPath = path.join(dst, item.name);
        
        if (item.isDirectory()) {
            if (!excludeDirs.includes(item.name)) {
                if (copyDir(srcPath, dstPath, includeExts, excludeDirs)) {
                    copied = true;
                }
            }
        } else {
            if (includeExts && !includeExts.some(ext => item.name.endsWith(ext))) {
                continue;
            }
            if (copyFile(srcPath, dstPath)) {
                copied = true;
            }
        }
    }
    return copied;
}

function main() {
    if (fs.existsSync(STAGING)) {
        fs.rmSync(STAGING, { recursive: true, force: true });
    }
    fs.mkdirSync(STAGING, { recursive: true });
    
    let manifest = ["# SOURCE MANIFEST\n\n## Included Files:\n"];
    let notFound = ["\n## Not Found / Excluded Files:\n"];
    
    function addToManifest(p, success, note = "") {
        if (success) {
            manifest.push(`- \`[FOUND]\` ${p} ${note}\n`);
        } else {
            notFound.push(`- \`[NOT FOUND / EXCLUDED]\` ${p}\n`);
        }
    }

    // 1. ml-service
    const mlSrc = path.join(WORKSPACE, 'ml-service');
    const mlDst = path.join(STAGING, 'ml-service');
    addToManifest("ml-service/main.py", copyFile(path.join(mlSrc, 'main.py'), path.join(mlDst, 'main.py')));
    addToManifest("ml-service/Dockerfile", copyFile(path.join(mlSrc, 'Dockerfile'), path.join(mlDst, 'Dockerfile')));
    addToManifest("ml-service/requirements.txt", copyFile(path.join(mlSrc, 'requirements.txt'), path.join(mlDst, 'requirements.txt')));
    
    if (fs.existsSync(mlSrc)) {
        const mlItems = fs.readdirSync(mlSrc);
        for (const item of mlItems) {
            if (item.endsWith('.py') && item !== 'main.py') {
                copyFile(path.join(mlSrc, item), path.join(mlDst, item));
                addToManifest(`ml-service/${item}`, true, "(local import script)");
            }
        }
    }
    
    // 2. disguise-backend
    const bSrc = path.join(WORKSPACE, 'disguise-backend');
    const bDst = path.join(STAGING, 'disguise-backend');
    addToManifest("backend/src/queues/inference.worker.ts", copyFile(path.join(bSrc, 'src/queues', 'inference.worker.ts'), path.join(bDst, 'src/queues', 'inference.worker.ts')));
    addToManifest("backend/src/queues/index.ts", copyFile(path.join(bSrc, 'src/queues', 'index.ts'), path.join(bDst, 'src/queues', 'index.ts')));
    addToManifest("backend/src/modules/inference/", copyDir(path.join(bSrc, 'src/modules', 'inference'), path.join(bDst, 'src/modules', 'inference')));
    addToManifest("backend/src/modules/watchlist/", copyDir(path.join(bSrc, 'src/modules', 'watchlist'), path.join(bDst, 'src/modules', 'watchlist')));
    addToManifest("backend/src/sockets/", copyDir(path.join(bSrc, 'src/sockets'), path.join(bDst, 'src/sockets')));
    addToManifest("backend/src/config/minio.ts", copyFile(path.join(bSrc, 'src/config', 'minio.ts'), path.join(bDst, 'src/config', 'minio.ts')));
    addToManifest("backend/prisma/schema.prisma", copyFile(path.join(bSrc, 'prisma', 'schema.prisma'), path.join(bDst, 'prisma', 'schema.prisma')));
    addToManifest("backend/prisma/migrations/", copyDir(path.join(bSrc, 'prisma', 'migrations'), path.join(bDst, 'prisma', 'migrations')));
    addToManifest("backend/docker-compose.yml", copyFile(path.join(bSrc, 'docker-compose.yml'), path.join(bDst, 'docker-compose.yml')));
    addToManifest("backend/.env.example", copyFile(path.join(bSrc, '.env.example'), path.join(bDst, '.env.example')));
    addToManifest("backend/mediamtx.yml", copyFile(path.join(bSrc, 'mediamtx.yml'), path.join(bDst, 'mediamtx.yml')));

    // 3. disguise-raps/v2
    const rSrc = path.join(WORKSPACE, 'disguise-raps', 'v2');
    const rDst = path.join(STAGING, 'disguise-raps', 'v2');
    addToManifest("disguise-raps/v2/disguiseid_capture.py", copyFile(path.join(rSrc, 'disguiseid_capture.py'), path.join(rDst, 'disguiseid_capture.py')));
    
    if (fs.existsSync(rSrc)) {
        const rItems = fs.readdirSync(rSrc);
        for (const item of rItems) {
            if (item.endsWith('.py') && item !== 'disguiseid_capture.py') {
                copyFile(path.join(rSrc, item), path.join(rDst, item));
                addToManifest(`disguise-raps/v2/${item}`, true, "(local import script)");
            }
        }
    }

    // 4. disguise-frontend
    const fSrc = path.join(WORKSPACE, 'disguise-frontend');
    const fDst = path.join(STAGING, 'disguise-frontend');
    addToManifest("frontend/services/socket.ts", copyFile(path.join(fSrc, 'services', 'socket.ts'), path.join(fDst, 'services', 'socket.ts')));
    addToManifest("frontend/store/alertStore.ts", copyFile(path.join(fSrc, 'store', 'alertStore.ts'), path.join(fDst, 'store', 'alertStore.ts')));
    
    const alertComps = path.join(fSrc, 'components', 'alerts');
    addToManifest("frontend/components/alerts/", copyDir(alertComps, path.join(fDst, 'components', 'alerts')));
    
    const alertPage = path.join(fSrc, 'app', '(dashboard)', 'alerts');
    if (fs.existsSync(alertPage)) {
        addToManifest("frontend/app/(dashboard)/alerts/", copyDir(alertPage, path.join(fDst, 'app', '(dashboard)', 'alerts')));
    } else {
        const alertPage2 = path.join(fSrc, 'app', 'alerts');
        addToManifest("frontend/app/alerts/", copyDir(alertPage2, path.join(fDst, 'app', 'alerts')));
    }
    
    const livePage = path.join(fSrc, 'app', '(dashboard)', 'live');
    if (fs.existsSync(livePage)) {
        addToManifest("frontend/app/(dashboard)/live/", copyDir(livePage, path.join(fDst, 'app', '(dashboard)', 'live')));
    } else {
        const livePage2 = path.join(fSrc, 'app', 'live');
        addToManifest("frontend/app/live/", copyDir(livePage2, path.join(fDst, 'app', 'live')));
    }
    
    addToManifest("frontend/services/", copyDir(path.join(fSrc, 'services'), path.join(fDst, 'services')));
    
    // Write manifest
    fs.writeFileSync(path.join(STAGING, 'SOURCE_MANIFEST.md'), manifest.join('') + notFound.join(''));
    
    console.log('Creating ZIP via PowerShell Compress-Archive');
}

main();
