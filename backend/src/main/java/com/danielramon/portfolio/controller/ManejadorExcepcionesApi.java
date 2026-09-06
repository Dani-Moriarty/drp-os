package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.service.PortfolioNoEncontrado;
import com.danielramon.portfolio.service.ErrorEntregaOferta;
import com.danielramon.portfolio.service.ErrorLimiteOfertas;
import com.danielramon.portfolio.service.ErrorModeracionTablon;
import com.danielramon.portfolio.service.ErrorLimiteAdministracionTablon;
import com.danielramon.portfolio.service.ErrorLimiteTablon;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;

@RestControllerAdvice
public class ManejadorExcepcionesApi {

    @ExceptionHandler(PortfolioNoEncontrado.class)
    public ResponseEntity<ErrorApi> handleNotFound(
            PortfolioNoEncontrado exception,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.NOT_FOUND, exception.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorApi> handleNoResource(
            NoResourceFoundException exception,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.NOT_FOUND, "Resource not found", request.getRequestURI());
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class,
            ConstraintViolationException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ErrorApi> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        String mensaje = request.getRequestURI().startsWith("/api/message-board")
                ? "Invalid message board request"
                : "Invalid job offer request";
        return buildError(HttpStatus.BAD_REQUEST, mensaje, request.getRequestURI());
    }

    @ExceptionHandler(ErrorLimiteTablon.class)
    public ResponseEntity<ErrorApi> handleMessageBoardRateLimit(
            ErrorLimiteTablon exception,
            HttpServletRequest request
    ) {
        return buildError(
                HttpStatus.TOO_MANY_REQUESTS,
                "Please wait before posting another message",
                request.getRequestURI()
        );
    }

    @ExceptionHandler(ErrorModeracionTablon.class)
    public ResponseEntity<ErrorApi> handleMessageBoardModeration(
            ErrorModeracionTablon exception,
            HttpServletRequest request
    ) {
        return buildError(HttpStatus.FORBIDDEN, "Moderation is not authorized", request.getRequestURI());
    }

    @ExceptionHandler(ErrorLimiteAdministracionTablon.class)
    public ResponseEntity<ErrorApi> handleMessageBoardAdminRateLimit(
            ErrorLimiteAdministracionTablon exception,
            HttpServletRequest request
    ) {
        return buildError(
                HttpStatus.TOO_MANY_REQUESTS,
                "Administrative activation is temporarily unavailable",
                request.getRequestURI()
        );
    }

    @ExceptionHandler(ErrorLimiteOfertas.class)
    public ResponseEntity<ErrorApi> handleRateLimit(
            ErrorLimiteOfertas exception,
            HttpServletRequest request
    ) {
        return buildError(
                HttpStatus.TOO_MANY_REQUESTS,
                "Please wait before sending another offer",
                request.getRequestURI()
        );
    }

    @ExceptionHandler(ErrorEntregaOferta.class)
    public ResponseEntity<ErrorApi> handleDeliveryFailure(
            ErrorEntregaOferta exception,
            HttpServletRequest request
    ) {
        return buildError(
                HttpStatus.SERVICE_UNAVAILABLE,
                "The job offer could not be delivered",
                request.getRequestURI()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorApi> handleUnexpected(Exception exception, HttpServletRequest request) {
        return buildError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The request could not be completed",
                request.getRequestURI()
        );
    }

    private ResponseEntity<ErrorApi> buildError(HttpStatus status, String message, String path) {
        var error = new ErrorApi(Instant.now(), status.value(), status.getReasonPhrase(), message, path);
        return ResponseEntity.status(status).body(error);
    }
}
