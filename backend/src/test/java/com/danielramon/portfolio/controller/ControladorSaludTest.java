package com.danielramon.portfolio.controller;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ControladorSaludTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ControladorSalud controller = new ControladorSalud(jdbcTemplate);

    @Test
    void reportsUpWhenTheDatabaseResponds() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class)).thenReturn(1);

        var respuesta = controller.health();

        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(respuesta.getBody()).containsEntry("status", "UP");
    }

    @Test
    void reportsServiceUnavailableWithoutLeakingDatabaseDetails() {
        when(jdbcTemplate.queryForObject("SELECT 1", Integer.class))
                .thenThrow(new DataAccessResourceFailureException("secret connection details"));

        var respuesta = controller.health();

        assertThat(respuesta.getStatusCode().value()).isEqualTo(503);
        assertThat(respuesta.getBody()).containsExactlyEntriesOf(java.util.Map.of("status", "DOWN"));
    }

    @Test
    void exposesBothTheTunnelProbeAndPublicTerminalHealthPaths() throws NoSuchMethodException {
        var mapping = ControladorSalud.class.getMethod("health").getAnnotation(GetMapping.class);

        assertThat(mapping.value()).containsExactlyInAnyOrder("/health", "/api/health");
    }
}
