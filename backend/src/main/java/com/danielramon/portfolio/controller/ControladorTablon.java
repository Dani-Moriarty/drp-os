package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.MensajeTablonDto;
import com.danielramon.portfolio.dto.PaginaTablonDto;
import com.danielramon.portfolio.dto.SolicitudPublicacionTablon;
import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import com.danielramon.portfolio.service.ServicioSesionAdministracionTablon;
import com.danielramon.portfolio.service.ErrorModeracionTablon;
import com.danielramon.portfolio.service.ErrorLimiteTablon;
import com.danielramon.portfolio.service.LimitadorTablon;
import com.danielramon.portfolio.service.ServicioTablon;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/message-board/messages")
public class ControladorTablon {

    private final ServicioTablon service;
    private final LimitadorTablon rateLimiter;
    private final ResolutorDireccionCliente clientAddressResolver;
    private final ServicioSesionAdministracionTablon adminSessions;

    public ControladorTablon(
            ServicioTablon service,
            LimitadorTablon rateLimiter,
            ResolutorDireccionCliente clientAddressResolver,
            ServicioSesionAdministracionTablon adminSessions
    ) {
        this.service = service;
        this.rateLimiter = rateLimiter;
        this.clientAddressResolver = clientAddressResolver;
        this.adminSessions = adminSessions;
    }

    @GetMapping
    public PaginaTablonDto messages(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "30") @Min(1) @Max(50) int size
    ) {
        if (page < 0 || size < 1 || size > 50) {
            throw new IllegalArgumentException("Invalid message board pagination");
        }
        return service.messages(page, size);
    }

    @PostMapping
    public ResponseEntity<MensajeTablonDto> publish(
            @Valid @RequestBody SolicitudPublicacionTablon request,
            HttpServletRequest servletRequest
    ) {
        if (request.honeypotFilled()) {
            return ResponseEntity.accepted().build();
        }
        if (!rateLimiter.intentarAdquirir(clientAddressResolver.resolve(servletRequest))) {
            throw new ErrorLimiteTablon();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.publish(request, adminSessions.isBrowserAdministrator(servletRequest))
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable @Min(1) long id,
            HttpServletRequest request
    ) {
        if (!adminSessions.isAuthorizedToModerate(request)) {
            throw new ErrorModeracionTablon();
        }
        service.delete(id);
    }
}
