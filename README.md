# 🚀 Éden Launcher

Launcher oficial do servidor **Éden** — built with Electron + React + Vite.

---

## 📁 Estrutura do projeto

```
eden-launcher/
├── electron/
│   ├── main.js               # Processo principal (Electron)
│   ├── preload.js            # Bridge IPC → renderer
│   ├── config.js             # Endpoints e constantes
│   └── services/
│       ├── paths.js          # Diretórios canônicos
│       ├── auth.js           # Microsoft OAuth2 + Offline
│       ├── modpack.js        # Download + verificação SHA-256
│       ├── anticheat.js      # Varredura anti-cheat pré-launch
│       ├── sessionToken.js   # Handshake com API Éden
│       └── launcher.js       # Spawn da JVM
├── src/renderer/             # UI React
│   ├── tabs/                 # HomeTab, ModsTab, SettingsTab, SupportTab
│   ├── components/           # PlayerCard, Header, Sidebar, etc.
│   └── styles/               # CSS por componente
├── session-plugin/           # Plugin Paper/Spigot do servidor
│   └── src/main/java/net/eden/session/  # EdenSessionPlugin.java
├── build/                    # Ícones do app (icon.ico / .icns / .png)
└── .env.example              # Variáveis de ambiente
```

---

## ⚙️ Setup de desenvolvimento

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env

# 3. Rodar em modo dev (Vite + Electron simultâneos)
npm run dev
```

---

## 🏗️ Build de produção

```bash
npm run build:win    # Windows (.exe installer)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

Os instaladores ficam em `dist-app/`.

---

## 🔑 Variáveis de ambiente obrigatórias

| Variável             | Descrição                                      |
|----------------------|------------------------------------------------|
| `EDEN_API_BASE`      | URL base da API do servidor (ex: `https://api.eden.net`) |
| `EDEN_MODPACK_URL`   | URL do `manifest.json` do modpack              |
| `EDEN_MS_CLIENT_ID`  | Client ID do Azure AD para auth Microsoft      |

---

## 🔐 Fluxo de autenticação Microsoft

1. Launcher abre janela OAuth2 da Microsoft
2. Usuário faz login → MS retorna `authorization_code`
3. Code → trocado por `access_token` MS
4. MS token → Xbox Live (XBL) → XSTS
5. XSTS → Minecraft Services → `mc_access_token`
6. Perfil do jogador buscado (UUID, nick, skins)

---

## 🛡️ Fluxo do Token de Sessão Éden

```
Launcher → POST /launcher/session
  { uuid, nickname, accountType, integrityHash, timestamp, launcherVersion }

API → 200 { token (JWT), expiresIn: 300 }

Launcher → spawn JVM com -Deden.session=<TOKEN>

Plugin Spigot → GET /launcher/validate?uuid=...&nick=...
  200 → permitir entrada
  ≠200 → kick com mensagem
```

---

## 📦 Manifesto do Modpack (exemplo)

```json
{
  "version": "1.4.2",
  "minecraft": "1.20.4",
  "versionId": "1.20.4-fabric",
  "loader": { "type": "fabric", "version": "0.15.7" },
  "files": [
    {
      "path": "mods/sodium-fabric-0.5.8.jar",
      "url": "https://cdn.eden.net/mods/sodium.jar",
      "sha256": "aabbcc...",
      "required": true
    },
    {
      "path": "shaderpacks/ComplementaryReimagined.zip",
      "url": "https://cdn.eden.net/shaders/Complementary.zip",
      "sha256": "ddeeff...",
      "required": false
    }
  ]
}
```

---

## 🖥️ Plugin do servidor

O plugin `eden-session` fica em `session-plugin/`.
Build com Maven:

```bash
cd session-plugin
mvn package
# → target/eden-session-1.0.0.jar
```

Coloque o `.jar` na pasta `plugins/` do seu servidor Paper/Spigot.
Configure `config.yml` com a URL da sua API.

---

## 🎨 Identidade visual

- **Paleta**: `#FF1744` → `#9C27B0` → `#1A237E` → `#0A0A0A`
- **Estilo**: urbano, graffiti, neon
- Coloque a logo oficial em `build/icon.png` (e versões `.ico` / `.icns`)
