// js/db.js — Supabase data access layer
import { CONFIG } from './config.js';

let _sb = null;

export function initDB() {
  _sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _sb;
}

export function getClient() { return _sb; }

// ── Sequence counters (stored in app_sequences table) ─────
export async function nextSequence(name) {
  const { data, error } = await _sb.rpc('next_sequence', { seq_name: name });
  if (error) {
    // Fallback: use timestamp-based ID
    return Date.now().toString().slice(-6);
  }
  return String(data).padStart(4, '0');
}

// ── Buildings ─────────────────────────────────────────────
export const Buildings = {
  async getAll() {
    const { data, error } = await _sb
      .from('buildings')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('buildings')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('buildings')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('buildings').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Equipment ─────────────────────────────────────────────
export const Equipment = {
  async getAll() {
    const { data, error } = await _sb
      .from('equipment')
      .select('*, buildings(name)')
      .order('building_id')
      .order('service_area')
      .order('tag');
    if (error) throw error;
    return data || [];
  },
  async getByBuilding(buildingId) {
    const { data, error } = await _sb
      .from('equipment')
      .select('*')
      .eq('building_id', buildingId)
      .order('service_area')
      .order('category')
      .order('tag');
    if (error) throw error;
    return data || [];
  },
  async getById(id) {
    const { data, error } = await _sb
      .from('equipment')
      .select('*, buildings(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getDueForService(days = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const { data, error } = await _sb
      .from('equipment')
      .select('*, buildings(name)')
      .lte('next_service_date', cutoff.toISOString().slice(0, 10))
      .eq('status', 'active')
      .order('next_service_date');
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('equipment')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('equipment')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('equipment').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Proposals ─────────────────────────────────────────────
export const Proposals = {
  async getAll() {
    const { data, error } = await _sb
      .from('proposals')
      .select('*, buildings(name, client_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb
      .from('proposals')
      .select('*, buildings(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getByBuilding(bid) {
    const { data, error } = await _sb
      .from('proposals')
      .select('*')
      .eq('building_id', bid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('proposals')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('proposals')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('proposals').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── PM Records ────────────────────────────────────────────
export const PMRecords = {
  async getAll() {
    const { data, error } = await _sb
      .from('pm_records')
      .select('*, buildings(name)')
      .order('service_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getByBuilding(bid) {
    const { data, error } = await _sb
      .from('pm_records')
      .select('*')
      .eq('building_id', bid)
      .order('service_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb
      .from('pm_records')
      .select('*, buildings(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('pm_records')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('pm_records')
      .update(rec)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('pm_records').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Deficiencies ──────────────────────────────────────────
export const Deficiencies = {
  async getAll() {
    const { data, error } = await _sb
      .from('deficiencies')
      .select('*, buildings(name), equipment(tag, equipment_type)')
      .order('identified_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getOpen() {
    const { data, error } = await _sb
      .from('deficiencies')
      .select('*, buildings(name), equipment(tag, equipment_type)')
      .in('status', ['open','quoted','approved','in-progress'])
      .order('priority');
    if (error) throw error;
    return data;
  },
  async getByBuilding(bid) {
    const { data, error } = await _sb
      .from('deficiencies')
      .select('*, equipment(tag, equipment_type)')
      .eq('building_id', bid)
      .order('identified_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('deficiencies')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('deficiencies')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('deficiencies').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Quotes ────────────────────────────────────────────────
export const Quotes = {
  async getAll() {
    const { data, error } = await _sb
      .from('quotes')
      .select('*, buildings(name, client_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb
      .from('quotes')
      .select('*, buildings(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async getFollowUpDue() {
    const { data, error } = await _sb
      .from('quotes')
      .select('*, buildings(name, client_name)')
      .lte('follow_up_date', new Date().toISOString().slice(0, 10))
      .in('status', ['sent', 'pending-approval'])
      .order('follow_up_date');
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb
      .from('quotes')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('quotes')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('quotes').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Pricing Matrix ────────────────────────────────────────
export const PricingMatrix = {
  async getAll() {
    const { data, error } = await _sb
      .from('pricing_matrix')
      .select('*')
      .eq('active', true)
      .order('equipment_type');
    if (error) throw error;
    return data;
  },
  async getPrice(equipType, frequency) {
    const { data } = await _sb
      .from('pricing_matrix')
      .select('*')
      .eq('equipment_type', equipType)
      .eq('service_frequency', frequency)
      .eq('active', true)
      .maybeSingle();
    return data;
  },
  async upsert(rec) {
    const { data, error } = await _sb
      .from('pricing_matrix')
      .upsert({ ...rec, updated_at: new Date().toISOString() }, { onConflict: 'equipment_type,service_frequency' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('pricing_matrix').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Dashboard stats ───────────────────────────────────────
export const Stats = {
  async getSummary() {
    const [buildings, equipment, openQuotes, openDefs] = await Promise.all([
      _sb.from('buildings').select('id', { count: 'exact', head: true }).eq('status','active'),
      _sb.from('equipment').select('id', { count: 'exact', head: true }).eq('status','active'),
      _sb.from('quotes').select('total').in('status', ['draft','sent','pending-approval']),
      _sb.from('deficiencies').select('id', { count: 'exact', head: true })
         .in('status', ['open','quoted','approved']),
    ]);
    const pipelineValue = (openQuotes.data || []).reduce((s, q) => s + Number(q.total || 0), 0);
    return {
      activeBuildings: buildings.count || 0,
      activeEquipment: equipment.count || 0,
      pipelineValue,
      openDeficiencies: openDefs.count || 0,
    };
  },

  async getRevenueByMonth(months = 12) {
    const from = new Date();
    from.setMonth(from.getMonth() - months + 1);
    const { data } = await _sb
      .from('quotes')
      .select('total, created_at')
      .eq('status', 'accepted')
      .gte('created_at', from.toISOString());
    return data || [];
  },
};

// ── Maintenance Items Library ─────────────────────────────
export const MaintenanceItems = {
  async getAll() {
    const { data, error } = await _sb
      .from('maintenance_items')
      .select('*')
      .order('category')
      .order('equipment_type');
    if (error) throw error;
    return data;
  },
  async getByType(equipmentType) {
    const { data, error } = await _sb
      .from('maintenance_items')
      .select('*')
      .ilike('equipment_type', equipmentType)
      .single();
    if (error) return null;
    return data;
  },
  async upsertMany(items) {
    const { data, error } = await _sb
      .from('maintenance_items')
      .upsert(items, { onConflict: 'equipment_type' })
      .select();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('maintenance_items')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async getStdHours(equipmentType, frequency) {
    const item = await this.getByType(equipmentType);
    if (!item) return null;
    const map = {
      monthly:       item.monthly_std_hours,
      quarterly:     item.quarterly_std_hours,
      'semi-annual': item.semi_annual_std_hours,
      annual:        item.annual_std_hours,
    };
    return map[frequency] ?? item.quarterly_std_hours ?? null;
  },
};

// ── Markup Matrix ─────────────────────────────────────────
export const MarkupMatrix = {
  async getAll() {
    const { data, error } = await _sb
      .from('markup_matrix')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb
      .from('markup_matrix')
      .update({ ...rec, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async getMultiplier(costDollars) {
    const rows = await this.getAll();
    for (const row of rows) {
      if (costDollars >= row.cost_from && (row.cost_to === null || costDollars <= row.cost_to)) {
        return row.multiplier;
      }
    }
    return 1.34;
  },
};

// ── User Settings ─────────────────────────────────────────
export const UserSettings = {
  async get(key) {
    const { data, error } = await _sb
      .from('user_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error) return null;
    return data?.value ?? null;
  },
  async set(key, value) {
    const { data, error } = await _sb
      .from('user_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
