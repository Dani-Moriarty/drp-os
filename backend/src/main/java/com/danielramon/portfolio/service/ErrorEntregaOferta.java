package com.danielramon.portfolio.service;

public class ErrorEntregaOferta extends RuntimeException {
    public ErrorEntregaOferta(String mensaje, Throwable cause) {
        super(mensaje, cause);
    }

    public ErrorEntregaOferta(String mensaje) {
        super(mensaje);
    }
}
