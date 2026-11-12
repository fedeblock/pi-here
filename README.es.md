# pi-here

[English](README.md)

## Por qué lo hice

Hace tiempo que trabajo con modelos comerciales servidos por terceros, pero quería darle una oportunidad a
una opción autoalojada: Ollama con Pi. Claude Code no me convenció para eso y me recomendaron un entorno más
ligero, así que probé Pi: una tabla rasa sobre la que ir construyendo a partir de una base ligera.

Eché en falta una herramienta que facilitara la configuración de cada proyecto, así que armé `pi-here`.
Espero que os sea de utilidad. Usadlo bajo vuestra propia responsabilidad y, si os gusta, dejad un comentario.

---

Lanzador por carpeta para el [agente de código Pi](https://pi.dev). Lo ejecutas en la carpeta de un
proyecto, ves exactamente con qué se va a iniciar Pi y pulsas **Enter**. Cuatro cosas que puedes
hacer, nada más:

1. **Lanzar con un preset**: `pi-here review`
2. **Lanzar con el default**: `pi-here`
3. **Previsualizar antes de lanzar**: las dos anteriores muestran antes el perfil y el comando completos
4. **Configurar**: elegir qué extensiones y skills carga cada preset (`c`, o `pi-here config`)

```
┌  pi-here · mi-proyecto
│
◇  construir · default ───────────────────────────────────────────────────╮
│                                                                         │
│  Modelo        el de Pi                                                 │
│  Thinking      medium                                                   │
│  Herramientas  todas                                                    │
│  Extensiones   todas (4 encontradas)                                    │
│  Skills        todas (2 encontradas)                                    │
│  Comando       ollama launch pi -- --thinking medium                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────╯
│
│  ↵ lanzar · p perfil · e editar esta ejecución · s guardar para esta carpeta · c configurar · q salir
```

## Por qué

Cada esquema de herramienta, extensión y skill suma tokens al prompt de sistema, y con un modelo
local eso significa procesar el prompt más despacio e invalidar más veces la caché. Qué extensiones
quieres depende de la tarea: un arreglo rápido, una sesión de desarrollo, una revisión de solo
lectura. `pi-here` hace esa elección explícita, barata de repetir y recordada por carpeta. Pi lee
extensiones y skills al arrancar, así que la decisión corresponde al lanzamiento, que es donde se
sitúa esta herramienta.

## Estado

Temprano (0.1.0). Lo que se ha ejercitado:

- 52 tests unitarios y de CLI (`npm test`), los de CLI contra binarios `ollama` y `pi` simulados.
- Las pantallas interactivas, manejadas a través de un pseudo-terminal (`npm run test:tui`).
- El reenvío `ollama launch pi -- --thinking <nivel>`, confirmado a mano en Pi 1.5.2 con Ollama.

Lo que **no** se ha verificado contra una instalación real: el resto de flags de Pi que emite esta
herramienta (`--tools`, `--no-extensions`, `--extension`, `--no-skills`, `--skill`,
`--no-context-files`, `--model` a través de `ollama launch`). Salen de la CLI documentada de Pi. Usa
`pi-here --dry-run` para ver antes el comando exacto y consulta
[Comprobar que funciona](#comprobar-que-funciona).

macOS y Linux. Windows sin probar.

## Instalación

Requisitos: [Node.js](https://nodejs.org) 20.12 o superior, el [agente de código Pi](https://pi.dev) y (con el
lanzador por defecto) [Ollama](https://ollama.com) con un modelo que Pi pueda usar. Todavía no está en npm,
así que desde un clon:

```sh
git clone https://github.com/fedeblock/pi-here.git
cd pi-here
npm install
npm link            # deja `pi-here` en tu PATH
pi-here --version   # comprobar
```

Actualizar: `git pull && npm install` en el clon. Quitar: `npm unlink -g pi-here`, y borra el clon y, si
quieres, `~/.config/pi-here/`.

## Uso

```sh
cd ~/proyectos/mi-proyecto
pi-here              # el preset por defecto (o el perfil guardado de esta carpeta)
pi-here review       # un preset por nombre
pi-here config       # elegir qué carga cada preset, sin lanzar
```

Todo lanzamiento empieza con la previsualización. Teclas en ella:

| Tecla | Hace |
|---|---|
| `Enter` | lanza exactamente lo que se ve |
| `p` | elegir otro preset |
| `e` | ajustar solo esta ejecución (modelo, thinking, herramientas, extensiones, skills); desaparece al salir de Pi |
| `s` | guardar lo que se ve como default de esta carpeta (se queda en pantalla) |
| `c` | configurar presets: cambiar lo que cargan, crear uno, fijar el default |
| `q`, `Esc` | cancelar (código de salida 130) |

### Elegir extensiones y skills

Pulsa `c`, elige un preset y luego **Extensiones** o **Skills**. Aparece una lista con todo lo
encontrado; marca lo que el preset debe cargar:

- todo marcado: descubrimiento normal de Pi, sin flags añadidos
- algunas marcadas: se apaga el descubrimiento y solo se pasan esas (`--no-extensions --extension ...`)
- ninguna marcada: no carga nada

La elección se guarda en el preset, así que vale para todas las carpetas. La misma lista está en `e`
para un cambio puntual. Si un preset no menciona extensiones, carga todo lo que Pi encuentre.

Qué lista:

- extensiones en `~/.pi/agent/extensions/` y `<proyecto>/.pi/extensions/` (un archivo `.ts`/`.js`, o
  una carpeta con `index.ts`/`index.js`/`package.json`), y skills en `~/.pi/agent/skills/` y
  `<proyecto>/.pi/skills/` (carpetas con un `SKILL.md`, o archivos `.md` sueltos)
- **Paquetes de Pi** instalados con `pi install`: los que aparecen en `packages` de
  `~/.pi/agent/settings.json` o `<proyecto>/.pi/settings.json`. Las extensiones y skills de cada
  paquete salen de la sección `pi` de su `package.json`, y las skills de un paquete se listan una a una.
  Solo se resuelven fuentes `npm:` y `git:`, en el sitio donde las deja `pi install`.

Se respeta `PI_CODING_AGENT_DIR`. Las rutas que escribiste a mano en la config se conservan.

En Pi 1.5.2, `--no-extensions` y `--no-skills` sí apagan lo que aportan los paquetes (comprobado a
mano con tres paquetes instalados), así que un preset que no marca un paquete lo deja fuera de verdad.
Al elegir la extensión de un paquete se pasa con `--extension` la ruta de su archivo de entrada, y Pi
cargó así `@narumitw/pi-plan-mode`. Las skills de un paquete (`--skill`) y
`@tsubus/pi-superpowers` se cargaron igual, y `/plan` de `pi-plan-mode` funcionó. `rpiv-advisor` aún no se ha probado a través de un preset.

### Línea de comandos

| Opción | Hace |
|---|---|
| `NOMBRE`, `-p NOMBRE`, `--preset NOMBRE` | parte de ese preset |
| `-y`, `--yes` | lanza sin la previsualización |
| `-n`, `--dry-run` | imprime el comando y sale |
| `--edit` | abre antes el editor |
| `--save` | guarda el perfil resuelto como default de esta carpeta |
| `--show` | imprime el perfil resuelto y el comando como JSON |
| `config` | elegir qué carga cada preset, sin lanzar |
| `config --add-suggested` | añade a tu config los [presets sugeridos](#los-presets) (nunca sustituye los tuyos) |
| `-- <args>` | todo lo que va tras `--` se añade al comando de Pi |

Sin terminal (scripts, CI) nunca pregunta nada: se comporta como si se hubiera dado `--yes`. El
código de salida es el de Pi. El idioma sigue a `LANG`; se fuerza con `PI_HERE_LANG=en|es`.

## Presets

| Preset | Para | Qué fija |
|---|---|---|
| `quick` (rápido) | tareas pequeñas, prompt mínimo | thinking `low`; sin skills |
| `build` (construir) | trabajo diario (default) | thinking `medium` |
| `review` (revisar) | auditar sin cambiar nada | thinking `high`; herramientas limitadas a `read, grep, find, ls` |

Ninguno restringe extensiones hasta que tú lo decidas. Edítalos con `c`, o añade los tuyos en el
archivo de configuración. Hay tres más, para paquetes de Pi, [sugeridos abajo](#extensiones-y-skills-sugeridas).

## Archivos

### `~/.config/pi-here/config.json` (global; se respeta `$XDG_CONFIG_HOME`)

`c` lo escribe por ti. A mano:

```json
{
  "launcher": "ollama",
  "ollamaArgs": [],
  "defaultPreset": "build",
  "presets": {
    "quick": {
      "thinking": "low",
      "extensions": { "mode": "only", "load": ["~/.pi/agent/extensions/permission-gate.ts"] },
      "skills": { "mode": "only", "load": [] }
    },
    "plan": { "thinking": "high", "tools": ["read", "grep", "find", "ls"] }
  }
}
```

| Clave | Significado |
|---|---|
| `launcher` | `"ollama"` ejecuta `ollama launch pi ...`; `"pi"` ejecuta `pi ...` directamente |
| `ollamaArgs` | argumentos extra para `ollama launch pi`, antes del `--` |
| `defaultPreset` | el que se usa en carpetas sin perfil guardado |
| `presets` | tus propios presets (mismos campos que un perfil); pueden sustituir a los integrados |

Hay un archivo completo en [`examples/config.example.json`](examples/config.example.json).

> **Si vienes de una versión anterior:** el ajuste `always` se eliminó. Pon las extensiones que
> quieras en cada preset. pi-here te avisa una vez por ejecución si aún encuentra la clave antigua; la
> próxima vez que cambies un ajuste con `c`, la clave desaparece del archivo.

### `<proyecto>/.pi/profile.json` (por carpeta)

Lo escribe `s` / `--save`. Al escribirlo a mano, todos los campos son opcionales.

| Campo | Valores |
|---|---|
| `model` | un nombre de modelo, o `null` para el que Pi tenga configurado |
| `thinking` | `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, o `null` |
| `tools` | `null` = todas, `[]` = ninguna, o una lista permitida como `["read","grep"]` |
| `extensions`, `skills` | `{"mode":"all"}` o `{"mode":"only","load":["ruta", ...]}` |
| `contextFiles` | `false` omite `AGENTS.md` / `CLAUDE.md` |
| `extraArgs` | se añaden tal cual al comando de Pi |

Súbelo al repositorio si el equipo debe compartirlo. Ver [`examples/profile.example.json`](examples/profile.example.json).

## Qué ejecuta

| Perfil | Flag de Pi |
|---|---|
| `thinking` | `--thinking <nivel>` |
| `tools` | `--tools a,b,c` o `--no-tools` |
| `extensions.mode: "only"` | `--no-extensions` y un `--extension <ruta>` por cada una |
| `skills.mode: "only"` | `--no-skills` y un `--skill <ruta>` por cada una |
| `contextFiles: false` | `--no-context-files` |
| `model` | `--model <nombre>` (a `ollama launch pi`, o a `pi` con `launcher: "pi"`) |

Con el lanzador por defecto el resultado se parece a
`ollama launch pi --model qwen3.8:27b -- --thinking low --no-extensions --extension /home/tu/.pi/agent/extensions/permission-gate.ts --no-skills`.

## Extensiones y skills sugeridas

`pi-here` no instala nada ni incluye extensiones: elige qué carga Pi. Si quieres un conjunto de partida,
estos son paquetes de la comunidad para Pi. **Lee el código de un paquete antes de instalarlo: las
extensiones se ejecutan con los permisos de tu usuario** (ver el [aviso legal](#aviso-legal)).

### Cómo se instalan

En la terminal, con el propio Pi (no con `pi-here`):

```sh
pi install npm:@narumitw/pi-plan-mode      # para todas las carpetas (se escribe en ~/.pi/agent/settings.json)
pi install -l npm:@narumitw/pi-plan-mode   # solo para la carpeta actual (se escribe en .pi/settings.json)
pi list                                    # qué hay instalado
pi remove npm:@narumitw/pi-plan-mode       # desinstalar
pi -e npm:@narumitw/pi-plan-mode           # probarlo en una ejecución sin instalarlo
```

Todo lo que se instala así se carga en **todas** las ejecuciones de Pi, con o sin `pi-here`. `pi-here` es la
forma de evitarlo: un preset que marca solo algunos (`c`) deja fuera el resto. Después:

```sh
pi-here config --add-suggested   # añade a tu config los presets de abajo; nunca sustituye uno que ya tengas
```

Imprime las líneas `pi install` de los paquetes que no encuentre en tu máquina.

### Qué se ha probado con `pi-here`

| Paquete | Preset | Qué aporta | Comprobado |
|---|---|---|---|
| [`@narumitw/pi-plan-mode`](https://www.npmjs.com/package/@narumitw/pi-plan-mode) | `plan` | `/plan`: modo de solo lectura donde el agente explora y escribe un plan de implementación antes de tocar ningún archivo | cargado con un preset, `/plan` funciona (Pi 1.5.2) |
| [`@tsubus/pi-superpowers`](https://www.npmjs.com/package/@tsubus/pi-superpowers) | `superpowers` | Superpowers, un método de desarrollo de software hecho de skills que el agente carga cuando aplican | extensión y skills cargadas con un preset (Pi 1.5.2) |
| [`@juicesharp/rpiv-advisor`](https://www.npmjs.com/package/@juicesharp/rpiv-advisor) | `advisor` | una herramienta `advisor`: el modelo pasa la conversación a un segundo modelo más fuerte y recibe un plan o una corrección; ese modelo lo eliges con `/advisor` | instalado, **aún no** ejecutado con un preset; el revisor puede ser una API de pago |

"Comprobado" significa visto funcionando en una máquina (macOS, Ollama, `qwen3.8:27b`), no una garantía para la
tuya. Que un modelo local de 27B siga bien estos flujos es otra cuestión que un preset no resuelve.

### Los presets

| Preset | Thinking | Carga |
|---|---|---|
| `plan` | high | solo `pi-plan-mode`; sin skills |
| `superpowers` | medium | solo la extensión de Superpowers y siete de sus skills |
| `advisor` | medium | solo `rpiv-advisor`; sin skills |

Ninguno carga nada más, así que añade con `c` las extensiones que quieras siempre (una puerta de permisos, por
ejemplo). Superpowers suma su lista de skills y una instrucción inicial a cada prompt, y un modelo local tiene que
procesarlas cada vez; por eso es un preset aparte y no parte del de uso diario.

### Skills de Superpowers

El paquete trae 15 skills. El preset marca las siete primeras; la lista de `c` las muestra todas, una a una.

| Skill | Para qué |
|---|---|
| `using-superpowers` | al empezar una conversación: cómo encontrar y usar las demás skills (la extensión se apoya en ella) |
| `brainstorming` | antes de cualquier trabajo creativo o función nueva: acordar qué construir |
| `writing-plans` | convertir una especificación en un plan paso a paso antes de tocar código |
| `executing-plans` | llevar a cabo un plan escrito en la sesión actual |
| `test-driven-development` | escribir primero la prueba y luego el código |
| `systematic-debugging` | hallar la causa de un fallo o de una prueba rota antes de proponer arreglos |
| `verification-before-completion` | ejecutar las comprobaciones y mirar el resultado antes de dar algo por hecho |
| `requesting-code-review`, `receiving-code-review` | pedir una revisión; recibir comentarios con rigor técnico |
| `subagent-driven-development`, `dispatching-parallel-agents` | repartir el trabajo entre subagentes; necesitan una extensión de subagentes |
| `using-git-worktrees`, `finishing-a-development-branch` | espacios de trabajo aislados; decidir cómo integrar el trabajo terminado |
| `writing-skills`, `diagnosing-superpowers` | escribir tus propias skills; averiguar por qué una sesión salió mal |

### Otros que merecen un vistazo (sin probar)

Se comprobó que cada uno existe en npm el 2026-11-12 (versión indicada); ninguno se ha probado con `pi-here`.

| Función | Paquete | Notas |
|---|---|---|
| Contención | [`pi-sandbox`](https://www.npmjs.com/package/pi-sandbox) 0.8.1 | sandbox a nivel de sistema operativo con avisos de permiso interactivos; candidato a sustituir guardas hechas a mano |
| Reparación de llamadas | [`pi-tool-repair`](https://www.npmjs.com/package/pi-tool-repair) 0.3.10 | corrige llamadas a herramientas mal formadas antes de ejecutarlas; útil con modelos locales pequeños |
| Deshacer | [`pi-rewind`](https://www.npmjs.com/package/pi-rewind) 0.5.0 | puntos de control y `/rewind`; última publicación en marzo de 2026 |
| Subagentes | [`@tintinweb/pi-subagents`](https://www.npmjs.com/package/@tintinweb/pi-subagents) 0.23.2 | con una sola GPU local, mantén la concurrencia en 1 |
| Búsqueda web | [`@blazer2k/searxng-suite`](https://www.npmjs.com/package/@blazer2k/searxng-suite) 0.2.3 | necesita una instancia de SearxNG propia |
| MCP | [`pi-mcp-adapter`](https://www.npmjs.com/package/pi-mcp-adapter) 7.0.1 | solo si usas servidores MCP |
| Toggles en sesión | [`@petechu/pi-extension-toggle`](https://www.npmjs.com/package/@petechu/pi-extension-toggle) 0.2.0 | activa y desactiva extensiones, skills, prompts y temas dentro de una sesión; se solapa en parte con esta herramienta |
| Gestor de skills | [`pi-skills-manager`](https://www.npmjs.com/package/pi-skills-manager) 0.2.0 | activa y desactiva skills desde un menú |

## Comprobar que funciona

Hazlo una vez en una carpeta de pruebas, porque varios flags no están verificados:

```sh
mkdir /tmp/prueba && cd /tmp/prueba
pi-here --dry-run                 # mira el comando
pi-here quick --dry-run           # tras elegir extensiones para `quick` con `c`
pi-here review                    # luego, en Pi: el pie debe mostrar el nivel de thinking
```

En el banner de arranque de Pi compara las listas de `[Extensions]` y de skills entre dos presets: lo
que un preset no marca debe faltar, y lo que marca debe estar. Si un preset de solo lectura esconde las
herramientas propias de una extensión, añade sus nombres a `tools`.

## Notas

- Cambiar extensiones o skills cambia el prompt de sistema, lo que invalida la caché del prompt del
  modelo. Decide al lanzar; cambia a mitad de sesión solo si es imprescindible.
- Con un modelo local de Ollama la caché también se pierde cuando el modelo se descarga (el
  `keep_alive` por defecto es de 5 minutos). Ajustar `OLLAMA_KEEP_ALIVE` en el servidor de Ollama es
  independiente de esta herramienta, pero importa tanto como ella.
- `ollama launch pi` gestiona las entradas de `models.json` de Pi marcadas con `_launch`. Usar
  `--model` a través de él puede reescribir esas entradas; Ollama pregunta antes de editar la
  configuración de la integración.
- `--tools` es una lista permitida. Si las herramientas que aportan las extensiones no están
  disponibles en un preset restringido, añade sus nombres a la lista.

## Desarrollo

```sh
npm install
npm test            # tests unitarios y de CLI, sin Pi ni Ollama
npm run test:tui    # maneja las pantallas interactivas con un pty (necesita python3)
```

Hoja de ruta: publicación en npm.

## Licencia

[MIT](LICENSE), © 2026 Federico Block.

## Aviso legal

`pi-here` se ofrece "tal cual", sin garantía de ningún tipo, y lo usas **bajo tu propia responsabilidad**. Los
autores no responden de daños, pérdida de datos, costes ni ninguna otra consecuencia de su uso; la
[licencia](LICENSE) MIT contiene las condiciones completas.

- Solo construye y ejecuta una línea de comandos. Lo que Pi, Ollama, un modelo o una extensión hagan después queda fuera de su control.
- Los agentes de código leen y modifican archivos y ejecutan comandos. Mantén tu trabajo bajo control de
  versiones y haz copia de lo que no puedas perder. Limitar herramientas o extensiones en un preset es una
  comodidad, no una barrera de seguridad.
- Los paquetes de terceros (incluidos los sugeridos aquí) los escriben otras personas, se ejecutan con los
  permisos de tu usuario y pueden cambiar en cualquier momento. Revísalos antes de instalarlos. Son
  sugerencias, no recomendaciones avaladas.
- Algunas herramientas o modelos que conectes (un advisor, un modelo en la nube) pueden enviar tu código a un
  tercero o tener coste.
- Este proyecto es independiente: no está afiliado ni respaldado por Pi, Ollama ni ningún autor de paquetes.
