package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesCors;
import com.danielramon.portfolio.config.PropiedadesTablon;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServicioSesionAdministracionTablonTest {

    private static final String ADMIN_KEY = "test-administrator-key-that-is-longer-than-32-characters";
    private static final String ORIGIN = "https://danielramonperez.com";
    private static final Instant NOW = Instant.parse("2026-09-04T12:00:00Z");

    @Test
    void exchangesALocalOneTimeActivationForASignedBrowserSession() {
        var service = service(Duration.ofMinutes(2), Duration.ofDays(30));
        var localRequest = localRequest();
        var activacion = service.crearActivacion(localRequest);
        var exchangeRequest = browserRequest();

        var token = service.exchangeActivation(activacion.code(), "192.0.2.10", exchangeRequest);
        var authenticatedRequest = browserRequest();
        authenticatedRequest.setCookies(new Cookie(ServicioSesionAdministracionTablon.COOKIE_NAME, token));

        assertThat(service.isBrowserAdministrator(authenticatedRequest)).isTrue();
        assertThat(service.sessionCookie(token).toString())
                .contains("HttpOnly", "Secure", "SameSite=Strict", "Path=/api/message-board");
        assertThatThrownBy(() -> service.exchangeActivation(activacion.code(), "192.0.2.10", exchangeRequest))
                .isInstanceOf(ErrorModeracionTablon.class);
    }

    @Test
    void rejectsTunnelRequestsAndWrongRootKeysForActivation() {
        var service = service(Duration.ofMinutes(2), Duration.ofDays(30));
        var tunnelRequest = localRequest();
        tunnelRequest.addHeader("CF-Connecting-IP", "192.0.2.20");

        assertThatThrownBy(() -> service.crearActivacion(tunnelRequest))
                .isInstanceOf(ErrorModeracionTablon.class);

        var wrongKeyRequest = localRequest();
        wrongKeyRequest.removeHeader(ServicioSesionAdministracionTablon.ADMIN_KEY_HEADER);
        wrongKeyRequest.addHeader(ServicioSesionAdministracionTablon.ADMIN_KEY_HEADER, "wrong");
        assertThatThrownBy(() -> service.crearActivacion(wrongKeyRequest))
                .isInstanceOf(ErrorModeracionTablon.class);
    }

    @Test
    void rejectsTamperedExpiredAndCrossOriginSessions() {
        var service = service(Duration.ofMinutes(2), Duration.ofDays(30));
        var activacion = service.crearActivacion(localRequest());
        var token = service.exchangeActivation(activacion.code(), "192.0.2.10", browserRequest());

        var tampered = browserRequest();
        tampered.setCookies(new Cookie(ServicioSesionAdministracionTablon.COOKIE_NAME, token + "x"));
        assertThat(service.isBrowserAdministrator(tampered)).isFalse();

        var crossOrigin = new MockHttpServletRequest();
        crossOrigin.addHeader("Origin", "https://attacker.example");
        crossOrigin.setCookies(new Cookie(ServicioSesionAdministracionTablon.COOKIE_NAME, token));
        assertThat(service.isBrowserAdministrator(crossOrigin)).isFalse();

        var expiredService = service(Duration.ofMinutes(2), Duration.ZERO);
        var expiredActivation = expiredService.crearActivacion(localRequest());
        var expiredToken = expiredService.exchangeActivation(expiredActivation.code(), "192.0.2.10", browserRequest());
        assertThat(expiredService.validSessionToken(expiredToken)).isFalse();
    }

    @Test
    void rejectsExpiredActivationCodes() {
        var service = service(Duration.ZERO, Duration.ofDays(30));
        var activacion = service.crearActivacion(localRequest());

        assertThatThrownBy(() -> service.exchangeActivation(activacion.code(), "192.0.2.10", browserRequest()))
                .isInstanceOf(ErrorModeracionTablon.class);
    }

    private ServicioSesionAdministracionTablon service(Duration activationTtl, Duration sessionTtl) {
        var configuracion = new PropiedadesTablon(
                ADMIN_KEY,
                new PropiedadesTablon.RateLimit(5, Duration.ofMinutes(10)),
                new PropiedadesTablon.AdminSession(
                        sessionTtl,
                        activationTtl,
                        8,
                        Duration.ofMinutes(5),
                        true
                )
        );
        return new ServicioSesionAdministracionTablon(
                configuracion,
                new PropiedadesCors(List.of(ORIGIN)),
                Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    private MockHttpServletRequest localRequest() {
        var solicitud = new MockHttpServletRequest();
        solicitud.setRemoteAddr("127.0.0.1");
        solicitud.addHeader(ServicioSesionAdministracionTablon.ADMIN_KEY_HEADER, ADMIN_KEY);
        return solicitud;
    }

    private MockHttpServletRequest browserRequest() {
        var solicitud = new MockHttpServletRequest();
        solicitud.addHeader("Origin", ORIGIN);
        return solicitud;
    }
}
