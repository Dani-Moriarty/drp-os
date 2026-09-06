package com.danielramon.portfolio.service;

public class ErrorLimiteOfertas extends RuntimeException {
    public ErrorLimiteOfertas() {
        super("Too many job offer requests");
    }
}
