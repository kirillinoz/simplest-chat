interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  timestamp: number;
}

interface FileReference {
  id: string;
  name: string;
  type: string;
  size: number;
}

class FileStorageManager {
  private dbName = "minigem-files";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("files")) {
          const store = db.createObjectStore("files", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async storeFile(file: File): Promise<FileReference> {
    if (!this.db) await this.init();

    const id = crypto.randomUUID();
    const arrayBuffer = await file.arrayBuffer();

    const storedFile: StoredFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      data: arrayBuffer,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const request = store.add(storedFile);

      request.onsuccess = () => {
        resolve({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getFile(id: string): Promise<File | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["files"], "readonly");
      const store = transaction.objectStore("files");
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as StoredFile;
        if (result) {
          const file = new File([result.data], result.name, {
            type: result.type,
          });
          resolve(file);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }

  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();

    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const index = store.index("timestamp");
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const fileStorage = new FileStorageManager();
export type { FileReference };
