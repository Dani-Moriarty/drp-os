package com.danielramon.portfolio.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class PropiedadesCorsTest {

    @Test
    void normalizesAndDeduplicatesExplicitOrigins() {
        var configuracion = new PropiedadesCors(List.of(
                " HTTPS://Example.COM/ ",
                "https://example.com"
        ));

        assertThat(configuracion.allowedOrigins()).containsExactly("https://example.com");
    }

    @Test
    void rejectsWildcardsCredentialsAndNonOriginPaths() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PropiedadesCors(List.of("https://*.example.com")));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PropiedadesCors(List.of("https://user:secret@example.com")));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PropiedadesCors(List.of("https://example.com/api")));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PropiedadesCors(List.of("javascript:alert(1)")));
    }
}
