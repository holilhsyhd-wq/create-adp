'use client';

import { useState } from 'react';

const RAM_OPTIONS = [
  { label: '1 GB', value: '1' },
  { label: '2 GB', value: '2' },
  { label: '3 GB', value: '3' },
  { label: '4 GB', value: '4' },
  { label: '5 GB', value: '5' },
  { label: '6 GB', value: '6' },
  { label: '7 GB', value: '7' },
  { label: '8 GB', value: '8' },
  { label: '9 GB', value: '9' },
  { label: 'Unlimited', value: 'unlimited' }
];

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const ramOption = formData.get('ramOption'); // 1–9 atau "unlimited"
    const memoryMB =
      ramOption === 'unlimited'
        ? 0                       // 0 = unlimited di Pterodactyl
        : Number(ramOption) * 1024; // GB → MB

    const payload = {
      name: formData.get('name'),
      userId: Number(formData.get('userId')),
      eggId: Number(formData.get('eggId')),
      memory: memoryMB,
      disk: Number(formData.get('disk')),     // dalam MB
      cpu: Number(formData.get('cpu')),       // 0 = unlimited
      allocationId: Number(formData.get('allocationId')),
      dockerImage: formData.get('dockerImage') || '',
      startup: formData.get('startup') || ''
    };

    try {
      const res = await fetch('/api/create-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Gagal membuat server');
      }

      setResult(`Server berhasil dibuat! ID: ${data?.attributes?.id ?? 'cek di panel'}`);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-2xl p-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Pterodactyl Server Creator</h1>
          <p className="text-slate-400">
            Form simple untuk membuat server baru di panel Pterodactyl.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur"
        >
          <div>
            <label className="block text-sm mb-1" htmlFor="name">
              Nama Server
            </label>
            <input
              id="name"
              name="name"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: My Awesome Server"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="userId">
                User ID (di panel)
              </label>
              <input
                id="userId"
                name="userId"
                type="number"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" htmlFor="eggId">
                Egg ID
              </label>
              <input
                id="eggId"
                name="eggId"
                type="number"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="5"
              />
            </div>
          </div>

          {/* RAM SELECT 1–9 GB + Unlimited */}
          <div>
            <label className="block text-sm mb-1" htmlFor="ramOption">
              RAM
            </label>
            <select
              id="ramOption"
              name="ramOption"
              required
              defaultValue="1"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RAM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Unlimited = memory 0 (tanpa batas). Hati-hati di node kecil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="disk">
                Disk (MB)
              </label>
              <input
                id="disk"
                name="disk"
                type="number"
                required
                defaultValue={10240}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" htmlFor="cpu">
                CPU (%)
              </label>
              <input
                id="cpu"
                name="cpu"
                type="number"
                required
                defaultValue={0}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                0 = unlimited CPU.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="allocationId">
              Allocation ID (port) di panel
            </label>
            <input
              id="allocationId"
              name="allocationId"
              type="number"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ID allocation yang sudah dibuat"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="dockerImage">
              Docker Image (opsional)
            </label>
            <input
              id="dockerImage"
              name="dockerImage"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Contoh: ghcr.io/pterodactyl/yolks:debian"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="startup">
              Startup Command (opsional)
            </label>
            <input
              id="startup"
              name="startup"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Kalau kosong pakai default dari egg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Membuat server...' : 'Buat Server'}
          </button>
        </form>

        {result && (
          <div className="mt-4 rounded-xl border border-emerald-700 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-100">
            {result}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-700 bg-rose-900/40 px-4 py-3 text-sm text-rose-100">
            Error: {error}
          </div>
        )}
      </div>
    </main>
  );
}
