import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api.js';
import { formatRupiah } from '../../lib/format.js';

const PAY_LABEL = { qris: 'QRIS', cash: 'Cash di Kasir', debit: 'Debit di Kasir' };

export function buildWorkbook(report) {
  const rows = (report.transactions || []).map((t) => ({
    'No. Pesanan': t.order_number,
    Tanggal: t.created_at,
    Pemesan: t.customer_name,
    Meja: t.table_number,
    'Metode Bayar': PAY_LABEL[t.payment_method] || t.payment_method,
    Total: Number(t.total_amount),
    Akun: 'Kasir Utama / Admin Kaika Space',
  }));
  const wb = XLSX.utils.book_new();
  const summary = [
    { Ringkasan: 'Total Pendapatan', Nilai: Number(report.summary?.total_revenue || 0) },
    { Ringkasan: 'Jumlah Transaksi', Nilai: Number(report.summary?.total_orders || 0) },
    { Ringkasan: 'Rata-rata per Transaksi', Nilai: Number(report.summary?.average || 0) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Transaksi');
  return wb;
}

export default function Reports({ onUnauthorized }) {
  const [report, setReport] = useState({ summary: {}, transactions: [] });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await api.report(params);
      setReport(r.data ?? r);
      setError('');
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      else setError('Gagal memuat laporan.');
    }
  }, [from, to, onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const exportXlsx = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(buildWorkbook(report), `laporan-kaika-${stamp}.xlsx`);
  };

  const s = report.summary || {};

  return (
    <section>
      <div className="toolbar">
        <label className="field inline"><span>Dari</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field inline"><span>Sampai</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="button" className="btn btn--primary" onClick={exportXlsx}>Ekspor ke Excel</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stat-grid">
        <div className="stat"><small>Total Pendapatan</small><strong>{formatRupiah(s.total_revenue)}</strong></div>
        <div className="stat"><small>Jumlah Transaksi</small><strong>{s.total_orders ?? 0}</strong></div>
        <div className="stat"><small>Rata-rata / Transaksi</small><strong>{formatRupiah(s.average)}</strong></div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>No. Pesanan</th><th>Waktu</th><th>Pemesan</th><th>Meja</th><th>Metode</th><th>Total</th></tr></thead>
          <tbody>
            {(report.transactions || []).map((t) => (
              <tr key={t.id}>
                <td data-label="No. Pesanan">{t.order_number}</td>
                <td data-label="Waktu">{t.created_at}</td>
                <td data-label="Pemesan">{t.customer_name}</td>
                <td data-label="Meja">{t.table_number}</td>
                <td data-label="Metode">{PAY_LABEL[t.payment_method] || t.payment_method}</td>
                <td data-label="Total">{formatRupiah(t.total_amount)}</td>
              </tr>
            ))}
            {report.transactions?.length === 0 && <tr><td colSpan={6} className="hint">Belum ada transaksi.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
