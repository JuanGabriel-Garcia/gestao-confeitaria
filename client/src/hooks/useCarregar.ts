import { useCallback, useEffect, useRef, useState } from 'react';

/** Carrega dados assíncronos e expõe estado de carregamento/erro. */
export function useCarregar<T>(carregar: () => Promise<T>, deps: unknown[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const ref = useRef(carregar);
  ref.current = carregar;

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await ref.current());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { dados, setDados, erro, carregando, recarregar };
}
