'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

// FID-20251228-003: Use config-aware function for dynamic data
import { getProductionChainDataWithConfig, ChainNodeData } from '@/lib/productionChain';
import { useSectorConfig } from '@/hooks/useSectorConfig';
import ChainNode from './ChainNode';

// Register custom node types
const nodeTypes = {
  chainNode: ChainNode,
};

interface ProductionChainDiagramProps {
  type: 'product' | 'resource';
  name: string;
}

export default function ProductionChainDiagram({ type, name }: ProductionChainDiagramProps) {
  // FID-20251228-003: Get sector config for dynamic data
  const { config, loading: isLoading } = useSectorConfig();

  // Generate chain data based on type, name, and config
  const chainData = useMemo(() => {
    return getProductionChainDataWithConfig(type, name, config);
  }, [type, name, config]);

  const [nodes, setNodes, onNodesChange] = useNodesState(chainData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(chainData.edges);

  // FID-20251228-003: Update nodes and edges when chainData changes (config updates)
  useEffect(() => {
    setNodes(chainData.nodes);
    setEdges(chainData.edges);
  }, [chainData, setNodes, setEdges]);

  // Determine if we have data to show
  const hasData = chainData.nodes.length > 0;

  // Show loading state while config is loading
  if (isLoading) {
    return (
      <div className="h-[250px] w-full rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Loading production chain...
        </p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-[250px] w-full rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No production chain data available
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Production Chain
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (Click nodes to navigate)
        </span>
      </div>

      {/* Diagram container */}
      <div className="h-[280px] w-full rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.5,
          }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          preventScrolling={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
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
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800 border border-amber-400 dark:border-amber-600" />
          <span>Resource</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-800 border border-indigo-400 dark:border-indigo-600" />
          <span>Product</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-500" />
          <span>Sector</span>
        </div>
        <div className="flex items-center gap-3 ml-2 border-l border-gray-300 dark:border-gray-600 pl-3">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-blue-500">Prod</span>
            <span>Production</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-orange-500">Ext</span>
            <span>Extraction</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-green-500">Retail</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white bg-purple-500">Svc</span>
            <span>Service</span>
          </div>
        </div>
      </div>
    </div>
  );
}
