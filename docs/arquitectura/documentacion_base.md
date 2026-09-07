# DOCUMENTACIÓN TÉCNICA DEFINITIVA DE DRP OS

**Auditoría técnica de código, configuración, datos, ejecución e infraestructura**

Versión auditada: 7 de septiembre de 2026

Repositorio canónico: `https://github.com/Dani-Moriarty/drp-os`

Rama auditada: `main`
Idioma: español

> Este dosier describe el sistema que existe. El código versionado es la autoridad para el diseño; las observaciones de ejecución y de infraestructura se identifican por separado. No contiene valores de secretos, credenciales, destinatarios privados ni tokens.

<!-- PAGEBREAK -->

## 1. Cómo leer esta auditoría

La investigación siguió el orden **descubrir → inventariar → relacionar → trazar → validar → documentar**. Se recorrieron los fuentes Angular y Java, pruebas, configuración, dependencias, assets, scripts, Docker, documentación operativa y Git; después se contrastaron con builds limpios, la interfaz pública, la API pública, procesos locales, Docker y el catálogo real de SQL Server accesible durante la auditoría.

### 1.1 Grados de certeza

| Etiqueta | Significado en este documento |
|---|---|
| **CONFIRMADO — código** | Existe y se ha contrastado en fuentes o configuración versionada. |
| **CONFIRMADO — prueba** | Además se ejecutó una prueba, lint, build, petición o recorrido de interfaz. |
| **CONFIRMADO — infraestructura** | Se observó en procesos, puertos, contenedores, base de datos o servicio accesible. |
| **INFERIDO** | Conclusión razonable derivada de evidencias, sin acceso directo al plano de control externo. |
| **NO CONFIRMADO** | El repositorio o los accesos disponibles no permiten asegurarlo. |

### 1.2 Foto cuantitativa

| Magnitud | Resultado auditado |
|---|---|
| Ficheros versionados al inicio | 332 |
| TypeScript de aplicación | 91 |
| Plantillas HTML / hojas SCSS | 30 / 30 |
| Java de producción / pruebas Java | 66 / 14 |
| Scripts PowerShell operativos | 16 |
| Assets públicos inventariados | 32 |
| Aplicaciones visibles en el escritorio | 18 |
| Identidades registradas de ventana | 24 |
| Carpetas de aplicación Angular | 20 |
| Combinaciones método/ruta HTTP, contando las dos variantes de salud | 16 |
| Tablas SQL observadas | 10 |
| Diagramas del dosier | 20 |

### 1.3 Alcance y límites

Se verificó el repositorio local, el remoto canónico, la aplicación pública, los procesos locales, el contenedor SQL y el esquema accesible. No se accedió al panel privado de Cloudflare Pages, al panel DNS, al panel de Resend, a métricas históricas del proveedor ni a una política externa de copias. Las afirmaciones sobre esos planos de control se marcan como inferidas o no confirmadas. El contenido profesional no se reinterpretó: `docs/CV.pdf` sigue siendo la fuente de verdad.

## 2. DRP OS explicado en 2 minutos

DRP OS es un portfolio que se comporta como un pequeño sistema operativo de escritorio inspirado en la informática de los años noventa. No es un sistema operativo real: es una aplicación Angular que se ejecuta dentro del navegador. Sus iconos, ventanas, barra de tareas, menú Inicio, juegos y herramientas son componentes web coordinados por servicios comunes.

La primera carga no necesita el backend. Cloudflare Pages entrega HTML, JavaScript, estilos, imágenes, audio, los PDF del CV y un snapshot JSON versionado. Angular arranca, lee `/data/portfolio.json` y construye el escritorio. Gracias a esa separación, el portfolio profesional continúa visible aunque el ordenador que aloja la API esté apagado.

Parte del estado vive sólo en la memoria de la pestaña: ventanas abiertas, partidas, historial del terminal o lienzo de Paint. Otra parte se guarda en `localStorage`: posiciones de iconos, sistema de archivos virtual, idioma, preferencias de audio y nombre usado en el tablón. Esos datos pertenecen a ese navegador; no son archivos del disco del visitante ni se comparten con otras personas.

El backend sí es real. Es una aplicación Spring Boot que escucha sólo en `127.0.0.1:8080` en el PC de Daniel. Un servicio `cloudflared` abre un túnel saliente y publica la API por HTTPS sin abrir el puerto del router. SQL Server Express corre en Docker, también restringido a loopback, y conserva el portfolio estructurado y los mensajes públicos. Las ofertas de trabajo se validan, se envían por SMTP y se descartan: no se guardan en la base de datos.

Cloudflare cumple dos funciones distintas: Pages sirve el frontend estático; Tunnel conduce sólo las llamadas a la API local. GitHub es el repositorio canónico y el origen documentado del despliegue del frontend. Resend se usa como servidor SMTP configurable. Ninguna pantalla simula CPU, RAM o procesos del host: el Administrador de tareas muestra únicamente ventanas y actividad HTTP que DRP OS puede medir honestamente.

![Mapa maestro de todo DRP OS](arquitectura/renderizados/01-mapa-maestro.png)

## 3. Mapa maestro y límites del sistema

El sistema tiene cuatro lugares de ejecución. El navegador ejecuta Angular y las APIs web. El edge de Cloudflare entrega los estáticos y termina HTTPS. El PC de Daniel ejecuta el túnel y el JAR. Docker Desktop aloja SQL Server; Resend y GitHub son servicios externos separados.

![Mapa de ejecución y hosting](arquitectura/renderizados/02-ejecucion-hosting.png)

| Componente | Proveedor / entorno | Cómo llega allí | Conexión |
|---|---|---|---|
| Frontend Angular | Cloudflare Pages, producción pública | Push a `main`; build estático documentado | Navegador por HTTPS |
| Snapshot, assets, CV y runtime config | Mismo despliegue Pages | Empaquetados desde `frontend/public` | Peticiones estáticas |
| API Spring Boot | PC Windows de Daniel | JAR construido con Maven; arranque operativo separado | Sólo `127.0.0.1:8080` |
| Publicación de API | Cloudflare Tunnel | Servicio Windows `cloudflared` con túnel administrado | Conexión saliente; HTTPS público a HTTP loopback |
| SQL Server Express | Docker Desktop en el mismo PC | `docker compose` + scripts de inicialización/migración | JDBC a `127.0.0.1:1433` |
| Datos SQL | Volumen Docker persistente | Escritura JPA/SQL Server | Compartidos por todos los visitantes donde aplica |
| Correo de ofertas | Resend mediante SMTP | Configuración privada en entorno | SMTP saliente desde backend |
| Código | GitHub, repositorio `Dani-Moriarty/drp-os` | Git commit/push | HTTPS/Git |

## 4. Ciclo de vida de extremo a extremo

### 4.1 Carga inicial

![Secuencia de carga inicial](arquitectura/renderizados/03-carga-inicial.png)

1. El visitante abre el dominio. DNS/TLS y Pages son responsabilidades de Cloudflare. El navegador recibe `index.html` y bundles con hash.
2. `frontend/src/main.ts → bootstrapApplication(Aplicacion, appConfig)` crea la aplicación standalone.
3. `frontend/src/app/app.config.ts → appConfig` registra `HttpClient`, `interceptorActividad`, el router vacío y manejadores globales de error.
4. `frontend/src/app/app.ts → Aplicacion.cargarPortfolio()` inicia `ActividadSistema.observeResources()`, registra un pulso del shell y llama al servicio de portfolio.
5. `frontend/src/app/core/services/portfolio.service.ts → ServicioPortfolio.obtenerPortfolio()` descarga `/data/portfolio.json`. Este paso **no** consulta `/api/portfolio`.
6. Con datos válidos se monta `Escritorio`; en fallo aparece un estado de error con reintento. El escritorio abre Welcome y registra el contenido de CV en el sistema de archivos virtual.
7. Las interacciones posteriores son locales salvo acciones explícitas que usan la API, un enlace externo o recursos remotos permitidos.

### 4.2 Qué inicia cada fase

| Fase | Disparador | Entrada | Salida | Dónde ocurre |
|---|---|---|---|---|
| Entrega | Navegación al dominio | URL HTTPS | Estáticos | Cloudflare / navegador |
| Bootstrap | Evaluación de `main.ts` | Bundles | Inyector y componente raíz | Navegador |
| Portfolio | Inicialización de `Aplicacion` | JSON versionado | Modelo `Portfolio` | Navegador |
| Escritorio | Estado `success` | Portfolio | Iconos, ventanas, barra | Navegador |
| Apertura | Doble clic, teclado o Inicio | ID de aplicación | `VentanaAplicacion` | `GestorVentanas` |
| Persistencia local | Mutación de layout/filesystem/preferencia | Estado serializable | Clave versionada | `localStorage` |
| REST | Publicar, contratar, terminal o administración | DTO JSON | DTO o error | Navegador → Tunnel → Spring |
| Persistencia global | Servicio del tablón / carga inicial | Entidad JPA | Fila SQL | SQL Server |
| Correo | Oferta válida, no honeypot | Mensaje normalizado | Entrega SMTP o 503 | Backend → Resend |

### 4.3 Reinicio ficticio y cierre

El comando de reinicio del escritorio no reinicia Windows ni el servidor. El shell coordina el cierre de ventanas y el reset de servicios en memoria: sesiones de documentos, historial del explorador, audio, terminal, Paint y juegos. También restablece la distribución y el sistema de archivos virtual según la implementación del shell. Una recarga ordinaria, en cambio, vuelve a leer las claves persistentes compatibles. Cerrar una ventana pasa por `GestorVentanas`; las aplicaciones no implementan su propio ciclo de vida de ventana.

## 5. Arquitectura del frontend

![Arquitectura frontend](arquitectura/renderizados/04-arquitectura-frontend.png)

### 5.1 Capas internas

| Capa | Responsabilidad | Entradas / salidas | Ubicaciones principales |
|---|---|---|---|
| Raíz | Bootstrap, carga y fallback inicial | Snapshot → portfolio o error | `frontend/src/main.ts`, `frontend/src/app/app.ts` |
| Shell desktop | Composición, ventanas, menús y despacho de aplicaciones | Eventos → acciones del gestor | `desktop/components/desktop-shell` |
| Modelo de escritorio | Registro, geometría, estados y tipos | Configuración → ventanas/iconos | `desktop/config`, `desktop/models` |
| Servicios de escritorio | Ciclo de ventanas, filesystem y layout | Mutaciones → signals + almacenamiento | `desktop/services` |
| Aplicaciones | Contenido funcional dentro de ventanas | Inputs específicos → vista/eventos | `applications/*` |
| Core transversal | API, localización, descargas, documentos y actividad | HTTP/DOM/estado → servicios compartidos | `core/*` |
| Recursos | Snapshot, CV, audio, imágenes, configuración pública | Archivos estáticos → navegador | `frontend/public` |

Angular se usa con componentes standalone, TypeScript estricto, signals para estado local y SCSS por componente. No se encontró framework de UI ni librería de estado global. `app.routes.ts` no define navegación: el escritorio y sus ventanas son la navegación.

### 5.2 Registro y composición de aplicaciones

`frontend/src/app/desktop/config/desktop-applications.ts` es el registro central. Define metadatos, iconos, tamaños iniciales, visibilidad en escritorio/Inicio y comportamiento externo. El shell interpreta esos metadatos y crea el componente correspondiente. Hay 24 identidades: 18 visibles y seis auxiliares o derivadas (`welcome`, `experience-notepad`, `virtual-folder`, `text-notepad`, `image-viewer`, `source-code-message`).

El único URL canónico de código vive en `frontend/src/app/desktop/config/source-code.config.ts`. LinkedIn y GitHub son atajos externos seguros; si la navegación no puede iniciarse se usa una ventana de mensaje honesta.

### 5.3 Ventanas

![Ciclo de estados de una ventana](arquitectura/renderizados/05-ciclo-ventana.png)

`frontend/src/app/desktop/services/window-manager.service.ts → GestorVentanas` mantiene el signal de ventanas, la ventana activa y el siguiente `z-index`. Expone apertura, enfoque, minimización, restauración, maximización, cierre, movimiento, redimensionamiento, ajuste a viewport y reset. `window-frame` usa Pointer Events; el gestor limita geometría para que las ventanas sigan recuperables.

A 640 px o menos el escritorio cambia a cuadrícula móvil, se desactiva el arrastre de iconos y el contenido de aplicaciones conserva scroll. En la comprobación pública a 390×844 no hubo desbordamiento horizontal del documento. Las ventanas conservan la metáfora de escritorio, no se convierten en rutas o tarjetas.

### 5.4 Sistema de archivos virtual

![Sistema de archivos virtual](arquitectura/renderizados/06-sistema-archivos.png)

`frontend/src/app/desktop/services/desktop-file-system.service.ts → SistemaArchivosEscritorio` implementa un árbol cliente, no el disco real. Contiene ubicaciones de sistema (escritorio, experiencia, música, álbum y papelera), carpetas de usuario y entradas aplicación/texto/imagen/audio. Resuelve asociaciones: TXT a Notepad, imágenes al visor, audio al reproductor y aplicaciones a ventanas.

Puede crear, renombrar, mover, copiar recursivamente, ordenar, enviar a papelera, restaurar, eliminar definitivamente y vaciar. Conserva el origen de una entrada eliminada. Limita texto de usuario a 100.000 caracteres e imágenes virtuales a Data URL de 3.000.000 caracteres, con MIME PNG/JPEG/WebP/GIF. Distingue entradas protegidas o inmovibles. El esquema `drp-os.file-system.v6` migra las versiones 1–5 y prefijos históricos de producto.

`frontend/src/app/desktop/services/desktop-layout.service.ts → DistribucionEscritorio` guarda posiciones con `drp-os.desktop-layout.v3`, migra v1/v2 y soporta distribución predeterminada o personalizada. No hay sincronización con servidor ni entre pestañas.

### 5.5 Servicios transversales

| Servicio | Estado / tarea | Consumidores |
|---|---|---|
| `ServicioPortfolio` | Carga el snapshot estático y valida la respuesta por uso tipado | `Aplicacion`, aplicaciones de CV |
| `Localizacion` | Idioma y textos; persiste `drp-os.language.v1` | Shell y aplicaciones localizadas |
| `DescargaArchivos` | Crea descargas de blobs/recursos | PDF, visor, Paint |
| `DocumentosSesion` | Sesiones editables de TXT en memoria | Notepad / filesystem |
| `ActividadSistema` | Ventanas, pulsos locales, HTTP y recursos de misma procedencia | Task Manager |
| `ServicioOfertas` | POST de ofertas | Contratar |
| `ServicioTablon` | Lista y publica mensajes | Message Board |
| `AdministracionTablon` | Canje/estado de sesión admin | Message Board |

### 5.6 Actividad y observabilidad local

![Actividad del sistema](arquitectura/renderizados/19-actividad-sistema.png)

`ActividadSistema` combina tres fuentes: el interceptor de `HttpClient`, `PerformanceObserver` para recursos de la misma procedencia y pulsos explícitos de ventanas, juegos, Paint, filesystem e idioma. Conserva como máximo 60 eventos de red finalizados más los activos y 60 eventos locales. Los destacados duran 3 segundos; los pulsos se agrupan con 200 ms de debounce.

Calcula solicitudes, completadas, errores, latencia y estimaciones de bytes subidos/descargados. No guarda URLs de navegación, no envía telemetría y no sondea el host. Task Manager representa ventanas reales de sesión, actividad HTTP, assets y, sólo para endpoints conocidos, el destino de base de datos. No afirma medir CPU, RAM ni procesos de Windows.

## 6. Catálogo completo de aplicaciones y funcionalidades

![Mapa de aplicaciones](arquitectura/renderizados/14-mapa-aplicaciones.png)

### 6.1 Portfolio y lectura

| Aplicación | Comportamiento e implementación | Estado, datos y fallos |
|---|---|---|
| Welcome | Vista inicial y accesos rápidos de recruiter. `applications/welcome` recibe portfolio y solicita aperturas al shell. | Sólo estado de ventana; el contenido procede del snapshot. |
| Sobre mí / System Properties | Pestañas de perfil, tecnologías y contacto. `applications/about`. | Selección local; datos CV; enlaces reales. |
| Experiencia laboral | Explorador con un TXT por experiencia, drag y apertura en lector. `applications/work-experience`. | Entradas registradas en filesystem; contenido del snapshot. |
| Lector de experiencia | Notepad de solo lectura generado por experiencia. `applications/experience-notepad`. | Ventana derivada; no servidor. |
| Formación | Lector Notepad de estudios. `applications/education-notepad`. | Snapshot, sólo lectura. |
| Visor de CV | `applications/pdf-viewer`; iframe/objeto embebido y descarga de PDF español/inglés. | Fallback visible si el visor no carga; ficheros públicos. |

### 6.2 Sistema, creación y archivos

| Aplicación | Comportamiento e implementación | Estado, datos y fallos |
|---|---|---|
| Terminal | `terminal-session.service.ts → SesionTerminal`. Sistema de directorios virtual y comandos `help`, `dir/ls`, `cd`, `pwd`, `whoami`, `hostname`, `ver/uname`, `cls/clear`, `type/cat`, `tree`, `echo`, `history`, `date/time`, `set/env`, vistas honestas de Git, `curl`, `start/open` y `exit`. | Historial/transcript en memoria. `curl` está limitado a recursos admitidos y usa HTTP real; muestra errores sin fingir shell del host. |
| Administrador de tareas | `applications/task-manager`; consume `GestorVentanas` y `ActividadSistema`. Puede enfocar/cerrar ventanas y muestra métricas verificables. | Sesión actual; sin telemetría ni datos inventados. |
| Explorador de carpetas | `applications/folder-explorer`; navegación, creación, renombrado, copia, movimiento, orden y menú contextual. | `SistemaArchivosEscritorio`; valida operaciones y protección. |
| Bloc de notas | `applications/text-notepad`; edición de TXT de usuario mediante sesiones de documento. | Texto persiste al guardar en filesystem virtual; aviso/estado sucio en memoria. |
| Visor de imágenes | `applications/image-viewer`; anterior/siguiente dentro de directorio y descarga. | Entrada virtual o asset; maneja recurso inválido. |
| Paint 98 | Lienzo 800×500; lápiz, pincel, goma, relleno, línea, rectángulo y elipse; paleta y grosores. `paint-session.service.ts → SesionPaint`, `paint-document.service.ts → DocumentosPaint`. | Historial de deshacer/rehacer de 24 estados en memoria; importa blobs, guarda PNG virtual y exporta PNG/BMP de 24 bits. |
| Papelera | `applications/recycle-bin`; restaura, elimina definitivamente o vacía entradas. | Origen persistido en filesystem virtual; confirma acciones destructivas. |
| Mensaje de código fuente | Fallback cuando no se puede abrir el enlace real. `applications/source-code-message`. | Sólo estado de ventana. |

### 6.3 Juegos

| Aplicación | Reglas reales | Ciclo de vida |
|---|---|---|
| Solitario | Klondike de 52 cartas: siete columnas, mazo, descarte y cuatro bases; robar una, redeal, alternancia en tablero, ascenso por palo, click/doble click/drag, automovimiento, undo de 100 y animación de victoria Canvas. | `solitaire-game.service.ts`; partida en memoria, reiniciable y destruida al reset. |
| Buscaminas | Presets 9×9/10, 16×16/40 y 16×30/99; primer clic y vecinos seguros, banderas, expansión, cronómetro, victoria/derrota. | `minesweeper-game.service.ts`; estados ready/playing/won/lost, sólo memoria. |

### 6.4 Red y comunicación

| Aplicación | Comportamiento real | Frontera externa |
|---|---|---|
| Contratar | Wizard compacto con empresa, descripción, nombre y correo, más honeypot oculto. Reactive Forms valida requeridos, máximos y email; `ServicioOfertas` envía JSON. | Backend limita, normaliza y envía correo; no persiste la oferta. |
| Message Board | Conversación pública paginada, publicación y mensaje administrativo permanente #1. Guarda localmente el nombre del autor. Click derecho permite borrar sólo con sesión admin verificada. | SQL Server compartido; cookie admin HttpOnly; errores y rate limit visibles. |
| DRP Explorer | Cliente de navegación controlada: home, web, YouTube, compatibilidad y error. Acepta HTTP/HTTPS sin credenciales, bloquea hosts locales/privados, usa `youtube-nocookie` y abre fuera los destinos incompatibles. | iframe `sandbox`; no proxy, no anonimato, no navegador general con privilegios. |
| LinkedIn | Atajo externo seguro desde el registro. | Nueva navegación fuera de DRP OS. |
| Código fuente | Atajo al repositorio canónico. | GitHub; fallback interno si se bloquea. |

### 6.5 Multimedia

| Aplicación | Comportamiento real | Estado |
|---|---|---|
| Reproductor | Un elemento `Audio` compartido, catálogo de ocho M4A CC0 de HoliznaCC0, playlist, progreso, volumen, mute, shuffle, repetición y visualizador Web Audio/Analyser. | Pista y tiempo en memoria; volumen/mute/shuffle/repeat en `drp-os.audio-player.preferences.v1`. Continúa minimizado; cerrar/reset detiene. |
| Carpeta Música | Vista del directorio virtual de pistas, abre el reproductor. | Catálogo estático + filesystem. |
| Álbum de fotos | Siete PNG públicos, apertura en visor. | Assets estáticos; no subida remota. |

## 7. Comunicación y flujos de información

![Canales reales de comunicación](arquitectura/renderizados/10-comunicacion-capas.png)

No se encontraron WebSockets, service workers, web workers, BroadcastChannel, cola de mensajes, GraphQL, analítica externa ni comunicación entre pestañas. Los canales reales son eventos DOM/Pointer/teclado, outputs y signals Angular, un adaptador entre Paint y filesystem, `localStorage`, cookies, REST/JSON, iframes aislados, JDBC y SMTP.

### 7.1 Contratos HTTP

| Método y ruta | Origen principal | Entrada | Salida / efecto | Error gestionado |
|---|---|---|---|---|
| GET `/health`, `/api/health` | Operación/monitor | Ninguna | Estado UP; comprueba `SELECT 1` | DOWN si DB falla |
| GET `/api/portfolio` | Clientes API/terminal | Ninguna | Portfolio agregado | 404/500 estructurado |
| GET `/api/profile` | Clientes API/terminal | Ninguna | Perfil | 404/500 |
| GET `/api/experiences` | Clientes API/terminal | Ninguna | Experiencias | 500 |
| GET `/api/technologies` | Clientes API/terminal | Ninguna | Tecnologías | 500 |
| GET `/api/competencies` | Clientes API/terminal | Ninguna | Competencias | 500 |
| GET `/api/education` | Clientes API/terminal | Ninguna | Formación | 500 |
| GET `/api/languages` | Clientes API/terminal | Ninguna | Acreditaciones | 500 |
| POST `/api/job-offers` | Contratar | `SolicitudOferta` JSON | 202; correo o aceptación silenciosa del honeypot | 400, 429, 503, 500 |
| GET `/api/message-board/messages?page=&size=` | Message Board | page; size máximo 50 | `PaginaTablonDto` | 400/500 |
| POST `/api/message-board/messages` | Message Board | autor y mensaje | 201 + mensaje | 400/429/500 |
| DELETE `/api/message-board/messages/{id}` | Moderación | cookie o cabecera raíz local | 204 | 403/404/500 |
| POST `/api/message-board/admin/activation` | Script local | Cabecera raíz, sólo loopback directo | Código de un uso con TTL | 403/429 |
| POST `/api/message-board/admin/session` | Navegador público | Código + Origin exacto | Cookie firmada | 400/403/429 |
| GET `/api/message-board/admin/session` | Navegador | Cookie + Origin | Estado de administración | 403/500 |

Todas las excepciones pasan por `controller/ManejadorExcepcionesApi.java` y devuelven `ErrorApi` con timestamp, status, error, mensaje y path, sin filtrar detalles internos. El filtro limita a 16 KiB los cuerpos POST/PUT/PATCH bajo `/api/`; el exceso produce 413.

### 7.2 Flujo Contratar

![Secuencia de oferta](arquitectura/renderizados/16-flujo-oferta.png)

Traza: evento submit → `applications/job-offer/job-offer.ts` normaliza el formulario → `core/services/job-offer.service.ts → ServicioOfertas` resuelve el origen de API y hace POST → `ControladorOfertas` aplica Bean Validation y `LimitadorOfertas` → `ServicioEnvioOferta` trata el honeypot, normaliza y delega → implementación `log` o `ServicioCorreoOfertaSmtp` → `JavaMailSender` con destinatario fijo y `Reply-To` validado. La solicitud se descarta después; no hay repositorio ni tabla de ofertas.

### 7.3 Flujo Message Board

![Secuencia del tablón](arquitectura/renderizados/17-flujo-tablon.png)

Traza de lectura: apertura → `message-board.ts` → `ServicioTablon` Angular → GET paginado → `ControladorTablon.messages()` → `ServicioTablon.messages()` → `RepositorioMensajes` → DTO UTC → vista. Los mensajes se consultan descendentes y se vuelven a ordenar dentro de la página; el administrativo permanente se presenta de forma estable.

Traza de escritura: submit → validación de UI → POST con credenciales → límite por dirección derivada → validación servidor → entidad JPA → SQL Server → 201 → inserción/recarga de UI. El contenido se interpola como texto; no se renderiza HTML del visitante.

### 7.4 Flujo administrativo

![Sesión administrativa](arquitectura/renderizados/18-sesion-admin.png)

Un script local lee la clave raíz desde entorno y llama a `/activation`. El servidor sólo acepta una conexión remota directa de loopback, sin cabeceras forwarded/Cloudflare, y guarda únicamente SHA-256 del código aleatorio de 32 bytes durante dos minutos. El navegador canjea el código desde un Origin permitido. El servidor lo consume una vez y emite token HMAC SHA-256 v1 en cookie HttpOnly, Secure en producción, SameSite=Strict, path `/api/message-board`, con duración predeterminada de 30 días. Cada DELETE revalida origen y sesión; el mensaje #1 no es borrable. Rotar la clave invalida tokens previos.

### 7.5 Flujo de Paint y filesystem

Pointer event → componente Paint → `SesionPaint` muta `ImageData` y registra historial → comando Guardar → `DocumentosPaint` codifica PNG → `SistemaArchivosEscritorio` crea/actualiza una entrada de imagen Data URL → `localStorage` v6. Abrir esa entrada invierte la ruta: asociación → visor o Paint → decodificación de Blob/ImageBitmap → lienzo. Exportar crea una descarga; BMP se codifica en cliente como bitmap de 24 bits.

### 7.6 Flujo de ventana y tarea

Icono/Inicio/terminal → shell resuelve ID en el registro → `GestorVentanas.abrir` crea o enfoca → signal actualiza escritorio y taskbar → `window-frame` emite Pointer Events → gestor mueve/redimensiona dentro del workspace. Task Manager lee la misma fuente; cerrar desde él llama al mismo gestor. No hay rutas alternativas de ciclo de vida por aplicación.

## 8. Persistencia y datos

![Arquitectura de persistencia](arquitectura/renderizados/07-persistencia.png)

### 8.1 Matriz de persistencia

| Dato | Origen | Dónde vive | Escribe / lee | Duración | Compartido |
|---|---|---|---|---|---|
| Portfolio mostrado | `portfolio.json` | Asset + memoria Angular | Build / `ServicioPortfolio` | Versión desplegada / pestaña | Sí, estático |
| Ventanas y z-index | Interacción | Memoria Angular | `GestorVentanas` / shell | Pestaña o reset | No |
| Partidas | Interacción | Memoria | Servicios de juego | Pestaña, cierre/reinicio según servicio | No |
| Terminal | Comandos | Memoria | `SesionTerminal` | Pestaña/reset | No |
| Paint e historial | Canvas | Memoria | `SesionPaint` | Pestaña/reset | No |
| Documento TXT en edición | Teclado | Memoria hasta guardar | `DocumentosSesion` | Sesión; al guardar pasa a filesystem | No |
| Filesystem virtual | Usuario + sistema | `localStorage`, v6 | `SistemaArchivosEscritorio` | Entre recargas hasta reset/borrado | No, por navegador |
| Posiciones de iconos | Drag | `localStorage`, v3 | `DistribucionEscritorio` | Entre recargas hasta reset | No |
| Idioma | Selector | `localStorage`, v1 | `Localizacion` | Entre sesiones | No |
| Preferencias audio | Controles | `localStorage`, v1 | Servicio reproductor | Entre sesiones | No |
| Pista/tiempo audio | Reproducción | Memoria + `Audio` | Servicio reproductor | Pestaña; cierre/reset detiene | No |
| Autor del tablón | Campo autor | `localStorage`, v1 | Message Board | Entre sesiones | No |
| Código activación admin | Script | Hash en memoria backend | Servicio sesión | 2 min o primer uso | No |
| Sesión admin | Canje | Cookie firmada + clave servidor | Backend / navegador | 30 días predeterminado | Sólo ese navegador |
| Rate limits | IP resumida | Memoria backend | Limitadores | Ventana fija; se pierde al reiniciar | Efecto por cliente |
| Perfil estructurado | Seed CV | SQL Server | carga/ServicioPortfolio | Persistente | Sí, lectura global |
| Mensajes públicos | Visitantes/admin | SQL Server | ServicioTablon | Hasta moderación; #1 permanente | Sí |
| Oferta laboral | Recruiter | Sólo tránsito/memoria | ServicioEnvioOferta | Hasta terminar envío | No se persiste |
| Correo entregado | Oferta | Proveedor/cuenta receptora | SMTP | Política externa no auditada | Privado |
| Logs | Procesos/scripts | Archivos locales fuera de Git | Spring/scripts | Según operación local | No público |
| Backup SQL | Operación | `.bak` fuera de Git | script/SQL Server | Hasta rotación manual | No público |

### 8.2 Modelo relacional

![Modelo lógico de datos](arquitectura/renderizados/09-modelo-datos.png)

Se observaron diez tablas en SQL Server. `CargaDatosPortfolio` inserta de forma idempotente 1 perfil, 2 experiencias, 6 responsabilidades, 8 tecnologías, 12 competencias, 9 enlaces experiencia-tecnología, 12 enlaces experiencia-competencia, 2 formaciones y 1 acreditación de idioma. El tablón contenía 2 mensajes durante la auditoría; esa cifra es variable.

| Tabla | Papel | Relaciones / restricciones relevantes |
|---|---|---|
| `profiles` | Perfil único | PK; leído por `RepositorioPerfil` |
| `experiences` | Experiencias | PK; raíz de responsabilidades y N:M |
| `experience_responsibilities` | Descripciones por experiencia | FK a experiencia; 1:N |
| `technologies` | Catálogo explícito del CV | PK; nombre único |
| `experience_technologies` | Evidencia de tecnología por experiencia | PK compuesta; N:M |
| `competencies` | Competencias derivadas con evidencia | PK; nombre único |
| `experience_competencies` | Evidencia por experiencia | PK compuesta; N:M |
| `education` | Formación | PK |
| `language_qualifications` | Acreditaciones | PK |
| `message_board_messages` | Mensajes globales | Identidad; autor ≤60 y cuerpo ≤1000 caracteres |

Hay siete repositorios Spring Data. Las entidades nunca se exponen directamente: `ServicioPortfolio` y `ServicioTablon` mapean a DTO. `backend/src/main/resources/schema.sql` crea sólo el tablón idempotentemente; en desarrollo Hibernate `ddl-auto=update` materializa el resto y en producción `ddl-auto=validate` exige que el esquema ya coincida.

## 9. Backend Spring Boot

![Arquitectura backend](arquitectura/renderizados/08-arquitectura-backend.png)

### 9.1 Entrada y capas

`backend/src/main/java/com/danielramon/portfolio/AplicacionPortfolio.java → AplicacionPortfolio.main()` arranca Java 21 y Spring Boot 4.1.1 con Tomcat embebido. La organización es convencional:

- `controller`: cinco controladores, consejo global de errores y DTO de error.
- `service`: casos de uso, correo, rate limit, resolución de cliente y sesión admin.
- `repository`: siete interfaces Spring Data JPA.
- `domain`: ocho entidades y dos enums de categoría.
- `dto`: contratos REST; records y enums de entrada/salida.
- `config`: CORS, filtro HTTP, properties, seeds de portfolio y tablón.

### 9.2 Portfolio

`ServicioPortfolio` trabaja en transacciones de sólo lectura, consulta repositorios y forma DTO. Las tecnologías se etiquetan `EXPLICIT`; las competencias `DERIVED` conservan una frase concreta de evidencia. `CargaDatosPortfolio` debe modificarse sólo después de contrastar `docs/CV.pdf`. El frontend público no depende de estas rutas durante el arranque; `frontend/public/data/portfolio.json` es el snapshot de disponibilidad offline que debe mantenerse sincronizado.

### 9.3 Ofertas

`ControladorOfertas` valida `SolicitudOferta`, resuelve cliente y aplica `LimitadorOfertas` (3 intentos/15 minutos por defecto). El honeypot `website` produce 202 sin enviar. `ServicioEnvioOferta` normaliza; el modo por defecto es `log`, y `smtp` usa `ServicioCorreoOfertaSmtp`. From/To son configuración fija del servidor; sólo el correo validado del recruiter se usa como Reply-To. Timeouts SMTP: 5 s. No hay tabla de ofertas.

### 9.4 Tablón y administración

`LimitadorTablon` permite 5 publicaciones/10 minutos por defecto; administración, 8 canjes/5 minutos. `LimitadorPeticionesEnMemoria` resume la IP con SHA-256, usa ventanas fijas concurrentes y limpia cada 128 operaciones. No es distribuido ni persistente: un reinicio borra contadores.

`ResolutorDireccionCliente` sólo confía en `CF-Connecting-IP` cuando la conexión inmediata llega desde loopback y el valor es una IP literal. Así el túnel puede transportar la dirección de visitante sin aceptar cabeceras falsificadas en conexiones directas ajenas.

### 9.5 Seguridad HTTP y errores

`FiltroSeguridadApi` añade `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP de API `default-src 'none'`, política no-referrer, Permissions Policy y CORP same-site; añade HSTS cuando la solicitud es segura y `no-store` a administración. `ConfiguracionWebCors` aplica CORS sólo a `/api/**`, con orígenes HTTP/HTTPS explícitos validados, credenciales, GET/POST/DELETE, Content-Type y max-age 3600.

El manejo de errores cubre validación, recurso inexistente, límites, moderación, correo y fallos inesperados. Los fallos de recursos del frontend tienen estados visibles o fallback en las aplicaciones principales. No existe un sistema externo de alertas, trazas distribuidas o reintento persistente. Los timeouts de red se heredan de cliente/servidor salvo los SMTP configurados; la caída del backend no impide cargar el escritorio, pero sí Contratar, Message Board y comandos de terminal que consultan API.

## 10. Infraestructura, red y operación

![Infraestructura](arquitectura/renderizados/11-infraestructura.png)

### 10.1 Cloudflare

Se descubrieron dos productos con responsabilidades distintas:

- **Pages — CONFIRMADO por configuración/documentación y prueba pública:** sirve el frontend estático. `PRODUCTION_SETUP.md` documenta proyecto `drp-os`, rama `main`, raíz `frontend`, `pnpm build`, salida `dist/frontend/browser` y Node 22.22.3. El dominio público respondió con la aplicación. El panel privado y sus valores exactos no se inspeccionaron.
- **Tunnel — CONFIRMADO en servicio/proceso y endpoint público:** el servicio Windows `Cloudflared` estaba Running/Automatic. `cloudflare/config.example.yml` describe `api.danielramonperez.com → http://127.0.0.1:8080` y fallback 404. No hay credenciales reales en Git; no apareció un `config.yml` de usuario, coherente con un túnel administrado por token.

`frontend/public/runtime-config.js` publica únicamente la URL HTTPS de la API. El resolver exige origen HTTPS sin credenciales, path, query ni fragment. En desarrollo, el host local usa `/api` del mismo origen y el proxy Angular.

### 10.2 Host local y SQL Server

Durante la auditoría se observaron `127.0.0.1:8080` atendido por Java y `127.0.0.1:1433` por Docker; no había servidor Angular en 4200. Docker Engine informó 29.7.2. El contenedor SQL Server 2022 Express llevaba dos días healthy y reportó motor 16.0.4265.3. El volumen Express actual y un volumen Developer anterior preservado coexistían; no se eliminó ninguno.

`docker-compose.yml` publica SQL sólo en loopback, usa imagen `mcr.microsoft.com/mssql/server:2022-latest`, edición Express, healthcheck con `sqlcmd`, volumen persistente y un contenedor one-shot de inicialización. La API también se liga a loopback en producción. Por diseño, el router no necesita exponer 8080 ni 1433.

### 10.3 Variables, secretos, logs y backups

`.env.example` enumera configuración de base de datos, CORS, correo y administración. El `.env` local fue comprobado sólo por presencia de variables requeridas; no se copiaron valores. Credenciales SMTP, destinatario, clave raíz, token de túnel y JSON de credenciales quedan fuera de Git. Los logs operativos y backups `.bak` también están fuera del repositorio. No se verificó una rotación automática ni un destino externo de backups.

### 10.4 Scripts operativos

| Script | Responsabilidad real |
|---|---|
| `activate-message-board-admin.ps1` | Genera activación local de un uso y abre/produce enlace de canje. |
| `backup-database.ps1` | Crea backup SQL antes de operaciones sensibles. |
| `configure-message-board.ps1` | Configura clave/variables del tablón. |
| `configure-resend-smtp.ps1` | Configura Resend como SMTP sin versionar secretos. |
| `install-cloudflare-service.ps1` | Instala/configura `cloudflared` como servicio Windows. |
| `install-production-startup.ps1` | Instala arranque de servicios tras inicio de sesión. |
| `migrate-to-sql-express.ps1` | Migra Developer → Express con backup/verificación. |
| `remove-message-board-message.ps1` | Moderación local autenticada. |
| `repair-docker.ps1` | Diagnóstico/reparación operativa de Docker. |
| `rotate-database-password.ps1` | Rotación coordinada de contraseña SQL. |
| `run-backend-production.ps1` | Ejecuta JAR con perfil producción y entorno. |
| `run-backend.ps1` | Backend de desarrollo. |
| `run-frontend.ps1` | Frontend de desarrollo. |
| `start-portfolio.ps1` | Arranque local combinado. |
| `start-production-services.ps1` | Asegura SQL y backend de producción. |
| `stop-local-services.ps1` | Detiene servicios de desarrollo/locales controlados. |

## 11. Build, pruebas y despliegue

![Flujo de despliegue](arquitectura/renderizados/12-despliegue.png)

### 11.1 Toolchain real

| Área | Tecnología / versión declarada | Papel |
|---|---|---|
| Lenguajes web | TypeScript ~6.0.2, HTML, SCSS | Lógica, plantillas, estilo |
| Framework frontend | Angular 22.1.x; RxJS 7.8 | Componentes, DI, HttpClient, signals/reactividad |
| Build frontend | Angular CLI/Build 22.1.2, pnpm 11.19, Node 22.22.3 | Compilación y dependencias |
| Calidad frontend | ESLint 10.6, angular-eslint 22.1, Vitest 4, jsdom 28, Prettier 3.8 | Lint, pruebas DOM y formato |
| Lenguaje backend | Java 21 | Runtime servidor |
| Framework backend | Spring Boot 4.1.1, MVC, Validation, Data JPA, Mail | REST, validación, datos y correo |
| Servidor | Tomcat embebido, override 11.0.25 | HTTP local |
| Persistencia | Hibernate/JPA, Microsoft JDBC, SQL Server 2022 Express | ORM, conexión y datos |
| Pruebas backend | JUnit / Spring Boot Test, H2 sólo test | Verificación aislada |
| Infraestructura | Docker Compose, Cloudflare Pages/Tunnel, PowerShell | SQL, edge y operación |
| Externos | GitHub, Resend SMTP | Código y correo |
| Browser APIs | Pointer, Canvas, Audio/Web Audio, iframe, Performance, Storage, Blob/FileReader/ImageBitmap | Experiencia desktop y utilidades |

![Stack por responsabilidad](arquitectura/renderizados/13-stack.png)

### 11.2 Evidencia de build

- `pnpm lint`: aprobado.
- `pnpm test:ci`: 26 ficheros, 154 pruebas, todas aprobadas.
- `pnpm build`: aprobado. Avisos no bloqueantes: bundle inicial 703,16 kB frente a budget warning de 500 kB (transferencia estimada 155,20 kB) y `pixel-icon.scss` 10,87 kB frente a 9 kB.
- `mvn test` incremental en el árbol vivo: falló antes de ejecutar pruebas por una clase compilada obsoleta en `target`, no por el fuente actual.
- `mvn clean package` en el árbol vivo: no pudo limpiar el JAR porque el proceso Java de producción lo mantenía bloqueado.
- Copia limpia y aislada del mismo fuente, sin `target`: `mvn clean package` aprobado; 14 suites, 44 pruebas, cero fallos/errores; JAR de 54.026.323 bytes.

La conclusión es que el fuente actual compila y prueba limpio; el directorio `target` compartido con la producción no es un entorno de build fiable mientras el JAR esté en uso.

### 11.3 CI/CD real

El flujo confirmado es cambio local → controles locales → commit → push a `main`. `.github/dependabot.yml` programa revisiones semanales npm, Maven y Docker con agrupación de actualizaciones menores/parches. No se encontró `.github/workflows`: no hay GitHub Actions versionada.

El despliegue automático de Pages tras push está documentado y el sitio público está operativo, pero el trigger/panel no pudo verificarse directamente. El backend no forma parte del despliegue de Pages: se empaqueta y arranca por scripts/Startup en el PC local. No se encontró blue/green, orquestador, rollback automatizado ni despliegue automático versionado del JAR. La recuperación es operacional: construir artefacto, reiniciar servicios y restaurar backup/volumen si procede.

### 11.4 Deriva observada en runtime

El JAR vivo había arrancado el 5 de septiembre y sus logs identificaban la clase histórica `PortfolioApplication` y Tomcat 11.0.22, mientras el fuente actual contiene `AplicacionPortfolio` y fija 11.0.25. Varias rutas pequeñas respondieron, pero `/api/portfolio`, `/api/experiences`, `/api/technologies` y `/api/competencies` agotaron timeouts de 5–8 s. El log de error contenía `NoClassDefFoundError` para `ch/qos/logback/classic/spi/ThrowableProxy` y avisos Hikari tras pausas largas/conexiones cerradas.

Esto confirma **deriva entre producción local y HEAD** y un problema operativo de observabilidad/conexión en el proceso vivo; no invalida el build aislado. No se reinició producción durante la auditoría para evitar una mutación no solicitada. Acción recomendada: ventana de mantenimiento, backup verificado, detener JAR, build limpio, desplegar artefacto actual, reiniciar, probar las 16 combinaciones método/ruta y revisar el classpath/logback.

## 12. Seguridad y fronteras de confianza

![Fronteras de seguridad](arquitectura/renderizados/20-fronteras-seguridad.png)

| Frontera / entrada | Riesgo | Controles confirmados | Riesgo residual |
|---|---|---|---|
| Campos de oferta | abuso, inyección, spam | Reactive Forms + Bean Validation, máximos, honeypot, rate limit, normalización, Reply-To validado | Límite en memoria reinicia; entrega depende de SMTP |
| Mensajes públicos | HTML/abuso/volumen | validación, límites 60/1000, render de texto, rate limit | moderación manual; no antispam distribuido |
| URLs de Explorer | navegación peligrosa | protocolos limitados, sin credenciales, bloqueo local/privado, sandbox, salidas compatibles | contenido externo conserva sus propios riesgos |
| Cuerpos API | payload excesivo | buffer máximo 16 KiB, 413 | GET/query dependen de límites de framework |
| CORS/cookie | uso desde origen ajeno | allowlist validada, credenciales, Origin exacto, SameSite Strict, Secure, HttpOnly | configuración incorrecta del entorno podría bloquear o ampliar origen |
| Administración | robo de clave o enlace | clave sólo local, loopback directo, código hash un uso/2 min, HMAC, comparación constante, mensaje #1 protegido | token vive hasta expiración/rotación |
| Dirección cliente | spoofing | sólo confía CF header tras conexión loopback | depende de que 8080 permanezca privado |
| Base de datos | exposición/red | puerto loopback, credenciales fuera de Git, contenedor | host Windows y backups son frontera privilegiada |
| Assets/iframe | ejecución externa | CSP Pages, sandbox, `youtube-nocookie`, cabeceras | disponibilidad de terceros |
| Secretos | filtración | `.env`/credenciales/tokens fuera de Git; frontend sólo contiene config pública | gestión y rotación externas no auditadas |

No se encontró autenticación general, cuentas de visitante ni panel admin. Eso es coherente con el alcance: sólo la moderación tiene autorización. Tampoco se encontró analytics o telemetría remota. Las cabeceras de `frontend/public/_headers` fijan CSP, HSTS y políticas de recurso; `index.html` y `runtime-config.js` evitan cache prolongada para permitir despliegues consistentes.

## 13. Estructura y mapa de dependencias

![Mapa de dependencias](arquitectura/renderizados/15-dependencias.png)

### 13.1 Árbol útil generado desde Git

{{ARBOL_GENERADO}}

Responsabilidades: `frontend` contiene la SPA, pruebas y recursos; `backend` contiene API, persistencia y pruebas; `scripts` operación Windows/SQL/túnel; `cloudflare` plantilla segura de ingress; `docs` CV, operación y este dosier; `.github` Dependabot; la raíz contiene Compose, configuración compartida y guías. `tmp`, `target`, `dist`, dependencias descargadas, logs, backups y secretos no forman parte del producto versionado.

### 13.2 Dependencias centrales

- `desktop-applications.ts` configura qué puede abrir el shell.
- `Escritorio` orquesta todos los componentes y delega el ciclo de vida a `GestorVentanas`.
- `SistemaArchivosEscritorio` une exploradores, Notepad, Paint, visor, música, álbum y papelera.
- `ActividadSistema` une HttpClient, ventanas y pulsos locales con Task Manager.
- `Localizacion` alimenta shell y aplicaciones sin cambiar contratos externos.
- El resolver de API une Contratar, Tablón, Terminal y administración con Spring a través del runtime config.
- Spring separa controladores → servicios → repositorios → entidades/SQL; correo sale por una interfaz con implementaciones log/SMTP.

No hay importación directa de entidades JPA al frontend, ni dependencia del bootstrap respecto de la API. El snapshot estático y el seed SQL son dos representaciones intencionadas del mismo dominio profesional y requieren sincronización disciplinada.

## 14. Fallos, degradación y recuperación

| Fallo | Comportamiento actual | Recuperación / límite |
|---|---|---|
| Snapshot no carga | Estado raíz de error y reintento; no monta escritorio incompleto | Reintentar o corregir despliegue del asset |
| Backend caído | Escritorio/CV/juegos/archivos locales siguen; red falla con mensajes | Restaurar Java/SQL/Tunnel |
| SQL caído | Health DOWN; portfolio API/tablero fallan; correo puede seguir | Recuperar contenedor/volumen; revisar Hikari |
| SMTP falla | 503 específico; oferta no se guarda | Reintentar tras restablecer proveedor |
| Rate limit | 429 estructurado | Esperar ventana fija; reinicio del backend borra contadores |
| Publicación inválida | 400 con validación | Corregir campo; servidor conserva autoridad |
| Sesión admin inválida | 403; no se borra | Nueva activación local |
| Mensaje #1 | Borrado rechazado | Protección deliberada |
| URL insegura Explorer | Vista error/compatibilidad o apertura externa controlada | Usar URL pública compatible |
| Asset multimedia/PDF | Fallback o error visible según app | Descargar/abrir fuera; corregir asset |
| Cuota/corrupción localStorage | Operaciones capturan estados inválidos y migran esquemas conocidos; la cuota del navegador puede impedir persistencia | Reset de escritorio/almacenamiento; no hay sync remoto |
| Build con `target` bloqueado | Maven clean falla | Detener proceso en mantenimiento o construir en workspace aislado |
| Logs runtime incompatibles | Error de logging observado | Desplegar JAR limpio y verificar dependencias |

Ausencias relevantes: no hay retry con backoff global, circuit breaker, cola offline, réplica SQL, health externo versionado, alerta automática, migrador como Flyway/Liquibase ni rollback de backend automatizado. Estas ausencias no implican un defecto por sí mismas, pero delimitan la resiliencia operativa.

## 15. Guía “si quieres cambiar X”

| Quiero modificar… | Empieza por… | También afecta a… |
|---|---|---|
| Añadir una aplicación | `desktop/config/desktop-applications.ts` + `applications/` | shell, icono, taskbar, Inicio, tests |
| Cambiar ventanas | `desktop/services/window-manager.service.ts` | `window-frame`, shell, taskbar, móvil |
| Cambiar iconos/layout | `desktop-layout.service.ts`, `desktop-icon` | migración de clave v3, reset, 640 px |
| Cambiar filesystem | `desktop-file-system.service.ts` | versión/migración v6, exploradores, Paint, Notepad, papelera |
| Cambiar datos profesionales | `docs/CV.pdf` primero | seed Java, snapshot JSON, CV público, tests |
| Cambiar URL de repositorio | `source-code.config.ts` | atajo y fallback; no duplicar URL |
| Cambiar API pública | `frontend/public/runtime-config.js` | CORS y DNS/Tunnel; nunca secretos |
| Añadir endpoint | controlador + DTO + servicio | filtro 16 KiB, CORS, error, interceptor, tests |
| Cambiar esquema portfolio | entidades/repositorios/seed | SQL producción `validate`, snapshot, backup/migración |
| Cambiar tablón | `ServicioTablon` Java/Angular | DTO, repositorio, límites, protección #1, tests |
| Cambiar admin | `ServicioSesionAdministracionTablon` | scripts, properties, cookie/CORS, rotación |
| Cambiar ofertas | `SolicitudOferta`, `ControladorOfertas`, `ServicioEnvioOferta` | formulario, SMTP, límites; no persistir |
| Cambiar Task Manager | `ActividadSistema` | interceptor, contextos y fuentes reales únicamente |
| Cambiar Terminal | `terminal-session.service.ts` | whitelist HTTP, filesystem/app IDs, tests |
| Cambiar Paint | servicios session/document | Canvas, filesystem, exportadores y memoria |
| Cambiar juegos | servicio del juego | componente, reset y tests de reglas |
| Cambiar audio | catálogo + servicio | assets M4A, localStorage v1, AudioContext |
| Cambiar despliegue frontend | `frontend/package.json`, `angular.json`, `PRODUCTION_SETUP.md` | Pages/output/Node, runtime config |
| Cambiar backend productivo | `pom.xml`, properties prod, scripts | JAR, Startup, Tunnel, health, ventana de mantenimiento |
| Cambiar SQL/Docker | `docker-compose.yml`, init y scripts | backup, volúmenes, datasource, migración |

## 16. Hechos confirmados, inferencias y desconocidos

### Confirmado

La arquitectura Angular/Spring/SQL; el inventario de aplicaciones y rutas; claves de almacenamiento; contratos; controles; scripts; dependencias; build limpio aislado; pruebas; contenedor SQL; tablas; bindings loopback; servicio Tunnel; sitio público; parte de la API; enlaces externos; Message Board permanente; ausencia de errores de consola en el recorrido; ausencia de WebSocket/workers/analytics; repositorio canónico.

### Inferido con evidencia

Que el proyecto Pages se despliega automáticamente en cada push a `main`, porque está documentado y el sitio refleja el proyecto, aunque no se inspeccionó el panel. Que el túnel usa configuración remota/token, por servicio activo y ausencia de config local. Que Resend es el proveedor SMTP efectivo, por configuración local verificada sólo por nombres/presencia y scripts, sin consultar su panel ni enviar correo.

### No confirmado

Valores y políticas del panel Cloudflare; detalles DNS completos; retención de logs de proveedor; cuotas y entrega histórica de Resend; automatización/retención externa de backups; monitorización desde fuera; RPO/RTO; políticas del host; que el JAR vivo se haya desplegado desde el commit auditado. De hecho, la evidencia indica que el JAR vivo es anterior.

## 17. Recomendaciones priorizadas

1. **P0 operacional:** desplegar en mantenimiento el JAR construido limpio desde HEAD, verificar classpath/logback y ejecutar smoke test de las 16 combinaciones método/ruta. Antes, backup SQL validado.
2. **P1 observabilidad:** añadir health externo y alerta, rotación/retención explícita de logs y runbook de diagnóstico Tunnel → Java → Hikari → SQL.
3. **P1 reproducibilidad:** evitar construir en el mismo `target` del JAR vivo; usar directorio de release versionado o pipeline separado y conservar artefacto/hash.
4. **P1 datos:** introducir migraciones versionadas (Flyway/Liquibase o equivalente) antes de cambios de esquema; `ddl=validate` no migra.
5. **P2 frontend:** revisar el budget del bundle y dividir dependencias/aplicaciones si el coste medido lo justifica; corregir o justificar el budget de `pixel-icon.scss`.
6. **P2 despliegue:** versionar un pipeline de verificación para frontend y backend; mantener el deploy del backend como aprobación manual si se desea preservar control local.
7. **P2 backups:** documentar calendario, retención, cifrado, ubicación externa y prueba de restauración; no eliminar el volumen Developer hasta aprobación explícita.
8. **P3 consistencia:** automatizar la comparación entre CV, snapshot y seed sin convertir el backend en dependencia de carga.

## 18. Contexto técnico para continuar DRP OS con otra IA

DRP OS es una SPA Angular 22 standalone que simula un escritorio clásico. No la conviertas en landing page. `main.ts` arranca `Aplicacion`, que carga `frontend/public/data/portfolio.json`; la carga pública debe funcionar sin backend. `Escritorio` orquesta y `GestorVentanas` es el único dueño del ciclo de ventanas. El registro está en `desktop-applications.ts`. `SistemaArchivosEscritorio` mantiene un filesystem `localStorage` v6 con migraciones; `DistribucionEscritorio`, layout v3. A ≤640 px no hay drag.

Hay 18 iconos visibles y 24 IDs. Las aplicaciones están en `frontend/src/app/applications`. Paint, juegos, Terminal, audio, Explorer y Task Manager tienen servicios con estado de sesión. Las asociaciones de archivos pasan por el filesystem; Task Manager sólo muestra datos medibles. La API se resuelve desde `runtime-config.js`; nunca pongas secretos en frontend.

El backend es Java 21/Spring Boot 4.1, capas controller/service/repository/domain/dto/config. Tiene portfolio read-only, health, ofertas sin persistencia, tablón persistente y administración de moderación. SQL Server Express vive en Docker/loopback. La API vive en loopback y Cloudflare Tunnel la publica. Pages sirve el frontend. SMTP envía ofertas. DTO, Bean Validation, CORS, filtro 16 KiB, rate limits y manejador global delimitan la frontera.

`docs/CV.pdf` es la única fuente de hechos profesionales; sincroniza byte a byte `frontend/public/CV.pdf` cuando cambie. Actualiza snapshot y `CargaDatosPortfolio` sólo con evidencia CV; tecnologías EXPLICIT, competencias DERIVED con evidencia. Identificadores propios en español ASCII; copia visible en español correcto. No expongas secretos ni puertos por router. No borres el volumen Developer preservado sin aprobación.

Antes de entregar cambios: lint, 154+ pruebas frontend, build Angular, tests y package Maven en entorno limpio; ejercicio de aplicaciones/ventanas/layout/móvil y comprobación CV. El runtime observado el 7-09-2026 estaba desfasado respecto de HEAD: no asumas que producción ejecuta el último fuente.

## 19. Glosario

| Término | Explicación en este proyecto |
|---|---|
| SPA | Aplicación web cargada como una sola interfaz; aquí contiene el escritorio completo. |
| Standalone component | Componente Angular que declara directamente sus dependencias, sin NgModule de aplicación. |
| Signal | Contenedor reactivo Angular usado para estado de UI y derivados. |
| Shell | `Escritorio`: marco que compone fondo, iconos, ventanas, taskbar e Inicio. |
| Ventana virtual | Objeto Angular con geometría/estado; no es ventana nativa de Windows. |
| Filesystem virtual | Árbol serializado en el navegador; no tiene acceso general al disco. |
| Snapshot | `portfolio.json`, copia versionada que desacopla el portfolio del backend. |
| DTO | Contrato de entrada/salida REST separado de la entidad SQL. |
| JPA/Hibernate | Abstracción ORM que mapea entidades Java a SQL Server. |
| Loopback | Interfaz sólo local (`127.0.0.1`); no acepta red externa directamente. |
| Tunnel | Conexión saliente de `cloudflared` que publica la API sin abrir el router. |
| Pages | Hosting estático de Cloudflare para Angular y assets. |
| Runtime config | JavaScript público que decide el origen de API tras construir el bundle. |
| Honeypot | Campo oculto que hace aceptar silenciosamente bots sin enviar correo. |
| Rate limit | Contador temporal por cliente que reduce abuso; aquí vive en memoria. |
| HMAC | Firma con clave servidor para detectar alteración de la sesión admin. |
| HttpOnly | Cookie no legible por JavaScript, pero enviada automáticamente al API. |
| SameSite=Strict | Cookie restringida a navegación del mismo sitio. |
| CSP | Política del navegador que restringe orígenes de scripts, frames y recursos. |
| Seed | Carga idempotente de datos iniciales verificados y mensaje permanente. |
| Deriva de runtime | Producción ejecuta un artefacto diferente del fuente actual. |

## 20. Apéndice de cobertura

| Elemento descubierto | Tipo | Sección principal |
|---|---|---|
| Bootstrap, snapshot y fallback | Ciclo de vida | 4 |
| Shell, registro, ventanas y layout | Frontend central | 5 |
| Filesystem, asociaciones y migraciones | Persistencia cliente | 5.4 / 8 |
| 18 aplicaciones visibles y 6 IDs auxiliares | Funcionalidad | 6 |
| ActividadSistema e interceptor | Subsistema invisible | 5.6 |
| REST, eventos, signals, iframes, JDBC, SMTP | Comunicación | 7 |
| 15 definiciones de endpoint, 16 combinaciones método/ruta | API | 7.1 |
| localStorage, memoria, cookie, SQL, archivos y tránsito | Persistencia | 8 |
| 10 tablas, entidades, DTO y repositorios | Datos | 8.2 / 9 |
| Validación, correo, rate limits y administración | Backend | 9 |
| Pages, Tunnel, host Windows, Docker, SQL, Resend, GitHub | Infraestructura | 10 |
| 16 scripts PowerShell | Automatización/operación | 10.4 |
| Toolchain, pruebas, Dependabot y despliegue | Build/CI/CD | 11 |
| Deriva del JAR y fallos observados | Riesgo operativo | 11.4 / 14 |
| CORS, CSP, cookies, loopback, secretos | Seguridad | 12 |
| Árbol y dependencias internas | Repositorio | 13 |
| Fallbacks y ausencias de resiliencia | Errores | 14 |
| Guía de cambios | Mantenimiento | 15 |
| Confirmado/inferido/desconocido | Trazabilidad | 16 |
| Recomendaciones | Evolución | 17 |
| Contexto para otra IA | Onboarding | 18 |
| Símbolos TypeScript/Java | Inventario técnico | Apéndice C |

## Apéndice A. Evidencia de validación

| Comprobación | Resultado |
|---|---|
| Git remoto y rama | Canónico `Dani-Moriarty/drp-os`, `main` |
| Frontend lint | Aprobado |
| Frontend tests | 154/154 |
| Frontend build | Aprobado con dos warnings de budget documentados |
| Backend package limpio | 44/44 pruebas; JAR generado |
| Sitio público | Carga, 18 iconos, Welcome y ventanas principales |
| Enlaces externos | LinkedIn y GitHub presentes con destinos reales |
| Message Board | Mensaje permanente #1 cargado |
| Interacciones | Terminal help, juegos y apertura por teclado/doble clic |
| Vista móvil | 390×844, sin overflow horizontal del documento |
| Consola browser | Sin errores/avisos durante recorrido final |
| API pública | Health, tablón, perfil, formación e idiomas respondieron; cuatro rutas agotaron timeout |
| Puertos | Java 8080 y SQL 1433 sólo loopback; 4200 ausente |
| Docker/SQL | Contenedor healthy; versión/tablas/filas inventariadas |
| Secretos | Sólo nombres/presencia; ningún valor incorporado |
| Fuentes/render | 20 JSON fuente + 20 PNG a 2400×1350 |

## Apéndice B. Archivos de referencia rápida

| Propósito | Archivo |
|---|---|
| Entry frontend | `frontend/src/main.ts` |
| Providers | `frontend/src/app/app.config.ts` |
| Raíz | `frontend/src/app/app.ts` |
| Shell | `frontend/src/app/desktop/components/desktop-shell/desktop-shell.ts` |
| Registro apps | `frontend/src/app/desktop/config/desktop-applications.ts` |
| Ventanas | `frontend/src/app/desktop/services/window-manager.service.ts` |
| Filesystem | `frontend/src/app/desktop/services/desktop-file-system.service.ts` |
| Layout | `frontend/src/app/desktop/services/desktop-layout.service.ts` |
| API config | `frontend/src/app/core/config/api.config.ts` |
| Actividad | `frontend/src/app/core/system-activity/system-activity.service.ts` |
| Entry backend | `backend/src/main/java/com/danielramon/portfolio/AplicacionPortfolio.java` |
| REST | `backend/src/main/java/com/danielramon/portfolio/controller` |
| Casos de uso | `backend/src/main/java/com/danielramon/portfolio/service` |
| Datos | `backend/src/main/java/com/danielramon/portfolio/domain` |
| Seed CV | `backend/src/main/java/com/danielramon/portfolio/config/CargaDatosPortfolio.java` |
| Seguridad API | `backend/src/main/java/com/danielramon/portfolio/config/FiltroSeguridadApi.java` |
| Compose | `docker-compose.yml` |
| Tunnel ejemplo | `cloudflare/config.example.yml` |
| Operación | `scripts/` |

{{INVENTARIO_SIMBOLOS}}

## Apéndice D. Índice de diagramas

1. Mapa maestro de DRP OS.
2. Dónde se ejecuta cada componente.
3. Secuencia real de carga inicial.
4. Arquitectura del frontend Angular.
5. Estados y transiciones de una ventana.
6. Sistema de archivos virtual y asociaciones.
7. Arquitectura de persistencia.
8. Arquitectura del backend Spring Boot.
9. Modelo lógico de datos.
10. Canales de comunicación reales.
11. Infraestructura pública y local.
12. Flujo de cambio, build y despliegue.
13. Stack tecnológico real por responsabilidad.
14. Mapa de aplicaciones y capacidades.
15. Mapa de dependencias simplificado.
16. Secuencia de Contratar.
17. Secuencia de Message Board.
18. Activación administrativa de un solo uso.
19. ActividadSistema y Administrador de tareas.
20. Fronteras de confianza y controles.
