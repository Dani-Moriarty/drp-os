package com.danielramon.portfolio.dto;

import java.time.Instant;

public record MensajeTablonDto(
        long id,
        String author,
        Instant createdAt,
        String message,
        boolean administrator
) {
}
