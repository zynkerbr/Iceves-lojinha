import React, { useState } from 'react';
import { 
  Receipt, 
  QrCode, 
  Calendar, 
  CreditCard, 
  Copy, 
  Check, 
  Upload, 
  Printer, 
  AlertCircle, 
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Student, Sale, Invoice, PixPayment } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPeriod, generatePixQrSvg } from '../../utils/formatters';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface StudentPortalProps {
  student: Student;
  sales: Sale[];
  invoices: Invoice[];
  pixPayments: PixPayment[];
  onPaymentSubmitted: (payment: PixPayment) => void;
}

export function StudentPortal({ 
  student, 
  sales, 
  invoices, 
  pixPayments, 
  onPaymentSubmitted 
}: StudentPortalProps) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'consumption' | 'invoices'>('consumption');
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Pix payment notification form
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPix, setIsSubmittingPix] = useState(false);
  const [pixSuccess, setPixSuccess] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  // Student's own sales (unbilled consumption)
  const studentSales = sales.filter(s => s.studentId === student.id);
  const studentInvoices = invoices.filter(i => i.studentId === student.id && i.status !== 'CANCELADA');
  const studentPix = pixPayments.filter(p => p.studentId === student.id);

  const copyPix = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2000);
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount(invoice.remainingBalance);
    setTransactionRef(`E18423891202610${Date.now().toString().slice(-6)}`);
    setPaymentNotes('');
    setPixError(null);
    setPixSuccess(false);
  };

  const handleSubmitPixPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    if (paymentAmount <= 0) {
      setPixError('O valor informado deve ser maior que zero.');
      return;
    }

    setIsSubmittingPix(true);
    setPixError(null);

    try {
      const created = await api.submitPixPayment({
        invoiceId: selectedInvoiceForPayment.id,
        amount: paymentAmount,
        transactionReference: transactionRef,
        receiptNotes: paymentNotes || 'Comprovante submetido via Portal do Aluno',
        receiptAttachment: 'Comprovante_Aluno.pdf'
      });
      onPaymentSubmitted(created);
      setPixSuccess(true);
      setTimeout(() => {
        setSelectedInvoiceForPayment(null);
        setPixSuccess(false);
      }, 1500);
    } catch (err: any) {
      setPixError(err.message || 'Erro ao submeter comprovante.');
    } finally {
      setIsSubmittingPix(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Student Welcome Header Card - Dark Theme */}
      <div className="bg-[#1B1B1B] rounded-2xl p-6 border border-[#282828] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img 
              src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'} 
              alt={student.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#8B7CFF]/40 shadow-lg"
            />
            <div>
              <span className="text-[11px] bg-[#8B7CFF]/15 text-[#8B7CFF] font-semibold px-2.5 py-0.5 rounded-md border border-[#8B7CFF]/30 inline-block mb-1">
                Portal Individual do Aluno
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F5F5F5] tracking-tight">
                {student.name}
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Matrícula: <strong className="font-mono text-[#F5F5F5]">{student.registrationNumber}</strong> • Turma: {student.classGroup}
              </p>
            </div>
          </div>

          {/* Quick Balance Indicators */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="bg-[#151515] px-4 py-3 rounded-xl border border-[#282828] min-w-[140px]">
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider block font-semibold mb-0.5">Consumo Aberto</span>
              <span className="text-lg font-bold text-[#8B7CFF]">{formatCurrency(student.currentConsumptionBalance)}</span>
            </div>
            <div className="bg-[#151515] px-4 py-3 rounded-xl border border-[#282828] min-w-[140px]">
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider block font-semibold mb-0.5">Saldo Devedor Total</span>
              <span className="text-lg font-bold text-[#F5F5F5]">{formatCurrency(student.totalOpenDebt)}</span>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#151515] p-1 rounded-xl mt-6 border border-[#282828] max-w-md">
          <button
            onClick={() => setActiveTab('consumption')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'consumption' ? 'bg-[#222222] text-[#F5F5F5] shadow-xs border border-[#303030]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-[#8B7CFF]" />
            Consumo no Balcão ({studentSales.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'invoices' ? 'bg-[#222222] text-[#F5F5F5] shadow-xs border border-[#303030]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#8B7CFF]" />
            Faturas & Pix ({studentInvoices.length})
          </button>
        </div>
      </div>

      {activeTab === 'consumption' ? (
        /* Detailed Consumption History */
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#F5F5F5] text-base">Extrato de Compras na Lojinha</h3>
              <p className="text-xs text-[#A1A1AA]">
                Itens consumidos no balcão consolidados na sua conta individual
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] border border-[#303030] rounded-xl text-xs font-medium text-[#F5F5F5] flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-3.5 h-3.5 text-[#A1A1AA]" />
              Imprimir Extrato
            </button>
          </div>

          {studentSales.length === 0 ? (
            <div className="py-12 text-center text-[#A1A1AA] text-xs">
              Nenhuma compra registrada no seu nome até o momento.
            </div>
          ) : (
            <div className="divide-y divide-[#242424] border border-[#282828] rounded-xl overflow-hidden bg-[#151515]">
              {studentSales.map(sale => (
                <div key={sale.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1A1A1A] transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#8B7CFF]">{sale.id}</span>
                      <span className="text-[11px] text-[#A1A1AA]">• {formatDateTime(sale.createdAt)}</span>
                      {sale.status === 'REVERSED' && (
                        <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-800/50 font-semibold px-2 py-0.5 rounded-full">
                          Compra Estornada
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {sale.items.map((it, idx) => (
                        <div key={idx} className="text-xs text-[#D4D4D8] flex items-center gap-2">
                          <span className="font-semibold text-[#F5F5F5]">{it.quantity}x</span>
                          <span>{it.name}</span>
                          <span className="text-[#A1A1AA] font-mono text-[11px]">({formatCurrency(it.unitPrice)} un.)</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#71717A]">Atendido por: {sale.operatorUserName}</p>
                  </div>

                  <div className="text-right">
                    <span className={`text-base font-bold ${sale.status === 'REVERSED' ? 'line-through text-[#71717A]' : 'text-[#F5F5F5]'}`}>
                      {formatCurrency(sale.total)}
                    </span>
                    <span className="block text-[10px] text-[#A1A1AA]">Conta Mensal</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Invoices & Pix Payment */
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div>
            <h3 className="font-bold text-[#F5F5F5] text-base">Minhas Faturas & Pagamento Pix</h3>
            <p className="text-xs text-[#A1A1AA]">
              Consolidação de mensalidade e consumo da lojinha com código Pix Copia e Cola
            </p>
          </div>

          <div className="space-y-4">
            {studentInvoices.length === 0 ? (
              <div className="py-12 text-center text-[#A1A1AA] text-xs">
                Nenhuma fatura emitida até o momento.
              </div>
            ) : (
              studentInvoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  className="p-5 rounded-2xl border border-[#282828] bg-[#151515] hover:border-[#383838] transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242424] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#8B7CFF]">{invoice.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          invoice.status === 'PAGA' 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                            : invoice.status === 'PARCIALMENTE_PAGA' 
                            ? 'bg-blue-950/60 text-blue-400 border-blue-800/40' 
                            : 'bg-[#222222] text-[#F5F5F5] border-[#383838]'
                        }`}>
                          {invoice.status === 'PAGA' ? 'Quitada' : invoice.status === 'PARCIALMENTE_PAGA' ? 'Parcialmente Paga' : 'Publicada (Em Aberto)'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#F5F5F5] mt-1">
                        Fatura de {formatPeriod(invoice.billingPeriod)}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider block font-semibold">Vencimento</span>
                      <span className="text-xs font-bold text-[#F5F5F5] font-mono">{formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>

                  {/* Values table */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#1E1E1E] p-3.5 rounded-xl border border-[#282828]">
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] block">Mensalidade:</span>
                      <span className="font-semibold text-[#F5F5F5]">{formatCurrency(invoice.tuitionAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] block">Consumo Lojinha:</span>
                      <span className="font-semibold text-[#8B7CFF]">{formatCurrency(invoice.canteenConsumptionTotal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] block">Total Faturado:</span>
                      <span className="font-semibold text-[#F5F5F5]">{formatCurrency(invoice.grossTotal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#A1A1AA] block">Saldo Restante:</span>
                      <span className={`font-bold text-sm ${invoice.remainingBalance === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(invoice.remainingBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Pix section if there is pending balance */}
                  {invoice.remainingBalance > 0 && (
                    <div className="p-4 bg-[#1E1E1E] rounded-xl border border-[#282828] flex flex-col sm:flex-row items-center gap-4">
                      <img 
                        src={generatePixQrSvg(invoice.pixQrCodePayload)} 
                        alt="Pix QR Code" 
                        className="w-24 h-24 bg-white p-1.5 rounded-xl border border-white/20 shadow-md shrink-0"
                      />
                      <div className="flex-1 space-y-2 w-full text-xs">
                        <p className="font-semibold text-[#F5F5F5]">
                          Pagar via Pix (Copia e Cola):
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={invoice.pixCopyPasteCode}
                            className="w-full p-2 text-[10px] font-mono bg-[#151515] border border-[#303030] rounded-lg text-[#D4D4D8] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => copyPix(invoice.pixCopyPasteCode, invoice.id)}
                            className="px-3.5 py-2 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedPixId === invoice.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedPixId === invoice.id ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>

                        <div className="pt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPaymentModal(invoice)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Informar Pagamento Realizado
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Submit Pix Proof Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1B] rounded-2xl shadow-2xl border border-[#282828] max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#282828]">
              <h3 className="font-bold text-[#F5F5F5] text-base">
                Enviar Comprovante Pix
              </h3>
              <button 
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-[#A1A1AA] hover:text-[#F5F5F5] text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-[#151515] rounded-xl border border-[#282828] text-xs space-y-1 mb-4 text-[#A1A1AA]">
              <p>Fatura: <strong className="text-[#F5F5F5]">{selectedInvoiceForPayment.id}</strong></p>
              <p>Competência: <strong className="text-[#F5F5F5]">{formatPeriod(selectedInvoiceForPayment.billingPeriod)}</strong></p>
              <p>Saldo Restante: <strong className="text-[#8B7CFF]">{formatCurrency(selectedInvoiceForPayment.remainingBalance)}</strong></p>
            </div>

            {pixSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Comprovante enviado com sucesso! Está na fila de conferência administrativa.</span>
              </div>
            )}

            {pixError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/50 text-red-300 text-xs rounded-xl">
                {pixError}
              </div>
            )}

            <form onSubmit={handleSubmitPixPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#F5F5F5] mb-1">Valor do Pagamento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoiceForPayment.remainingBalance}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none font-bold"
                  required
                />
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">Pagamentos parciais são aceitos.</p>
              </div>

              <div>
                <label className="block font-medium text-[#F5F5F5] mb-1">ID da Transação do Banco</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Ex: E1842389120261029..."
                  className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl font-mono text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-[#F5F5F5] mb-1">Observações do Comprovante</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Pagamento efetuado via Nubank / Banco do Brasil às 14:20..."
                  rows={2}
                  className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="flex-1 py-2 px-3 bg-[#222222] border border-[#303030] text-[#A1A1AA] rounded-xl font-medium hover:text-[#F5F5F5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPix}
                  className="flex-1 py-2 px-3 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white rounded-xl font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPix ? 'Enviando...' : 'Enviar Comprovante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
