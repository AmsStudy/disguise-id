import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { V2ShadowLogEntry } from '../types/ml-service-v2.types';
import { mlServiceV2Config } from '../config/ml-service-v2.config';

class MLServiceV2Logger {
  private logPath: string;
  private isWriting: boolean = false;
  private queue: V2ShadowLogEntry[] = [];

  constructor() {
    this.logPath = path.resolve(process.cwd(), mlServiceV2Config.shadowLogPath);
    // Ensure directory exists synchronously during startup
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      logger.error('Failed to create directory for ML V2 shadow logs:', err);
    }
  }

  /**
   * Appends a log entry to the queue and triggers processing.
   * This method never throws.
   */
  public log(entry: V2ShadowLogEntry): void {
    this.queue.push(entry);
    this.processQueue().catch(err => {
      // Catch any unexpected error in processing loop to prevent unhandled rejections
      logger.error('Unhandled error in ML V2 Shadow Logger queue processing:', err);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isWriting || this.queue.length === 0) {
      return;
    }

    this.isWriting = true;

    try {
      // Batch up all currently queued items
      const itemsToWrite = [...this.queue];
      this.queue = [];

      if (itemsToWrite.length > 0) {
        const fileContent = itemsToWrite.map(item => JSON.stringify(item)).join('\n') + '\n';
        
        try {
          await fs.promises.appendFile(this.logPath, fileContent, 'utf8');
        } catch (writeErr) {
          logger.error('Failed to write to ML V2 shadow log file', writeErr);
          // We intentionally drop the logs here rather than retrying indefinitely to prevent memory leaks
          // if the disk is full or file is locked permanently.
        }
      }
    } finally {
      this.isWriting = false;
      // If new items were added while writing, process them
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}

export const mlServiceV2Logger = new MLServiceV2Logger();
