package net.eden.status;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;
import net.milkbowl.vault.economy.Economy;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Contabiliza players (entradas, picos, únicos) e estatísticas individuais
// por nick (tempo de jogo, mobs derrotados, mortes, primeira vez, último
// login). Serve os endpoints HTTP /status e /player/<nick> que o Éden
// Launcher consulta.
public final class EdenStatusPlugin extends JavaPlugin implements Listener {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final Gson gson = new Gson();

    private int httpPort;
    private boolean showPlayerNames;

    private long totalJoins = 0;
    private int peakOnline = 0;
    private String peakDate = "";
    private final Set<UUID> uniquePlayers = new HashSet<>();
    private final Map<String, int[]> daily = new LinkedHashMap<>(); // data -> [entradas, pico]

    // Estatísticas por nick (chave = nick em minúsculo)
    private final Map<String, PlayerStats> playerStats = new LinkedHashMap<>();
    // Sessões abertas: uuid -> [timestamp da última contagem de tempo]
    private final Map<UUID, long[]> sessions = new HashMap<>();

    private ServerSocket serverSocket;
    private volatile boolean running = false;

    // Economia via Vault (EssentialsX etc.) — resolvido sob demanda
    private Economy economy = null;

    private static final class PlayerStats {
        String nick = "";
        long playtimeSec = 0;
        int mobKills = 0;
        int deaths = 0;
        long firstJoin = 0;
        long lastLogin = 0;
        long lastSeen = 0;
    }

    // ── Ciclo de vida ────────────────────────────────────────────────────────────

    @Override
    public void onEnable() {
        saveDefaultConfig();
        FileConfiguration cfg = getConfig();
        httpPort = cfg.getInt("http-port", 25617);
        showPlayerNames = cfg.getBoolean("show-player-names", true);

        loadStats();
        getServer().getPluginManager().registerEvents(this, this);
        startHttpServer();
        // Conta o tempo de jogo a cada 60s e persiste (à prova de crash)
        Bukkit.getScheduler().runTaskTimer(this, this::flushAllSessions, 20L * 60L, 20L * 60L);
        getLogger().info("EdenStatus ativo — endpoints http://localhost:" + httpPort
            + "/status e /player/<nick>");
    }

    @Override
    public void onDisable() {
        running = false;
        closeSocket();
        flushAllSessions();
        try {
            Files.createDirectories(getDataFolder().toPath());
            Files.writeString(statsFile(), buildStatsJson(), StandardCharsets.UTF_8);
        } catch (IOException ignored) {
        }
    }

    // ── Eventos: entradas, picos e estatísticas individuais ──────────────────────

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        String nick = p.getName();
        long now = System.currentTimeMillis();

        // Estatísticas individuais
        PlayerStats st = playerStats.computeIfAbsent(nick.toLowerCase(), (k) -> new PlayerStats());
        st.nick = nick;
        if (st.firstJoin == 0) {
            long first = p.getFirstPlayed();
            st.firstJoin = first > 0 ? first : now;
        }
        st.lastLogin = now;
        st.lastSeen = now;
        sessions.put(p.getUniqueId(), new long[]{now});

        // Contadores gerais
        uniquePlayers.add(p.getUniqueId());
        totalJoins++;

        String today = LocalDate.now().format(DATE);
        int[] d = daily.computeIfAbsent(today, (k) -> new int[2]);
        d[0]++;

        int online = Bukkit.getOnlinePlayers().size();
        if (online > peakOnline) {
            peakOnline = online;
            peakDate = today;
        }
        if (online > d[1]) d[1] = online;

        // mantém apenas os últimos 30 dias no histórico
        while (daily.size() > 30) {
            String oldest = daily.keySet().iterator().next();
            daily.remove(oldest);
        }
        saveStatsAsync();
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        flushSession(e.getPlayer());
        saveStatsAsync();
    }

    @EventHandler
    public void onPlayerDeath(PlayerDeathEvent e) {
        PlayerStats st = playerStats.get(e.getEntity().getName().toLowerCase());
        if (st != null) st.deaths++;
    }

    @EventHandler
    public void onEntityDeath(EntityDeathEvent e) {
        Player killer = e.getEntity().getKiller();
        if (killer == null) return;
        if (e.getEntity() instanceof Player) return; // PvP não conta como mob
        PlayerStats st = playerStats.get(killer.getName().toLowerCase());
        if (st != null) st.mobKills++;
    }

    // ── Tempo de jogo ────────────────────────────────────────────────────────────

    private void flushSession(Player p) {
        long[] s = sessions.remove(p.getUniqueId());
        if (s == null) return;
        PlayerStats st = playerStats.get(p.getName().toLowerCase());
        if (st == null) return;
        long now = System.currentTimeMillis();
        long delta = (now - s[0]) / 1000L;
        if (delta > 0) st.playtimeSec += delta;
        st.lastSeen = now;
    }

    private void flushAllSessions() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            long[] s = sessions.get(p.getUniqueId());
            if (s == null) continue;
            PlayerStats st = playerStats.get(p.getName().toLowerCase());
            if (st == null) continue;
            long now = System.currentTimeMillis();
            long delta = (now - s[0]) / 1000L;
            if (delta > 0) st.playtimeSec += delta;
            st.lastSeen = now;
            s[0] = now;
        }
        if (!sessions.isEmpty()) saveStatsAsync();
    }

    // ── Comando /edenstatus ──────────────────────────────────────────────────────

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 1 && args[0].equalsIgnoreCase("reload")) {
            if (!sender.hasPermission("edenstatus.admin")) {
                sender.sendMessage("§cSem permissão.");
                return true;
            }
            reloadConfig();
            httpPort = getConfig().getInt("http-port", 25617);
            showPlayerNames = getConfig().getBoolean("show-player-names", true);
            sender.sendMessage("§aEdenStatus recarregado. §7(a porta exige reinício do servidor)");
            return true;
        }

        // /edenstatus <nick> — estatísticas individuais
        if (args.length == 1) {
            PlayerStats st = playerStats.get(args[0].toLowerCase());
            if (st == null) {
                sender.sendMessage("§cNenhuma estatística para §f" + args[0]);
                return true;
            }
            sender.sendMessage("§6[Éden Status — " + st.nick + "]");
            sender.sendMessage("§eTempo em jogo: §f" + formatPlaytime(st.playtimeSec));
            sender.sendMessage("§eMobs derrotados: §f" + st.mobKills);
            sender.sendMessage("§eMortes: §f" + st.deaths);
            sender.sendMessage("§ePrimeira vez: §f" + (st.firstJoin > 0 ? DATE.format(Instant.ofEpochMilli(st.firstJoin)) : "—"));
            sender.sendMessage("§eÚltimo login: §f" + (st.lastLogin > 0 ? DATE.format(Instant.ofEpochMilli(st.lastLogin)) : "—"));
            Double bal = getBalance(st.nick);
            if (bal != null) sender.sendMessage("§eMoney: §f" + bal);
            return true;
        }

        String today = LocalDate.now().format(DATE);
        int[] d = daily.getOrDefault(today, new int[2]);
        sender.sendMessage("§6[Éden Status]");
        sender.sendMessage("§eOnline agora: §f" + Bukkit.getOnlinePlayers().size() + "/" + Bukkit.getMaxPlayers());
        sender.sendMessage("§ePico hoje: §f" + d[1]);
        sender.sendMessage("§eEntradas hoje: §f" + d[0]);
        sender.sendMessage("§eEntradas totais: §f" + totalJoins);
        sender.sendMessage("§ePico histórico: §f" + peakOnline + " §7(" + peakDate + ")");
        sender.sendMessage("§ePlayers únicos: §f" + uniquePlayers.size());
        return true;
    }

    private String formatPlaytime(long sec) {
        long d = sec / 86400;
        long h = (sec % 86400) / 3600;
        long m = (sec % 3600) / 60;
        if (d > 0) return d + "d " + h + "h";
        if (h > 0) return h + "h " + m + "m";
        return m + "m";
    }

    // ── Economia (Vault/EssentialsX) ─────────────────────────────────────────────

    private Economy getEconomy() {
        if (economy != null) return economy;
        try {
            var reg = Bukkit.getServicesManager().getRegistration(Economy.class);
            if (reg != null) economy = reg.getProvider();
        } catch (Throwable ignored) {
            // Vault não instalado — fica sem economia
        }
        return economy;
    }

    private Double getBalance(String nick) {
        try {
            Economy eco = getEconomy();
            if (eco == null) return null;
            Player online = Bukkit.getPlayerExact(nick);
            double bal = online != null
                ? eco.getBalance(online)
                : eco.getBalance(Bukkit.getOfflinePlayer(nick));
            return Math.round(bal * 100.0) / 100.0;
        } catch (Throwable ignored) {
            return null;
        }
    }

    // ── Servidor HTTP (/status e /player/<nick>) ─────────────────────────────────

    private void startHttpServer() {
        running = true;
        Thread thread = new Thread(this::acceptLoop, "EdenStatus-HTTP");
        thread.setDaemon(true);
        thread.start();
    }

    private void acceptLoop() {
        try {
            serverSocket = new ServerSocket();
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(httpPort));
        } catch (IOException e) {
            getLogger().severe("Falha ao abrir a porta " + httpPort + ": " + e.getMessage());
            return;
        }
        while (running) {
            try {
                handleClient(serverSocket.accept());
            } catch (IOException ignored) {
                // socket fechado durante o shutdown
            }
        }
    }

    private void handleClient(Socket socket) {
        try (socket) {
            socket.setSoTimeout(5000);
            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String request = in.readLine();
            if (request == null || request.isEmpty()) return;
            String[] parts = request.split(" ");
            String path = parts.length > 1 ? parts[1].split("\\?")[0] : "/";

            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) { }

            byte[] body;
            int code;
            String text;
            if (path.equals("/status") || path.equals("/")) {
                body = buildStatusJson().getBytes(StandardCharsets.UTF_8);
                code = 200;
                text = "OK";
            } else if (path.startsWith("/player/") && path.length() > 8) {
                body = buildPlayerStatsJson(path.substring(8)).getBytes(StandardCharsets.UTF_8);
                code = 200;
                text = "OK";
            } else {
                body = "{\"online\":true,\"error\":\"rota nao encontrada\",\"rotas\":[\"/status\",\"/player/<nick>\"]}"
                    .getBytes(StandardCharsets.UTF_8);
                code = 404;
                text = "Not Found";
            }

            OutputStream out = socket.getOutputStream();
            String head = "HTTP/1.1 " + code + " " + text + "\r\n"
                + "Content-Type: application/json; charset=utf-8\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Connection: close\r\n\r\n";
            out.write(head.getBytes(StandardCharsets.UTF_8));
            out.write(body);
            out.flush();
        } catch (Exception ignored) {
        }
    }

    private void closeSocket() {
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {
        }
    }

    private String buildStatusJson() {
        JsonObject root = new JsonObject();
        root.addProperty("online", true);
        root.addProperty("version", Bukkit.getMinecraftVersion());
        root.addProperty("motd", stripColor(Bukkit.getMotd()));

        JsonObject players = new JsonObject();
        players.addProperty("online", Bukkit.getOnlinePlayers().size());
        players.addProperty("max", Bukkit.getMaxPlayers());
        if (showPlayerNames) {
            JsonArray sample = new JsonArray();
            for (Player p : Bukkit.getOnlinePlayers()) {
                if (sample.size() >= 20) break;
                sample.add(p.getName());
            }
            players.add("sample", sample);
        }
        root.add("players", players);
        root.addProperty("checkedAt", Instant.now().toString());
        return gson.toJson(root);
    }

    private String buildPlayerStatsJson(String nick) {
        JsonObject o = new JsonObject();
        PlayerStats st = playerStats.get(nick.toLowerCase());
        boolean online = Bukkit.getPlayerExact(nick) != null;
        // OP do servidor (persistido em ops.txt — vale para online e offline)
        boolean op = false;
        try {
            op = Bukkit.getOfflinePlayer(nick).isOp();
        } catch (Throwable ignored) {
        }
        if (st == null) {
            o.addProperty("found", false);
            o.addProperty("nick", nick);
            o.addProperty("online", online);
        } else {
            o.addProperty("found", true);
            o.addProperty("nick", st.nick);
            o.addProperty("playtimeSec", st.playtimeSec);
            o.addProperty("mobKills", st.mobKills);
            o.addProperty("deaths", st.deaths);
            o.addProperty("firstJoin", st.firstJoin);
            o.addProperty("lastLogin", st.lastLogin);
            o.addProperty("lastSeen", st.lastSeen);
            o.addProperty("online", online);
            Double balance = getBalance(nick);
            if (balance != null) o.addProperty("balance", balance);
        }
        o.addProperty("op", op);
        o.addProperty("checkedAt", Instant.now().toString());
        return gson.toJson(o);
    }

    private String stripColor(String s) {
        return s == null ? "" : s.replaceAll("§.", "");
    }

    // ── Persistência (plugins/EdenStatus/stats.json) ─────────────────────────────

    private Path statsFile() {
        return getDataFolder().toPath().resolve("stats.json");
    }

    private String buildStatsJson() {
        JsonObject root = new JsonObject();
        root.addProperty("totalJoins", totalJoins);
        root.addProperty("peakOnline", peakOnline);
        root.addProperty("peakDate", peakDate);

        JsonArray uniq = new JsonArray();
        for (UUID u : uniquePlayers) uniq.add(u.toString());
        root.add("uniquePlayers", uniq);

        JsonObject day = new JsonObject();
        for (Map.Entry<String, int[]> en : daily.entrySet()) {
            JsonArray a = new JsonArray();
            a.add(en.getValue()[0]);
            a.add(en.getValue()[1]);
            day.add(en.getKey(), a);
        }
        root.add("daily", day);

        JsonObject players = new JsonObject();
        for (PlayerStats st : playerStats.values()) {
            JsonObject o = new JsonObject();
            o.addProperty("nick", st.nick);
            o.addProperty("playtimeSec", st.playtimeSec);
            o.addProperty("mobKills", st.mobKills);
            o.addProperty("deaths", st.deaths);
            o.addProperty("firstJoin", st.firstJoin);
            o.addProperty("lastLogin", st.lastLogin);
            o.addProperty("lastSeen", st.lastSeen);
            players.add(st.nick.toLowerCase(), o);
        }
        root.add("players", players);
        return gson.toJson(root);
    }

    private void saveStatsAsync() {
        final String json = buildStatsJson();
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                Files.createDirectories(getDataFolder().toPath());
                Files.writeString(statsFile(), json, StandardCharsets.UTF_8);
            } catch (IOException e) {
                getLogger().warning("Falha ao salvar stats.json: " + e.getMessage());
            }
        });
    }

    private void loadStats() {
        try {
            Path f = statsFile();
            if (!Files.exists(f)) return;
            JsonObject root = JsonParser.parseString(Files.readString(f, StandardCharsets.UTF_8))
                .getAsJsonObject();
            totalJoins = root.has("totalJoins") ? root.get("totalJoins").getAsLong() : 0;
            peakOnline = root.has("peakOnline") ? root.get("peakOnline").getAsInt() : 0;
            peakDate = root.has("peakDate") ? root.get("peakDate").getAsString() : "";
            uniquePlayers.clear();
            if (root.has("uniquePlayers")) {
                for (var el : root.getAsJsonArray("uniquePlayers")) {
                    uniquePlayers.add(UUID.fromString(el.getAsString()));
                }
            }
            daily.clear();
            if (root.has("daily")) {
                for (var entry : root.getAsJsonObject("daily").entrySet()) {
                    var a = entry.getValue().getAsJsonArray();
                    daily.put(entry.getKey(), new int[]{a.get(0).getAsInt(), a.get(1).getAsInt()});
                }
            }
            playerStats.clear();
            if (root.has("players")) {
                for (var entry : root.getAsJsonObject("players").entrySet()) {
                    JsonObject o = entry.getValue().getAsJsonObject();
                    PlayerStats st = new PlayerStats();
                    st.nick = o.has("nick") ? o.get("nick").getAsString() : entry.getKey();
                    st.playtimeSec = o.has("playtimeSec") ? o.get("playtimeSec").getAsLong() : 0;
                    st.mobKills = o.has("mobKills") ? o.get("mobKills").getAsInt() : 0;
                    st.deaths = o.has("deaths") ? o.get("deaths").getAsInt() : 0;
                    st.firstJoin = o.has("firstJoin") ? o.get("firstJoin").getAsLong() : 0;
                    st.lastLogin = o.has("lastLogin") ? o.get("lastLogin").getAsLong() : 0;
                    st.lastSeen = o.has("lastSeen") ? o.get("lastSeen").getAsLong() : 0;
                    playerStats.put(entry.getKey(), st);
                }
            }
        } catch (Exception e) {
            getLogger().warning("Falha ao carregar stats.json: " + e.getMessage());
        }
    }
}
