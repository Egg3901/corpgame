'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI, sharesAPI, marketsAPI, CorporationFinances, MarketEntryWithUnits, BalanceSheet, CommodityPrice, ProductMarketData, corporateActionsAPI, CorporateAction } from '@/lib/api';
import { formatCash } from '@/lib/utils';
import { Building2, Edit, Trash2, TrendingUp, DollarSign, Users, User, Calendar, ArrowUp, ArrowDown, TrendingDown, Plus, BarChart3, MapPin, Store, Factory, Briefcase, Layers, Droplets, Package, Cpu, Zap, Wheat, Trees, FlaskConical, Box, Lightbulb, Pill, Wrench, Truck, Shield, UtensilsCrossed, Info, ArrowRight, Pickaxe, HelpCircle } from 'lucide-react';
import BoardTab from '@/components/BoardTab';
import StockPriceChart from '@/components/StockPriceChart';
import SectorCard from '@/components/SectorCard';

// Sector to Resource mapping (must match backend)
const SECTOR_RESOURCES: Record<string, string | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Manufacturing': 'Steel',
  'Energy': 'Oil',
  'Retail': null,
  'Real Estate': null,
  'Transportation': 'Steel',
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': 'Steel',
  'Hospitality': null,
  'Construction': 'Lumber',
  'Pharmaceuticals': 'Chemical Compounds',
};

// Sector to Product output mapping (what production units create)
const SECTOR_PRODUCTS: Record<string, string | null> = {
  'Technology': 'Technology Products',
  'Finance': null,
  'Healthcare': null,
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
};

// Sector product demands (what products sectors need to operate)
const SECTOR_PRODUCT_DEMANDS: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Manufacturing': null,
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': null,
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': null,
  'Defense': null,
  'Hospitality': ['Food Products'],
  'Construction': null,
  'Pharmaceuticals': null,
};

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-4 h-4" />,
  'Steel': <Package className="w-4 h-4" />,
  'Rare Earth': <Cpu className="w-4 h-4" />,
  'Copper': <Zap className="w-4 h-4" />,
  'Fertile Land': <Wheat className="w-4 h-4" />,
  'Lumber': <Trees className="w-4 h-4" />,
  'Chemical Compounds': <FlaskConical className="w-4 h-4" />,
};

// Resource color classes
const RESOURCE_COLORS: Record<string, string> = {
  'Oil': 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  'Steel': 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800',
  'Rare Earth': 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800',
  'Copper': 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800',
  'Fertile Land': 'text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-800',
  'Lumber': 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800',
  'Chemical Compounds': 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-800',
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
};

// Unit economics for revenue calculation (must match backend)
const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
  extraction: { baseRevenue: 1000, baseCost: 700 },
};
const DISPLAY_PERIOD_HOURS = 96;

// Sectors that can build extraction units (must match backend SECTOR_EXTRACTION)
const SECTORS_CAN_EXTRACT: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': null,
  'Healthcare': null,
  'Manufacturing': ['Steel'],
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
  'Mining': ['Steel', 'Copper', 'Rare Earth'],
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
};

// Production unit constants (must match backend)
const PRODUCTION_LABOR_COST = 400; // per hour
const PRODUCTION_RESOURCE_CONSUMPTION = 0.5; // units per hour
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
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'finance' | 'board' | 'actions'>('overview');
  const [abandoning, setAbandoning] = useState<number | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [corpFinances, setCorpFinances] = useState<CorporationFinances | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [marketEntries, setMarketEntries] = useState<MarketEntryWithUnits[]>([]);
  const [commodityPrices, setCommodityPrices] = useState<Record<string, CommodityPrice>>({});
  const [productPrices, setProductPrices] = useState<Record<string, ProductMarketData>>({});
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
  const [corporateActions, setCorporateActions] = useState<CorporateAction[]>([]);
  const [activatingAction, setActivatingAction] = useState<'supply_rush' | 'marketing_campaign' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corpData, userData, financesData, commoditiesData, valuationData] = await Promise.all([
          corporationAPI.getById(corpId),
          authAPI.getMe().catch(() => null),
          marketsAPI.getCorporationFinances(corpId).catch(() => null),
          marketsAPI.getCommodities().catch(() => null),
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

  // Fetch corporate actions separately
  useEffect(() => {
    const fetchCorporateActions = async () => {
      try {
        const actions = await corporateActionsAPI.getActiveActions(corpId);
        setCorporateActions(actions);
      } catch (err) {
        console.error('Failed to fetch corporate actions:', err);
      }
    };

    if (!isNaN(corpId)) {
      fetchCorporateActions();
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
        const unitRev = UNIT_ECONOMICS.retail.baseRevenue * DISPLAY_PERIOD_HOURS;
        const unitCost = UNIT_ECONOMICS.retail.baseCost * DISPLAY_PERIOD_HOURS;
        breakdown.unitBreakdown.retail.revenue += unitRev * entry.retail_count;
        breakdown.unitBreakdown.retail.cost += unitCost * entry.retail_count;
        breakdown.unitBreakdown.retail.units += entry.retail_count;
      }

      // Production units - use dynamic pricing if available
      if (entry.production_count > 0) {
        const requiredResource = SECTOR_RESOURCES[sector];
        const producedProduct = SECTOR_PRODUCTS[sector];
        
        let unitRev = 0;
        let unitCost = PRODUCTION_LABOR_COST * DISPLAY_PERIOD_HOURS; // Base labor cost
        
        // Resource cost
        if (requiredResource && commodityPrices[requiredResource]) {
          unitCost += PRODUCTION_RESOURCE_CONSUMPTION * commodityPrices[requiredResource].currentPrice * DISPLAY_PERIOD_HOURS;
        }
        
        // Product revenue
        if (producedProduct) {
          const basePrice = PRODUCT_BASE_PRICES[producedProduct] || 0;
          unitRev = basePrice * PRODUCTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
        } else {
          // Fallback to base revenue if no product
          unitRev = UNIT_ECONOMICS.production.baseRevenue * DISPLAY_PERIOD_HOURS;
          unitCost = UNIT_ECONOMICS.production.baseCost * DISPLAY_PERIOD_HOURS;
        }
        
        breakdown.unitBreakdown.production.revenue += unitRev * entry.production_count;
        breakdown.unitBreakdown.production.cost += unitCost * entry.production_count;
        breakdown.unitBreakdown.production.units += entry.production_count;
      }

      // Service units
      if (entry.service_count > 0) {
        const unitRev = UNIT_ECONOMICS.service.baseRevenue * DISPLAY_PERIOD_HOURS;
        const unitCost = UNIT_ECONOMICS.service.baseCost * DISPLAY_PERIOD_HOURS;
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

  const handleAbandonSector = async (entryId: number, sectorType: string, stateName: string, totalUnits: number) => {
    if (!corporation) return;
    
    if (!confirm(`Are you sure you want to abandon the ${sectorType} sector in ${stateName}? This will delete all ${totalUnits} business units in this sector. This action cannot be undone.`)) {
      return;
    }

    setAbandoning(entryId);
    try {
      const result = await marketsAPI.abandonSector(entryId);
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
      alert(`Successfully abandoned ${sectorType} sector in ${stateName}. ${result.units_removed} units removed.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to abandon sector');
    } finally {
      setAbandoning(null);
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

  const handleActivateSupplyRush = async () => {
    if (!corporation) return;
    
    const actionCost = 500000 + (corporation.shares * corporation.share_price * 0.01);
    if (!confirm('Activate Supply Rush? This will cost ' + formatCash(actionCost) + ' and boost all production and extraction output by 10% for 4 hours.')) {
      return;
    }

    setActivatingAction('supply_rush');
    try {
      const action = await corporateActionsAPI.activateSupplyRush(corporation.id);
      setCorporateActions([...corporateActions, action]);
      // Refresh corporation data to show updated capital
      const updatedCorp = await corporationAPI.getById(corpId);
      setCorporation(updatedCorp);
      alert('Supply Rush activated! All production and extraction output will be boosted by 10% for 4 hours.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to activate Supply Rush');
    } finally {
      setActivatingAction(null);
    }
  };

  const handleActivateMarketingCampaign = async () => {
    if (!corporation) return;
    
    const actionCost = 500000 + (corporation.shares * corporation.share_price * 0.01);
    if (!confirm('Activate Marketing Campaign? This will cost ' + formatCash(actionCost) + ' and boost all production and extraction output by 10% for 4 hours.')) {
      return;
    }

    setActivatingAction('marketing_campaign');
    try {
      const action = await corporateActionsAPI.activateMarketingCampaign(corporation.id);
      setCorporateActions([...corporateActions, action]);
      // Refresh corporation data to show updated capital
      const updatedCorp = await corporationAPI.getById(corpId);
      setCorporation(updatedCorp);
      alert('Marketing Campaign activated! All production and extraction output will be boosted by 10% for 4 hours.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to activate Marketing Campaign');
    } finally {
      setActivatingAction(null);
    }
  };

  const getRemainingTime = (expiresAt: string): string => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
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

  // Calculate action cost (corporation is guaranteed to exist here)
  const actionCostValue = 500000 + (corporation.shares * corporation.share_price * 0.01);

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
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'actions'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Actions
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
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                              stateRevenue += UNIT_ECONOMICS.retail.baseRevenue * entry.retail_count * DISPLAY_PERIOD_HOURS;
                              stateCost += UNIT_ECONOMICS.retail.baseCost * entry.retail_count * DISPLAY_PERIOD_HOURS;
                            }
                            
                            // Production units - use dynamic pricing
                            if (entry.production_count > 0) {
                              const requiredResource = SECTOR_RESOURCES[entry.sector_type];
                              const producedProduct = SECTOR_PRODUCTS[entry.sector_type];
                              
                              let unitRev = 0;
                              let unitCost = PRODUCTION_LABOR_COST * DISPLAY_PERIOD_HOURS;
                              
                              // Resource cost
                              if (requiredResource && commodityPrices[requiredResource]) {
                                unitCost += PRODUCTION_RESOURCE_CONSUMPTION * commodityPrices[requiredResource].currentPrice * DISPLAY_PERIOD_HOURS;
                              }
                              
                              // Product revenue
                              if (producedProduct) {
                                const basePrice = PRODUCT_BASE_PRICES[producedProduct] || 0;
                                unitRev = basePrice * PRODUCTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
                              } else {
                                unitRev = UNIT_ECONOMICS.production.baseRevenue * DISPLAY_PERIOD_HOURS;
                                unitCost = UNIT_ECONOMICS.production.baseCost * DISPLAY_PERIOD_HOURS;
                              }
                              
                              stateRevenue += unitRev * entry.production_count;
                              stateCost += unitCost * entry.production_count;
                            }
                            
                            // Service units
                            if (entry.service_count > 0) {
                              stateRevenue += UNIT_ECONOMICS.service.baseRevenue * entry.service_count * DISPLAY_PERIOD_HOURS;
                              stateCost += UNIT_ECONOMICS.service.baseCost * entry.service_count * DISPLAY_PERIOD_HOURS;
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
                            <div key={stateCode} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                                  
                                  // Retail units
                                  if (entry.retail_count > 0) {
                                    entryRevenue += UNIT_ECONOMICS.retail.baseRevenue * entry.retail_count * DISPLAY_PERIOD_HOURS;
                                    entryCost += UNIT_ECONOMICS.retail.baseCost * entry.retail_count * DISPLAY_PERIOD_HOURS;
                                  }
                                  
                                  // Production units - use dynamic pricing
                                  if (entry.production_count > 0) {
                                    let unitRev = 0;
                                    let unitCost = PRODUCTION_LABOR_COST * DISPLAY_PERIOD_HOURS;
                                    
                                    // Resource cost
                                    if (requiredResource && commodityPrices[requiredResource]) {
                                      unitCost += PRODUCTION_RESOURCE_CONSUMPTION * commodityPrices[requiredResource].currentPrice * DISPLAY_PERIOD_HOURS;
                                    }
                                    
                                    // Product revenue
                                    const producedProduct = SECTOR_PRODUCTS[entry.sector_type];
                                    if (producedProduct) {
                                      const basePrice = PRODUCT_BASE_PRICES[producedProduct] || 0;
                                      unitRev = basePrice * PRODUCTION_OUTPUT_RATE * DISPLAY_PERIOD_HOURS;
                                    } else {
                                      unitRev = UNIT_ECONOMICS.production.baseRevenue * DISPLAY_PERIOD_HOURS;
                                      unitCost = UNIT_ECONOMICS.production.baseCost * DISPLAY_PERIOD_HOURS;
                                    }
                                    
                                    entryRevenue += unitRev * entry.production_count;
                                    entryCost += unitCost * entry.production_count;
                                  }
                                  
                                  // Service units
                                  if (entry.service_count > 0) {
                                    entryRevenue += UNIT_ECONOMICS.service.baseRevenue * entry.service_count * DISPLAY_PERIOD_HOURS;
                                    entryCost += UNIT_ECONOMICS.service.baseCost * entry.service_count * DISPLAY_PERIOD_HOURS;
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
                                      revenue={entryRevenue}
                                      profit={entryProfit}
                                      showActions={corporation && viewerUserId === corporation.ceo_id}
                                      onAbandon={() => handleAbandonSector(entry.id, entry.sector_type, stateName, totalUnits)}
                                      onBuildUnit={(unitType) => handleBuildUnit(entry.id, unitType)}
                                      abandoning={abandoning === entry.id}
                                      building={building?.startsWith(`${entry.id}-`) ? building.split('-')[1] : null}
                                      canBuild={corporation && viewerUserId === corporation.ceo_id && (corporation.capital ?? 0) >= 10000}
                                      buildCost={10000}
                                      formatCurrency={formatCurrency}
                                      calculateUnitProfit={(unitType) => {
                                        if (unitType === 'retail') return (UNIT_ECONOMICS.retail.baseRevenue - UNIT_ECONOMICS.retail.baseCost) * DISPLAY_PERIOD_HOURS;
                                        if (unitType === 'production') return 0;
                                        if (unitType === 'service') return (UNIT_ECONOMICS.service.baseRevenue - UNIT_ECONOMICS.service.baseCost) * DISPLAY_PERIOD_HOURS;
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
                                      EXTRACTION_OUTPUT_RATE={EXTRACTION_OUTPUT_RATE}
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
                              const resource = SECTOR_RESOURCES[entry.sector_type];
                              if (resource && entry.production_count > 0) {
                                resourceDemand[resource] = (resourceDemand[resource] || 0) + entry.production_count;
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
                                <p className="text-2xl font-bold">{demand}</p>
                                <p className="text-xs opacity-75">units required</p>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                    <p className="font-medium">{resource} Demand</p>
                                    <p>{demand} production units need this resource</p>
                                    <p className="text-gray-400 mt-1">efficiency = min(1, available / {demand})</p>
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
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
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
                              const product = SECTOR_PRODUCTS[entry.sector_type];
                              if (product && entry.production_count > 0) {
                                productOutput[product] = (productOutput[product] || 0) + entry.production_count;
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
                                <p className="text-2xl font-bold">{output}</p>
                                <p className="text-xs opacity-75">units produced</p>
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
                              const demands = SECTOR_PRODUCT_DEMANDS[entry.sector_type];
                              if (demands && entry.production_count > 0) {
                                demands.forEach(product => {
                                  productDemand[product] = (productDemand[product] || 0) + entry.production_count;
                                });
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
                                <p className="text-2xl font-bold">{demand}</p>
                                <p className="text-xs opacity-75">units needed</p>
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

              {/* Balance Sheet Section */}
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-corporate-blue" />
                    Balance Sheet
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Asset values based on capitalized earnings (10x annual profit)</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assets</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Cash (Corporate Capital)</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {formatCash(balanceSheet?.cash ?? corporation.capital ?? 0)}
                          </span>
                        </div>
                        <div className="py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Business Unit Assets</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(balanceSheet?.businessUnitAssets || 0)}
                            </span>
                          </div>
                          {balanceSheet && balanceSheet.businessUnitAssets > 0 && (
                            <div className="ml-4 mt-2 space-y-1">
                              {balanceSheet.retailAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Store className="w-3 h-3" />
                                    Retail ({balanceSheet.totalRetailUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.retailAssetValue)}
                                  </span>
                                </div>
                              )}
                              {balanceSheet.productionAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Factory className="w-3 h-3" />
                                    Production ({balanceSheet.totalProductionUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.productionAssetValue)}
                                  </span>
                                </div>
                              )}
                              {balanceSheet.serviceAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    Service ({balanceSheet.totalServiceUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.serviceAssetValue)}
                                  </span>
                                </div>
                              )}
                              {balanceSheet.extractionAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Pickaxe className="w-3 h-3" />
                                    Extraction ({balanceSheet.totalExtractionUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.extractionAssetValue)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                          <span className="text-base font-bold text-gray-900 dark:text-white">Total Assets</span>
                          <span className="text-base font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                            {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
                      <div className="space-y-3">
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Liabilities</h4>
                          <div className="space-y-2 ml-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                {formatCurrency(balanceSheet?.totalLiabilities || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Shareholders&apos; Equity</h4>
                          <div className="space-y-2 ml-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Total Equity</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                {formatCurrency(balanceSheet?.shareholdersEquity || corporation.capital || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Book Value per Share</span>
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatCurrency(balanceSheet?.bookValuePerShare || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600 mt-4">
                          <span className="text-base font-bold text-gray-900 dark:text-white">Total Liabilities & Equity</span>
                          <span className="text-base font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                            {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Valuation Info */}
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
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(stockValuation.earnings_value)}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <p className="font-medium">Earnings-Based Valuation</p>
                                <p className="text-gray-300">Annual Profit: {formatCurrency(stockValuation.annual_profit)}</p>
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
                                <p className="text-gray-300">Annual Div/Share: {formatCurrency(stockValuation.annual_dividend_per_share)}</p>
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
                                <p className="text-gray-300">40% Book: {formatCurrency(stockValuation.book_value * 0.40)}</p>
                                <p className="text-gray-300">35% Earnings: {formatCurrency(stockValuation.earnings_value * 0.35)}</p>
                                <p className="text-gray-300">5% Cash: {formatCurrency(stockValuation.cash_per_share * 0.05)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <strong>Price Formula:</strong> {stockValuation ? 
                        '40% Book Value + 35% Earnings Value + 5% Cash + 20% Trade History' :
                        '40% Book Value + 35% Earnings (P/E) + 5% Cash + 20% Trade-Weighted Average'}
                      {' '}(min $0.01)
                    </p>
                  </div>
                </div>
              </div>

              {/* Income Statement Section */}
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-corporate-blue" />
                    Income Statement
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">96-hour projection based on market operations</p>
                  
                  <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 group relative">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue (96hr)</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(corpFinances?.display_revenue || 0)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-md">
                            <p className="font-medium mb-2 text-emerald-400">Revenue Breakdown (96hr)</p>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {(() => {
                                const breakdown = calculateRevenueCostBreakdown();
                                const sectors = Object.keys(breakdown).sort();
                                return sectors.map(sector => {
                                  const sectorData = breakdown[sector];
                                  if (sectorData.revenue === 0) return null;
                                  
                                  return (
                                    <div key={sector} className="border-t border-gray-700 pt-2 first:border-t-0 first:pt-0">
                                      <p className="font-semibold text-white mb-1">{sector}</p>
                                      <div className="ml-2 space-y-1 text-gray-300">
                                        {sectorData.unitBreakdown.retail.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Retail ({sectorData.unitBreakdown.retail.units} units):</span>
                                            <span className="font-mono text-emerald-300">{formatCurrency(sectorData.unitBreakdown.retail.revenue)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.production.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Production ({sectorData.unitBreakdown.production.units} units):</span>
                                            <span className="font-mono text-emerald-300">{formatCurrency(sectorData.unitBreakdown.production.revenue)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.service.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Service ({sectorData.unitBreakdown.service.units} units):</span>
                                            <span className="font-mono text-emerald-300">{formatCurrency(sectorData.unitBreakdown.service.revenue)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.extraction.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Extraction ({sectorData.unitBreakdown.extraction.units} units):</span>
                                            <span className="font-mono text-emerald-300">{formatCurrency(sectorData.unitBreakdown.extraction.revenue)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-semibold text-white pt-1 border-t border-gray-700">
                                          <span>Total:</span>
                                          <span className="font-mono text-emerald-300">{formatCurrency(sectorData.revenue)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold text-white">
                              <span>Grand Total:</span>
                              <span className="font-mono text-emerald-300">{formatCurrency(corpFinances?.display_revenue || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 group relative">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Operating Costs (96hr)</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 font-mono">
                          {formatCurrency(corpFinances?.display_costs || 0)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-md">
                            <p className="font-medium mb-2 text-red-400">Operating Costs Breakdown (96hr)</p>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {(() => {
                                const breakdown = calculateRevenueCostBreakdown();
                                const sectors = Object.keys(breakdown).sort();
                                return sectors.map(sector => {
                                  const sectorData = breakdown[sector];
                                  if (sectorData.cost === 0) return null;
                                  
                                  return (
                                    <div key={sector} className="border-t border-gray-700 pt-2 first:border-t-0 first:pt-0">
                                      <p className="font-semibold text-white mb-1">{sector}</p>
                                      <div className="ml-2 space-y-1 text-gray-300">
                                        {sectorData.unitBreakdown.retail.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Retail ({sectorData.unitBreakdown.retail.units} units):</span>
                                            <span className="font-mono text-red-300">{formatCurrency(sectorData.unitBreakdown.retail.cost)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.production.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Production ({sectorData.unitBreakdown.production.units} units):</span>
                                            <span className="font-mono text-red-300">{formatCurrency(sectorData.unitBreakdown.production.cost)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.service.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Service ({sectorData.unitBreakdown.service.units} units):</span>
                                            <span className="font-mono text-red-300">{formatCurrency(sectorData.unitBreakdown.service.cost)}</span>
                                          </div>
                                        )}
                                        {sectorData.unitBreakdown.extraction.units > 0 && (
                                          <div className="flex justify-between">
                                            <span>Extraction ({sectorData.unitBreakdown.extraction.units} units):</span>
                                            <span className="font-mono text-red-300">{formatCurrency(sectorData.unitBreakdown.extraction.cost)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-semibold text-white pt-1 border-t border-gray-700">
                                          <span>Total:</span>
                                          <span className="font-mono text-red-300">{formatCurrency(sectorData.cost)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold text-white">
                              <span>Grand Total:</span>
                              <span className="font-mono text-red-300">{formatCurrency(corpFinances?.display_costs || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">CEO Salary (96hr)</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500" title={`$${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr`}>
                            (${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr)
                          </span>
                        </div>
                        <span className={`text-sm font-semibold font-mono ${(corporation.ceo_salary || 100000) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatCurrency(corporation.ceo_salary ?? 100000)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Net Income (96hr)</span>
                        <span className={`text-lg font-bold font-mono ${(corpFinances?.display_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(corpFinances?.display_profit || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dividends Section */}
                  <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dividends</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Dividend Rate</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(corporation.dividend_percentage || 0).toFixed(2)}% of profit
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Dividend per Share (96hr)</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({((corpFinances?.dividend_per_share_96h || 0) * 4).toLocaleString(undefined, { maximumFractionDigits: 4 })}/share annualized)
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(corpFinances?.dividend_per_share_96h || 0)}
                        </span>
                      </div>
                      {corpFinances?.special_dividend_last_amount && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Last Special Dividend</span>
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                              {formatCurrency(corpFinances.special_dividend_last_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Per Share</span>
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                              {formatCurrency(corpFinances.special_dividend_per_share_last || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Time Since Last</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {corpFinances.special_dividend_last_paid_at ? (() => {
                                const lastPaid = new Date(corpFinances.special_dividend_last_paid_at);
                                const now = new Date();
                                const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                                const daysSince = Math.floor(hoursSince / 24);
                                const hoursRemaining = Math.ceil(96 - (hoursSince % 96));
                                if (hoursSince < 96) {
                                  return `${hoursRemaining}h until next available`;
                                }
                                return `${daysSince}d ${Math.floor((hoursSince % 24))}h ago`;
                              })() : 'Never'}
                            </span>
                          </div>
                        </>
                      )}
                      {!corpFinances?.special_dividend_last_amount && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                          No special dividend has been paid yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unit Breakdown */}
                  {corpFinances && corpFinances.markets_count > 0 && (
                    <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Units</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                          <Store className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_retail_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Retail</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                          <Factory className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_production_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Production</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <Briefcase className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_service_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Service</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                        Operating in {corpFinances.markets_count} market{corpFinances.markets_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Market Entries List */}
                  {marketEntries.length > 0 && (
                    <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Market Presence</h3>
                      <div className="space-y-3">
                        {marketEntries.map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/states/${entry.state_code}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{entry.state_name || entry.state_code}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.sector_type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {entry.retail_count + entry.production_count + entry.service_count} units
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.state_multiplier?.toFixed(1)}x multiplier
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!corpFinances || corpFinances.markets_count === 0) && (
                    <div className="mt-6 rounded-xl border border-dashed border-corporate-blue/30 bg-corporate-blue/5 dark:bg-corporate-blue/10 p-6 text-center">
                      <MapPin className="h-8 w-8 text-corporate-blue/50 mx-auto mb-2" />
                      <p className="text-sm text-corporate-blue dark:text-corporate-blue-light">
                        No market operations yet
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enter markets via the States page to generate revenue
                      </p>
                      <Link
                        href="/states"
                        className="inline-block mt-3 px-4 py-2 bg-corporate-blue text-white text-sm rounded-lg hover:bg-corporate-blue-dark transition-colors"
                      >
                        View States
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'board' && (
              <BoardTab
                corporationId={corpId}
                corporationName={corporation.name}
                viewerUserId={viewerUserId}
              />
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                  <div className="relative p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Corporate Actions</h2>
                    
                    {!isCeo && (
                      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Only the CEO can activate corporate actions.
                        </p>
                      </div>
                    )}

                    {/* Active Actions */}
                    {corporateActions.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Actions</h3>
                        <div className="space-y-3">
                          {corporateActions.map(action => (
                            <div key={action.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white">
                                    {action.action_type === 'supply_rush' ? 'Supply Rush' : 'Marketing Campaign'}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    +10% production and extraction output
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                    Active
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {getRemainingTime(action.expires_at)} remaining
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Actions */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Supply Rush */}
                      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Supply Rush</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Accelerate all production and extraction operations by 10% for 4 hours.
                        </p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCash(actionCostValue)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                            <span className="font-bold text-gray-900 dark:text-white">4 hours</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Boost:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">+10%</span>
                          </div>
                        </div>
                        <button
                          onClick={handleActivateSupplyRush}
                          disabled={
                            !isCeo || 
                            activatingAction !== null || 
                            corporateActions.some(a => a.action_type === 'supply_rush')
                          }
                          className="w-full px-4 py-3 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                          {corporateActions.some(a => a.action_type === 'supply_rush') 
                            ? 'Already Active' 
                            : activatingAction === 'supply_rush' 
                              ? 'Activating...' 
                              : 'Activate Supply Rush'}
                        </button>
                      </div>

                      {/* Marketing Campaign */}
                      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Marketing Campaign</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Launch a marketing campaign to boost all production and extraction by 10% for 4 hours.
                        </p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatCash(actionCostValue)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                            <span className="font-bold text-gray-900 dark:text-white">4 hours</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Boost:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">+10%</span>
                          </div>
                        </div>
                        <button
                          onClick={handleActivateMarketingCampaign}
                          disabled={
                            !isCeo || 
                            activatingAction !== null || 
                            corporateActions.some(a => a.action_type === 'marketing_campaign')
                          }
                          className="w-full px-4 py-3 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                          {corporateActions.some(a => a.action_type === 'marketing_campaign') 
                            ? 'Already Active' 
                            : activatingAction === 'marketing_campaign' 
                              ? 'Activating...' 
                              : 'Activate Marketing Campaign'}
                        </button>
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Cost Calculation</h4>
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center justify-between">
                          <span>Base Cost:</span>
                          <span className="font-mono">{formatCash(500000)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>1% of Market Cap ({formatCash(marketCap)}):</span>
                          <span className="font-mono">{formatCash(marketCap * 0.01)}</span>
                        </div>
                        <div className="border-t border-gray-300 dark:border-gray-600 mt-2 pt-2 flex items-center justify-between font-bold text-gray-900 dark:text-white">
                          <span>Total Cost:</span>
                          <span className="font-mono">{formatCash(actionCostValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Only show on overview, sectors, and finance tabs */}
          {activeTab !== 'board' && activeTab !== 'actions' && (
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
