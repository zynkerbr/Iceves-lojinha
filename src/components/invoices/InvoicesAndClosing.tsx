import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Search, 
  Printer, 
  QrCode, 
  Copy, 
  Download, 
  Eye, 
  Check, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Invoice, MonthlyClosingPreview, InvoiceStatus, Student } from '../../types';
import { formatCurrency, formatDate, formatDateTime, formatPeriod, generatePixQrSvg } from '../../utils/formatters';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface InvoicesAndClosingProps {
  invoices: Invoice[];
  students: Student[];
  onInvoicesUpdated: () => void;
}

export function InvoicesAndClosing({ 
  invoices, 
  students, 
  onInvoicesUpdated 
}: InvoicesAndClosingProps) {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'closing_engine' | 'invoices_list'>('closing_engine');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  
  // Preview state
  const [preview, setPreview] = useState<MonthlyClosingPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecutingClosing, setIsExecutingClosing] = useState(false);
  const [closingResult, setClosingResult] = useState<{ count: number; period: string } | null>(null);
  const [closingError, setClosingError] = useState<string | null>(null);

  // Invoices list filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');
  
  // Invoice detailed statement modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Generate closing preview
  const handleGeneratePreview = async () => {
    setIsLoadingPreview(true);
    setClosingError(null);
    setClosingResult(null);
    try {
      const data = await api.getClosingPreview(selectedPeriod);
      setPreview(data);
    } catch (err: any) {
      setClosingError(err.message || 'Erro ao gerar prévia de fechamento.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Execute closing and publish invoices
  const handleExecuteClosing = async () => {
    if (!preview || !preview.canProceed) return;

    setIsExecutingClosing(true);
    setClosingError(null);
    try {
      const res = await api.executeMonthlyClosing(selectedPeriod);
      setClosingResult({ count: res.invoicesCreated, period: res.period });
      setPreview(null);
      onInvoicesUpdated();
      setActiveTab('invoices_list');
    } catch (err: any) {
      setClosingError(err.message || 'Erro ao executar fechamento.');
    } finally {
      setIsExecutingClosing(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const q = invoiceSearch.toLowerCase();
    const matchesSearch = !q || (
      inv.id.toLowerCase().includes(q) ||
      inv.studentName.toLowerCase().includes(q) ||
      inv.registrationNumber.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'TODAS' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAGA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Quitada / Paga</span>;
      case 'PARCIALMENTE_PAGA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Parcialmente Paga</span>;
      case 'PUBLICADA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/20">Publicada (Em Aberto)</span>;
      case 'VENCIDA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Vencida</span>;
      case 'AGUARDANDO_APROVACAO':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">Aguardando Aprovação</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#222222] text-[#A1A1AA]">{status}</span>;
    }
  };

  const copyPixCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Banner */}
      <div className="bg-[#1B1B1B] rounded-2xl p-5 border border-[#282828] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B7CFF]" />
            <h2 className="text-lg font-extrabold text-[#F5F5F5] tracking-tight">
              Faturas & Fechamento Mensal
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Motor financeiro que consolida consumo da lojinha, mensalidade e saldos com garantia de idempotência.
          </p>
        </div>

        <div className="flex bg-[#151515] p-1 rounded-xl border border-[#282828] text-xs">
          <button
            onClick={() => setActiveTab('closing_engine')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeTab === 'closing_engine' ? 'bg-[#282828] text-[#F5F5F5]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            Rotina de Fechamento
          </button>
          <button
            onClick={() => setActiveTab('invoices_list')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeTab === 'invoices_list' ? 'bg-[#282828] text-[#F5F5F5]' : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
            }`}
          >
            Faturas Emitidas ({invoices.length})
          </button>
        </div>
      </div>

      {activeTab === 'closing_engine' ? (
        <div className="space-y-5">
          
          {/* Closing Engine Controls */}
          <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#242424] pb-4">
              <div>
                <h3 className="font-bold text-[#F5F5F5] text-base">Execução do Fechamento Mensal</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Selecione a competência para consolidar todos os cupons do balcão e mensalidades.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setPreview(null);
                    setClosingResult(null);
                  }}
                  className="px-3 py-2 border border-[#2E2E2E] rounded-xl text-xs font-bold bg-[#151515] text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                >
                  <option value="2026-10">Outubro de 2026 (Competência Vigente)</option>
                  <option value="2026-11">Novembro de 2026</option>
                  <option value="2026-09">Setembro de 2026 (Anterior)</option>
                </select>

                <button
                  type="button"
                  disabled={isLoadingPreview}
                  onClick={handleGeneratePreview}
                  className="px-4 py-2 bg-[#F5F5F5] hover:bg-white text-[#101010] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  {isLoadingPreview ? 'Calculando...' : 'Gerar Prévia'}
                </button>
              </div>
            </div>

            {/* Error or Success banner */}
            {closingError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{closingError}</span>
              </div>
            )}

            {closingResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Fechamento de {formatPeriod(closingResult.period)} realizado com sucesso!</span>
                </div>
                <p>
                  Foram emitidas e publicadas <strong>{closingResult.count} faturas</strong>. As notificações WhatsApp foram agendadas e os consumos consolidados.
                </p>
              </div>
            )}

            {/* Step-by-step description */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                <span className="font-extrabold text-[#8B7CFF] block mb-0.5">1. Consolidação</span>
                <p className="text-[#A1A1AA] text-[11px]">Agrupa todas as compras do caixa e soma à mensalidade.</p>
              </div>
              <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                <span className="font-extrabold text-[#8B7CFF] block mb-0.5">2. Conferência Prévia</span>
                <p className="text-[#A1A1AA] text-[11px]">Identifica pendências ou inconsistências.</p>
              </div>
              <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                <span className="font-extrabold text-[#8B7CFF] block mb-0.5">3. Idempotência</span>
                <p className="text-[#A1A1AA] text-[11px]">Repetir o fechamento nunca gera faturas duplicadas.</p>
              </div>
              <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                <span className="font-extrabold text-[#8B7CFF] block mb-0.5">4. Publicação & Pix</span>
                <p className="text-[#A1A1AA] text-[11px]">Gera BRCode Pix válido para o portal da família.</p>
              </div>
            </div>
          </div>

          {/* Generated Preview Block */}
          {preview && (
            <div className="bg-[#1B1B1B] rounded-2xl border border-[#3A3A3A] shadow-md p-5 space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/20 mb-1">
                    Prévia Oficial de Fechamento
                  </span>
                  <h3 className="text-lg font-extrabold text-[#F5F5F5]">
                    Competência: {formatPeriod(preview.period)}
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Revise os totais calculados antes da aprovação administrativa final.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isExecutingClosing || !preview.canProceed}
                  onClick={handleExecuteClosing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isExecutingClosing ? 'Processando Faturas...' : 'Aprovar & Publicar Faturas'}
                </button>
              </div>

              {/* Preview KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Alunos Elegíveis</span>
                  <span className="block text-xl font-black text-[#F5F5F5] mt-1">{preview.studentsCount} alunos</span>
                </div>
                <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Mensalidades Base</span>
                  <span className="block text-xl font-black text-[#F5F5F5] font-mono mt-1">{formatCurrency(preview.totalTuitions)}</span>
                </div>
                <div className="p-3 bg-[#151515] rounded-xl border border-[#242424]">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Consumo Cantina</span>
                  <span className="block text-xl font-black text-[#8B7CFF] font-mono mt-1">{formatCurrency(preview.totalConsumptions)}</span>
                </div>
                <div className="p-3 bg-[#201D2E] rounded-xl border border-[#3E3466]">
                  <span className="text-[10px] font-bold text-[#8B7CFF] uppercase">Total Geral a Faturar</span>
                  <span className="block text-xl font-black text-white font-mono mt-1">{formatCurrency(preview.totalGrossToBill)}</span>
                </div>
              </div>

              {/* Inconsistencies or Warnings Box */}
              {preview.inconsistencies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#A1A1AA] uppercase">Avisos Identificados:</h4>
                  <div className="space-y-1.5">
                    {preview.inconsistencies.map((inc, i) => (
                      <div 
                        key={i} 
                        className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                          inc.severity === 'BLOCKER' 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span><strong>{inc.studentName}:</strong> {inc.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* List of students preview */}
              <div>
                <h4 className="text-xs font-bold text-[#F5F5F5] mb-2">Composição Individual por Aluno</h4>
                <div className="divide-y divide-[#242424] border border-[#282828] rounded-xl overflow-hidden text-xs">
                  {students.filter(s => s.status === 'ACTIVE').map(student => {
                    const studentTotal = student.defaultTuition + student.currentConsumptionBalance;
                    return (
                      <div key={student.id} className="p-3 flex items-center justify-between hover:bg-[#202020]">
                        <div>
                          <span className="font-bold text-[#F5F5F5]">{student.name}</span>
                          <span className="text-[#71717A] font-mono ml-2">({student.registrationNumber})</span>
                          <p className="text-[11px] text-[#A1A1AA]">
                            Mensalidade: {formatCurrency(student.defaultTuition)} • Consumo Lojinha: {formatCurrency(student.currentConsumptionBalance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#F5F5F5] font-mono text-sm block">
                            {formatCurrency(studentTotal)}
                          </span>
                          <span className="text-[10px] text-[#71717A]">Fatura Unificada</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* Invoices List Tab */
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] shadow-xs p-5 space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Buscar por código ou aluno..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#151515] border border-[#282828] rounded-xl text-[#F5F5F5] placeholder-[#71717A] focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
              {['TODAS', 'PUBLICADA', 'PARCIALMENTE_PAGA', 'PAGA', 'VENCIDA'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === st ? 'bg-[#282828] text-[#F5F5F5] border border-[#3A3A3A]' : 'bg-[#151515] text-[#A1A1AA] hover:text-[#F5F5F5]'
                  }`}
                >
                  {st === 'TODAS' ? 'Todas' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#151515] text-[#71717A] font-bold uppercase tracking-wider border-b border-[#282828]">
                <tr>
                  <th className="py-3 px-4">Identificador</th>
                  <th className="py-3 px-4">Aluno / Matrícula</th>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Mensalidade</th>
                  <th className="py-3 px-4">Lojinha</th>
                  <th className="py-3 px-4">Total Faturado</th>
                  <th className="py-3 px-4">Saldo Pendente</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Extrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242424]">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-[#202020] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#F5F5F5]">
                      {invoice.id}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#F5F5F5] block">{invoice.studentName}</span>
                      <span className="text-[10px] font-mono text-[#71717A]">{invoice.registrationNumber}</span>
                    </td>

                    <td className="py-3 px-4 text-[#A1A1AA]">
                      {formatPeriod(invoice.billingPeriod)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#A1A1AA]">
                      {formatCurrency(invoice.tuitionAmount)}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-[#8B7CFF]">
                      {formatCurrency(invoice.canteenConsumptionTotal)}
                    </td>

                    <td className="py-3 px-4 font-mono font-extrabold text-[#F5F5F5]">
                      {formatCurrency(invoice.grossTotal)}
                    </td>

                    <td className="py-3 px-4 font-mono font-extrabold">
                      <span className={invoice.remainingBalance === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatCurrency(invoice.remainingBalance)}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#71717A]">
                      {formatDate(invoice.dueDate)}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(invoice.status)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-[#8B7CFF] text-[11px] font-bold border border-[#303030] transition flex items-center gap-1 ml-auto cursor-pointer"
                        title="Abrir extrato detalhado"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Extrato
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Invoice Detailed Statement Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#303030] max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#282828] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#71717A]">DOCUMENTO OFICIAL DE COBRANÇA</span>
                <h3 className="font-extrabold text-[#F5F5F5] text-lg">
                  Fatura & Prestação de Contas — {formatPeriod(selectedInvoice.billingPeriod)}
                </h3>
                <p className="text-xs text-[#A1A1AA] font-mono">
                  Código: <strong className="text-white">{selectedInvoice.id}</strong> • Aluno: <strong className="text-white">{selectedInvoice.studentName}</strong> ({selectedInvoice.registrationNumber})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-lg border border-[#303030] hover:bg-[#222222] text-[#A1A1AA] hover:text-white cursor-pointer"
                  title="Imprimir"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="text-[#71717A] hover:text-white text-xl font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="mt-4 p-4 rounded-xl bg-[#141414] border border-[#262626] text-xs space-y-2">
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Mensalidade Fixa Escolar:</span>
                <span className="font-semibold text-[#F5F5F5] font-mono">{formatCurrency(selectedInvoice.tuitionAmount)}</span>
              </div>
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Total de Consumo da Lojinha:</span>
                <span className="font-semibold text-[#8B7CFF] font-mono">{formatCurrency(selectedInvoice.canteenConsumptionTotal)}</span>
              </div>
              {selectedInvoice.previousBalance > 0 && (
                <div className="flex justify-between text-[#A1A1AA]">
                  <span>Saldo Devedor Anterior:</span>
                  <span className="font-semibold text-amber-400 font-mono">{formatCurrency(selectedInvoice.previousBalance)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#F5F5F5] pt-2 border-t border-[#262626]">
                <span>TOTAL DA FATURA:</span>
                <span className="text-[#8B7CFF] font-mono">{formatCurrency(selectedInvoice.grossTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                <span>Pagamentos Confirmados:</span>
                <span className="font-mono">- {formatCurrency(selectedInvoice.paidTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-rose-400 pt-1 border-t border-[#262626]">
                <span>SALDO RESTANTE A PAGAR:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.remainingBalance)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#71717A] pt-1">
                <span>Data de Vencimento:</span>
                <span className="font-bold text-[#F5F5F5]">{formatDate(selectedInvoice.dueDate)}</span>
              </div>
            </div>

            {/* Itemized Canteen Consumption */}
            <div className="mt-5 space-y-2">
              <h4 className="font-bold text-[#F5F5F5] text-xs uppercase tracking-wider">
                Extrato Itemizado do Consumo na Lojinha ({selectedInvoice.consumptionItems.length} itens)
              </h4>

              {selectedInvoice.consumptionItems.length === 0 ? (
                <p className="text-xs text-[#71717A] py-3 text-center">Nenhum consumo no caixa registrado nesta competência.</p>
              ) : (
                <div className="border border-[#282828] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#151515] text-[#71717A] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3">Categoria</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Preço Unit.</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242424]">
                      {selectedInvoice.consumptionItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#202020]">
                          <td className="py-2 px-3 font-semibold text-[#F5F5F5]">{item.productName}</td>
                          <td className="py-2 px-3 text-[#71717A] text-[11px]">{item.category}</td>
                          <td className="py-2 px-3 text-center font-bold text-[#A1A1AA]">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#A1A1AA]">{formatCurrency(item.averageUnitPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#F5F5F5]">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pix Payment Code Box */}
            {selectedInvoice.remainingBalance > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-[#151515] border border-[#2E2E2E] space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#8B7CFF]" />
                  <h4 className="font-bold text-[#F5F5F5] text-xs uppercase tracking-wider">
                    Instruções para Pagamento via Pix
                  </h4>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img 
                    src={generatePixQrSvg(selectedInvoice.pixQrCodePayload)} 
                    alt="Pix QR Code" 
                    className="w-24 h-24 bg-white p-1 rounded-xl border border-[#333333] shadow-xs"
                  />
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="block text-[11px] font-bold text-[#A1A1AA]">
                      Código Pix Copia e Cola:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={selectedInvoice.pixCopyPasteCode}
                        className="w-full p-2 text-[10px] font-mono bg-[#111111] border border-[#282828] rounded-lg text-[#A1A1AA] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => copyPixCode(selectedInvoice.pixCopyPasteCode)}
                        className="px-3 py-2 bg-[#F5F5F5] hover:bg-white text-[#101010] rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPix ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-[#252525] hover:bg-[#303030] text-[#F5F5F5] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar Extrato
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
