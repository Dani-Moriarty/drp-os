package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.SolicitudOferta;
import com.danielramon.portfolio.service.ErrorEntregaOferta;
import com.danielramon.portfolio.service.LimitadorOfertas;
import com.danielramon.portfolio.service.ServicioEnvioOferta;
import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

@ExtendWith(MockitoExtension.class)
class ControladorOfertasTest {

    @Mock
    private ServicioEnvioOferta submissionService;

    @Mock
    private LimitadorOfertas rateLimiter;

    @Mock
    private ResolutorDireccionCliente clientAddressResolver;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        var validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = standaloneSetup(new ControladorOfertas(
                        submissionService,
                        rateLimiter,
                        clientAddressResolver
                ))
                .setControllerAdvice(new ManejadorExcepcionesApi())
                .setValidator(validator)
                .build();
    }

    @Test
    void acceptsAValidRequestForDelivery() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(true);

        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isAccepted());

        verify(submissionService).submit(any(SolicitudOferta.class));
    }

    @Test
    void rejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid job offer request"));

        verifyNoInteractions(submissionService);
    }

    @Test
    void rejectsInvalidEmailValues() throws Exception {
        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()
                                .replace("laura@acme.com", "not-an-email")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(submissionService);
    }

    @Test
    void rejectsValuesOverTheDocumentedLimits() throws Exception {
        var oversizedCompany = "A".repeat(121);
        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace("Acme Software", oversizedCompany)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(submissionService);
    }

    @Test
    void silentlyAcceptsTheHoneypotWithoutSendingMail() throws Exception {
        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest().replace("\"website\": \"\"", "\"website\": \"spam.example\"")))
                .andExpect(status().isAccepted());

        verifyNoInteractions(rateLimiter, submissionService);
    }

    @Test
    void returnsTooManyRequestsWhenTheClientExceedsTheLimit() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(false);

        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Please wait before sending another offer"));

        verify(submissionService, never()).submit(any());
    }

    @Test
    void hidesMailFailuresBehindAGenericResponse() throws Exception {
        when(clientAddressResolver.resolve(any())).thenReturn("192.0.2.10");
        when(rateLimiter.intentarAdquirir(anyString())).thenReturn(true);
        doThrow(new ErrorEntregaOferta("SMTP password leaked internally"))
                .when(submissionService).submit(any());

        mockMvc.perform(post("/api/job-offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("The job offer could not be delivered"));
    }

    private String validRequest() {
        return """
                {
                  "company": "Acme Software",
                  "positionDescription": "Full-Stack para una plataforma de gestión con Angular y Java.",
                  "contactName": "Laura García",
                  "contactEmail": "laura@acme.com",
                  "website": ""
                }
                """;
    }
}
