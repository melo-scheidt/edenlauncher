import React, { useEffect, useRef } from 'react';
import { SkinViewer, IdleAnimation } from 'skinview3d';

// skinview3d expects "default" for classic (Steve) and "slim" for Alex.
// Our UI uses "classic" / "slim" / "auto", so we map here.
function resolveModel(model) {
  if (model === 'slim') return 'slim';
  if (model === 'classic') return 'default';
  return undefined; // auto-detect
}

export default function SkinViewer3D({ skinUrl, width = 200, height = 300, model = 'auto' }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sv3dModel = resolveModel(model);

    // Inicializa o visualizador
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: width,
      height: height,
      skin: skinUrl || undefined,
    });

    // Animação idle (respiração suave e movimento dos braços)
    viewer.animation = new IdleAnimation();

    // Posicionamento da câmera e rotação leve
    viewer.camera.position.set(0, 0, 50);
    viewer.camera.lookAt(0, 0, 0);

    // Ajusta o FOV para enquadrar o personagem inteiro
    viewer.camera.fov = 40;
    viewer.camera.updateProjectionMatrix();

    // Se temos um modelo específico, aplicar depois do load da skin
    if (sv3dModel && viewer.playerObject?.skin) {
      viewer.playerObject.skin.modelType = sv3dModel;
    }

    // Salva a referência para updates futuros
    viewerRef.current = viewer;

    // Cleanup: destruir a instância ao desmontar o componente
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []); // Monta apenas uma vez

  // Atualiza a skin dinamicamente quando a url ou modelo mudar
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (skinUrl) {
      // loadSkin retorna uma Promise — capturamos erros silenciosamente
      viewer.loadSkin(skinUrl).then(() => {
        // Após carregar, forçar o modelo se especificado
        const sv3dModel = resolveModel(model);
        if (sv3dModel && viewer.playerObject?.skin) {
          viewer.playerObject.skin.modelType = sv3dModel;
        }
      }).catch((err) => {
        console.warn('[SkinViewer3D] Falha ao carregar skin:', err);
      });
    }
  }, [skinUrl, model]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        display: 'block',
        margin: '0 auto',
        imageRendering: 'pixelated',
        cursor: 'grab'
      }}
    />
  );
}
