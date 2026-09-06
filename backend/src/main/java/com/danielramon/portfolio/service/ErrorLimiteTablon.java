package com.danielramon.portfolio.service;

public class ErrorLimiteTablon extends RuntimeException {
    public ErrorLimiteTablon() {
        super("Message board rate limit exceeded");
    }
}
