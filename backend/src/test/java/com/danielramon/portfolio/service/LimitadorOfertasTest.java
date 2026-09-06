package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesOfertas;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class LimitadorOfertasTest {

    @Test
    void limitsEachClientAndOpensANewWindowAfterExpiry() {
        var reloj = new MutableClock(Instant.parse("2026-08-21T10:00:00Z"));
        var ajustes = new PropiedadesOfertas.RateLimit(2, Duration.ofMinutes(15));
        var limiter = new LimitadorOfertas(ajustes, reloj);

        assertThat(limiter.intentarAdquirir("192.0.2.10")).isTrue();
        assertThat(limiter.intentarAdquirir("192.0.2.10")).isTrue();
        assertThat(limiter.intentarAdquirir("192.0.2.10")).isFalse();
        assertThat(limiter.intentarAdquirir("192.0.2.11")).isTrue();

        reloj.advance(Duration.ofMinutes(15));
        assertThat(limiter.intentarAdquirir("192.0.2.10")).isTrue();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
