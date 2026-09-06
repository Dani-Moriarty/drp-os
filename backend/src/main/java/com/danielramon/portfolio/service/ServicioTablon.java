package com.danielramon.portfolio.service;

import com.danielramon.portfolio.domain.EntidadMensajeTablon;
import com.danielramon.portfolio.dto.MensajeTablonDto;
import com.danielramon.portfolio.dto.PaginaTablonDto;
import com.danielramon.portfolio.dto.SolicitudPublicacionTablon;
import com.danielramon.portfolio.repository.RepositorioMensajes;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;

@Service
public class ServicioTablon {

    private final RepositorioMensajes repositorio;
    private final Clock reloj;

    @Autowired
    public ServicioTablon(
            RepositorioMensajes repositorio
    ) {
        this(repositorio, Clock.systemUTC());
    }

    ServicioTablon(
            RepositorioMensajes repositorio,
            Clock reloj
    ) {
        this.repositorio = repositorio;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public PaginaTablonDto messages(int pagina, int tamano) {
        var requestedPage = PageRequest.of(pagina, tamano, Sort.by(Sort.Direction.DESC, "id"));
        var mensajes = new ArrayList<MensajeTablonDto>();
        var administrator = repositorio.findFirstByAdministratorTrueOrderByIdAsc();
        administrator
                .map(this::toDto)
                .ifPresent(mensajes::add);
        var conversation = administrator
                .map(mensaje -> repositorio.findAllByIdNot(mensaje.getId(), requestedPage))
                .orElseGet(() -> repositorio.findAll(requestedPage));
        var conversationMessages = new ArrayList<>(conversation.getContent());
        Collections.reverse(conversationMessages);
        conversationMessages.stream().map(this::toDto).forEach(mensajes::add);

        int totalPages = Math.max(1, conversation.getTotalPages());
        return new PaginaTablonDto(
                mensajes,
                pagina,
                totalPages,
                conversation.getTotalElements() + (administrator.isPresent() ? 1 : 0),
                pagina + 1 < totalPages,
                pagina > 0
        );
    }

    @Transactional
    public MensajeTablonDto publish(SolicitudPublicacionTablon solicitud, boolean administrator) {
        var normalizado = solicitud.normalized();
        var guardado = repositorio.save(new EntidadMensajeTablon(
                administrator ? ServicioSesionAdministracionTablon.ADMINISTRATOR_NAME : normalizado.author(),
                normalizado.message(),
                LocalDateTime.ofInstant(reloj.instant(), ZoneOffset.UTC),
                administrator
        ));
        return toDto(guardado);
    }

    @Transactional
    public void delete(long id) {
        var mensaje = repositorio.findById(id)
                .orElseThrow(ErrorModeracionTablon::new);
        var permanentAdministratorMessage = repositorio.findFirstByAdministratorTrueOrderByIdAsc();
        if (permanentAdministratorMessage.isPresent()
                && permanentAdministratorMessage.get().getId().equals(mensaje.getId())) {
            throw new ErrorModeracionTablon();
        }
        repositorio.delete(mensaje);
    }

    private MensajeTablonDto toDto(EntidadMensajeTablon entidad) {
        return new MensajeTablonDto(
                entidad.getId(),
                entidad.getAuthor(),
                entidad.getCreatedAt().toInstant(ZoneOffset.UTC),
                entidad.getMessage(),
                entidad.isAdministrator()
        );
    }
}
