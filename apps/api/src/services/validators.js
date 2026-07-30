/** Validação de CPF e CNPJ com dígitos verificadores (algoritmo oficial). */

export function cpfValid(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  if (s.length !== 11 || /^(\d)\1{10}$/.test(s)) return false;
  const dv = (n) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += Number(s[i]) * (n + 1 - i);
    return ((t * 10) % 11) % 10 === Number(s[n]);
  };
  return dv(9) && dv(10);
}

export function cnpjValid(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  if (s.length !== 14 || /^(\d)\1{13}$/.test(s)) return false;
  const calc = (len) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let t = 0;
    for (let i = 0; i < len; i++) t += Number(s[i]) * w[i];
    const r = t % 11;
    return (r < 2 ? 0 : 11 - r) === Number(s[len]);
  };
  return calc(12) && calc(13);
}

/** Aceita CNPJ (empresa) ou CPF (MEI/autônomo) como documento do estabelecimento. */
export function businessDocValid(raw) {
  const s = String(raw || '').replace(/\D/g, '');
  return s.length === 14 ? cnpjValid(s) : cpfValid(s);
}
