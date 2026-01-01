'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI, sharesAPI, marketsAPI, CorporationFinances, MarketEntryWithUnits, BalanceSheet, CommodityPrice, ProductMarketData, MarketMetadataResponse, MarketUnitFlow } from '@/lib/api';
import { StockValuation } from '@/lib/utils/valuation';
import { formatCash, getErrorMessage } from '@/lib/utils';
import { Input, Button } from "@heroui/react";
import { Building2, Edit, Trash2, TrendingUp, DollarSign, Users, User, Calendar, ArrowUp, ArrowDown, TrendingDown, Plus, BarChart3, MapPin, Store, Factory, Briefcase, Layers, Droplets, Package, Cpu, Zap, Wheat, Trees, FlaskConical, Box, Lightbulb, Pill, Wrench, Truck, Shield, UtensilsCrossed, Info, ArrowRight, Pickaxe, HelpCircle } from 'lucide-react';
import BoardTab from '@/components/BoardTab';
import StockPriceChart from '@/components/StockPriceChart';
import SectorCard from '@/components/SectorCard';
import { computeFinancialStatements } from '@/lib/finance';
import { UnifiedSectorConfig } from '@/lib/models/SectorConfig';

// Sector to Resource mapping (must match backend)
const SECTOR_RESOURCES: Record<string, string | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Light Industry': null,
  'Manufacturing': null,
  'Energy': null,
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': null,
  'Hospitality': null,
  'Construction': null,
  'Pharmaceuticals': 'Chemical Compounds',
  'Mining': null,
  'Heavy Industry': null,
};

// Sector to Product output mapping (what production units create)
const SECTOR_PRODUCTS: Record<string, string | null> = {
  'Technology': 'Technology Products',
  'Finance': null,
  'Healthcare': null,
  'Light Industry': 'Manufactured Goods',
  'Manufacturing': 'Manufactured Goods',
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
  'Manufacturing': ['Steel'],
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

// Resource icon mapping
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

// Resource color classes
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

// Unit economics for revenue calculation
const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
  extraction: { baseRevenue: 400, baseCost: 700 },
};
const DISPLAY_PERIOD_HOURS = 96;

// Sectors that can build extraction units
const SECTORS_CAN_EXTRACT: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': null,
  'Healthcare': null,
  'Light Industry': null,
  'Manufacturing': null,
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

const sectorCanExtract = (sector: string): boolean => {
  const resources = SECTORS_CAN_EXTRACT[sector];
  return resources !== null && resources.length > 0;
};

// Base product prices
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

// Production unit constants
const PRODUCTION_LABOR_COST = 400; 
const PRODUCTION_RESOURCE_CONSUMPTION = 0.5;
const PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5;
const PRODUCTION_PRODUCT_CONSUMPTION = 0.5;
const PRODUCTION_OUTPUT_RATE = 1.0;
const EXTRACTION_OUTPUT_RATE = 2.0;

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

interface CorporationDashboardProps {
  initialCorporation: CorporationResponse;
  initialFinances: CorporationFinances | null;
  initialBalanceSheet: BalanceSheet | null;
  initialMarketEntries: MarketEntryWithUnits[];
  initialCommodityPrices: Record<string, CommodityPrice>;
  initialProductPrices: Record<string, ProductMarketData>;
  initialMarketMetadata: MarketMetadataResponse | null;
  initialStockValuation: StockValuation | null;
  sectorConfig: UnifiedSectorConfig | null;
}

export default function CorporationDashboard({
  initialCorporation,
  initialFinances,
  initialBalanceSheet,
  initialMarketEntries,
  initialCommodityPrices,
  initialProductPrices,
  initialMarketMetadata,
  initialStockValuation,
  sectorConfig,
}: CorporationDashboardProps) {
  const router = useRouter();
  
  const [corporation, setCorporation] = useState<CorporationResponse>(initialCorporation);
  const [corpFinances, setCorpFinances] = useState<CorporationFinances | null>(initialFinances);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(initialBalanceSheet);
  const [marketEntries, setMarketEntries] = useState<MarketEntryWithUnits[]>(initialMarketEntries);
  const [commodityPrices, setCommodityPrices] = useState<Record<string, CommodityPrice>>(initialCommodityPrices);
  const [productPrices, setProductPrices] = useState<Record<string, ProductMarketData>>(initialProductPrices);
  const [stockValuation, setStockValuation] = useState<StockValuation | null>(initialStockValuation);
  
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [buyShares, setBuyShares] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [issueShares, setIssueShares] = useState('');
  const [trading, setTrading] = useState(false);
  const [userOwnedShares, setUserOwnedShares] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'finance' | 'board'>('overview');
  const [abandoningUnit, setAbandoningUnit] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authAPI.getMe().catch(() => null);
        if (userData) {
          setViewerUserId(userData.id);
          const userShareholder = corporation.shareholders?.find(sh => sh.user_id === userData.id);
          setUserOwnedShares(userShareholder?.shares || 0);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, [corporation]);

  const getProductionFlow = (sector: string): MarketUnitFlow | null => {
    const flowFromMetadata = initialMarketMetadata?.sector_unit_flows?.[sector]?.production;
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this corporation? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await corporationAPI.delete(corporation.id);
      router.push('/stock-market');
    } catch (err: unknown) {
      console.error('Failed to delete corporation:', err);
      alert(getErrorMessage(err, 'Failed to delete corporation'));
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

  const statements = useMemo(() => {
    if (corpFinances) {
      return {
        revenue: corpFinances.display_revenue,
        variableCosts: corpFinances.display_costs,
        fixedCosts: corpFinances.ceo_salary_96h,
        operatingIncome: corpFinances.operating_income_96h,
        dividends: corpFinances.dividend_payout_96h,
        retainedEarnings: corpFinances.net_income_96h,
        netIncome: corpFinances.net_income_96h,
        sectors: [],
        periodHours: DISPLAY_PERIOD_HOURS,
        errors: [],
      };
    }

    const entries = marketEntries.map(e => ({
      sector_type: e.sector_type,
      retail_count: e.retail_count,
      production_count: e.production_count,
      service_count: e.service_count,
      extraction_count: e.extraction_count || 0,
    }));
    const flows = initialMarketMetadata?.sector_unit_flows || {};
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
  }, [corpFinances, marketEntries, initialMarketMetadata, commodityPrices, productPrices, corporation]);

  const productReferenceValues = useMemo(() => {
    if (!sectorConfig) return undefined;
    const values: Record<string, number> = {};
    for (const [name, product] of Object.entries(sectorConfig.products)) {
      values[name] = product.referenceValue;
    }
    return values;
  }, [sectorConfig]);

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
      
      if (entry.retail_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(sector, 'retail');
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        breakdown.unitBreakdown.retail.revenue += unitRev * entry.retail_count;
        breakdown.unitBreakdown.retail.cost += unitCost * entry.retail_count;
        breakdown.unitBreakdown.retail.units += entry.retail_count;
      }

      if (entry.production_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getProductionUnitEconomics(sector);
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        
        breakdown.unitBreakdown.production.revenue += unitRev * entry.production_count;
        breakdown.unitBreakdown.production.cost += unitCost * entry.production_count;
        breakdown.unitBreakdown.production.units += entry.production_count;
      }

      if (entry.service_count > 0) {
        const { unitRevenuePerHour, unitCostPerHour } = getRetailServiceUnitEconomics(sector, 'service');
        const unitRev = unitRevenuePerHour * DISPLAY_PERIOD_HOURS;
        const unitCost = unitCostPerHour * DISPLAY_PERIOD_HOURS;
        breakdown.unitBreakdown.service.revenue += unitRev * entry.service_count;
        breakdown.unitBreakdown.service.cost += unitCost * entry.service_count;
        breakdown.unitBreakdown.service.units += entry.service_count;
      }

      if (entry.extraction_count && entry.extraction_count > 0) {
        const extractableResources = SECTORS_CAN_EXTRACT[sector];
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
        
        breakdown.unitBreakdown.extraction.revenue += unitRev * entry.extraction_count;
        breakdown.unitBreakdown.extraction.cost += unitCost * entry.extraction_count;
        breakdown.unitBreakdown.extraction.units += entry.extraction_count;
      }

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
      
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setBuyShares('');
    } catch (err: unknown) {
      let errorMsg = 'Failed to buy shares';
      if (typeof err === 'object' && err !== null) {
          const anyErr = err as { response?: { data?: { error?: string } } };
          errorMsg = anyErr.response?.data?.error || errorMsg;
      }
      alert(errorMsg);
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
      
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setSellShares('');
    } catch (err: unknown) {
      let errorMsg = 'Failed to sell shares';
      if (typeof err === 'object' && err !== null) {
          const anyErr = err as { response?: { data?: { error?: string } } };
          errorMsg = anyErr.response?.data?.error || errorMsg;
      }
      alert(errorMsg);
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
      
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      setIssueShares('');
    } catch (err: unknown) {
      let errorMsg = 'Failed to issue shares';
      if (typeof err === 'object' && err !== null) {
          const anyErr = err as { response?: { data?: { error?: string } } };
          errorMsg = anyErr.response?.data?.error || errorMsg;
      }
      alert(errorMsg);
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
      await marketsAPI.abandonUnit(entryId, unitType);
      const [corpData, financesData] = await Promise.all([
        corporationAPI.getById(corporation.id),
        marketsAPI.getCorporationFinances(corporation.id).catch(() => null),
      ]);
      setCorporation(corpData);
      if (financesData) {
        setCorpFinances(financesData.finances);
        setBalanceSheet(financesData.balance_sheet || null);
        setMarketEntries(financesData.market_entries || []);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to abandon unit'));
    } finally {
      setAbandoningUnit(null);
    }
  };

  const handleBuildUnit = async (entryId: number, unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    if (!corporation) return;

    setBuilding(`${entryId}-${unitType}`);
    try {
      await marketsAPI.buildUnit(entryId, unitType);
      const [corpData, financesData] = await Promise.all([
        corporationAPI.getById(corporation.id),
        marketsAPI.getCorporationFinances(corporation.id).catch(() => null),
      ]);
      setCorporation(corpData);
      if (financesData) {
        setCorpFinances(financesData.finances);
        setBalanceSheet(financesData.balance_sheet || null);
        setMarketEntries(financesData.market_entries || []);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to build unit'));
    } finally {
      setBuilding(null);
    }
  };

  const isCeo = viewerUserId === corporation.ceo_id;
  const totalHeldByPlayers = corporation.shareholders?.reduce((sum, sh) => sum + sh.shares, 0) || 0;
  const actualTotalShares = totalHeldByPlayers + corporation.public_shares;
  const effectiveTotalShares = actualTotalShares > 0 ? actualTotalShares : corporation.shares;
  const hasShareMismatch = Math.abs(corporation.shares - actualTotalShares) > 1 && actualTotalShares > 0;

  const sectorBreakdown = calculateRevenueCostBreakdown();

  return (
    <AppNavigation>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-corporate-blue to-blue-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {corporation.name}
                  <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {corporation.type || '—'}
                  </span>
                </h1>
                <div className="flex items-center text-gray-500 dark:text-gray-400 mt-1 space-x-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    CEO: {corporation.ceo?.player_name || corporation.ceo?.username || 'Vacant'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Founded: {formatDate(corporation.created_at)}
                  </div>
                  {isCeo && (
                    <div className="flex items-center text-amber-600 dark:text-amber-400">
                      <Shield className="w-4 h-4 mr-1" />
                      You are CEO
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex items-center space-x-3">
              {isCeo && (
                <Button 
                  onPress={handleDelete}
                  isDisabled={deleting}
                  color="danger"
                  variant="flat"
                  className="font-medium"
                  startContent={<Trash2 className="w-4 h-4" />}
                >
                  {deleting ? 'Dissolving...' : 'Dissolve Corp'}
                </Button>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Share Price</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                {formatCurrency(corporation.share_price)}
                {stockValuation?.calculatedPrice && Math.abs(stockValuation.calculatedPrice - corporation.share_price) > 0.01 && (
                   <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${stockValuation.calculatedPrice > corporation.share_price ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                     Est: {formatCurrency(stockValuation.calculatedPrice)}
                   </span>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Market Cap</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(corporation.share_price * effectiveTotalShares)}
              </div>
              {hasShareMismatch && (
                 <div className="text-xs text-amber-500 mt-1 flex items-center">
                   <Info className="w-3 h-3 mr-1" />
                   Mismatch: {Math.abs(corporation.shares - actualTotalShares).toLocaleString()} shares
                 </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cash on Hand</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCash(corporation.cash)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Net Income (4 days)</div>
              <div className={`text-2xl font-bold ${statements.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {statements.netIncome >= 0 ? '+' : ''}{formatCash(statements.netIncome)}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Tabs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Navigation */}
              <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-1">
                <div className="flex space-x-1">
                  {(['overview', 'sectors', 'finance', 'board'] as const).map((tab) => (
                    <Button
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      variant={activeTab === tab ? "solid" : "light"}
                      color={activeTab === tab ? "primary" : "default"}
                      className={`flex-1 ${activeTab !== tab ? "text-gray-500 dark:text-gray-400" : "text-white"}`}
                      size="sm"
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-corporate-blue" />
                          Stock Performance
                        </h3>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Real-time
                        </div>
                      </div>
                      <div className="p-4">
                        <StockPriceChart corporationId={corporation.id} currentPrice={corporation.share_price} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Trading Panel */}
                       <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                         <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                           <DollarSign className="w-5 h-5 mr-2 text-corporate-blue" />
                           Trade Shares
                         </h3>
                         
                         <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                           <div className="flex justify-between text-sm mb-1">
                             <span className="text-gray-600 dark:text-gray-400">Your Position:</span>
                             <span className="font-medium text-gray-900 dark:text-white">{userOwnedShares.toLocaleString()} shares</span>
                           </div>
                           <div className="flex justify-between text-sm">
                             <span className="text-gray-600 dark:text-gray-400">Public Float:</span>
                             <span className="font-medium text-gray-900 dark:text-white">{corporation.public_shares.toLocaleString()} shares</span>
                           </div>
                         </div>

                         <div className="space-y-4">
                           <div>
                            <div className="flex gap-2 items-end">
                              <Input
                                label="Buy Shares"
                                type="number"
                                value={buyShares}
                                onChange={(e) => setBuyShares(e.target.value)}
                                placeholder="Amount"
                                labelPlacement="outside"
                                className="flex-1"
                                classNames={{
                                  input: "bg-transparent",
                                  inputWrapper: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-corporate-blue focus-within:!border-corporate-blue shadow-none"
                                }}
                              />
                              <Button
                                onPress={handleBuyShares}
                                isDisabled={trading || !buyShares}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium"
                              >
                                Buy
                              </Button>
                            </div>
                          </div>

                          <div>
                            <div className="flex gap-2 items-end">
                              <Input
                                label="Sell Shares"
                                type="number"
                                value={sellShares}
                                onChange={(e) => setSellShares(e.target.value)}
                                placeholder="Amount"
                                labelPlacement="outside"
                                className="flex-1"
                                classNames={{
                                  input: "bg-transparent",
                                  inputWrapper: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-corporate-blue focus-within:!border-corporate-blue shadow-none"
                                }}
                              />
                              <Button
                                onPress={handleSellShares}
                                isDisabled={trading || !sellShares || userOwnedShares === 0}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium"
                              >
                                Sell
                              </Button>
                            </div>
                          </div>
                         </div>
                       </div>

                       {/* Share Issuance Panel (CEO Only) */}
                       {isCeo && (
                         <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                           <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                             <Briefcase className="w-5 h-5 mr-2 text-corporate-blue" />
                             Capital Management
                           </h3>
                           
                           <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                             <div className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                               Issuing shares dilutes existing shareholders but raises capital for the corporation.
                             </div>
                             <div className="flex justify-between text-sm">
                               <span className="text-gray-600 dark:text-gray-400">Total Shares:</span>
                               <span className="font-medium text-gray-900 dark:text-white">{effectiveTotalShares.toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between text-sm mt-1">
                               <span className="text-gray-600 dark:text-gray-400">Max Issuance (10%):</span>
                               <span className="font-medium text-gray-900 dark:text-white">{Math.floor(corporation.shares * 0.1).toLocaleString()}</span>
                             </div>
                           </div>

                           <div>
                            <div className="flex gap-2 items-end">
                              <Input
                                label="Issue New Shares"
                                type="number"
                                value={issueShares}
                                onChange={(e) => setIssueShares(e.target.value)}
                                placeholder="Amount"
                                labelPlacement="outside"
                                className="flex-1"
                                classNames={{
                                   input: "bg-transparent",
                                   inputWrapper: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-corporate-blue focus-within:!border-corporate-blue shadow-none"
                                 }}
                               />
                               <Button
                                 onPress={handleIssueShares}
                                 isDisabled={trading || !issueShares}
                                 color="primary"
                                 className="text-white font-medium"
                               >
                                 Issue
                               </Button>
                             </div>
                           </div>
                         </div>
                       )}
                    </div>
                  </>
                )}

                {/* Sectors Tab */}
                {activeTab === 'sectors' && (
                  <div className="grid grid-cols-1 gap-6">
                    {marketEntries.length === 0 ? (
                      <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Active Sectors</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">
                          This corporation hasn&apos;t expanded into any markets yet.
                        </p>
                      </div>
                    ) : (
                      marketEntries.map((entry) => (
                        <SectorCard
                          key={entry.id}
                          sectorType={entry.sector_type}
                          stateCode={entry.state_code}
                          stateName={entry.state_name || entry.state_code}
                          stateMultiplier={entry.state_multiplier || 1}
                          enteredDate={entry.created_at}
                          units={{
                            retail: entry.retail_count,
                            production: entry.production_count,
                            service: entry.service_count,
                            extraction: entry.extraction_count,
                          }}
                          corporation={{ id: corporation.id, name: corporation.name, logo: corporation.logo }}
                          canExtract={sectorCanExtract(entry.sector_type)}
                          extractableResources={SECTORS_CAN_EXTRACT[entry.sector_type] || null}
                          requiredResource={SECTOR_RESOURCES[entry.sector_type] || null}
                          producedProduct={SECTOR_PRODUCTS[entry.sector_type] || null}
                          productDemands={SECTOR_PRODUCT_DEMANDS[entry.sector_type] || null}
                          revenue={sectorBreakdown[entry.sector_type]?.revenue || 0}
                          profit={(sectorBreakdown[entry.sector_type]?.revenue || 0) - (sectorBreakdown[entry.sector_type]?.cost || 0)}
                          showActions={isCeo}
                          onAbandonUnit={
                            isCeo
                              ? (unitType) => {
                                  void handleAbandonUnit(entry.id, unitType, entry.sector_type);
                                }
                              : undefined
                          }
                          onBuildUnit={
                            isCeo
                              ? (unitType) => {
                                  void handleBuildUnit(entry.id, unitType);
                                }
                              : undefined
                          }
                          abandoningUnit={abandoningUnit}
                          building={building}
                          canBuild={isCeo}
                          buildCost={10000}
                          formatCurrency={formatCurrency}
                          calculateUnitProfit={(unitType) => {
                            const multiplier = entry.state_multiplier || 1;
                            if (unitType === 'production') {
                              const econ = getProductionUnitEconomics(entry.sector_type);
                              return (econ.unitRevenuePerHour - econ.unitCostPerHour) * DISPLAY_PERIOD_HOURS * multiplier;
                            }
                            if (unitType === 'retail' || unitType === 'service') {
                              const econ = getRetailServiceUnitEconomics(entry.sector_type, unitType);
                              return (econ.unitRevenuePerHour - econ.unitCostPerHour) * DISPLAY_PERIOD_HOURS * multiplier;
                            }
                            const extractables = SECTORS_CAN_EXTRACT[entry.sector_type];
                            const resource = extractables && extractables.length > 0 ? extractables[0] : null;
                            const unitRevenuePerHour = resource ? (commodityPrices[resource]?.currentPrice || 0) * EXTRACTION_OUTPUT_RATE : UNIT_ECONOMICS.extraction.baseRevenue;
                            const unitCostPerHour = UNIT_ECONOMICS.extraction.baseCost;
                            return (unitRevenuePerHour - unitCostPerHour) * DISPLAY_PERIOD_HOURS * multiplier;
                          }}
                          UNIT_ECONOMICS={UNIT_ECONOMICS}
                          SECTORS_CAN_EXTRACT={SECTORS_CAN_EXTRACT}
                          commodityPrices={commodityPrices}
                          productPrices={productPrices}
                          EXTRACTION_OUTPUT_RATE={EXTRACTION_OUTPUT_RATE}
                          unitFlows={initialMarketMetadata?.sector_unit_flows?.[entry.sector_type] as Record<'retail' | 'production' | 'service' | 'extraction', MarketUnitFlow> | undefined}
                          productReferenceValues={productReferenceValues}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Finance Tab */}
                {activeTab === 'finance' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-corporate-blue" />
                          Income Statement (Pro Forma - 96h)
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3 max-w-lg mx-auto">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCash(statements.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400">Variable Costs</span>
                            <span className="font-medium text-red-600 dark:text-red-400">-{formatCash(statements.variableCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400">Fixed Costs (CEO Salary)</span>
                            <span className="font-medium text-red-600 dark:text-red-400">-{formatCash(statements.fixedCosts)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-2 rounded">
                            <span className="font-medium text-gray-900 dark:text-white">Operating Income</span>
                            <span className={`font-bold ${statements.operatingIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCash(statements.operatingIncome)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400">Dividends ({corporation.dividend_percentage}%)</span>
                            <span className="font-medium text-gray-900 dark:text-white">-{formatCash(statements.dividends)}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 dark:border-gray-700 mt-2">
                            <span className="font-bold text-lg text-gray-900 dark:text-white">Net Income</span>
                            <span className={`font-bold text-lg ${statements.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCash(statements.netIncome)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {balanceSheet && (
                      <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <Layers className="w-5 h-5 mr-2 text-corporate-blue" />
                            Balance Sheet
                          </h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Assets</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Cash</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCash(balanceSheet.cash)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Business Units</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCash(balanceSheet.businessUnitAssets)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-t-2 border-gray-200 dark:border-gray-700 mt-2">
                                <span className="font-bold text-gray-900 dark:text-white">Total Assets</span>
                                <span className="font-bold text-gray-900 dark:text-white">{formatCash(balanceSheet.totalAssets)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Liabilities & Equity</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Total Liabilities</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCash(balanceSheet.totalLiabilities)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Shareholder Equity</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCash(balanceSheet.shareholdersEquity)}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-t-2 border-gray-200 dark:border-gray-700 mt-2">
                                <span className="font-bold text-gray-900 dark:text-white">Total L & E</span>
                                <span className="font-bold text-gray-900 dark:text-white">{formatCash(balanceSheet.totalLiabilities + balanceSheet.shareholdersEquity)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Board Tab */}
                {activeTab === 'board' && (
                  <BoardTab 
                    corporationId={corporation.id}
                    corporationName={corporation.name}
                    viewerUserId={viewerUserId}
                  />
                )}
              </div>
            </div>

            {/* Right Column - Shareholders & Info */}
            <div className="space-y-6">
              {/* Shareholders */}
              <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-corporate-blue" />
                    Shareholders
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {corporation.shareholders && corporation.shareholders.length > 0 ? (
                    corporation.shareholders
                      .sort((a, b) => b.shares - a.shares)
                      .map((sh) => (
                        (() => {
                          const displayName = sh.user?.player_name || sh.user?.username || `User #${sh.user_id}`;
                          const initials = displayName.substring(0, 2).toUpperCase();
                          return (
                        <div key={sh.user_id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mr-3 text-xs font-bold text-gray-600 dark:text-gray-300">
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {displayName}
                                {sh.user_id === corporation.ceo_id && (
                                  <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">CEO</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {((sh.shares / effectiveTotalShares) * 100).toFixed(1)}% ownership
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {sh.shares.toLocaleString()}
                          </div>
                        </div>
                          );
                        })()
                      ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No shareholders found
                    </div>
                  )}
                  
                  {/* Public Shares */}
                  <div className="p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/30">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Public Float</div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {corporation.public_shares.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Info className="w-5 h-5 mr-2 text-corporate-blue" />
                    Company Details
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      About
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {corporation.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Dividend Policy
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {corporation.dividend_percentage}% of profits
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        CEO Salary
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCash(corporation.ceo_salary)} / 4 days
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
