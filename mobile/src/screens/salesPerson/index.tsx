import React from 'react';
import { ModuleListScreen } from '../shared/ModuleListScreen';

export const CustomerListScreen = ({ navigation }: any) => <ModuleListScreen title="Customers & leads" endpoint="/api/v1/shops" onItemPress={item => navigation.navigate('CustomerDetail', { item })} />;
export const CustomerDetailScreen = ({ route }: any) => <ModuleListScreen title={route.params?.item?.name ?? 'Customer detail'} subtitle={route.params?.item?.address} />;
export const AddCustomerScreen = () => <ModuleListScreen title="Add customer or lead" subtitle="Capture identity, address and GPS location" />;
export const ProductCatalogScreen = () => <ModuleListScreen title="Product catalog" endpoint="/api/v1/products" />;
export const CreateOrderScreen = () => <ModuleListScreen title="Create order" subtitle="Select a customer, products and quantities" />;
export const OrderHistoryScreen = ({ navigation }: any) => <ModuleListScreen title="Order history" endpoint="/api/v1/orders" onItemPress={item => navigation.navigate('OrderDetail', { item })} />;
export const OrderDetailScreen = ({ route }: any) => <ModuleListScreen title={`Order ${route.params?.item?.id?.slice(-8) ?? ''}`} subtitle={route.params?.item?.status} />;
export const VisitListScreen = ({ navigation }: any) => <ModuleListScreen title="Visits" subtitle="Plan and record customer visits" endpoint="/api/v1/shops" onItemPress={item => navigation.navigate('VisitCheckIn', { item })} />;
export const VisitCheckInScreen = ({ route }: any) => <ModuleListScreen title="Visit check-in" subtitle={`Capture GPS arrival at ${route.params?.item?.name ?? 'customer'}`} />;
export const ActiveVisitScreen = () => <ModuleListScreen title="Active visit" subtitle="Add notes, create an order or check out" />;
export const SalesTargetsScreen = () => <ModuleListScreen title="Sales targets" endpoint="/api/v1/analytics/dashboard" />;
