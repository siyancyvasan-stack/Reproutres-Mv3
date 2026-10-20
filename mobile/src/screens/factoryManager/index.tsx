import React from 'react';
import { ModuleListScreen } from '../shared/ModuleListScreen';

export const ProductionListScreen = ({ navigation }: any) => <ModuleListScreen title="Production" endpoint="/api/v1/factory/production" onItemPress={item => navigation.navigate('ProductionDetail', { item })} />;
export const ProductionDetailScreen = ({ route }: any) => <ModuleListScreen title={route.params?.item?.product?.name ?? 'Production detail'} subtitle={`Status: ${route.params?.item?.status ?? 'Unknown'}`} />;
export const UpdateProductionScreen = () => <ModuleListScreen title="Update production" subtitle="Record progress, quality quantities and notes" />;
export const InventoryOverviewScreen = ({ navigation }: any) => <ModuleListScreen title="Inventory" subtitle="Finished goods and raw materials" endpoint="/api/v1/factory/products" onItemPress={item => navigation.navigate('StockDetail', { item })} />;
export const StockItemDetailScreen = ({ route }: any) => <ModuleListScreen title={route.params?.item?.name ?? 'Stock detail'} subtitle={`SKU: ${route.params?.item?.sku ?? ''}`} />;
export const StockAdjustmentScreen = () => <ModuleListScreen title="Stock adjustment" subtitle="Stock in/out, reserve, release or damage" />;
export const MachineLineStatusScreen = () => <ModuleListScreen title="Machines & lines" endpoint="/api/v1/factory/machines" />;
export const FactoryReportsScreen = () => <ModuleListScreen title="Factory reports" endpoint="/api/v1/factory/reports" />;
