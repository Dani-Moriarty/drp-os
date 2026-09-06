package com.danielramon.portfolio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.message-board")
public record PropiedadesTablon(
        String adminKey,
        RateLimit rateLimit,
        AdminSession adminSession
) {
    public PropiedadesTablon {
        rateLimit = rateLimit == null ? new RateLimit(5, Duration.ofMinutes(10)) : rateLimit;
        adminSession = adminSession == null
                ? new AdminSession(Duration.ofDays(30), Duration.ofMinutes(2), 8, Duration.ofMinutes(5), true)
                : adminSession;
    }

    public record RateLimit(
            int maxRequests,
            Duration window
    ) {
    }

    public record AdminSession(
            Duration ttl,
            Duration activationTtl,
            int maxAttempts,
            Duration attemptWindow,
            boolean secureCookie
    ) {
    }
}
