import React from 'react';
import spriteSvg from '../assets/sprite.svg?raw';

// Injeta os <symbol> do pacote de ícones uma vez no documento.
// O <use href="#id"> resolve dentro da mesma página, então funciona
// no app empacotado (protocolo file://), onde fetch/URL externa falha.
const cleanSprite = spriteSvg.replace('style="display:none"', '');

export function SpriteDefs() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: cleanSprite }}
    />
  );
}

// Uso: <SpriteIcon name="jogar" size={20} />
// Nomes disponíveis: ver os ids em src/renderer/assets/sprite.svg
// (jogar, inicio, modos, mapa, configuracoes, sair, usuario, usuarios, ...).
export default function SpriteIcon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`sprite-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#${name}`} />
    </svg>
  );
}
