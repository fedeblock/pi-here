const en = {
  intro: 'pi-here · {folder}',
  keys: '↵ launch · p preset · e edit this run · s save for this folder · c configure · q quit',
  launching: 'Launching Pi…',
  cancelled: 'Cancelled.',
  saved: 'Saved as the default for this folder: {path}',
  pickPreset: 'Preset',

  'title.folder': '{name} · default for this folder',
  'title.default': '{name} · default',
  'title.custom': 'Edited for this run',

  'preset.quick': 'quick',
  'preset.quick.desc': 'Lower thinking, no skills in the prompt',
  'preset.build': 'build',
  'preset.build.desc': 'Everyday work: medium thinking',
  'preset.review': 'review',
  'preset.review.desc': 'Read-only tools, high thinking',
  'preset.custom': 'custom',

  'label.model': 'Model',
  'label.thinking': 'Thinking',
  'label.tools': 'Tools',
  'label.extensions': 'Extensions',
  'label.skills': 'Skills',
  'label.command': 'Command',

  'val.piDefault': 'Pi default',
  'val.all': 'all',
  'val.allDiscovered': 'all (Pi default discovery)',
  'val.allFound': 'all ({n} found)',
  'val.noneFound': 'none found',
  'val.none': 'none',
  'val.ofFound': '{list}  ({k} of {n})',

  'edit.title': 'Edit — applies to this run only',
  'edit.presetTitle': 'Preset "{name}" — saved for every folder',
  'edit.done': 'Done — apply and go back',
  'edit.model': 'Model',
  'edit.thinking': 'Thinking level',
  'edit.tools': 'Tools',
  'opt.piDefault': 'Pi default',
  'opt.otherModel': 'Other…',
  'opt.modelName': 'Model name',
  'opt.toolsAll': 'All tools',
  'opt.toolsReadOnly': 'Read-only (read, grep, find, ls)',
  'opt.toolsNone': 'No tools',
  'pick.extensions': 'Extensions to load — space ticks/unticks, Enter confirms',
  'pick.skills': 'Skills to load — space ticks/unticks, Enter confirms',
  'none.extensions': 'No extensions found in ~/.pi/agent/extensions or .pi/extensions. Packages installed with "pi install" are not listed here.',
  'none.skills': 'No skills found in ~/.pi/agent/skills or .pi/skills. Packages installed with "pi install" are not listed here.',

  'conf.intro': 'pi-here · configure',
  'conf.title': 'Configure — pick a preset to change what it loads',
  'conf.new': 'New preset…',
  'conf.newName': 'Name for the new preset',
  'conf.nameBad': 'Use letters, digits, "-", "_" or "."; "config" is reserved',
  'conf.nameTaken': 'A preset with that name already exists',
  'conf.default': 'Default preset',
  'conf.launcher': 'Launcher',
  'conf.launcher.ollama': 'ollama launch pi -- …',
  'conf.launcher.pi': 'pi … (directly)',
  'conf.back': 'Done',
  'conf.done': 'Stored in {path}',

  'legacy.always': 'the "always" setting in your config is no longer used. Tick the extensions you want in each preset instead (press c).',

  'err.launcherNotFound': 'Command not found: {cmd}. Install it, or set "launcher" in {path}.',
  'err.unknownOption': 'Unknown option: {opt}',
  'err.missingValue': 'Option {opt} needs a value',
  'err.extraArg': 'Unexpected argument: {arg}',
  'sug.added': 'Added presets: {names}',
  'sug.none': 'Nothing to add.',
  'sug.skipped': 'Left as they were (already in your config): {names}',
  'sug.missing': 'Not installed yet: run  pi install npm:{pkg}',

  usage: `pi-here — per-folder launcher for the Pi coding agent

Usage:
  pi-here                  preview and launch the default for this folder
  pi-here PRESET           preview and launch a preset (quick, build, review, yours)
  pi-here config           choose what each preset loads
  pi-here [...] -- <args>  arguments after "--" are appended to the Pi command

Options:
  -y, --yes           Launch without asking
  -n, --dry-run       Print the command and exit
  -p, --preset NAME   Same as the PRESET argument
      --edit          Open the editor first
      --save          Save the resolved profile as this folder's default
      --add-suggested With config: add the plan, superpowers and advisor presets
      --add-suggested With config: add the plan, superpowers and advisor presets
      --show          Print the resolved profile and command as JSON
  -h, --help          Show this help
  -v, --version       Show the version`,
};

const es = {
  intro: 'pi-here · {folder}',
  keys: '↵ lanzar · p perfil · e editar esta ejecución · s guardar para esta carpeta · c configurar · q salir',
  launching: 'Lanzando Pi…',
  cancelled: 'Cancelado.',
  saved: 'Guardado como default de esta carpeta: {path}',
  pickPreset: 'Perfil',

  'title.folder': '{name} · default de esta carpeta',
  'title.default': '{name} · default',
  'title.custom': 'Editado para esta ejecución',

  'preset.quick': 'rápido',
  'preset.quick.desc': 'Menos thinking, sin skills en el prompt',
  'preset.build': 'construir',
  'preset.build.desc': 'Trabajo diario: thinking medio',
  'preset.review': 'revisar',
  'preset.review.desc': 'Herramientas de solo lectura, thinking alto',
  'preset.custom': 'personalizado',

  'label.model': 'Modelo',
  'label.thinking': 'Thinking',
  'label.tools': 'Herramientas',
  'label.extensions': 'Extensiones',
  'label.skills': 'Skills',
  'label.command': 'Comando',

  'val.piDefault': 'el de Pi',
  'val.all': 'todas',
  'val.allDiscovered': 'todas (descubrimiento normal de Pi)',
  'val.allFound': 'todas ({n} encontradas)',
  'val.noneFound': 'ninguna encontrada',
  'val.none': 'ninguna',
  'val.ofFound': '{list}  ({k} de {n})',

  'edit.title': 'Editar — vale solo para esta ejecución',
  'edit.presetTitle': 'Perfil "{name}" — se guarda para todas las carpetas',
  'edit.done': 'Listo — aplicar y volver',
  'edit.model': 'Modelo',
  'edit.thinking': 'Nivel de thinking',
  'edit.tools': 'Herramientas',
  'opt.piDefault': 'El de Pi',
  'opt.otherModel': 'Otro…',
  'opt.modelName': 'Nombre del modelo',
  'opt.toolsAll': 'Todas las herramientas',
  'opt.toolsReadOnly': 'Solo lectura (read, grep, find, ls)',
  'opt.toolsNone': 'Sin herramientas',
  'pick.extensions': 'Extensiones a cargar — espacio marca/desmarca, Enter confirma',
  'pick.skills': 'Skills a cargar — espacio marca/desmarca, Enter confirma',
  'none.extensions': 'No hay extensiones en ~/.pi/agent/extensions ni en .pi/extensions. Los paquetes instalados con "pi install" no se listan aquí.',
  'none.skills': 'No hay skills en ~/.pi/agent/skills ni en .pi/skills. Los paquetes instalados con "pi install" no se listan aquí.',

  'conf.intro': 'pi-here · configurar',
  'conf.title': 'Configurar — elige un perfil para cambiar lo que carga',
  'conf.new': 'Nuevo perfil…',
  'conf.newName': 'Nombre del nuevo perfil',
  'conf.nameBad': 'Usa letras, dígitos, "-", "_" o "."; "config" está reservado',
  'conf.nameTaken': 'Ya existe un perfil con ese nombre',
  'conf.default': 'Perfil por defecto',
  'conf.launcher': 'Lanzador',
  'conf.launcher.ollama': 'ollama launch pi -- …',
  'conf.launcher.pi': 'pi … (directamente)',
  'conf.back': 'Listo',
  'conf.done': 'Guardado en {path}',

  'legacy.always': 'el ajuste "always" de tu configuración ya no se usa. Marca las extensiones que quieras en cada perfil (pulsa c).',

  'err.launcherNotFound': 'Comando no encontrado: {cmd}. Instálalo o define "launcher" en {path}.',
  'err.unknownOption': 'Opción desconocida: {opt}',
  'err.missingValue': 'La opción {opt} necesita un valor',
  'err.extraArg': 'Argumento inesperado: {arg}',
  'sug.added': 'Presets añadidos: {names}',
  'sug.none': 'Nada que añadir.',
  'sug.skipped': 'Se dejan como estaban (ya existen en tu config): {names}',
  'sug.missing': 'Aún no instalado: ejecuta  pi install npm:{pkg}',

  usage: `pi-here — lanzador por carpeta para el agente Pi

Uso:
  pi-here                  vista previa y lanzamiento del default de esta carpeta
  pi-here PERFIL           vista previa y lanzamiento de un perfil (quick, build, review, los tuyos)
  pi-here config           elige qué carga cada perfil
  pi-here [...] -- <args>  los argumentos tras "--" se añaden al comando de Pi

Opciones:
  -y, --yes           Lanza sin preguntar
  -n, --dry-run       Imprime el comando y sale
  -p, --preset NOMBRE Igual que el argumento PERFIL
      --edit          Abre primero el editor
      --save          Guarda el perfil resuelto como default de esta carpeta
      --add-suggested Con config: añade los presets plan, superpowers y advisor
      --show          Imprime el perfil resuelto y el comando en JSON
  -h, --help          Muestra esta ayuda
  -v, --version       Muestra la versión`,
};

export const messages = { en, es };

export function detectLang(env = process.env) {
  const v = env.PI_HERE_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  return v.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function makeT(lang = 'en') {
  const dict = messages[lang] ?? en;
  const t = (key, vars = {}) =>
    String(dict[key] ?? en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  t.has = (key) => key in dict || key in en;
  return t;
}
