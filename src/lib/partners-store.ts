import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PartnerType = "customer" | "supplier";

export type PartnerGroup =
  | "hotels"
  | "restaurants"
  | "catering"
  | "retail"
  | "raw_ingredients"
  | "packaging"
  | "services";

export type PaymentTerms = "immediate" | "15_days" | "30_days" | "45_days" | "60_days";

export type PaymentCategory = "invoice" | "advance" | "nulling";

export interface PartnerTransaction {
  id: string;
  date: string;
  type: "invoice" | "payment" | "purchase_order" | "credit_note";
  docRef: string;
  description: { ar: string; en: string };
  amount: number;
  status: "paid" | "partial" | "pending";
  paymentCategory?: PaymentCategory | undefined;
  relatedDocRef?: string | undefined;
  paymentMethod?: string | undefined;
  proofImage?: string | undefined;
}

export interface RecordPaymentParams {
  category: PaymentCategory;
  amount: number;
  date?: string | undefined;
  relatedDocRef?: string | undefined;
  paymentMethod?: string | undefined;
  notes?: string | undefined;
  proofImage?: string | undefined;
}

export interface Partner {
  id: string;
  code: string;
  name: { ar: string; en: string };
  type: PartnerType;
  group: PartnerGroup;
  taxNumber: string;
  phone: string;
  email: string;
  address: { ar: string; en: string };
  contactPerson: string;
  creditLimit: number;
  balance: number;
  paymentTerms: PaymentTerms;
  status: "active" | "inactive";
  logo?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  transactions: PartnerTransaction[];
}

export function usePartnersStore() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('partners').select('*');
    if (data) {
      setPartners(data.map(p => ({
        id: p.id,
        code: p.code || '',
        name: { ar: p.name_ar, en: p.name_en },
        type: p.type as PartnerType,
        group: 'retail' as PartnerGroup, // Fallback since it's missing in schema
        taxNumber: p.tax_number || '',
        phone: p.phone || '',
        email: p.email || '',
        address: { ar: p.address || '', en: p.address || '' }, // DB schema doesn't split ar/en address
        contactPerson: p.contact_person || '',
        creditLimit: Number(p.credit_limit || 0),
        balance: Number(p.balance || 0),
        paymentTerms: 'immediate' as PaymentTerms, // Fallback
        status: p.is_active ? 'active' : 'inactive',
        createdAt: p.created_at,
        transactions: [] // Would fetch from transactions table if exists
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const addPartner = useCallback(async (partner: Omit<Partner, "id" | "transactions" | "createdAt" | "balance">) => {
    const tempId = `temp-${Date.now()}`;
    const newPartner: Partner = {
      ...partner,
      id: tempId,
      createdAt: new Date().toISOString(),
      balance: 0,
      transactions: [],
    };
    setPartners(prev => [newPartner, ...prev]);

    await supabase.from('partners').insert({
      code: partner.code,
      name_ar: partner.name.ar,
      name_en: partner.name.en,
      type: partner.type as any,
      tax_number: partner.taxNumber,
      phone: partner.phone,
      email: partner.email,
      address: partner.address.ar, // saving AR as main
      contact_person: partner.contactPerson,
      credit_limit: partner.creditLimit,
      is_active: partner.status === 'active'
    });

    fetchPartners();
    return newPartner;
  }, [fetchPartners]);

  const updatePartner = useCallback(async (id: string, updates: Partial<Partner>) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    const dbUpdate: any = {};
    if (updates.code) dbUpdate.code = updates.code;
    if (updates.name) { dbUpdate.name_ar = updates.name.ar; dbUpdate.name_en = updates.name.en; }
    if (updates.type) dbUpdate.type = updates.type;
    if (updates.taxNumber !== undefined) dbUpdate.tax_number = updates.taxNumber;
    if (updates.phone !== undefined) dbUpdate.phone = updates.phone;
    if (updates.email !== undefined) dbUpdate.email = updates.email;
    if (updates.address) dbUpdate.address = updates.address.ar;
    if (updates.contactPerson !== undefined) dbUpdate.contact_person = updates.contactPerson;
    if (updates.creditLimit !== undefined) dbUpdate.credit_limit = updates.creditLimit;
    if (updates.status !== undefined) dbUpdate.is_active = updates.status === 'active';

    await supabase.from('partners').update(dbUpdate).eq('id', id);
  }, []);

  const deletePartner = useCallback(async (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
    await supabase.from('partners').delete().eq('id', id);
  }, []);

  const recordPayment = useCallback(async (partnerId: string, params: RecordPaymentParams) => {
    // In a real app, this would insert a payment record and update balance in DB
    setPartners(prev => prev.map(p => {
      if (p.id === partnerId) {
        return {
          ...p,
          balance: p.balance - params.amount,
          transactions: [
            {
              id: `tx-temp-${Date.now()}`,
              date: params.date || new Date().toISOString(),
              type: "payment",
              docRef: `PAY-${Date.now()}`,
              description: { ar: params.notes || "دفعة نقدية", en: params.notes || "Cash Payment" },
              amount: params.amount,
              status: "paid",
              paymentCategory: params.category,
              relatedDocRef: params.relatedDocRef,
              paymentMethod: params.paymentMethod,
            },
            ...p.transactions
          ]
        };
      }
      return p;
    }));
  }, []);

  const toggleStatus = useCallback(async (id: string) => {
    const partner = partners.find(p => p.id === id);
    if (!partner) return;
    const newStatus = partner.status === 'active' ? 'inactive' : 'active';
    await updatePartner(id, { status: newStatus });
  }, [partners, updatePartner]);

  return {
    partners,
    loading,
    addPartner,
    updatePartner,
    deletePartner,
    recordPayment,
    toggleStatus,
  };
}
