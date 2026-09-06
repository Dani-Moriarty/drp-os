package com.danielramon.portfolio.service;

public class ErrorModeracionTablon extends RuntimeException {
    public ErrorModeracionTablon() {
        super("Message board moderation was not authorized");
    }
}
