// Contrasena temporal: 16 caracteres con minuscula, mayuscula y digito (politica de Auth:
// minimo 12 y lower_upper_letters_digits). Sin caracteres confusos (0/O, 1/l/I). CSPRNG.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGIT = "23456789";

function pick(chars: string): string {
  // Rechazo de sesgo: descarta valores fuera del multiplo mayor de chars.length.
  const limit = 256 - (256 % chars.length);
  const b = new Uint8Array(1);
  do crypto.getRandomValues(b); while (b[0] >= limit);
  return chars[b[0] % chars.length];
}

export function temporaryPassword(length = 16): string {
  const all = LOWER + UPPER + DIGIT;
  const out = [pick(LOWER), pick(UPPER), pick(DIGIT)];
  while (out.length < length) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Number(crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}
