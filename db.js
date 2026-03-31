// db.js — Supabase data access layer
import { CONFIG } from './config.js';

let _sb = null;

export function initDB() {
  const url = CONFIG.SUPABASE_URL;
  const key = CONFIG.SUPABASE_ANON_KEY;
  if (!url || url === 'YOUR_SUPABASE_URL' || !url.startsWith('https://')) {
    throw new Error('SUPABASE_URL is not configured. Open config.js and set a valid https URL.');
  }
  if (!key || key === 'YOUR_SUPABASE_ANON_KEY') {
    throw new Error('SUPABASE_ANON_KEY is not configured. Open config.js and set your anon key.');
  }
  _sb = window.supabase.createClient(url, key);
  return _sb;
}

export function getClient() { return _sb; }
export function isReady()   { return _sb !== null; }

// ── Sequence counters ─────────────────────────────────────
export async function nextSequence(name) {
  if (!_sb) return Date.now().toString().slice(-6);
  const { data, error } = await _sb.rpc('next_sequence', { seq_name: name });
  if (error) return Date.now().toString().slice(-6);
  return String(data).padStart(4, '0');
}

// ── Buildings ─────────────────────────────────────────────
export const Buildings = {
  async getAll() {
    const { data, error } = await _sb.from('buildings').select('*').order('name');
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb.from('buildings').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb.from('buildings').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('buildings').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
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
    const { data, error } = await _sb.from('equipment').select('*, buildings(name)').order('building_id').order('service_area').order('tag');
    if (error) throw error;
    return data || [];
  },
  async getByBuilding(buildingId) {
    const { data, error } = await _sb.from('equipment').select('*').eq('building_id', buildingId).order('service_area').order('category').order('tag');
    if (error) throw error;
    return data || [];
  },
  async getById(id) {
    const { data, error } = await _sb.from('equipment').select('*, buildings(name)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async getDueForService(days = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const { data, error } = await _sb.from('equipment').select('*, buildings(name)').lte('next_service_date', cutoff.toISOString().slice(0, 10)).eq('status', 'active').order('next_service_date');
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb.from('equipment').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('equipment').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
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
    const { data, error } = await _sb.from('proposals').select('*, buildings(name, client_name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb.from('proposals').select('*, buildings(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async getByBuilding(bid) {
    const { data, error } = await _sb.from('proposals').select('*').eq('building_id', bid).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb.from('proposals').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('proposals').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
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
    const { data, error } = await _sb.from('pm_records').select('*, buildings(name)').order('service_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getByBuilding(bid) {
    const { data, error } = await _sb.from('pm_records').select('*').eq('building_id', bid).order('service_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb.from('pm_records').select('*, buildings(name)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb.from('pm_records').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('pm_records').update(rec).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await _sb.from('pm_records').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── Quotes ────────────────────────────────────────────────
export const Quotes = {
  async getAll() {
    const { data, error } = await _sb.from('quotes').select('*, buildings(name, client_name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id) {
    const { data, error } = await _sb.from('quotes').select('*, buildings(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(rec) {
    const { data, error } = await _sb.from('quotes').insert(rec).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('quotes').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
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
    const { data, error } = await _sb.from('pricing_matrix').select('*').eq('active', true).order('equipment_type');
    if (error) throw error;
    return data;
  },
  async getPrice(equipType, frequency) {
    const { data } = await _sb.from('pricing_matrix').select('*').eq('equipment_type', equipType).eq('service_frequency', frequency).eq('active', true).maybeSingle();
    return data;
  },
  async upsert(rec) {
    const { data, error } = await _sb.from('pricing_matrix').upsert({ ...rec, updated_at: new Date().toISOString() }, { onConflict: 'equipment_type,service_frequency' }).select().single();
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
    const [buildings, equipment] = await Promise.all([
      _sb.from('buildings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      _sb.from('equipment').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    return {
      activeBuildings: buildings.count || 0,
      activeEquipment: equipment.count || 0,
      pipelineValue: 0,
      openDeficiencies: 0,
    };
  },
};

// ── Maintenance Items Library ─────────────────────────────
export const MaintenanceItems = {
  async getAll() {
    const { data, error } = await _sb.from('maintenance_items').select('*').order('category').order('equipment_type');
    if (error) throw error;
    return data;
  },
  async getByType(equipmentType) {
    const { data, error } = await _sb.from('maintenance_items').select('*').ilike('equipment_type', equipmentType).single();
    if (error) return null;
    return data;
  },
  async upsertMany(items) {
    const { data, error } = await _sb.from('maintenance_items').upsert(items, { onConflict: 'equipment_type' }).select();
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('maintenance_items').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async getStdHours(equipmentType, frequency) {
    const item = await this.getByType(equipmentType);
    if (!item) return null;
    const map = { monthly: item.monthly_std_hours, quarterly: item.quarterly_std_hours, 'semi-annual': item.semi_annual_std_hours, annual: item.annual_std_hours };
    return map[frequency] ?? item.quarterly_std_hours ?? null;
  },
};

// ── Markup Matrix ─────────────────────────────────────────
export const MarkupMatrix = {
  async getAll() {
    const { data, error } = await _sb.from('markup_matrix').select('*').order('sort_order');
    if (error) throw error;
    return data;
  },
  async update(id, rec) {
    const { data, error } = await _sb.from('markup_matrix').update({ ...rec, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async getMultiplier(costDollars) {
    const rows = await this.getAll();
    for (const row of rows) {
      if (costDollars >= row.cost_from && (row.cost_to === null || costDollars <= row.cost_to)) return row.multiplier;
    }
    return 1.34;
  },
};

// ── User Settings ─────────────────────────────────────────
export const UserSettings = {
  async get(key) {
    const { data, error } = await _sb.from('user_settings').select('value').eq('key', key).single();
    if (error) return null;
    return data?.value ?? null;
  },
  async set(key, value) {
    const { data, error } = await _sb.from('user_settings').upsert({ key, value, updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Equipment Master Sync ─────────────────────────────────
export const EquipmentMasterSync = {
  async seedManufacturers(manufacturers) {
    const rows = manufacturers.map(name => ({ name }));
    const CHUNK = 100;
    let count = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await _sb.from('equipment_manufacturers').upsert(rows.slice(i, i + CHUNK), { onConflict: 'name', ignoreDuplicates: true });
      if (!error) count += Math.min(CHUNK, rows.length - i);
    }
    return count;
  },
  async getManufacturers() {
    const { data, error } = await _sb.from('equipment_manufacturers').select('name').order('name');
    if (error) return [];
    return (data || []).map(r => r.name);
  },
};
