"use client";

import type React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import type { TaskRecord } from "@/types/tasks";

export interface DashboardStats {
  totalLines: number;
  activeTasks: number;
  pendingReviews: number;
  monthlyRevenue: number;
  lineChange: number;
  taskChange: number;
  reviewChange: number;
  revenueChange: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  location: string;
  time: string;
  status: string;
  created_at: string;
}

export interface LineStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export interface GeneratedInvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_type: "A" | "B";
  month: number;
  year: number;
  job_month: string;
  invoice_date: string;
  total_amount: number;
  line_count: number;
  line_details_ids: string[];
  status: string;
  created_at: string;
}

export interface InvoiceStats {
  thisMonth: number;
  totalAmount: number;
  linesBilled: number;
  avgRate: number;
}

interface CacheData {
  dashboard: {
    stats: DashboardStats | null;
    activities: RecentActivity[];
    lastUpdated: Date | null;
  };
  lines: {
    stats: LineStats | null;
    data: unknown[];
    lastUpdated: Date | null;
  };
  tasks: {
    stats: null;
    data: TaskRecord[];
    lastUpdated: Date | null;
  };
  invoices: {
    stats: InvoiceStats | null;
    data: GeneratedInvoiceRecord[];
    lastUpdated: Date | null;
  };
}

interface DataCacheContextType {
  cache: CacheData;
  updateCache: (
    page: keyof CacheData,
    data: Partial<CacheData[keyof CacheData]>
  ) => void;
  clearCache: (page?: keyof CacheData) => void;
  isStale: (page: keyof CacheData, maxAge?: number) => boolean;
}

const initialCache: CacheData = {
  dashboard: { stats: null, activities: [], lastUpdated: null },
  lines: { stats: null, data: [], lastUpdated: null },
  tasks: { stats: null, data: [], lastUpdated: null },
  invoices: { stats: null, data: [], lastUpdated: null },
};

const DataCacheContext = createContext<DataCacheContextType | undefined>(
  undefined
);

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<CacheData>(initialCache);

  const updateCache = useCallback(
    (page: keyof CacheData, data: Partial<CacheData[keyof CacheData]>) => {
      setCache((prev) => ({
        ...prev,
        [page]: {
          ...prev[page],
          ...data,
          lastUpdated: new Date(),
        },
      }));
    },
    []
  );

  const clearCache = useCallback((page?: keyof CacheData) => {
    if (page) {
      setCache((prev) => ({
        ...prev,
        [page]: initialCache[page],
      }));
    } else {
      setCache(initialCache);
    }
  }, []);

  const isStale = useCallback(
    (page: keyof CacheData, maxAge: number = 5 * 60 * 1000) => {
      const lastUpdated = cache[page].lastUpdated;
      if (!lastUpdated) return true;
      return Date.now() - lastUpdated.getTime() > maxAge;
    },
    [cache]
  );

  return (
    <DataCacheContext.Provider
      value={{ cache, updateCache, clearCache, isStale }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }
  return context;
}
