package com.danielramon.portfolio.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

final class LimitadorPeticionesEnMemoria {

    private final int maximoSolicitudes;
    private final Duration intervalo;
    private final Clock reloj;
    private final ConcurrentHashMap<String, AttemptWindow> intervalos = new ConcurrentHashMap<>();
    private final AtomicInteger contadorLimpieza = new AtomicInteger();

    LimitadorPeticionesEnMemoria(int maximoSolicitudes, Duration intervalo, Clock reloj) {
        this.maximoSolicitudes = maximoSolicitudes;
        this.intervalo = intervalo;
        this.reloj = reloj;
    }

    boolean intentarAdquirir(String direccionCliente) {
        var ahora = reloj.instant();
        var permitido = new AtomicBoolean(false);
        // Comprobar y consumir el intento juntos: dos peticiones pueden llegar a la vez.
        intervalos.compute(hash(direccionCliente), (clave, actual) -> {
            if (actual == null || !ahora.isBefore(actual.startedAt().plus(intervalo))) {
                permitido.set(true);
                return new AttemptWindow(ahora, 1);
            }
            if (actual.attempts() >= maximoSolicitudes) {
                return actual;
            }
            permitido.set(true);
            return new AttemptWindow(actual.startedAt(), actual.attempts() + 1);
        });

        if (contadorLimpieza.incrementAndGet() % 128 == 0) {
            intervalos.entrySet().removeIf(
                    entrada -> !ahora.isBefore(entrada.getValue().startedAt().plus(intervalo))
            );
        }
        return permitido.get();
    }

    private String hash(String valor) {
        try {
            var resumenHash = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(resumenHash.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 is not available", excepcion);
        }
    }

    private record AttemptWindow(Instant startedAt, int attempts) {
    }
}
