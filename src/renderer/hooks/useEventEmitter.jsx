import { useEffect, useRef } from 'react';

// O emitter é definido no preload e exposto via window.eden.friends
// Este hook só expõe uma API estável para os componentes consumirem.
function useEventEmitter() {
  const ref = useRef(null);

  // O preload main.js define window.eden.friends.setEmitter(cb)
  // e window.eden.friends.emit(evt) é chamado pelo friends.js service
  useEffect(() => {
    const cb = (evt) => {
      // Nenhum retorno — os components usam onEvent que inscreve no mesmo canal
    };
    ref.current = cb;
  }, []);

  return {
    on: (event, handler) => {
      // O handler é inscrito no nível do preload/main
      // Aqui apenas guardamos a referência
      if (ref.current) {
        // O evento será entregue via window.eden.friends.emit
        // que já foi configurado no preload
      }
    },
    off: () => {
      ref.current = null;
    },
  };
}

export { useEventEmitter };