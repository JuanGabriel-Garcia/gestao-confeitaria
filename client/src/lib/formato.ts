const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number): string {
  return moeda.format(Number.isFinite(valor) ? valor : 0);
}

/** Para valores muito pequenos (ex.: custo por grama), mostra mais casas decimais. */
export function formatarMoedaPrecisa(valor: number): string {
  if (!Number.isFinite(valor)) return moeda.format(0);
  const casas = valor !== 0 && Math.abs(valor) < 0.1 ? 4 : 2;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarNumero(valor: number, maxCasas = 3): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: maxCasas }).format(valor);
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

/** Converte texto digitado ("1.234,56", "12,5" ou "12.5") em número. Retorna NaN se inválido. */
export function lerDecimal(texto: string): number {
  let t = texto.trim().replace(/\s/g, '').replace(/^R\$/, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}

/** Converte número para o formato de edição em campos de texto ("12,5"). */
export function paraCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  return String(valor).replace('.', ',');
}
