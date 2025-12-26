'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useRouter } from 'next/navigation';
import {
  ChainNodeData,
  RESOURCE_COLOR,
  PRODUCT_COLOR,
  SECTOR_COLOR,
  UNIT_TYPE_COLORS,
  UnitType,
} from '@/lib/productionChain';

const unitTypeLabels: Record<UnitType, string> = {
  production: 'Prod',
  retail: 'Retail',
  service: 'Svc',
  extraction: 'Ext',
};

function ChainNode({ data }: NodeProps<ChainNodeData>) {
  const router = useRouter();

  const handleClick = () => {
    if (data.href) {
      router.push(data.href);
    }
  };

  // Determine background color based on node type
  const getBackgroundColor = () => {
    switch (data.nodeType) {
      case 'resource':
        return 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700';
      case 'product':
        return 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700';
      case 'sector':
        return 'bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  };

  // Determine text color
  const getTextColor = () => {
    switch (data.nodeType) {
      case 'resource':
        return 'text-amber-800 dark:text-amber-200';
      case 'product':
        return 'text-indigo-800 dark:text-indigo-200';
      case 'sector':
        return 'text-gray-800 dark:text-gray-200';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  // Determine if node is central (highlighted)
  const isCentral = data.role === 'central';

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-md
        ${getBackgroundColor()}
        ${data.href ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all' : ''}
        ${isCentral ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900' : ''}
        min-w-[100px] max-w-[160px]
      `}
      onClick={handleClick}
    >
      {/* Incoming handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 dark:!bg-gray-500 !w-2 !h-2"
      />

      {/* Node content */}
      <div className="flex flex-col items-center gap-1">
        {/* Label */}
        <span className={`text-xs font-semibold text-center leading-tight ${getTextColor()}`}>
          {data.label}
        </span>

        {/* Unit type badges */}
        {data.unitTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {data.unitTypes.map(unitType => (
              <span
                key={unitType}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded text-white"
                style={{ backgroundColor: UNIT_TYPE_COLORS[unitType] }}
              >
                {unitTypeLabels[unitType]}
              </span>
            ))}
          </div>
        )}

        {/* Node type indicator for central nodes */}
        {isCentral && (
          <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
            {data.nodeType === 'product' ? 'Product' : 'Resource'}
          </span>
        )}
      </div>

      {/* Outgoing handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 dark:!bg-gray-500 !w-2 !h-2"
      />
    </div>
  );
}

export default memo(ChainNode);
