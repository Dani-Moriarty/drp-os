package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.RespuestaActivacionAdministrador;
import com.danielramon.portfolio.dto.SolicitudSesionAdministrador;
import com.danielramon.portfolio.dto.RespuestaEstadoAdministrador;
import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import com.danielramon.portfolio.service.ServicioSesionAdministracionTablon;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/message-board/admin")
public class ControladorAdministracionTablon {

    private final ServicioSesionAdministracionTablon sessions;
    private final ResolutorDireccionCliente clientAddressResolver;

    public ControladorAdministracionTablon(
            ServicioSesionAdministracionTablon sessions,
            ResolutorDireccionCliente clientAddressResolver
    ) {
        this.sessions = sessions;
        this.clientAddressResolver = clientAddressResolver;
    }

    @PostMapping("/activation")
    public ResponseEntity<RespuestaActivacionAdministrador> createActivation(
            HttpServletRequest request
    ) {
        var activacion = sessions.crearActivacion(request);
        return noStore(new RespuestaActivacionAdministrador(activacion.code(), activacion.expiresAt()));
    }

    @PostMapping("/session")
    public ResponseEntity<RespuestaEstadoAdministrador> createSession(
            @Valid @RequestBody SolicitudSesionAdministrador request,
            HttpServletRequest servletRequest
    ) {
        var token = sessions.exchangeActivation(
                request.code(),
                clientAddressResolver.resolve(servletRequest),
                servletRequest
        );
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, sessions.sessionCookie(token).toString())
                .body(new RespuestaEstadoAdministrador(true));
    }

    @GetMapping("/session")
    public ResponseEntity<RespuestaEstadoAdministrador> sessionStatus(
            HttpServletRequest request
    ) {
        return noStore(new RespuestaEstadoAdministrador(sessions.isBrowserAdministrator(request)));
    }

    private <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(body);
    }
}
