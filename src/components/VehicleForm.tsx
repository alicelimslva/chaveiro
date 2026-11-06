import type { Vehicle } from '../types';

export type VehicleDraft = Pick<Vehicle, 'brand' | 'model' | 'plate' | 'key_type' | 'transponder'> & { year: string };
export const emptyVehicle: VehicleDraft = { brand: '', model: '', year: '', plate: '', key_type: '', transponder: '' };

const KEY_TYPES = ['Simples', 'Canivete', 'Canivete com telecomando', 'Presença (smart key)', 'Codificada', 'Gaveta'];

export function VehicleFields({ v, onChange }: { v: VehicleDraft; onChange: (v: VehicleDraft) => void }) {
  const set = (k: keyof VehicleDraft) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...v, [k]: e.target.value });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Marca</label>
        <input className="input" value={v.brand} onChange={set('brand')} placeholder="Fiat" />
      </div>
      <div>
        <label className="label">Modelo</label>
        <input className="input" value={v.model} onChange={set('model')} placeholder="Argo" />
      </div>
      <div>
        <label className="label">Ano</label>
        <input className="input" inputMode="numeric" value={v.year} onChange={set('year')} placeholder="2021" />
      </div>
      <div>
        <label className="label">Placa</label>
        <input className="input uppercase" value={v.plate} onChange={set('plate')} placeholder="ABC1D23" />
      </div>
      <div>
        <label className="label">Tipo de chave</label>
        <input className="input" list="key-types" value={v.key_type} onChange={set('key_type')} placeholder="Canivete" />
        <datalist id="key-types">
          {KEY_TYPES.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label">Transponder</label>
        <input className="input" value={v.transponder} onChange={set('transponder')} placeholder="ID48, ID46…" />
      </div>
    </div>
  );
}

export const vehicleFromDraft = (d: VehicleDraft) => ({
  brand: d.brand.trim(),
  model: d.model.trim(),
  year: d.year ? Number(d.year) || null : null,
  plate: d.plate,
  key_type: d.key_type.trim(),
  transponder: d.transponder.trim(),
});

export const vehicleLabel = (v: Pick<Vehicle, 'brand' | 'model' | 'year' | 'plate'>) =>
  [v.brand, v.model, v.year].filter(Boolean).join(' ') + (v.plate ? ` · ${v.plate}` : '');
