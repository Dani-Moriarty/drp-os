package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import com.danielramon.portfolio.service.ServicioSesionAdministracionTablon;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class ControladorAdministracionTablonTest {

    @Mock
    private ServicioSesionAdministracionTablon sessions;

    @Mock
    private ResolutorDireccionCliente clientAddressResolver;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = standaloneSetup(new ControladorAdministracionTablon(sessions, clientAddressResolver))
                .setControllerAdvice(new ManejadorExcepcionesApi())
                .build();
    }

    @Test
    void createsAOneTimeActivationOnlyThroughTheSessionService() throws Exception {
        when(sessions.crearActivacion(any())).thenReturn(
                new ServicioSesionAdministracionTablon.Activation("one-time-code", Instant.parse("2026-09-04T12:02:00Z"))
        );

        mockMvc.perform(post("/api/message-board/admin/activation"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("one-time-code"));
    }

    @Test
    void exchangesTheActivationForASecureHttpOnlyCookie() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(sessions.exchangeActivation(eq("one-time-code"), eq("192.0.2.10"), any()))
                .thenReturn("signed-session");
        when(sessions.sessionCookie("signed-session")).thenReturn(
                ResponseCookie.from(ServicioSesionAdministracionTablon.COOKIE_NAME, "signed-session")
                        .httpOnly(true)
                        .secure(true)
                        .sameSite("Strict")
                        .path("/api/message-board")
                        .build()
        );

        mockMvc.perform(post("/api/message-board/admin/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"one-time-code\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Secure")))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("SameSite=Strict")))
                .andExpect(jsonPath("$.administrator").value(true));
    }

    @Test
    void reportsOnlyTheBackendVerifiedSessionState() throws Exception {
        when(sessions.isBrowserAdministrator(any())).thenReturn(true);

        mockMvc.perform(get("/api/message-board/admin/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.administrator").value(true));

        verify(sessions).isBrowserAdministrator(any());
    }
}
