import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Layers, Sparkles, Box, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { getValue, setValue } from '../lib/store.js';
import '../styles/mods.css';

import skinLayersImg from '../assets/mods/3d skin layers.png';
import statusEffectBarsImg from '../assets/mods/Status Effect Bars.png';
import cameraOverhaulImg from '../assets/mods/camera overhaul.png';
import distantHorizonsImg from '../assets/mods/distant horizons.png';
import emotecraftImg from '../assets/mods/emotecraft.png';
import flashbackImg from '../assets/mods/flashback.png';
import irisShadersImg from '../assets/mods/iris shaders.png';
import lambDynamicLightsImg from '../assets/mods/lambdynamiclights.png';
import litematicaImg from '../assets/mods/litematica.png';
import replayModImg from '../assets/mods/replaymod.png';

import bslImg from '../assets/shaders/bsl.png';
import bslUnboundImg from '../assets/shaders/bsl-unbound.png';
import complementaryImg from '../assets/shaders/complementary.png';
import ctrVcrImg from '../assets/shaders/ctr-vcr.png';
import dreamlightImg from '../assets/shaders/dreamlight.png';
import photonImg from '../assets/shaders/photon.png';
import prismarineImg from '../assets/shaders/prismarine.png';
import solasImg from '../assets/shaders/solas.png';
import sdvImg from '../assets/shaders/super-duper-vanilla.png';

function getModImage(name, type) {
  const cleanName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanName.includes('skinlayers') || cleanName.includes('3dskin')) return skinLayersImg;
  if (cleanName.includes('statuseffect') || cleanName.includes('statuseffectbars')) return statusEffectBarsImg;
  if (cleanName.includes('cameraoverhaul')) return cameraOverhaulImg;
  if (cleanName.includes('distanthorizons')) return distantHorizonsImg;
  if (cleanName.includes('emotecraft')) return emotecraftImg;
  if (cleanName.includes('flashback')) return flashbackImg;
  if (cleanName.includes('iris')) return irisShadersImg;
  if (cleanName.includes('lambdynamiclights') || cleanName.includes('dynamiclights')) return lambDynamicLightsImg;
  if (cleanName.includes('litematica')) return litematicaImg;
  if (cleanName.includes('replaymod')) return replayModImg;
  return null;
}

function getShaderImage(name) {
  const clean = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // IMPORTANTE: checar variações longas primeiro
  if (clean.includes('bslunbound') || clean.includes('unbound')) return bslUnboundImg;
  if (clean.includes('superduper') || clean.includes('superdupervanilla')) return sdvImg;
  if (clean.includes('complementary') || clean.includes('reimagined')) return complementaryImg;
  if (clean.includes('bsl')) return bslImg;
  if (clean.includes('ctr') || clean.includes('vcr')) return ctrVcrImg;
  if (clean.includes('dreamlight')) return dreamlightImg;
  if (clean.includes('photon')) return photonImg;
  if (clean.includes('prismarine')) return prismarineImg;
  if (clean.includes('solas')) return solasImg;
  if (clean.includes('vanilla')) return sdvImg;
  return null;
}

// ── Catálogo Oficial de Shaders (com fotos da pasta "fotos shaders") ─────────
// match = palavras-chave usadas para casar o zip embutido com o card do catálogo
const OFFICIAL_SHADERS = [
  {
    id: 'BSL Shaders',
    name: 'BSL Shaders',
    description: 'Iluminação realista, sombras suaves e reflexos cinematográficos.',
    image: bslImg,
    match: ['bsl'],
  },
  {
    id: 'BSL Shaders Unbound',
    name: 'BSL Shaders Unbound',
    description: 'Versão alternativa do BSL com cores vívidas e céu estilizado.',
    image: bslUnboundImg,
    match: ['bslunbound'],
  },
  {
    id: 'Complementary Shaders',
    name: 'Complementary Shaders',
    description: 'Sucessor espiritual do BSL, vibrante e altamente otimizado.',
    image: complementaryImg,
    match: ['complementary', 'reimagined'],
  },
  {
    id: 'CTR VCR',
    name: 'CTR VCR',
    description: 'Estética retrô VHS com distorções analógicas e ruído de fita.',
    image: ctrVcrImg,
    match: ['ctr', 'vcr'],
  },
  {
    id: 'Dreamlight',
    name: 'Dreamlight',
    description: 'Atmosfera onírica com luzes suaves e neblina volumétrica.',
    image: dreamlightImg,
    match: ['dreamlight'],
  },
  {
    id: 'Photon',
    name: 'Photon',
    description: 'Path-tracing experimental com iluminação global realista.',
    image: photonImg,
    match: ['photon'],
  },
  {
    id: 'Prismarine',
    name: 'Prismarine',
    description: 'Água cristalina, sombras nítidas e clima tropical.',
    image: prismarineImg,
    match: ['prismarine'],
  },
  {
    id: 'Solas Shader',
    name: 'Solas Shader',
    description: 'Estilo fantasia com luzes quentes e auroras marcantes.',
    image: solasImg,
    match: ['solas'],
  },
  {
    id: 'Super Duper Vanilla',
    name: 'Super Duper Vanilla',
    description: 'Vanilla aprimorado, sombras leves mantendo a estética original.',
    image: sdvImg,
    match: ['superduper', 'sdv'],
  },
];

// Casca o nome do zip com a entrada correspondente do catálogo oficial
function findOfficialShader(zipName) {
  const clean = (zipName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;
  for (const o of OFFICIAL_SHADERS) {
    if (o.match?.some((k) => clean.includes(k))) return o;
  }
  return null;
}

// ── Lista Oficial de Mods das Pastas do Projeto ──────────────────────────────
const OFFICIAL_MANDATORY_MODS = [
  {
    id: 'CustomPlayerModels-Fabric-1.21.5-0.6.27a.jar',
    filename: 'CustomPlayerModels-Fabric-1.21.5-0.6.27a.jar',
    baseFilename: 'CustomPlayerModels-Fabric-1.21.5-0.6.27a.jar',
    name: 'Custom Player Models',
    description: 'Modelos customizados, orelhas, caudas e animações personalizadas de personagem.',
    icon: 'skin3d',
    required: true,
  },
  {
    id: 'fabric-api-0.128.2+1.21.5.jar',
    filename: 'fabric-api-0.128.2+1.21.5.jar',
    baseFilename: 'fabric-api-0.128.2+1.21.5.jar',
    name: 'Fabric API',
    description: 'API base indispensável para o funcionamento dos mods no Fabric Loader.',
    icon: 'wrench',
    required: true,
  },
  {
    id: 'malilib-fabric-1.21.5-0.24.3.jar',
    filename: 'malilib-fabric-1.21.5-0.24.3.jar',
    baseFilename: 'malilib-fabric-1.21.5-0.24.3.jar',
    name: 'MaLiLib',
    description: 'Biblioteca base de utilitários e configurações integradas.',
    icon: 'config',
    required: true,
  },
  {
    id: 'sodium-fabric-0.6.12+mc1.21.5.jar',
    filename: 'sodium-fabric-0.6.12+mc1.21.5.jar',
    baseFilename: 'sodium-fabric-0.6.12+mc1.21.5.jar',
    name: 'Sodium',
    description: 'Mecanismo de renderização moderno que multiplica a taxa de FPS.',
    icon: 'performance',
    required: true,
  },
  {
    id: 'voicechat-fabric-1.21.5-2.6.21.jar',
    filename: 'voicechat-fabric-1.21.5-2.6.21.jar',
    baseFilename: 'voicechat-fabric-1.21.5-2.6.21.jar',
    name: 'Simple Voice Chat',
    description: 'Chat de voz posicional 3D por proximidade com suporte a grupos e microfone.',
    icon: 'voice',
    required: true,
  },
];

const OFFICIAL_OPTIONAL_MODS = [
  {
    id: 'CameraOverhaul-v2.1.1-fabric+mc[1.21.5-1.21.8].jar',
    filename: 'CameraOverhaul-v2.1.1-fabric+mc[1.21.5-1.21.8].jar',
    baseFilename: 'CameraOverhaul-v2.1.1-fabric+mc[1.21.5-1.21.8].jar',
    name: 'Camera Overhaul',
    description: 'Movimentação e inclinação realista da câmera ao andar, correr, voar e pular.',
    icon: 'camera',
  },
  {
    id: 'cloth-config-18.0.145-fabric.jar',
    filename: 'cloth-config-18.0.145-fabric.jar',
    baseFilename: 'cloth-config-18.0.145-fabric.jar',
    name: 'Cloth Config',
    description: 'Biblioteca para menus de configuração gráficos interativos de mods.',
    icon: 'config',
  },
  {
    id: 'cpm-svc-compat-1.3.2.jar',
    filename: 'cpm-svc-compat-1.3.2.jar',
    baseFilename: 'cpm-svc-compat-1.3.2.jar',
    name: 'CPM Voice Chat Compat',
    description: 'Sincronização de animações labiais e expressões do CPM com o chat de voz.',
    icon: 'voice',
  },
  {
    id: 'DistantHorizons-3.2.0-b-1.21.5-fabric-neoforge.jar',
    filename: 'DistantHorizons-3.2.0-b-1.21.5-fabric-neoforge.jar',
    baseFilename: 'DistantHorizons-3.2.0-b-1.21.5-fabric-neoforge.jar',
    name: 'Distant Horizons',
    description: 'Aumenta drasticamente o alcance de renderização do horizonte sem perder FPS.',
    icon: 'horizon',
  },
  {
    id: 'emotecraft-fabric-for-MC1.21.5-2.6.2.jar',
    filename: 'emotecraft-fabric-for-MC1.21.5-2.6.2.jar',
    baseFilename: 'emotecraft-fabric-for-MC1.21.5-2.6.2.jar',
    name: 'Emotecraft',
    description: 'Permite executar animações corporais, danças e poses no Roleplay.',
    icon: 'emote',
  },
  {
    id: 'Flashback-0.39.7-for-MC1.21.5.jar',
    filename: 'Flashback-0.39.7-for-MC1.21.5.jar',
    baseFilename: 'Flashback-0.39.7-for-MC1.21.5.jar',
    name: 'Flashback Replay',
    description: 'Gravação contínua e reprodução instantânea de replays em tempo real.',
    icon: 'replay',
  },
  {
    id: 'iris-fabric-1.8.11+mc1.21.5.jar',
    filename: 'iris-fabric-1.8.11+mc1.21.5.jar',
    baseFilename: 'iris-fabric-1.8.11+mc1.21.5.jar',
    name: 'Iris Shaders',
    description: 'Suporte a shaders gráficos com alta performance e compatibilidade.',
    icon: 'iris',
  },
  {
    id: 'lambdynamiclights-4.8.7+1.21.5.jar',
    filename: 'lambdynamiclights-4.8.7+1.21.5.jar',
    baseFilename: 'lambdynamiclights-4.8.7+1.21.5.jar',
    name: 'LambDynamicLights',
    description: 'Iluminação dinâmica ao segurar tochas, lanternas ou itens brilhantes na mão.',
    icon: 'torch',
  },
  {
    id: 'litematica-fabric-1.21.5-0.22.5.jar',
    filename: 'litematica-fabric-1.21.5-0.22.5.jar',
    baseFilename: 'litematica-fabric-1.21.5-0.22.5.jar',
    name: 'Litematica',
    description: 'Projetor de esquemáticos e blueprints holográficos para construções 3D.',
    icon: 'schematic',
  },
  {
    id: 'replaymod-1.21.5-2.6.27.jar',
    filename: 'replaymod-1.21.5-2.6.27.jar',
    baseFilename: 'replaymod-1.21.5-2.6.27.jar',
    name: 'Replay Mod',
    description: 'Grave e renderize tomadas cinemáticas profissionais das suas partidas.',
    icon: 'replay',
  },
  {
    id: 'skinlayers3d-fabric-1.11.2-mc1.21.5.jar',
    filename: 'skinlayers3d-fabric-1.11.2-mc1.21.5.jar',
    baseFilename: 'skinlayers3d-fabric-1.11.2-mc1.21.5.jar',
    name: '3D Skin Layers',
    description: 'Renderiza a segunda camada da skin como detalhes volumétricos em 3D.',
    icon: 'skin3d',
  },
  {
    id: 'status-effect-bars-1.0.8.jar',
    filename: 'status-effect-bars-1.0.8.jar',
    baseFilename: 'status-effect-bars-1.0.8.jar',
    name: 'Status Effect Bars',
    description: 'Barras visuais com contagem regressiva de efeitos de poções e buffs.',
    icon: 'bars',
  },
];

const POPULAR_MODS_MAP = {
  customplayermodels: { name: 'Custom Player Models', description: 'Modelos customizados e animações de personagem.', icon: 'skin3d' },
  fabricapi: { name: 'Fabric API', description: 'API base indispensável para mods no Fabric.', icon: 'wrench' },
  malilib: { name: 'MaLiLib', description: 'Biblioteca de utilitários e configurações.', icon: 'config' },
  sodium: { name: 'Sodium', description: 'Mecanismo de renderização de alta performance.', icon: 'performance' },
  voicechat: { name: 'Simple Voice Chat', description: 'Chat de voz posicional 3D por proximidade.', icon: 'voice' },
  cameraoverhaul: { name: 'Camera Overhaul', description: 'Movimentação fluida e inclinação da câmera.', icon: 'camera' },
  distanthorizons: { name: 'Distant Horizons', description: 'Alcance de renderização do horizonte sem perder FPS.', icon: 'horizon' },
  flashback: { name: 'Flashback Replay', description: 'Gravação e reprodução de replays em tempo real.', icon: 'replay' },
  clothconfig: { name: 'Cloth Config', description: 'Menus de configuração interativos de mods.', icon: 'config' },
  cpmsvccompat: { name: 'CPM Voice Chat Compat', description: 'Sincronização de fala do CPM com Voice Chat.', icon: 'voice' },
  emotecraft: { name: 'Emotecraft', description: 'Animações corporais, danças e poses no RP.', icon: 'emote' },
  iris: { name: 'Iris Shaders', description: 'Shaders gráficos de alta performance.', icon: 'iris' },
  lambdynamiclights: { name: 'LambDynamicLights', description: 'Iluminação dinâmica ao segurar tochas na mão.', icon: 'torch' },
  litematica: { name: 'Litematica', description: 'Projetor de esquemáticos holográficos 3D.', icon: 'schematic' },
  replaymod: { name: 'Replay Mod', description: 'Grave tomadas cinemáticas das partidas.', icon: 'replay' },
  skinlayers3d: { name: '3D Skin Layers', description: 'Camadas da skin em modelo 3D volumétrico.', icon: 'skin3d' },
  statuseffectbars: { name: 'Status Effect Bars', description: 'Barras de duração de poções e buffs.', icon: 'bars' },
};

function formatModInfo(filename) {
  const clean = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, info] of Object.entries(POPULAR_MODS_MAP)) {
    if (clean.includes(key)) return info;
  }
  let rawName = filename
    .replace(/\.jar(\.disabled)?$/i, '')
    .replace(/[-_](fabric|forge|neoforge|quilt|mc\d+[\.\d+]*|\d+[\.\d+]*).*$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
  return {
    name: rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : filename,
    description: 'Mod cliente instalado.',
    icon: 'generic',
  };
}

export default function ModsTab() {
  const [activeSubTab, setActiveSubTab] = useState('optional'); // 'optional' | 'mandatory' | 'shaders'
  const [optionalMods, setOptionalMods] = useState(OFFICIAL_OPTIONAL_MODS);
  const [mandatoryMods, setMandatoryMods] = useState(OFFICIAL_MANDATORY_MODS);
  const [shadersList, setShadersList]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeShader, setActiveShader] = useState('');

  // ── Carrega Mods Obrigatórios, Opcionais e Shaders ──────────────────────────
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Tenta carregar dados dinâmicos do backend Electron
      let allModsData = null;
      if (window.eden?.mods?.listAll) {
        allModsData = await window.eden.mods.listAll();
      }

      // Carrega estado de toggles salvos no store local
      const savedMods = (await getValue('mods', null)) || {};
      if (savedMods.shader) setActiveShader(savedMods.shader);

      // (A) Mods Obrigatórios
      if (allModsData?.mandatory?.length) {
        const mandatoryList = allModsData.mandatory.map((m) => {
          const info = formatModInfo(m.baseFilename || m.filename);
          return {
            id: m.baseFilename || m.filename,
            filename: m.filename,
            baseFilename: m.baseFilename || m.filename,
            name: info.name,
            description: info.description,
            icon: info.icon,
            size: m.size,
            required: true,
          };
        });
        setMandatoryMods(mandatoryList);
      } else {
        setMandatoryMods(OFFICIAL_MANDATORY_MODS);
      }

      // (B) Mods Opcionais
      let rawOptional = [];
      if (allModsData?.optional?.length) {
        rawOptional = allModsData.optional;
      } else if (window.eden?.mods?.listLocal) {
        rawOptional = await window.eden.mods.listLocal();
      }

      if (rawOptional.length > 0) {
        const mandatoryNames = new Set(OFFICIAL_MANDATORY_MODS.map((m) => m.baseFilename.toLowerCase().replace(/[^a-z]/g, '')));

        const optionalFormatted = rawOptional
          .filter((mod) => {
            const cleanName = (mod.baseFilename || mod.filename).toLowerCase().replace(/[^a-z]/g, '');
            if (cleanName.includes('voicechat') && mandatoryNames.has('voicechat')) return false;
            // Ignora mods antigos/legados que não pertençam às nossas listas oficiais
            return true;
          })
          .map((mod) => {
            const baseName = mod.baseFilename || mod.filename.replace(/\.disabled$/, '');
            const info = formatModInfo(baseName);
            const savedState = savedMods.enabled?.[baseName];

            return {
              id: baseName,
              filename: mod.filename,
              baseFilename: baseName,
              name: info.name,
              description: info.description,
              icon: info.icon,
              isEnabled: savedState !== undefined ? !!savedState : (mod.isEnabled ?? true),
              size: mod.size,
              isLocal: true,
            };
          });

        setOptionalMods(optionalFormatted);
      } else {
        // Fallback garantido: usa lista oficial com preferências aplicadas
        const fallbackFormatted = OFFICIAL_OPTIONAL_MODS.map((mod) => {
          const savedState = savedMods.enabled?.[mod.baseFilename];
          return {
            ...mod,
            isEnabled: savedState !== undefined ? !!savedState : (mod.isEnabled ?? true),
          };
        });
        setOptionalMods(fallbackFormatted);
      }

      // 2. Shaders: catálogo oficial embutido + zips já instalados
      let shaderCatalog = [];
      if (window.eden?.shaders?.listCatalog) {
        const res = await window.eden.shaders.listCatalog();
        if (res?.ok) shaderCatalog = res.catalog || [];
      }
      let localShaders = [];
      if (window.eden?.shaders?.listLocal) {
        localShaders = await window.eden.shaders.listLocal();
      }

      const noBackend = !window.eden?.shaders?.listCatalog;
      const seen = new Set();
      const shaderItems = [];

      for (const c of shaderCatalog) {
        seen.add(c.filename);
        const official = findOfficialShader(c.filename);
        shaderItems.push({
          filename: c.filename,
          name: official?.name || c.filename.replace(/\.zip$/i, ''),
          description: official?.description || 'Shader pack oficial do Éden.',
          image: official?.image || getShaderImage(c.filename),
          installed: !!c.installed,
          available: true,
        });
      }
      for (const s of localShaders) {
        if (seen.has(s)) continue;
        seen.add(s);
        const official = findOfficialShader(s);
        shaderItems.push({
          filename: s,
          name: official?.name || s.replace(/\.zip$/i, ''),
          description: official?.description || 'Shader pack instalado.',
          image: getShaderImage(s),
          installed: true,
          available: true,
        });
      }
      // Entradas do catálogo sem zip embutido aparecem como indisponíveis
      for (const o of OFFICIAL_SHADERS) {
        const matched = shaderItems.some((it) => findOfficialShader(it.filename) === o);
        if (!matched) {
          shaderItems.push({
            filename: o.id,
            name: o.name,
            description: o.description,
            image: o.image,
            installed: false,
            available: noBackend,
          });
        }
      }
      const shaderOrder = (it) => {
        const idx = OFFICIAL_SHADERS.findIndex((o) => findOfficialShader(it.filename) === o);
        return idx === -1 ? 99 : idx;
      };
      shaderItems.sort((a, b) => shaderOrder(a) - shaderOrder(b));
      setShadersList(shaderItems);

    } catch (e) {
      console.warn('[ModsTab] Erro ao carregar dados de mods:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ── Toggle Mod Opcional ───────────────────────────────────────────────────
  const handleToggleMod = async (mod) => {
    const nextState = !mod.isEnabled;

    // Optimistic update
    setOptionalMods((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, isEnabled: nextState } : m))
    );

    if (window.eden?.mods?.toggleLocal && mod.filename) {
      try {
        const result = await window.eden.mods.toggleLocal(mod.filename, nextState);
        if (result?.ok) {
          return;
        } else {
          throw new Error(result?.error || 'Falha ao alternar mod');
        }
      } catch (e) {
        console.error('[ModsTab] Falha ao alternar arquivo de mod:', e);
        // Revert optimistic update on failure
        setOptionalMods((prev) =>
          prev.map((m) => (m.id === mod.id ? { ...m, isEnabled: !nextState } : m))
        );
        return;
      }
    }

    // Preview mode (no Electron IPC)
    setOptionalMods((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, isEnabled: !nextState } : m))
    );
  };

  // ── Selecionar/Instalar Shader do catálogo oficial ────────────────────────
  const handleSelectShader = async (item) => {
    if (!item?.available) return;
    const next = activeShader === item.filename ? '' : item.filename;

    // Optimistic update
    setActiveShader(next);

    if (window.eden?.shaders?.select) {
      const res = await window.eden.shaders.select({ filename: next || null });
      if (!res?.ok) {
        setActiveShader(activeShader);
        console.error('[ModsTab] Falha ao aplicar shader:', res?.error);
        return;
      }
      if (next) {
        setShadersList((prev) => prev.map((s) => (s.filename === next ? { ...s, installed: true } : s)));
      }
    } else {
      // Preview no navegador (sem Electron)
      const currentStore = (await getValue('mods', null)) || {};
      await setValue('mods', { ...currentStore, shader: next });
    }
  };

  const irisMod = optionalMods.find((m) => (m.baseFilename || m.filename || '').toLowerCase().includes('iris'));
  const irisDisabled = !!irisMod && irisMod.isEnabled === false;

  return (
    <div className="mods-container-box eden-fade-in">
      {/* ── Barra Lateral de Sub-Abas ────────────────────────────────────── */}
      <aside className="mods-nav-sidebar">
        <button
          type="button"
          className={`mods-nav-btn ${activeSubTab === 'optional' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('optional')}
        >
          <SlidersHorizontal size={16} />
          Mods Opcionais
          {optionalMods.length > 0 && (
            <span className="mods-badge-count">{optionalMods.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`mods-nav-btn ${activeSubTab === 'shaders' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('shaders')}
        >
          <Sparkles size={16} />
          Shaders
          <span className="mods-badge-count">{shadersList.length}</span>
        </button>

        <div className="mods-nav-footer">
          <button
            type="button"
            className="mods-action-btn"
            onClick={refreshData}
            title="Recarregar arquivos"
          >
            <RefreshCw size={14} className={loading ? 'eden-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </aside>

      {/* ── Área de Conteúdo Principal ───────────────────────────────────── */}
      <main className="mods-content-area">
        {/* Cabeçalho */}
        <header className="mods-content-header">
          <div className="mods-header-info">
            <h2 className="mods-header-title">
              {activeSubTab === 'optional' && 'Mods Opcionais'}
              {activeSubTab === 'shaders' && 'Shaders e Iluminação'}
            </h2>
            <span className="mods-header-subtitle">
              {activeSubTab === 'optional' && 'Escolha quais recursos e utilitários adicionais você deseja ativar.'}
              {activeSubTab === 'shaders' && 'Selecione um pacote de iluminação e sombras para o jogo.'}
            </span>
          </div>
        </header>

        {/* ── ABA 1: MODS OPCIONAIS ────────────────────────────────────────── */}
        {activeSubTab === 'optional' && (
          <>
            {optionalMods.length === 0 ? (
              <div className="mods-empty-state">
                <Box size={40} className="mods-empty-icon" />
                <h3>Nenhum mod opcional encontrado</h3>
                <p>Os mods oficiais do Éden aparecerão aqui para você ativar ou desativar.</p>
              </div>
            ) : (
              <div className="mods-grid-layout">
                {optionalMods.map((mod) => (
                  <div key={mod.id} className="mod-item-card">
                    <div className="mod-item-left">
                      <div className="mod-item-icon">
                        <DynamicModIcon type={mod.icon} name={mod.name} />
                      </div>
                      <div className="mod-item-details">
                        <strong className="mod-item-title">{mod.name}</strong>
                        <p className="mod-item-desc">{mod.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mod-toggle-switch ${mod.isEnabled ? 'on' : ''}`}
                      role="switch"
                      aria-checked={mod.isEnabled}
                      onClick={() => handleToggleMod(mod)}
                      title={mod.isEnabled ? 'Desativar mod' : 'Ativar mod'}
                    >
                      <span className="mod-toggle-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ABA 3: SHADERS ──────────────────────────────────────────────── */}
        {activeSubTab === 'shaders' && (
          <>
            {irisDisabled && (
              <div className="shaders-iris-warning">
                <AlertTriangle size={15} />
                <span>
                  O mod <strong>Iris</strong> está desativado — ative-o na aba Mods Opcionais para os shaders funcionarem.
                </span>
              </div>
            )}

            <div className="shaders-grid-layout">
              {shadersList.map((item) => {
                const isActive = activeShader === item.filename;
                const img = item.image || getShaderImage(item.name);
                return (
                  <div
                    key={item.filename}
                    className={`shader-item-card ${isActive ? 'active' : ''} ${!item.available ? 'unavailable' : ''}`}
                    onClick={() => handleSelectShader(item)}
                  >
                    <div className="shader-item-preview">
                      {img ? (
                        <img src={img} alt={item.name} className="shader-preview-img" />
                      ) : (
                        <ShaderArt />
                      )}
                      {!item.available && (
                        <span className="shader-unavailable-badge">Indisponível</span>
                      )}
                    </div>
                    <div className="shader-item-body">
                      <div className="shader-item-header">
                        <strong>{item.name}</strong>
                        {item.installed && !isActive && (
                          <span className="shader-installed-badge">Instalado</span>
                        )}
                      </div>
                      <p className="shader-desc">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      className={`mod-toggle-switch ${isActive ? 'on' : ''}`}
                      role="switch"
                      aria-checked={isActive}
                    >
                      <span className="mod-toggle-thumb" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Renderizador de Ícones Vetoriais Dinâmicos ───────────────────────────────
function DynamicModIcon({ type, name }) {
  const image = getModImage(name, type);
  if (image) {
    return <img src={image} alt={name || 'Mod'} className="mod-item-icon-img" />;
  }

  switch (type) {
    case 'camera':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#1b2230" />
          <rect x="9" y="13" width="22" height="16" rx="4" fill="#3b82f6" fillOpacity="0.2" stroke="#60a5fa" strokeWidth="1.8" />
          <circle cx="20" cy="21" r="5" stroke="#93c5fd" strokeWidth="1.8" />
          <circle cx="20" cy="21" r="2" fill="#bfdbfe" />
          <path d="M14 13L16 9H24L26 13" stroke="#60a5fa" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );

    case 'horizon':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#132729" />
          <polygon points="6,32 17,16 25,24 34,13 34,32" fill="#14b8a6" fillOpacity="0.4" />
          <polygon points="6,32 14,22 22,30 28,20 34,32" fill="#2dd4bf" />
          <circle cx="28" cy="11" r="3" fill="#fef08a" />
        </svg>
      );

    case 'replay':
    case 'zoom':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#311319" />
          <rect x="10" y="14" width="16" height="12" rx="3" fill="#f43f5e" />
          <path d="M26 17L31 14V26L26 23V17Z" fill="#f43f5e" />
        </svg>
      );

    case 'emote':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#291838" />
          <circle cx="20" cy="11" r="4" fill="#c084fc" />
          <path d="M20 16V26M13 19L20 22L27 19M16 32L20 26L24 32" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'bars':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#142828" />
          <rect x="10" y="11" width="20" height="4" rx="2" fill="#2dd4bf" />
          <rect x="10" y="18" width="15" height="4" rx="2" fill="#38bdf8" />
          <rect x="10" y="25" width="11" height="4" rx="2" fill="#f59e0b" />
        </svg>
      );

    case 'skin3d':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#2d1f18" />
          <rect x="8" y="8" width="24" height="24" rx="4" fill="#a06035" />
          <rect x="12" y="14" width="16" height="12" rx="2" fill="#f8c8a0" />
          <rect x="14" y="18" width="3" height="3" fill="#2a5078" />
          <rect x="23" y="18" width="3" height="3" fill="#2a5078" />
          <path d="M6 10C6 7.8 7.8 6 10 6H30C32.2 6 34 7.8 34 10V22H6V10Z" fill="#c47844" opacity="0.9" />
        </svg>
      );

    case 'voice':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#182333" />
          <rect x="16" y="10" width="8" height="13" rx="4" fill="#38bdf8" />
          <path d="M12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 28V33M16 33H24" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'torch':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#2d2213" />
          <rect x="18" y="18" width="4" height="14" rx="1" fill="#78350f" />
          <rect x="17" y="15" width="6" height="4" rx="1" fill="#b45309" />
          <circle cx="20" cy="12" r="5" fill="#fbbf24" opacity="0.4" />
          <circle cx="20" cy="12" r="3" fill="#f59e0b" />
          <circle cx="20" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );

    case 'wrench':
    case 'config':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#242838" />
          <circle cx="20" cy="20" r="7" stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="3 3" />
          <circle cx="20" cy="20" r="3" fill="#38bdf8" />
        </svg>
      );

    case 'iris':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#0f2942" />
          <circle cx="20" cy="20" r="11" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="20" cy="20" r="5" fill="#38bdf8" />
          <circle cx="18" cy="18" r="1.5" fill="#ffffff" />
        </svg>
      );

    case 'performance':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#132a1c" />
          <path d="M12 26L20 12L28 26H12Z" stroke="#4ade80" strokeWidth="2" strokeLinejoin="round" fill="rgba(74, 222, 128, 0.2)" />
          <path d="M20 18V22" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'schematic':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#1b1d3a" />
          <path d="M20 7L31 13V27L20 33L9 27V13L20 7Z" fill="#3b82f6" fillOpacity="0.4" stroke="#60a5fa" strokeWidth="1.8" />
          <circle cx="20" cy="20" r="3" fill="#ef4444" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
          <rect width="40" height="40" rx="10" fill="#242838" />
          <circle cx="20" cy="20" r="8" stroke="#a78bfa" strokeWidth="2" />
          <text x="20" y="24" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
            {name ? name.charAt(0).toUpperCase() : 'M'}
          </text>
        </svg>
      );
  }
}

function ShaderArt() {
  return (
    <svg viewBox="0 0 200 80" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="shader-grad-art" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0d0b14" />
        </linearGradient>
      </defs>
      <rect width="200" height="80" fill="url(#shader-grad-art)" />
      <circle cx="160" cy="25" r="18" fill="#ffffff" opacity="0.9" />
      <polygon points="0,80 40,50 80,65 130,35 170,55 200,45 200,80" fill="rgba(15, 12, 24, 0.7)" />
      <polygon points="0,80 50,60 110,70 160,50 200,65 200,80" fill="rgba(10, 8, 16, 0.95)" />
    </svg>
  );
}
