import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BusinessType = "dealership" | "electronics" | "retail" | "furniture" | "custom";

export type CustomFieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
};

export type BusinessLabels = {
  itemSingular: string;
  itemPlural: string;
  brand: string;
  model: string;
  category: string;
  stockPage: string;
  yearFab: string;
  yearModel: string;
  addItem: string;
  editItem: string;
  newItem: string;
  noItems: string;
  addFirstItem: string;
  deleteConfirm: string;
  businessName: string;
  sellItem: string;
  itemSold: string;
  tradeItem: string;
  vehicleSold: string;
  vehicleReceived: string;
  itemCostDaily: string;
};

const TEMPLATE_LABELS: Record<BusinessType, BusinessLabels> = {
  dealership: {
    itemSingular: "Veículo", itemPlural: "Veículos", brand: "Marca", model: "Modelo",
    category: "Tipo", stockPage: "Estoque", yearFab: "Ano Fabricação", yearModel: "Ano Modelo",
    addItem: "Adicionar Veículo", editItem: "Editar Veículo", newItem: "Novo Veículo",
    noItems: "Nenhum veículo encontrado", addFirstItem: "Adicionar seu primeiro veículo",
    deleteConfirm: "O veículo será removido permanentemente.",
    businessName: "Concessionária", sellItem: "Vender", itemSold: "Veículo vendido",
    tradeItem: "Troca", vehicleSold: "Veículo Vendido", vehicleReceived: "Veículo Recebido",
    itemCostDaily: "Este veículo está custando dinheiro diariamente",
  },
  electronics: {
    itemSingular: "Produto", itemPlural: "Produtos", brand: "Marca", model: "Modelo",
    category: "Categoria", stockPage: "Estoque", yearFab: "Ano", yearModel: "Versão",
    addItem: "Adicionar Produto", editItem: "Editar Produto", newItem: "Novo Produto",
    noItems: "Nenhum produto encontrado", addFirstItem: "Adicionar seu primeiro produto",
    deleteConfirm: "O produto será removido permanentemente.",
    businessName: "Loja de Eletrônicos", sellItem: "Vender", itemSold: "Produto vendido",
    tradeItem: "Troca", vehicleSold: "Produto Entregue", vehicleReceived: "Produto Recebido",
    itemCostDaily: "Este produto está parado há muito tempo",
  },
  retail: {
    itemSingular: "Item", itemPlural: "Itens", brand: "Marca", model: "Descrição",
    category: "Categoria", stockPage: "Estoque", yearFab: "Ano", yearModel: "Lote",
    addItem: "Adicionar Item", editItem: "Editar Item", newItem: "Novo Item",
    noItems: "Nenhum item encontrado", addFirstItem: "Adicionar seu primeiro item",
    deleteConfirm: "O item será removido permanentemente.",
    businessName: "Loja", sellItem: "Vender", itemSold: "Item vendido",
    tradeItem: "Troca", vehicleSold: "Item Entregue", vehicleReceived: "Item Recebido",
    itemCostDaily: "Este item está parado há muito tempo",
  },
  furniture: {
    itemSingular: "Móvel", itemPlural: "Móveis", brand: "Fabricante", model: "Modelo",
    category: "Tipo", stockPage: "Estoque", yearFab: "Ano", yearModel: "Coleção",
    addItem: "Adicionar Móvel", editItem: "Editar Móvel", newItem: "Novo Móvel",
    noItems: "Nenhum móvel encontrado", addFirstItem: "Adicionar seu primeiro móvel",
    deleteConfirm: "O móvel será removido permanentemente.",
    businessName: "Loja de Móveis", sellItem: "Vender", itemSold: "Móvel vendido",
    tradeItem: "Troca", vehicleSold: "Móvel Entregue", vehicleReceived: "Móvel Recebido",
    itemCostDaily: "Este móvel está parado há muito tempo",
  },
  custom: {
    itemSingular: "Item", itemPlural: "Itens", brand: "Marca", model: "Descrição",
    category: "Categoria", stockPage: "Estoque", yearFab: "Ano", yearModel: "Versão",
    addItem: "Adicionar Item", editItem: "Editar Item", newItem: "Novo Item",
    noItems: "Nenhum item encontrado", addFirstItem: "Adicionar seu primeiro item",
    deleteConfirm: "O item será removido permanentemente.",
    businessName: "Negócio", sellItem: "Vender", itemSold: "Item vendido",
    tradeItem: "Troca", vehicleSold: "Item Entregue", vehicleReceived: "Item Recebido",
    itemCostDaily: "Este item está parado há muito tempo",
  },
};

const TEMPLATE_FIELDS: Record<BusinessType, CustomFieldDef[]> = {
  dealership: [
    { key: "plate", label: "Placa", type: "text" },
    { key: "color", label: "Cor", type: "text" },
    { key: "mileage", label: "Quilometragem", type: "number" },
    { key: "fuel", label: "Combustível", type: "select", options: ["flex", "gasolina", "etanol", "diesel", "eletrico"] },
    { key: "transmission", label: "Câmbio", type: "select", options: ["manual", "automatico"] },
    { key: "fipe_code", label: "Código FIPE", type: "text" },
  ],
  electronics: [
    { key: "storage", label: "Armazenamento", type: "text" },
    { key: "ram", label: "RAM", type: "text" },
    { key: "screen", label: "Tela", type: "text" },
    { key: "color", label: "Cor", type: "text" },
    { key: "condition", label: "Condição", type: "select", options: ["novo", "seminovo", "usado", "recondicionado"] },
  ],
  retail: [
    { key: "size", label: "Tamanho", type: "text" },
    { key: "color", label: "Cor", type: "text" },
    { key: "material", label: "Material", type: "text" },
    { key: "sku", label: "SKU", type: "text" },
  ],
  furniture: [
    { key: "material", label: "Material", type: "text" },
    { key: "dimensions", label: "Dimensões", type: "text" },
    { key: "color", label: "Cor", type: "text" },
    { key: "style", label: "Estilo", type: "select", options: ["moderno", "classico", "rustico", "industrial", "minimalista"] },
  ],
  custom: [],
};

type BusinessContextType = {
  businessType: BusinessType;
  labels: BusinessLabels;
  customFields: CustomFieldDef[];
  isLoading: boolean;
  updateLabels: (overrides: Partial<BusinessLabels>) => Promise<void>;
  addCustomField: (field: CustomFieldDef) => Promise<void>;
  removeCustomField: (key: string) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType>({
  businessType: "dealership",
  labels: TEMPLATE_LABELS.dealership,
  customFields: TEMPLATE_FIELDS.dealership,
  isLoading: true,
  updateLabels: async () => {},
  addCustomField: async () => {},
  removeCustomField: async () => {},
});

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();

  const { data: account, isLoading } = useQuery({
    queryKey: ["account-business", profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return null;
      const { data } = await supabase
        .from("accounts")
        .select("business_type, custom_labels")
        .eq("id", profile.account_id)
        .single();
      return data;
    },
    enabled: !!profile?.account_id,
    staleTime: 60_000,
  });

  const businessType = (account?.business_type as BusinessType) || "dealership";

  const labels = useMemo(() => {
    const base = TEMPLATE_LABELS[businessType];
    const overrides = (account?.custom_labels as Partial<BusinessLabels>) || {};
    return { ...base, ...overrides };
  }, [businessType, account?.custom_labels]);

  const customFields = useMemo(() => {
    return TEMPLATE_FIELDS[businessType] || [];
  }, [businessType]);

  const updateLabels = async (overrides: Partial<BusinessLabels>) => {
    if (!profile?.account_id) return;
    const current = (account?.custom_labels as Record<string, string>) || {};
    await supabase.from("accounts").update({
      custom_labels: { ...current, ...overrides },
    }).eq("id", profile.account_id);
  };

  const addCustomField = async (_field: CustomFieldDef) => {
    // Custom fields are stored in the template system
    // For now, custom fields are managed via templates
  };

  const removeCustomField = async (_key: string) => {
    // Custom fields removal
  };

  return (
    <BusinessContext.Provider value={{ businessType, labels, customFields, isLoading, updateLabels, addCustomField, removeCustomField }}>
      {children}
    </BusinessContext.Provider>
  );
};

export { TEMPLATE_LABELS, TEMPLATE_FIELDS };
