package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudPublicacionTablon;
import com.danielramon.portfolio.repository.RepositorioMensajes;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ServicioTablonIntegracionTest {

    @Autowired
    private ServicioTablon service;

    @Autowired
    private RepositorioMensajes repositorio;

    @Test
    @Transactional
    void persistsMessagesAndReturnsThemThroughTheSharedConversation() {
        var published = service.publish(new SolicitudPublicacionTablon("  Nora  ", "  Hola a todos.  ", ""), false);
        var pagina = service.messages(0, 30);

        assertThat(published.author()).isEqualTo("Nora");
        assertThat(published.message()).isEqualTo("Hola a todos.");
        assertThat(pagina.messages())
                .anySatisfy(mensaje -> {
                    assertThat(mensaje.id()).isEqualTo(1L);
                    assertThat(mensaje.administrator()).isTrue();
                })
                .anySatisfy(mensaje -> assertThat(mensaje.id()).isEqualTo(published.id()));
        assertThat(repositorio.findById(published.id())).isPresent();
    }

    @Test
    @Transactional
    void deletesOrdinaryMessagesButNeverThePermanentAdministratorMessage() {
        var published = service.publish(new SolicitudPublicacionTablon("Bot", "Spam", ""), false);

        service.delete(published.id());
        assertThat(repositorio.findById(published.id())).isEmpty();

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(ErrorModeracionTablon.class);
        assertThat(repositorio.findById(1L)).isPresent();
    }

    @Test
    @Transactional
    void forcesTheAdministratorIdentityAndKeepsLaterAdministratorPostsDeletable() {
        var published = service.publish(new SolicitudPublicacionTablon("Impostor", "Mensaje de Daniel", ""), true);
        var pagina = service.messages(0, 30);

        assertThat(published.author()).isEqualTo(ServicioSesionAdministracionTablon.ADMINISTRATOR_NAME);
        assertThat(published.administrator()).isTrue();
        assertThat(pagina.messages()).anySatisfy(mensaje -> {
            assertThat(mensaje.id()).isEqualTo(published.id());
            assertThat(mensaje.administrator()).isTrue();
        });

        service.delete(published.id());
        assertThat(repositorio.findById(published.id())).isEmpty();
    }
}
