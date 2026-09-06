package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.SolicitudOferta;
import com.danielramon.portfolio.service.ErrorLimiteOfertas;
import com.danielramon.portfolio.service.LimitadorOfertas;
import com.danielramon.portfolio.service.ServicioEnvioOferta;
import com.danielramon.portfolio.service.ResolutorDireccionCliente;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/job-offers")
public class ControladorOfertas {

    private final ServicioEnvioOferta submissionService;
    private final LimitadorOfertas rateLimiter;
    private final ResolutorDireccionCliente clientAddressResolver;

    public ControladorOfertas(
            ServicioEnvioOferta submissionService,
            LimitadorOfertas rateLimiter,
            ResolutorDireccionCliente clientAddressResolver
    ) {
        this.submissionService = submissionService;
        this.rateLimiter = rateLimiter;
        this.clientAddressResolver = clientAddressResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void submit(
            @Valid @RequestBody SolicitudOferta request,
            HttpServletRequest servletRequest
    ) {
        if (request.honeypotFilled()) {
            return;
        }
        if (!rateLimiter.intentarAdquirir(clientAddressResolver.resolve(servletRequest))) {
            throw new ErrorLimiteOfertas();
        }
        submissionService.submit(request);
    }
}
