import { 
  User, 
  Product, 
  Sale, 
  Student, 
  Guardian, 
  Invoice, 
  PixPayment, 
  StockMovement, 
  FinancialTransaction, 
  WhatsAppNotification, 
  AuditLog, 
  SystemSettings, 
  MonthlyClosingPreview 
} from '../types';

let currentUserId: string = 'user-admin';

export function setApiUserId(id: string) {
  currentUserId = id;
}

export function getApiUserId() {
  return currentUserId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
    ...(options.headers as Record<string, string> || {})
  };

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password?: string) {
    return request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async resetPassword(email: string) {
    return request<{ message: string; maskedEmail: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Settings
  async getSettings() {
    return request<SystemSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<SystemSettings>) {
    return request<SystemSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // Products & Stock
  async getProducts() {
    return request<Product[]>('/api/products');
  },

  async createProduct(product: Partial<Product>) {
    return request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  },

  async updateProduct(id: string, product: Partial<Product>) {
    return request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
  },

  async adjustStock(params: { productId: string; type: 'ENTRADA' | 'AJUSTE_MANUAL'; quantity: number; reason: string }) {
    return request<Product>('/api/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getStockMovements() {
    return request<StockMovement[]>('/api/stock/movements');
  },

  // Sales
  async getSales() {
    return request<Sale[]>('/api/sales');
  },

  async createSale(params: { studentId: string; items: { productId: string; quantity: number }[]; idempotencyKey?: string }) {
    return request<{ sale: Sale; student: Student }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async reverseSale(saleId: string, reason: string) {
    return request<{ sale: Sale; student: Student }>(`/api/sales/${saleId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Students & Guardians
  async getStudents() {
    return request<Student[]>('/api/students');
  },

  async updateStudent(id: string, updates: Partial<Student>) {
    return request<Student>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getGuardians() {
    return request<Guardian[]>('/api/guardians');
  },

  // Invoices & Closing
  async getInvoices() {
    return request<Invoice[]>('/api/invoices');
  },

  async getClosingPreview(period?: string) {
    return request<MonthlyClosingPreview>('/api/invoices/closing-preview', {
      method: 'POST',
      body: JSON.stringify({ period })
    });
  },

  async executeMonthlyClosing(period?: string) {
    return request<{ period: string; invoicesCreated: number; invoices: Invoice[] }>('/api/invoices/execute-closing', {
      method: 'POST',
      body: JSON.stringify({ period })
    });
  },

  // Pix Payments
  async getPixPayments() {
    return request<PixPayment[]>('/api/pix');
  },

  async submitPixPayment(params: {
    invoiceId: string;
    amount: number;
    transactionReference?: string;
    receiptAttachment?: string;
    receiptNotes?: string;
  }) {
    return request<PixPayment>('/api/pix/submit', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async reviewPixPayment(paymentId: string, decision: 'APROVADO' | 'REJEITADO', reason: string) {
    return request<{ payment: PixPayment; invoice: Invoice }>(`/api/pix/${paymentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason })
    });
  },

  // WhatsApp Automation
  async getWhatsAppNotifications() {
    return request<WhatsAppNotification[]>('/api/whatsapp');
  },

  async retryWhatsAppNotification(id: string) {
    return request<WhatsAppNotification>(`/api/whatsapp/${id}/retry`, {
      method: 'POST'
    });
  },

  // Audit Logs & Ledger
  async getAuditLogs() {
    return request<AuditLog[]>('/api/audit');
  },

  async getFinancialLedger() {
    return request<FinancialTransaction[]>('/api/ledger');
  },

  // Reset database to seed
  async resetData() {
    return request<{ success: boolean }>('/api/reset-data', {
      method: 'POST'
    });
  }
};
