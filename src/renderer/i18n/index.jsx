import React, { createContext, useContext, useEffect, useState } from 'react';
import { getValue, setValue } from '../lib/store.js';

// ── Idiomas suportados (o botão do TopBar percorre esta lista) ──────────────
export const LANGUAGES = [
  { code: 'pt-BR', short: 'PT-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', short: 'PT-PT', name: 'Português (Portugal)' },
];
const IDX = Object.fromEntries(LANGUAGES.map((l, i) => [l.code, i]));

// Ordem das traduções: [pt-BR, pt-PT]
const S = {
  // ── Geral ──────────────────────────────────────────────────────────────
  'app.name': ['Éden Launcher', 'Éden Launcher'],
  'user.defaultNick': ['Aventureiro', 'Aventureiro'],

  // ── Navegação ──────────────────────────────────────────────────────────
  'nav.profile': ['conta', 'conta'],
  'nav.home': ['jogar', 'jogar'],
  'nav.mods': ['mods', 'mods'],
  'nav.map': ['mapa', 'mapa'],
  'nav.settings': ['configurações', 'definições'],
  'nav.logout': ['sair', 'sair'],

  // ── Splash ─────────────────────────────────────────────────────────────
  'splash.phase1': ['Carregando recursos...', 'A carregar recursos...'],
  'splash.phase2': ['Verificando ambiente Éden...', 'A verificar ambiente Éden...'],
  'splash.phase3': ['Conectando aos servidores...', 'A ligar aos servidores...'],
  'splash.phase4': ['Pronto para iniciar.', 'Pronto para iniciar.'],

  // ── Login ─────────────────────────────────────────────────────────────
  'login.welcome': ['Bem-vindo!', 'Bem-vindo!'],
  'login.heroDesc': [
    'Autentique-se para mergulhar na verdadeira experiência de sobrevivência!',
    'Autentique-se para mergulhar na verdadeira experiência de sobrevivência!',
  ],
  'login.email': ['E-mail', 'E-mail'],
  'login.nickname': ['Nickname', 'Nickname'],
  'login.password': ['Senha', 'Palavra-passe'],
  'login.confirmPassword': ['Confirmar Senha', 'Confirmar Palavra-passe'],
  'login.submitLogin': ['AUTENTICAR', 'AUTENTICAR'],
  'login.submitRegister': ['REGISTRAR', 'REGISTAR'],
  'login.noAccount': ['Não tem uma conta?', 'Não tem uma conta?'],
  'login.registerHere': ['Registre-se!', 'Registe-se!'],
  'login.hasAccount': ['Já tem uma conta?', 'Já tem uma conta?'],
  'login.loginHere': ['Entrar', 'Entrar'],
  'login.errNick': ['Nickname: 3–16 caracteres (letras, números ou _)', 'Nickname: 3–16 caracteres (letras, números ou _)'],
  'login.errEmail': ['Informe um e-mail válido', 'Indique um e-mail válido'],
  'login.errPass': ['A senha deve conter no mínimo 6 caracteres', 'A palavra-passe deve ter no mínimo 6 caracteres'],
  'login.errPassMatch': ['As senhas não coincidem', 'As palavras-passe não coincidem'],
  'login.registerOk': ['Conta criada com sucesso! Entrando...', 'Conta criada com sucesso! A entrar...'],
  'login.registerConfirm': ['Conta criada! Confirme seu e-mail e faça login.', 'Conta criada! Confirme o seu e-mail e inicie sessão.'],
  'login.errGeneric': ['Não foi possível autenticar', 'Não foi possível autenticar'],
  'login.errConnect': ['Erro ao conectar ao servidor de autenticação', 'Erro ao ligar ao servidor de autenticação'],
  'login.skinError': ['Erro ao selecionar skin: {msg}', 'Erro ao selecionar skin: {msg}'],

  // ── TopBar ────────────────────────────────────────────────────────────
  'topbar.online': ['online do servidor', 'online do servidor'],
  'topbar.pass': ['Passe: adquirido', 'Passe: adquirido'],
  'topbar.lang': ['Idioma: {name} — clique para alternar', 'Idioma: {name} — clique para alternar'],
  'topbar.themeDark': ['Mudar para Modo Escuro', 'Mudar para Modo Escuro'],
  'topbar.themeLight': ['Mudar para Modo Claro', 'Mudar para Modo Claro'],
  'topbar.discord': ['Discord Oficial', 'Discord Oficial'],

  // ── Home ──────────────────────────────────────────────────────────────
  'home.version': ['Versão: {v}', 'Versão: {v}'],
  'home.modsCount': ['Mods: {n}', 'Mods: {n}'],
  'home.tagRP': ['RP', 'RP'],
  'home.heroDesc': [
    'Explore um universo com infinitas possibilidades de vidas novas e experiências únicas.',
    'Explore um universo com infinitas possibilidades de vidas novas e experiências únicas.',
  ],
  'home.checking': ['VERIFICANDO...', 'A VERIFICAR...'],
  'home.launching': ['INICIANDO...', 'A INICIAR...'],
  'home.play': ['JOGAR', 'JOGAR'],
  'home.install': ['INSTALAR', 'INSTALAR'],
  'home.uninstalling': ['DESINSTALANDO...', 'A DESINSTALAR...'],
  'home.uninstall': ['DESINSTALAR', 'DESINSTALAR'],
  'home.uninstallTip': ['Desinstalar jogo e modpack', 'Desinstalar jogo e modpack'],
  'promo.p1.badge': ['CUPOM EXCLUSIVO', 'CUPOM EXCLUSIVO'],
  'promo.p1.title': ['Cupom de Boas-vindas', 'Cupom de Boas-vindas'],
  'promo.p1.sub': ['Use EDEN2026 e receba 500 VP + Kit Inicial exclusivo!', 'Use EDEN2026 e receba 500 VP + Kit Inicial exclusivo!'],
  'promo.p1.time': ['Válido até 30/12', 'Válido até 30/12'],
  'promo.p2.badge': ['EVENTO RP', 'EVENTO RP'],
  'promo.p2.title': ['Guerra dos Tronos do Norte', 'Guerra dos Tronos do Norte'],
  'promo.p2.sub': ['Conflito de facções pelo controle da Fortaleza de Calderon.', 'Conflito de facções pelo controlo da Fortaleza de Calderon.'],
  'promo.p2.time': ['Neste Sábado às 19h', 'Neste Sábado às 19h'],
  'promo.p3.badge': ['ATUALIZAÇÃO', 'ATUALIZAÇÃO'],
  'promo.p3.title': ['Dungeons & Relíquias', 'Dungeons & Relíquias'],
  'promo.p3.sub': ['Novos chefes lendários, masmorras ancestrais e itens épicos.', 'Novos chefes lendários, masmorras ancestrais e itens épicos.'],
  'promo.p3.time': ['Versão 1.4.2 Ativa', 'Versão 1.4.2 Ativa'],
  'promo.p4.badge': ['RECOMPENSA', 'RECOMPENSA'],
  'promo.p4.title': ['Passe de Temporada', 'Passe de Temporada'],
  'promo.p4.sub': ['Desbloqueie montarias exclusivas, cosméticos e títulos raros.', 'Desbloqueie montarias exclusivas, cosméticos e títulos raros.'],
  'promo.p4.time': ['Temporada 1', 'Temporada 1'],

  // ── Configurações ─────────────────────────────────────────────────────
  'settings.title': ['Configurações', 'Definições'],
  'settings.subtitle': [
    'Aqui você pode configurar o cliente e o launcher como preferir.',
    'Aqui pode configurar o cliente e o launcher como preferir.',
  ],
  'settings.window': ['Janela e Tela', 'Janela e Ecrã'],
  'settings.java': ['Java e Memória', 'Java e Memória'],
  'settings.management': ['Gerenciamento', 'Gestão'],
  'settings.fullscreen': ['Tela Cheia', 'Ecrã Inteiro'],
  'settings.fullscreenDesc': [
    'Inicie o jogo em modo tela cheia ao invés de janela (usando options.txt).',
    'Inicie o jogo em ecrã inteiro em vez de janela (usando options.txt).',
  ],
  'settings.width': ['Largura', 'Largura'],
  'settings.widthDesc': [
    'Largura da janela do jogo ao iniciar (em pixels).',
    'Largura da janela do jogo ao iniciar (em pixels).',
  ],
  'settings.height': ['Altura', 'Altura'],
  'settings.heightDesc': [
    'Altura da janela do jogo ao iniciar (em pixels).',
    'Altura da janela do jogo ao iniciar (em pixels).',
  ],
  'settings.ram': ['Alocação de Memória RAM', 'Alocação de Memória RAM'],
  'settings.ramDesc': [
    'Quantidade de memória dedicada ao Minecraft (Recomendado: 4GB a 8GB).',
    'Quantidade de memória dedicada ao Minecraft (Recomendado: 4GB a 8GB).',
  ],
  'settings.javaPath': ['Caminho do Java', 'Caminho do Java'],
  'settings.javaPathDesc': [
    'Deixe em branco para detecção automática (Java 17/21 recomendado).',
    'Deixe em branco para deteção automática (Java 17/21 recomendado).',
  ],
  'settings.javaPathPlaceholder': ['Detecção automática (Padrão)', 'Deteção automática (Padrão)'],
  'settings.browse': ['Procurar...', 'Procurar...'],
  'settings.jvmArgs': ['Argumentos JVM', 'Argumentos JVM'],
  'settings.jvmArgsDesc': ['Flags de otimização de GC para a JVM.', 'Flags de otimização de GC para a JVM.'],
  'settings.gameDir': ['Diretório do Jogo', 'Diretório do Jogo'],
  'settings.gameDirDesc': [
    'Abra a pasta local contendo screenshots, logs e resourcepacks.',
    'Abra a pasta local com screenshots, logs e resourcepacks.',
  ],
  'settings.openLogs': ['Abrir pasta de logs e arquivos', 'Abrir pasta de logs e ficheiros'],
  'settings.reset': ['Restaurar Padrões', 'Restaurar Predefinições'],
  'settings.resetDesc': [
    'Redefine todas as configurações para as opções originais recomendadas.',
    'Redefine todas as definições para as opções originais recomendadas.',
  ],
  'settings.resetBtn': ['Restaurar configurações padrão', 'Restaurar definições padrão'],
  'settings.uninstallLauncher': ['Desinstalar o Launcher', 'Desinstalar o Launcher'],
  'settings.uninstallLauncherDesc': [
    'Remove o launcher Éden do seu computador. Seus mundos e arquivos do jogo não são apagados.',
    'Remove o launcher Éden do seu computador. Os seus mundos e ficheiros do jogo não são apagados.',
  ],
  'settings.uninstallBtn': ['Desinstalar launcher', 'Desinstalar launcher'],
  'settings.uninstallConfirm': [
    'Tem certeza que deseja desinstalar o Éden Launcher? Esta ação não pode ser desfeita.',
    'Tem a certeza que deseja desinstalar o Éden Launcher? Esta ação não pode ser anulada.',
  ],
  'settings.uninstallUnavailable': [
    'A desinstalação está disponível apenas na versão instalada do launcher.',
    'A desinstalação está disponível apenas na versão instalada do launcher.',
  ],
  'settings.saved': ['Configurações salvas', 'Definições guardadas'],
  'settings.osWin': ['Windows 10/11', 'Windows 10/11'],
  'settings.osOther': ['Sistema Operacional Compatível', 'Sistema Operativo Compatível'],

  // ── Perfil ────────────────────────────────────────────────────────────
  'profile.balance': ['Seu Saldo', 'O teu Saldo'],
  'profile.buyPass': ['Comprar Passe', 'Comprar Passe'],
  'profile.recharge': ['Recarregar Saldo', 'Recarregar Saldo'],
  'profile.savedSkins': ['Skins Salvas', 'Skins Guardadas'],
  'profile.addSkin': ['Adicionar skin', 'Adicionar skin'],
  'profile.active': ['Ativa', 'Ativa'],
  'profile.customSkin': ['Skin Personalizada', 'Skin Personalizada'],
  'profile.customSkinN': ['Skin Personalizada {n}', 'Skin Personalizada {n}'],
  'profile.statPlaytime': ['Tempo em jogo', 'Tempo em jogo'],
  'profile.statKills': ['Mobs derrotados', 'Mobs derrotados'],
  'profile.statDeaths': ['Qtd. de mortes', 'N.º de mortes'],
  'profile.statRegistered': ['Data registro', 'Data de registo'],
  'profile.statLastLogin': ['Último login', 'Último acesso'],
  'profile.statProject': ['No projeto', 'No projeto'],
  'profile.today': ['Hoje', 'Hoje'],
  'profile.oneYear': ['1 ano', '1 ano'],

  // ── Suporte ───────────────────────────────────────────────────────────
  'support.title': ['Atalhos & Suporte', 'Atalhos & Suporte'],
  'support.subtitle': ['Conecte-se com a comunidade Éden', 'Ligue-se à comunidade Éden'],
  'support.logViewer': ['Visualizador de Logs', 'Visualizador de Logs'],
  'support.openFolder': ['Abrir pasta', 'Abrir pasta'],
  'support.copy': ['Copiar logs', 'Copiar logs'],
  'support.copied': ['✓ Copiado', '✓ Copiado'],
  'support.copyFail': ['Falha ao copiar: {msg}', 'Falha ao copiar: {msg}'],
  'support.electronOnly': ['Disponível apenas no app Electron.', 'Disponível apenas na app Electron.'],
  'support.help': [
    'Estes logs são gerados localmente. Em caso de problema, copie-os e envie no canal #suporte do Discord.',
    'Estes logs são gerados localmente. Em caso de problema, copie-os e envie no canal #suporte do Discord.',
  ],
  'support.discord.label': ['Discord oficial', 'Discord oficial'],
  'support.discord.desc': ['Comunidade, suporte ao vivo e canais de RP.', 'Comunidade, suporte ao vivo e canais de RP.'],
  'support.website.label': ['Site oficial', 'Site oficial'],
  'support.website.desc': ['Novidades, atualizações e download do launcher.', 'Novidades, atualizações e download do launcher.'],
  'support.faq.label': ['Central de Ajuda (FAQ)', 'Central de Ajuda (FAQ)'],
  'support.faq.desc': ['Guias, tutoriais e respostas para dúvidas comuns.', 'Guias, tutoriais e respostas a dúvidas comuns.'],

  // ── Mods ──────────────────────────────────────────────────────────────
  'mods.optional': ['Mods Opcionais', 'Mods Opcionais'],
  'mods.shaders': ['Shaders', 'Shaders'],
  'mods.optionalSub': [
    'Escolha quais recursos e utilitários adicionais você deseja ativar.',
    'Escolha quais recursos e utilitários adicionais deseja ativar.',
  ],
  'mods.shadersSub': [
    'Selecione um pacote de iluminação e sombras para o jogo.',
    'Selecione um pacote de iluminação e sombras para o jogo.',
  ],
  'mods.emptyTitle': ['Nenhum mod opcional encontrado', 'Nenhum mod opcional encontrado'],
  'mods.emptyDesc': [
    'Os mods oficiais do Éden aparecerão aqui para você ativar ou desativar.',
    'Os mods oficiais do Éden aparecerão aqui para ativar ou desativar.',
  ],
  'mods.refresh': ['Atualizar', 'Atualizar'],
  'mods.unavailable': ['Indisponível', 'Indisponível'],
  'mods.installed': ['Instalado', 'Instalado'],
  'mods.irisWarning': [
    'O mod Iris está desativado — ative-o na aba Mods Opcionais para os shaders funcionarem.',
    'O mod Iris está desativado — ative-o no separador Mods Opcionais para os shaders funcionarem.',
  ],
  'mods.genericDesc': ['Mod cliente instalado.', 'Mod cliente instalado.'],
  'mods.shaderOfficial': ['Shader pack oficial do Éden.', 'Shader pack oficial do Éden.'],
  'mods.shaderInstalled': ['Shader pack instalado.', 'Shader pack instalado.'],
  'mods.toggleOn': ['Ativar mod', 'Ativar mod'],
  'mods.toggleOff': ['Desativar mod', 'Desativar mod'],
  'mods.cpm.desc': ['Modelos customizados, orelhas, caudas e animações personalizadas de personagem.', 'Modelos personalizados, orelhas, caudas e animações de personagem.'],
  'mods.fabricapi.desc': ['API base indispensável para o funcionamento dos mods no Fabric Loader.', 'API base indispensável para o funcionamento dos mods no Fabric Loader.'],
  'mods.malilib.desc': ['Biblioteca base de utilitários e configurações integradas.', 'Biblioteca base de utilitários e configurações integradas.'],
  'mods.sodium.desc': ['Mecanismo de renderização moderno que multiplica a taxa de FPS.', 'Motor de renderização moderno que multiplica a taxa de FPS.'],
  'mods.voicechat.desc': ['Chat de voz posicional 3D por proximidade com suporte a grupos e microfone.', 'Chat de voz posicional 3D por proximidade com suporte a grupos e microfone.'],
  'mods.cameraoverhaul.desc': ['Movimentação e inclinação realista da câmera ao andar, correr, voar e pular.', 'Movimento e inclinação realista da câmara ao andar, correr, voar e saltar.'],
  'mods.clothconfig.desc': ['Biblioteca para menus de configuração gráficos interativos de mods.', 'Biblioteca para menus de configuração gráficos interativos de mods.'],
  'mods.cpmsvccompat.desc': ['Sincronização de animações labiais e expressões do CPM com o chat de voz.', 'Sincronização de animações labiais e expressões do CPM com o chat de voz.'],
  'mods.distanthorizons.desc': ['Aumenta drasticamente o alcance de renderização do horizonte sem perder FPS.', 'Aumenta drasticamente o alcance de renderização do horizonte sem perder FPS.'],
  'mods.emotecraft.desc': ['Permite executar animações corporais, danças e poses no Roleplay.', 'Permite executar animações corporais, danças e poses no Roleplay.'],
  'mods.flashback.desc': ['Gravação contínua e reprodução instantânea de replays em tempo real.', 'Gravação contínua e reprodução instantânea de replays em tempo real.'],
  'mods.iris.desc': ['Suporte a shaders gráficos com alta performance e compatibilidade.', 'Suporte a shaders gráficos com alta performance e compatibilidade.'],
  'mods.lambdynamiclights.desc': ['Iluminação dinâmica ao segurar tochas, lanternas ou itens brilhantes na mão.', 'Iluminação dinâmica ao segurar tochas, lanternas ou itens brilhantes na mão.'],
  'mods.litematica.desc': ['Projetor de esquemáticos e blueprints holográficos para construções 3D.', 'Projetor de esquemas e blueprints holográficos para construções 3D.'],
  'mods.replaymod.desc': ['Grave e renderize tomadas cinemáticas profissionais das suas partidas.', 'Grave e renderize tomadas cinemáticas profissionais das suas partidas.'],
  'mods.skinlayers3d.desc': ['Renderiza a segunda camada da skin como detalhes volumétricos em 3D.', 'Renderiza a segunda camada da skin como detalhes volumétricos em 3D.'],
  'mods.statuseffectbars.desc': ['Barras visuais com contagem regressiva de efeitos de poções e buffs.', 'Barras visuais com contagem decrescente de efeitos de poções e buffs.'],

  // ── Shaders (catálogo) ────────────────────────────────────────────────
  'shader.bsl.desc': ['Iluminação realista, sombras suaves e reflexos cinematográficos.', 'Iluminação realista, sombras suaves e reflexos cinematográficos.'],
  'shader.bslunbound.desc': ['Versão alternativa do BSL com cores vívidas e céu estilizado.', 'Versão alternativa do BSL com cores vívidas e céu estilizado.'],
  'shader.complementary.desc': ['Sucessor espiritual do BSL, vibrante e altamente otimizado.', 'Sucessor espiritual do BSL, vibrante e altamente otimizado.'],
  'shader.ctrvcr.desc': ['Estética retrô VHS com distorções analógicas e ruído de fita.', 'Estética retrô VHS com distorções analógicas e ruído de fita.'],
  'shader.dreamlight.desc': ['Atmosfera onírica com luzes suaves e neblina volumétrica.', 'Atmosfera onírica com luzes suaves e neblina volumétrica.'],
  'shader.photon.desc': ['Path-tracing experimental com iluminação global realista.', 'Path-tracing experimental com iluminação global realista.'],
  'shader.prismarine.desc': ['Água cristalina, sombras nítidas e clima tropical.', 'Água cristalina, sombras nítidas e clima tropical.'],
  'shader.solas.desc': ['Estilo fantasia com luzes quentes e auroras marcantes.', 'Estilo fantasia com luzes quentes e auroras marcantes.'],
  'shader.supervanilla.desc': ['Vanilla aprimorado, sombras leves mantendo a estética original.', 'Vanilla melhorado, sombras suaves mantendo a estética original.'],

  // ── Mapa ──────────────────────────────────────────────────────────────
  'map.reload': ['Recarregar mapa', 'Recarregar mapa'],
  'map.openBrowser': ['Abrir no navegador', 'Abrir no navegador'],
  'map.loading': ['Carregando mapa do servidor...', 'A carregar o mapa do servidor...'],
  'map.iframeTitle': ['Mapa do servidor em tempo real', 'Mapa do servidor em tempo real'],

  // ── Atualização ───────────────────────────────────────────────────────
  'update.available': ['Nova atualização disponível!', 'Nova atualização disponível!'],
  'update.ready': ['Atualização pronta!', 'Atualização pronta!'],
  'update.error': ['Falha ao baixar a atualização', 'Falha ao transferir a atualização'],
  'update.descAvailable': [
    'Uma nova versão {v} do Éden Launcher está disponível e já está sendo baixada. O launcher será liberado após a atualização.',
    'Uma nova versão {v} do Éden Launcher está disponível e já está a ser transferida. O launcher será liberado após a atualização.',
  ],
  'update.descReady': [
    'A versão {v} foi baixada e está pronta. Reinicie o launcher para aplicá-la.',
    'A versão {v} foi transferida e está pronta. Reinicie o launcher para a aplicar.',
  ],
  'update.descError': [
    'Não foi possível concluir o download. Verifique sua conexão e tente novamente.',
    'Não foi possível concluir a transferência. Verifique a sua ligação e tente novamente.',
  ],
  'update.retry': ['Tentar novamente', 'Tentar novamente'],
  'update.install': ['Reiniciar & Atualizar', 'Reiniciar & Atualizar'],
  'update.restarting': ['Reiniciando…', 'A reiniciar…'],

  // ── Launch (App) ─────────────────────────────────────────────────────
  'launch.exitError': ['Minecraft encerrou com código {code}', 'O Minecraft terminou com o código {code}'],
  'launch.javaError': ['Erro ao iniciar Java', 'Erro ao iniciar Java'],
  'launch.failed': ['Falha ao iniciar Minecraft', 'Falha ao iniciar Minecraft'],
};

const LangCtx = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('pt-BR');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getValue('language', null);
      if (!cancelled && saved && IDX[saved] !== undefined) {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setLang = async (next) => {
    if (IDX[next] === undefined) return;
    setLangState(next);
    document.documentElement.lang = next;
    await setValue('language', next);
  };

  const t = (key, vars) => {
    const row = S[key];
    let s = row ? (row[IDX[lang]] ?? row[0]) : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(v));
      }
    }
    return s;
  };

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useI18n = () => {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error('useI18n deve ser usado dentro de <LanguageProvider>');
  return ctx;
};
