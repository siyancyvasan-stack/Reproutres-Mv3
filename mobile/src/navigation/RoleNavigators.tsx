import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/shared/DashboardScreen';
import { NotificationsScreen } from '../screens/shared/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';
import { SyncStatusScreen } from '../screens/shared/SyncStatusScreen';
import * as PM from '../screens/projectManager';
import * as Factory from '../screens/factoryManager';
import * as Sales from '../screens/salesPerson';

const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const options = { headerShown: false };

function ProjectStack() { return <Stack.Navigator><Stack.Screen name="ProjectList" component={PM.ProjectListScreen} options={options} /><Stack.Screen name="ProjectDetail" component={PM.ProjectDetailScreen} /><Stack.Screen name="Tasks" component={PM.TaskListScreen} /><Stack.Screen name="AssignTask" component={PM.AssignTaskScreen} /><Stack.Screen name="Progress" component={PM.ProgressTrackingScreen} /></Stack.Navigator>; }
function ProjectMoreStack() { return <Stack.Navigator><Stack.Screen name="TeamStatus" component={PM.TeamStatusScreen} options={options} /><Stack.Screen name="Reports" component={PM.ProjectReportsScreen} /><Stack.Screen name="Notifications" component={NotificationsScreen} /><Stack.Screen name="Settings" component={SettingsScreen} /><Stack.Screen name="SyncStatus" component={SyncStatusScreen} /></Stack.Navigator>; }
export function ProjectManagerNavigator() { return <Tab.Navigator screenOptions={options}><Tab.Screen name="Dashboard" component={DashboardScreen} /><Tab.Screen name="Projects" component={ProjectStack} /><Tab.Screen name="Team" component={PM.TeamStatusScreen} /><Tab.Screen name="Reports" component={PM.ProjectReportsScreen} /><Tab.Screen name="More" component={ProjectMoreStack} /></Tab.Navigator>; }

function ProductionStack() { return <Stack.Navigator><Stack.Screen name="ProductionList" component={Factory.ProductionListScreen} options={options} /><Stack.Screen name="ProductionDetail" component={Factory.ProductionDetailScreen} /><Stack.Screen name="UpdateProduction" component={Factory.UpdateProductionScreen} /></Stack.Navigator>; }
function InventoryStack() { return <Stack.Navigator><Stack.Screen name="InventoryOverview" component={Factory.InventoryOverviewScreen} options={options} /><Stack.Screen name="StockDetail" component={Factory.StockItemDetailScreen} /><Stack.Screen name="StockAdjustment" component={Factory.StockAdjustmentScreen} /></Stack.Navigator>; }
export function FactoryManagerNavigator() { return <Tab.Navigator screenOptions={options}><Tab.Screen name="Dashboard" component={DashboardScreen} /><Tab.Screen name="Production" component={ProductionStack} /><Tab.Screen name="Inventory" component={InventoryStack} /><Tab.Screen name="Factory" component={Factory.MachineLineStatusScreen} /><Tab.Screen name="More" component={ProfileScreen} /></Tab.Navigator>; }

function CustomerStack() { return <Stack.Navigator><Stack.Screen name="CustomerList" component={Sales.CustomerListScreen} options={options} /><Stack.Screen name="CustomerDetail" component={Sales.CustomerDetailScreen} /><Stack.Screen name="AddCustomer" component={Sales.AddCustomerScreen} /></Stack.Navigator>; }
function OrderStack() { return <Stack.Navigator><Stack.Screen name="OrderHistory" component={Sales.OrderHistoryScreen} options={options} /><Stack.Screen name="OrderDetail" component={Sales.OrderDetailScreen} /><Stack.Screen name="CreateOrder" component={Sales.CreateOrderScreen} /><Stack.Screen name="Catalog" component={Sales.ProductCatalogScreen} /></Stack.Navigator>; }
function VisitStack() { return <Stack.Navigator><Stack.Screen name="VisitList" component={Sales.VisitListScreen} options={options} /><Stack.Screen name="VisitCheckIn" component={Sales.VisitCheckInScreen} /><Stack.Screen name="ActiveVisit" component={Sales.ActiveVisitScreen} /></Stack.Navigator>; }
export function SalesPersonNavigator() { return <Tab.Navigator screenOptions={options}><Tab.Screen name="Dashboard" component={DashboardScreen} /><Tab.Screen name="Customers" component={CustomerStack} /><Tab.Screen name="Orders" component={OrderStack} /><Tab.Screen name="Visits" component={VisitStack} /><Tab.Screen name="More" component={ProfileScreen} /></Tab.Navigator>; }
