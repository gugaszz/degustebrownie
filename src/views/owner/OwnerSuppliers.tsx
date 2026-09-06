import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Plus,
  PackageCheck,
  Trash2
} from 'lucide-react';
import { useStore } from '../../services/store';
import { formatCurrency } from '../../utils/pix';

export const OwnerSuppliers: React.FC = () => {
  const { state, createSupplier, deleteSupplier } = useStore();

  const [isAdding, setIsAdding] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createSupplier({
      name,
      contact_name: contactName,
      phone,
      email,
      address,
      instagram: '',
      document: '',
      notes: ''
    });
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Fornecedores
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Cadastro das doceiras e confeitarias parceiras produtoras dos brownies
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cadastrar Fornecedor</span>
        </button>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <h3 className="font-bold text-sm text-[#111111]">Novo Fornecedor / Confeitaria</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Nome Fantasia:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Doçura Brownies Artesanais"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Contato / Confeiteira:</label>
                  <input
                    type="text"
                    placeholder="Ex: Dona Mariana"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">WhatsApp:</label>
                  <input
                    type="text"
                    placeholder="(85) 98888-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Endereço / Bairro:</label>
                <input
                  type="text"
                  placeholder="Ex: Rua das Flores, 120 - Aldeota"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full text-xs bg-[#F6F5F3] border border-[#E7E5E2] rounded-xl px-3 py-2 text-[#111111]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B6B6B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141414] text-white text-xs font-bold rounded-xl"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of suppliers */}
      {state.suppliers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-[#E7E5E2] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F5F3] text-[#6B6B6B] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Nenhum fornecedor cadastrado</h3>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
            Cadastre suas confeitarias parceiras para gerenciar pedidos de compra e entrada de lotes no estoque central.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold hover:bg-[#0A0A0A] transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeiro Fornecedor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.suppliers.map(supplier => {
          const supplierPurchases = state.purchaseOrders.filter(p => p.supplier_id === supplier.id);
          const totalSpent = supplierPurchases.reduce((s, p) => s + p.total_amount, 0);

          return (
            <div key={supplier.id} className="p-5 rounded-3xl bg-white border border-[#E7E5E2] shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F6F5F3] text-[#141414] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#111111]">{supplier.name}</h3>
                    {supplier.contact_name && (
                      <span className="text-xs text-[#6B6B6B]">Resp: {supplier.contact_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1B8A4F]">
                    Ativo
                  </span>
                  <button
                    onClick={() => setSupplierToDelete(supplier.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                    title="Excluir fornecedor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#6B6B6B]">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#141414]" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#141414]" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E7E5E2] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#6B6B6B] block">Pedidos realizados:</span>
                  <strong className="text-[#111111]">{supplierPurchases.length} compras</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6B6B6B] block">Total comprado:</span>
                  <strong className="text-[#1B8A4F] font-bold tabular-nums">
                    {formatCurrency(totalSpent)}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E2] space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-[#111111]">Excluir Fornecedor?</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Deseja realmente remover este fornecedor da sua lista de parceiros?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[#E7E5E2] text-xs font-semibold text-[#6B6B6B] hover:bg-[#F6F5F3]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteSupplier(supplierToDelete);
                  setSupplierToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
