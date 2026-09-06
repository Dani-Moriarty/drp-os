package com.danielramon.portfolio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;

@ConfigurationProperties(prefix = "app.cors")
public record PropiedadesCors(List<String> allowedOrigins) {

    public PropiedadesCors {
        allowedOrigins = allowedOrigins == null
                ? List.of()
                : allowedOrigins.stream().map(PropiedadesCors::validatedOrigin).distinct().toList();
    }

    private static String validatedOrigin(String value) {
        try {
            var candidate = value == null ? "" : value.trim();
            var origin = new URI(candidate);
            var scheme = origin.getScheme() == null ? "" : origin.getScheme().toLowerCase(Locale.ROOT);
            if (!(scheme.equals("http") || scheme.equals("https"))
                    || origin.getHost() == null
                    || origin.getUserInfo() != null
                    || origin.getQuery() != null
                    || origin.getFragment() != null
                    || !(origin.getPath().isEmpty() || origin.getPath().equals("/"))
                    || candidate.contains("*")) {
                throw new IllegalArgumentException("CORS origins must be explicit HTTP(S) origins");
            }
            var port = origin.getPort() < 0 ? "" : ":" + origin.getPort();
            return scheme + "://" + origin.getHost().toLowerCase(Locale.ROOT) + port;
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("CORS origins must be valid HTTP(S) origins", exception);
        }
    }
}
