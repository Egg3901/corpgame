'use client';

/**
 * SectorConfigPanel - Admin panel for managing sector configurations
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Allows administrators to edit:
 * - Product reference values and min prices
 * - Resource base prices
 * - Unit type configurations (economics)
 * - Input consumption rates
 * - Output production rates
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Save, AlertCircle, CheckCircle2, Factory, Store, Briefcase, Pickaxe, Package, Gem, DollarSign, Plus, Trash2, X } from 'lucide-react';
import {
  sectorConfigAPI,
  AdminSectorConfigData,
  SectorConfig,
  SectorUnitConfig,
  SectorUnitInput,
  SectorUnitOutput,
  ProductConfig,
  ResourceConfig,
  UnitType,
} from '@/lib/api';

interface SectorConfigPanelProps {
  onError?: (message: string) => void;
}

type TabType = 'sectors' | 'products' | 'resources';

const UNIT_TYPE_ICONS: Record<UnitType, typeof Factory> = {
  production: Factory,
  retail: Store,
  service: Briefcase,
  extraction: Pickaxe,
};

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  production: 'text-orange-500',
  retail: 'text-pink-500',
  service: 'text-blue-500',
  extraction: 'text-amber-500',
};

export default function SectorConfigPanel({ onError }: SectorConfigPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminSectorConfigData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sectors');
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editing states
  const [editingInput, setEditingInput] = useState<{ id: number; value: string } | null>(null);
  const [editingOutput, setEditingOutput] = useState<{ id: number; value: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<{ name: string; field: 'reference_value' | 'min_price'; value: string } | null>(null);
  const [editingResource, setEditingResource] = useState<{ name: string; value: string } | null>(null);
  const [editingUnitConfig, setEditingUnitConfig] = useState<{ sector: string; unitType: UnitType; field: string; value: string } | null>(null);

  // FID-20251228-003: Modal states for add/delete operations
  const [addInputModal, setAddInputModal] = useState<{
    sectorName: string;
    unitType: UnitType;
  } | null>(null);
  const [addOutputModal, setAddOutputModal] = useState<{
    sectorName: string;
    unitType: UnitType;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    type: 'input' | 'output';
    id: number;
    name: string;
  } | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  // FID-20251228-003: Form state for modals
  const [newInputForm, setNewInputForm] = useState({
    inputName: '',
    inputType: 'resource' as 'resource' | 'product',
    consumptionRate: 0.5,
  });
  const [newOutputForm, setNewOutputForm] = useState({
    outputName: '',
    outputType: 'product' as 'resource' | 'product',
    outputRate: 1.0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const configData = await sectorConfigAPI.getAdminConfig();
      setData(configData);
    } catch (err) {
      console.error('Failed to load sector config:', err);
      onError?.('Failed to load sector configuration');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const toggleSector = (sectorName: string) => {
    setExpandedSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorName)) {
        next.delete(sectorName);
      } else {
        next.add(sectorName);
      }
      return next;
    });
  };

  // Save handlers
  const handleSaveInput = async (input: SectorUnitInput) => {
    if (!editingInput || editingInput.id !== input.id) return;
    const newRate = parseFloat(editingInput.value);
    if (isNaN(newRate) || newRate < 0) {
      onError?.('Invalid consumption rate');
      return;
    }

    setSaving(`input-${input.id}`);
    try {
      await sectorConfigAPI.updateInput(input.id, newRate);
      await loadData();
      setEditingInput(null);
      showSuccess(`Updated ${input.input_name} consumption rate`);
    } catch (err) {
      console.error('Failed to update input:', err);
      onError?.('Failed to update input rate');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveOutput = async (output: SectorUnitOutput) => {
    if (!editingOutput || editingOutput.id !== output.id) return;
    const newRate = parseFloat(editingOutput.value);
    if (isNaN(newRate) || newRate < 0) {
      onError?.('Invalid output rate');
      return;
    }

    setSaving(`output-${output.id}`);
    try {
      await sectorConfigAPI.updateOutput(output.id, newRate);
      await loadData();
      setEditingOutput(null);
      showSuccess(`Updated ${output.output_name} output rate`);
    } catch (err) {
      console.error('Failed to update output:', err);
      onError?.('Failed to update output rate');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveProduct = async (product: ProductConfig) => {
    if (!editingProduct || editingProduct.name !== product.product_name) return;
    const newValue = parseFloat(editingProduct.value);
    if (isNaN(newValue) || newValue < 0) {
      onError?.('Invalid value');
      return;
    }

    setSaving(`product-${product.product_name}-${editingProduct.field}`);
    try {
      await sectorConfigAPI.updateProduct(product.product_name, { [editingProduct.field]: newValue });
      await loadData();
      setEditingProduct(null);
      showSuccess(`Updated ${product.product_name}`);
    } catch (err) {
      console.error('Failed to update product:', err);
      onError?.('Failed to update product');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveResource = async (resource: ResourceConfig) => {
    if (!editingResource || editingResource.name !== resource.resource_name) return;
    const newValue = parseFloat(editingResource.value);
    if (isNaN(newValue) || newValue < 0) {
      onError?.('Invalid value');
      return;
    }

    setSaving(`resource-${resource.resource_name}`);
    try {
      await sectorConfigAPI.updateResource(resource.resource_name, { base_price: newValue });
      await loadData();
      setEditingResource(null);
      showSuccess(`Updated ${resource.resource_name}`);
    } catch (err) {
      console.error('Failed to update resource:', err);
      onError?.('Failed to update resource');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveUnitConfig = async (config: SectorUnitConfig) => {
    if (!editingUnitConfig || editingUnitConfig.sector !== config.sector_name || editingUnitConfig.unitType !== config.unit_type) return;
    const newValue = parseFloat(editingUnitConfig.value);
    if (isNaN(newValue) || newValue < 0) {
      onError?.('Invalid value');
      return;
    }

    setSaving(`unit-${config.sector_name}-${config.unit_type}-${editingUnitConfig.field}`);
    try {
      await sectorConfigAPI.updateUnitConfig(config.sector_name, config.unit_type, { [editingUnitConfig.field]: newValue });
      await loadData();
      setEditingUnitConfig(null);
      showSuccess(`Updated ${config.sector_name} ${config.unit_type}`);
    } catch (err) {
      console.error('Failed to update unit config:', err);
      onError?.('Failed to update unit configuration');
    } finally {
      setSaving(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  // FID-20251228-003: Create input handler
  const handleCreateInput = async () => {
    if (!addInputModal) return;
    if (!newInputForm.inputName || newInputForm.consumptionRate <= 0) {
      onError?.('Please fill in all fields with valid values');
      return;
    }

    setModalSaving(true);
    try {
      await sectorConfigAPI.createInput({
        sectorName: addInputModal.sectorName,
        unitType: addInputModal.unitType,
        inputName: newInputForm.inputName,
        inputType: newInputForm.inputType,
        consumptionRate: newInputForm.consumptionRate,
      });
      await loadData();
      setAddInputModal(null);
      setNewInputForm({ inputName: '', inputType: 'resource', consumptionRate: 0.5 });
      showSuccess(`Added ${newInputForm.inputName} input`);
    } catch (err) {
      console.error('Failed to create input:', err);
      onError?.((err as Error).message || 'Failed to create input');
    } finally {
      setModalSaving(false);
    }
  };

  // FID-20251228-003: Create output handler
  const handleCreateOutput = async () => {
    if (!addOutputModal) return;
    if (!newOutputForm.outputName || newOutputForm.outputRate <= 0) {
      onError?.('Please fill in all fields with valid values');
      return;
    }

    setModalSaving(true);
    try {
      await sectorConfigAPI.createOutput({
        sectorName: addOutputModal.sectorName,
        unitType: addOutputModal.unitType,
        outputName: newOutputForm.outputName,
        outputType: newOutputForm.outputType,
        outputRate: newOutputForm.outputRate,
      });
      await loadData();
      setAddOutputModal(null);
      setNewOutputForm({ outputName: '', outputType: 'product', outputRate: 1.0 });
      showSuccess(`Added ${newOutputForm.outputName} output`);
    } catch (err) {
      console.error('Failed to create output:', err);
      onError?.((err as Error).message || 'Failed to create output');
    } finally {
      setModalSaving(false);
    }
  };

  // FID-20251228-003: Delete handler
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    setModalSaving(true);
    try {
      if (deleteModal.type === 'input') {
        await sectorConfigAPI.deleteInput(deleteModal.id);
      } else {
        await sectorConfigAPI.deleteOutput(deleteModal.id);
      }
      await loadData();
      setDeleteModal(null);
      showSuccess(`Deleted ${deleteModal.name}`);
    } catch (err) {
      console.error('Failed to delete:', err);
      onError?.((err as Error).message || 'Failed to delete');
    } finally {
      setModalSaving(false);
    }
  };

  // FID-20251228-003: Resource and product lists for dropdowns
  const RESOURCES = ['Coal', 'Oil', 'Iron Ore', 'Lumber', 'Natural Gas'];
  const PRODUCTS = [
    'Technology Products', 'Manufactured Goods', 'Electricity',
    'Food Products', 'Construction Capacity', 'Pharmaceutical Products',
    'Defense Equipment', 'Logistics Capacity'
  ];

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load sector configuration</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('sectors')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sectors'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Factory className="w-4 h-4 inline-block mr-1" />
          Sectors ({data.sectors.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Package className="w-4 h-4 inline-block mr-1" />
          Products ({data.products.length})
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Gem className="w-4 h-4 inline-block mr-1" />
          Resources ({data.resources.length})
        </button>
      </div>

      {/* Sectors Tab */}
      {activeTab === 'sectors' && (
        <div className="space-y-2">
          {data.sectors.map((sector) => {
            const isExpanded = expandedSectors.has(sector.sector_name);
            const unitConfigs = data.unitConfigs.filter(uc => uc.sector_name === sector.sector_name);
            const sectorInputs = data.inputs.filter(i => i.sector_name === sector.sector_name);
            const sectorOutputs = data.outputs.filter(o => o.sector_name === sector.sector_name);

            return (
              <div key={sector.sector_name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Sector Header */}
                <button
                  onClick={() => toggleSector(sector.sector_name)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <span className="font-medium">{sector.sector_name}</span>
                    {sector.is_production_only && (
                      <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                        Production Only
                      </span>
                    )}
                    {sector.can_extract && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                        Can Extract
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {sector.produced_product && (
                      <span>Produces: {sector.produced_product}</span>
                    )}
                    {sector.primary_resource && (
                      <span>Requires: {sector.primary_resource}</span>
                    )}
                  </div>
                </button>

                {/* Sector Details */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Unit Configs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(['production', 'retail', 'service', 'extraction'] as UnitType[]).map(unitType => {
                        const config = unitConfigs.find(uc => uc.unit_type === unitType);
                        const inputs = sectorInputs.filter(i => i.unit_type === unitType);
                        const outputs = sectorOutputs.filter(o => o.unit_type === unitType);
                        const Icon = UNIT_TYPE_ICONS[unitType];
                        const colorClass = UNIT_TYPE_COLORS[unitType];

                        if (!config) return null;

                        return (
                          <div
                            key={unitType}
                            className={`border rounded-lg p-3 ${
                              config.is_enabled
                                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Icon className={`w-4 h-4 ${colorClass}`} />
                              <span className="font-medium capitalize">{unitType}</span>
                              {!config.is_enabled && (
                                <span className="text-xs text-gray-400">Disabled</span>
                              )}
                            </div>

                            {config.is_enabled && (
                              <>
                                {/* Economics */}
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Base Revenue:</span>
                                    {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'base_revenue' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={editingUnitConfig.value}
                                          onChange={(e) => setEditingUnitConfig({ ...editingUnitConfig, value: e.target.value })}
                                          className="w-20 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleSaveUnitConfig(config)}
                                          disabled={saving === `unit-${config.sector_name}-${config.unit_type}-base_revenue`}
                                          className="p-0.5 text-emerald-500 hover:text-emerald-600"
                                        >
                                          <Save className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'base_revenue', value: String(config.base_revenue) })}
                                        className="font-mono hover:underline"
                                      >
                                        {formatCurrency(config.base_revenue)}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Base Cost:</span>
                                    {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'base_cost' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={editingUnitConfig.value}
                                          onChange={(e) => setEditingUnitConfig({ ...editingUnitConfig, value: e.target.value })}
                                          className="w-20 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleSaveUnitConfig(config)}
                                          disabled={saving === `unit-${config.sector_name}-${config.unit_type}-base_cost`}
                                          className="p-0.5 text-emerald-500 hover:text-emerald-600"
                                        >
                                          <Save className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'base_cost', value: String(config.base_cost) })}
                                        className="font-mono hover:underline"
                                      >
                                        {formatCurrency(config.base_cost)}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Labor Cost:</span>
                                    {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'labor_cost' ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={editingUnitConfig.value}
                                          onChange={(e) => setEditingUnitConfig({ ...editingUnitConfig, value: e.target.value })}
                                          className="w-20 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleSaveUnitConfig(config)}
                                          disabled={saving === `unit-${config.sector_name}-${config.unit_type}-labor_cost`}
                                          className="p-0.5 text-emerald-500 hover:text-emerald-600"
                                        >
                                          <Save className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'labor_cost', value: String(config.labor_cost) })}
                                        className="font-mono hover:underline"
                                      >
                                        {formatCurrency(config.labor_cost)}
                                      </button>
                                    )}
                                  </div>
                                  {config.output_rate !== null && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Output Rate:</span>
                                      <span className="font-mono">{config.output_rate}/hr</span>
                                    </div>
                                  )}
                                </div>

                                {/* Inputs */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Inputs</span>
                                    <button
                                      onClick={() => setAddInputModal({ sectorName: sector.sector_name, unitType })}
                                      className="p-0.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                      title="Add Input"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="space-y-1">
                                    {inputs.map(input => (
                                      <div key={input.id} className="flex justify-between items-center text-xs group">
                                        <span className={input.input_type === 'resource' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}>
                                          {input.input_name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {editingInput?.id === input.id ? (
                                            <>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editingInput.value}
                                                onChange={(e) => setEditingInput({ ...editingInput, value: e.target.value })}
                                                className="w-16 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                                                autoFocus
                                              />
                                              <button
                                                onClick={() => handleSaveInput(input)}
                                                disabled={saving === `input-${input.id}`}
                                                className="p-0.5 text-emerald-500 hover:text-emerald-600"
                                              >
                                                <Save className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => setEditingInput({ id: input.id, value: String(input.consumption_rate) })}
                                                className="font-mono hover:underline"
                                              >
                                                {input.consumption_rate}/hr
                                              </button>
                                              <button
                                                onClick={() => setDeleteModal({ type: 'input', id: input.id, name: input.input_name })}
                                                className="p-0.5 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Input"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {inputs.length === 0 && (
                                      <span className="text-xs text-gray-400">No inputs configured</span>
                                    )}
                                  </div>
                                </div>

                                {/* Outputs */}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Outputs</span>
                                    <button
                                      onClick={() => setAddOutputModal({ sectorName: sector.sector_name, unitType })}
                                      className="p-0.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                      title="Add Output"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="space-y-1">
                                    {outputs.map(output => (
                                      <div key={output.id} className="flex justify-between items-center text-xs group">
                                        <span className={output.output_type === 'resource' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                          {output.output_name}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {editingOutput?.id === output.id ? (
                                            <>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editingOutput.value}
                                                onChange={(e) => setEditingOutput({ ...editingOutput, value: e.target.value })}
                                                className="w-16 px-1 py-0.5 text-right border rounded text-xs dark:bg-gray-700 dark:border-gray-600"
                                                autoFocus
                                              />
                                              <button
                                                onClick={() => handleSaveOutput(output)}
                                                disabled={saving === `output-${output.id}`}
                                                className="p-0.5 text-emerald-500 hover:text-emerald-600"
                                              >
                                                <Save className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => setEditingOutput({ id: output.id, value: String(output.output_rate) })}
                                                className="font-mono hover:underline"
                                              >
                                                {output.output_rate}/hr
                                              </button>
                                              <button
                                                onClick={() => setDeleteModal({ type: 'output', id: output.id, name: output.output_name })}
                                                className="p-0.5 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Output"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {outputs.length === 0 && (
                                      <span className="text-xs text-gray-400">No outputs configured</span>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reference Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.products.map(product => (
                <tr key={product.product_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">{product.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingProduct?.name === product.product_name && editingProduct?.field === 'reference_value' ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={editingProduct.value}
                          onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                          className="w-28 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveProduct(product)}
                          disabled={saving === `product-${product.product_name}-reference_value`}
                          className="p-1 text-emerald-500 hover:text-emerald-600"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingProduct({ name: product.product_name, field: 'reference_value', value: String(product.reference_value) })}
                        className="font-mono hover:underline"
                      >
                        {formatCurrency(product.reference_value)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingProduct?.name === product.product_name && editingProduct?.field === 'min_price' ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={editingProduct.value}
                          onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                          className="w-28 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveProduct(product)}
                          disabled={saving === `product-${product.product_name}-min_price`}
                          className="p-1 text-emerald-500 hover:text-emerald-600"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingProduct({ name: product.product_name, field: 'min_price', value: String(product.min_price) })}
                        className="font-mono hover:underline"
                      >
                        {formatCurrency(product.min_price)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.resources.map(resource => (
                <tr key={resource.resource_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gem className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">{resource.resource_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingResource?.name === resource.resource_name ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={editingResource.value}
                          onChange={(e) => setEditingResource({ ...editingResource, value: e.target.value })}
                          className="w-28 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveResource(resource)}
                          disabled={saving === `resource-${resource.resource_name}`}
                          className="p-1 text-emerald-500 hover:text-emerald-600"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingResource({ name: resource.resource_name, value: String(resource.base_price) })}
                        className="font-mono hover:underline"
                      >
                        {formatCurrency(resource.base_price)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FID-20251228-003: Add Input Modal */}
      {addInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Add Input to {addInputModal.sectorName} {addInputModal.unitType}</h3>
              <button onClick={() => setAddInputModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Input Type</label>
                <select
                  value={newInputForm.inputType}
                  onChange={(e) => {
                    setNewInputForm({ ...newInputForm, inputType: e.target.value as 'resource' | 'product', inputName: '' });
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="resource">Resource</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Input Name</label>
                <select
                  value={newInputForm.inputName}
                  onChange={(e) => setNewInputForm({ ...newInputForm, inputName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select...</option>
                  {(newInputForm.inputType === 'resource' ? RESOURCES : PRODUCTS).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Consumption Rate (per hour)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newInputForm.consumptionRate}
                  onChange={(e) => setNewInputForm({ ...newInputForm, consumptionRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setAddInputModal(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInput}
                disabled={modalSaving || !newInputForm.inputName}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalSaving ? 'Adding...' : 'Add Input'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FID-20251228-003: Add Output Modal */}
      {addOutputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Add Output to {addOutputModal.sectorName} {addOutputModal.unitType}</h3>
              <button onClick={() => setAddOutputModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Output Type</label>
                <select
                  value={newOutputForm.outputType}
                  onChange={(e) => {
                    setNewOutputForm({ ...newOutputForm, outputType: e.target.value as 'resource' | 'product', outputName: '' });
                  }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="resource">Resource</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Output Name</label>
                <select
                  value={newOutputForm.outputName}
                  onChange={(e) => setNewOutputForm({ ...newOutputForm, outputName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select...</option>
                  {(newOutputForm.outputType === 'resource' ? RESOURCES : PRODUCTS).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Output Rate (per hour)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newOutputForm.outputRate}
                  onChange={(e) => setNewOutputForm({ ...newOutputForm, outputRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setAddOutputModal(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOutput}
                disabled={modalSaving || !newOutputForm.outputName}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalSaving ? 'Adding...' : 'Add Output'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FID-20251228-003: Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Confirm Delete</h3>
              <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p>Are you sure you want to delete the {deleteModal.type} <strong>{deleteModal.name}</strong>?</p>
              <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={modalSaving}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
