package net.eden.session;

import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.logging.Level;

public class EdenSessionPlugin extends JavaPlugin implements Listener {

    private HttpClient http;
    private String apiBase;
    private String kickMessage;
    private int timeoutSeconds;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        apiBase        = getConfig().getString("api-base", "https://api.eden.net");
        kickMessage    = getConfig().getString("kick-message",
            "§cUse o launcher oficial do Éden para entrar!");
        timeoutSeconds = getConfig().getInt("timeout-seconds", 5);

        http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(timeoutSeconds))
            .build();

        getServer().getPluginManager().registerEvents(this, this);
        getLogger().info("EdenSession ativado. API = " + apiBase);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onPreLogin(AsyncPlayerPreLoginEvent event) {
        String nick = event.getName();
        String uuid = event.getUniqueId().toString();

        try {
            String url = apiBase + "/launcher/validate"
                + "?uuid=" + uuid
                + "&nick=" + nick;

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .GET()
                .build();

            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());

            if (res.statusCode() != 200) {
                getLogger().warning("Bloqueando " + nick + " — validação retornou " + res.statusCode());
                event.disallow(AsyncPlayerPreLoginEvent.Result.KICK_OTHER, kickMessage);
            }
        } catch (Exception ex) {
            getLogger().log(Level.WARNING, "Falha ao validar sessão de " + nick + ": " + ex.getMessage());
            // Se a API estiver fora do ar, permitir entrada para não derrubar o servidor.
            // Troque por KICK_OTHER se quiser modo restrito mesmo com API offline.
            // event.disallow(AsyncPlayerPreLoginEvent.Result.KICK_OTHER, kickMessage);
        }
    }

    @Override
    public void onDisable() {
        getLogger().info("EdenSession desativado.");
    }
}
