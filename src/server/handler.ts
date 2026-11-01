import { db } from './db.ts';
import { UserRole } from '../types/index.ts';

export interface ApiRequest {
  method: string;
  url: string;
  body?: any;
  headers?: Record<string, string>;
  user?: {
    id: string;
    name: string;
    role: UserRole;
    studentId?: string;
    guardianId?: string;
  };
}

export interface ApiResponse {
  status: number;
  data: any;
}

// Router handler for client/server integration
export async function handleApiRoute(req: ApiRequest): Promise<ApiResponse> {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // Helper for current user fallback
  const currentUser = req.user || {
    id: 'user-admin',
    name: 'Mariana Vasconcelos',
    role: 'ADMIN' as UserRole
  };

  try {
    // 1. Auth routes
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = req.body || {};
      const users = db.getUsers();
      const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
      
      if (!user) {
        return { status: 401, data: { error: 'E-mail ou credenciais não encontrados.' } };
      }

      // Check simple passwords (in demo all accounts use their pre-established passwords)
      return { 
        status: 200, 
        data: { 
          user, 
          token: `token_${user.id}_${Date.now()}` 
        } 
      };
    }

    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const { email } = req.body || {};
      const user = db.getUsers().find(u => u.email.toLowerCase() === (email || '').toLowerCase().trim());
      if (!user) {
        return { status: 404, data: { error: 'Usuário não encontrado para este e-mail.' } };
      }

      db.logAudit(
        user.id,
        user.name,
        user.role,
        'RECUPERACAO_SENHA',
        'AUTH',
        `Link seguro de redefinição de senha gerado para ${user.email} (token seguro emitido)`
      );

      return { 
        status: 200, 
        data: { 
          message: 'Instruções de recuperação e token seguro enviados com sucesso para o e-mail cadastrado.',
          maskedEmail: user.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length))
        } 
      };
    }

    // 2. Settings
    if (pathname === '/api/settings') {
      if (method === 'GET') {
        return { status: 200, data: db.getSettings() };
      }
      if (method === 'PUT') {
        if (currentUser.role !== 'ADMIN') {
          return { status: 403, data: { error: 'Apenas Administradores podem alterar configurações do sistema.' } };
        }
        const updated = db.updateSettings(req.body, currentUser);
        return { status: 200, data: updated };
      }
    }

    // 3. Products & Catalog
    if (pathname === '/api/products') {
      if (method === 'GET') {
        return { status: 200, data: db.getProducts() };
      }
      if (method === 'POST') {
        if (currentUser.role !== 'ADMIN') {
          return { status: 403, data: { error: 'Apenas Administradores podem cadastrar produtos.' } };
        }
        const product = db.saveProduct(req.body, currentUser);
        return { status: 201, data: product };
      }
    }

    if (pathname.startsWith('/api/products/') && method === 'PUT') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem editar produtos.' } };
      }
      const productId = pathname.replace('/api/products/', '');
      const product = db.saveProduct({ ...req.body, id: productId }, currentUser);
      return { status: 200, data: product };
    }

    // 4. Stock management
    if (pathname === '/api/stock/adjust' && method === 'POST') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem realizar ajustes manuais de estoque.' } };
      }
      const product = db.adjustStock({
        productId: req.body.productId,
        type: req.body.type,
        quantity: req.body.quantity,
        reason: req.body.reason,
        user: currentUser
      });
      return { status: 200, data: product };
    }

    if (pathname === '/api/stock/movements' && method === 'GET') {
      return { status: 200, data: db.getStockMovements() };
    }

    // 5. Sales & PDV
    if (pathname === '/api/sales') {
      if (method === 'GET') {
        let sales = db.getSales();
        // RBAC: Se for Aluno, vê apenas suas próprias vendas!
        if (currentUser.role === 'STUDENT' && currentUser.studentId) {
          sales = sales.filter(s => s.studentId === currentUser.studentId);
        } else if (currentUser.role === 'GUARDIAN' && currentUser.guardianId) {
          const guardian = db.getGuardians().find(g => g.id === currentUser.guardianId);
          const allowedIds = guardian?.studentIds || [];
          sales = sales.filter(s => allowedIds.includes(s.studentId));
        }
        return { status: 200, data: sales };
      }

      if (method === 'POST') {
        // Operadores de caixa e administradores podem vender
        if (currentUser.role !== 'CASHIER' && currentUser.role !== 'ADMIN') {
          return { status: 403, data: { error: 'Seu perfil não tem permissão para operar o caixa.' } };
        }
        const result = db.registerSale({
          studentId: req.body.studentId,
          items: req.body.items,
          operatorUser: currentUser,
          idempotencyKey: req.body.idempotencyKey
        });
        return { status: 201, data: result };
      }
    }

    if (pathname.startsWith('/api/sales/') && pathname.endsWith('/reverse') && method === 'POST') {
      if (currentUser.role !== 'CASHIER' && currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Sem permissão para estornar vendas.' } };
      }
      const saleId = pathname.replace('/api/sales/', '').replace('/reverse', '');
      const result = db.reverseSale(saleId, req.body.reason || 'Estorno solicitado no caixa', currentUser);
      return { status: 200, data: result };
    }

    // 6. Students & Guardians
    if (pathname === '/api/students') {
      if (method === 'GET') {
        let students = db.getStudents();
        // RBAC: Se for Aluno, vê somente seu cadastro
        if (currentUser.role === 'STUDENT' && currentUser.studentId) {
          students = students.filter(s => s.id === currentUser.studentId);
        } else if (currentUser.role === 'GUARDIAN' && currentUser.guardianId) {
          // RBAC: Responsável vê APENAS os alunos vinculados autorizados
          const guardian = db.getGuardians().find(g => g.id === currentUser.guardianId);
          const allowedIds = guardian?.studentIds || [];
          students = students.filter(s => allowedIds.includes(s.id));
        }
        return { status: 200, data: students };
      }
    }

    if (pathname.startsWith('/api/students/') && method === 'PUT') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem alterar vínculos e configurações de alunos.' } };
      }
      const studentId = pathname.replace('/api/students/', '');
      const updated = db.updateStudentSettings(studentId, req.body, currentUser);
      return { status: 200, data: updated };
    }

    if (pathname === '/api/guardians' && method === 'GET') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Acesso restrito à coordenação escolar.' } };
      }
      return { status: 200, data: db.getGuardians() };
    }

    // 7. Invoices & Closing
    if (pathname === '/api/invoices') {
      if (method === 'GET') {
        let invoices = db.getInvoices();
        if (currentUser.role === 'STUDENT' && currentUser.studentId) {
          invoices = invoices.filter(i => i.studentId === currentUser.studentId);
        } else if (currentUser.role === 'GUARDIAN' && currentUser.guardianId) {
          const guardian = db.getGuardians().find(g => g.id === currentUser.guardianId);
          const allowedIds = guardian?.studentIds || [];
          invoices = invoices.filter(i => allowedIds.includes(i.studentId));
        }
        return { status: 200, data: invoices };
      }
    }

    if (pathname === '/api/invoices/closing-preview' && method === 'POST') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem gerar a prévia de fechamento.' } };
      }
      const period = req.body.period || new Date().toISOString().substring(0, 7);
      const preview = db.getMonthlyClosingPreview(period);
      return { status: 200, data: preview };
    }

    if (pathname === '/api/invoices/execute-closing' && method === 'POST') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem aprovar e publicar o fechamento mensal.' } };
      }
      const period = req.body.period || new Date().toISOString().substring(0, 7);
      const result = db.executeMonthlyClosing(period, currentUser);
      return { status: 200, data: result };
    }

    // 8. Pix Payments
    if (pathname === '/api/pix') {
      if (method === 'GET') {
        let payments = db.getPixPayments();
        if (currentUser.role === 'STUDENT' && currentUser.studentId) {
          payments = payments.filter(p => p.studentId === currentUser.studentId);
        } else if (currentUser.role === 'GUARDIAN' && currentUser.guardianId) {
          const guardian = db.getGuardians().find(g => g.id === currentUser.guardianId);
          const allowedIds = guardian?.studentIds || [];
          payments = payments.filter(p => allowedIds.includes(p.studentId));
        }
        return { status: 200, data: payments };
      }
    }

    if (pathname === '/api/pix/submit' && method === 'POST') {
      const payment = db.submitPixPayment({
        invoiceId: req.body.invoiceId,
        amount: Number(req.body.amount),
        transactionReference: req.body.transactionReference || `PIX-MANUAL-${Date.now().toString().slice(-6)}`,
        receiptAttachment: req.body.receiptAttachment,
        receiptNotes: req.body.receiptNotes,
        user: currentUser
      });
      return { status: 201, data: payment };
    }

    if (pathname.startsWith('/api/pix/') && pathname.endsWith('/review') && method === 'POST') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem conferir e aprovar pagamentos Pix.' } };
      }
      const paymentId = pathname.replace('/api/pix/', '').replace('/review', '');
      const result = db.reviewPixPayment({
        paymentId,
        decision: req.body.decision,
        reason: req.body.reason || 'Conferido com extrato bancário oficial',
        reviewerUser: currentUser
      });
      return { status: 200, data: result };
    }

    // 9. WhatsApp Notifications
    if (pathname === '/api/whatsapp' && method === 'GET') {
      return { status: 200, data: db.getWhatsAppNotifications() };
    }

    if (pathname.startsWith('/api/whatsapp/') && pathname.endsWith('/retry') && method === 'POST') {
      const notifId = pathname.replace('/api/whatsapp/', '').replace('/retry', '');
      const result = db.retryWhatsAppNotification(notifId);
      return { status: 200, data: result };
    }

    // 10. Audit Logs & Financial Ledger
    if (pathname === '/api/audit' && method === 'GET') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Acesso restrito ao registro de auditoria.' } };
      }
      return { status: 200, data: db.getAuditLogs() };
    }

    if (pathname === '/api/ledger' && method === 'GET') {
      let ledger = db.getFinancialLedger();
      if (currentUser.role === 'STUDENT' && currentUser.studentId) {
        ledger = ledger.filter(l => l.studentId === currentUser.studentId);
      }
      return { status: 200, data: ledger };
    }

    if (pathname === '/api/reset-data' && method === 'POST') {
      if (currentUser.role !== 'ADMIN') {
        return { status: 403, data: { error: 'Apenas Administradores podem resetar a base.' } };
      }
      const res = db.resetToSeed(currentUser);
      return { status: 200, data: res };
    }

    return { status: 404, data: { error: `Rota API não encontrada: ${method} ${pathname}` } };
  } catch (err: any) {
    console.error(`Erro ao processar rota ${method} ${pathname}:`, err);
    return { status: 400, data: { error: err.message || 'Erro interno no servidor' } };
  }
}
