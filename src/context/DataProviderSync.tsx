/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { SAMPLE_DATASET_METADATA } from "../data/sampleDataset";

export interface Dataset {
  id: string;
  name: string;
  uploadedAt: string;
  rowCount: number;
  columns: string[];
  fileSize: string;
  rawData?: any[];
}

interface DataContextType {
  datasets: Dataset[];
  activeDatasetId: string | null;
  addDataset: (dataset: Dataset) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  setActiveDatasetId: (id: string | null) => void;
  isSynced: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// User-scoped memory cache for raw data records
const memoryRawDataCache: Map<string, any[]> = new Map();

function getCacheKey(userId: string | undefined, datasetId: string): string {
  return `${userId || "guest"}__${datasetId}`;
}

function saveRawDataToIDB(cacheKey: string, rawData: any[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("basira_raw_db", 1);
      request.onupgradeneeded = (e: any) => {
        const dbObj = e.target.result;
        if (!dbObj.objectStoreNames.contains("rawDataStore")) {
          dbObj.createObjectStore("rawDataStore");
        }
      };
      request.onsuccess = (e: any) => {
        const dbObj = e.target.result;
        const tx = dbObj.transaction("rawDataStore", "readwrite");
        const store = tx.objectStore("rawDataStore");
        store.put(rawData, cacheKey);
        tx.oncomplete = () => resolve();
      };
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function loadRawDataFromIDB(cacheKey: string): Promise<any[] | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("basira_raw_db", 1);
      request.onupgradeneeded = (e: any) => {
        const dbObj = e.target.result;
        if (!dbObj.objectStoreNames.contains("rawDataStore")) {
          dbObj.createObjectStore("rawDataStore");
        }
      };
      request.onsuccess = (e: any) => {
        const dbObj = e.target.result;
        const tx = dbObj.transaction("rawDataStore", "readonly");
        const store = tx.objectStore("rawDataStore");
        const query = store.get(cacheKey);
        query.onsuccess = () => resolve(query.result || null);
        query.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetIdState] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  // Load guest datasets from local storage
  const loadGuestDatasets = () => {
    try {
      const stored = localStorage.getItem("basira_guest_datasets");
      let list: Dataset[] = stored ? JSON.parse(stored) : [SAMPLE_DATASET_METADATA];
      
      // Hydrate with memory or IDB
      list = list.map((ds) => {
        const cacheKey = getCacheKey("guest", ds.id);
        if (!ds.rawData && memoryRawDataCache.has(cacheKey)) {
          ds.rawData = memoryRawDataCache.get(cacheKey);
        }
        return ds;
      });

      setDatasets(list);
      const activeId = localStorage.getItem("basira_active_dataset_id_guest") || (list[0] ? list[0].id : null);
      setActiveDatasetIdState(activeId);
      setIsSynced(false);

      // Hydrate missing rawData from IndexedDB
      list.forEach((ds) => {
        if (!ds.rawData) {
          const cacheKey = getCacheKey("guest", ds.id);
          loadRawDataFromIDB(cacheKey).then((cached) => {
            if (cached) {
              memoryRawDataCache.set(cacheKey, cached);
              setDatasets((prev) =>
                prev.map((item) => (item.id === ds.id ? { ...item, rawData: cached } : item))
              );
            }
          });
        }
      });
    } catch {
      setDatasets([SAMPLE_DATASET_METADATA]);
      setActiveDatasetIdState(SAMPLE_DATASET_METADATA.id);
    }
  };

  // Sync Logic & User State Boundary
  useEffect(() => {
    if (!user) {
      loadGuestDatasets();
      return;
    }

    // Reset local view immediately on user switch to ensure 0 bleed
    setDatasets([]);
    const savedActiveId = localStorage.getItem(`basira_active_dataset_id_${user.uid}`);
    setActiveDatasetIdState(savedActiveId || null);

    // Authenticated: load from Firestore real-time snapshot
    const path = `users/${user.uid}/datasets`;
    const datasetsColRef = collection(db, path);

    const unsubscribe = onSnapshot(
      datasetsColRef,
      (snapshot) => {
        const loaded: Dataset[] = [];
        snapshot.forEach((docSnap) => {
          const ds = docSnap.data() as Dataset;
          const cacheKey = getCacheKey(user.uid, ds.id);
          // Synchronously check memory cache
          if (!ds.rawData && memoryRawDataCache.has(cacheKey)) {
            ds.rawData = memoryRawDataCache.get(cacheKey);
          }
          loaded.push(ds);
        });

        // Sort datasets in descending order of uploadedAt (newest first)
        loaded.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        // If user has no datasets yet in Firestore, auto-include sample dataset
        if (loaded.length === 0) {
          loaded.push(SAMPLE_DATASET_METADATA);
        }

        setDatasets(loaded);
        setIsSynced(true);

        // Auto-select first dataset if none active
        setActiveDatasetIdState((curr) => {
          if (curr && loaded.some((d) => d.id === curr)) {
            return curr;
          }
          const next = loaded.length > 0 ? loaded[0].id : null;
          if (next) {
            localStorage.setItem(`basira_active_dataset_id_${user.uid}`, next);
          } else {
            localStorage.removeItem(`basira_active_dataset_id_${user.uid}`);
          }
          return next;
        });

        // Asynchronously check IndexedDB cache to hydrate missing rawData
        loaded.forEach((ds) => {
          if (!ds.rawData) {
            const cacheKey = getCacheKey(user.uid, ds.id);
            loadRawDataFromIDB(cacheKey).then((cached) => {
              if (cached) {
                memoryRawDataCache.set(cacheKey, cached);
                setDatasets((prev) =>
                  prev.map((item) => (item.id === ds.id ? { ...item, rawData: cached } : item))
                );
              }
            });
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        // Fallback to local datasets on network error
        loadGuestDatasets();
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addDataset = async (dataset: Dataset) => {
    const userId = user ? user.uid : "guest";
    const cacheKey = getCacheKey(userId, dataset.id);
    if (dataset.rawData) {
      memoryRawDataCache.set(cacheKey, dataset.rawData);
      saveRawDataToIDB(cacheKey, dataset.rawData);
    }

    // Optimistic local update for instant UI feedback
    setDatasets((prev) => {
      const filtered = prev.filter((d) => d.id !== dataset.id);
      const updated = [dataset, ...filtered];
      if (!user) {
        try {
          const metaOnly = updated.map(({ rawData, ...rest }) => rest);
          localStorage.setItem("basira_guest_datasets", JSON.stringify(metaOnly));
        } catch {}
      }
      return updated;
    });
    setActiveDatasetIdState(dataset.id);
    localStorage.setItem(`basira_active_dataset_id_${userId}`, dataset.id);

    if (!user) return;

    // Cloud saving
    const path = `users/${user.uid}/datasets`;
    try {
      const docRef = doc(db, path, dataset.id);

      const cleaned: Partial<Dataset> = {
        id: dataset.id,
        name: dataset.name,
        uploadedAt: dataset.uploadedAt,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
        fileSize: dataset.fileSize,
      };

      const rawDataString = dataset.rawData ? JSON.stringify(dataset.rawData) : "[]";
      if (dataset.rawData && rawDataString.length < 800000) {
        cleaned.rawData = dataset.rawData;
      }

      await setDoc(docRef, cleaned);
    } catch (error) {
      console.error("Firestore writing error. Dataset preserved locally:", error);
    }
  };

  const removeDataset = async (id: string) => {
    const userId = user ? user.uid : "guest";
    const cacheKey = getCacheKey(userId, id);
    memoryRawDataCache.delete(cacheKey);

    // Optimistic local removal
    setDatasets((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      if (!user) {
        try {
          const metaOnly = filtered.map(({ rawData, ...rest }) => rest);
          localStorage.setItem("basira_guest_datasets", JSON.stringify(metaOnly));
        } catch {}
      }
      return filtered;
    });

    if (activeDatasetId === id) {
      setActiveDatasetIdState(null);
      localStorage.removeItem(`basira_active_dataset_id_${userId}`);
    }

    if (!user) return;

    // Cloud delete
    const path = `users/${user.uid}/datasets`;
    try {
      const docRef = doc(db, path, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const setActiveDatasetId = (id: string | null) => {
    setActiveDatasetIdState(id);
    const userId = user ? user.uid : "guest";
    if (id) {
      localStorage.setItem(`basira_active_dataset_id_${userId}`, id);
    } else {
      localStorage.removeItem(`basira_active_dataset_id_${userId}`);
    }
  };

  return (
    <DataContext.Provider
      value={{
        datasets,
        activeDatasetId,
        addDataset,
        removeDataset,
        setActiveDatasetId,
        isSynced,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
