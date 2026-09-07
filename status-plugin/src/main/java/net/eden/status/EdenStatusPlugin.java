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
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

// Contabiliza players (entradas, picos, únicos) e serve o endpoint
// HTTP /status que o Éden Launcher consulta para saber quantos players
// estão online e se o servidor está ligado.
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

    private ServerSocket serverSocket;
    private volatile boolean running = false;

    // ── Ciclo de vida ────────────────────────────────────────────────────────────

    @Override
    public void onEnable() {
        saveDefaultConfig();
        FileConfiguration cfg = getConfig();
        httpPort = cfg.getInt("http-port", 3001);
        showPlayerNames = cfg.getBoolean("show-player-names", true);

        loadStats();
        getServer().getPluginManager().registerEvents(this, this);
        startHttpServer();
        getLogger().info("EdenStatus ativo — endpoint http://localhost:" + httpPort + "/status");
    }

    @Override
    public void onDisable() {
        running = false;
        closeSocket();
        try {
            Files.createDirectories(getDataFolder().toPath());
            Files.writeString(statsFile(), buildStatsJson(), StandardCharsets.UTF_8);
        } catch (IOException ignored) {
        }
    }

    // ── Eventos: contabilizar entradas e picos ───────────────────────────────────

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
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
        saveStatsAsync();
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
            httpPort = getConfig().getInt("http-port", 3001);
            showPlayerNames = getConfig().getBoolean("show-player-names", true);
            sender.sendMessage("§aEdenStatus recarregado. §7(a porta exige reinício do servidor)");
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

    // ── Servidor HTTP (/status) ──────────────────────────────────────────────────

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
            } else {
                body = "{\"online\":true,\"error\":\"rota nao encontrada\",\"rotas\":[\"/status\"]}"
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
        } catch (Exception e) {
            getLogger().warning("Falha ao carregar stats.json: " + e.getMessage());
        }
    }
}
