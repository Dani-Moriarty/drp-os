package com.danielramon.portfolio.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ResolutorDireccionClienteTest {

    private final ResolutorDireccionCliente resolver = new ResolutorDireccionCliente();

    @Test
    void usesCloudflareAddressOnlyWhenTheDirectPeerIsLoopback() {
        var solicitud = new MockHttpServletRequest();
        solicitud.setRemoteAddr("127.0.0.1");
        solicitud.addHeader("CF-Connecting-IP", "203.0.113.24");

        assertThat(resolver.resolve(solicitud)).isEqualTo("203.0.113.24");
    }

    @Test
    void ignoresSpoofedCloudflareHeaderFromANonLocalPeer() {
        var solicitud = new MockHttpServletRequest();
        solicitud.setRemoteAddr("192.0.2.40");
        solicitud.addHeader("CF-Connecting-IP", "203.0.113.24");

        assertThat(resolver.resolve(solicitud)).isEqualTo("192.0.2.40");
    }

    @Test
    void ignoresInvalidCloudflareValues() {
        var solicitud = new MockHttpServletRequest();
        solicitud.setRemoteAddr("::1");
        solicitud.addHeader("CF-Connecting-IP", "attacker.example");

        assertThat(resolver.resolve(solicitud)).isEqualTo("::1");
    }
}
