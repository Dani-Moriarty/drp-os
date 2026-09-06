package com.danielramon.portfolio.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

class FiltroSeguridadApiTest {

    private final FiltroSeguridadApi filter = new FiltroSeguridadApi();

    @Test
    void addsDefensiveHeadersAndHstsToSecureResponses() throws Exception {
        var solicitud = new MockHttpServletRequest("GET", "/api/portfolio");
        solicitud.setSecure(true);
        var respuesta = new MockHttpServletResponse();

        filter.doFilter(solicitud, respuesta, (ignoredRequest, ignoredResponse) -> { });

        assertThat(respuesta.getHeader("Content-Security-Policy")).contains("default-src 'none'");
        assertThat(respuesta.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(respuesta.getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(respuesta.getHeader("Strict-Transport-Security")).contains("max-age=31536000");
    }

    @Test
    void rejectsOversizedApiBodiesBeforeTheyReachAController() throws Exception {
        var solicitud = new MockHttpServletRequest("POST", "/api/job-offers");
        solicitud.setContent(new byte[FiltroSeguridadApi.MAX_API_REQUEST_BYTES + 1]);
        var respuesta = new MockHttpServletResponse();
        var invoked = new AtomicBoolean(false);

        filter.doFilter(solicitud, respuesta, (ignoredRequest, ignoredResponse) -> invoked.set(true));

        assertThat(respuesta.getStatus()).isEqualTo(413);
        assertThat(respuesta.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(invoked).isFalse();
    }

    @Test
    void preservesAllowedRequestBodiesForMvcDeserialization() throws Exception {
        var solicitud = new MockHttpServletRequest("POST", "/api/message-board/messages");
        var cuerpo = "{\"message\":\"hola\"}".getBytes(StandardCharsets.UTF_8);
        solicitud.setContent(cuerpo);
        var respuesta = new MockHttpServletResponse();

        filter.doFilter(solicitud, respuesta, (wrappedRequest, ignoredResponse) ->
                assertThat(wrappedRequest.getInputStream().readAllBytes()).isEqualTo(cuerpo)
        );
    }
}
