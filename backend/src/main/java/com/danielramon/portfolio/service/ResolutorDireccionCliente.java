package com.danielramon.portfolio.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

@Component
public class ResolutorDireccionCliente {

    private static final String CLOUDFLARE_CLIENT_IP = "CF-Connecting-IP";

    public String resolve(HttpServletRequest solicitud) {
        var remoteAddress = solicitud.getRemoteAddr();
        if (!isLoopback(remoteAddress)) {
            return remoteAddress;
        }

        var cloudflareAddress = solicitud.getHeader(CLOUDFLARE_CLIENT_IP);
        return isIpLiteral(cloudflareAddress) ? cloudflareAddress.trim() : remoteAddress;
    }

    private boolean isLoopback(String valor) {
        try {
            return valor != null && InetAddress.getByName(valor).isLoopbackAddress();
        } catch (UnknownHostException excepcion) {
            return false;
        }
    }

    private boolean isIpLiteral(String valor) {
        if (valor == null || valor.isBlank() || !valor.matches("[0-9a-fA-F:.]+")) {
            return false;
        }
        try {
            InetAddress.getByName(valor.trim());
            return true;
        } catch (UnknownHostException excepcion) {
            return false;
        }
    }
}
