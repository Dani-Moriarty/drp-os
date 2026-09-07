# DRP OS

Portfolio profesional Full-Stack, presentado como un sistema operativo ficticio inspirado en una workstation Windows 95/98.

El portfolio combina dos niveles de lectura:

- un recruiter puede identificar el perfil, la experiencia y las tecnologías principales desde Welcome en pocos segundos;
- una persona técnica puede explorar ventanas, archivos TXT, datos servidos por API, persistencia local, código y detalles de interacción.

La estética retro es una interfaz funcional, no una decoración sobre una página convencional. El prototipo anterior de landing, hero, cards y scroll vertical fue eliminado.

## Aplicaciones del escritorio

| Aplicación | Representación | Comportamiento |
| --- | --- | --- |
| Welcome | Ventana de bienvenida | Presentación interactiva, breve tutorial y accesos rápidos. |
| Sobre mí | System Properties | Perfil general, información del sistema y datos de contacto. |
| Work Experience | Carpeta Explorer | Contiene un TXT por experiencia y acepta elementos arrastrados desde el escritorio. |
| Education.txt | Notepad | Formación e idioma del CV. |
| LinkedIn | Acceso directo | Abre el perfil real en una pestaña segura. |
| Source Code | Acceso directo | Abre el repositorio configurado o informa de que falta el remote. |
| Daniel_Ramon_Perez_CV.pdf | Visor integrado | Permite leer y descargar el CV sin abandonar el escritorio. |
| Terminal.exe | Consola | Shell virtual navegable con comandos del CV, historial, API pública y accesos al escritorio. |
| Contratar | Asistente clásico | Candidatura empresarial invertida: una empresa puede enviar una oferta breve y profesional a Daniel. |
| Paint 98 | Aplicación de dibujo | Lienzo funcional con herramientas, paleta, historial, apertura, guardado virtual y exportación PNG. |
| Solitario | Juego de cartas | Klondike funcional con baraja completa, drag & drop, controles táctiles, deshacer y nueva partida. |
| Buscaminas | Juego de lógica | Campo clásico con primer clic seguro, banderas, cronómetro y tres dificultades. |
| Message Board | Tablón público | Conversación global persistente inspirada en guestbooks y message boards de finales de los 90. |
| Administrador de tareas | Utilidad de sistema | Ventanas y procesos virtuales reales, mapa de topología en vivo y métricas HTTP honestas de la sesión. |
| DRP Explorer | Navegador retro | Navegación web aislada en el cliente, historial de sesión, búsqueda segura y soporte oficial de YouTube Embed. |
| Reproductor | Reproductor multimedia | Audio real, playlist de sesión, visualizador por frecuencias, CD animado durante la reproducción y controles de transporte, volumen, aleatorio y repetición. |
| Música | Carpeta Explorer | Ocho archivos M4A de HoliznaCC0 asociados al Reproductor y disponibles bajo demanda. |
| Álbum de fotos | Carpeta Explorer | Siete fotografías PNG integradas en el filesystem y navegables con el visor. |
| Recycle Bin | Explorer | Recibe elementos arrastrados, muestra su contenido y permite restaurarlos. |

No existe una aplicación independiente **Tech Stack** ni una pestaña adicional de tecnologías. La información principal del stack forma parte de **General** dentro de Sobre mí.

## Fuente de verdad profesional

[`docs/CV.pdf`](docs/CV.pdf) es la única fuente válida de información profesional.

- Las tecnologías proceden del CV y la API las marca como `EXPLICIT`.
- Las competencias pueden derivarse de responsabilidades demostradas, la API las marca como `DERIVED` y conserva su evidencia.
- `docs/CV.en.pdf` es la versión en inglés aportada por Daniel; no introduce una fuente profesional independiente.
- `frontend/public/CV.pdf` y `frontend/public/CV.en.pdf` son las copias servidas por Angular y deben mantenerse idénticas a sus respectivos archivos de `docs/`.
- Las imágenes conceptuales solo definen la dirección visual; sus textos no se utilizan como datos.

## Stack

- **Frontend:** Angular 22.1, TypeScript 6, HTML y SCSS.
- **Backend:** Java 21, Spring Boot 4.1, Spring MVC y Spring Data JPA.
- **Persistencia:** SQL Server 2022 Express en Docker para el entorno objetivo; H2 solo en tests.
- **Desarrollo local:** Docker Compose, pnpm 11 y Maven Wrapper 3.9.16.
- **Tests:** Vitest/jsdom en frontend y JUnit/H2 en backend. H2 se utiliza exclusivamente en tests.

No se utiliza Bootstrap, Tailwind, Angular Material ni un UI kit. Los controles, ventanas, iconos CSS y bordes del escritorio son propios.

## Arquitectura

```text
.
├── frontend/
│   └── src/app/
│       ├── applications/          # Contenido de Welcome, About, Explorer, Notepad, PDF...
│       ├── core/                  # DTOs, acceso HTTP, idioma y documentos de sesión
│       └── desktop/
│           ├── components/        # Shell, iconos, ventanas, taskbar y Start
│           ├── config/            # Registro de aplicaciones y URL del repositorio
│           ├── models/            # Contratos del desktop
│           └── services/          # Window Manager, layout y sistema de directorios local
├── backend/
│   └── src/main/java/.../portfolio/
│       ├── config/                # CORS y seed idempotente
│       ├── controller/            # API REST y manejo de errores
│       ├── domain/                # Entidades JPA
│       ├── dto/                   # Contratos públicos
│       ├── repository/            # Repositorios Spring Data
│       └── service/               # Lectura, mapeo y entrega de ofertas por email
├── docs/CV.pdf                    # Fuente de verdad en español
├── docs/CV.en.pdf                 # Versión en inglés aportada por Daniel
├── docker-compose.yml             # SQL Server y creación de la base
├── .env.example                   # Variables locales de ejemplo
└── AGENTS.md                      # Decisiones para futuras sesiones
```

### Registro de aplicaciones

`frontend/src/app/desktop/config/desktop-applications.ts` centraliza identificador, etiqueta, título, icono, tipo, posición inicial y tamaño de ventana. Añadir una aplicación no requiere duplicar metadatos entre escritorio, Start y taskbar.

### Window Manager

`GestorVentanas` gestiona:

- apertura sin duplicados;
- cierre, minimizado y restauración;
- maximizado y recuperación exacta de la geometría anterior;
- ventana activa;
- incremento de `z-index` al obtener foco;
- coordenadas y tamaños;
- límites para mantener ventanas recuperables;
- reconciliación después de redimensionar el navegador;
- ventanas derivadas, como un Notepad distinto para cada experiencia.

`WindowFrame` implementa el marco visual, el drag, el redimensionado desde los cuatro bordes y las cuatro esquinas y maximizar/restaurar mediante el botón clásico o doble clic en la barra de título. El tamaño mínimo y los límites del workspace mantienen todas las ventanas utilizables. En móvil el drag y el redimensionado se desactivan y la aplicación abierta utiliza prácticamente todo el workspace.

### Paint 98

**Paint 98** forma parte del registro normal de aplicaciones y utiliza el mismo icono persistente, Start, taskbar, foco, z-index y ciclo de vida de ventanas que el resto del escritorio. El lienzo responde a Pointer Events y permite lápiz, pincel, borrador, líneas, rectángulos, elipses, relleno, distintos grosores, paleta retro, limpiar, invertir, deshacer y rehacer. La sesión de dibujo se conserva al minimizar o restaurar la ventana y se elimina al reiniciar el equipo.

`File → Open` permite importar una imagen del equipo. `Save` y `Save As` generan un PNG dentro del sistema de archivos virtual del navegador: aparece como un icono en el escritorio, puede moverse entre carpetas y Papelera y se abre en el visor de imágenes integrado. El visor ofrece `Archivo → Descargar...` y navegación anterior/siguiente limitada a los PNG del directorio actual; `Export PNG` conserva además la descarga directa al equipo. `DocumentosPaint` mantiene el contrato desacoplado `AdaptadorArchivosPaint`, mientras que el shell conecta ese contrato con `SistemaArchivosEscritorio`.

### Solitario

**Solitario** es una implementación funcional de Klondike con baraja estándar de 52 cartas y robo de una carta. Permite construir columnas descendentes alternando colores, mover secuencias, reciclar el descarte, completar las cuatro bases por palo, deshacer movimientos y comenzar partidas nuevas. Admite clic, doble clic, teclado y drag & drop; en pantallas pequeñas mantiene el tablero desplazable y controles aptos para interacción táctil.

Las cartas ocultas utilizan un dorso rojo pixelado con entramado blanco y emblema `DRP`. Al completar legítimamente las cuatro bases, una capa `canvas` interna al tapete lanza las cartas de forma sucesiva con gravedad, rebotes y estelas persistentes inspiradas en la celebración clásica de Windows. La animación no modifica las reglas ni el estado de la partida, queda recortada dentro del tapete y se cancela al deshacer, iniciar una partida nueva, cerrar la ventana o reiniciar el equipo.

La partida permanece en memoria al minimizar, cerrar y volver a abrir la ventana, y se reinicia junto al resto del equipo desde Inicio. La aplicación utiliza el registro, `GestorVentanas`, taskbar, Start, idioma y sistema de reinicio existentes; no crea un subsistema de ventanas paralelo.

### Buscaminas

**Buscaminas** reproduce el juego clásico con casillas, minas, números, banderas, expansión automática de zonas vacías, cronómetro y contador de minas. El primer clic —y sus casillas adyacentes— siempre es seguro. Incluye los niveles Principiante (9×9, 10 minas), Intermedio (16×16, 40 minas) y Experto (30×16, 99 minas), clic derecho para marcar y un modo bandera accesible para pantallas táctiles.

La partida y el cronómetro continúan al minimizar o reabrir la ventana; **Reiniciar equipo** restaura el nivel Principiante. Buscaminas participa en el mismo registro, layout persistente, Start, taskbar, Window Manager e idioma que el resto de aplicaciones.

### Message Board

**Message Board** es una única conversación pública compartida entre visitantes. Los mensajes se leen y publican mediante Spring Boot y se conservan en SQL Server; por tanto sobreviven a recargas, cambios de navegador y al reinicio ficticio de DRP OS. El nombre del visitante se recuerda únicamente en su navegador y puede editarse antes de cada publicación.

El despliegue se verificó el 4 de septiembre de 2026 mediante la API pública y el dominio final: una publicación recibida a través de Cloudflare Tunnel apareció también en la lectura local, sobrevivió a un reinicio completo de Spring Boot y pudo retirarse con la moderación privada sin afectar al mensaje permanente `#1`. La interfaz pública se comprobó en escritorio y a 390 px, sin desbordamiento horizontal ni errores de consola y con recorrido de teclado `Nombre → Mensaje → Publicar`.

El mensaje `#1` pertenece a Daniel Ramón Pérez, se identifica como **Administrador** y no puede eliminarse. Los visitantes no ven controles para editar o borrar publicaciones. Daniel puede activar desde el PC del backend una sesión de navegador firmada con doble clic en `ACTIVAR_ADMIN_MESSAGE_BOARD.cmd`. Una vez activada, el nombre queda bloqueado como **Daniel Ramón Pérez**, sus nuevas publicaciones se marcan como **Administrador** y el clic derecho sobre cualquier mensaje eliminable abre la acción de moderación.

La clave raíz permanece exclusivamente en `.env`. El navegador recibe una cookie de sesión `HttpOnly`, `Secure`, `SameSite=Strict` y limitada a la ruta del Message Board, nunca la clave. La activación usa un código aleatorio de un solo uso y dos minutos de vida que se genera únicamente mediante `127.0.0.1`; el backend rechaza la activación local si detecta cabeceras del túnel. La sesión dura 30 días por defecto y puede revocarse rotando `MESSAGE_BOARD_ADMIN_KEY`.

Preparación y alternativas locales:

```powershell
.\scripts\configure-message-board.ps1
.\scripts\activate-message-board-admin.ps1
.\scripts\remove-message-board-message.ps1 -MessageId 42
```

El endpoint público aplica validación, límites de longitud, honeypot y rate limit en memoria. El contenido se muestra mediante interpolación de Angular, sin interpretar HTML. La conversación depende del backend local y del túnel; cuando no están disponibles, el resto del escritorio continúa funcionando y la ventana muestra un error recuperable.

### Administrador de tareas

**Administrador de tareas** utiliza el registro, `GestorVentanas`, Start y taskbar existentes. La pestaña Aplicaciones enumera las ventanas abiertas en tiempo real y permite restaurarlas o cerrarlas mediante **Finalizar tarea**. Procesos representa exclusivamente procesos virtuales de DRP OS; no intenta leer ni simular procesos, CPU, GPU o memoria del dispositivo del visitante.

La pestaña **Mapa y actividad** reúne topología, peticiones, errores, latencia y bytes aproximados de los cuerpos HTTP. Las métricas HTTP son acumuladas desde el arranque; el historial se limita a 60 entradas finalizadas y conserva todas las peticiones en curso. Una gráfica muestra las últimas 18 latencias. Las conexiones HTTP y las ramas locales permanecen destacadas 3 segundos después de cada acción; todas las ventanas abiertas, incluidas las minimizadas, tienen nodo propio y el mapa se desplaza dentro de su ventana.

El interceptor registra comunicaciones reales de Message Board, Contratar y Terminal; el Window Manager registra aperturas, cierres, foco, movimiento y tamaño. Paint registra trazos y undo/redo; los juegos registran jugadas; Terminal registra comandos sin copiar argumentos; los archivos y el idioma registran cambios locales. Un PerformanceObserver cuenta recursos del propio origen que el navegador carga realmente, sin lanzar sondeos ni almacenar URLs. Las acciones locales nunca incrementan el tráfico HTTP. Las rutas a SQL Server se infieren de los endpoints conocidos, excluyendo la sesión administrativa; un fallo HTTP no se presenta como un diagnóstico independiente de la base de datos. Los estados de red corresponden a la última comunicación, no a un sondeo continuo.

El monitor se vacía con **Reiniciar equipo**, no persiste ni transmite telemetría y respeta movimiento reducido. Los iconos del monitor reutilizan las imágenes de referencia mediante recortes de viewport SVG. El cambio de nombre a **DRP OS** migra las claves antiguas al leerlas, conservando posiciones, archivos, idioma y nombre del visitante.

### DRP Explorer

**DRP Explorer** es un navegador retro integrado en el registro, Window Manager, Start, taskbar y Administrador de tareas. Mantiene en memoria la dirección actual y el historial Atrás/Adelante, ofrece Inicio y Actualizar, y registra aperturas y navegaciones como actividad local real de DRP OS. La sesión se elimina con **Reiniciar equipo**.

La navegación se ejecuta exclusivamente en el navegador del visitante: Spring Boot no descarga URLs ni actúa como proxy. Solo se aceptan direcciones HTTP/HTTPS sin credenciales; los esquemas ejecutables y los destinos locales o privados se rechazan. Las páginas externas compatibles se aíslan en un `iframe sandbox` sin permiso para navegar la ventana superior ni acceder al estado de DRP OS. Las búsquedas de Google se abren directamente en una pestaña real; GitHub, LinkedIn, el propio portfolio y el contenido HTTP mixto mantienen la pantalla de compatibilidad con apertura explícita externa cuando no admiten incrustación segura. Las URLs de vídeo de YouTube se transforman únicamente al reproductor oficial `youtube-nocookie.com/embed`.

Las restricciones `X-Frame-Options` y CSP pertenecen a cada web externa y no pueden eludirse ni detectarse de forma fiable desde JavaScript por la política del navegador. Por ello DRP Explorer mantiene siempre visible la dirección y ofrece una acción segura para abrir el destino fuera de la ventana. No oculta la IP, no proporciona anonimato y no inventa tráfico HTTP para el Administrador de tareas.

### Reproductor y archivos de música

**Reproductor** utiliza un único elemento de audio mantenido por `ServicioReproductor`, fuera del ciclo visual de la ventana. Por ello una pista continúa al minimizar la aplicación o trabajar en otra ventana, y se detiene al cerrar Reproductor, finalizar su tarea o reiniciar DRP OS. La playlist, pista actual y posición pertenecen a la sesión; volumen, silencio, aleatorio y repetición se recuerdan localmente en `drp-os.audio-player.preferences.v1`, pero nunca se inicia música al cargar la web. El CD del panel visual gira mediante una animación CSS ligera solo durante el estado real `playing` y conserva su posición al pausar.

La carpeta **Música** y sus ocho archivos M4A forman parte de `SistemaArchivosEscritorio`: pueden moverse, enviarse a carpetas o a Papelera y abrirse mediante la asociación real `archivo de audio → Reproductor`. El doble clic es la acción explícita que carga y reproduce la pista, incorporando como playlist el resto de archivos de audio de esa misma carpeta. Reproductor también permite añadir pistas disponibles, quitarlas de la lista sin borrar el archivo, limpiar la playlist y recibir archivos arrastrados desde una ventana Explorer.

Los M4A no se precargan al arrancar DRP OS. El navegador solicita únicamente la pista seleccionada y sus metadatos; la carga aparece como recurso real en el Administrador de tareas. El visualizador usa `AudioContext` y `AnalyserNode` tras el gesto de reproducción y dibuja las frecuencias reales, sin animaciones aleatorias. Los archivos fueron proporcionados para el portfolio como música de dominio público de HoliznaCC0; las fuentes verificables, metadatos y licencia [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) se documentan individualmente en `frontend/public/audio/holiznacc0/LICENSES.md`.

### Iconos y localStorage

Los iconos soportan selección individual y múltiple con `Ctrl`, rangos con `Shift` y rectángulo de selección arrastrando sobre el fondo. También admiten doble clic, teclado y drag con umbral para distinguir un clic de un movimiento accidental. Al soltarlos encajan en una cuadrícula invisible y nunca comparten una celda. LinkedIn conserva su enlace seguro sin activar el drag nativo del navegador, por lo que se mueve igual que el resto de iconos.

Los elementos pueden arrastrarse a **Work Experience**, a carpetas creadas por el visitante o a **Recycle Bin**, tanto sobre su icono como sobre su ventana abierta. Desaparecen del escritorio y pasan a mostrarse dentro del contenedor. Los TXT propios de Work Experience son entradas reales del mismo sistema: pueden sacarse al escritorio, moverse por su cuadrícula, devolverse a una carpeta, enviarse a la Papelera y abrirse desde cualquiera de esas ubicaciones. Explorer permite seleccionar y devolver cualquier entrada al escritorio; la Papelera ofrece restauración en la ubicación anterior, vaciado y eliminación definitiva durante la sesión, y su icono cambia inmediatamente entre vacío y lleno. `LeagueClient.exe` no se ejecuta ni puede restaurarse o arrastrarse fuera de la Papelera, pero sí admite eliminación permanente y muestra sus diálogos retro específicos en ambos casos.

El clic derecho abre un menú contextual Windows 95/98. Desde el fondo del escritorio o una ventana Explorer se pueden crear carpetas anidadas y documentos `.txt`, ordenar o alinear iconos, actualizar la vista, pegar y consultar propiedades. Un elemento nuevo se coloca en la celda libre más cercana al punto del clic sin recargar el escritorio ni alterar las posiciones existentes. Los elementos creados admiten abrir, editar, cortar, copiar, pegar, renombrar, mover y eliminar. El mismo menú se abre con `Shift + F10`, la tecla de menú contextual o una pulsación prolongada táctil; dentro de los editores se conserva el menú nativo del navegador.

Las posiciones se guardan solo en el navegador:

```text
drp-os.desktop-layout.v3
drp-os.file-system.v6
```

Ambos formatos están versionados. El layout adapta su disposición inicial al ancho disponible: las aplicaciones profesionales y el Administrador de tareas se anclan al margen izquierdo; Paint 98, Solitario, Buscaminas, Message Board, Álbum de fotos, DRP Explorer, Reproductor y Música se anclan al derecho. En cuanto el visitante mueve u ordena un icono, la disposición pasa a ser personalizada y se conserva sin reinterpretarla. Los layouts `v1` y `v2` se migran como personalizados para respetar posiciones anteriores. El sistema de archivos migra de forma compatible los datos `v1` a `v5`, y acepta aplicaciones registradas, documentos profesionales, carpetas, TXT, imágenes creadas por el visitante, el álbum PNG incluido y los archivos de audio administrados por DRP OS. **Reiniciar equipo**, dentro de Inicio, reproduce una secuencia de reinicio retro y restaura tanto el layout como la ubicación inicial de cada elemento. Estos datos no se envían al backend.

### Edición y reinicio

Los archivos TXT de experiencia y formación se abren como documentos editables de Notepad. `DocumentSessionService` conserva los cambios en memoria al cerrar y volver a abrir una ventana, separándolos por idioma; no los escribe en el backend ni en `localStorage`.

Los documentos `.txt` creados desde el menú contextual guardan su nombre y contenido en el sistema de archivos virtual de `localStorage`, por lo que sobreviven a una recarga. Las carpetas creadas conservan también su árbol, contenido, orden y ubicación. Todo ello se elimina al ejecutar **Reiniciar equipo**, igual que ocurriría al restaurar la estación de trabajo original.

Los Notepad de formación, experiencia y documentos creados incluyen `Archivo → Descargar...`, que exporta el texto visible —también si fue editado— con su nombre actual. Los PNG guardados desde Paint ofrecen la misma acción desde su visor. Las descargas son explícitas y no alteran la copia virtual conservada en el navegador.

Al reiniciar el escritorio se cierran todas las ventanas, se eliminan las ediciones temporales, se vacían las ubicaciones personalizadas de carpetas y Papelera, se restauran las posiciones originales y vuelve a abrirse Welcome. El idioma elegido se conserva como preferencia del sistema.

### Terminal virtual

Terminal mantiene una sesión exclusivamente en memoria con ruta, historial y transcript. Ofrece comandos compatibles con las convenciones de Windows y Unix para explorar una representación virtual del CV:

- `help`, `dir` / `ls`, `cd`, `pwd`, `tree` y `type` / `cat`;
- `whoami`, `hostname`, `ver` / `uname`, `date`, `time` y `set` / `env`;
- `echo`, `history` y `cls` / `clear`;
- `git status` y `git log`, siempre con información honesta sobre la configuración pública;
- `curl /api/...`, limitado a los endpoints públicos y de solo lectura del portfolio, incluido `curl /api/health`;
- `start` / `open` para abrir aplicaciones reales del escritorio —incluidos `start paint`, `start solitaire`, `start minesweeper`, `start messageboard`, `start tareas`, `start explorer`, `start reproductor` y `start musica`— y `exit` para cerrar Terminal.

Las flechas arriba y abajo recorren el historial. Cerrar y volver a abrir Terminal conserva la sesión; **Reiniciar equipo** la elimina. El comando `curl` no acepta dominios, URLs arbitrarias, cabeceras, métodos de escritura ni acceso a variables del navegador.

### Idioma y currículum

La ventana **Welcome** presenta desde el primer momento las opciones **🇪🇸 Bienvenido** y **🇬🇧 Welcome**, representadas mediante banderas SVG retro accesibles. La barra de tareas mantiene además su selector visible con banderas junto a **ES / EN**. El idioma se aplica inmediatamente al escritorio, a las ventanas abiertas, a los menús y al contenido profesional, y se conserva localmente en:

```text
drp-os.language.v1
```

El visor de CV sirve `CV.pdf` en español y `CV.en.pdf` en inglés. Cambiar el idioma con el visor abierto sustituye también el documento y el nombre de la descarga.

### Contratar: candidatura empresarial invertida

**Contratar** forma parte del registro normal de aplicaciones: su icono se selecciona, mueve, persiste y restaura igual que los demás; su ventana utiliza `GestorVentanas`, Start y taskbar. El formulario solicita únicamente empresa, descripción de la posición, nombre y email de contacto —además del honeypot invisible—, valida en Angular y vuelve a validarse en Spring Boot.

El flujo es deliberadamente efímero:

```text
recibir → validar → limitar abuso → enviar email → descartar request
```

No se guardan ofertas, nombres, emails ni mensajes en SQL Server. El destinatario y remitente proceden exclusivamente de la configuración segura del backend; el frontend no conoce credenciales y no puede convertir el endpoint en un relay. El email del recruiter se utiliza únicamente como cabecera `Reply-To`.

### Disponibilidad pública y datos estáticos

El escritorio carga su contenido profesional desde `frontend/public/data/portfolio.json`. Esta copia versionada permite que Angular siga funcionando en Cloudflare Pages aunque el PC, Spring Boot o SQL Server estén apagados. Cuando cambie el CV o el seed, esta copia debe actualizarse con los mismos datos verificados.

El despliegue público está disponible en [`danielramonperez.com`](https://danielramonperez.com) y [`www.danielramonperez.com`](https://www.danielramonperez.com), ambos con HTTPS gestionado por Cloudflare. [`drp-os.pages.dev`](https://drp-os.pages.dev) es el hostname técnico del proyecto. Los commits de `main` generan despliegues automáticos desde el repositorio canónico.

Solo las funciones dinámicas llaman al backend: el envío de **Contratar**, la conversación de **Message Board** y los comandos `curl /api/...` de Terminal. La URL pública `https://api.danielramonperez.com` se configura sin reconstruir Angular en `frontend/public/runtime-config.js`; el archivo es público y nunca debe contener secretos. En localhost, la aplicación ignora ese origen y conserva el proxy de desarrollo.

Cloudflare Pages sirve `/`, `index.html` y `runtime-config.js` sin almacenamiento en caché. Así, cada visita obtiene el manifiesto HTML del despliegue activo y no intenta cargar bundles con hash pertenecientes a una versión anterior; los demás recursos versionados conservan el comportamiento de caché de la plataforma.

La preparación completa para Cloudflare Pages, Cloudflare Tunnel, SQL Server Express y el arranque de producción en Windows está documentada en [`PRODUCTION_SETUP.md`](PRODUCTION_SETUP.md). El túnel `portfolio-backend`, la ruta pública de la API y el servicio automático `cloudflared` ya están configurados; la disponibilidad de las funciones dinámicas depende de que Docker, SQL Server y Spring Boot estén activos en el PC.

`scripts/start-production-services.ps1` automatiza el arranque de Docker, SQL Server Express y Spring Boot al iniciar sesión. `scripts/install-production-startup.ps1` instala o elimina de forma reproducible el acceso directo correspondiente en la carpeta Inicio de Windows.

Si Docker Desktop queda bloqueado en Windows por el socket temporal `sailor-ingest.sock`, ejecuta `REPARAR_DOCKER.cmd` con doble clic y acepta el aviso de administrador. El reparador elimina exclusivamente ese socket, reinicia Docker y vuelve a levantar SQL Server y Spring Boot; no elimina contenedores, volúmenes ni datos.

## API REST

Los datos profesionales se exponen mediante endpoints de solo lectura. Las operaciones de escritura se limitan al envío no persistente de ofertas y al tablón público:

| Método | Endpoint | Respuesta |
| --- | --- | --- |
| `GET` | `/api/portfolio` | Perfil agregado completo para integraciones y Terminal; Angular arranca con su snapshot estático. |
| `GET` | `/api/profile` | Perfil y contacto. |
| `GET` | `/api/experiences` | Experiencias, responsabilidades, tecnologías y competencias. |
| `GET` | `/api/technologies` | Tecnologías explícitas del CV. |
| `GET` | `/api/competencies` | Competencias derivadas y evidencia. |
| `GET` | `/api/education` | Formación. |
| `GET` | `/api/languages` | Idioma y acreditación. |
| `POST` | `/api/job-offers` | Valida y entrega una oferta por email; responde `202 Accepted` y no persiste el contenido. |
| `GET` | `/api/message-board/messages` | Devuelve una página de la conversación global, siempre con el mensaje de administrador. |
| `POST` | `/api/message-board/messages` | Valida y persiste un mensaje público; responde `201 Created`. |
| `DELETE` | `/api/message-board/messages/{id}` | Elimina un mensaje tras verificar en backend la sesión administrativa; nunca elimina el mensaje permanente `#1`. |
| `POST` | `/api/message-board/admin/activation` | Emite una activación breve solo desde localhost y con la clave raíz local. |
| `POST` / `GET` | `/api/message-board/admin/session` | Activa o comprueba la cookie administrativa firmada, sin exponer secretos a Angular. |

`CargaDatosPortfolio` carga los datos automáticamente cuando la base está vacía. No existen cuentas de usuario, contraseñas web ni panel administrativo: solo una sesión de moderación local para Daniel, limitada al Message Board.

### Email y desarrollo local

El backend usa Spring Mail. `JOB_OFFER_MAIL_MODE=log`, valor por defecto, no requiere cuenta de correo: construye y valida el asunto, cuerpo y `Reply-To`, pero oculta el contenido personal del log salvo que `JOB_OFFER_LOG_CONTENT=true` se active deliberadamente en desarrollo. Responde como un envío aceptado y deja explícito que no hubo entrega real. Esto permite probar todo el recorrido local sin credenciales.

La entrega real utiliza Resend mediante SMTP, sin acoplar el servicio de dominio a su API. Son imprescindibles `JOB_OFFER_MAIL_FROM`, `JOB_OFFER_MAIL_TO`, `SMTP_HOST` y la API key usada como password SMTP. El remitente pertenece a `danielramonperez.com`; nunca se suplanta la dirección de la empresa. El destinatario siempre es `JOB_OFFER_MAIL_TO` y `Reply-To` siempre es el email validado del contacto.

Ejemplo conceptual de producción:

```dotenv
JOB_OFFER_MAIL_MODE=smtp
JOB_OFFER_MAIL_FROM=Portfolio de Daniel <ofertas@danielramonperez.com>
JOB_OFFER_MAIL_TO=danielramonperez@hotmail.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=<api-key-secreta-de-resend>
SMTP_AUTH=true
SMTP_STARTTLS=true
```

No versionar los valores reales. `scripts/configure-resend-smtp.ps1 -FromClipboard` introduce la API key en el `.env` local ignorado, limpia el portapapeles y evita que aparezca en el historial. La configuración incluye timeouts de conexión, lectura y escritura de cinco segundos para evitar peticiones bloqueadas indefinidamente.

La entrega de producción se verificó el 2 de septiembre de 2026 mediante `https://api.danielramonperez.com/api/job-offers`: la API respondió `202 Accepted` y Resend registró el mensaje de prueba como `delivered`, con `From`, destinatario fijo y `Reply-To` correctos. Esta comprobación no implica persistencia de los datos enviados.

### Protección antispam

`POST /api/job-offers` aplica límites de longitud y validación backend, un honeypot invisible y un rate limit en memoria por hash de dirección cliente (tres solicitudes por quince minutos por defecto). El rate limit es deliberadamente simple y adecuado para una única instancia; un despliegue horizontal debería sustituirlo por un contador compartido. No hay CAPTCHA inicialmente para evitar fricción innecesaria.

### Seguridad de aplicación

- Cloudflare Pages entrega una CSP restrictiva, protección contra MIME sniffing, framing externo y permisos de navegador innecesarios. DRP Explorer conserva únicamente `frame-src https:` porque su función requiere incrustar destinos HTTPS, siempre dentro de un `iframe sandbox`.
- La API añade sus propias cabeceras defensivas, impide ser incrustada y limita a 16 KiB tanto las cabeceras HTTP como los cuerpos mutables bajo `/api`, incluidos los envíos fragmentados sin `Content-Length`.
- El origen público configurado en Angular y los orígenes CORS del backend se validan como orígenes HTTP/HTTPS explícitos, sin credenciales, rutas, comodines, query ni fragmentos. En producción la API queda enlazada de forma fija a `127.0.0.1` y la cookie administrativa se fuerza como segura.
- SMTP verifica la identidad TLS del servidor. Maven Wrapper verifica por SHA-256 la distribución descargada y Dependabot vigila semanalmente las dependencias npm, Maven y Docker.
- DRP Explorer rechaza además localhost, rangos privados, link-local, CGNAT, redes de pruebas/reservadas y nombres locales habituales. La aplicación sigue siendo navegación directa del visitante: el backend nunca obtiene la URL solicitada.

## Requisitos

Antes de arrancar el proyecto hay que instalar algunas herramientas en el ordenador. No forman parte del repositorio.

| Herramienta | ¿Instalar? | Motivo |
| --- | --- | --- |
| [Node.js 22 LTS](https://nodejs.org/en/download) | Sí | Ejecutar Angular (`22.22.3` recomendado; también compatible con `24.15.0` o superior dentro de la rama 24). |
| [pnpm 11](https://pnpm.io/installation) | Sí | Dependencias y comandos del frontend. |
| [JDK 21](https://adoptium.net/installation/) | Sí | Compilar y ejecutar Java. |
| [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) | Sí para el flujo recomendado | Ejecutar SQL Server. |
| Maven | No | El repositorio incluye Maven Wrapper. |
| SQL Server | No | Docker descarga la imagen automáticamente. |
| Angular CLI global | No | La CLI está en las dependencias del frontend. |

### Comprobar requisitos en Windows

Abre un PowerShell nuevo y ejecuta:

```powershell
node --version
pnpm --version
java --version
docker --version
docker compose version
```

Se espera Node `v22.22.3` (o Node `v24.15.0+` dentro de la rama 24), pnpm `11.x` y Java `21.x`. Si un comando no se reconoce, instala la herramienta correspondiente.

Para el backend WSL 2 de Docker Desktop, abre **PowerShell como administrador**, ejecuta y reinicia Windows:

```powershell
wsl --install
```

Después instala Node, Java y Docker Desktop con WinGet:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
winget install --id EclipseAdoptium.Temurin.21.JDK --exact --accept-package-agreements --accept-source-agreements
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

Si `winget` no existe, abre **Instalador de aplicación** en Microsoft Store:

```powershell
Start-Process 'ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1'
```

Cierra PowerShell, abre otra terminal e instala la versión de pnpm del proyecto:

```powershell
npm install --global pnpm@11.19.0
```

Abre Docker Desktop y espera a que el motor esté listo. Este comando debe terminar sin errores:

```powershell
docker info
```

## Puesta en marcha en Windows

La **raíz del proyecto** es la carpeta que contiene este README, `frontend`, `backend` y `docker-compose.yml`:

```text
C:\Users\danie\Desktop\Portfolio-Daniel
```

No es `C:\Users\danie` ni `C:\`.

### Arranque con doble clic

`Arrancar Portfolio.cmd` ofrece el recorrido recomendado para este ordenador. El acceso directo del Escritorio llama al mismo archivo y realiza automáticamente lo siguiente:

1. abre Docker Desktop si está cerrado;
2. arranca SQL Server y crea la base de datos cuando resulte necesario;
3. configura el JDK local del proyecto y arranca Spring Boot;
4. utiliza el runtime de Node disponible y arranca Angular;
5. espera a que ambos servicios respondan;
6. abre `http://localhost:4200/` en el navegador.

Los procesos auxiliares permanecen ocultos y sus salidas se guardan en `logs/`. Volver a ejecutar el archivo no crea otra copia si los servicios ya están respondiendo. La sección siguiente conserva el procedimiento manual para instalación, diagnóstico o uso en otro ordenador.

### 1. Crear la configuración local

Abre PowerShell y copia el bloque completo:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel'
Get-Location
Test-Path -LiteralPath '.env.example'
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
Test-Path -LiteralPath '.env'
```

`Get-Location` debe mostrar la raíz del proyecto y ambos `Test-Path` deben devolver `True`. El bloque no sobrescribe un `.env` existente.

### 2. Arrancar SQL Server

Con Docker Desktop abierto, utiliza la primera terminal:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel'
docker compose up -d database database-init
docker compose ps -a
docker compose logs database-init
```

Resultado esperado:

- `database`: `Up` y después `healthy`;
- `database-init`: `Exited (0)`, porque crea `portfolio` y finaliza.

### 3. Arrancar el backend

Abre una segunda terminal y mantenla abierta:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel\backend'
.\mvnw.cmd spring-boot:run
```

El backend estará listo cuando aparezca `Started PortfolioApplication`. Comprueba la API:

```powershell
Invoke-WebRequest 'http://localhost:8080/api/portfolio' |
  Select-Object StatusCode
```

Debe responder `200`.

### 4. Arrancar el frontend

Abre una tercera terminal y mantenla abierta:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel\frontend'
pnpm install
pnpm start
```

Cuando Angular termine de compilar:

```powershell
Start-Process 'http://localhost:4200'
```

El orden correcto es Docker Desktop → SQL Server → backend → frontend.

### 5. Detener el entorno

Pulsa `Ctrl+C` en frontend y backend. Después:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel'
docker compose down
```

El volumen de SQL Server se conserva. Para eliminarlo deliberadamente habría que utilizar `docker compose down -v`; no es necesario para detener la aplicación.

## macOS y Linux

Instala Node.js 22.22.3, pnpm 11 y JDK 21. Node 24 también es compatible desde la versión 24.15.0. Utiliza Docker Desktop en macOS o Docker Engine con Compose v2 en Linux.

Desde la ruta real del repositorio:

```bash
cp .env.example .env
docker compose up -d database database-init

cd backend
./mvnw spring-boot:run

# En otra terminal
cd frontend
pnpm install
pnpm start
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DB_PASSWORD` | Sí | Contraseña de SQL Server. |
| `DB_USERNAME` | No | Usuario JDBC; por defecto `sa`. |
| `DB_URL` | No | URL JDBC completa. |
| `FRONTEND_URL` | No | Origen CORS; por defecto `http://localhost:4200`. |
| `FRONTEND_URLS` | Sí en producción | Orígenes CORS separados por comas, por ejemplo dominio raíz y `www`. |
| `SERVER_PORT` | No | Puerto de la API; por defecto `8080`. |
| `JOB_OFFER_MAIL_MODE` | No | `log` para desarrollo sin entrega o `smtp` para entrega real. |
| `JOB_OFFER_MAIL_FROM` | Sí en SMTP | Remitente autorizado y controlado por Daniel. |
| `JOB_OFFER_MAIL_TO` | Sí en SMTP | Destinatario fijo de todas las ofertas. |
| `JOB_OFFER_LOG_CONTENT` | No | Muestra contenido personal en logs solo si se activa deliberadamente en local. |
| `SMTP_HOST` | Sí en SMTP | Host del servidor de correo. |
| `SMTP_PORT` | No | Puerto SMTP; por defecto `25`, normalmente `587` con STARTTLS. |
| `SMTP_USERNAME` | Según proveedor | Usuario SMTP. |
| `SMTP_PASSWORD` | Según proveedor | Secret SMTP; nunca debe versionarse. |
| `SMTP_AUTH` | No | Activa autenticación SMTP; por defecto `false`. |
| `SMTP_STARTTLS` | No | Activa STARTTLS; por defecto `false`. |
| `JOB_OFFER_RATE_LIMIT_MAX_REQUESTS` | No | Máximo por ventana; por defecto `3`. |
| `JOB_OFFER_RATE_LIMIT_WINDOW` | No | Ventana de rate limit en formato `Duration`; por defecto `15m`. |
| `MESSAGE_BOARD_ADMIN_KEY` | Sí para moderar | Clave raíz local que firma sesiones y autoriza herramientas localhost; nunca se incluye en Angular o Git. |
| `MESSAGE_BOARD_RATE_LIMIT_MAX_REQUESTS` | No | Publicaciones máximas por cliente y ventana; por defecto `5`. |
| `MESSAGE_BOARD_RATE_LIMIT_WINDOW` | No | Ventana del limitador del tablón; por defecto `10m`. |
| `MESSAGE_BOARD_ADMIN_SESSION_TTL` | No | Duración de la cookie administrativa firmada; por defecto `30d`. |
| `MESSAGE_BOARD_ADMIN_ACTIVATION_TTL` | No | Vida del código de activación de un solo uso; por defecto `2m`. |
| `MESSAGE_BOARD_ADMIN_MAX_ATTEMPTS` | No | Intentos máximos de canje por cliente y ventana; por defecto `8`. |
| `MESSAGE_BOARD_ADMIN_ATTEMPT_WINDOW` | No | Ventana del limitador de activación; por defecto `5m`. |
| `MESSAGE_BOARD_ADMIN_COOKIE_SECURE` | No | Mantiene la cookie limitada a HTTPS; debe seguir en `true` en producción. |

Spring Boot carga `.env` al ejecutarse desde la raíz o desde `backend`. `.env` está ignorado por Git.

## Configurar Source Code

El acceso directo utiliza exclusivamente la URL real configurada en:

```text
https://github.com/Dani-Moriarty/drp-os
```

Este repositorio público es la fuente canónica de DRP OS y acumula normalmente todo el desarrollo posterior a su publicación inicial.

## Tests y calidad

Frontend:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel\frontend'
pnpm lint
pnpm test:ci
pnpm build
```

Las pruebas cubren Window Manager, foco, z-index, minimizar/restaurar/maximizar/redimensionar, apertura sin duplicados, selección múltiple, persistencia, extracción e inserción de documentos en directorios, Papelera y restauración, reinicio, edición temporal, aplicaciones, Notepad, Explorer, selector ES/EN, cambio de CV, enlaces externos, comandos de Terminal, Paint 98 (historial, herramientas, Pointer Events y BMP), DRP Explorer (historial, validación de URL, aislamiento, compatibilidad y YouTube), Reproductor (playlist, transporte, preferencias y asociación de archivos), el formulario Contratar y Message Board (carga, validación, publicación, identidad administrativa, clic derecho, borrado, recuerdo local del nombre y errores seguros).

Backend:

```powershell
Set-Location -LiteralPath 'C:\Users\danie\Desktop\Portfolio-Daniel\backend'
.\mvnw.cmd test
.\mvnw.cmd clean package
```

Los tests backend usan H2 en memoria, cargan los mismos seeds y validan DTOs, tecnologías explícitas, competencias derivadas, experiencias, educación e idioma. Para Contratar comprueban requests válidas e inválidas, límites, honeypot, rate limit, normalización, formato del correo, entrega correcta, `Reply-To`, destinatario fijo y errores del mail sender. Para Message Board prueban persistencia compartida, mensajes de administrador, mensaje permanente, validación, honeypot, rate limit, activaciones de un solo uso, firma y caducidad de sesión, restricción localhost y moderación protegida. También verifican la normalización estricta de CORS, las cabeceras defensivas y el límite de cuerpos de la API.

## Builds

- Angular: `frontend/dist/frontend/`.
- Spring Boot: `backend/target/portfolio-api-1.0.0.jar`.

## Responsive y accesibilidad

- Desktop conserva iconos ajustados a cuadrícula, ventanas solapadas y drag.
- En tablet se mantienen ventanas limitadas al workspace.
- A `640px` o menos los iconos forman una cuadrícula y el drag se desactiva.
- Las ventanas móviles usan prácticamente todo el espacio disponible y su contenido hace scroll.
- Los iconos se pueden abrir con doble clic o con Enter.
- Ventanas, taskbar, Start, pestañas y enlaces utilizan elementos semánticos y foco visible.
- `prefers-reduced-motion` desactiva animaciones no esenciales.

## Limitaciones deliberadas

- `git log` muestra el historial público real del repositorio canónico.
- `curl` es deliberadamente de solo lectura y únicamente consulta las rutas `/api` públicas incluidas en su lista blanca.
- Source Code abre exclusivamente la URL pública configurada del repositorio canónico.
- El modo local `log` verifica el correo generado pero no demuestra una entrega SMTP real. La entrega solo puede considerarse verificada después de configurar y probar un proveedor y dominio reales.
- El rate limit vive en memoria de una instancia; no comparte contadores entre réplicas ni persiste tras reiniciar el backend.
