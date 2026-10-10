// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DebateArena from '@/components/DebateArena';
import { ToastProvider, useToast } from '@/components/Toast';
import { __resetPreferencesStore } from '@/hooks/usePreferences';
import { PREFS_KEY } from '@/lib/prefs';
import { fixtureResult } from '../fixtures/analysis';

beforeEach(() => { window.localStorage.clear(); __resetPreferencesStore(); });
afterEach(cleanup);
const arena = () => render(<DebateArena result={fixtureResult} />);

describe('DebateArena', () => {
  it('default: tampilan detail, 25 kartu agent', () => {
    arena();
    expect(screen.getByText('Menampilkan 25 dari 25 agent')).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(25);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('Compact View: tabel 25 baris, preferensi tersimpan ke localStorage', () => {
    arena();
    fireEvent.click(screen.getByRole('button', { name: 'Ringkas' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(26); // header + 25
    expect(JSON.parse(window.localStorage.getItem(PREFS_KEY)!)).toMatchObject({ viewMode: 'compact' });
  });

  it('preferensi dimuat ulang dari localStorage', () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ viewMode: 'compact', sort: 'name' }));
    __resetPreferencesStore();
    arena();
    expect(screen.getByRole('table')).toBeTruthy();
    expect((screen.getByLabelText('Urutkan') as HTMLSelectElement).value).toBe('name');
  });

  it('Quick Filter menyaring agent dan memperbarui jumlah', () => {
    arena();
    fireEvent.change(screen.getByLabelText('Cari agent atau topik debat'), { target: { value: 'Fibonacci' } });
    expect(screen.getByText(/Menampilkan 1 dari 25 agent/)).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('filter tanpa hasil → empty state + Reset filter memulihkan 25 agent', () => {
    arena();
    fireEvent.change(screen.getByLabelText('Cari agent atau topik debat'), { target: { value: 'zzzxxx' } });
    expect(screen.getByText('Tidak ada agent yang cocok')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset filter' })[0]!);
    expect(screen.getAllByRole('article')).toHaveLength(25);
  });

  it('filter bias memakai aria-pressed dan menyaring', () => {
    arena();
    const btn = screen.getByRole('button', { name: /^Bearish/ });
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('konsensus TIDAK berubah oleh filter', () => {
    arena();
    const text = () => screen.getByText(/dihitung dari semua 25 agent/).textContent;
    const before = text();
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'Quantitative' } });
    expect(text()).toBe(before);
  });

  it('Compact: klik baris membuka argumen (aria-expanded)', () => {
    arena();
    fireEvent.click(screen.getByRole('button', { name: 'Ringkas' }));
    const row = screen.getAllByRole('button', { expanded: false })[0]!;
    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Argumen fixture untuk ICT/)).toBeTruthy();
  });

  it('pencarian menyaring debat; Escape mengosongkan', () => {
    arena();
    const input = screen.getByLabelText('Cari agent atau topik debat') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'cpi' } });
    expect(screen.getByText(/1 debat cocok/)).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });

  it('pintasan "/" memfokuskan pencarian, tetapi tidak saat mengetik di kolom lain', () => {
    arena();
    const input = screen.getByLabelText('Cari agent atau topik debat');
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(input);
    const select = screen.getByLabelText('Kategori'); select.focus();
    fireEvent.keyDown(select, { key: '/' });
    expect(document.activeElement).toBe(select);
  });

  it('localStorage rusak tidak membuat crash', () => {
    window.localStorage.setItem(PREFS_KEY, '{{{');
    __resetPreferencesStore();
    arena();
    expect(screen.getAllByRole('article')).toHaveLength(25);
  });
});

describe('Toast', () => {
  function Trigger() { const { toast } = useToast(); return <><button onClick={() => toast('error', 'Gagal total')}>e</button><button onClick={() => toast('success', 'Berhasil')}>s</button></>; }
  it('error memakai role=alert, success role=status, bisa ditutup', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('e')); fireEvent.click(screen.getByText('s'));
    expect(screen.getByRole('alert').textContent).toContain('Gagal total');
    expect(screen.getByRole('status').textContent).toContain('Berhasil');
    fireEvent.click(screen.getAllByRole('button', { name: 'Tutup notifikasi' })[0]!); // tutup toast error
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });
  it('maksimal 3 toast tampil', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText('s'));
    expect(screen.getAllByRole('status')).toHaveLength(3);
  });
  it('tanpa provider tidak crash (no-op)', () => {
    render(<Trigger />);
    expect(() => fireEvent.click(screen.getByText('e'))).not.toThrow();
  });
});
