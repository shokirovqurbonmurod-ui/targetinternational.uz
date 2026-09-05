import { useEffect, useState } from 'react';
import { Calculator as CalcIcon, Delete } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'];

function safeEval(expr) {
  const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[0-9+\-*/.() ]+$/.test(normalized)) throw new Error('Notog\'ri ifoda');
  // eslint-disable-next-line no-new-func
  const val = Function(`"use strict"; return (${normalized})`)();
  if (!Number.isFinite(val)) throw new Error('Hisoblab bo\'lmadi');
  return val;
}

export default function CalculatorPage() {
  const { user } = useAuth();
  const [expr, setExpr] = useState('');
  const [rows, setRows] = useState(null);

  async function load() {
    const h = await api.get('/calculator_history?limit=500').catch(() => []);
    setRows((h || []).filter((r) => r.user === user.full_name).slice(0, 15));
  }
  useEffect(() => { load(); }, []);

  function press(k) {
    if (k === '=') {
      try {
        const result = safeEval(expr);
        api.post('/calculator/save', { expression: expr, result }).then(load).catch(() => {});
        setExpr(String(result));
      } catch (e) { setExpr('Xato'); }
      return;
    }
    setExpr((e) => (e === 'Xato' ? k : e + k));
  }

  if (rows === null) return <Spinner />;

  return (
    <div className="max-w-md mx-auto">
      <PageHeader icon={CalcIcon} title="Kalkulator" subtitle="Tez hisob-kitob va tarix" />

      <div className="card p-5 mb-6">
        <div className="rounded-2xl bg-navy-900 text-white text-right px-4 py-6 mb-4 text-3xl font-display truncate">{expr || '0'}</div>
        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((k) => (
            <button key={k} onClick={() => press(k)}
              className={`rounded-xl py-4 text-lg font-bold transition ${k === '=' ? 'btn-gold' : 'bg-navy-50 hover:bg-navy-100 text-navy-700'}`}>
              {k}
            </button>
          ))}
        </div>
        <button onClick={() => setExpr('')} className="btn-ghost w-full mt-2 !py-2 text-sm"><Delete size={14} /> Tozalash</button>
      </div>

      {rows.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-navy-800 mb-3">Tarix</h3>
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-navy-50/60 px-4 py-2.5 text-sm">
                <span className="text-navy-500">{r.expression}</span>
                <span className="font-bold text-navy-800">= {r.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
