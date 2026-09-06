package com.danielramon.portfolio.service;

public class PortfolioNoEncontrado extends RuntimeException {
    public PortfolioNoEncontrado() {
        super("Portfolio data is not available");
    }
}
