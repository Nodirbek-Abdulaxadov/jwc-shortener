// Domain models (ported from breezy src/types/data.ts, extended for the
// Angular rebuild). Status unions drive PrimeNG Tag severities in the tables.

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';

export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: EmployeeStatus;
}

export type ProductStatus = 'Active' | 'Limited' | 'Out of Stock';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded';

export interface Order {
  id: string;
  customer: string;
  total: number;
  payment: PaymentStatus;
  fulfillment: string;
  date: string;
}

export type CustomerStatus = 'Active' | 'Churned' | 'Prospect';

export interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  orders: number;
  spent: number;
  status: CustomerStatus;
}

export interface DashboardStat {
  key: string;
  label: string;
  value: string;
  delta: number;
  icon: string;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Message {
  id: number;
  from: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'meeting' | 'deadline' | 'reminder';
}
