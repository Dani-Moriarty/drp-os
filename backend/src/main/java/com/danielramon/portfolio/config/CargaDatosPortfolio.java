package com.danielramon.portfolio.config;

import com.danielramon.portfolio.domain.CategoriaCompetencia;
import com.danielramon.portfolio.domain.EntidadCompetencia;
import com.danielramon.portfolio.domain.EntidadFormacion;
import com.danielramon.portfolio.domain.EntidadExperiencia;
import com.danielramon.portfolio.domain.EntidadAcreditacionIdioma;
import com.danielramon.portfolio.domain.EntidadPerfil;
import com.danielramon.portfolio.domain.CategoriaTecnologia;
import com.danielramon.portfolio.domain.EntidadTecnologia;
import com.danielramon.portfolio.repository.RepositorioCompetencias;
import com.danielramon.portfolio.repository.RepositorioFormacion;
import com.danielramon.portfolio.repository.RepositorioExperiencias;
import com.danielramon.portfolio.repository.RepositorioIdiomas;
import com.danielramon.portfolio.repository.RepositorioPerfil;
import com.danielramon.portfolio.repository.RepositorioTecnologias;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class CargaDatosPortfolio implements CommandLineRunner {

    private final RepositorioPerfil profileRepository;
    private final RepositorioExperiencias experienceRepository;
    private final RepositorioTecnologias technologyRepository;
    private final RepositorioCompetencias competencyRepository;
    private final RepositorioFormacion educationRepository;
    private final RepositorioIdiomas languageRepository;

    public CargaDatosPortfolio(
            RepositorioPerfil profileRepository,
            RepositorioExperiencias experienceRepository,
            RepositorioTecnologias technologyRepository,
            RepositorioCompetencias competencyRepository,
            RepositorioFormacion educationRepository,
            RepositorioIdiomas languageRepository
    ) {
        this.profileRepository = profileRepository;
        this.experienceRepository = experienceRepository;
        this.technologyRepository = technologyRepository;
        this.competencyRepository = competencyRepository;
        this.educationRepository = educationRepository;
        this.languageRepository = languageRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (profileRepository.count() > 0) {
            return;
        }

        seedProfile();
        Map<String, EntidadTecnologia> technologies = seedTechnologies();
        Map<String, EntidadCompetencia> competencies = seedCompetencies();
        seedExperiences(technologies, competencies);
        seedEducationAndLanguages();
    }

    private void seedProfile() {
        profileRepository.save(new EntidadPerfil(
                "Daniel Ramón Pérez",
                "Full-Stack Developer",
                "Barcelona, España",
                "+34 672226319",
                "danielramonperez@hotmail.com",
                "https://www.linkedin.com/in/daniel-ramón-pérez",
                "Desarrollador Full-Stack con más de 3 años de experiencia en aplicaciones web y sistemas de gestión, especializado en Angular/TypeScript y Java/Spring sobre SQL Server. Experiencia en aplicaciones hospitalarias, ERP y APIs REST, incluyendo desarrollo de funcionalidades, implementación de reglas y validaciones, resolución de incidencias y trabajo directo con clientes y equipos internacionales."
        ));
    }

    private Map<String, EntidadTecnologia> seedTechnologies() {
        var technologies = List.of(
                new EntidadTecnologia("Angular", CategoriaTecnologia.FRONTEND),
                new EntidadTecnologia("TypeScript", CategoriaTecnologia.FRONTEND),
                new EntidadTecnologia("JavaScript", CategoriaTecnologia.FRONTEND),
                new EntidadTecnologia("Java", CategoriaTecnologia.BACKEND),
                new EntidadTecnologia("Spring Boot", CategoriaTecnologia.BACKEND),
                new EntidadTecnologia("Python", CategoriaTecnologia.BACKEND),
                new EntidadTecnologia("SQL Server", CategoriaTecnologia.DATABASE),
                new EntidadTecnologia("WinDev", CategoriaTecnologia.OTHER)
        );

        Map<String, EntidadTecnologia> byName = new LinkedHashMap<>();
        technologyRepository.saveAll(technologies).forEach(item -> byName.put(item.getName(), item));
        return byName;
    }

    private Map<String, EntidadCompetencia> seedCompetencies() {
        var competencies = List.of(
                competency("Aplicaciones web de gestión", CategoriaCompetencia.FRONTEND,
                        "Desarrollo de aplicaciones web de gestión hospitalaria con Angular y TypeScript."),
                competency("Servicios REST con Java y Spring", CategoriaCompetencia.BACKEND,
                        "Desarrollo de servicios REST hospitalarios y APIs REST para plataformas CRM."),
                competency("Microservicios", CategoriaCompetencia.APIS_AND_ARCHITECTURE,
                        "Desarrollo backend de aplicaciones CRM y microservicios con Java y Spring Boot."),
                competency("Búsqueda, filtrado y paginación", CategoriaCompetencia.APIS_AND_ARCHITECTURE,
                        "Implementación de estas operaciones en APIs REST para cuentas, contactos y oportunidades."),
                competency("Lógica de dominio y validaciones", CategoriaCompetencia.BUSINESS_LOGIC,
                        "Implementación de rangos de dosis, doble verificación, pasos de protocolo y otras reglas hospitalarias."),
                competency("Roles y restricciones de acceso", CategoriaCompetencia.BUSINESS_LOGIC,
                        "Implementación de restricciones por usuario y rol en software hospitalario."),
                competency("Procesos hospitalarios", CategoriaCompetencia.BUSINESS_LOGIC,
                        "Módulos de medicación, quimioterapia, pacientes e impresión de pulseras y etiquetas."),
                competency("Procesos ERP", CategoriaCompetencia.BUSINESS_LOGIC,
                        "Aplicaciones para producción, stock y monitorización de maquinaria."),
                competency("Diseño y rendimiento de datos", CategoriaCompetencia.DATABASES,
                        "Optimización de arquitectura de datos y rendimiento de consultas en SQL Server."),
                competency("Soporte técnico a clientes", CategoriaCompetencia.TOOLS_AND_COLLABORATION,
                        "Soporte técnico directo a clientes en aplicaciones ERP."),
                competency("Trabajo en entornos de producción", CategoriaCompetencia.TOOLS_AND_COLLABORATION,
                        "Software hospitalario y sistemas ERP mantenidos en entornos de producción."),
                competency("Colaboración con equipos internacionales", CategoriaCompetencia.TOOLS_AND_COLLABORATION,
                        "El perfil profesional declara trabajo directo con clientes y equipos internacionales.")
        );

        Map<String, EntidadCompetencia> byName = new LinkedHashMap<>();
        competencyRepository.saveAll(competencies).forEach(item -> byName.put(item.getName(), item));
        return byName;
    }

    private EntidadCompetencia competency(String name, CategoriaCompetencia category, String evidence) {
        return new EntidadCompetencia(name, category, evidence);
    }

    private void seedExperiences(
            Map<String, EntidadTecnologia> technologies,
            Map<String, EntidadCompetencia> competencies
    ) {
        var cros = new EntidadExperiencia(
                "Full-Stack Developer",
                "CROS Ingenieros",
                LocalDate.of(2023, 2, 1),
                LocalDate.of(2026, 3, 1),
                "Software hospitalario y sistemas ERP en entornos de producción."
        );
        cros.addResponsibility("Desarrollo de aplicaciones web de gestión hospitalaria con Angular y TypeScript, y servicios REST con Java/Spring sobre SQL Server.");
        cros.addResponsibility("Diseño e implementación de módulos para administración de medicación, sesiones de quimioterapia, pacientes e impresión de pulseras/etiquetas.");
        cros.addResponsibility("Implementación de lógica de dominio y seguridad: rangos de dosis, doble verificación, selección de línea/canal, pasos de protocolo y restricciones por usuario/rol.");
        cros.addResponsibility("Desarrollo de aplicaciones ERP con WinDev para producción, stock y monitorización de maquinaria, además de soporte técnico directo a clientes.");
        addTechnologies(cros, technologies, "Angular", "TypeScript", "Java", "Spring Boot", "SQL Server", "WinDev");
        addCompetencies(cros, competencies,
                "Aplicaciones web de gestión",
                "Servicios REST con Java y Spring",
                "Lógica de dominio y validaciones",
                "Roles y restricciones de acceso",
                "Procesos hospitalarios",
                "Procesos ERP",
                "Soporte técnico a clientes",
                "Trabajo en entornos de producción"
        );

        var giroHosting = new EntidadExperiencia(
                "Backend Developer",
                "GiroHosting SL",
                LocalDate.of(2022, 1, 1),
                LocalDate.of(2022, 6, 1),
                "Backend para plataformas CRM de gestión comercial y procesos de venta."
        );
        giroHosting.addResponsibility("Desarrollo backend de aplicaciones CRM y microservicios con Java/Spring Boot: APIs REST para cuentas, contactos y oportunidades; búsqueda, filtrado y paginación.");
        giroHosting.addResponsibility("Optimización de arquitectura de datos y rendimiento de consultas en SQL Server.");
        addTechnologies(giroHosting, technologies, "Java", "Spring Boot", "SQL Server");
        addCompetencies(giroHosting, competencies,
                "Servicios REST con Java y Spring",
                "Microservicios",
                "Búsqueda, filtrado y paginación",
                "Diseño y rendimiento de datos"
        );

        experienceRepository.saveAll(List.of(cros, giroHosting));
    }

    private void addTechnologies(
            EntidadExperiencia experience,
            Map<String, EntidadTecnologia> technologies,
            String... names
    ) {
        for (String nombre : names) {
            experience.addTechnology(technologies.get(nombre));
        }
    }

    private void addCompetencies(
            EntidadExperiencia experience,
            Map<String, EntidadCompetencia> competencies,
            String... names
    ) {
        for (String nombre : names) {
            experience.addCompetency(competencies.get(nombre));
        }
    }

    private void seedEducationAndLanguages() {
        educationRepository.saveAll(List.of(
                new EntidadFormacion("Grado en Ingeniería Informática", "UAB", 2020, 2022),
                new EntidadFormacion("Técnico Superior DAM", "IFP", 2018, 2020)
        ));
        languageRepository.save(new EntidadAcreditacionIdioma(0, "Inglés", "B2 First", "Cambridge"));
    }
}
