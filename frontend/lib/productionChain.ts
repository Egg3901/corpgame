/**
 * Production Chain Visualization Utility
 *
 * Provides data structures and functions to generate production chain diagrams
 * for products and resources. Used by ProductionChainDiagram component.
 *
 * FID-20251225-008
 */

import { Node, Edge, MarkerType } from 'reactflow';

// ============================================================================
// CONSTANTS (Mirrored from backend for client-side computation)
// ============================================================================

export const SECTORS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Light Industry',     // Production-only sector that makes Manufactured Goods
  'Energy',
  'Retail',
  'Real Estate',
  'Transportation',
  'Media',
  'Telecommunications',
  'Agriculture',
  'Defense',
  'Hospitality',
  'Construction',       // Production-only sector that makes Construction Capacity from Lumber
  'Pharmaceuticals',
  'Mining',
  'Heavy Industry',     // Production-only sector that converts Iron Ore + Coal → Steel
  'Forestry',           // Extraction-only sector that harvests Lumber
] as const;

export type Sector = typeof SECTORS[number];

export const PRODUCTS = [
  'Technology Products',
  'Manufactured Goods',
  'Electricity',
  'Food Products',
  'Construction Capacity',
  'Pharmaceutical Products',
  'Defense Equipment',
  'Logistics Capacity',
  'Steel',              // Produced by Heavy Industry from Iron Ore + Coal
] as const;

export type Product = typeof PRODUCTS[number];

export const RESOURCES = [
  'Oil',
  'Iron Ore',
  'Rare Earth',
  'Copper',
  'Fertile Land',
  'Lumber',
  'Chemical Compounds',
  'Coal',
] as const;

export type Resource = typeof RESOURCES[number];

export type UnitType = 'production' | 'retail' | 'service' | 'extraction';

// What each sector produces (null = doesn't produce products)
const SECTOR_PRODUCTS: Record<Sector, Product | null> = {
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
  'Forestry': null,
};

// What resource each sector's production units consume
const SECTOR_RESOURCES: Record<Sector, Resource | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Light Industry': null,             // Consumes Steel PRODUCT
  'Energy': null,                     // Special case: consumes Oil + Coal
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,             // Consumes Steel PRODUCT
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': null,                    // Consumes Steel PRODUCT
  'Hospitality': null,
  'Construction': 'Lumber',           // Consumes Lumber resource + Steel product
  'Pharmaceuticals': 'Chemical Compounds',
  'Mining': null,
  'Heavy Industry': null,             // Special case: consumes Iron Ore + Coal
  'Forestry': null,                   // Extraction-only sector
};

// What resources each sector can extract
const SECTOR_EXTRACTION: Record<Sector, Resource[] | null> = {
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
  'Agriculture': ['Fertile Land'],
  'Defense': null,
  'Hospitality': null,
  'Construction': null,               // Production-only (consumes Lumber)
  'Pharmaceuticals': ['Chemical Compounds'],
  'Mining': ['Iron Ore', 'Coal', 'Copper', 'Rare Earth'],
  'Heavy Industry': null,             // Production-only (makes Steel)
  'Forestry': ['Lumber'],             // Extraction-only sector
};

// Heavy Industry special inputs
const HEAVY_INDUSTRY_INPUTS: Resource[] = ['Iron Ore', 'Coal'];

// What products each sector's production units demand
const SECTOR_PRODUCT_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Light Industry': ['Steel'],                    // Consumes Steel to make Manufactured Goods
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': ['Steel'],                    // Vehicles, rail need Steel
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': null,
  'Defense': ['Steel'],                           // Military equipment needs Steel
  'Hospitality': ['Food Products'],
  'Construction': ['Steel'],                      // Buildings need Steel (also consumes Lumber resource)
  'Pharmaceuticals': null,
  'Mining': null,
  'Heavy Industry': null,                         // Produces Steel
  'Forestry': null,                               // Extraction-only sector
};

// What products each sector's retail units demand
const SECTOR_RETAIL_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Light Industry': null,
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': ['Logistics Capacity'],
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': ['Food Products'],
  'Defense': ['Defense Equipment'],
  'Hospitality': ['Food Products'],
  'Construction': ['Construction Capacity'],
  'Pharmaceuticals': ['Pharmaceutical Products'],
  'Mining': null,
  'Heavy Industry': null,
  'Forestry': null,
};

// What products each sector's service units demand
const SECTOR_SERVICE_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,
  'Finance': ['Technology Products', 'Electricity'],
  'Healthcare': ['Pharmaceutical Products', 'Electricity'],
  'Light Industry': null,
  'Energy': ['Electricity'],
  'Retail': ['Manufactured Goods', 'Electricity'],
  'Real Estate': ['Construction Capacity', 'Electricity'],
  'Transportation': ['Logistics Capacity', 'Electricity'],
  'Media': ['Technology Products', 'Electricity'],
  'Telecommunications': ['Technology Products', 'Electricity'],
  'Agriculture': ['Food Products', 'Electricity'],
  'Defense': ['Technology Products', 'Defense Equipment', 'Electricity'],
  'Hospitality': ['Food Products', 'Electricity'],
  'Construction': ['Construction Capacity', 'Electricity'],
  'Pharmaceuticals': ['Pharmaceutical Products', 'Electricity'],
  'Mining': null,
  'Heavy Industry': null,
  'Forestry': null,
};

// ============================================================================
// NODE TYPES AND INTERFACES
// ============================================================================

export type ChainNodeType = 'resource' | 'product' | 'sector';

export interface ChainNodeData {
  label: string;
  nodeType: ChainNodeType;
  unitTypes: UnitType[];
  href?: string;
  role?: 'producer' | 'consumer' | 'central';
}

// ============================================================================
// COLORS
// ============================================================================

const RESOURCE_COLOR = '#f59e0b'; // Amber
const PRODUCT_COLOR = '#6366f1';  // Indigo
const SECTOR_COLOR = '#6b7280';   // Gray

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  production: '#3b82f6',  // Blue
  retail: '#22c55e',      // Green
  service: '#a855f7',     // Purple
  extraction: '#f97316',  // Orange
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSectorsProducingProduct(product: Product): Sector[] {
  return SECTORS.filter(sector => SECTOR_PRODUCTS[sector] === product);
}

function getSectorsDemandingProduct(product: Product): Array<{ sector: Sector; unitTypes: UnitType[] }> {
  const result: Array<{ sector: Sector; unitTypes: UnitType[] }> = [];

  for (const sector of SECTORS) {
    const unitTypes: UnitType[] = [];

    // Check production demands
    const prodDemands = SECTOR_PRODUCT_DEMANDS[sector];
    if (prodDemands?.includes(product)) {
      unitTypes.push('production');
    }

    // Check retail demands
    const retailDemands = SECTOR_RETAIL_DEMANDS[sector];
    if (retailDemands?.includes(product)) {
      unitTypes.push('retail');
    }

    // Check service demands
    const serviceDemands = SECTOR_SERVICE_DEMANDS[sector];
    if (serviceDemands?.includes(product)) {
      unitTypes.push('service');
    }

    if (unitTypes.length > 0) {
      result.push({ sector, unitTypes });
    }
  }

  return result;
}

function getSectorsExtractingResource(resource: Resource): Sector[] {
  return SECTORS.filter(sector => {
    const extractable = SECTOR_EXTRACTION[sector];
    return extractable?.includes(resource);
  });
}

function getSectorsConsumingResource(resource: Resource): Array<{ sector: Sector; unitTypes: UnitType[] }> {
  const result: Array<{ sector: Sector; unitTypes: UnitType[] }> = [];

  for (const sector of SECTORS) {
    const unitTypes: UnitType[] = [];

    // Check if production units consume this resource
    if (sector === 'Heavy Industry') {
      // Heavy Industry consumes Iron Ore and Coal
      if (HEAVY_INDUSTRY_INPUTS.includes(resource)) {
        unitTypes.push('production');
      }
    } else if (SECTOR_RESOURCES[sector] === resource) {
      unitTypes.push('production');
    }

    if (unitTypes.length > 0) {
      result.push({ sector, unitTypes });
    }
  }

  return result;
}

function getInputResourcesForSector(sector: Sector): Resource[] {
  if (sector === 'Heavy Industry') {
    return [...HEAVY_INDUSTRY_INPUTS];
  }
  const resource = SECTOR_RESOURCES[sector];
  return resource ? [resource] : [];
}

function getOutputProductForSector(sector: Sector): Product | null {
  return SECTOR_PRODUCTS[sector];
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export interface ProductionChainData {
  nodes: Node<ChainNodeData>[];
  edges: Edge[];
}

/**
 * Get production chain data for a product
 * Shows: Input Resources -> Producing Sectors -> This Product -> Demanding Sectors
 */
function getProductChain(product: Product): ProductionChainData {
  const nodes: Node<ChainNodeData>[] = [];
  const edges: Edge[] = [];

  const producingSectors = getSectorsProducingProduct(product);
  const demandingSectors = getSectorsDemandingProduct(product);

  // Collect all input resources for producing sectors
  const inputResources = new Set<Resource>();
  for (const sector of producingSectors) {
    const resources = getInputResourcesForSector(sector);
    resources.forEach(r => inputResources.add(r));
  }

  // Layout constants
  const yCenter = 150;
  const xSpacing = 250;
  let nodeId = 0;

  // Column positions
  const resourceX = 50;
  const producerX = 300;
  const productX = 550;
  const consumerX = 800;

  // Create input resource nodes (left side)
  const resourceNodes: Record<string, string> = {};
  const resourceArray = Array.from(inputResources);
  const resourceYStart = yCenter - (resourceArray.length - 1) * 40;

  resourceArray.forEach((resource, idx) => {
    const id = `resource-${nodeId++}`;
    resourceNodes[resource] = id;
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: resourceX, y: resourceYStart + idx * 80 },
      data: {
        label: resource,
        nodeType: 'resource',
        unitTypes: [],
        href: `/commodity/${encodeURIComponent(resource)}`,
        role: 'producer',
      },
    });
  });

  // Create producing sector nodes
  const producerYStart = yCenter - (producingSectors.length - 1) * 40;
  const producerNodes: Record<string, string> = {};

  producingSectors.forEach((sector, idx) => {
    const id = `producer-${nodeId++}`;
    producerNodes[sector] = id;
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: producerX, y: producerYStart + idx * 80 },
      data: {
        label: sector,
        nodeType: 'sector',
        unitTypes: ['production'],
        role: 'producer',
      },
    });

    // Create edges from resources to this producer
    const sectorResources = getInputResourcesForSector(sector);
    sectorResources.forEach(resource => {
      if (resourceNodes[resource]) {
        edges.push({
          id: `edge-${resourceNodes[resource]}-${id}`,
          source: resourceNodes[resource],
          target: id,
          animated: true,
          style: { stroke: RESOURCE_COLOR },
          markerEnd: { type: MarkerType.ArrowClosed, color: RESOURCE_COLOR },
        });
      }
    });
  });

  // Create central product node
  const productId = `product-${nodeId++}`;
  nodes.push({
    id: productId,
    type: 'chainNode',
    position: { x: productX, y: yCenter },
    data: {
      label: product,
      nodeType: 'product',
      unitTypes: [],
      role: 'central',
    },
  });

  // Create edges from producers to product
  Object.values(producerNodes).forEach(producerId => {
    edges.push({
      id: `edge-${producerId}-${productId}`,
      source: producerId,
      target: productId,
      animated: true,
      style: { stroke: PRODUCT_COLOR },
      markerEnd: { type: MarkerType.ArrowClosed, color: PRODUCT_COLOR },
    });
  });

  // Create consuming sector nodes (right side)
  const consumerYStart = yCenter - (demandingSectors.length - 1) * 30;

  demandingSectors.slice(0, 8).forEach((item, idx) => {
    const id = `consumer-${nodeId++}`;
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: consumerX, y: consumerYStart + idx * 60 },
      data: {
        label: item.sector,
        nodeType: 'sector',
        unitTypes: item.unitTypes,
        role: 'consumer',
      },
    });

    edges.push({
      id: `edge-${productId}-${id}`,
      source: productId,
      target: id,
      animated: true,
      style: { stroke: SECTOR_COLOR },
      markerEnd: { type: MarkerType.ArrowClosed, color: SECTOR_COLOR },
    });
  });

  return { nodes, edges };
}

/**
 * Get production chain data for a resource
 * Shows: Extracting Sectors -> This Resource -> Consuming Sectors -> Output Products
 */
function getResourceChain(resource: Resource): ProductionChainData {
  const nodes: Node<ChainNodeData>[] = [];
  const edges: Edge[] = [];

  const extractingSectors = getSectorsExtractingResource(resource);
  const consumingSectors = getSectorsConsumingResource(resource);

  // Collect output products from consuming sectors
  const outputProducts = new Set<Product>();
  for (const { sector } of consumingSectors) {
    const product = getOutputProductForSector(sector);
    if (product) {
      outputProducts.add(product);
    }
  }

  // Layout constants
  const yCenter = 150;
  let nodeId = 0;

  // Column positions
  const extractorX = 50;
  const resourceX = 300;
  const consumerX = 550;
  const productX = 800;

  // Create extracting sector nodes (left side)
  const extractorYStart = yCenter - (extractingSectors.length - 1) * 40;
  const extractorNodes: string[] = [];

  extractingSectors.forEach((sector, idx) => {
    const id = `extractor-${nodeId++}`;
    extractorNodes.push(id);
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: extractorX, y: extractorYStart + idx * 80 },
      data: {
        label: sector,
        nodeType: 'sector',
        unitTypes: ['extraction'],
        role: 'producer',
      },
    });
  });

  // Create central resource node
  const resourceId = `resource-${nodeId++}`;
  nodes.push({
    id: resourceId,
    type: 'chainNode',
    position: { x: resourceX, y: yCenter },
    data: {
      label: resource,
      nodeType: 'resource',
      unitTypes: [],
      role: 'central',
    },
  });

  // Create edges from extractors to resource
  extractorNodes.forEach(extractorId => {
    edges.push({
      id: `edge-${extractorId}-${resourceId}`,
      source: extractorId,
      target: resourceId,
      animated: true,
      style: { stroke: RESOURCE_COLOR },
      markerEnd: { type: MarkerType.ArrowClosed, color: RESOURCE_COLOR },
    });
  });

  // Create consuming sector nodes
  const consumerYStart = yCenter - (consumingSectors.length - 1) * 40;
  const consumerNodes: Record<string, string> = {};

  consumingSectors.forEach((item, idx) => {
    const id = `consumer-${nodeId++}`;
    consumerNodes[item.sector] = id;
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: consumerX, y: consumerYStart + idx * 80 },
      data: {
        label: item.sector,
        nodeType: 'sector',
        unitTypes: item.unitTypes,
        role: 'consumer',
      },
    });

    edges.push({
      id: `edge-${resourceId}-${id}`,
      source: resourceId,
      target: id,
      animated: true,
      style: { stroke: SECTOR_COLOR },
      markerEnd: { type: MarkerType.ArrowClosed, color: SECTOR_COLOR },
    });
  });

  // Create output product nodes (right side)
  const productArray = Array.from(outputProducts);
  const productYStart = yCenter - (productArray.length - 1) * 40;

  productArray.forEach((product, idx) => {
    const id = `product-${nodeId++}`;
    nodes.push({
      id,
      type: 'chainNode',
      position: { x: productX, y: productYStart + idx * 80 },
      data: {
        label: product,
        nodeType: 'product',
        unitTypes: [],
        href: `/product/${encodeURIComponent(product)}`,
        role: 'consumer',
      },
    });

    // Find which consuming sectors produce this product
    for (const { sector } of consumingSectors) {
      if (getOutputProductForSector(sector) === product && consumerNodes[sector]) {
        edges.push({
          id: `edge-${consumerNodes[sector]}-${id}`,
          source: consumerNodes[sector],
          target: id,
          animated: true,
          style: { stroke: PRODUCT_COLOR },
          markerEnd: { type: MarkerType.ArrowClosed, color: PRODUCT_COLOR },
        });
      }
    }
  });

  return { nodes, edges };
}

/**
 * Get production chain data for a product or resource
 */
export function getProductionChainData(
  type: 'product' | 'resource',
  name: string
): ProductionChainData {
  if (type === 'product') {
    return getProductChain(name as Product);
  } else {
    return getResourceChain(name as Resource);
  }
}

// Export colors for use in custom node
export { RESOURCE_COLOR, PRODUCT_COLOR, SECTOR_COLOR, UNIT_TYPE_COLORS };
