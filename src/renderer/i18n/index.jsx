import React, { createContext, useContext, useEffect, useState } from 'react';
import { getValue, setValue } from '../lib/store.js';

// ── Idiomas suportados (o botão do TopBar percorre esta lista) ──────────────
export const LANGUAGES = [
  { code: 'pt-BR', short: 'PT-BR', name: 'Português (Brasil)' },
  { code: 'pt-PT', short: 'PT-PT', name: 'Português (Portugal)' },
  { code: 'en-US', short: 'EN', name: 'English' },
  { code: 'es-ES', short: 'ES', name: 'Español' },
];
const IDX = Object.fromEntries(LANGUAGES.map((l, i) => [l.code, i]));

// Ordem das traduções: [pt-BR, pt-PT, en-US, es-ES]
const S = {
  // ── Geral ──────────────────────────────────────────────────────────────
  'app.name': ['Éden Launcher', 'Éden Launcher', 'Éden Launcher', 'Éden Launcher'],
  'user.defaultNick': ['Aventureiro', 'Aventureiro', 'Adventurer', 'Aventurero'],

  // ── Navegação ──────────────────────────────────────────────────────────
  'nav.profile': ['conta', 'conta', 'account', 'cuenta'],
  'nav.home': ['jogar', 'jogar', 'play', 'jugar'],
  'nav.mods': ['mods', 'mods', 'mods', 'mods'],
  'nav.map': ['mapa', 'mapa', 'map', 'mapa'],
  'nav.settings': ['configurações', 'definições', 'settings', 'ajustes'],
  'nav.logout': ['sair', 'sair', 'log out', 'salir'],

  // ── Splash ─────────────────────────────────────────────────────────────
  'splash.phase1': ['Carregando recursos...', 'A carregar recursos...', 'Loading resources...', 'Cargando recursos...'],
  'splash.phase2': ['Verificando ambiente Éden...', 'A verificar ambiente Éden...', 'Checking Éden environment...', 'Verificando entorno de Éden...'],
  'splash.phase3': ['Conectando aos servidores...', 'A ligar aos servidores...', 'Connecting to servers...', 'Conectando aos servidores...'],
  'splash.phase4': ['Pronto para iniciar.', 'Pronto para iniciar.', 'Ready to start.', 'Listo para empezar.'],

  // ── Login ─────────────────────────────────────────────────────────────
  'login.welcome': ['Bem-vindo!', 'Bem-vindo!', 'Welcome!', '¡Bienvenido!'],
  'login.heroDesc': [
    'Autentique-se para mergulhar na verdadeira experiência de sobrevivência!',
    'Autentique-se para mergulhar na verdadeira experiência de sobrevivência!',
    'Sign in to dive into the true survival experience!',
    '¡Inicia sesión para vivir la verdadera experiencia de supervivencia!',
  ],
  'login.email': ['E-mail', 'E-mail', 'E-mail', 'Correo'],
  'login.nickname': ['Nickname', 'Nickname', 'Nickname', 'Usuario'],
  'login.password': ['Senha', 'Palavra-passe', 'Password', 'Contraseña'],
  'login.confirmPassword': ['Confirmar Senha', 'Confirmar Palavra-passe', 'Confirm Password', 'Confirmar Contraseña'],
  'login.submitLogin': ['AUTENTICAR', 'AUTENTICAR', 'SIGN IN', 'INICIAR SESIÓN'],
  'login.submitRegister': ['REGISTRAR', 'REGISTAR', 'SIGN UP', 'REGISTRARSE'],
  'login.noAccount': ['Não tem uma conta?', 'Não tem uma conta?', "Don't have an account?", '¿No tienes cuenta?'],
  'login.registerHere': ['Registre-se!', 'Registe-se!', 'Sign up!', '¡Regístrate!'],
  'login.hasAccount': ['Já tem uma conta?', 'Já tem uma conta?', 'Already have an account?', '¿Ya tienes cuenta?'],
  'login.loginHere': ['Entrar', 'Entrar', 'Sign in', 'Iniciar sesión'],
  'login.errNick': ['Nickname: 3–16 caracteres (letras, números ou _)', 'Nickname: 3–16 caracteres (letras, números ou _)', 'Nickname: 3–16 characters (letters, numbers or _)', 'Usuario: 3–16 caracteres (letras, números o _)'],
  'login.errEmail': ['Informe um e-mail válido', 'Indique um e-mail válido', 'Enter a valid e-mail', 'Introduce un correo válido'],
  'login.errPass': ['A senha deve conter no mínimo 6 caracteres', 'A palavra-passe deve ter no mínimo 6 caracteres', 'Password must be at least 6 characters', 'La contraseña debe tener al menos 6 caracteres'],
  'login.errPassMatch': ['As senhas não coincidem', 'As palavras-passe não coincidem', 'Passwords do not match', 'Las contraseñas no coinciden'],
  'login.registerOk': ['Conta criada com sucesso! Entrando...', 'Conta criada com sucesso! A entrar...', 'Account created! Signing in...', '¡Cuenta creada! Iniciando sesión...'],
  'login.registerConfirm': ['Conta criada! Confirme seu e-mail e faça login.', 'Conta criada! Confirme o seu e-mail e inicie sessão.', 'Account created! Confirm your e-mail and sign in.', '¡Cuenta creada! Confirma tu correo e inicia sesión.'],
  'login.errGeneric': ['Não foi possível autenticar', 'Não foi possível autenticar', 'Could not authenticate', 'No se pudo autenticar'],
  'login.errConnect': ['Erro ao conectar ao servidor de autenticação', 'Erro ao ligar ao servidor de autenticação', 'Error connecting to the auth server', 'Error al conectar con el servidor de autenticación'],
  'login.skinError': ['Erro ao selecionar skin: {msg}', 'Erro ao selecionar skin: {msg}', 'Error selecting skin: {msg}', 'Error al seleccionar skin: {msg}'],

  // ── TopBar ────────────────────────────────────────────────────────────
  'topbar.online': ['online do servidor', 'online do servidor', 'on the server', 'en el servidor'],
  'topbar.pass': ['Passe: adquirido', 'Passe: adquirido', 'Pass: owned', 'Pase: adquirido'],
  'topbar.lang': ['Idioma: {name} — clique para alternar', 'Idioma: {name} — clique para alternar', 'Language: {name} — click to switch', 'Idioma: {name} — clic para cambiar'],
  'topbar.themeDark': ['Mudar para Modo Escuro', 'Mudar para Modo Escuro', 'Switch to Dark Mode', 'Cambiar a Modo Oscuro'],
  'topbar.themeLight': ['Mudar para Modo Claro', 'Mudar para Modo Claro', 'Switch to Light Mode', 'Cambiar a Modo Claro'],
  'topbar.discord': ['Discord Oficial', 'Discord Oficial', 'Official Discord', 'Discord Oficial'],

  // ── Home ──────────────────────────────────────────────────────────────
  'home.version': ['Versão: {v}', 'Versão: {v}', 'Version: {v}', 'Versión: {v}'],
  'home.modsCount': ['Mods: {n}', 'Mods: {n}', 'Mods: {n}', 'Mods: {n}'],
  'home.tagRP': ['RP', 'RP', 'RP', 'RP'],
  'home.heroDesc': [
    'Explore um universo com infinitas possibilidades de vidas novas e experiências únicas.',
    'Explore um universo com infinitas possibilidades de vidas novas e experiências únicas.',
    'Explore a universe of endless possibilities, new lives and unique experiences.',
    'Explora un universo con infinitas posibilidades, vidas nuevas y experiencias únicas.',
  ],
  'home.checking': ['VERIFICANDO...', 'A VERIFICAR...', 'CHECKING...', 'VERIFICANDO...'],
  'home.launching': ['INICIANDO...', 'A INICIAR...', 'LAUNCHING...', 'INICIANDO...'],
  'home.play': ['JOGAR', 'JOGAR', 'PLAY', 'JUGAR'],
  'home.install': ['INSTALAR', 'INSTALAR', 'INSTALL', 'INSTALAR'],
  'home.uninstalling': ['DESINSTALANDO...', 'A DESINSTALAR...', 'UNINSTALLING...', 'DESINSTALANDO...'],
  'home.uninstall': ['DESINSTALAR', 'DESINSTALAR', 'UNINSTALL', 'DESINSTALAR'],
  'home.uninstallTip': ['Desinstalar jogo e modpack', 'Desinstalar jogo e modpack', 'Uninstall game and modpack', 'Desinstalar juego y modpack'],
  'promo.p1.badge': ['CUPOM EXCLUSIVO', 'CUPOM EXCLUSIVO', 'EXCLUSIVE COUPON', 'CUPÓN EXCLUSIVO'],
  'promo.p1.title': ['Cupom de Boas-vindas', 'Cupom de Boas-vindas', 'Welcome Coupon', 'Cupón de Bienvenida'],
  'promo.p1.sub': ['Use EDEN2026 e receba 500 VP + Kit Inicial exclusivo!', 'Use EDEN2026 e receba 500 VP + Kit Inicial exclusivo!', 'Use EDEN2026 and get 500 VP + exclusive Starter Kit!', '¡Usa EDEN2026 y recibe 500 VP + Kit Inicial exclusivo!'],
  'promo.p1.time': ['Válido até 30/12', 'Válido até 30/12', 'Valid until 12/30', 'Válido hasta 30/12'],
  'promo.p2.badge': ['EVENTO RP', 'EVENTO RP', 'RP EVENT', 'EVENTO RP'],
  'promo.p2.title': ['Guerra dos Tronos do Norte', 'Guerra dos Tronos do Norte', 'War of the Northern Thrones', 'Guerra de los Tronos del Norte'],
  'promo.p2.sub': ['Conflito de facções pelo controle da Fortaleza de Calderon.', 'Conflito de facções pelo controlo da Fortaleza de Calderon.', 'Faction conflict for control of Calderon Fortress.', 'Conflicto de facciones por el control de la Fortaleza de Calderon.'],
  'promo.p2.time': ['Neste Sábado às 19h', 'Neste Sábado às 19h', 'This Saturday at 7 PM', 'Este sábado a las 19h'],
  'promo.p3.badge': ['ATUALIZAÇÃO', 'ATUALIZAÇÃO', 'UPDATE', 'ACTUALIZACIÓN'],
  'promo.p3.title': ['Dungeons & Relíquias', 'Dungeons & Relíquias', 'Dungeons & Relics', 'Mazmorras y Reliquias'],
  'promo.p3.sub': ['Novos chefes lendários, masmorras ancestrais e itens épicos.', 'Novos chefes lendários, masmorras ancestrais e itens épicos.', 'New legendary bosses, ancestral dungeons and epic items.', 'Nuevos jefes legendarios, mazmorras ancestrales y objetos épicos.'],
  'promo.p3.time': ['Versão 1.4.2 Ativa', 'Versão 1.4.2 Ativa', 'Version 1.4.2 Live', 'Versión 1.4.2 Activa'],
  'promo.p4.badge': ['RECOMPENSA', 'RECOMPENSA', 'REWARD', 'RECOMPENSA'],
  'promo.p4.title': ['Passe de Temporada', 'Passe de Temporada', 'Season Pass', 'Pase de Temporada'],
  'promo.p4.sub': ['Desbloqueie montarias exclusivas, cosméticos e títulos raros.', 'Desbloqueie montarias exclusivas, cosméticos e títulos raros.', 'Unlock exclusive mounts, cosmetics and rare titles.', 'Desbloquea monturas exclusivas, cosméticos y títulos raros.'],
  'promo.p4.time': ['Temporada 1', 'Temporada 1', 'Season 1', 'Temporada 1'],

  // ── Configurações ─────────────────────────────────────────────────────
  'settings.title': ['Configurações', 'Definições', 'Settings', 'Ajustes'],
  'settings.subtitle': [
    'Aqui você pode configurar o cliente e o launcher como preferir.',
    'Aqui pode configurar o cliente e o launcher como preferir.',
    'Here you can configure the client and launcher to your liking.',
    'Aquí puedes configurar el cliente y el launcher a tu gusto.',
  ],
  'settings.window': ['Janela e Tela', 'Janela e Ecrã', 'Window & Display', 'Ventana y Pantalla'],
  'settings.java': ['Java e Memória', 'Java e Memória', 'Java & Memory', 'Java y Memoria'],
  'settings.management': ['Gerenciamento', 'Gestão', 'Management', 'Gestión'],
  'settings.fullscreen': ['Tela Cheia', 'Ecrã Inteiro', 'Fullscreen', 'Pantalla Completa'],
  'settings.fullscreenDesc': [
    'Inicie o jogo em modo tela cheia ao invés de janela (usando options.txt).',
    'Inicie o jogo em ecrã inteiro em vez de janela (usando options.txt).',
    'Start the game in fullscreen instead of windowed mode (via options.txt).',
    'Inicia el juego en pantalla completa en lugar de ventana (via options.txt).',
  ],
  'settings.width': ['Largura', 'Largura', 'Width', 'Ancho'],
  'settings.widthDesc': [
    'Largura da janela do jogo ao iniciar (em pixels).',
    'Largura da janela do jogo ao iniciar (em pixels).',
    'Game window width on launch (in pixels).',
    'Ancho de la ventana del juego al iniciar (en píxeles).',
  ],
  'settings.height': ['Altura', 'Altura', 'Height', 'Alto'],
  'settings.heightDesc': [
    'Altura da janela do jogo ao iniciar (em pixels).',
    'Altura da janela do jogo ao iniciar (em pixels).',
    'Game window height on launch (in pixels).',
    'Alto de la ventana del juego al iniciar (en píxeles).',
  ],
  'settings.ram': ['Alocação de Memória RAM', 'Alocação de Memória RAM', 'RAM Allocation', 'Asignación de Memoria RAM'],
  'settings.ramDesc': [
    'Quantidade de memória dedicada ao Minecraft (Recomendado: 4GB a 8GB).',
    'Quantidade de memória dedicada ao Minecraft (Recomendado: 4GB a 8GB).',
    'Amount of memory dedicated to Minecraft (Recommended: 4GB to 8GB).',
    'Cantidad de memoria dedicada a Minecraft (Recomendado: 4GB a 8GB).',
  ],
  'settings.javaPath': ['Caminho do Java', 'Caminho do Java', 'Java Path', 'Ruta de Java'],
  'settings.javaPathDesc': [
    'Deixe em branco para detecção automática (Java 17/21 recomendado).',
    'Deixe em branco para deteção automática (Java 17/21 recomendado).',
    'Leave empty for auto-detection (Java 17/21 recommended).',
    'Deja vacío para detección automática (Java 17/21 recomendado).',
  ],
  'settings.javaPathPlaceholder': ['Detecção automática (Padrão)', 'Deteção automática (Padrão)', 'Auto-detect (Default)', 'Detección automática (Predeterminado)'],
  'settings.browse': ['Procurar...', 'Procurar...', 'Browse...', 'Buscar...'],
  'settings.jvmArgs': ['Argumentos JVM', 'Argumentos JVM', 'JVM Arguments', 'Argumentos JVM'],
  'settings.jvmArgsDesc': ['Flags de otimização de GC para a JVM.', 'Flags de otimização de GC para a JVM.', 'GC optimization flags for the JVM.', 'Flags de optimización de GC para la JVM.'],
  'settings.gameDir': ['Diretório do Jogo', 'Diretório do Jogo', 'Game Directory', 'Directorio del Juego'],
  'settings.gameDirDesc': [
    'Abra a pasta local contendo screenshots, logs e resourcepacks.',
    'Abra a pasta local com screenshots, logs e resourcepacks.',
    'Open the local folder containing screenshots, logs and resourcepacks.',
    'Abre la carpeta local con capturas, logs y resourcepacks.',
  ],
  'settings.openLogs': ['Abrir pasta de logs e arquivos', 'Abrir pasta de logs e ficheiros', 'Open logs and files folder', 'Abrir carpeta de logs y archivos'],
  'settings.reset': ['Restaurar Padrões', 'Restaurar Predefinições', 'Restore Defaults', 'Restaurar Valores'],
  'settings.resetDesc': [
    'Redefine todas as configurações para as opções originais recomendadas.',
    'Redefine todas as definições para as opções originais recomendadas.',
    'Resets all settings to the original recommended defaults.',
    'Restablece todos los ajustes a los valores recomendados originales.',
  ],
  'settings.resetBtn': ['Restaurar configurações padrão', 'Restaurar definições padrão', 'Restore default settings', 'Restaurar ajustes predeterminados'],
  'settings.uninstallLauncher': ['Desinstalar o Launcher', 'Desinstalar o Launcher', 'Uninstall the Launcher', 'Desinstalar el Launcher'],
  'settings.uninstallLauncherDesc': [
    'Remove o launcher Éden do seu computador. Seus mundos e arquivos do jogo não são apagados.',
    'Remove o launcher Éden do seu computador. Os seus mundos e ficheiros do jogo não são apagados.',
    'Removes the Éden launcher from your computer. Your worlds and game files are not deleted.',
    'Elimina el launcher Éden de tu ordenador. Tus mundos y archivos del juego no se borran.',
  ],
  'settings.uninstallBtn': ['Desinstalar launcher', 'Desinstalar launcher', 'Uninstall launcher', 'Desinstalar launcher'],
  'settings.uninstallConfirm': [
    'Tem certeza que deseja desinstalar o Éden Launcher? Esta ação não pode ser desfeita.',
    'Tem a certeza que deseja desinstalar o Éden Launcher? Esta ação não pode ser anulada.',
    'Are you sure you want to uninstall Éden Launcher? This action cannot be undone.',
    '¿Seguro que quieres desinstalar Éden Launcher? Esta acción no se puede deshacer.',
  ],
  'settings.uninstallUnavailable': [
    'A desinstalação está disponível apenas na versão instalada do launcher.',
    'A desinstalação está disponível apenas na versão instalada do launcher.',
    'Uninstalling is only available in the installed version of the launcher.',
    'La desinstalación solo está disponible en la versión instalada del launcher.',
  ],
  'settings.saved': ['Configurações salvas', 'Definições guardadas', 'Settings saved', 'Ajustes guardados'],
  'settings.osWin': ['Windows 10/11', 'Windows 10/11', 'Windows 10/11', 'Windows 10/11'],
  'settings.osOther': ['Sistema Operacional Compatível', 'Sistema Operativo Compatível', 'Compatible OS', 'Sistema Operativo Compatible'],

  // ── Perfil ────────────────────────────────────────────────────────────
  'profile.balance': ['Seu Saldo', 'O teu Saldo', 'Your Balance', 'Tu Saldo'],
  'profile.buyPass': ['Comprar Passe', 'Comprar Passe', 'Buy Pass', 'Comprar Pase'],
  'profile.recharge': ['Recarregar Saldo', 'Recarregar Saldo', 'Top Up Balance', 'Recargar Saldo'],
  'profile.savedSkins': ['Skins Salvas', 'Skins Guardadas', 'Saved Skins', 'Skins Guardadas'],
  'profile.addSkin': ['Adicionar skin', 'Adicionar skin', 'Add skin', 'Añadir skin'],
  'profile.active': ['Ativa', 'Ativa', 'Active', 'Activa'],
  'profile.customSkin': ['Skin Personalizada', 'Skin Personalizada', 'Custom Skin', 'Skin Personalizada'],
  'profile.customSkinN': ['Skin Personalizada {n}', 'Skin Personalizada {n}', 'Custom Skin {n}', 'Skin Personalizada {n}'],
  'profile.statPlaytime': ['Tempo em jogo', 'Tempo em jogo', 'Playtime', 'Tiempo de juego'],
  'profile.statKills': ['Mobs derrotados', 'Mobs derrotados', 'Mobs defeated', 'Mobs derrotados'],
  'profile.statDeaths': ['Qtd. de mortes', 'N.º de mortes', 'Deaths', 'Muertes'],
  'profile.statRegistered': ['Data registro', 'Data de registo', 'Registered on', 'Fecha de registro'],
  'profile.statLastLogin': ['Último login', 'Último acesso', 'Last login', 'Último acceso'],
  'profile.statProject': ['No projeto', 'No projeto', 'On the project', 'En el proyecto'],
  'profile.today': ['Hoje', 'Hoje', 'Today', 'Hoy'],
  'profile.oneYear': ['1 ano', '1 ano', '1 year', '1 año'],

  // ── Suporte ───────────────────────────────────────────────────────────
  'support.title': ['Atalhos & Suporte', 'Atalhos & Suporte', 'Shortcuts & Support', 'Atajos y Soporte'],
  'support.subtitle': ['Conecte-se com a comunidade Éden', 'Ligue-se à comunidade Éden', 'Connect with the Éden community', 'Conéctate con la comunidad Éden'],
  'support.logViewer': ['Visualizador de Logs', 'Visualizador de Logs', 'Log Viewer', 'Visor de Logs'],
  'support.openFolder': ['Abrir pasta', 'Abrir pasta', 'Open folder', 'Abrir carpeta'],
  'support.copy': ['Copiar logs', 'Copiar logs', 'Copy logs', 'Copiar logs'],
  'support.copied': ['✓ Copiado', '✓ Copiado', '✓ Copied', '✓ Copiado'],
  'support.copyFail': ['Falha ao copiar: {msg}', 'Falha ao copiar: {msg}', 'Copy failed: {msg}', 'Error al copiar: {msg}'],
  'support.electronOnly': ['Disponível apenas no app Electron.', 'Disponível apenas na app Electron.', 'Only available in the Electron app.', 'Solo disponible en la app Electron.'],
  'support.help': [
    'Estes logs são gerados localmente. Em caso de problema, copie-os e envie no canal #suporte do Discord.',
    'Estes logs são gerados localmente. Em caso de problema, copie-os e envie no canal #suporte do Discord.',
    'These logs are generated locally. If you run into a problem, copy them and send in the #support channel on Discord.',
    'Estos logs se generan localmente. Ante cualquier problema, cópialos y envialos al canal #soporte de Discord.',
  ],
  'support.discord.label': ['Discord oficial', 'Discord oficial', 'Official Discord', 'Discord oficial'],
  'support.discord.desc': ['Comunidade, suporte ao vivo e canais de RP.', 'Comunidade, suporte ao vivo e canais de RP.', 'Community, live support and RP channels.', 'Comunidad, soporte en vivo y canales de RP.'],
  'support.website.label': ['Site oficial', 'Site oficial', 'Official website', 'Sitio oficial'],
  'support.website.desc': ['Novidades, atualizações e download do launcher.', 'Novidades, atualizações e download do launcher.', 'News, updates and launcher download.', 'Noticias, actualizaciones y descarga del launcher.'],
  'support.faq.label': ['Central de Ajuda (FAQ)', 'Central de Ajuda (FAQ)', 'Help Center (FAQ)', 'Centro de Ayuda (FAQ)'],
  'support.faq.desc': ['Guias, tutoriais e respostas para dúvidas comuns.', 'Guias, tutoriais e respostas a dúvidas comuns.', 'Guides, tutorials and answers to common questions.', 'Guías, tutoriales y respuestas a preguntas frecuentes.'],

  // ── Mods ──────────────────────────────────────────────────────────────
  'mods.optional': ['Mods Opcionais', 'Mods Opcionais', 'Optional Mods', 'Mods Opcionales'],
  'mods.shaders': ['Shaders', 'Shaders', 'Shaders', 'Shaders'],
  'mods.optionalSub': [
    'Escolha quais recursos e utilitários adicionais você deseja ativar.',
    'Escolha quais recursos e utilitários adicionais deseja ativar.',
    'Choose which extra features and utilities you want to enable.',
    'Elige qué utilidades y funciones adicionales quieres activar.',
  ],
  'mods.shadersSub': [
    'Selecione um pacote de iluminação e sombras para o jogo.',
    'Selecione um pacote de iluminação e sombras para o jogo.',
    'Select a lighting and shadow pack for the game.',
    'Selecciona un paquete de iluminación y sombras para el juego.',
  ],
  'mods.emptyTitle': ['Nenhum mod opcional encontrado', 'Nenhum mod opcional encontrado', 'No optional mods found', 'No se encontraron mods opcionales'],
  'mods.emptyDesc': [
    'Os mods oficiais do Éden aparecerão aqui para você ativar ou desativar.',
    'Os mods oficiais do Éden aparecerão aqui para ativar ou desativar.',
    'Official Éden mods will appear here for you to enable or disable.',
    'Los mods oficiales de Éden aparecerán aquí para activar o desactivar.',
  ],
  'mods.refresh': ['Atualizar', 'Atualizar', 'Refresh', 'Actualizar'],
  'mods.unavailable': ['Indisponível', 'Indisponível', 'Unavailable', 'No disponible'],
  'mods.installed': ['Instalado', 'Instalado', 'Installed', 'Instalado'],
  'mods.irisWarning': [
    'O mod Iris está desativado — ative-o na aba Mods Opcionais para os shaders funcionarem.',
    'O mod Iris está desativado — ative-o no separador Mods Opcionais para os shaders funcionarem.',
    'The Iris mod is disabled — enable it in the Optional Mods tab for shaders to work.',
    'El mod Iris está desactivado — actívalo en la pestaña Mods Opcionales para que funcionen los shaders.',
  ],
  'mods.genericDesc': ['Mod cliente instalado.', 'Mod cliente instalado.', 'Installed client mod.', 'Mod de cliente instalado.'],
  'mods.shaderOfficial': ['Shader pack oficial do Éden.', 'Shader pack oficial do Éden.', 'Official Éden shader pack.', 'Shader pack oficial de Éden.'],
  'mods.shaderInstalled': ['Shader pack instalado.', 'Shader pack instalado.', 'Installed shader pack.', 'Shader pack instalado.'],
  'mods.toggleOn': ['Ativar mod', 'Ativar mod', 'Enable mod', 'Activar mod'],
  'mods.toggleOff': ['Desativar mod', 'Desativar mod', 'Disable mod', 'Desactivar mod'],
  'mods.cpm.desc': ['Modelos customizados, orelhas, caudas e animações personalizadas de personagem.', 'Modelos personalizados, orelhas, caudas e animações de personagem.', 'Custom models, ears, tails and personalized character animations.', 'Modelos personalizados, orejas, colas y animaciones de personaje.'],
  'mods.fabricapi.desc': ['API base indispensável para o funcionamento dos mods no Fabric Loader.', 'API base indispensável para o funcionamento dos mods no Fabric Loader.', 'Essential base API for mods on Fabric Loader.', 'API base indispensable para los mods en Fabric Loader.'],
  'mods.malilib.desc': ['Biblioteca base de utilitários e configurações integradas.', 'Biblioteca base de utilitários e configurações integradas.', 'Core library of utilities and built-in settings.', 'Biblioteca base de utilidades y ajustes integrados.'],
  'mods.sodium.desc': ['Mecanismo de renderização moderno que multiplica a taxa de FPS.', 'Motor de renderização moderno que multiplica a taxa de FPS.', 'Modern rendering engine that multiplies your FPS.', 'Motor de renderizado moderno que multiplica los FPS.'],
  'mods.voicechat.desc': ['Chat de voz posicional 3D por proximidade com suporte a grupos e microfone.', 'Chat de voz posicional 3D por proximidade com suporte a grupos e microfone.', 'Proximity 3D positional voice chat with group and mic support.', 'Chat de voz posicional 3D por proximidad con soporte de grupos y micrófono.'],
  'mods.cameraoverhaul.desc': ['Movimentação e inclinação realista da câmera ao andar, correr, voar e pular.', 'Movimento e inclinação realista da câmara ao andar, correr, voar e saltar.', 'Realistic camera movement and tilt when walking, sprinting, flying and jumping.', 'Movimiento e inclinación realistas de cámara al caminar, correr, volar y saltar.'],
  'mods.clothconfig.desc': ['Biblioteca para menus de configuração gráficos interativos de mods.', 'Biblioteca para menus de configuração gráficos interativos de mods.', 'Library for interactive mod settings menus.', 'Biblioteca para menús de ajustes interactivos de mods.'],
  'mods.cpmsvccompat.desc': ['Sincronização de animações labiais e expressões do CPM com o chat de voz.', 'Sincronização de animações labiais e expressões do CPM com o chat de voz.', 'Syncs CPM mouth animations and expressions with voice chat.', 'Sincroniza animaciones de boca y expresiones del CPM con el chat de voz.'],
  'mods.distanthorizons.desc': ['Aumenta drasticamente o alcance de renderização do horizonte sem perder FPS.', 'Aumenta drasticamente o alcance de renderização do horizonte sem perder FPS.', 'Drastically extends render distance without losing FPS.', 'Aumenta drásticamente la distancia de renderizado sin perder FPS.'],
  'mods.emotecraft.desc': ['Permite executar animações corporais, danças e poses no Roleplay.', 'Permite executar animações corporais, danças e poses no Roleplay.', 'Perform body animations, dances and poses in Roleplay.', 'Permite ejecutar animaciones corporales, bailes y poses en Roleplay.'],
  'mods.flashback.desc': ['Gravação contínua e reprodução instantânea de replays em tempo real.', 'Gravação contínua e reprodução instantânea de replays em tempo real.', 'Continuous recording and instant replay playback in real time.', 'Grabación continua y reproducción instantánea de replays en tiempo real.'],
  'mods.iris.desc': ['Suporte a shaders gráficos com alta performance e compatibilidade.', 'Suporte a shaders gráficos com alta performance e compatibilidade.', 'High-performance, compatible shader support.', 'Soporte de shaders gráficos de alto rendimiento y compatibles.'],
  'mods.lambdynamiclights.desc': ['Iluminação dinâmica ao segurar tochas, lanternas ou itens brilhantes na mão.', 'Iluminação dinâmica ao segurar tochas, lanternas ou itens brilhantes na mão.', 'Dynamic lighting when holding torches, lanterns or glowing items.', 'Iluminación dinámica al sostener antorchas, linternas u objetos luminosos.'],
  'mods.litematica.desc': ['Projetor de esquemáticos e blueprints holográficos para construções 3D.', 'Projetor de esquemas e blueprints holográficos para construções 3D.', 'Schematic and holographic blueprint projector for 3D builds.', 'Proyector de esquemas y planos holográficos para construcciones 3D.'],
  'mods.replaymod.desc': ['Grave e renderize tomadas cinemáticas profissionais das suas partidas.', 'Grave e renderize tomadas cinemáticas profissionais das suas partidas.', 'Record and render professional cinematic shots of your gameplay.', 'Graba y renderiza tomas cinematográficas profesionales de tus partidas.'],
  'mods.skinlayers3d.desc': ['Renderiza a segunda camada da skin como detalhes volumétricos em 3D.', 'Renderiza a segunda camada da skin como detalhes volumétricos em 3D.', 'Renders the skin overlay layer as volumetric 3D detail.', 'Renderiza la segunda capa del skin como detalle volumétrico en 3D.'],
  'mods.statuseffectbars.desc': ['Barras visuais com contagem regressiva de efeitos de poções e buffs.', 'Barras visuais com contagem decrescente de efeitos de poções e buffs.', 'Visual bars with countdown for potion effects and buffs.', 'Barras visuales con cuenta atrás de efectos de pociones y buffs.'],

  // ── Shaders (catálogo) ────────────────────────────────────────────────
  'shader.bsl.desc': ['Iluminação realista, sombras suaves e reflexos cinematográficos.', 'Iluminação realista, sombras suaves e reflexos cinematográficos.', 'Realistic lighting, soft shadows and cinematic reflections.', 'Iluminación realista, sombras suaves y reflejos cinematográficos.'],
  'shader.bslunbound.desc': ['Versão alternativa do BSL com cores vívidas e céu estilizado.', 'Versão alternativa do BSL com cores vívidas e céu estilizado.', 'Alternative BSL version with vivid colors and stylized sky.', 'Versión alternativa de BSL con colores vivos y cielo estilizado.'],
  'shader.complementary.desc': ['Sucessor espiritual do BSL, vibrante e altamente otimizado.', 'Sucessor espiritual do BSL, vibrante e altamente otimizado.', 'Spiritual successor to BSL, vibrant and highly optimized.', 'Sucesor espiritual de BSL, vibrante y muy optimizado.'],
  'shader.ctrvcr.desc': ['Estética retrô VHS com distorções analógicas e ruído de fita.', 'Estética retrô VHS com distorções analógicas e ruído de fita.', 'Retro VHS aesthetic with analog distortion and tape noise.', 'Estética retro VHS con distorsiones analógicas y ruido de cinta.'],
  'shader.dreamlight.desc': ['Atmosfera onírica com luzes suaves e neblina volumétrica.', 'Atmosfera onírica com luzes suaves e neblina volumétrica.', 'Dreamy atmosphere with soft lighting and volumetric fog.', 'Atmósfera onírica con luces suaves y niebla volumétrica.'],
  'shader.photon.desc': ['Path-tracing experimental com iluminação global realista.', 'Path-tracing experimental com iluminação global realista.', 'Experimental path-tracing with realistic global illumination.', 'Path-tracing experimental con iluminación global realista.'],
  'shader.prismarine.desc': ['Água cristalina, sombras nítidas e clima tropical.', 'Água cristalina, sombras nítidas e clima tropical.', 'Crystal-clear water, crisp shadows and tropical weather.', 'Agua cristalina, sombras nítidas y clima tropical.'],
  'shader.solas.desc': ['Estilo fantasia com luzes quentes e auroras marcantes.', 'Estilo fantasia com luzes quentes e auroras marcantes.', 'Fantasy style with warm lights and striking auroras.', 'Estilo fantasía con luces cálidas y auroras llamativas.'],
  'shader.supervanilla.desc': ['Vanilla aprimorado, sombras leves mantendo a estética original.', 'Vanilla melhorado, sombras suaves mantendo a estética original.', 'Enhanced vanilla with soft shadows keeping the original look.', 'Vanilla mejorado, sombras suaves manteniendo la estética original.'],

  // ── Mapa ──────────────────────────────────────────────────────────────
  'map.reload': ['Recarregar mapa', 'Recarregar mapa', 'Reload map', 'Recargar mapa'],
  'map.openBrowser': ['Abrir no navegador', 'Abrir no navegador', 'Open in browser', 'Abrir en el navegador'],
  'map.loading': ['Carregando mapa do servidor...', 'A carregar o mapa do servidor...', 'Loading server map...', 'Cargando el mapa del servidor...'],
  'map.iframeTitle': ['Mapa do servidor em tempo real', 'Mapa do servidor em tempo real', 'Real-time server map', 'Mapa del servidor en tiempo real'],

  // ── Atualização ───────────────────────────────────────────────────────
  'update.available': ['Nova atualização disponível!', 'Nova atualização disponível!', 'New update available!', '¡Nueva actualización disponible!'],
  'update.ready': ['Atualização pronta!', 'Atualização pronta!', 'Update ready!', '¡Actualización lista!'],
  'update.error': ['Falha ao baixar a atualização', 'Falha ao transferir a atualização', 'Failed to download update', 'Error al descargar la actualización'],
  'update.descAvailable': [
    'Uma nova versão {v} do Éden Launcher está disponível e já está sendo baixada. O launcher será liberado após a atualização.',
    'Uma nova versão {v} do Éden Launcher está disponível e já está a ser transferida. O launcher será liberado após a atualização.',
    'A new version {v} of Éden Launcher is available and is already downloading. The launcher will unlock after the update.',
    'Hay una nueva versión {v} de Éden Launcher disponible y ya se está descargando. El launcher se desbloqueará tras la actualización.',
  ],
  'update.descReady': [
    'A versão {v} foi baixada e está pronta. Reinicie o launcher para aplicá-la.',
    'A versão {v} foi transferida e está pronta. Reinicie o launcher para a aplicar.',
    'Version {v} has been downloaded and is ready. Restart the launcher to apply it.',
    'La versión {v} se ha descargado y está lista. Reinicia el launcher para aplicarla.',
  ],
  'update.descError': [
    'Não foi possível concluir o download. Verifique sua conexão e tente novamente.',
    'Não foi possível concluir a transferência. Verifique a sua ligação e tente novamente.',
    'Could not complete the download. Check your connection and try again.',
    'No se pudo completar la descarga. Comprueba tu conexión e inténtalo de nuevo.',
  ],
  'update.retry': ['Tentar novamente', 'Tentar novamente', 'Try again', 'Reintentar'],
  'update.install': ['Reiniciar & Atualizar', 'Reiniciar & Atualizar', 'Restart & Update', 'Reiniciar y Actualizar'],
  'update.restarting': ['Reiniciando…', 'A reiniciar…', 'Restarting…', 'Reiniciando…'],

  // ── Launch (App) ─────────────────────────────────────────────────────
  'launch.exitError': ['Minecraft encerrou com código {code}', 'O Minecraft terminou com o código {code}', 'Minecraft exited with code {code}', 'Minecraft terminó con código {code}'],
  'launch.javaError': ['Erro ao iniciar Java', 'Erro ao iniciar Java', 'Error starting Java', 'Error al iniciar Java'],
  'launch.failed': ['Falha ao iniciar Minecraft', 'Falha ao iniciar Minecraft', 'Failed to start Minecraft', 'Fallo al iniciar Minecraft'],
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
