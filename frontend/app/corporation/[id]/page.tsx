'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI, sharesAPI, marketsAPI, CorporationFinances, MarketEntryWithUnits, BalanceSheet, CommodityPrice, ProductMarketData, MarketMetadataResponse, MarketUnitFlow } from '@/lib/api';
import { formatCash } from '@/lib/utils';
import { Building2, Edit, Trash2, TrendingUp, DollarSign, Users, User, Calendar, ArrowUp, ArrowDown, TrendingDown, Plus, BarChart3, MapPin, Store, Factory, Briefcase, Layers, Droplets, Package, Cpu, Zap, Wheat, Trees, FlaskConical, Box, Lightbulb, Pill, Wrench, Truck, Shield, UtensilsCrossed, Info, ArrowRight, Pickaxe, HelpCircle } from 'lucide-react';
import BoardTab from '@/components/BoardTab';
import StockPriceChart from '@/components/StockPriceChart';
import SectorCard from '@/components/SectorCard';
import { computeFinancialStatements } from '@/lib/finance';

// Sector to Resource mapping (must match backend)
// Note: Steel is now a PRODUCT, not a resource
const SECTOR_RESOURCES: Record<string, string | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Light Industry': null,        // Consumes Steel PRODUCT
  'Energy': null,                // Special: consumes Oil + Coal via ENERGY_INPUTS
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,        // Consumes Steel PRODUCT
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': null,               // Consumes Steel PRODUCT
  'Hospitality': null,
  'Construction': null,          // Special: consumes Lumber + Steel product
  'Pharmaceuticals': 'Chemical Compounds',
  'Mining': null,
  'Heavy Industry': null,        // Special: consumes Iron Ore + Coal via HEAVY_INDUSTRY_INPUTS
};

// Sector to Product output mapping (what production units create)
const SECTOR_PRODUCTS: Record<string, string | null> = {
  'Technology': 'Technology Products',
  'Finance': null,
  'Healthcare': null,
  'Light Industry': 'Manufactured Goods',
  'Energy': 'Electricity',
  'Retail': null,
  'Real Estate': null,
  'Transportation': 'Logistics Capacity',
  'Media': null,
  'Telecommunications': null,
  'Agriculture': 'Food Products',
  'Defense': 'Defense Equipment',
  'Hospitality': null,
  'Construction': 'Construction Capacity',
  'Pharmaceuticals': 'Pharmaceutical Products',
  'Mining': null,
  'Heavy Industry': 'Steel',
};

// Sector product demands (what products sectors need to operate)
const SECTOR_PRODUCT_DEMANDS: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Light Industry': ['Steel'],
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': ['Steel'],
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': null,
  'Defense': ['Steel'],
  'Hospitality': ['Food Products'],
  'Construction': ['Steel'],
  'Pharmaceuticals': null,
  'Mining': null,
  'Heavy Industry': null,
};

// Retail/Service unit constants
const RETAIL_PRODUCT_CONSUMPTION = 2.0;
const SERVICE_PRODUCT_CONSUMPTION = 1.5;
const SERVICE_ELECTRICITY_CONSUMPTION = 0.5;
const RETAIL_WHOLESALE_DISCOUNT = 0.995;
const SERVICE_WHOLESALE_DISCOUNT = 0.995;
const DEFENSE_WHOLESALE_DISCOUNT = 0.8;
const DEFENSE_REVENUE_ON_COST_MULTIPLIER = 1.0;
const RETAIL_MIN_GROSS_MARGIN_PCT = 0.05;
const SERVICE_MIN_GROSS_MARGIN_PCT = 0.10;
const UNIT_LABOR_COSTS = {
  retail: 200,
  service: 150,
};

// Resource icon mapping (raw materials)
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-4 h-4" />,
  'Iron Ore': <Pickaxe className="w-4 h-4" />,
  'Rare Earth': <Cpu className="w-4 h-4" />,
  'Copper': <Zap className="w-4 h-4" />,
  'Fertile Land': <Wheat className="w-4 h-4" />,
  'Lumber': <Trees className="w-4 h-4" />,
  'Chemical Compounds': <FlaskConical className="w-4 h-4" />,
  'Coal': <Layers className="w-4 h-4" />,
};

// Resource color classes (raw materials)
const RESOURCE_COLORS: Record<string, string> = {
  'Oil': 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  'Iron Ore': 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-800',
  'Rare Earth': 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800',
  'Copper': 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800',
  'Fertile Land': 'text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-800',
  'Lumber': 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800',
  'Chemical Compounds': 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-800',
  'Coal': 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800',
};

// Product icon mapping
const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  'Technology Products': <Cpu className="w-4 h-4" />,
  'Manufactured Goods': <Wrench className="w-4 h-4" />,
  'Electricity': <Lightbulb className="w-4 h-4" />,
  'Food Products': <UtensilsCrossed className="w-4 h-4" />,
  'Construction Capacity': <Building2 className="w-4 h-4" />,
  'Pharmaceutical Products': <Pill className="w-4 h-4" />,
  'Defense Equipment': <Shield className="w-4 h-4" />,
  'Logistics Capacity': <Truck className="w-4 h-4" />,
  'Steel': <Package className="w-4 h-4" />,
};

// Product color classes
const PRODUCT_COLORS: Record<string, string> = {
  'Technology Products': 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50',
  'Manufactured Goods': 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800',
  'Electricity': 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50',
  'Food Products': 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50',
  'Construction Capacity': 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800',
  'Pharmaceutical Products': 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/50',
  'Defense Equipment': 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50',
  'Logistics Capacity': 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50',
  'Steel': 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800',
};

// Unit economics for revenue calculation (must match backend)
const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
  extraction: { baseRevenue: 400, baseCost: 700 },
};
const DISPLAY_PERIOD_HOURS = 96;

// Sectors that can build extraction units (must match backend SECTOR_EXTRACTION)
const SECTORS_CAN_EXTRACT: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': null,
  'Healthcare': null,
  'Light Industry': null,
  'Energy': ['Oil'],
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,
  'Media': null,
  'Telecommunications': null,
  'Agriculture': ['Fertile Land', 'Lumber'],
  'Defense': null,
  'Hospitality': null,
  'Construction': ['Lumber'],
  'Pharmaceuticals': ['Chemical Compounds'],
  'Mining': ['Iron Ore', 'Coal', 'Copper', 'Rare Earth'],
  'Heavy Industry': null,
};

// Check if a sector can extract
const sectorCanExtract = (sector: string): boolean => {
  const resources = SECTORS_CAN_EXTRACT[sector];
  return resources !== null && resources.length > 0;
};

// Base product prices (must match backend PRODUCT_REFERENCE_VALUES)
const PRODUCT_BASE_PRICES: Record<string, number> = {
  'Technology Products': 5000,
  'Manufactured Goods': 1500,
  'Electricity': 200,
  'Food Products': 500,
  'Construction Capacity': 2500,
  'Pharmaceutical Products': 8000,
  'Defense Equipment': 15000,
  'Logistics Capacity': 1000,
  'Steel': 850,
};

// Production unit constants (must match backend)
const PRODUCTION_LABOR_COST = 400; // per hour
const PRODUCTION_RESOURCE_CONSUMPTION = 0.5; // units per hour
const PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5; // units per hour
const PRODUCTION_PRODUCT_CONSUMPTION = 0.5; // units per hour
const PRODUCTION_OUTPUT_RATE = 1.0; // product units per hour
const EXTRACTION_OUTPUT_RATE = 2.0; // resource units per hour (must match backend)

// US States for display
const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

export default function CorporationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const corpId = parseInt(params.id as string, 10);
  
  const [corporation, setCorporation] = useState<CorporationResponse | null>(null);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [buyShares, setBuyShares] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [issueShares, setIssueShares] = useState('');
  const [trading, setTrading] = useState(false);
  const [userOwnedShares, setUserOwnedShares] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'finance' | 'board'>('overview');
  const [abandoningUnit, setAbandoningUnit] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [corpFinances, setCorpFinances] = useState<CorporationFinances | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [marketEntries, setMarketEntries] = useState<MarketEntryWithUnits[]>([]);
  const [commodityPrices, setCommodityPrices] = useState<Record<string, CommodityPrice>>({});
  const [productPrices, setProductPrices] = useState<Record<string, ProductMarketData>>({});
  const [marketMetadata, setMarketMetadata] = useState<MarketMetadataResponse | null>(null);
  const [stockValuation, setStockValuation] = useState<{
    book_value: number;
    earnings_value: number;
    dividend_yield: number;
    cash_per_share: number;
    trade_weighted_price: number;
    fundamental_value: number;
    calculated_price: number;
    recent_trade_count: number;
    has_trade_history: boolean;
    annual_profit: number;
    annual_dividend_per_share: number;
  } | null>(null);

  const getProductionFlow = (sector: string): MarketUnitFlow | null => {
    const flowFromMetadata = marketMetadata?.sector_unit_flows?.[sector]?.production;
    if (flowFromMetadata) {
      return flowFromMetadata;
    }

    const requiredResource = SECTOR_RESOURCES[sector] || null;
    const producedProduct = SECTOR_PRODUCTS[sector] || null;
    const productDemands = SECTOR_PRODUCT_DEMANDS[sector] || null;

    const inputsResources: Record<string, number> = requiredResource
      ? { [requiredResource]: PRODUCTION_RESOURCE_CONSUMPTION }
      : {};

    const inputsProducts: Record<string, number> = {};
    if (PRODUCTION_ELECTRICITY_CONSUMPTION > 0) {
      inputsProducts['Electricity'] = PRODUCTION_ELECTRICITY_CONSUMPTION;
    }
    if (productDemands) {
      productDemands.forEach((product) => {
        inputsProducts[product] = PRODUCTION_PRODUCT_CONSUMPTION;
      });
    }

    const outputsProducts: Record<string, number> = producedProduct
      ? { [producedProduct]: PRODUCTION_OUTPUT_RATE }
      : {};

    return {
      inputs: { resources: inputsResources, products: inputsProducts },
      outputs: { resources: {}, products: outputsProducts },
    };
  };

  const getProductionUnitEconomics = (sector: string) => {
    const producedProduct = SECTOR_PRODUCTS[sector];
    const productionFlow = getProductionFlow(sector);

    let unitRevenuePerHour = UNIT_ECONOMICS.production.baseRevenue;
    let unitCostPerHour = UNIT_ECONOMICS.production.baseCost;

    if (producedProduct) {
      const outputRate =
        productionFlow?.outputs.products?.[producedProduct] ?? PRODUCTION_OUTPUT_RATE;
      const productPrice =
        productPrices[producedProduct]?.currentPrice ??
        PRODUCT_BASE_PRICES[producedProduct] ??
        UNIT_ECONOMICS.production.baseRevenue;

      unitRevenuePerHour = productPrice * outputRate;
      unitCostPerHour = PRODUCTION_LABOR_COST;

      const resourceInputs = productionFlow?.inputs.resources || {};
      Object.entries(resourceInputs).forEach(([resource, amount]) => {
        const price = commodityPrices[resource]?.currentPrice ?? 0;
        unitCostPerHour += amount * price;
      });

      const productInputs =
        productionFlow?.inputs.products || { Electricity: PRODUCTION_ELECTRICITY_CONSUMPTION };
      Object.entries(productInputs).forEach(([product, amount]) => {
        const price = productPrices[product]?.currentPrice ?? PRODUCT_BASE_PRICES[product] ?? 0;
        const costMultiplier = producedProduct === 'Electricity' && product === 'Electricity' ? 0.1 : 1;
        unitCostPerHour += amount * price * costMultiplier;
      });
    }

    return {
      unitRevenuePerHour,
      unitCostPerHour,
      productionFlow,
    };
  };

  const getRetailServiceUnitEconomics = (
    sector: string,
    unitType: 'retail' | 'service'
  ) => {
    const laborCost = UNIT_LABOR_COSTS[unitType];
    const productDemands = SECTOR_PRODUCT_DEMANDS[sector] || [];
    
    let totalProductCost = 0;
    let revenueRaw = 0;
    
    for (const product of productDemands) {
      const productPrice = productPrices[product]?.currentPrice ?? PRODUCT_BASE_PRICES[product] ?? 0;
      let consumedAmount = unitType === 'retail' ? RETAIL_PRODUCT_CONSUMPTION : (product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION);
      
      // Defense sector overrides
      if (sector === 'Defense') {
        if (unitType === 'retail' || product !== 'Electricity') {
          consumedAmount = 1.0;
        }
      }

      let discount = unitType === 'retail' ? RETAIL_WHOLESALE_DISCOUNT : (product === 'Electricity' ? 1.0 : SERVICE_WHOLESALE_DISCOUNT);
      
      if (sector === 'Defense' && (unitType === 'retail' || product !== 'Electricity')) {
        discount = DEFENSE_WHOLESALE_DISCOUNT;
      }

      const productCost = productPrice * consumedAmount * discount;
      totalProductCost += productCost;

      if (sector === 'Defense' && (unitType === 'retail' || product !== 'Electricity')) {
        revenueRaw += productCost * DEFENSE_REVENUE_ON_COST_MULTIPLIER;
      } else {
        revenueRaw += productPrice * consumedAmount;
      }
    }

    const minGrossMargin = unitType === 'retail' ? RETAIL_MIN_GROSS_MARGIN_PCT : SERVICE_MIN_GROSS_MARGIN_PCT;
    const minRevenue = totalProductCost * (1 + minGrossMargin);
    const unitRevenuePerHour = Math.max(revenueRaw, minRevenue);
    const unitCostPerHour = laborCost + totalProductCost;

    return {
      unitRevenuePerHour,
      unitCostPerHour,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corpData, userData, financesData, commoditiesData, metadataData, valuationData] = await Promise.all([
          corporationAPI.getById(corpId),
          authAPI.getMe().catch(() => null),
          marketsAPI.getCorporationFinances(corpId).catch(() => null),
          marketsAPI.getCommodities().catch(() => null),
          marketsAPI.getMarketMetadata().catch(() => null),
          sharesAPI.getValuation(corpId).catch(() => null),
        ]);
        setCorporation(corpData);
        if (userData) {
          setViewerUserId(userData.id);
          // Find user's shares in this corporation
          const userShareholder = corpData.shareholders?.find(sh => sh.user_id === userData.id);
          setUserOwnedShares(userShareholder?.shares || 0);
        }
        if (financesData) {
          setCorpFinances(financesData.finances);
          setBalanceSheet(financesData.balance_sheet || null);
          setMarketEntries(financesData.market_entries || []);
        }
        if (commoditiesData) {
          // Create a lookup map by resource name
          const pricesMap: Record<string, CommodityPrice> = {};
          commoditiesData.commodities.forEach(price => {
            pricesMap[price.resource] = price;
          });
          setCommodityPrices(pricesMap);
          
          // Create a lookup map by product name
          const productMap: Record<string, ProductMarketData> = {};
          commoditiesData.products.forEach(product => {
            productMap[product.product] = product;
          });
          setProductPrices(productMap);
        }
        if (metadataData) {
          setMarketMetadata(metadataData);
        }
        if (valuationData) {
          setStockValuation(valuationData.valuation);
          // Update balance sheet if more complete data from valuation
          if (valuationData.balance_sheet) {
            setBalanceSheet(valuationData.balance_sheet);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch corporation:', err);
        setError(err.response?.status === 404 ? 'Corporation not found' : 'Failed to load corporation');
      } finally {
        setLoading(false);
      }
    };

    if (!isNaN(corpId)) {
      fetchData();
    } else {
      setError('Invalid corporation ID');
      setLoading(false);
    }
  }, [corpId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this corporation? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await corporationAPI.delete(corpId);
      router.push('/stock-market');
    } catch (err: any) {
      console.error('Failed to delete corporation:', err);
      alert(err.response?.data?.error || 'Failed to delete corporation');
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Use backend-provided income statement values (source of truth)
  // The backend calculates: sector revenue/costs → gross profit → CEO salary → operating income → dividends → net income
  const statements = useMemo(() => {
    // If we have corpFinances from backend, use those values (they are the source of truth)
    if (corpFinances) {
      return {
        revenue: corpFinances.display_revenue,
        variableCosts: corpFinances.display_costs,
        fixedCosts: corpFinances.ceo_salary_96h,
        operatingIncome: corpFinances.operating_income_96h,
        dividends: corpFinances.dividend_payout_96h,
        retainedEarnings: corpFinances.net_income_96h,
        netIncome: corpFinances.net_income_96h,
        sectors: [], // Sector breakdown still uses local calculation for detailed display
        periodHours: DISPLAY_PERIOD_HOURS,
        errors: [],
      };
    }

    // Fallback to local calculation if backend data not yet loaded
    const entries = marketEntries.map(e => ({
      sector_type: e.sector_type,
      retail_count: e.retail_count,
      production_count: e.production_count,
      service_count: e.service_count,
      extraction_count: e.extraction_count || 0,
    }));
    const flows = marketMetadata?.sector_unit_flows || {};
    const comPrices: Record<string, { currentPrice: number }> = Object.fromEntries(
      Object.entries(commodityPrices).map(([k, v]) => [k, { currentPrice: v.currentPrice }])
    );
    const prodPrices: Record<string, { currentPrice: number }> = Object.fromEntries(
      Object.entries(productPrices).map(([k, v]) => [k, { currentPrice: v.currentPrice }])
    );
    return computeFinancialStatements({
      entries,
      sectorUnitFlows: flows,
      commodityPrices: comPrices,
      productPrices: prodPrices,
      unitEconomics: UNIT_ECONOMICS,
      periodHours: DISPLAY_PERIOD_HOURS,
      fixedCosts: { ceoSalary: corporation?.ceo_salary || 0 },
      dividendPercentage: corporation?.dividend_percentage || 0,
    });
  }, [corpFinances, marketEntries, marketMetadata, commodityPrices, productPrices, corporation]);

  // Calculate revenue and cost breakdown by sector and unit type
  const calculateRevenueCostBreakdown = () => {
    const sectorBreakdown: Record<string, {
      revenue: number;
      cost: number;
      unitBreakdown: {
        retail: { revenue: number; cost: number; units: number };
        production: { revenue: number; cost: number; units: number };
        service: { revenue: number; cost: number; units: number };
        extraction: { revenue: number; cost: number; units: number };
      };
    }> = {};

    marketEntries.forEach(entry => {
      const sector = entry.sector_type;
      if (!sectorBreakdown[sector]) {
        sectorBreakdown[sector] = {
          revenue: 0,
          cost: 0,
          unitBreakdown: {
            retail: { revenue: 0, cost: 0, units: 0 },
            production: { revenue: 0, cost: 0, units: 0 },
            service: { revenue: 0, cost: 0, units: 0 },
            extraction: { revenue: 0, cost: 0, units: 0 },
          },
        };
      }

      const breakdown = sectorBreakdown[sector];
      
      // Retail units
      if (entry.retail_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(sector, 'retail');
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        breakdown.unitBreakdown.retail.revenue += unitRev * entry.retail_count;
        breakdown.unitBreakdown.retail.cost += unitCost * entry.retail_count;
        breakdown.unitBreakdown.retail.units += entry.retail_count;
      }

      // Production units - use dynamic pricing if available
      if (entry.production_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getProductionUnitEconomics(sector);
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        
        breakdown.unitBreakdown.production.revenue += unitRev * entry.production_count;
        breakdown.unitBreakdown.production.cost += unitCost * entry.production_count;
        breakdown.unitBreakdown.production.units += entry.production_count;
      }

      // Service units
      if (entry.service_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(sector, 'service');
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        breakdown.unitBreakdown.service.revenue += unitRev * entry.service_count;
        breakdown.unitBreakdown.service.cost += unitCost * entry.service_count;
        breakdown.unitBreakdown.service.units += entry.service_count;
      }

      // Extraction units - use dynamic pricing if available
      if (entry.extraction_count && entry.extraction_count > 0) {
        const extractableResources = SECTORS_CAN_EXTRACT[sector];
        let unitRev = 0;
        
        if (extractableResources && extractableResources.length > 0) {
          // Use first extractable resource for revenue calculation
          const resource = extractableResources[0];
          if (commodityPrices[resource]) {
            unitRev = commodityPrices[resource].currentPrice * EXTRACTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
          }
        }
        
        // Fallback if no commodity price available
        if (unitRev === 0) {
          unitRev = UNIT_ECONOMICS.extraction.baseRevenue * DISPLAY_PERIOD_HOURS;
        }
        
        const unitCost = UNIT_ECONOMICS.extraction.baseCost * DISPLAY_PERIOD_HOURS; // Labor cost
        
        breakdown.unitBreakdown.extraction.revenue += unitRev * entry.extraction_count;
        breakdown.unitBreakdown.extraction.cost += unitCost * entry.extraction_count;
        breakdown.unitBreakdown.extraction.units += entry.extraction_count;
      }

      // Aggregate totals for sector
      breakdown.revenue = 
        breakdown.unitBreakdown.retail.revenue +
        breakdown.unitBreakdown.production.revenue +
        breakdown.unitBreakdown.service.revenue +
        breakdown.unitBreakdown.extraction.revenue;
      
      breakdown.cost = 
        breakdown.unitBreakdown.retail.cost +
        breakdown.unitBreakdown.production.cost +
        breakdown.unitBreakdown.service.cost +
        breakdown.unitBreakdown.extraction.cost;
    });

    return sectorBreakdown;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleBuyShares = async () => {
    if (!corporation || !buyShares) return;
    
    const shares = parseInt(buyShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    if (shares > corporation.public_shares) {
      alert(`Only ${corporation.public_shares.toLocaleString()} public shares available`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.buy(corporation.id, shares);
      alert(`Successfully purchased ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Total: ${formatCurrency(result.total_cost!)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      // Update user's owned shares
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setBuyShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to buy shares');
    } finally {
      setTrading(false);
    }
  };

  const handleSellShares = async () => {
    if (!corporation || !sellShares) return;
    
    const shares = parseInt(sellShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    if (shares > userOwnedShares) {
      alert(`You only own ${userOwnedShares.toLocaleString()} shares`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.sell(corporation.id, shares);
      alert(`Successfully sold ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Total: ${formatCurrency(result.total_revenue!)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      // Update user's owned shares
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setSellShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sell shares');
    } finally {
      setTrading(false);
    }
  };

  const handleIssueShares = async () => {
    if (!corporation || !issueShares) return;
    
    const shares = parseInt(issueShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    const maxIssueable = Math.floor(corporation.shares * 0.1);
    if (shares > maxIssueable) {
      alert(`Cannot issue more than ${maxIssueable.toLocaleString()} shares (10% of ${corporation.shares.toLocaleString()} outstanding)`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.issue(corporation.id, shares);
      alert(`Successfully issued ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Capital raised: ${formatCurrency(result.total_capital_raised)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      setIssueShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to issue shares');
    } finally {
      setTrading(false);
    }
  };

  const handleAbandonUnit = async (entryId: number, unitType: 'retail' | 'production' | 'service' | 'extraction', sectorType: string) => {
    if (!corporation) return;

    if (!confirm(`Are you sure you want to abandon 1 ${unitType} unit in ${sectorType}? This action cannot be undone.`)) {
      return;
    }

    setAbandoningUnit(`${entryId}-${unitType}`);
    try {
      const result = await marketsAPI.abandonUnit(entryId, unitType);
      // Refresh data
      const [corpData, financesData] = await Promise.all([
        corporationAPI.getById(corpId),
        marketsAPI.getCorporationFinances(corpId).catch(() => null),
      ]);
      setCorporation(corpData);
      if (financesData) {
        setCorpFinances(financesData.finances);
        setBalanceSheet(financesData.balance_sheet || null);
        setMarketEntries(financesData.market_entries || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to abandon unit');
    } finally {
      setAbandoningUnit(null);
    }
  };

  const handleBuildUnit = async (entryId: number, unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    if (!corporation) return;

    setBuilding(`${entryId}-${unitType}`);
    try {
      await marketsAPI.buildUnit(entryId, unitType);
      // Refresh data
      const [corpData, financesData] = await Promise.all([
        corporationAPI.getById(corpId),
        marketsAPI.getCorporationFinances(corpId).catch(() => null),
      ]);
      setCorporation(corpData);
      if (financesData) {
        setCorpFinances(financesData.finances);
        setBalanceSheet(financesData.balance_sheet || null);
        setMarketEntries(financesData.market_entries || []);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to build unit');
    } finally {
      setBuilding(null);
    }
  };

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading corporation...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !corporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Corporation not found'}</p>
            <Link
              href="/stock-market"
              className="text-corporate-blue hover:underline"
            >
              Return to Stock Market
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  const isCeo = viewerUserId === corporation.ceo_id;
  
  // Calculate actual total shares from shareholder positions + public shares
  // This handles cases where the database total might be out of sync
  const totalHeldByPlayers = corporation.shareholders?.reduce((sum, sh) => sum + sh.shares, 0) || 0;
  const actualTotalShares = totalHeldByPlayers + corporation.public_shares;
  
  // Use actual total for calculations if there's a mismatch (corrupted data)
  const effectiveTotalShares = actualTotalShares > 0 ? actualTotalShares : corporation.shares;
  const hasShareMismatch = Math.abs(corporation.shares - actualTotalShares) > 1 && actualTotalShares > 0;
  
  const marketCap = effectiveTotalShares * corporation.share_price;
  const publicSharesPercentage = (corporation.public_shares / effectiveTotalShares) * 100;

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-corporate-blue/30 to-corporate-blue-light/40 rounded-xl blur-xl opacity-50" />
                {corporation.logo ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/20 to-corporate-blue-light/30 rounded-xl blur-sm opacity-0 hover:opacity-100 transition-opacity" />
                    <img
                      src={corporation.logo}
                      alt={corporation.name}
                      className="relative w-24 h-24 rounded-xl object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/defaultpfp.jpg';
                      }}
                    />
                  </>
                ) : (
                  <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-lg">
                    <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      <Link href={`/corporation/${corporation.id}`} className="hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors">
                        {corporation.name}
                      </Link>
                    </h1>
                    {corporation.type && (
                      <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] bg-corporate-blue/10 dark:bg-corporate-blue/20 text-corporate-blue dark:text-corporate-blue-light rounded-lg mb-2">
                        {corporation.type}
                      </span>
                    )}
                  </div>
                  {isCeo && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push('/states')}
                        className="px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        Build Sector
                      </button>
                      <button
                        onClick={() => router.push(`/corporation/${corporation.id}/edit`)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
                {corporation.ceo && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2 flex-wrap">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">CEO:</span>
                    <Link
                      href={`/profile/${corporation.ceo.profile_id}`}
                      className="font-semibold hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                    >
                      {corporation.ceo.player_name || corporation.ceo.username}
                    </Link>
                    {(corporation.ceo_salary !== undefined && corporation.ceo_salary > 0) ? (
                      <span 
                        className="px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full" 
                        title={`$${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })} per hour`}
                      >
                        Salary: ${(corporation.ceo_salary || 100000).toLocaleString()}/96h
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        No Salary
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">Founded {formatDate(corporation.created_at)}</span>
                  </div>
                  {corporation.hq_state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.1em]">
                        HQ: {US_STATES[corporation.hq_state] || corporation.hq_state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'overview'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('sectors')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'sectors'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Sectors
              </button>
              <button
                onClick={() => setActiveTab('board')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'board'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'finance'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Finance
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
            {/* Financial Overview */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Financial Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Share Price
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {formatCurrency(corporation.share_price)}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      Total Shares
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {effectiveTotalShares.toLocaleString()}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      Market Cap
                    </div>
                    <p className="text-3xl font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                      {formatCash(marketCap)}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      Public Shares
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {corporation.public_shares.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                      ({publicSharesPercentage.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Corporate Capital
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCash(balanceSheet?.cash ?? corporation.capital ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Price Chart */}
            <StockPriceChart 
              corporationId={corporation.id} 
              currentPrice={corporation.share_price} 
            />

            {/* Shareholders */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Shareholders</h2>
                {hasShareMismatch && isCeo && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Total shares recorded ({corporation.shares.toLocaleString()}) differs from actual distribution ({actualTotalShares.toLocaleString()}). 
                    An admin can fix this via the fix-all-shares endpoint.
                  </div>
                )}
                {corporation.shareholders && corporation.shareholders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-sm">
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Shareholder</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Shares</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Ownership</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/50">
                        {corporation.shareholders
                          .sort((a, b) => b.shares - a.shares)
                          .map((sh, idx) => {
                            const ownershipPercentage = (sh.shares / effectiveTotalShares) * 100;
                            const value = sh.shares * corporation.share_price;
                            const isShareholderCeo = sh.user_id === corporation.ceo_id;
                            return (
                              <tr
                                key={sh.id}
                                className={`
                                  transition-all duration-200 ease-out
                                  ${idx % 2 === 0 
                                    ? 'bg-white/40 dark:bg-gray-900/30' 
                                    : 'bg-gray-50/30 dark:bg-gray-800/20'
                                  }
                                  ${isShareholderCeo ? 'bg-corporate-blue/10 dark:bg-corporate-blue/20 border-l-4 border-corporate-blue' : ''}
                                `}
                              >
                                <td className="py-4 px-4">
                                  {sh.user ? (
                                    <Link
                                      href={`/profile/${sh.user.profile_id}`}
                                      className="flex items-center gap-3 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors group"
                                    >
                                      {sh.user.profile_image_url && (
                                        <img
                                          src={sh.user.profile_image_url}
                                          alt={sh.user.username}
                                          className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-corporate-blue/50 transition-all shadow-sm"
                                          onError={(e) => {
                                            e.currentTarget.src = '/defaultpfp.jpg';
                                          }}
                                        />
                                      )}
                                      <div>
                                        <div className="font-bold text-gray-900 dark:text-white">
                                          {sh.user.player_name || sh.user.username}
                                          {isShareholderCeo && (
                                            <span className="ml-2 text-xs font-bold uppercase tracking-[0.05em] bg-corporate-blue text-white px-2 py-0.5 rounded">CEO</span>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Unknown User</span>
                                  )}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                                  {sh.shares.toLocaleString()}
                                </td>
                                <td className="text-right py-4 px-4 text-gray-700 dark:text-gray-300 font-semibold">
                                  {ownershipPercentage.toFixed(2)}%
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                                  {formatCurrency(value)}
                                </td>
                              </tr>
                            );
                          })}
                        {/* Public shares row */}
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-t-2 border-gray-200/80 dark:border-gray-700/80">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-sm">
                                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">Public Market</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Available for purchase</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                            {corporation.public_shares.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 text-gray-700 dark:text-gray-300 font-semibold">
                            {publicSharesPercentage.toFixed(2)}%
                          </td>
                          <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                            {formatCurrency(corporation.public_shares * corporation.share_price)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No shareholders yet.</p>
                )}
              </div>
            </div>
              </>
            )}

            {activeTab === 'sectors' && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-visible backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-corporate-blue" />
                    Sector Operations
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    All sectors the corporation operates in, organized by state
                  </p>

                  {marketEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Sector Operations</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        This corporation hasn&apos;t entered any markets yet.
                      </p>
                      <Link
                        href="/states"
                        className="inline-flex items-center gap-2 bg-corporate-blue text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors text-sm"
                      >
                        <MapPin className="w-4 h-4" />
                        Browse States
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm group relative">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">States</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {new Set(marketEntries.map(e => e.state_code)).size}
                          </p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              Number of US states with market presence
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm group relative">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sectors</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {new Set(marketEntries.map(e => e.sector_type)).size}
                          </p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              Unique industry sectors operated in
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm group relative">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Units</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {marketEntries.reduce((sum, e) => sum + e.retail_count + e.production_count + e.service_count + (e.extraction_count || 0), 0)}
                          </p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              All business units: Retail + Production + Service + Extraction
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm group relative">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Production</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {marketEntries.reduce((sum, e) => sum + e.production_count, 0)}
                          </p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              Manufacturing units: ${UNIT_ECONOMICS.production.baseRevenue}/hr revenue × multiplier
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm group relative">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Extraction</p>
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {marketEntries.reduce((sum, e) => sum + (e.extraction_count || 0), 0)}
                          </p>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              Resource extraction units: ${UNIT_ECONOMICS.extraction.baseRevenue}/hr revenue × multiplier
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group by State */}
                      {(() => {
                        // Group entries by state
                        const entriesByState: Record<string, MarketEntryWithUnits[]> = {};
                        marketEntries.forEach(entry => {
                          const stateKey = entry.state_code;
                          if (!entriesByState[stateKey]) {
                            entriesByState[stateKey] = [];
                          }
                          entriesByState[stateKey].push(entry);
                        });

                        return Object.entries(entriesByState).map(([stateCode, entries]) => {
                          const stateName = entries[0]?.state_name || US_STATES[stateCode] || stateCode;
                          const stateMultiplier = entries[0]?.state_multiplier || 1;
                          
                          // Calculate state totals using dynamic economics (matching backend)
                          let stateRevenue = 0;
                          let stateCost = 0;
                          
                          entries.forEach(entry => {
                            // Retail units
                            if (entry.retail_count > 0) {
                              const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(entry.sector_type, 'retail');
                              stateRevenue += unitRevenuePerHour * entry.retail_count * DISPLAY_PERIOD_HOURS;
                              stateCost += unitCostPerHour * entry.retail_count * DISPLAY_PERIOD_HOURS;
                            }
                            
                            // Production units - use dynamic pricing
                            if (entry.production_count > 0) {
                              const { unitRevenuePerHour, unitCostPerHour } = getProductionUnitEconomics(entry.sector_type);
                              const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
                              const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
                              
                              stateRevenue += unitRev * entry.production_count;
                              stateCost += unitCost * entry.production_count;
                            }
                            
                            // Service units
                            if (entry.service_count > 0) {
                              const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(entry.sector_type, 'service');
                              stateRevenue += unitRevenuePerHour * entry.service_count * DISPLAY_PERIOD_HOURS;
                              stateCost += unitCostPerHour * entry.service_count * DISPLAY_PERIOD_HOURS;
                            }
                            
                            // Extraction units - use dynamic pricing
                            if (entry.extraction_count && entry.extraction_count > 0) {
                              const extractableResources = SECTORS_CAN_EXTRACT[entry.sector_type];
                              let unitRev = 0;
                              
                              if (extractableResources && extractableResources.length > 0) {
                                const resource = extractableResources[0];
                                if (commodityPrices[resource]) {
                                  unitRev = commodityPrices[resource].currentPrice * EXTRACTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
                                }
                              }
                              
                              if (unitRev === 0) {
                                unitRev = UNIT_ECONOMICS.extraction.baseRevenue * DISPLAY_PERIOD_HOURS;
                              }
                              
                              const unitCost = UNIT_ECONOMICS.extraction.baseCost * DISPLAY_PERIOD_HOURS;
                              
                              stateRevenue += unitRev * entry.extraction_count;
                              stateCost += unitCost * entry.extraction_count;
                            }
                          });
                          
                          const stateProfit = stateRevenue - stateCost;
                          
                          // For display in tooltip
                          const stateRetail = entries.reduce((s, e) => s + e.retail_count, 0);
                          const stateProduction = entries.reduce((s, e) => s + e.production_count, 0);
                          const stateService = entries.reduce((s, e) => s + e.service_count, 0);
                          const stateExtraction = entries.reduce((s, e) => s + (e.extraction_count || 0), 0);

                          return (
                            <div key={stateCode} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
                              {/* State Header */}
                              <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                  <Link 
                                    href={`/states/${stateCode}`}
                                    className="flex items-center gap-2 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                  >
                                    <MapPin className="w-4 h-4 text-corporate-blue" />
                                    <span className="font-semibold text-gray-900 dark:text-white">{stateName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({stateCode})</span>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-corporate-blue/10 text-corporate-blue dark:text-corporate-blue-light group relative cursor-help">
                                      {stateMultiplier.toFixed(1)}x
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                          State capacity multiplier - affects max units per sector (not revenue)
                                        </div>
                                      </div>
                                    </span>
                                  </Link>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right group relative">
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                        {formatCurrency(stateRevenue)}
                                      </p>
                                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg text-left max-w-xs">
                                          <p className="font-medium mb-1">96-hour Revenue Breakdown</p>
                                          <p className="text-gray-400 text-xs mb-1">(No state multiplier on revenue - multipliers affect capacity only)</p>
                                          <div className="space-y-1">
                                            {stateRetail > 0 && (
                                              <p>Retail: {stateRetail} × ${UNIT_ECONOMICS.retail.baseRevenue}/hr × 96hr</p>
                                            )}
                                            {stateProduction > 0 && (
                                              <p>Production: {stateProduction} units (dynamic pricing)</p>
                                            )}
                                            {stateService > 0 && (
                                              <p>Service: {stateService} × ${UNIT_ECONOMICS.service.baseRevenue}/hr × 96hr</p>
                                            )}
                                            {stateExtraction > 0 && (
                                              <p>Extraction: {stateExtraction} units (dynamic pricing)</p>
                                            )}
                                          </div>
                                          <p className="border-t border-gray-700 mt-1 pt-1 font-semibold">Total: {formatCurrency(stateRevenue)}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right group relative">
                                      <p className="text-xs text-gray-500 dark:text-gray-400">Profit</p>
                                      <p className={`text-sm font-bold font-mono ${stateProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(stateProfit)}
                                      </p>
                                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg text-left">
                                          <p className="font-medium mb-1">Net = Revenue - Costs</p>
                                          <p className="text-emerald-400">Revenue: {formatCurrency(stateRevenue)}</p>
                                          <p className="text-red-400">Costs: {formatCurrency(stateCost)}</p>
                                          <p className="border-t border-gray-700 mt-1 pt-1">Net: {formatCurrency(stateProfit)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Sectors in State */}
                              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {entries.map((entry) => {
                                  const requiredResource = SECTOR_RESOURCES[entry.sector_type];
                                  const canExtract = sectorCanExtract(entry.sector_type);
                                  const extractableResources = SECTORS_CAN_EXTRACT[entry.sector_type];
                                  const totalUnits = entry.retail_count + entry.production_count + entry.service_count + (entry.extraction_count || 0);
                                  
                                  // Calculate entry revenue and cost using dynamic economics (matching backend)
                                  let entryRevenue = 0;
                                  let entryCost = 0;
                                  const productionEconomics = getProductionUnitEconomics(entry.sector_type);
                                  
                                  // Retail units
                                  if (entry.retail_count > 0) {
                                    const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(entry.sector_type, 'retail');
                                    entryRevenue += unitRevenuePerHour * entry.retail_count * DISPLAY_PERIOD_HOURS;
                                    entryCost += unitCostPerHour * entry.retail_count * DISPLAY_PERIOD_HOURS;
                                  }
                                  
                                  // Production units - use dynamic pricing
                                  if (entry.production_count > 0) {
                                    entryRevenue += productionEconomics.unitRevenuePerHour * DISPLAY_PERIOD_HOURS * entry.production_count;
                                    entryCost += productionEconomics.unitCostPerHour * DISPLAY_PERIOD_HOURS * entry.production_count;
                                  }
                                  
                                  // Service units
                                  if (entry.service_count > 0) {
                                    const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(entry.sector_type, 'service');
                                    entryRevenue += unitRevenuePerHour * entry.service_count * DISPLAY_PERIOD_HOURS;
                                    entryCost += unitCostPerHour * entry.service_count * DISPLAY_PERIOD_HOURS;
                                  }
                                  
                                  // Extraction units - use dynamic pricing
                                  if (entry.extraction_count && entry.extraction_count > 0) {
                                    let unitRev = 0;
                                    
                                    if (extractableResources && extractableResources.length > 0) {
                                      const resource = extractableResources[0];
                                      if (commodityPrices[resource]) {
                                        unitRev = commodityPrices[resource].currentPrice * EXTRACTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
                                      }
                                    }
                                    
                                    if (unitRev === 0) {
                                      unitRev = UNIT_ECONOMICS.extraction.baseRevenue * DISPLAY_PERIOD_HOURS;
                                    }
                                    
                                    const unitCost = UNIT_ECONOMICS.extraction.baseCost * DISPLAY_PERIOD_HOURS;
                                    
                                    entryRevenue += unitRev * entry.extraction_count;
                                    entryCost += unitCost * entry.extraction_count;
                                  }
                                  
                                  const entryProfit = entryRevenue - entryCost;

                                  return (
                                    <SectorCard
                                      key={entry.id}
                                      sectorType={entry.sector_type}
                                      stateCode={entry.state_code}
                                      stateName={stateName}
                                      stateMultiplier={stateMultiplier}
                                      enteredDate={entry.created_at}
                                      units={{
                                        retail: entry.retail_count,
                                        production: entry.production_count,
                                        service: entry.service_count,
                                        extraction: entry.extraction_count || 0,
                                      }}
                                      corporation={corporation ? {
                                        id: corporation.id,
                                        name: corporation.name,
                                        logo: corporation.logo,
                                      } : null}
                                      canExtract={canExtract}
                                      extractableResources={extractableResources}
                                      requiredResource={requiredResource || null}
                                      producedProduct={SECTOR_PRODUCTS[entry.sector_type] || null}
                                      productDemands={SECTOR_PRODUCT_DEMANDS[entry.sector_type] || null}
                                      revenue={entryRevenue}
                                      profit={entryProfit}
                                      showActions={corporation && viewerUserId === corporation.ceo_id}
                                      onAbandonUnit={(unitType) => handleAbandonUnit(entry.id, unitType, entry.sector_type)}
                                      onBuildUnit={(unitType) => handleBuildUnit(entry.id, unitType)}
                                      abandoningUnit={abandoningUnit?.startsWith(`${entry.id}-`) ? abandoningUnit.split('-')[1] : null}
                                      building={building?.startsWith(`${entry.id}-`) ? building.split('-')[1] : null}
                                      canBuild={corporation && viewerUserId === corporation.ceo_id && (corporation.capital ?? 0) >= 10000}
                                      buildCost={10000}
                                      formatCurrency={formatCurrency}
                                      calculateUnitProfit={(unitType) => {
                                        if (unitType === 'retail' || unitType === 'service') {
                                          const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(entry.sector_type, unitType);
                                          return (unitRevenuePerHour - unitCostPerHour) * DISPLAY_PERIOD_HOURS;
                                        }
                                        if (unitType === 'production') {
                                          return (productionEconomics.unitRevenuePerHour - productionEconomics.unitCostPerHour) * DISPLAY_PERIOD_HOURS;
                                        }
                                        if (unitType === 'extraction') {
                                          if (extractableResources && extractableResources.length > 0 && commodityPrices[extractableResources[0]]) {
                                            const extractionRevenue = commodityPrices[extractableResources[0]].currentPrice * EXTRACTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
                                            const extractionCost = UNIT_ECONOMICS.extraction.baseCost * DISPLAY_PERIOD_HOURS;
                                            return extractionRevenue - extractionCost;
                                          }
                                          return (UNIT_ECONOMICS.extraction.baseRevenue - UNIT_ECONOMICS.extraction.baseCost) * DISPLAY_PERIOD_HOURS;
                                        }
                                        return 0;
                                      }}
                                      UNIT_ECONOMICS={UNIT_ECONOMICS}
                                      SECTORS_CAN_EXTRACT={SECTORS_CAN_EXTRACT}
                                      commodityPrices={commodityPrices}
                                      productPrices={productPrices}
                                      EXTRACTION_OUTPUT_RATE={2.0}
                                      unitFlows={marketMetadata?.sector_unit_flows?.[entry.sector_type]}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* Resource Demand Summary */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Droplets className="w-5 h-5 text-amber-600" />
                          Resource Inputs Required
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">(for production units)</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            // Calculate total resource demand across all market entries
                            const resourceDemand: Record<string, number> = {};
                            marketEntries.forEach(entry => {
                              if (entry.production_count > 0) {
                                const flow = getProductionFlow(entry.sector_type);
                                const inputs = flow?.inputs.resources;
                                if (inputs) {
                                  Object.entries(inputs).forEach(([resource, amount]) => {
                                    resourceDemand[resource] = (resourceDemand[resource] || 0) + amount * entry.production_count;
                                  });
                                } else {
                                  const resource = SECTOR_RESOURCES[entry.sector_type];
                                  if (resource) {
                                    resourceDemand[resource] = (resourceDemand[resource] || 0) + entry.production_count;
                                  }
                                }
                              }
                            });

                            if (Object.keys(resourceDemand).length === 0) {
                              return (
                                <div className="col-span-full text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No production units requiring resources
                                  </p>
                                </div>
                              );
                            }

                            return Object.entries(resourceDemand).map(([resource, demand]) => (
                              <div 
                                key={resource} 
                                className={`rounded-lg p-4 group relative ${RESOURCE_COLORS[resource] || 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {RESOURCE_ICONS[resource]}
                                  <span className="font-medium text-sm">{resource}</span>
                                </div>
                                <p className="text-2xl font-bold">{demand.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                <p className="text-xs opacity-75">units required / hr</p>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                    <p className="font-medium">{resource} Demand</p>
                                    <p>{demand.toLocaleString(undefined, { maximumFractionDigits: 2 })} units/hr needed across production</p>
                                    <p className="text-gray-400 mt-1">efficiency = min(1, available / total demand)</p>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Extraction Output Summary */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Pickaxe className="w-5 h-5 text-amber-600" />
                          Extraction Output
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">(resources extracted)</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            // Calculate total extraction output across all market entries
                            const extractionOutput: Record<string, number> = {};
                            marketEntries.forEach(entry => {
                              const resources = SECTORS_CAN_EXTRACT[entry.sector_type];
                              if (resources && (entry.extraction_count || 0) > 0) {
                                resources.forEach(resource => {
                                  extractionOutput[resource] = (extractionOutput[resource] || 0) + (entry.extraction_count || 0);
                                });
                              }
                            });

                            if (Object.keys(extractionOutput).length === 0) {
                              return (
                                <div className="col-span-full text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No extraction units producing resources
                                  </p>
                                </div>
                              );
                            }

                            return Object.entries(extractionOutput).map(([resource, output]) => (
                              <div 
                                key={resource} 
                                className={`rounded-lg p-4 group relative ${RESOURCE_COLORS[resource] || 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {RESOURCE_ICONS[resource]}
                                  <span className="font-medium text-sm">{resource}</span>
                                </div>
                                <p className="text-2xl font-bold">{output}</p>
                                <p className="text-xs opacity-75">units extracted</p>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                    <p className="font-medium">{resource} Extraction</p>
                                    <p>{output} extraction units producing this resource</p>
                                    <p className="text-emerald-400 mt-1">Adds to state/national resource pool</p>
                                  </div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Product Output Summary */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Box className="w-5 h-5 text-emerald-600" />
                          Product Output
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            // Calculate total product output across all market entries
                            const productOutput: Record<string, number> = {};
                            marketEntries.forEach(entry => {
                              if (entry.production_count > 0) {
                                const flow = getProductionFlow(entry.sector_type);
                                const outputs = flow?.outputs.products;
                                if (outputs) {
                                  Object.entries(outputs).forEach(([product, amount]) => {
                                    productOutput[product] = (productOutput[product] || 0) + amount * entry.production_count;
                                  });
                                } else {
                                  const product = SECTOR_PRODUCTS[entry.sector_type];
                                  if (product) {
                                    productOutput[product] =
                                      (productOutput[product] || 0) +
                                      entry.production_count * PRODUCTION_OUTPUT_RATE;
                                  }
                                }
                              }
                            });

                            if (Object.keys(productOutput).length === 0) {
                              return (
                                <div className="col-span-full text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No production units creating products
                                  </p>
                                </div>
                              );
                            }

                            return Object.entries(productOutput).map(([product, output]) => (
                              <div 
                                key={product} 
                                className={`rounded-lg p-4 ${PRODUCT_COLORS[product] || 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {PRODUCT_ICONS[product]}
                                  <span className="font-medium text-sm">{product}</span>
                                </div>
                                <p className="text-2xl font-bold">{output.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                <p className="text-xs opacity-75">units produced / hr</p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Product Demand Summary */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Package className="w-5 h-5 text-orange-600" />
                          Product Inputs Required
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">(from national pool)</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            // Calculate total product demand across all market entries
                            const productDemand: Record<string, number> = {};
                            marketEntries.forEach(entry => {
                              if (entry.production_count > 0) {
                                const flow = getProductionFlow(entry.sector_type);
                                const inputs = flow?.inputs.products;
                                if (inputs) {
                                  Object.entries(inputs).forEach(([product, amount]) => {
                                    productDemand[product] = (productDemand[product] || 0) + amount * entry.production_count;
                                  });
                                } else {
                                  const demands = SECTOR_PRODUCT_DEMANDS[entry.sector_type];
                                  if (demands) {
                                    demands.forEach(product => {
                                      productDemand[product] = (productDemand[product] || 0) + PRODUCTION_PRODUCT_CONSUMPTION * entry.production_count;
                                    });
                                  }
                                  productDemand['Electricity'] = (productDemand['Electricity'] || 0) + PRODUCTION_ELECTRICITY_CONSUMPTION * entry.production_count;
                                }
                              }
                            });

                            if (Object.keys(productDemand).length === 0) {
                              return (
                                <div className="col-span-full text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No production units requiring products
                                  </p>
                                </div>
                              );
                            }

                            return Object.entries(productDemand).map(([product, demand]) => (
                              <div 
                                key={product} 
                                className={`rounded-lg p-4 ${PRODUCT_COLORS[product] || 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {PRODUCT_ICONS[product]}
                                  <span className="font-medium text-sm">{product}</span>
                                </div>
                                <p className="text-2xl font-bold">{demand.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                <p className="text-xs opacity-75">units needed / hr</p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <>
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Finance & Capital</h2>
                  
                  {isCeo ? (
                    <div className="space-y-6">
                      {/* Issue Shares Section */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Plus className="w-5 h-5 text-corporate-blue" />
                          Issue New Shares
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Issue new shares at market price to raise capital. You can issue up to 10% of current outstanding shares.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="issueShares" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Number of Shares to Issue
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                id="issueShares"
                                min="1"
                                max={Math.floor(corporation.shares * 0.1)}
                                value={issueShares}
                                onChange={(e) => setIssueShares(e.target.value)}
                                placeholder="Shares"
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                                disabled={trading}
                              />
                              <button
                                onClick={handleIssueShares}
                                disabled={trading || !issueShares || !corporation}
                                className="px-6 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-semibold"
                              >
                                <Plus className="w-4 h-4" />
                                Issue
                              </button>
                            </div>
                            {issueShares && !isNaN(parseInt(issueShares, 10)) && corporation && (
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Issue Price: <span className="font-semibold">{formatCurrency(corporation.share_price)}</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Capital Raised: <span className="font-semibold">{formatCurrency(parseInt(issueShares, 10) * corporation.share_price)}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Max issueable: {Math.floor(corporation.shares * 0.1).toLocaleString()} shares (10% of {corporation.shares.toLocaleString()})
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Current Capital Info */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-corporate-blue" />
                          Corporate Capital
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Capital</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                              {formatCash(balanceSheet?.cash ?? corporation.capital ?? 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Market Cap</p>
                            <p className="text-2xl font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                              {formatCash(marketCap)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Only the CEO can manage corporate finance and issue shares.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Statement - Combined Balance Sheet & Income Statement */}
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-corporate-blue" />
                    Financial Statement
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">96-hour projection based on market operations</p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Balance Sheet */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-corporate-blue" />
                        Balance Sheet
                      </h3>

                      {/* Assets */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assets</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Cash</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCash(balanceSheet?.cash ?? corporation.capital ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Business Units</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(balanceSheet?.businessUnitAssets || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Total Assets</span>
                            <span className="text-sm font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                              {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities & Equity */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Liabilities & Equity</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(balanceSheet?.totalLiabilities || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Shareholders&apos; Equity</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(balanceSheet?.shareholdersEquity || corporation.capital || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Book Value/Share</span>
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatCurrency(balanceSheet?.bookValuePerShare || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Total L&E</span>
                            <span className="text-sm font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                              {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Income Statement */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-corporate-blue" />
                        Income Statement
                      </h3>

                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr,auto,auto] gap-2 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400"></div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right min-w-[80px]">96hr</div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right min-w-[80px]">Hourly</div>
                        </div>

                        <div className="space-y-2">
                          {/* Revenue */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-right min-w-[80px]">
                              {formatCurrency(statements.revenue)}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono text-right min-w-[80px]">
                              {formatCurrency(statements.revenue / 96)}
                            </span>
                          </div>

                          {/* Operating Costs */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Operating Costs</span>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400 font-mono text-right min-w-[80px]">
                              {formatCurrency(statements.variableCosts)}
                            </span>
                            <span className="text-xs text-red-600 dark:text-red-400 font-mono text-right min-w-[80px]">
                              {formatCurrency(statements.variableCosts / 96)}
                            </span>
                          </div>

                          {/* CEO Salary */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">CEO Salary</span>
                            <span className={`text-sm font-semibold font-mono text-right min-w-[80px] ${(corporation.ceo_salary || 100000) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {formatCurrency(corporation.ceo_salary ?? 100000)}
                            </span>
                            <span className={`text-xs font-mono text-right min-w-[80px] ${(corporation.ceo_salary || 100000) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {formatCurrency((corporation.ceo_salary ?? 100000) / 96)}
                            </span>
                          </div>

                          {/* Operating Income (Net Income before dividends) */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Operating Income</span>
                            <span className={`text-sm font-semibold font-mono text-right min-w-[80px] ${(statements.operatingIncome || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(statements.operatingIncome)}
                            </span>
                            <span className={`text-xs font-mono text-right min-w-[80px] ${(statements.operatingIncome || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(statements.operatingIncome / 96)}
                            </span>
                          </div>

                          {/* Dividends */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Dividends ({(corporation.dividend_percentage || 0).toFixed(1)}%)
                            </span>
                            <span className={`text-sm font-semibold font-mono text-right min-w-[80px] ${statements.dividends > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {statements.dividends > 0 ? `-${formatCurrency(statements.dividends)}` : '$0.00'}
                            </span>
                            <span className={`text-xs font-mono text-right min-w-[80px] ${statements.dividends > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {statements.dividends > 0 ? `-${formatCurrency(statements.dividends / 96)}` : '$0.00'}
                            </span>
                          </div>

                          {/* Retained Earnings */}
                          <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">Retained Earnings</span>
                            <span className={`text-sm font-bold font-mono text-right min-w-[80px] ${(statements.retainedEarnings || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(statements.retainedEarnings)}
                            </span>
                            <span className={`text-xs font-bold font-mono text-right min-w-[80px] ${(statements.retainedEarnings || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(statements.retainedEarnings / 96)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Valuation Section */}
                  <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Stock Price Valuation</h4>

                    {/* Main Price Display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Current Price</span>
                        <span className="font-mono font-semibold text-lg text-gray-900 dark:text-white">
                          {formatCurrency(corporation.share_price || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Book Value/Share</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(stockValuation?.book_value || balanceSheet?.bookValuePerShare || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Total Shares</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {effectiveTotalShares?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block text-xs mb-1">Markets Active</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {balanceSheet?.marketsCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Valuation Breakdown */}
                    {stockValuation && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Valuation Components</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                          <div className="group relative">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">Earnings Value</span>
                            <span className={`font-mono font-medium ${stockValuation.earnings_value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(stockValuation.earnings_value)}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Earnings-Based Valuation (96hr)</p>
                                <p className="text-gray-300">Operating Profit: {formatCurrency(stockValuation.annual_profit)}</p>
                                <p className="text-gray-300">EPS × P/E (15x) = {formatCurrency(stockValuation.annual_profit / (effectiveTotalShares || 1))} × 15</p>
                              </div>
                            </div>
                          </div>
                          <div className="group relative">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">Cash/Share</span>
                            <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                              {formatCurrency(stockValuation.cash_per_share)}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Cash Position</p>
                                <p className="text-gray-300">Total Capital: {formatCurrency(balanceSheet?.cash || 0)}</p>
                                <p className="text-gray-300">Per Share: {formatCurrency(stockValuation.cash_per_share)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="group relative">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">Dividend Yield</span>
                            <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                              {stockValuation.dividend_yield.toFixed(2)}%
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Dividend Information</p>
                                <p className="text-gray-300">Div/Share (96hr): {formatCurrency(stockValuation.annual_dividend_per_share)}</p>
                                <p className="text-gray-300">Yield: {stockValuation.dividend_yield.toFixed(2)}%</p>
                              </div>
                            </div>
                          </div>
                          <div className="group relative">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">Trade Price</span>
                            <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                              {stockValuation.has_trade_history ? formatCurrency(stockValuation.trade_weighted_price) : '—'}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Trade History</p>
                                <p className="text-gray-300">{stockValuation.recent_trade_count} recent trades</p>
                                <p className="text-gray-300">Weighted avg: {formatCurrency(stockValuation.trade_weighted_price)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="group relative">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">Fundamental Value</span>
                            <span className="font-mono font-medium text-gray-900 dark:text-white">
                              {formatCurrency(stockValuation.fundamental_value)}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Fundamental Value</p>
                                <p className="text-gray-300">45% Book: {formatCurrency(stockValuation.book_value * 0.45)}</p>
                                <p className={`${stockValuation.earnings_value < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                                  25% Earnings: {formatCurrency(stockValuation.earnings_value * 0.25)}
                                </p>
                                <p className="text-amber-400">
                                  10% Dividend: {formatCurrency((stockValuation.annual_dividend_per_share * 10) * 0.10)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <strong>Price Formula:</strong> 45% Book Value + 25% Earnings (96hr × PE 15) + 20% Trade History + 10% Dividend Yield (min $0.01)
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Units Card */}
              {corpFinances && corpFinances.markets_count > 0 && (
                <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                  <div className="relative p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Factory className="w-5 h-5 text-corporate-blue" />
                      Business Units
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30">
                        <Store className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{corpFinances.total_retail_units}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Retail Units</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30">
                        <Factory className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{corpFinances.total_production_units}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Production Units</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                        <Briefcase className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{corpFinances.total_service_units}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Service Units</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                        <Pickaxe className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{corpFinances.total_extraction_units || 0}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Extraction Units</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Total: {(corpFinances.total_retail_units || 0) + (corpFinances.total_production_units || 0) + (corpFinances.total_service_units || 0) + (corpFinances.total_extraction_units || 0)} units
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {corpFinances.markets_count} market{corpFinances.markets_count !== 1 ? 's' : ''} active
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Market Presence Card */}
              {marketEntries.length > 0 && (
                <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                  <div className="relative p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-corporate-blue" />
                      Market Presence
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      {marketEntries.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/states/${entry.state_code}`}
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-corporate-blue/50 dark:hover:border-corporate-blue/50 hover:shadow-lg transition-all group"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-corporate-blue transition-colors">
                              {entry.state_name || entry.state_code}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{entry.sector_type}</p>
                            <div className="flex gap-2 mt-2 text-xs">
                              {(entry.retail_count || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
                                  {entry.retail_count} retail
                                </span>
                              )}
                              {(entry.production_count || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                  {entry.production_count} prod
                                </span>
                              )}
                              {(entry.service_count || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  {entry.service_count} svc
                                </span>
                              )}
                              {(entry.extraction_count || 0) > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                  {entry.extraction_count} ext
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-corporate-blue dark:text-corporate-blue-light">
                              {entry.state_multiplier?.toFixed(1)}x
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">multiplier</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No Market Operations CTA */}
              {(!corpFinances || corpFinances.markets_count === 0) && (
                <div className="relative rounded-2xl border border-dashed border-corporate-blue/30 bg-corporate-blue/5 dark:bg-corporate-blue/10 mt-6 p-8 text-center">
                  <MapPin className="h-12 w-12 text-corporate-blue/50 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-corporate-blue dark:text-corporate-blue-light">
                    No market operations yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                    Enter markets via the States page to generate revenue
                  </p>
                  <Link
                    href="/states"
                    className="inline-block px-6 py-2 bg-corporate-blue text-white text-sm font-medium rounded-lg hover:bg-corporate-blue-dark transition-colors"
                  >
                    View States
                  </Link>
                </div>
              )}
              </>
            )}

            {activeTab === 'board' && (
              <BoardTab
                corporationId={corpId}
                corporationName={corporation.name}
                viewerUserId={viewerUserId}
              />
            )}
          </div>

          {/* Sidebar - Only show on overview, sectors, and finance tabs */}
          {activeTab !== 'board' && (
          <div className="space-y-6">
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  {/* Buy/Sell Shares */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Trade Shares
                    </div>
                    
                    {/* Buy Shares */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Buy Shares (1.01x price)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max={corporation.public_shares}
                          value={buyShares}
                          onChange={(e) => setBuyShares(e.target.value)}
                          placeholder="Shares"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                          disabled={trading || !viewerUserId}
                        />
                        <button
                          onClick={handleBuyShares}
                          disabled={trading || !buyShares || !viewerUserId}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold"
                        >
                          <ArrowUp className="w-4 h-4" />
                          Buy
                        </button>
                      </div>
                      {buyShares && !isNaN(parseInt(buyShares, 10)) && corporation && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Cost: {formatCurrency(parseInt(buyShares, 10) * corporation.share_price * 1.01)}
                        </p>
                      )}
                    </div>

                    {/* Sell Shares */}
                    {userOwnedShares > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Sell Shares (0.99x price) - You own {userOwnedShares.toLocaleString()}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max={userOwnedShares}
                            value={sellShares}
                            onChange={(e) => setSellShares(e.target.value)}
                            placeholder="Shares"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                            disabled={trading || !viewerUserId}
                          />
                          <button
                            onClick={handleSellShares}
                            disabled={trading || !sellShares || !viewerUserId}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold"
                          >
                            <ArrowDown className="w-4 h-4" />
                            Sell
                          </button>
                        </div>
                        {sellShares && !isNaN(parseInt(sellShares, 10)) && corporation && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Revenue: {formatCurrency(parseInt(sellShares, 10) * corporation.share_price * 0.99)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {!viewerUserId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Please log in to trade shares
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <Link
                      href="/stock-market"
                      className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md font-semibold"
                    >
                      View Stock Market
                    </Link>
                    {corporation.ceo && (
                      <Link
                        href={`/profile/${corporation.ceo.profile_id}`}
                        className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md font-semibold"
                      >
                        View CEO Profile
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </AppNavigation>
  );
}
