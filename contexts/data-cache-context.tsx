"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

interface CacheData {
  dashboard: {
    stats: any
    activities: any[]
    lastUpdated: Date | null
  }
  lines: {
    stats: any
    data: any[]
    lastUpdated: Date | null
  }
  tasks: {
    stats: any
    data: any[]
    lastUpdated: Date | null
  }
  invoices: {
    stats: any
    data: any[]
    lastUpdated: Date | null
  }
}

interface DataCacheContextType {
  cache: CacheData
  updateCache: (page: keyof CacheData, data: Partial<CacheData[keyof CacheData]>) => void
  clearCache: (page?: keyof CacheData) => void
  isStale: (page: keyof CacheData, maxAge?: number) => boolean
}

const initialCache: CacheData = {
  dashboard: { stats: null, activities: [], lastUpdated: null },
  lines: { stats: null, data: [], lastUpdated: null },
  tasks: { stats: null, data: [], lastUpdated: null },
  invoices: { stats: null, data: [], lastUpdated: null },
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined)

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<CacheData>(initialCache)

  const updateCache = useCallback((page: keyof CacheData, data: Partial<CacheData[keyof CacheData]>) => {
    setCache((prev) => ({
      ...prev,
      [page]: {
        ...prev[page],
        ...data,
        lastUpdated: new Date(),
      },
    }))
  }, [])

  const clearCache = useCallback((page?: keyof CacheData) => {
    if (page) {
      setCache((prev) => ({
        ...prev,
        [page]: initialCache[page],
      }))
    } else {
      setCache(initialCache)
    }
  }, [])

  const isStale = useCallback(
    (page: keyof CacheData, maxAge: number = 5 * 60 * 1000) => {
      const lastUpdated = cache[page].lastUpdated
      if (!lastUpdated) return true
      return Date.now() - lastUpdated.getTime() > maxAge
    },
    [cache],
  )

  return (
    <DataCacheContext.Provider value={{ cache, updateCache, clearCache, isStale }}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache() {
  const context = useContext(DataCacheContext)
  if (context === undefined) {
    throw new Error("useDataCache must be used within a DataCacheProvider")
  }
  return context
}
