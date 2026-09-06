# Preparación de producción

Este documento describe la arquitectura preparada para `danielramonperez.com`, su estado real de despliegue y los pasos que todavía requieren intervención local. No contiene credenciales reales.

## Arquitectura objetivo

```text
Visitante
  ├─ HTTPS → Cloudflare Pages → Angular estático (disponible 24/7)
  └─ HTTPS → api.danielramonperez.com → Cloudflare Tunnel → 127.0.0.1:8080
                                                    └─ SQL Server Express en 127.0.0.1:1433
```

No se abre ningún puerto del router. Cloudflare Tunnel inicia una conexión saliente y SQL Server nunca recibe tráfico de Internet.

## Qué funciona con el PC apagado

- Escritorio, ventanas, taskbar, Start, idiomas y reinicio visual.
- Sobre mí, experiencia, formación, CV, enlaces y datos profesionales.
- Drag & drop, posiciones guardadas, edición temporal, carpetas y papelera.
- Todos los comandos locales de Terminal.

Requieren el PC, SQL Server, Spring Boot y el túnel:

- Enviar el formulario **Contratar**.
- Leer y publicar mensajes en **Message Board**.
- Los comandos `curl /api/...` de Terminal.

Si el backend no está disponible, esas funciones muestran su error controlado y el resto del escritorio continúa funcionando.

## Cloudflare Pages

Valores preparados para crear el proyecto:

| Ajuste | Valor |
| --- | --- |
| Root directory | `frontend` |
| Build command | `pnpm build` |
| Build output directory | `dist/frontend/browser` |
| Node.js | `22.22.3` (`frontend/.nvmrc`) |
| pnpm | `11.19.0` (`packageManager`) |

Cloudflare Pages aplica su fallback SPA nativo porque el build no incluye un `404.html` de nivel superior. `frontend/public/_headers` añade cabeceras de seguridad compatibles con la interfaz actual.

El contenido profesional se sirve desde `frontend/public/data/portfolio.json`; no espera a la API durante el arranque.

## Configuración de la API en Angular

El despliegue utiliza este valor público:

```javascript
// frontend/public/runtime-config.js
window.__PORTFOLIO_CONFIG__ = {
  apiBaseUrl: 'https://api.danielramonperez.com',
};
```

No añadir `/api` al final. En localhost debe permanecer vacío para usar `proxy.conf.json`. Este archivo nunca lleva contraseñas, tokens, destinatarios ni claves.

## Spring Boot de producción

El perfil `production`:

- enlaza el servidor a `127.0.0.1`;
- usa `ddl-auto: validate` y no cambia el esquema;
- admite una lista explícita de orígenes CORS;
- respeta cabeceras reenviadas;
- expone `GET /health`, que devuelve `UP` solo si SQL Server responde.

Variables mínimas de producción:

```dotenv
SPRING_PROFILES_ACTIVE=production
SERVER_PORT=8080
FRONTEND_URLS=https://danielramonperez.com,https://www.danielramonperez.com
```

La dirección no se parametriza en producción: el perfil la fija en `127.0.0.1` para evitar una exposición accidental a la LAN o a Internet. Cloudflare Tunnel es el único punto de entrada público.

La contraseña local puede rotarse sin mostrarla mediante `scripts/rotate-database-password.ps1 -Execute`. El script genera un valor aleatorio, actualiza SQL Server y el `.env` ignorado, y recrea el contenedor con el mismo volumen.

El script `scripts/run-backend-production.ps1` construye el JAR si falta y lo ejecuta con el perfil correcto. La configuración sensible continúa en `.env` o en variables de entorno locales ignoradas por Git.

## Cloudflare Tunnel

La copia oficial para Windows ya está descargada en `.tools/cloudflared/cloudflared.exe` y su firma digital se verificó al prepararla. El 1 de septiembre de 2026 se comprobó además que ejecuta la versión `2026.8.2`. En Windows no se actualiza automáticamente, por lo que debe revisarse antes de publicar y periódicamente después.

El túnel administrado `portfolio-backend` ya está creado en Cloudflare. Su ruta publicada también está activa:

```text
api.danielramonperez.com → http://127.0.0.1:8080
```

El hostname resuelve en la red de Cloudflare. El conector local se instaló como servicio automático de Windows el 2 de septiembre de 2026 y Cloudflare lo mostró como `Healthy`. Si Spring Boot no está escuchando en `127.0.0.1:8080`, la API devuelve un `502` controlado sin afectar al escritorio estático.

Procedimiento de recuperación si alguna vez se rota el token:

1. En Cloudflare, abrir `portfolio-backend` y pulsar **Add a replica** para mostrar el token de instalación.
2. Copiar el token sin pegarlo en chats, documentos ni archivos del proyecto.
3. Abrir PowerShell como administrador en la raíz del repositorio.
4. Ejecutar `scripts/install-cloudflare-service.ps1`; el script solicita el token de forma oculta y no lo guarda en el proyecto.
5. Comprobar que el túnel vuelve a `Healthy` y que `https://api.danielramonperez.com/health` responde cuando el backend está activo.

`cloudflare/config.example.yml` documenta la alternativa de túnel administrado localmente. `config.yml` y los JSON de credenciales están ignorados por Git.

El rate limit solo confía en `CF-Connecting-IP` cuando la conexión directa procede de loopback. Esto evita aceptar una cabecera falsificada desde la red local.

## SQL Server Express

`docker-compose.yml` está preparado para:

- SQL Server 2022 Express;
- puerto publicado únicamente en `127.0.0.1:1433`;
- volumen independiente `sqlserver-express-data`;
- creación idempotente de la base `portfolio`.

### Backup

```powershell
.\scripts\backup-database.ps1
```

Genera un `.bak` en `backups/`, ejecuta `RESTORE VERIFYONLY` y mantiene los backups fuera de Git.

### Migración desde el volumen Developer anterior

Primero comprobar la simulación:

```powershell
.\scripts\migrate-to-sql-express.ps1
```

Para ejecutarla deliberadamente:

```powershell
.\scripts\migrate-to-sql-express.ps1 -Execute
```

El script crea un backup verificado, detiene Developer, arranca Express con un volumen nuevo, restaura `portfolio` y comprueba edición y datos. El volumen Developer anterior no se elimina y sirve como recuperación hasta que Daniel apruebe lo contrario.

## Email de Contratar con Resend

El código ya desacopla la entrega mediante `JobOfferEmailService`. En modo local usa simulación; en modo `smtp` utiliza:

- `From`: remitente autorizado del dominio;
- `To`: destinatario privado fijo configurado solo en backend;
- `Reply-To`: email validado del recruiter.

No se persiste la solicitud. `danielramonperez.com` está verificado en Resend y la entrega utiliza su interfaz SMTP para mantener `JobOfferEmailService` desacoplado del proveedor. La API key solo se introduce personalmente en el PC y nunca se añade al frontend ni al repositorio.

Configuración local:

```dotenv
JOB_OFFER_MAIL_MODE=smtp
JOB_OFFER_MAIL_FROM=Portfolio de Daniel <ofertas@danielramonperez.com>
JOB_OFFER_MAIL_TO=destinatario@example.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=API_KEY_DE_RESEND
SMTP_AUTH=true
SMTP_STARTTLS=true
```

`JOB_OFFER_LOG_CONTENT` es `false` por defecto para no escribir datos personales en logs. Solo debe activarse temporalmente en desarrollo si se quiere revisar el email simulado.

La API key debe tener permiso **Sending access** y quedar restringida a `danielramonperez.com`. Tras copiarla desde Resend, se configura sin mostrarla ni dejarla en el historial:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-resend-smtp.ps1 -FromClipboard
```

El script valida su formato, vacía el portapapeles y actualiza exclusivamente el `.env` local ignorado por Git.

Estado verificado el 2 de septiembre de 2026:

- `POST https://api.danielramonperez.com/api/job-offers` respondió `202 Accepted` con el backend en modo `smtp`;
- Resend registró el mensaje de prueba como `delivered`;
- el remitente fue `Portfolio de Daniel <ofertas@danielramonperez.com>`;
- el destinatario permaneció fijado exclusivamente en el backend;
- `Reply-To` coincidió con el email validado enviado por el formulario.

## Persistencia y moderación de Message Board

Message Board utiliza la misma instancia local de SQL Server Express, sin exponerla a Internet. Spring Boot crea de forma idempotente la tabla `message_board_messages`, inserta el mensaje permanente del administrador al arrancar por primera vez y ofrece la conversación mediante:

```text
GET  /api/message-board/messages
POST /api/message-board/messages
```

Los mensajes son estado global y no participan en el reinicio ficticio del escritorio. La publicación pública tiene validación backend, límites de longitud, honeypot y rate limit en memoria. El navegador no recibe nunca la clave raíz de moderación.

Antes del primer arranque se genera una clave aleatoria directamente en el `.env` ignorado:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-message-board.ps1
```

Para activar la interfaz administrativa en el navegador habitual, utiliza el lanzador de la raíz:

```text
ACTIVAR_ADMIN_MESSAGE_BOARD.cmd
```

El lanzador pide a `127.0.0.1` un código aleatorio de un solo uso, abre el sitio público y lo canjea por una cookie firmada `HttpOnly`, `Secure`, `SameSite=Strict`, host-only y limitada a `/api/message-board`. El código caduca en dos minutos, se retira inmediatamente de la URL y no se almacena. La sesión dura 30 días por defecto. Para revocar todas las sesiones basta con rotar `MESSAGE_BOARD_ADMIN_KEY` y reiniciar Spring Boot.

Con la sesión activa, Message Board bloquea el campo de nombre como `Daniel Ramón Pérez`, etiqueta como `Administrador` las publicaciones de Daniel y ofrece **Eliminar mensaje** con clic derecho. El backend vuelve a comprobar la sesión en cada publicación y eliminación; ocultar o manipular controles Angular no concede permisos. El mensaje permanente `#1` tampoco puede eliminarse con una sesión válida.

Para retirar spam desde PowerShell sin utilizar el navegador:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\remove-message-board-message.ps1 -MessageId 42
```

Ambos scripts leen la clave de `.env`, llaman exclusivamente a `127.0.0.1` y no la muestran. Las peticiones que llegan a través de Cloudflare Tunnel no pueden emitir activaciones aunque intenten aportar una cabecera administrativa. Los canjes públicos exigen un origen CORS exacto y tienen rate limit propio.

Estado verificado el 4 de septiembre de 2026:

- `GET https://api.danielramonperez.com/api/message-board/messages` devolvió `200` y el mensaje permanente `#1`;
- la preflight CORS pública aceptó los métodos configurados desde `https://danielramonperez.com`;
- un mensaje técnico publicado por la API pública apareció en la lectura local y continuó existiendo después de reiniciar Spring Boot;
- la moderación local eliminó exclusivamente ese mensaje temporal y conservó el mensaje del administrador;
- Cloudflare Pages publicó el icono y la aplicación, revisados en escritorio y a 390 px sin desbordamiento horizontal ni errores de consola.

## Puesta en marcha automática

La puesta en marcha local utiliza:

1. `cloudflared` como servicio automático de Windows.
2. Un acceso directo de inicio de sesión que ejecuta `scripts/start-production-services.ps1`.
3. El script abre Docker Desktop si fuese necesario, levanta SQL Server Express y arranca Spring Boot con el perfil `production`.
4. `/health` comprueba de forma simple backend y base de datos.

Instalación o reparación del acceso directo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-startup.ps1
```

Para retirarlo deliberadamente:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-startup.ps1 -Remove
```

Los diagnósticos de arranque se escriben en `logs/` sin registrar secretos ni el contenido de las ofertas.

## Verificación antes de publicar

```powershell
Set-Location frontend
pnpm lint
pnpm test:ci
pnpm build

Set-Location ..\backend
.\mvnw.cmd test
.\mvnw.cmd clean package
```

Después se comprobarán dominio raíz, `www`, API, CORS, backend apagado, formulario, rate limit, email real, `Reply-To`, Message Board compartido entre clientes, persistencia tras recarga/reinicio, moderación local, móvil y teclado.

## Estado de las acciones externas

`Dani-Moriarty/drp-os` es el repositorio público y canónico del proyecto. `Dani-Moriarty/portfolio` permanece privado como archivo histórico anterior a la migración. La grafía técnica de `danielramonperez.com` se verificó directamente en Cloudflare antes de incorporarla a la configuración pública.

El repositorio local utiliza `main`, tiene configurado `origin` y se sincroniza con `https://github.com/Dani-Moriarty/drp-os`. Los commits posteriores se acumulan normalmente en ese historial. La configuración pública del dominio y de `api.danielramonperez.com` también está versionada en GitHub.

Cloudflare Pages tiene acceso únicamente a `Dani-Moriarty/portfolio`, construye automáticamente la rama `main` y publica correctamente el proyecto `daniel-ramon-perez`. El build utiliza la raíz `frontend`, `pnpm build` y `dist/frontend/browser`.

`danielramonperez.com` y `www.danielramonperez.com` están asociados al proyecto, activos y con SSL habilitado. Ambos CNAME están proxificados y apuntan a `daniel-ramon-perez.pages.dev`; el acceso HTTPS se verificó desde el navegador.

El túnel permanente `portfolio-backend` y la ruta `api.danielramonperez.com` ya existen. El 2 de septiembre de 2026 se verificó en Cloudflare que la ruta apunta a `http://127.0.0.1:8080`, se instaló `cloudflared` como servicio automático de Windows y el túnel pasó a `Healthy`. La comprobación pública alcanzó Cloudflare y devolvió `502` porque el backend local todavía no estaba activo.

Tras reiniciar Windows se verificó Docker Engine `29.7.2`, SQL Server 2022 Express `16.0.4265.3`, el volumen `sqlserver-express-data` y la base `portfolio`. El acceso directo de inicio de sesión quedó instalado y el script idempotente confirmó Docker disponible, SQL Server `healthy` y Spring Boot activo.

La cadena pública también se verificó de extremo a extremo: `GET /health` devolvió `200 UP`, `GET /api/portfolio` devolvió `200`, la preflight CORS aceptó `https://danielramonperez.com` y una oferta completamente ficticia devolvió `202` primero en modo simulación y después en modo `smtp`.

Resend fue elegido como proveedor SMTP, `danielramonperez.com` quedó verificado y la API key limitada a envíos se introdujo mediante `scripts/configure-resend-smtp.ps1` sin versionarla. La entrega real y el `Reply-To` se verificaron el 2 de septiembre de 2026. Ningún secreto debe copiarse a este repositorio.
