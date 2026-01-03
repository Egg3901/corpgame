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

import { useState, useEffect, useCallback, Key } from 'react';
import { Save, AlertCircle, CheckCircle2, Factory, Store, Briefcase, Pickaxe, Package, Gem, Plus, Trash2, X, ChevronDown, ChevronRight, Download, Upload } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Input,
  Button,
  Card,
  CardBody,
  Switch,
  Accordion,
  AccordionItem,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Spinner,
  Divider,
  Tooltip
} from "@heroui/react";
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
import { getErrorMessage } from '@/lib/utils';

interface SectorConfigPanelProps {
  onError?: (message: string) => void;
}

const UNIT_TYPE_ICONS: Record<UnitType, typeof Factory> = {
  production: Factory,
  retail: Store,
  service: Briefcase,
  extraction: Pickaxe,
};

const UNIT_TYPE_COLORS: Record<UnitType, "warning" | "danger" | "primary" | "secondary" | "default" | "success"> = {
  production: 'warning',
  retail: 'danger', // Pinkish in Tailwind maps to danger usually or secondary
  service: 'primary',
  extraction: 'warning', // Amber maps to warning
};

export default function SectorConfigPanel({ onError }: SectorConfigPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminSectorConfigData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('sectors');
  const [saving, setSaving] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editing states
  const [editingInput, setEditingInput] = useState<{ id: number; value: string } | null>(null);
  const [editingOutput, setEditingOutput] = useState<{ id: number; value: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<{ name: string; field: 'reference_value' | 'min_price'; value: string } | null>(null);
  const [editingResource, setEditingResource] = useState<{ name: string; value: string } | null>(null);
  const [editingUnitConfig, setEditingUnitConfig] = useState<{ sector: string; unitType: UnitType; field: string; value: string } | null>(null);
  const [togglingUnit, setTogglingUnit] = useState<string | null>(null);

  // FID-20251228-003: Modal states for add/delete operations
  const [addInputModal, setAddInputModal] = useState<{
    sectorName: string;
    unitType: UnitType;
    isOpen: boolean;
  } | null>(null);
  const [addOutputModal, setAddOutputModal] = useState<{
    sectorName: string;
    unitType: UnitType;
    isOpen: boolean;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    type: 'input' | 'output';
    id: number;
    name: string;
    isOpen: boolean;
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

  // FID-20260103-005: Import/Export state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  // FID-20260103-005: Sector toggle state
  const [togglingSector, setTogglingSector] = useState<string | null>(null);

  // Export config as JSON file
  const handleExport = useCallback(() => {
    if (!data) return;

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      sectors: data.sectors,
      unitConfigs: data.unitConfigs,
      inputs: data.inputs,
      outputs: data.outputs,
      products: data.products,
      resources: data.resources,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sector-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Configuration exported successfully');
  }, [data]);

  // Import config from JSON file
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate structure
      if (!importData.products || !importData.unitConfigs) {
        throw new Error('Invalid config file: missing required fields');
      }

      // Call import API
      await sectorConfigAPI.importConfig(importData);
      await loadData();
      showSuccess('Configuration imported successfully');
    } catch (err: unknown) {
      console.error('Import failed:', err);
      onError?.(getErrorMessage(err, 'Failed to import configuration'));
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  }, [onError]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const configData = await sectorConfigAPI.getAdminConfig();
      setData(configData);
    } catch (err: unknown) {
      console.error('Failed to load sector config:', err);
      onError?.(getErrorMessage(err, 'Failed to load sector configuration'));
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

  // FID-20260103-005: Toggle sector enabled/disabled
  const handleToggleSectorEnabled = async (sectorName: string, newEnabledState: boolean) => {
    setTogglingSector(sectorName);
    try {
      await sectorConfigAPI.updateSector(sectorName, { is_enabled: newEnabledState });
      await loadData();
      showSuccess(`${sectorName} ${newEnabledState ? 'enabled' : 'disabled'}`);
    } catch (err: unknown) {
      console.error('Failed to toggle sector:', err);
      onError?.(getErrorMessage(err, 'Failed to update sector status'));
    } finally {
      setTogglingSector(null);
    }
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
    } catch (err: unknown) {
      console.error('Failed to update input:', err);
      onError?.(getErrorMessage(err, 'Failed to update input rate'));
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
    } catch (err: unknown) {
      console.error('Failed to update output:', err);
      onError?.(getErrorMessage(err, 'Failed to update output rate'));
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
    } catch (err: unknown) {
      console.error('Failed to update product:', err);
      onError?.(getErrorMessage(err, 'Failed to update product'));
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
    } catch (err: unknown) {
      console.error('Failed to update resource:', err);
      onError?.(getErrorMessage(err, 'Failed to update resource'));
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
    } catch (err: unknown) {
      console.error('Failed to update unit config:', err);
      onError?.(getErrorMessage(err, 'Failed to update unit configuration'));
    } finally {
      setSaving(null);
    }
  };

  const handleToggleUnitEnabled = async (config: SectorUnitConfig, newEnabledState: boolean) => {
    const toggleKey = `${config.sector_name}-${config.unit_type}`;
    setTogglingUnit(toggleKey);

    try {
      await sectorConfigAPI.updateUnitConfig(config.sector_name, config.unit_type, { is_enabled: newEnabledState });
      await loadData();
      showSuccess(`${config.unit_type} ${newEnabledState ? 'enabled' : 'disabled'} for ${config.sector_name}`);
    } catch (err: unknown) {
      console.error('Failed to toggle unit:', err);
      onError?.(getErrorMessage(err, 'Failed to update unit status'));
    } finally {
      setTogglingUnit(null);
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
    } catch (err: unknown) {
      console.error('Failed to create input:', err);
      onError?.(getErrorMessage(err, 'Failed to create input'));
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
    } catch (err: unknown) {
      console.error('Failed to create output:', err);
      onError?.(getErrorMessage(err, 'Failed to create output'));
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
    } catch (err: unknown) {
      console.error('Failed to delete:', err);
      onError?.(getErrorMessage(err, 'Failed to delete'));
    } finally {
      setModalSaving(false);
    }
  };

  // FID-20260103-003: Resource and product lists from database for full configurability
  const resourceNames = data?.resources?.map(r => r.resource_name) ?? [];
  const productNames = data?.products?.map(p => p.product_name) ?? [];
  // Combined list for dropdowns that allow any commodity type
  const allCommodities = [...resourceNames, ...productNames];

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="h-64 flex items-center justify-center">
          <Spinner label="Loading configuration..." />
        </CardBody>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full border-danger bg-danger-50 dark:bg-danger-900/20">
        <CardBody className="flex flex-row items-center gap-2 text-danger">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load sector configuration</span>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* FID-20260103-005: Import/Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="flat"
          color="primary"
          startContent={<Download className="w-4 h-4" />}
          onPress={handleExport}
          isDisabled={!data}
        >
          Export Config
        </Button>
        <Button
          variant="flat"
          color="secondary"
          startContent={importing ? <Spinner size="sm" /> : <Upload className="w-4 h-4" />}
          isDisabled={importing}
          onPress={() => document.getElementById('config-import-input')?.click()}
        >
          {importing ? 'Importing...' : 'Import Config'}
        </Button>
        <input
          id="config-import-input"
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      <Tabs 
        aria-label="Configuration Options" 
        color="primary" 
        variant="underlined"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
      >
        <Tab
          key="sectors"
          title={
            <div className="flex items-center space-x-2">
              <Factory className="w-4 h-4" />
              <span>Sectors ({data.sectors.length})</span>
            </div>
          }
        >
          <div className="space-y-2 mt-4">
            <Accordion variant="splitted">
              {data.sectors.map((sector) => {
                const unitConfigs = data.unitConfigs.filter(uc => uc.sector_name === sector.sector_name);
                const sectorInputs = data.inputs.filter(i => i.sector_name === sector.sector_name);
                const sectorOutputs = data.outputs.filter(o => o.sector_name === sector.sector_name);

                return (
                  <AccordionItem
                    key={sector.sector_name}
                    aria-label={sector.sector_name}
                    classNames={{
                      base: sector.is_enabled === false ? 'opacity-60' : '',
                    }}
                    title={
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch
                            size="sm"
                            isSelected={sector.is_enabled !== false}
                            onValueChange={(checked) => handleToggleSectorEnabled(sector.sector_name, checked)}
                            isDisabled={togglingSector === sector.sector_name}
                            aria-label={`Toggle ${sector.sector_name}`}
                          />
                        </div>
                        <span className={`font-medium ${sector.is_enabled === false ? 'text-default-400' : ''}`}>
                          {sector.sector_name}
                        </span>
                        {sector.is_enabled === false && (
                          <Chip size="sm" color="danger" variant="flat">Disabled</Chip>
                        )}
                        {sector.is_production_only && (
                          <Chip size="sm" color="warning" variant="flat">Production Only</Chip>
                        )}
                        {sector.can_extract && (
                          <Chip size="sm" color="warning" variant="flat">Can Extract</Chip>
                        )}
                      </div>
                    }
                    subtitle={
                      <div className="flex items-center gap-4 text-sm text-default-500">
                        {sector.produced_product && (
                          <span>Produces: {sector.produced_product}</span>
                        )}
                        {sector.primary_resource && (
                          <span>Requires: {sector.primary_resource}</span>
                        )}
                      </div>
                    }
                  >
                    <div className="py-2 space-y-4">
                      {/* Unit Configs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(['production', 'retail', 'service', 'extraction'] as UnitType[]).map(unitType => {
                          const config = unitConfigs.find(uc => uc.unit_type === unitType);
                          const inputs = sectorInputs.filter(i => i.unit_type === unitType);
                          const outputs = sectorOutputs.filter(o => o.unit_type === unitType);
                          const Icon = UNIT_TYPE_ICONS[unitType];
                          const color = UNIT_TYPE_COLORS[unitType];

                          if (!config) return null;

                          return (
                            <Card
                              key={unitType}
                              className={`border ${
                                config.is_enabled
                                  ? 'border-default-200'
                                  : 'border-default-100 opacity-60'
                              }`}
                              shadow="sm"
                            >
                              <CardBody className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`w-4 h-4 text-${color}-500`} />
                                    <span className="font-medium capitalize">{unitType}</span>
                                    {!config.is_enabled && (
                                      <span className="text-xs text-default-400">Disabled</span>
                                    )}
                                  </div>

                                  <Switch
                                    size="sm"
                                    isSelected={config.is_enabled}
                                    onValueChange={(checked) => handleToggleUnitEnabled(config, checked)}
                                    isDisabled={togglingUnit === `${config.sector_name}-${config.unit_type}`}
                                    aria-label={`Toggle ${unitType}`}
                                  />
                                </div>

                                {config.is_enabled && (
                                  <>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between items-center h-7">
                                        <span className="text-default-500">Base Revenue:</span>
                                        {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'base_revenue' ? (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              size="sm"
                                              labelPlacement="outside"
                                              type="number"
                                              value={editingUnitConfig.value}
                                              onValueChange={(val) => setEditingUnitConfig({ ...editingUnitConfig, value: val })}
                                              className="w-24"
                                              classNames={{ input: "text-right" }}
                                              autoFocus
                                            />
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              color="success"
                                              onPress={() => handleSaveUnitConfig(config)}
                                              isDisabled={saving === `unit-${config.sector_name}-${config.unit_type}-base_revenue`}
                                            >
                                              <Save className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="light"
                                            className="font-mono h-auto min-w-0 px-1"
                                            onPress={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'base_revenue', value: String(config.base_revenue) })}
                                          >
                                            {formatCurrency(config.base_revenue)}
                                          </Button>
                                        )}
                                      </div>
                                      <div className="flex justify-between items-center h-7">
                                        <span className="text-default-500">Base Cost:</span>
                                        {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'base_cost' ? (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              size="sm"
                                              labelPlacement="outside"
                                              type="number"
                                              value={editingUnitConfig.value}
                                              onValueChange={(val) => setEditingUnitConfig({ ...editingUnitConfig, value: val })}
                                              className="w-24"
                                              classNames={{ input: "text-right" }}
                                              autoFocus
                                            />
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              color="success"
                                              onPress={() => handleSaveUnitConfig(config)}
                                              isDisabled={saving === `unit-${config.sector_name}-${config.unit_type}-base_cost`}
                                            >
                                              <Save className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="light"
                                            className="font-mono h-auto min-w-0 px-1"
                                            onPress={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'base_cost', value: String(config.base_cost) })}
                                          >
                                            {formatCurrency(config.base_cost)}
                                          </Button>
                                        )}
                                      </div>
                                      <div className="flex justify-between items-center h-7">
                                        <span className="text-default-500">Labor Cost:</span>
                                        {editingUnitConfig?.sector === sector.sector_name && editingUnitConfig?.unitType === unitType && editingUnitConfig?.field === 'labor_cost' ? (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              size="sm"
                                              labelPlacement="outside"
                                              type="number"
                                              value={editingUnitConfig.value}
                                              onValueChange={(val) => setEditingUnitConfig({ ...editingUnitConfig, value: val })}
                                              className="w-24"
                                              classNames={{ input: "text-right" }}
                                              autoFocus
                                            />
                                            <Button
                                              isIconOnly
                                              size="sm"
                                              variant="light"
                                              color="success"
                                              onPress={() => handleSaveUnitConfig(config)}
                                              isDisabled={saving === `unit-${config.sector_name}-${config.unit_type}-labor_cost`}
                                            >
                                              <Save className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="light"
                                            className="font-mono h-auto min-w-0 px-1"
                                            onPress={() => setEditingUnitConfig({ sector: sector.sector_name, unitType, field: 'labor_cost', value: String(config.labor_cost) })}
                                          >
                                            {formatCurrency(config.labor_cost)}
                                          </Button>
                                        )}
                                      </div>
                                      {config.output_rate !== null && (
                                        <div className="flex justify-between items-center h-7">
                                          <span className="text-default-500">Output Rate:</span>
                                          <span className="font-mono px-1">{config.output_rate}/hr</span>
                                        </div>
                                      )}
                                    </div>

                                    <Divider className="my-3" />

                                    {/* Inputs */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-default-500 uppercase">Inputs</span>
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          color="primary"
                                          onPress={() => setAddInputModal({ sectorName: sector.sector_name, unitType, isOpen: true })}
                                          className="h-6 w-6 min-w-6"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="space-y-1">
                                        {inputs.map(input => (
                                          <div key={input.id} className="flex justify-between items-center text-xs group h-7">
                                            <span className={input.input_type === 'resource' ? 'text-warning-600 dark:text-warning-400' : 'text-secondary-600 dark:text-secondary-400'}>
                                              {input.input_name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              {editingInput?.id === input.id ? (
                                                <>
                                                  <Input
                                                    size="sm"
                                                    type="number"
                                                    step="0.01"
                                                    value={editingInput.value}
                                                    onValueChange={(val) => setEditingInput({ ...editingInput, value: val })}
                                                    className="w-16"
                                                    classNames={{ input: "text-right px-1" }}
                                                    autoFocus
                                                  />
                                                  <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="success"
                                                    onPress={() => handleSaveInput(input)}
                                                    isDisabled={saving === `input-${input.id}`}
                                                    className="h-6 w-6 min-w-6"
                                                  >
                                                    <Save className="w-3 h-3" />
                                                  </Button>
                                                </>
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="font-mono h-6 min-w-0 px-1 text-xs"
                                                    onPress={() => setEditingInput({ id: input.id, value: String(input.consumption_rate) })}
                                                  >
                                                    {input.consumption_rate}/hr
                                                  </Button>
                                                  <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => setDeleteModal({ type: 'input', id: input.id, name: input.input_name, isOpen: true })}
                                                    className="h-6 w-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        {inputs.length === 0 && (
                                          <span className="text-xs text-default-400">No inputs</span>
                                        )}
                                      </div>
                                    </div>

                                    <Divider className="my-3" />

                                    {/* Outputs */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-default-500 uppercase">Outputs</span>
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          color="primary"
                                          onPress={() => setAddOutputModal({ sectorName: sector.sector_name, unitType, isOpen: true })}
                                          className="h-6 w-6 min-w-6"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="space-y-1">
                                        {outputs.map(output => (
                                          <div key={output.id} className="flex justify-between items-center text-xs group h-7">
                                            <span className={output.output_type === 'resource' ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'}>
                                              {output.output_name}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              {editingOutput?.id === output.id ? (
                                                <>
                                                  <Input
                                                    size="sm"
                                                    type="number"
                                                    step="0.01"
                                                    value={editingOutput.value}
                                                    onValueChange={(val) => setEditingOutput({ ...editingOutput, value: val })}
                                                    className="w-16"
                                                    classNames={{ input: "text-right px-1" }}
                                                    autoFocus
                                                  />
                                                  <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="success"
                                                    onPress={() => handleSaveOutput(output)}
                                                    isDisabled={saving === `output-${output.id}`}
                                                    className="h-6 w-6 min-w-6"
                                                  >
                                                    <Save className="w-3 h-3" />
                                                  </Button>
                                                </>
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="font-mono h-6 min-w-0 px-1 text-xs"
                                                    onPress={() => setEditingOutput({ id: output.id, value: String(output.output_rate) })}
                                                  >
                                                    {output.output_rate}/hr
                                                  </Button>
                                                  <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => setDeleteModal({ type: 'output', id: output.id, name: output.output_name, isOpen: true })}
                                                    className="h-6 w-6 min-w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        {outputs.length === 0 && (
                                          <span className="text-xs text-default-400">No outputs</span>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </CardBody>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </Tab>

        <Tab
          key="products"
          title={
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Products ({data.products.length})</span>
            </div>
          }
        >
          <div className="mt-4">
            <Table aria-label="Products Configuration">
              <TableHeader>
                <TableColumn>PRODUCT</TableColumn>
                <TableColumn align="end">REFERENCE VALUE</TableColumn>
                <TableColumn align="end">MIN PRICE</TableColumn>
              </TableHeader>
              <TableBody>
                {data.products.map(product => (
                  <TableRow key={product.product_name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-secondary" />
                        <span className="font-medium">{product.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {editingProduct?.name === product.product_name && editingProduct?.field === 'reference_value' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              type="number"
                              value={editingProduct.value}
                              onValueChange={(val) => setEditingProduct({ ...editingProduct, value: val })}
                              className="w-28"
                              classNames={{ input: "text-right" }}
                              autoFocus
                            />
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="success"
                              onPress={() => handleSaveProduct(product)}
                              isDisabled={saving === `product-${product.product_name}-reference_value`}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="light"
                            className="font-mono"
                            onPress={() => setEditingProduct({ name: product.product_name, field: 'reference_value', value: String(product.reference_value) })}
                          >
                            {formatCurrency(product.reference_value)}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {editingProduct?.name === product.product_name && editingProduct?.field === 'min_price' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              type="number"
                              value={editingProduct.value}
                              onValueChange={(val) => setEditingProduct({ ...editingProduct, value: val })}
                              className="w-28"
                              classNames={{ input: "text-right" }}
                              autoFocus
                            />
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="success"
                              onPress={() => handleSaveProduct(product)}
                              isDisabled={saving === `product-${product.product_name}-min_price`}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="light"
                            className="font-mono"
                            onPress={() => setEditingProduct({ name: product.product_name, field: 'min_price', value: String(product.min_price) })}
                          >
                            {formatCurrency(product.min_price)}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tab>

        <Tab
          key="resources"
          title={
            <div className="flex items-center space-x-2">
              <Gem className="w-4 h-4" />
              <span>Resources ({data.resources.length})</span>
            </div>
          }
        >
          <div className="mt-4">
            <Table aria-label="Resources Configuration">
              <TableHeader>
                <TableColumn>RESOURCE</TableColumn>
                <TableColumn align="end">BASE PRICE</TableColumn>
              </TableHeader>
              <TableBody>
                {data.resources.map(resource => (
                  <TableRow key={resource.resource_name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-warning" />
                        <span className="font-medium">{resource.resource_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {editingResource?.name === resource.resource_name ? (
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              type="number"
                              value={editingResource.value}
                              onValueChange={(val) => setEditingResource({ ...editingResource, value: val })}
                              className="w-28"
                              classNames={{ input: "text-right" }}
                              autoFocus
                            />
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="success"
                              onPress={() => handleSaveResource(resource)}
                              isDisabled={saving === `resource-${resource.resource_name}`}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="light"
                            className="font-mono"
                            onPress={() => setEditingResource({ name: resource.resource_name, value: String(resource.base_price) })}
                          >
                            {formatCurrency(resource.base_price)}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tab>
      </Tabs>

      {/* Add Input Modal */}
      <Modal 
        isOpen={!!addInputModal?.isOpen} 
        onOpenChange={(open) => !open && setAddInputModal(null)}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add Input to {addInputModal?.sectorName} {addInputModal?.unitType}</ModalHeader>
              <ModalBody>
                <Select
                  label="Input Type"
                  labelPlacement="outside"
                  selectedKeys={[newInputForm.inputType]}
                  onChange={(e) => setNewInputForm({ ...newInputForm, inputType: e.target.value as 'resource' | 'product', inputName: '' })}
                >
                  <SelectItem key="resource">Resource</SelectItem>
                  <SelectItem key="product">Product</SelectItem>
                </Select>
                <Select
                  label="Input Name"
                  labelPlacement="outside"
                  selectedKeys={newInputForm.inputName ? [newInputForm.inputName] : []}
                  onChange={(e) => setNewInputForm({ ...newInputForm, inputName: e.target.value })}
                >
                  {(newInputForm.inputType === 'resource' ? resourceNames : productNames).map(name => (
                    <SelectItem key={name}>{name}</SelectItem>
                  ))}
                </Select>
                <Input
                  label="Consumption Rate (per hour)"
                  labelPlacement="outside"
                  type="number"
                  step="0.1"
                  min="0"
                  value={String(newInputForm.consumptionRate)}
                  onValueChange={(val) => setNewInputForm({ ...newInputForm, consumptionRate: parseFloat(val) || 0 })}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateInput}
                  isLoading={modalSaving}
                  isDisabled={!newInputForm.inputName}
                >
                  Add Input
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add Output Modal */}
      <Modal 
        isOpen={!!addOutputModal?.isOpen} 
        onOpenChange={(open) => !open && setAddOutputModal(null)}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add Output to {addOutputModal?.sectorName} {addOutputModal?.unitType}</ModalHeader>
              <ModalBody>
                <Select
                  label="Output Type"
                  labelPlacement="outside"
                  selectedKeys={[newOutputForm.outputType]}
                  onChange={(e) => setNewOutputForm({ ...newOutputForm, outputType: e.target.value as 'resource' | 'product', outputName: '' })}
                >
                  <SelectItem key="resource">Resource</SelectItem>
                  <SelectItem key="product">Product</SelectItem>
                </Select>
                <Select
                  label="Output Name"
                  labelPlacement="outside"
                  selectedKeys={newOutputForm.outputName ? [newOutputForm.outputName] : []}
                  onChange={(e) => setNewOutputForm({ ...newOutputForm, outputName: e.target.value })}
                >
                  {(newOutputForm.outputType === 'resource' ? resourceNames : productNames).map(name => (
                    <SelectItem key={name}>{name}</SelectItem>
                  ))}
                </Select>
                <Input
                  label="Output Rate (per hour)"
                  labelPlacement="outside"
                  type="number"
                  step="0.1"
                  min="0"
                  value={String(newOutputForm.outputRate)}
                  onValueChange={(val) => setNewOutputForm({ ...newOutputForm, outputRate: parseFloat(val) || 0 })}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateOutput}
                  isLoading={modalSaving}
                  isDisabled={!newOutputForm.outputName}
                >
                  Add Output
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteModal?.isOpen} 
        onOpenChange={(open) => !open && setDeleteModal(null)}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Delete</ModalHeader>
              <ModalBody>
                <p>Are you sure you want to delete the {deleteModal?.type} <strong>{deleteModal?.name}</strong>?</p>
                <p className="text-sm text-default-500">This action cannot be undone.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={modalSaving}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
