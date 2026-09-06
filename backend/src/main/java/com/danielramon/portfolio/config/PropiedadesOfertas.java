package com.danielramon.portfolio.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.job-offers")
public record PropiedadesOfertas(
        Mail mail,
        RateLimit rateLimit
) {
    public record Mail(
            String mode,
            String from,
            String to,
            boolean logContent
    ) {
    }

    public record RateLimit(
            int maxRequests,
            Duration window
    ) {
    }
}
