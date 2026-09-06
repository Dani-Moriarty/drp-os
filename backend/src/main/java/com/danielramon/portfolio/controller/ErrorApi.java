package com.danielramon.portfolio.controller;

import java.time.Instant;

public record ErrorApi(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
}
