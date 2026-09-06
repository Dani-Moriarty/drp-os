package com.danielramon.portfolio.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroSeguridadApi extends OncePerRequestFilter {

    static final int MAX_API_REQUEST_BYTES = 16 * 1024;
    private static final Set<String> METHODS_WITH_BODY = Set.of("POST", "PUT", "PATCH");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        addSecurityHeaders(request, response);

        if (!request.getRequestURI().startsWith("/api/") || !METHODS_WITH_BODY.contains(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (request.getContentLengthLong() > MAX_API_REQUEST_BYTES) {
            rejectOversized(response);
            return;
        }

        var cuerpo = request.getInputStream().readNBytes(MAX_API_REQUEST_BYTES + 1);
        if (cuerpo.length > MAX_API_REQUEST_BYTES) {
            rejectOversized(response);
            return;
        }
        filterChain.doFilter(new CachedBodyRequest(request, cuerpo), response);
    }

    private void addSecurityHeaders(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
        response.setHeader("Cross-Origin-Resource-Policy", "same-site");
        response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        if (request.getRequestURI().startsWith("/api/message-board/admin")) {
            response.setHeader("Cache-Control", "no-store");
            response.setHeader("Pragma", "no-cache");
        }
    }

    private void rejectOversized(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
    }

    private static final class CachedBodyRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        private CachedBodyRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public int getContentLength() {
            return body.length;
        }

        @Override
        public long getContentLengthLong() {
            return body.length;
        }

        @Override
        public ServletInputStream getInputStream() {
            var entrada = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return entrada.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException("Asynchronous reads are not supported");
                }

                @Override
                public int read() {
                    return entrada.read();
                }

                @Override
                public int read(byte[] bytes, int offset, int length) {
                    return entrada.read(bytes, offset, length);
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
