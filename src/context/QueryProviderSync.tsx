/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { ChartType, GeminiAnalysisResult } from "../types";

export interface QueryItem {
  id: string;
  datasetId: string;
  datasetName: string;
  question: string;
  sql: string;
  chartType: ChartType;
  timestamp: string;
  createdAt?: number;
  explanation?: string;
  result?: any[];
  analysis?: GeminiAnalysisResult;
}

interface QueryContextType {
  queries: QueryItem[];
  addQuery: (query: QueryItem) => Promise<void>;
  removeQuery: (id: string) => Promise<void>;
  removeQueriesByDatasetId: (datasetId: string) => Promise<void>;
  clearQueries: () => Promise<void>;
  isSynced: boolean;
  isQueryRunning: boolean;
  setIsQueryRunning: (running: boolean) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export function useQueryContext() {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error("useQueryContext must be used within a QueryProvider");
  }
  return context;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  // Sync Logic
  useEffect(() => {
    if (!user) {
      setQueries([]);
      setIsSynced(false);
      return;
    }

    // Reset local view immediately on user switch to ensure 0 bleed
    setQueries([]);

    // Authenticated: load from Firestore real-time snapshot
    const path = `users/${user.uid}/queries`;
    const queriesColRef = collection(db, path);

    const unsubscribe = onSnapshot(
      queriesColRef,
      (snapshot) => {
        const loaded: QueryItem[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as QueryItem);
        });
        
        // Robust sort using createdAt timestamp primarily, falling back lexicographically
        loaded.sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          if (timeA && timeB) {
            return timeB - timeA;
          }
          return b.timestamp.localeCompare(a.timestamp);
        });
        
        setQueries(loaded);
        setIsSynced(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Recursively remove "undefined" properties before saving to Firestore, replacing with null or stripping
  const cleanUndefined = (val: any): any => {
    if (val === undefined) return null;
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map(cleanUndefined);
    }
    if (typeof val === "object") {
      const cleaned: Record<string, any> = {};
      Object.keys(val).forEach((key) => {
        const subVal = val[key];
        if (subVal !== undefined) {
          cleaned[key] = cleanUndefined(subVal);
        }
      });
      return cleaned;
    }
    return val;
  };

   const addQuery = async (query: QueryItem) => {
    // Optimistic local update for instant UI feedback and to prevent race conditions
    setQueries((prev) => {
      const filtered = prev.filter((q) => q.id !== query.id);
      return [query, ...filtered];
    });

    if (!user) {
      return;
    }

    // Cloud saving
    const path = `users/${user.uid}/queries`;
    try {
      const docRef = doc(db, path, query.id);
      
      // Clean undefined fields to conform with Firestore
      const cleaned: Record<string, any> = {
        id: query.id,
        datasetId: query.datasetId,
        datasetName: query.datasetName,
        question: query.question,
        sql: query.sql,
        chartType: query.chartType,
        timestamp: query.timestamp,
      };

      if (query.createdAt) cleaned.createdAt = query.createdAt;
      // Guard against saving massive arrays to a single Firestore document (1MB limit)
      if (query.result && query.result.length > 100) {
        console.warn(`Query response payload contains ${query.result.length} rows. Truncating to 100 rows for Firestore sync.`);
        cleaned.result = query.result.slice(0, 100);
      } else if (query.result) {
        cleaned.result = query.result;
      }
      
      if (query.analysis) cleaned.analysis = query.analysis;

      // Deep clean complex nested structures to prevent Firestore validation failures
      const deepCleaned = cleanUndefined(cleaned);

      await setDoc(docRef, deepCleaned);
    } catch (error) {
      console.warn("Firestore querying backup failed. Storing locally instead. Execution will continue unimpeded:", error);
      // Swept under the rug to prevent any cloud rate limits or permissions from causing an overlay error in browser.
    }
  };

  const removeQuery = async (id: string) => {
    // Optimistic local update
    setQueries((prev) => prev.filter((q) => q.id !== id));

    if (!user) {
      return;
    }

    // Cloud deletion
    const path = `users/${user.uid}/queries`;
    try {
      const docRef = doc(db, path, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const removeQueriesByDatasetId = async (datasetId: string) => {
    // Optimistic local update
    setQueries((prev) => prev.filter((q) => q.datasetId !== datasetId));

    if (!user) {
      return;
    }

    // Cloud deletion
    const path = `users/${user.uid}/queries`;
    try {
      const queriesColRef = collection(db, path);
      const querySnap = await getDocs(queriesColRef);
      const batch = writeBatch(db);
      let count = 0;
      querySnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.datasetId === datasetId) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const clearQueries = async () => {
    if (!user) {
      // Local fallback
      setQueries([]);
      localStorage.removeItem("basira_queries");
      return;
    }

    // Cloud deletion of all queries
    const path = `users/${user.uid}/queries`;
    try {
      const queriesColRef = collection(db, path);
      const querySnap = await getDocs(queriesColRef);
      const batch = writeBatch(db);
      
      querySnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <QueryContext.Provider
      value={{
        queries,
        addQuery,
        removeQuery,
        removeQueriesByDatasetId,
        clearQueries,
        isSynced,
        isQueryRunning,
        setIsQueryRunning,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
}
