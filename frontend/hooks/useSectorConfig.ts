/**
 * useSectorConfig Hook
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Provides access to the unified sector configuration with:
 * - Automatic caching (single fetch per session)
 * - Loading and error states
 * - Helper functions for common lookups
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { sectorConfigAPI, UnifiedSectorConfig, UnitType } from '@/lib/api';

// Module-level cache to share config across all hook instances
let cachedConfig: UnifiedSectorConfig | null = null;
let cacheVersion: string = '';
let fetchPromise: Promise<UnifiedSectorConfig> | null = null;

interface UseSectorConfigResult {
  config: UnifiedSectorConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;

  // Helper functions
  getSectorProduct: (sectorName: string) => string | null;
  getSectorResource: (sectorName: string) => string | null;
  getProductReferenceValue: (productName: string) => number;
  getResourceBasePrice: (resourceName: string) => number;
  getSectorsProducingProduct: (productName: string) => string[];
  getSectorsDemandingProduct: (productName: string) => Array<{ sector: string; unitTypes: UnitType[] }>;
  getSectorsExtractingResource: (resourceName: string) => string[];
  getSectorsDemandingResource: (resourceName: string) => Array<{ sector: string; unitTypes: UnitType[] }>;
  getUnitInputs: (sectorName: string, unitType: UnitType) => Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
  getUnitOutputs: (sectorName: string, unitType: UnitType) => Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
}

export function useSectorConfig(): UseSectorConfigResult {
  const [config, setConfig] = useState<UnifiedSectorConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async (forceRefresh = false) => {
    // If we have a cached config and not forcing refresh, use it
    if (!forceRefresh && cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (fetchPromise) {
      try {
        const result = await fetchPromise;
        setConfig(result);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch sector configuration');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    // Start the fetch and store the promise
    fetchPromise = sectorConfigAPI.getConfig();

    try {
      const result = await fetchPromise;
      cachedConfig = result;
      cacheVersion = result.version;
      setConfig(result);
    } catch (err: any) {
      console.error('Failed to fetch sector config:', err);
      setError(err.message || 'Failed to fetch sector configuration');
    } finally {
      setLoading(false);
      fetchPromise = null;
    }
  }, []);

  const refetch = useCallback(async () => {
    cachedConfig = null;
    cacheVersion = '';
    await fetchConfig(true);
  }, [fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Helper functions - memoized based on config
  const helpers = useMemo(() => {
    const getSectorProduct = (sectorName: string): string | null => {
      if (!config) return null;
      return config.sectors[sectorName]?.producedProduct || null;
    };

    const getSectorResource = (sectorName: string): string | null => {
      if (!config) return null;
      return config.sectors[sectorName]?.primaryResource || null;
    };

    const getProductReferenceValue = (productName: string): number => {
      if (!config) return 1000;
      return config.products[productName]?.referenceValue ?? 1000;
    };

    const getResourceBasePrice = (resourceName: string): number => {
      if (!config) return 100;
      return config.resources[resourceName]?.basePrice ?? 100;
    };

    const getSectorsProducingProduct = (productName: string): string[] => {
      if (!config) return [];
      const result: string[] = [];
      for (const [sectorName, sector] of Object.entries(config.sectors)) {
        if (sector.producedProduct === productName) {
          result.push(sectorName);
        }
      }
      return result;
    };

    const getSectorsDemandingProduct = (productName: string): Array<{ sector: string; unitTypes: UnitType[] }> => {
      if (!config) return [];
      const result: Array<{ sector: string; unitTypes: UnitType[] }> = [];

      for (const [sectorName, sector] of Object.entries(config.sectors)) {
        const unitTypes: UnitType[] = [];

        for (const unitType of ['production', 'retail', 'service', 'extraction'] as UnitType[]) {
          const unit = sector.units[unitType];
          if (unit.isEnabled && unit.inputs.some(i => i.type === 'product' && i.name === productName)) {
            unitTypes.push(unitType);
          }
        }

        if (unitTypes.length > 0) {
          result.push({ sector: sectorName, unitTypes });
        }
      }

      return result;
    };

    const getSectorsExtractingResource = (resourceName: string): string[] => {
      if (!config) return [];
      const result: string[] = [];
      for (const [sectorName, sector] of Object.entries(config.sectors)) {
        const extractionOutputs = sector.units.extraction.outputs;
        if (extractionOutputs.some(o => o.type === 'resource' && o.name === resourceName)) {
          result.push(sectorName);
        }
      }
      return result;
    };

    const getSectorsDemandingResource = (resourceName: string): Array<{ sector: string; unitTypes: UnitType[] }> => {
      if (!config) return [];
      const result: Array<{ sector: string; unitTypes: UnitType[] }> = [];

      for (const [sectorName, sector] of Object.entries(config.sectors)) {
        const unitTypes: UnitType[] = [];

        for (const unitType of ['production', 'retail', 'service', 'extraction'] as UnitType[]) {
          const unit = sector.units[unitType];
          if (unit.isEnabled && unit.inputs.some(i => i.type === 'resource' && i.name === resourceName)) {
            unitTypes.push(unitType);
          }
        }

        if (unitTypes.length > 0) {
          result.push({ sector: sectorName, unitTypes });
        }
      }

      return result;
    };

    const getUnitInputs = (sectorName: string, unitType: UnitType): Array<{ type: 'resource' | 'product'; name: string; rate: number }> => {
      if (!config) return [];
      return config.sectors[sectorName]?.units[unitType]?.inputs || [];
    };

    const getUnitOutputs = (sectorName: string, unitType: UnitType): Array<{ type: 'resource' | 'product'; name: string; rate: number }> => {
      if (!config) return [];
      return config.sectors[sectorName]?.units[unitType]?.outputs || [];
    };

    return {
      getSectorProduct,
      getSectorResource,
      getProductReferenceValue,
      getResourceBasePrice,
      getSectorsProducingProduct,
      getSectorsDemandingProduct,
      getSectorsExtractingResource,
      getSectorsDemandingResource,
      getUnitInputs,
      getUnitOutputs,
    };
  }, [config]);

  return {
    config,
    loading,
    error,
    refetch,
    ...helpers,
  };
}

// Export a function to manually invalidate the cache (useful after admin updates)
export function invalidateSectorConfigCache(): void {
  cachedConfig = null;
  cacheVersion = '';
}

export default useSectorConfig;
