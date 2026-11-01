import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  QrCode, 
  ShieldCheck, 
  Store,
  Layers
} from 'lucide-react';
import { SystemSettings } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface SystemSettingsViewProps {
  settings: SystemSettings | null;
  onSettingsSaved: (settings: SystemSettings) => void;
  onResetData: () => void;
}

export function SystemSettingsView({ 
  settings, 
  onSettingsSaved, 
  onResetData 
}: SystemSettingsViewProps) {
  const { user, isAdmin } = useAuth();

  const [formData, setFormData] = useState<Partial<SystemSettings>>({
    institutionName: settings?.institutionName || 'Campus University School',
    storeName: settings?.storeName || 'Lojinha do Campus',
    cnpj: settings?.cnpj || '18.423.891/0001-44',
    closingDay: settings?.closingDay || 'LAST_DAY',
    closingHour: settings?.closingHour || '23:59',
    dueDayOffset: settings?.dueDayOffset || 10,
    allowDirectCashPayment: settings?.allowDirectCashPayment ?? false,
    stockControlActive: settings?.stockControlActive ?? true,
    blockSaleWithoutStock: settings?.blockSaleWithoutStock ?? true,
    pixKey: settings?.pixKey || 'financeiro@campus.edu.br',
    pixKeyType: settings?.pixKeyType || 'EMAIL',
    pixReceiverName: settings?.pixReceiverName || 'CAMPUS EDUCACIONAL',
    pixCity: settings?.pixCity || 'SAO PAULO',
    whatsappAutoEnabled: settings?.whatsappAutoEnabled ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updateSettings(formData);
      onSettingsSaved(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Atenção: Deseja restaurar todos os dados para o estado semente inicial? Isso reiniciará o estoque, as vendas e as faturas de teste.')) {
      return;
    }

    setIsResetting(true);
    try {
      await api.resetData();
      onResetData();
      alert('Dados restaurados com sucesso para os valores padrão de teste!');
    } catch (err: any) {
      alert(`Erro ao resetar: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-[#1B1B1B] rounded-2xl p-6 border border-[#282828] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#8B7CFF]" />
            <h2 className="text-xl font-bold text-[#F5F5F5] tracking-tight">
              Configurações Operacionais da Lojinha
            </h2>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Parâmetros globais: dia de corte do faturamento, vencimento de faturas, chave Pix e regras de estoque.
          </p>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            Configurações Salvas
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. Identificação da Loja & Instituição */}
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#242424] pb-3">
            <Store className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-semibold text-[#F5F5F5] text-sm">
              1. Identificação da Loja e Instituição
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Nome da Lojinha</label>
              <input
                type="text"
                value={formData.storeName || ''}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Instituição de Ensino / Campus</label>
              <input
                type="text"
                value={formData.institutionName || ''}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Fechamento Mensal e Vencimento */}
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#242424] pb-3">
            <Calendar className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-semibold text-[#F5F5F5] text-sm">
              2. Fechamento Mensal & Vencimento de Faturas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Dia do Fechamento Mensal</label>
              <select
                value={formData.closingDay}
                onChange={(e) => setFormData({ ...formData, closingDay: e.target.value as any })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
              >
                <option value="LAST_DAY">Último dia de cada mês (Padrão)</option>
                <option value="25">Dia 25 de cada mês</option>
                <option value="28">Dia 28 de cada mês</option>
              </select>
              <p className="text-[10px] text-[#A1A1AA] mt-1">Consolida consumo e lançamentos até esta data.</p>
            </div>

            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Horário de Fechamento</label>
              <input
                type="text"
                value={formData.closingHour || '23:59'}
                onChange={(e) => setFormData({ ...formData, closingHour: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] font-mono focus:border-[#8B7CFF] focus:outline-none"
              />
              <p className="text-[10px] text-[#A1A1AA] mt-1">Horário limite do corte mensal.</p>
            </div>

            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Dia de Vencimento no Mês Subsequente</label>
              <input
                type="number"
                min="1"
                max="28"
                value={formData.dueDayOffset ?? 10}
                onChange={(e) => setFormData({ ...formData, dueDayOffset: parseInt(e.target.value, 10) || 10 })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] font-bold focus:border-[#8B7CFF] focus:outline-none"
              />
              <p className="text-[10px] text-[#A1A1AA] mt-1">Ex: Dia 10 (respeita calendário e meses menores).</p>
            </div>
          </div>
        </div>

        {/* 3. Regras de Consumo e Estoque */}
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#242424] pb-3">
            <Store className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-semibold text-[#F5F5F5] text-sm">
              3. Regras do Caixa e Controle de Estoque
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-[#151515] rounded-xl border border-[#282828]">
              <div>
                <span className="font-semibold text-[#F5F5F5] block">Consumo da Lojinha na Conta Mensal</span>
                <span className="text-[#A1A1AA] text-[11px]">
                  Toda venda para aluno no balcão entra diretamente na fatura mensal, sem exigir pagamento no ato.
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/40">
                Ativo Obrigatório
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#151515] rounded-xl border border-[#282828]">
              <div>
                <span className="font-semibold text-[#F5F5F5] block">Controle de Estoque Automático</span>
                <span className="text-[#A1A1AA] text-[11px]">
                  Vendas no PDV reduzem instantaneamente o estoque com geração de movimentação auditada.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.stockControlActive}
                  onChange={(e) => setFormData({ ...formData, stockControlActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#282828] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B7CFF]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#151515] rounded-xl border border-[#282828]">
              <div>
                <span className="font-semibold text-[#F5F5F5] block">Bloqueio de Venda Sem Estoque</span>
                <span className="text-[#A1A1AA] text-[11px]">
                  Impede que produtos esgotados (estoque 0) sejam adicionados ao carrinho no caixa.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.blockSaleWithoutStock}
                  onChange={(e) => setFormData({ ...formData, blockSaleWithoutStock: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#282828] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B7CFF]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 4. Dados Pix da Instituição */}
        <div className="bg-[#1B1B1B] rounded-2xl border border-[#282828] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#242424] pb-3">
            <QrCode className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-semibold text-[#F5F5F5] text-sm">
              4. Dados de Recebimento Pix
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Chave Pix Oficial da Instituição</label>
              <input
                type="text"
                value={formData.pixKey || ''}
                onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] font-mono focus:border-[#8B7CFF] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Nome do Favorecido (Razão Social)</label>
              <input
                type="text"
                value={formData.pixReceiverName || ''}
                onChange={(e) => setFormData({ ...formData, pixReceiverName: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">Cidade da Conta</label>
              <input
                type="text"
                value={formData.pixCity || ''}
                onChange={(e) => setFormData({ ...formData, pixCity: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#F5F5F5] mb-1">CNPJ da Instituição</label>
              <input
                type="text"
                value={formData.cnpj || ''}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full p-2.5 bg-[#151515] border border-[#303030] rounded-xl font-mono text-[#F5F5F5] focus:border-[#8B7CFF] focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {isAdmin && (
            <button
              type="button"
              disabled={isResetting}
              onClick={handleReset}
              className="px-4 py-2.5 bg-[#222222] border border-[#303030] text-red-400 hover:bg-[#2A2A2A] rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Dados Iniciais de Teste
            </button>
          )}

          {isAdmin && (
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white rounded-xl text-xs font-semibold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
        </div>

      </form>

    </div>
  );
}
