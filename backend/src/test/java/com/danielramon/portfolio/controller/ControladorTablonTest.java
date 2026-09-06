package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.MensajeTablonDto;
import com.danielramon.portfolio.dto.PaginaTablonDto;
import com.danielramon.portfolio.dto.SolicitudPublicacionTablon;
import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import com.danielramon.portfolio.service.ServicioSesionAdministracionTablon;
import com.danielramon.portfolio.service.LimitadorTablon;
import com.danielramon.portfolio.service.ServicioTablon;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class ControladorTablonTest {

    @Mock
    private ServicioTablon service;

    @Mock
    private LimitadorTablon rateLimiter;

    @Mock
    private ResolutorDireccionCliente clientAddressResolver;

    @Mock
    private ServicioSesionAdministracionTablon adminSessions;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        var validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = standaloneSetup(new ControladorTablon(service, rateLimiter, clientAddressResolver, adminSessions))
                .setControllerAdvice(new ManejadorExcepcionesApi())
                .setValidator(validator)
                .build();
    }

    @Test
    void returnsTheGlobalConversationPage() throws Exception {
        var administrador = new MensajeTablonDto(1L, "Daniel Ramón Pérez", Instant.parse("2026-09-04T10:00:00Z"), "Hola", true);
        when(service.messages(0, 30)).thenReturn(new PaginaTablonDto(List.of(administrador), 0, 1, 1, false, false));

        mockMvc.perform(get("/api/message-board/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].id").value(1))
                .andExpect(jsonPath("$.messages[0].administrator").value(true));
    }

    @Test
    void publishesAValidMessage() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(true);
        when(service.publish(any(), anyBoolean())).thenReturn(new MensajeTablonDto(2L, "Nora", Instant.now(), "Hola", false));

        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2));

        verify(service).publish(any(SolicitudPublicacionTablon.class), eq(false));
    }

    @Test
    void delegatesAdministratorIdentityOnlyAfterCookieVerification() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(true);
        when(adminSessions.isBrowserAdministrator(any())).thenReturn(true);
        when(service.publish(any(), eq(true))).thenReturn(
                new MensajeTablonDto(2L, "Daniel Ramón Pérez", Instant.now(), "Hola", true)
        );

        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.administrator").value(true))
                .andExpect(jsonPath("$.author").value("Daniel Ramón Pérez"));

        verify(service).publish(any(SolicitudPublicacionTablon.class), eq(true));
    }

    @Test
    void rejectsMissingAndOversizedContent() throws Exception {
        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"author\":\"\",\"message\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid message board request"));

        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"author\":\"Nora\",\"message\":\"" + "A".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(service);
    }

    @Test
    void silentlyAcceptsTheHoneypotWithoutPersisting() throws Exception {
        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace("\"website\":\"\"", "\"website\":\"bot.example\"")))
                .andExpect(status().isAccepted());

        verifyNoInteractions(rateLimiter, service);
    }

    @Test
    void rateLimitsRepeatedPublications() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(false);

        mockMvc.perform(post("/api/message-board/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Please wait before posting another message"));

        verify(service, never()).publish(any(), anyBoolean());
    }

    @Test
    void exposesModerationOnlyAfterBackendAuthorization() throws Exception {
        when(adminSessions.isAuthorizedToModerate(any())).thenReturn(true);

        mockMvc.perform(delete("/api/message-board/messages/7")
                        .header("X-Message-Board-Admin-Key", "local-secret"))
                .andExpect(status().isNoContent());

        verify(service).delete(7L);
    }

    @Test
    void rejectsModerationWhenTheBackendSessionIsMissing() throws Exception {
        when(adminSessions.isAuthorizedToModerate(any())).thenReturn(false);

        mockMvc.perform(delete("/api/message-board/messages/7"))
                .andExpect(status().isForbidden());

        verify(service, never()).delete(7L);
    }

    @Test
    void rejectsInvalidPaginationValues() throws Exception {
        mockMvc.perform(get("/api/message-board/messages?page=-1&size=100"))
                .andExpect(status().isBadRequest());
        verify(service, never()).messages(anyInt(), anyInt());
    }

    private String validRequest() {
        return "{\"author\":\"Nora\",\"message\":\"Un portfolio estupendo\",\"website\":\"\"}";
    }
}
