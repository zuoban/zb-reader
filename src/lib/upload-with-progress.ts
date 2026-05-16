/**
 * Upload a file with progress callbacks using XMLHttpRequest.
 * 
 * fetch API does not support upload progress events.
 * XMLHttpRequest.upload.onprogress is the only native browser API
 * that provides real-time upload progress.
 */

export interface UploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

const UPLOAD_TIMEOUT_MS = 300000; // 5 minutes for large files

export function uploadWithProgress(options: UploadOptions): Promise<UploadResult> {
  const { file, onProgress, signal } = options;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/books");
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (!onProgress) return;
      
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        // Clamp to 0-100 and round
        const clampedPercent = Math.min(100, Math.max(0, percent));
        onProgress(Math.round(clampedPercent));
      } else {
        // If total is unknown, just show indeterminate progress
        onProgress(0);
      }
    });

    // Upload completed
    xhr.addEventListener("load", () => {
      try {
        const status = xhr.status;
        const ok = status >= 200 && status < 300;
        
        if (ok) {
          const data = JSON.parse(xhr.responseText);
          resolve({ ok: true, status, data });
        } else {
          let error = "上传失败";
          try {
            const response = JSON.parse(xhr.responseText);
            error = response.error || error;
          } catch {
            // Use default error message
          }
          resolve({ ok: false, status, error });
        }
      } catch {
        resolve({ ok: false, status: xhr.status, error: "上传失败" });
      }
    });

    // Network error
    xhr.addEventListener("error", () => {
      resolve({ ok: false, status: 0, error: "网络请求失败，请检查网络连接" });
    });

    // Timeout
    xhr.addEventListener("timeout", () => {
      resolve({ ok: false, status: 0, error: "上传超时，请稍后重试" });
    });

    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        resolve({ ok: false, status: 0, error: "上传已取消" });
      });
    }

    // Build FormData and send
    const formData = new FormData();
    formData.append("file", file);

    xhr.send(formData);
  });
}
