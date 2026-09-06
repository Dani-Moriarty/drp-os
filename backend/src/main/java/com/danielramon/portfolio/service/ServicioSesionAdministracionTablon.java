package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesCors;
import com.danielramon.portfolio.config.PropiedadesTablon;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ServicioSesionAdministracionTablon {

    public static final String ADMINISTRATOR_NAME = "Daniel Ramón Pérez";
    public static final String ADMIN_KEY_HEADER = "X-Message-Board-Admin-Key";
    public static final String COOKIE_NAME = "drp_message_board_admin";

    private static final String TOKEN_VERSION = "v1";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final PropiedadesTablon configuracion;
    private final PropiedadesCors configuracionCors;
    private final Clock reloj;
    private final LimitadorPeticionesEnMemoria limiteIntercambios;
    private final ConcurrentHashMap<String, Instant> codigosActivacion = new ConcurrentHashMap<>();
    private final AtomicInteger contadorLimpieza = new AtomicInteger();

    @Autowired
    public ServicioSesionAdministracionTablon(
            PropiedadesTablon configuracion,
            PropiedadesCors configuracionCors
    ) {
        this(configuracion, configuracionCors, Clock.systemUTC());
    }

    ServicioSesionAdministracionTablon(
            PropiedadesTablon configuracion,
            PropiedadesCors configuracionCors,
            Clock reloj
    ) {
        this.configuracion = configuracion;
        this.configuracionCors = configuracionCors;
        this.reloj = reloj;
        var ajustes = configuracion.adminSession();
        this.limiteIntercambios = new LimitadorPeticionesEnMemoria(
                ajustes.maxAttempts(),
                ajustes.attemptWindow(),
                reloj
        );
    }

    public Activation crearActivacion(HttpServletRequest solicitud) {
        if (!esSolicitudLocalDirecta(solicitud)
                || !claveRaizValida(solicitud.getHeader(ADMIN_KEY_HEADER))) {
            throw new ErrorModeracionTablon();
        }

        var rawCode = randomToken(32);
        var caducaEn = reloj.instant().plus(configuracion.adminSession().activationTtl());
        codigosActivacion.put(hash(rawCode), caducaEn);
        cleanupExpiredActivations();
        return new Activation(rawCode, caducaEn);
    }

    public String exchangeActivation(
            String codigo,
            String direccionCliente,
            HttpServletRequest solicitud
    ) {
        requireAllowedOrigin(solicitud);
        if (!limiteIntercambios.intentarAdquirir(direccionCliente)) {
            throw new ErrorLimiteAdministracionTablon();
        }

        var caducaEn = codigosActivacion.remove(hash(codigo));
        if (caducaEn == null || !reloj.instant().isBefore(caducaEn)) {
            throw new ErrorModeracionTablon();
        }
        return createSessionToken();
    }

    public boolean isBrowserAdministrator(HttpServletRequest solicitud) {
        if (!hasAllowedOrigin(solicitud)) {
            return false;
        }
        var token = sessionToken(solicitud);
        return token != null && validSessionToken(token);
    }

    public boolean isAuthorizedToModerate(HttpServletRequest solicitud) {
        if (isBrowserAdministrator(solicitud)) {
            return true;
        }
        return esSolicitudLocalDirecta(solicitud)
                && claveRaizValida(solicitud.getHeader(ADMIN_KEY_HEADER));
    }

    public ResponseCookie sessionCookie(String token) {
        return ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(configuracion.adminSession().secureCookie())
                .sameSite("Strict")
                .path("/api/message-board")
                .maxAge(configuracion.adminSession().ttl())
                .build();
    }

    public boolean validSessionToken(String token) {
        if (token == null || token.isBlank() || !configured()) {
            return false;
        }
        var separator = token.indexOf('.');
        if (separator < 1 || separator == token.length() - 1) {
            return false;
        }

        try {
            var payloadBytes = BASE64_URL_DECODER.decode(token.substring(0, separator));
            var suppliedSignature = BASE64_URL_DECODER.decode(token.substring(separator + 1));
            if (!MessageDigest.isEqual(sign(payloadBytes), suppliedSignature)) {
                return false;
            }

            var contenido = new String(payloadBytes, StandardCharsets.UTF_8).split(":", -1);
            if (contenido.length != 4 || !TOKEN_VERSION.equals(contenido[0])) {
                return false;
            }
            var emitidoEn = Instant.ofEpochSecond(Long.parseLong(contenido[1]));
            var caducaEn = Instant.ofEpochSecond(Long.parseLong(contenido[2]));
            var ahora = reloj.instant();
            return !emitidoEn.isAfter(ahora.plusSeconds(60))
                    && ahora.isBefore(caducaEn)
                    && !caducaEn.isAfter(emitidoEn.plus(configuracion.adminSession().ttl()).plusSeconds(1));
        } catch (IllegalArgumentException excepcion) {
            return false;
        }
    }

    boolean esSolicitudLocalDirecta(HttpServletRequest solicitud) {
        return isLoopback(solicitud.getRemoteAddr())
                && missing(solicitud.getHeader("CF-Connecting-IP"))
                && missing(solicitud.getHeader("X-Forwarded-For"))
                && missing(solicitud.getHeader("Forwarded"));
    }

    private String createSessionToken() {
        if (!configured()) {
            throw new ErrorModeracionTablon();
        }
        var emitidoEn = reloj.instant();
        var caducaEn = emitidoEn.plus(configuracion.adminSession().ttl());
        var contenido = String.join(
                ":",
                TOKEN_VERSION,
                Long.toString(emitidoEn.getEpochSecond()),
                Long.toString(caducaEn.getEpochSecond()),
                randomToken(16)
        ).getBytes(StandardCharsets.UTF_8);
        return BASE64_URL_ENCODER.encodeToString(contenido)
                + "."
                + BASE64_URL_ENCODER.encodeToString(sign(contenido));
    }

    private byte[] sign(byte[] contenido) {
        try {
            var mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(configuracion.adminKey().getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return mac.doFinal(contenido);
        } catch (Exception excepcion) {
            throw new IllegalStateException("Message Board session signing is unavailable", excepcion);
        }
    }

    private String sessionToken(HttpServletRequest solicitud) {
        var cookies = solicitud.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean claveRaizValida(String recibido) {
        if (!configured() || recibido == null) {
            return false;
        }
        return MessageDigest.isEqual(
                configuracion.adminKey().getBytes(StandardCharsets.UTF_8),
                recibido.getBytes(StandardCharsets.UTF_8)
        );
    }

    private boolean configured() {
        return configuracion.adminKey() != null && configuracion.adminKey().length() >= 32;
    }

    private void requireAllowedOrigin(HttpServletRequest solicitud) {
        if (!hasAllowedOrigin(solicitud)) {
            throw new ErrorModeracionTablon();
        }
    }

    private boolean hasAllowedOrigin(HttpServletRequest solicitud) {
        var origen = solicitud.getHeader("Origin");
        return origen != null && configuracionCors.allowedOrigins().stream().anyMatch(origen::equals);
    }

    private void cleanupExpiredActivations() {
        if (contadorLimpieza.incrementAndGet() % 16 != 0 && codigosActivacion.size() < 32) {
            return;
        }
        var ahora = reloj.instant();
        codigosActivacion.entrySet().removeIf(entrada -> !ahora.isBefore(entrada.getValue()));
    }

    private String randomToken(int bytes) {
        var valor = new byte[bytes];
        SECURE_RANDOM.nextBytes(valor);
        return BASE64_URL_ENCODER.encodeToString(valor);
    }

    private String hash(String valor) {
        try {
            var resumenHash = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(resumenHash.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException excepcion) {
            throw new IllegalStateException("SHA-256 is not available", excepcion);
        }
    }

    private boolean isLoopback(String valor) {
        try {
            return valor != null && InetAddress.getByName(valor).isLoopbackAddress();
        } catch (UnknownHostException excepcion) {
            return false;
        }
    }

    private boolean missing(String valor) {
        return valor == null || valor.isBlank();
    }

    public record Activation(String code, Instant expiresAt) {
    }
}
