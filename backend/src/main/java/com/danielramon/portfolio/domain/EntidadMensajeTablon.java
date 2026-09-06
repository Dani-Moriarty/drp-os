package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_board_messages")
public class EntidadMensajeTablon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String author;

    @Column(name = "body", nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean administrator;

    protected EntidadMensajeTablon() {
    }

    public EntidadMensajeTablon(
            String author,
            String message,
            LocalDateTime createdAt,
            boolean administrator
    ) {
        this.author = author;
        this.message = message;
        this.createdAt = createdAt;
        this.administrator = administrator;
    }

    public Long getId() {
        return id;
    }

    public String getAuthor() {
        return author;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isAdministrator() {
        return administrator;
    }
}
