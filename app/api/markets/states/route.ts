import { NextResponse } from 'next/server';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { TransactionModel } from '@/lib/models/Transaction';
import {
  US_REGIONS,
  getStateMultiplier,
  getStateSectorCapacity,
  getStateCapacityTier,
  getStateResources,
} from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

// GET /api/markets/states - List all states with region grouping
export async function GET() {
  try {
    // Get state metadata from database
    const stateMeta = await StateMetadataModel.findAll();

    // Compute growth factor per state (last 24h unit builds normalized by current units)
    // We need to fetch this data for all states
    // MarketEntryModel.getUnitsByStateAndSector() returns { state_code, sector_type, units }
    // TransactionModel.getUnitBuildsLast24Hours() returns { state_code, sector_type, builds }
    
    const [currentUnitsData, buildsLastDayData] = await Promise.all([
      MarketEntryModel.getUnitsByStateAndSector(),
      TransactionModel.getUnitBuildsLast24Hours()
    ]);

    const unitsMap = new Map<string, Map<string, number>>(); // state -> sector -> units
    for (const row of currentUnitsData) {
      if (!unitsMap.has(row.state_code)) unitsMap.set(row.state_code, new Map());
      unitsMap.get(row.state_code)!.set(row.sector_type, row.units || 0);
    }

    const buildsMap = new Map<string, Map<string, number>>();
    for (const row of buildsLastDayData) {
      if (!buildsMap.has(row.state_code)) buildsMap.set(row.state_code, new Map());
      buildsMap.get(row.state_code)!.set(row.sector_type, row.builds || 0);
    }

    const growthFactorByState: Record<string, number> = {};
    for (const st of stateMeta) {
      const stateCode = st.state_code;
      const sectorUnits = unitsMap.get(stateCode) || new Map();
      const sectorBuilds = buildsMap.get(stateCode) || new Map();
      const sectors = new Set<string>([...sectorUnits.keys(), ...sectorBuilds.keys()]);
      
      let ratiosSum = 0;
      let count = 0;
      
      for (const sector of sectors) {
        const u = sectorUnits.get(sector) || 0;
        const b = sectorBuilds.get(sector) || 0;
        const ratio = u > 0 ? (b / u) : 0;
        ratiosSum += ratio;
        count += 1;
      }
      
      const avg = count > 0 ? (ratiosSum / count) : 0;
      growthFactorByState[stateCode] = 1 + 0.25 * avg;
    }

    // Group states by region
    const statesByRegion: Record<string, Array<{
      code: string;
      name: string;
      region: string;
      multiplier: number;
      growth_factor?: number;
      capacity?: number;
      capacity_tier?: string;
      extractable_resources?: string[];
    }>> = {};

    for (const state of stateMeta) {
      const region = state.region;
      if (!statesByRegion[region]) {
        statesByRegion[region] = [];
      }
      
      statesByRegion[region].push({
        code: state.state_code,
        name: state.name,
        region: state.region,
        multiplier: getStateMultiplier(state.state_code),
        growth_factor: growthFactorByState[state.state_code] || 1,
        capacity: getStateSectorCapacity(state.state_code),
        capacity_tier: getStateCapacityTier(state.state_code),
        extractable_resources: Object.keys(getStateResources(state.state_code)),
      });
    }

    // Sort states within each region by name
    for (const region of Object.keys(statesByRegion)) {
      statesByRegion[region].sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({
      regions: Object.keys(US_REGIONS),
      states_by_region: statesByRegion,
      total_states: stateMeta.length,
    });
  } catch (error: unknown) {
    console.error('Get states error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch states') },
      { status: 500 }
    );
  }
}
