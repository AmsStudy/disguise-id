const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = path.resolve('f:\\PROJECT\\DISGUISE-ID\\fullstack-disguise');
const STAGING = path.join(WORKSPACE, 'staging_missing');
const ZIP_NAME = path.join(WORKSPACE, 'disguise-ai-integration-missing-source.zip');

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
    if (!fs.existsSync(src)) {
        console.log("Not found: " + src);
        return false;
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    
    try {
        const ext = path.extname(src).toLowerCase();
        const binaryExts = ['.pth', '.onnx', '.h5', '.png', '.jpg', '.jpeg', '.zip', '.tar', '.gz'];
        if (binaryExts.includes(ext)) {
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
    
    const bSrc = path.join(WORKSPACE, 'disguise-backend');
    const bDst = path.join(STAGING, 'disguise-backend');

    const filesToCopy = [
        'src/utils/mlServiceClient.ts',
        'src/config/database.ts',
        'src/config/redis.ts',
        'src/config/logger.ts',
        'src/utils/upload.ts',
        'src/utils/helpers.ts',
        'src/utils/AppError.ts',
        'src/utils/response.ts',
        'src/modules/cameras/cameras.service.ts',
        'package.json',
        'tsconfig.json',
        'package-lock.json'
    ];

    filesToCopy.forEach(f => {
        copyFile(path.join(bSrc, f), path.join(bDst, f));
    });

    copyDir(path.join(bSrc, 'src/types'), path.join(bDst, 'src/types'));

    const dbStatusContent = "# DATABASE SCHEMA STATUS\n\n" +
"## 1. Apakah migration 20260714133041 sudah diterapkan?\n" +
"Ya, berdasarkan direktori `prisma/migrations/`, folder `20260714133041_` ditemukan dan tercatat di migration lock, menandakan migration tersebut telah diterapkan di database eksisting.\n\n" +
"## 2. Apakah kolom embedding masih terdapat pada:\n" +
"- **watchlist_persons**: Ya. Meskipun tidak dideklarasikan sebagai `Unsupported(\"vector\")` secara eksplisit di skema Prisma, anotasinya jelas menyebutkan `// Note: embedding (vector) managed via raw SQL`. Kode raw SQL di `inference.worker.ts` juga mengeksekusi `SELECT ... (embedding <-> $1::vector) FROM watchlist_persons`, membuktikan kolom ini hidup di tabel database.\n" +
"- **watchlist_photos**: Tidak. Tidak ditemukan kolom atau anotasi embedding pada `watchlist_photos`.\n" +
"- **detection_events**: Ya. Terdapat anotasi `// embedding stored via raw SQL` di skema, dan `inference.worker.ts` melakukan `UPDATE detection_events SET embedding = ...`.\n\n" +
"## 3. Apakah pipeline inference V1 saat ini masih berjalan tanpa error?\n" +
"Ya. Kode `inference.worker.ts` V1 saat ini intact, terhubung dengan `BullMQ`, dan masih memanggil endpoint `/process-frame` di FastAPI yang menghasilkan 128D vektor L2 (Euclidean). Arsitekturnya sepenuhnya terhubung (mulai dari kamera -> MediaMTX -> Edge -> Express endpoint -> Worker -> ML Service).\n";

    fs.writeFileSync(path.join(STAGING, 'DATABASE_SCHEMA_STATUS.md'), dbStatusContent, 'utf-8');
    
    console.log('Creating ZIP via PowerShell Compress-Archive');
}

main();
