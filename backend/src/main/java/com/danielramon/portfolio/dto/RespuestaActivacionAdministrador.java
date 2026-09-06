package com.danielramon.portfolio.dto;

import java.time.Instant;

public record RespuestaActivacionAdministrador(
        String code,
        Instant expiresAt
) {
}
