import { getDb, getNextId, connectMongo } from '../db/mongo';
import { Document } from 'mongodb';
import {
  DISPLAY_PERIOD_HOURS,
  calculateMarketEntryEconomics,
  calculateCommodityPrice,
  calculateProductPrice,
  EXTRACTION_ELECTRICITY_CONSUMPTION,
  EXTRACTION_OUTPUT_RATE,
  MarketPriceOverrides,
  PRODUCTS,
  PRODUCTION_PRODUCT_CONSUMPTION,
  PRODUCTION_ELECTRICITY_CONSUMPTION,
  PRODUCTION_OUTPUT_RATE,
  PRODUCTION_RESOURCE_CONSUMPTION,
  RESOURCES,
  RETAIL_PRODUCT_CONSUMPTION,
  SECTOR_EXTRACTION,
  SECTOR_PRODUCTS,
  SECTOR_PRODUCT_DEMANDS,
  SECTOR_RETAIL_DEMANDS,
  SECTOR_RESOURCES,
  SECTOR_SERVICE_DEMANDS,
  SERVICE_ELECTRICITY_CONSUMPTION,
  SERVICE_PRODUCT_CONSUMPTION,
  type Product,
  type Resource,
  type Sector,
} from '../constants/sectors';
import { SectorConfigService } from '../services/SectorConfigService';

export interface MarketEntry {
  id: number;
  corporation_id: number;
  state_code: string;
  sector_type: string;
  created_at: Date;
}

export interface MarketEntryInput {
  corporation_id: number;
  state_code: string;
  sector_type: string;
}

export interface MarketEntryWithUnits extends MarketEntry {
  retail_count: number;
  production_count: number;
  service_count: number;
  extraction_count: number;
}

export interface CorporationFinances {
  corporation_id: number;
  hourly_revenue: number;
  hourly_costs: number;
  hourly_profit: number;
  display_revenue: number;  // 96-hour projection (sector revenue)
  display_costs: number;    // 96-hour projection (sector costs)
  display_profit: number;   // 96-hour projection (sector profit = gross profit)
  // Full income statement (96-hour period)
  gross_profit_96h: number;      // Sector Revenue - Sector Costs (THE SOURCE OF TRUTH)
  ceo_salary_96h: number;        // CEO Salary for the period
  operating_income_96h: number;  // Gross Profit - CEO Salary
  dividend_payout_96h: number;   // Operating Income * dividend % (only if positive)
  net_income_96h: number;        // Operating Income - Dividends (retained earnings)
  // Unit counts
  total_retail_units: number;
  total_production_units: number;
  total_service_units: number;
  total_extraction_units: number;
  markets_count: number;
  // Per-share metrics
  dividend_per_share_96h?: number;
  special_dividend_last_paid_at?: Date | string | null;
  special_dividend_last_amount?: number | null;
  special_dividend_per_share_last?: number | null;
}

export class MarketEntryModel {
  private static _marketPricesCache: { prices: MarketPriceOverrides; timestamp: number } | null = null;
  private static readonly MARKET_PRICES_CACHE_TTL_MS = 60_000;

  private static async getMarketDataInternal(): Promise<{
    commodityPrices: Record<Resource, number>;
    productPrices: Record<Product, number>;
    commoditySupply: Record<Resource, number>;
    commodityDemand: Record<Resource, number>;
    productSupply: Record<Product, number>;
    productDemand: Record<Product, number>;
  }> {
    await connectMongo();
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: {
          path: '$units',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$sector_type',
          retail_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'retail'] }, '$units.count', 0]
            }
          },
          production_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'production'] }, '$units.count', 0]
            }
          },
          service_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'service'] }, '$units.count', 0]
            }
          },
          extraction_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'extraction'] }, '$units.count', 0]
            }
          }
        }
      }
    ]).toArray();

    const sectorRetailUnits: Record<string, number> = {};
    const sectorProductionUnits: Record<string, number> = {};
    const sectorServiceUnits: Record<string, number> = {};
    const sectorExtractionUnits: Record<string, number> = {};
    for (const row of result) {
      const sector = row._id as string;
      sectorRetailUnits[sector] = row.retail_units || 0;
      sectorProductionUnits[sector] = row.production_units || 0;
      sectorServiceUnits[sector] = row.service_units || 0;
      sectorExtractionUnits[sector] = row.extraction_units || 0;
    }

    // Get sector config for resource consumption rates
    const sectorConfig = await SectorConfigService.getConfiguration();

    const commoditySupply: Record<Resource, number> = {} as Record<Resource, number>;
    const commodityDemand: Record<Resource, number> = {} as Record<Resource, number>;
    for (const resource of RESOURCES) {
      let supply = 0;
      let demand = 0;

      for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
        if (extractableResources && extractableResources.includes(resource)) {
          supply += (sectorExtractionUnits[sector] || 0) * EXTRACTION_OUTPUT_RATE;
        }
      }

      // Calculate demand from sector config inputs (supports multi-resource sectors like Energy)
      for (const [sectorName, sectorData] of Object.entries(sectorConfig.sectors)) {
        const productionInputs = sectorData.units.production.inputs;
        const resourceInput = productionInputs.find(
          input => input.type === 'resource' && input.name === resource
        );
        if (resourceInput) {
          demand += (sectorProductionUnits[sectorName] || 0) * resourceInput.rate;
        }
      }

      commoditySupply[resource] = supply;
      commodityDemand[resource] = demand;
    }

    const commodityPrices: Record<Resource, number> = {} as Record<Resource, number>;
    for (const resource of RESOURCES) {
      commodityPrices[resource] = calculateCommodityPrice(resource, commoditySupply[resource], commodityDemand[resource]).currentPrice;
    }

    const productSupply: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      let supply = 0;
      for (const [sector, producedProduct] of Object.entries(SECTOR_PRODUCTS)) {
        if (producedProduct === product) {
          supply += (sectorProductionUnits[sector] || 0) * PRODUCTION_OUTPUT_RATE;
        }
      }
      productSupply[product] = supply;
    }

    const productDemand: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      let demand = 0;

      for (const [sector, demandedProducts] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        const productionUnits = sectorProductionUnits[sector] || 0;
        demand += productionUnits * PRODUCTION_PRODUCT_CONSUMPTION;
      }

      for (const [sector, demandedProducts] of Object.entries(SECTOR_RETAIL_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        demand += (sectorRetailUnits[sector] || 0) * RETAIL_PRODUCT_CONSUMPTION;
      }

      for (const [sector, demandedProducts] of Object.entries(SECTOR_SERVICE_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        const perUnitDemand = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;
        demand += (sectorServiceUnits[sector] || 0) * perUnitDemand;
      }

      if (product === 'Electricity') {
        for (const productionUnits of Object.values(sectorProductionUnits)) {
          demand += (productionUnits || 0) * PRODUCTION_ELECTRICITY_CONSUMPTION;
        }

        for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
          if (!extractableResources || extractableResources.length === 0) continue;
          demand += (sectorExtractionUnits[sector] || 0) * EXTRACTION_ELECTRICITY_CONSUMPTION;
        }
      }

      productDemand[product] = demand;
    }

    const productPrices: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      productPrices[product] = calculateProductPrice(product, productSupply[product], productDemand[product]).currentPrice;
    }

    return {
      commodityPrices,
      productPrices,
      commoditySupply,
      commodityDemand,
      productSupply,
      productDemand
    };
  }

  private static async getCurrentMarketPrices(): Promise<MarketPriceOverrides> {
    const now = Date.now();
    const cached = this._marketPricesCache;
    if (cached && now - cached.timestamp < this.MARKET_PRICES_CACHE_TTL_MS) {
      return cached.prices;
    }

    const data = await this.getMarketDataInternal();
    
    const prices = {
      commodityPrices: data.commodityPrices,
      productPrices: data.productPrices,
    };

    this._marketPricesCache = { prices, timestamp: now };
    return prices;
  }

  static async getMarketData() {
    return await this.getMarketDataInternal();
  }

  static async create(data: MarketEntryInput): Promise<MarketEntry> {
    const { corporation_id, state_code, sector_type } = data;
    const db = getDb();
    
    const id = await getNextId('market_entries_id');
    const now = new Date();

    const doc: MarketEntry = {
      id,
      corporation_id,
      state_code: state_code.toUpperCase(),
      sector_type,
      created_at: now
    };

    await db.collection('market_entries').insertOne(doc);
    return doc;
  }

  static async findById(id: number): Promise<MarketEntry | null> {
    return await getDb().collection<MarketEntry>('market_entries').findOne({ id });
  }

  static async findByCorporationId(corporationId: number): Promise<MarketEntry[]> {
    return await getDb().collection<MarketEntry>('market_entries')
      .find({ corporation_id: corporationId })
      .sort({ created_at: -1 })
      .toArray();
  }

  static async findByStateCode(stateCode: string): Promise<MarketEntry[]> {
    return await getDb().collection<MarketEntry>('market_entries')
      .find({ state_code: stateCode.toUpperCase() })
      .sort({ created_at: -1 })
      .toArray();
  }

  // Get top suppliers for a product (corporations with most production units in relevant sectors)
  static async getTopProductSuppliers(sectors: string[], limit: number = 10): Promise<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string | null;
    production_units: number;
  }[]> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate<{
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string | null;
      production_units: number;
    }>([
      {
        $match: { sector_type: { $in: sectors } }
      },
      {
        $lookup: {
          from: 'business_units',
          let: { entry_id: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$market_entry_id', '$$entry_id'] },
                    { $eq: ['$unit_type', 'production'] }
                  ]
                }
              }
            }
          ],
          as: 'units'
        }
      },
      {
        $unwind: '$units'
      },
      {
        $group: {
          _id: '$corporation_id',
          production_units: { $sum: '$units.count' }
        }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: '_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: '$corporation'
      },
      {
        $project: {
          corporation_id: '$corporation.id',
          corporation_name: '$corporation.name',
          corporation_logo: '$corporation.logo',
          production_units: 1
        }
      },
      {
        $sort: { production_units: -1 }
      },
      {
        $limit: limit
      }
    ]).toArray();
    
    return result as unknown as {
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string | null;
      production_units: number;
    }[];
  }

  // Get total production units for a set of sectors
  static async getTotalSectorProductionUnits(sectors: string[]): Promise<number> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $match: { sector_type: { $in: sectors } }
      },
      {
        $lookup: {
          from: 'business_units',
          let: { entry_id: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$market_entry_id', '$$entry_id'] },
                    { $eq: ['$unit_type', 'production'] }
                  ]
                }
              }
            }
          ],
          as: 'units'
        }
      },
      {
        $unwind: '$units'
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$units.count' }
        }
      }
    ]).next();
    
    return result?.total || 0;
  }

  // Get unit counts for all corporations grouped by sector (for demand calculation)
  static async getAllCorporationUnitCounts(): Promise<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string | null;
    sector_type: string;
    production_units: number;
    retail_units: number;
    service_units: number;
    extraction_units: number;
  }[]> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: {
          path: '$units',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            corporation_id: '$corporation_id',
            sector_type: '$sector_type'
          },
          production_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'production'] }, '$units.count', 0]
            }
          },
          retail_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'retail'] }, '$units.count', 0]
            }
          },
          service_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'service'] }, '$units.count', 0]
            }
          },
          extraction_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'extraction'] }, '$units.count', 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: '_id.corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: '$corporation'
      },
      {
        $project: {
          corporation_id: '$corporation.id',
          corporation_name: '$corporation.name',
          corporation_logo: '$corporation.logo',
          sector_type: '$_id.sector_type',
          production_units: 1,
          retail_units: 1,
          service_units: 1,
          extraction_units: 1
        }
      }
    ]).toArray();

    return result as unknown as {
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string | null;
      sector_type: string;
      production_units: number;
      retail_units: number;
      service_units: number;
      extraction_units: number;
    }[];
  }

  static async findByCorpAndState(corporationId: number, stateCode: string): Promise<MarketEntry[]> {
    return await getDb().collection<MarketEntry>('market_entries')
      .find({ 
        corporation_id: corporationId, 
        state_code: stateCode.toUpperCase() 
      })
      .sort({ created_at: -1 })
      .toArray();
  }

  static async findByCorpStateAndSector(
    corporationId: number,
    stateCode: string,
    sectorType: string
  ): Promise<MarketEntry | null> {
    return await getDb().collection<MarketEntry>('market_entries').findOne({
      corporation_id: corporationId,
      state_code: stateCode.toUpperCase(),
      sector_type: sectorType
    });
  }

  static async exists(corporationId: number, stateCode: string, sectorType: string): Promise<boolean> {
    const count = await getDb().collection('market_entries').countDocuments({
      corporation_id: corporationId,
      state_code: stateCode.toUpperCase(),
      sector_type: sectorType
    });
    return count > 0;
  }

  static async delete(id: number): Promise<void> {
    await getDb().collection('market_entries').deleteOne({ id });
  }

  // Get market entries with unit counts
  static async findByCorporationIdWithUnits(corporationId: number): Promise<MarketEntryWithUnits[]> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $match: { corporation_id: corporationId }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: {
          path: '$units',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$id',
          market_entry: { $first: '$$ROOT' },
          retail_count: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'retail'] }, '$units.count', 0]
            }
          },
          production_count: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'production'] }, '$units.count', 0]
            }
          },
          service_count: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'service'] }, '$units.count', 0]
            }
          },
          extraction_count: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'extraction'] }, '$units.count', 0]
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$market_entry',
              {
                retail_count: '$retail_count',
                production_count: '$production_count',
                service_count: '$service_count',
                extraction_count: '$extraction_count'
              }
            ]
          }
        }
      },
      {
        $sort: { created_at: -1 }
      },
      // Remove 'units' array if it was merged from market_entry
      {
        $project: {
          units: 0
        }
      }
    ]).toArray();

    return result as MarketEntryWithUnits[];
  }

  static async getTopProducingStates(
    sectorTypes: string[],
    limit: number = 5
  ): Promise<Array<{ state_code: string; state_name: string; extraction_units: number }>> {
    const db = getDb();
    return await db.collection('market_entries').aggregate([
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': 'extraction' }
      },
      {
        $lookup: {
          from: 'state_metadata',
          localField: 'state_code',
          foreignField: 'state_code',
          as: 'state_info'
        }
      },
      {
        $unwind: { path: '$state_info', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$state_code',
          state_name: { $first: '$state_info.name' },
          extraction_units: { $sum: '$units.count' }
        }
      },
      {
        $project: {
          state_code: '$_id',
          state_name: { $ifNull: ['$state_name', '$_id'] },
          extraction_units: 1,
          _id: 0
        }
      },
      {
        $sort: { extraction_units: -1 }
      },
      {
        $limit: limit
      }
    ]).toArray() as Array<{ state_code: string; state_name: string; extraction_units: number }>;
  }

  static async getTopProducers(
    sectorTypes: string[],
    limit: number = 10,
    offset: number = 0,
    unitType: string = 'extraction'
  ): Promise<{ 
    data: Array<{ 
      corporation_id: number; 
      corporation_name: string; 
      corporation_logo: string; 
      sector_type: string; 
      state_code: string; 
      state_name: string; 
      extraction_units: number 
    }>;
    total: number;
  }> {
    const db = getDb();
    
    const pipeline = [
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': unitType }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'state_metadata',
          localField: 'state_code',
          foreignField: 'state_code',
          as: 'state_info'
        }
      },
      {
        $unwind: { path: '$state_info', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: {
            corporation_id: '$corporation_id',
            sector_type: '$sector_type',
            state_code: '$state_code'
          },
          corporation_name: { $first: '$corporation.name' },
          corporation_logo: { $first: '$corporation.logo' },
          state_name: { $first: '$state_info.name' },
          extraction_units: { $sum: '$units.count' }
        }
      },
      {
        $match: { extraction_units: { $gt: 0 } }
      }
    ];

    const countResult = await db.collection('market_entries').aggregate([
      ...pipeline,
      { $count: 'total' }
    ]).toArray();
    
    const total = countResult.length > 0 ? countResult[0].total : 0;

    const data = await db.collection('market_entries').aggregate([
      ...pipeline,
      {
        $project: {
          corporation_id: '$_id.corporation_id',
          corporation_name: 1,
          corporation_logo: 1,
          sector_type: '$_id.sector_type',
          state_code: '$_id.state_code',
          state_name: { $ifNull: ['$state_name', '$_id.state_code'] },
          extraction_units: 1,
          _id: 0
        }
      },
      {
        $sort: { extraction_units: -1 }
      },
      { $skip: offset },
      { $limit: limit }
    ]).toArray();

    return { data: data as unknown as Array<{ 
      corporation_id: number; 
      corporation_name: string; 
      corporation_logo: string; 
      sector_type: string; 
      state_code: string; 
      state_name: string; 
      extraction_units: number 
    }>, total };
  }

  static async getTopDemanders(
    sectorTypes: string[],
    limit: number = 10,
    offset: number = 0
  ): Promise<{ 
    data: Array<{ 
      corporation_id: number; 
      corporation_name: string; 
      corporation_logo: string; 
      sector_type: string; 
      state_code: string; 
      state_name: string; 
      production_units: number 
    }>;
    total: number;
  }> {
    const db = getDb();
    
    const pipeline = [
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': 'production' }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'state_metadata',
          localField: 'state_code',
          foreignField: 'state_code',
          as: 'state_info'
        }
      },
      {
        $unwind: { path: '$state_info', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: {
            corporation_id: '$corporation_id',
            sector_type: '$sector_type',
            state_code: '$state_code'
          },
          corporation_name: { $first: '$corporation.name' },
          corporation_logo: { $first: '$corporation.logo' },
          state_name: { $first: '$state_info.name' },
          production_units: { $sum: '$units.count' }
        }
      },
      {
        $match: { production_units: { $gt: 0 } }
      }
    ];

    const countResult = await db.collection('market_entries').aggregate([
      ...pipeline,
      { $count: 'total' }
    ]).toArray();
    
    const total = countResult.length > 0 ? countResult[0].total : 0;

    const data = await db.collection('market_entries').aggregate([
      ...pipeline,
      {
        $project: {
          corporation_id: '$_id.corporation_id',
          corporation_name: 1,
          corporation_logo: 1,
          sector_type: '$_id.sector_type',
          state_code: '$_id.state_code',
          state_name: { $ifNull: ['$state_name', '$_id.state_code'] },
          production_units: 1,
          _id: 0
        }
      },
      {
        $sort: { production_units: -1 }
      },
      { $skip: offset },
      { $limit: limit }
    ]).toArray();

    return { data: data as unknown as Array<{ 
      corporation_id: number; 
      corporation_name: string; 
      corporation_logo: string; 
      sector_type: string; 
      state_code: string; 
      state_name: string; 
      production_units: number 
    }>, total };
  }

  static async getUnitsBySector(
    sectorTypes: string[],
    unitType: string
  ): Promise<Record<string, number>> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': unitType }
      },
      {
        $group: {
          _id: '$sector_type',
          units: { $sum: '$units.count' }
        }
      }
    ]).toArray();

    const map: Record<string, number> = {};
    for (const row of result) {
      map[row._id] = row.units;
    }
    return map;
  }

  static async getUnitsByStateAndSector(stateCode?: string): Promise<Array<{ state_code: string; sector_type: string; units: number }>> {
    const db = getDb();
    const pipeline: Document[] = [];
    
    if (stateCode) {
      pipeline.push({ $match: { state_code: stateCode.toUpperCase() } });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: { state_code: '$state_code', sector_type: '$sector_type' },
          units: { $sum: '$units.count' }
        }
      },
      {
        $project: {
          _id: 0,
          state_code: '$_id.state_code',
          sector_type: '$_id.sector_type',
          units: { $ifNull: ['$units', 0] }
        }
      }
    );

    return await db.collection('market_entries').aggregate(pipeline).toArray() as Array<{ state_code: string; sector_type: string; units: number }>;
  }

  static async getTopCorporationsByUnitType(
    sectorTypes: string[],
    unitType: string,
    limit: number = 10
  ): Promise<Array<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string;
    units: number;
  }>> {
    const db = getDb();
    return await db.collection('market_entries').aggregate([
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': unitType }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$corporation_id',
          corporation_name: { $first: '$corporation.name' },
          corporation_logo: { $first: '$corporation.logo' },
          units: { $sum: '$units.count' }
        }
      },
      {
        $match: { units: { $gt: 0 } }
      },
      {
        $sort: { units: -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          corporation_id: '$_id',
          corporation_name: 1,
          corporation_logo: 1,
          units: 1,
          _id: 0
        }
      }
    ]).toArray() as unknown as Array<{
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string;
      units: number;
    }>;
  }

  static async getTotalUnitsBySectors(
    sectorTypes: string[],
    unitType: string
  ): Promise<number> {
    const db = getDb();
    const result = await db.collection('market_entries').aggregate([
      {
        $match: { sector_type: { $in: sectorTypes } }
      },
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: false }
      },
      {
        $match: { 'units.unit_type': unitType }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$units.count' }
        }
      }
    ]).toArray();

    return result.length > 0 ? result[0].total : 0;
  }

  static async getAllCorporationSectorUnits(): Promise<Array<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string;
    sector_type: string;
    retail_units: number;
    production_units: number;
    service_units: number;
    extraction_units: number;
  }>> {
    const db = getDb();
    return await db.collection('market_entries').aggregate([
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: {
            corporation_id: '$corporation_id',
            sector_type: '$sector_type'
          },
          corporation_name: { $first: '$corporation.name' },
          corporation_logo: { $first: '$corporation.logo' },
          retail_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'retail'] }, '$units.count', 0]
            }
          },
          production_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'production'] }, '$units.count', 0]
            }
          },
          service_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'service'] }, '$units.count', 0]
            }
          },
          extraction_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'extraction'] }, '$units.count', 0]
            }
          }
        }
      },
      {
        $project: {
          corporation_id: '$_id.corporation_id',
          sector_type: '$_id.sector_type',
          corporation_name: 1,
          corporation_logo: 1,
          retail_units: 1,
          production_units: 1,
          service_units: 1,
          extraction_units: 1,
          _id: 0
        }
      }
    ]).toArray() as unknown as Array<{
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string;
      sector_type: string;
      retail_units: number;
      production_units: number;
      service_units: number;
      extraction_units: number;
    }>;
  }

  static async getAllCorporationEntryUnits(): Promise<Array<{
    corporation_id: number;
    corporation_name: string;
    corporation_logo: string;
    sector_type: string;
    state_code: string;
    state_name: string;
    retail_units: number;
    production_units: number;
    service_units: number;
    extraction_units: number;
  }>> {
    const db = getDb();
    return await db.collection('market_entries').aggregate([
      {
        $lookup: {
          from: 'business_units',
          localField: 'id',
          foreignField: 'market_entry_id',
          as: 'units'
        }
      },
      {
        $unwind: { path: '$units', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      {
        $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'state_metadata',
          localField: 'state_code',
          foreignField: 'state_code',
          as: 'state_info'
        }
      },
      {
        $unwind: { path: '$state_info', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: {
            corporation_id: '$corporation_id',
            sector_type: '$sector_type',
            state_code: '$state_code'
          },
          corporation_name: { $first: '$corporation.name' },
          corporation_logo: { $first: '$corporation.logo' },
          state_name: { $first: '$state_info.name' },
          retail_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'retail'] }, '$units.count', 0]
            }
          },
          production_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'production'] }, '$units.count', 0]
            }
          },
          service_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'service'] }, '$units.count', 0]
            }
          },
          extraction_units: {
            $sum: {
              $cond: [{ $eq: ['$units.unit_type', 'extraction'] }, '$units.count', 0]
            }
          }
        }
      },
      {
        $project: {
          corporation_id: '$_id.corporation_id',
          sector_type: '$_id.sector_type',
          state_code: '$_id.state_code',
          corporation_name: 1,
          corporation_logo: 1,
          state_name: { $ifNull: ['$state_name', '$_id.state_code'] },
          retail_units: 1,
          production_units: 1,
          service_units: 1,
          extraction_units: 1,
          _id: 0
        }
      }
    ]).toArray() as unknown as Array<{
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string;
      sector_type: string;
      state_code: string;
      state_name: string;
      retail_units: number;
      production_units: number;
      service_units: number;
      extraction_units: number;
    }>;
  }



  // Calculate corporation finances from all market entries
  // Uses dynamic economics based on sector, commodity prices, and product prices
  // When corporationData is provided, calculates full income statement with CEO salary and dividends

  static async calculateCorporationFinances(
    corporationId: number,
    marketPrices?: MarketPriceOverrides,
    corporationData?: {
      ceo_salary: number;
      dividend_percentage: number;
      shares: number;
      special_dividend_last_paid_at?: Date | string | null;
      special_dividend_last_amount?: number | null;
    }
  ): Promise<CorporationFinances> {
    // Get all market entries with their units
    const entries = await this.findByCorporationIdWithUnits(corporationId);
    const prices = marketPrices ?? await this.getCurrentMarketPrices();

    let hourlyRevenue = 0;
    let hourlyCosts = 0;
    let totalRetail = 0;
    let totalProduction = 0;
    let totalService = 0;
    let totalExtraction = 0;

    for (const entry of entries) {
      // Use dynamic economics that considers sector, commodity prices, etc.
      const economics = calculateMarketEntryEconomics(
        entry.sector_type as Sector,
        entry.state_code,
        entry.retail_count,
        entry.production_count,
        entry.service_count,
        entry.extraction_count,
        prices
      );

      hourlyRevenue += economics.hourlyRevenue;
      hourlyCosts += economics.hourlyCost;

      // Sum up units
      totalRetail += entry.retail_count;
      totalProduction += entry.production_count;
      totalService += entry.service_count;
      totalExtraction += entry.extraction_count;
    }

    const hourlyProfit = hourlyRevenue - hourlyCosts;

    // Calculate 96-hour income statement
    // Sector profit is the SOURCE OF TRUTH - everything flows from this
    const grossProfit96h = hourlyProfit * DISPLAY_PERIOD_HOURS;

    // CEO Salary is an operating expense (per 96h period)
    const ceoSalary96h = corporationData?.ceo_salary ?? 0;

    // Operating Income = Gross Profit - CEO Salary
    const operatingIncome96h = grossProfit96h - ceoSalary96h;

    // Dividends: only paid from POSITIVE operating income
    const dividendPercentage = corporationData?.dividend_percentage ?? 0;
    const dividendPayout96h = operatingIncome96h > 0
      ? operatingIncome96h * (dividendPercentage / 100)
      : 0;

    // Net Income (Retained Earnings) = Operating Income - Dividends
    const netIncome96h = operatingIncome96h - dividendPayout96h;

    // Per-share calculations
    const totalShares = corporationData?.shares ?? 1;
    const dividendPerShare96h = totalShares > 0 && dividendPayout96h > 0
      ? dividendPayout96h / totalShares
      : 0;

    // Special dividend info
    const specialDividendLastPaidAt = corporationData?.special_dividend_last_paid_at ?? null;
    const specialDividendLastAmount = corporationData?.special_dividend_last_amount ?? null;
    const specialDividendPerShareLast = specialDividendLastAmount && totalShares > 0
      ? specialDividendLastAmount / totalShares
      : null;

    return {
      corporation_id: corporationId,
      hourly_revenue: hourlyRevenue,
      hourly_costs: hourlyCosts,
      hourly_profit: hourlyProfit,
      display_revenue: hourlyRevenue * DISPLAY_PERIOD_HOURS,
      display_costs: hourlyCosts * DISPLAY_PERIOD_HOURS,
      display_profit: grossProfit96h, // This is gross profit (sector profit)
      // Full income statement
      gross_profit_96h: grossProfit96h,
      ceo_salary_96h: ceoSalary96h,
      operating_income_96h: operatingIncome96h,
      dividend_payout_96h: dividendPayout96h,
      net_income_96h: netIncome96h,
      // Unit counts
      total_retail_units: totalRetail,
      total_production_units: totalProduction,
      total_service_units: totalService,
      total_extraction_units: totalExtraction,
      markets_count: entries.length,
      // Per-share metrics
      dividend_per_share_96h: dividendPerShare96h,
      special_dividend_last_paid_at: specialDividendLastPaidAt,
      special_dividend_last_amount: specialDividendLastAmount,
      special_dividend_per_share_last: specialDividendPerShareLast,
    };
  }

  // Get all corporations with their hourly financials (for cron job)
  // Now uses dynamic economics per-corporation for accurate commodity-based pricing
  static async getAllCorporationsFinancials(): Promise<{ 
    corporation_id: number; 
    hourly_revenue: number;
    hourly_costs: number;
    hourly_profit: number;
  }[]> {
    // Get all corporation IDs that have market entries
    const db = getDb();
    const corporationIds = await db.collection('market_entries').distinct('corporation_id');

    const results: { 
      corporation_id: number; 
      hourly_revenue: number;
      hourly_costs: number;
      hourly_profit: number;
    }[] = [];
    const prices = await this.getCurrentMarketPrices();

    for (const corpId of corporationIds) {
      const finances = await this.calculateCorporationFinances(corpId, prices);
      if (finances.hourly_profit !== 0 || 
          finances.total_retail_units > 0 || 
          finances.total_production_units > 0 || 
          finances.total_service_units > 0 ||
          finances.total_extraction_units > 0) {
        results.push({
          corporation_id: corpId,
          hourly_revenue: finances.hourly_revenue,
          hourly_costs: finances.hourly_costs,
          hourly_profit: finances.hourly_profit,
        });
      }
    }

    return results;
  }
}
