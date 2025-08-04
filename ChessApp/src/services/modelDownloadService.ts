/**
 * Model Download Service
 * Handles downloading and managing GGUF models
 */

import RNFS from 'react-native-fs';

export interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  percentage: number;
}

class ModelDownloadService {
  private readonly modelDir = `${RNFS.DocumentDirectoryPath}/models`;
  private downloadTask: any = null;

  /**
   * Ensure models directory exists
   */
  async ensureModelDirectory(): Promise<void> {
    const exists = await RNFS.exists(this.modelDir);
    if (!exists) {
      await RNFS.mkdir(this.modelDir);
    }
  }

  /**
   * Check if model exists locally
   */
  async modelExists(filename: string): Promise<boolean> {
    const path = `${this.modelDir}/${filename}`;
    return await RNFS.exists(path);
  }

  /**
   * Get model path
   */
  getModelPath(filename: string): string {
    return `${this.modelDir}/${filename}`;
  }

  /**
   * Download Mistral 7B model
   */
  async downloadMistral(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const filename = 'mistral-7b-instruct-v0.2.Q4_K_M.gguf';
    const modelPath = this.getModelPath(filename);

    // Check if already exists
    if (await this.modelExists(filename)) {
      console.log('Mistral model already exists');
      return modelPath;
    }

    // Ensure directory exists
    await this.ensureModelDirectory();

    // Download URL - using a smaller quantized version for mobile
    const url = 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf';

    console.log('Downloading Mistral 7B model...');

    try {
      this.downloadTask = RNFS.downloadFile({
        fromUrl: url,
        toFile: modelPath,
        background: true,
        discretionary: true,
        progress: (res) => {
          const percentage = (res.bytesWritten / res.contentLength) * 100;
          if (onProgress) {
            onProgress({
              bytesWritten: res.bytesWritten,
              contentLength: res.contentLength,
              percentage,
            });
          }
        },
      });

      const result = await this.downloadTask.promise;
      
      if (result.statusCode === 200) {
        console.log('Mistral model downloaded successfully');
        return modelPath;
      } else {
        throw new Error(`Download failed with status: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Failed to download Mistral model:', error);
      throw error;
    }
  }

  /**
   * Cancel current download
   */
  cancelDownload() {
    if (this.downloadTask) {
      RNFS.stopDownload(this.downloadTask.jobId);
      this.downloadTask = null;
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(filename: string): Promise<{
    exists: boolean;
    size?: number;
    path?: string;
  }> {
    const path = this.getModelPath(filename);
    const exists = await this.modelExists(filename);

    if (exists) {
      const stat = await RNFS.stat(path);
      return {
        exists: true,
        size: stat.size,
        path,
      };
    }

    return { exists: false };
  }

  /**
   * Delete model
   */
  async deleteModel(filename: string): Promise<void> {
    const path = this.getModelPath(filename);
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  }

  /**
   * Get available storage space
   */
  async getAvailableSpace(): Promise<number> {
    const info = await RNFS.getFSInfo();
    return info.freeSpace;
  }

  /**
   * Check if enough space for model
   */
  async hasEnoughSpace(requiredBytes: number = 4 * 1024 * 1024 * 1024): Promise<boolean> {
    const available = await this.getAvailableSpace();
    return available > requiredBytes;
  }
}

export const modelDownloader = new ModelDownloadService();