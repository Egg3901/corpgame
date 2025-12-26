'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRouter } from 'next/navigation';

import {
  SECTORS,
  PRODUCTS,
  RESOURCES,
  RESOURCE_COLOR,
  PRODUCT_COLOR,
  SECTOR_COLOR,
  UNIT_TYPE_COLORS,
  type Sector,
  type Product,
  type Resource,
  type UnitType,
} from '@/lib/productionChain';

// ============================================================================
// CONSTANTS (Mirrored from productionChain.ts for chart generation)
// ============================================================================

// What each sector produces
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
  'Light Industry': null,
  'Energy': null,
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': null,
  'Hospitality': null,
  'Construction': 'Lumber',
  'Pharmaceuticals': 'Chemical Compounds',
  'Mining': null,
  'Heavy Industry': null,
  'Forestry': null,
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
  'Construction': null,
  'Pharmaceuticals': ['Chemical Compounds'],
  'Mining': ['Iron Ore', 'Coal', 'Copper', 'Rare Earth'],
  'Heavy Industry': null,
  'Forestry': ['Lumber'],
};

// Heavy Industry special inputs
const HEAVY_INDUSTRY_INPUTS: Resource[] = ['Iron Ore', 'Coal'];

// What products each sector's production units demand
const SECTOR_PRODUCT_DEMANDS: Record<Sector, Product[] | null> = {
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
  'Forestry': null,
};

// ============================================================================
// NODE COMPONENT
// ============================================================================

interface RelationshipNodeData {
  label: string;
  nodeType: 'resource' | 'product' | 'sector';
  unitTypes?: UnitType[];
  href?: string;
  supply?: number;
  demand?: number;
}

function RelationshipNode({ data }: { data: RelationshipNodeData }) {
  const router = useRouter();

  const bgColor = useMemo(() => {
    switch (data.nodeType) {
      case 'resource':
        return 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 dark:border-amber-600';
      case 'product':
        return 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-400 dark:border-indigo-600';
      case 'sector':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  }, [data.nodeType]);

  const textColor = useMemo(() => {
    switch (data.nodeType) {
      case 'resource':
        return 'text-amber-800 dark:text-amber-200';
      case 'product':
        return 'text-indigo-800 dark:text-indigo-200';
      case 'sector':
        return 'text-gray-800 dark:text-gray-200';
      default:
        return 'text-gray-900 dark:text-white';
    }
  }, [data.nodeType]);

  const handleClick = useCallback(() => {
    if (data.href) {
      router.push(data.href);
    }
  }, [data.href, router]);

  return (
    <div
      onClick={handleClick}
      className={`px-3 py-2 rounded-lg border-2 shadow-md transition-all ${bgColor} ${
        data.href ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''
      }`}
    >
      <div className={`text-xs font-semibold text-center ${textColor}`}>
        {data.label}
      </div>
      {data.unitTypes && data.unitTypes.length > 0 && (
        <div className="flex justify-center gap-1 mt-1">
          {data.unitTypes.map((ut) => (
            <span
              key={ut}
              className="px-1 py-0.5 text-[8px] font-medium rounded text-white"
              style={{ backgroundColor: UNIT_TYPE_COLORS[ut] }}
            >
              {ut === 'production' ? 'Prod' : ut === 'extraction' ? 'Ext' : ut === 'retail' ? 'Ret' : 'Svc'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  relationshipNode: RelationshipNode,
};

// ============================================================================
// CHART DATA GENERATION
// ============================================================================

interface ChartData {
  nodes: Node<RelationshipNodeData>[];
  edges: Edge[];
}

function generateFullRelationshipChart(): ChartData {
  const nodes: Node<RelationshipNodeData>[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;
  const edgeSet = new Set<string>();

  // Layout configuration
  const resourceX = 50;
  const sectorX = 350;
  const productX = 650;
  const ySpacing = 70;
  const yOffset = 30;

  // Node ID mappings
  const resourceNodeIds: Record<string, string> = {};
  const sectorNodeIds: Record<string, string> = {};
  const productNodeIds: Record<string, string> = {};

  // Create resource nodes (left column)
  RESOURCES.forEach((resource, idx) => {
    const id = `resource-${nodeId++}`;
    resourceNodeIds[resource] = id;
    nodes.push({
      id,
      type: 'relationshipNode',
      position: { x: resourceX, y: yOffset + idx * ySpacing },
      data: {
        label: resource,
        nodeType: 'resource',
        href: `/commodity/${encodeURIComponent(resource)}`,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Create product nodes (right column)
  PRODUCTS.forEach((product, idx) => {
    const id = `product-${nodeId++}`;
    productNodeIds[product] = id;
    nodes.push({
      id,
      type: 'relationshipNode',
      position: { x: productX, y: yOffset + idx * ySpacing },
      data: {
        label: product,
        nodeType: 'product',
        href: `/product/${encodeURIComponent(product)}`,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Filter sectors that have meaningful relationships
  const relevantSectors = SECTORS.filter((sector) => {
    const produces = SECTOR_PRODUCTS[sector];
    const consumes = SECTOR_RESOURCES[sector];
    const extracts = SECTOR_EXTRACTION[sector];
    const productDemands = SECTOR_PRODUCT_DEMANDS[sector];
    return produces || consumes || extracts || productDemands;
  });

  // Create sector nodes (middle column)
  relevantSectors.forEach((sector, idx) => {
    const id = `sector-${nodeId++}`;
    sectorNodeIds[sector] = id;

    // Determine unit types for this sector
    const unitTypes: UnitType[] = [];
    if (SECTOR_PRODUCTS[sector]) unitTypes.push('production');
    if (SECTOR_EXTRACTION[sector]) unitTypes.push('extraction');
    if (SECTOR_PRODUCT_DEMANDS[sector]) unitTypes.push('retail');

    nodes.push({
      id,
      type: 'relationshipNode',
      position: { x: sectorX, y: yOffset + idx * ySpacing },
      data: {
        label: sector,
        nodeType: 'sector',
        unitTypes,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Helper to add unique edges
  const addEdge = (source: string, target: string, color: string, animated = true, label?: string) => {
    const key = `${source}-${target}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        id: `edge-${key}`,
        source,
        target,
        animated,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        label,
        labelStyle: { fontSize: 8, fill: color },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      });
    }
  };

  // Create edges for each relationship type
  relevantSectors.forEach((sector) => {
    const sectorId = sectorNodeIds[sector];

    // 1. Extraction: Sector extracts resources
    const extracts = SECTOR_EXTRACTION[sector];
    if (extracts) {
      extracts.forEach((resource) => {
        if (resourceNodeIds[resource]) {
          // Extraction flows FROM sector TO resource pool (sector produces resource)
          addEdge(sectorId, resourceNodeIds[resource], '#f97316'); // Orange for extraction
        }
      });
    }

    // 2. Resource consumption: Sector uses resources for production
    if (sector === 'Heavy Industry') {
      HEAVY_INDUSTRY_INPUTS.forEach((resource) => {
        if (resourceNodeIds[resource]) {
          addEdge(resourceNodeIds[resource], sectorId, RESOURCE_COLOR);
        }
      });
    } else {
      const consumedResource = SECTOR_RESOURCES[sector];
      if (consumedResource && resourceNodeIds[consumedResource]) {
        addEdge(resourceNodeIds[consumedResource], sectorId, RESOURCE_COLOR);
      }
    }

    // 3. Product production: Sector produces products
    const producedProduct = SECTOR_PRODUCTS[sector];
    if (producedProduct && productNodeIds[producedProduct]) {
      addEdge(sectorId, productNodeIds[producedProduct], PRODUCT_COLOR);
    }

    // 4. Product demands: Sector consumes products
    const demandedProducts = SECTOR_PRODUCT_DEMANDS[sector];
    if (demandedProducts) {
      demandedProducts.forEach((product) => {
        if (productNodeIds[product]) {
          addEdge(productNodeIds[product], sectorId, '#6b7280'); // Gray for consumption
        }
      });
    }
  });

  return { nodes, edges };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CommodityRelationshipChart() {
  const chartData = useMemo(() => generateFullRelationshipChart(), []);

  const [nodes, , onNodesChange] = useNodesState(chartData.nodes);
  const [edges, , onEdgesChange] = useEdgesState(chartData.edges);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Production Chain Overview
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (Click nodes to navigate)
        </span>
      </div>

      {/* Diagram container */}
      <div className="h-[600px] w-full rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,
            minZoom: 0.4,
            maxZoom: 1.5,
          }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          preventScrolling={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(156, 163, 175, 0.3)"
            className="dark:!bg-gray-900"
          />
          <Controls
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            className="!bg-white/90 dark:!bg-gray-800/90 !border-gray-200 dark:!border-gray-700 !shadow-md"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Legend:</div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Node types */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800 border border-amber-400 dark:border-amber-600" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Raw Resource</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Sector</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-800 border border-indigo-400 dark:border-indigo-600" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Product</span>
          </div>
        </div>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Edge types */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Extraction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-amber-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Resource Input</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-indigo-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Product Output</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">Product Demand</span>
          </div>
        </div>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

        {/* Unit types */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-blue-500">Prod</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Production</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-orange-500">Ext</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Extraction</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-green-500">Ret</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Retail</span>
        </div>
      </div>

      {/* Info text */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        This chart shows the complete production chain: Resources are extracted by sectors, consumed to produce Products, which are then demanded by other sectors.
      </p>
    </div>
  );
}
