# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commit Message Format

When making commits, do not include any author attribution or co-authored-by lines. Use a simple format:

```
<main commit message>
```

## Project Overview

NSDF 助手 is a Tampermonkey userscript that enhances the user experience on DeepFlood and NodeSeek forums. It uses a modular architecture where `main.js` serves as the entry point, fetching remote configuration and dynamically loading individual feature modules.

## Architecture

### Core Loading System

The script operates in three phases:

1. **Site Detection** (`main.js:28-49`): Identifies current site via `HOST_SITE_MAP` and creates immutable `siteInfo` object with site metadata and helper flags (`isDeepFlood`, `isNodeSeek`)

2. **Configuration & Caching** (`main.js:51-122`):
   - Fetches `modules/config.json` from GitHub raw URL via `fetchWithCache()`
   - Caches all remote content (config + module code) for 30 minutes using `GM_setValue` with `df_module_cache_*` keys
   - Cache structure: `{ data, timestamp }` stored as JSON string

3. **Module Loading & Registration** (`main.js:124-196`):
   - Each module is fetched and `eval()`'d
   - Modules call `window.DFRegisterModule()` to register themselves
   - Modules must export an object with: `id`, `name`, `description`, `settings`, `init()`
   - Module enabled state is stored via `GM_getValue('module_${id}_enabled')`

### Global DF Object

`window.DF` is the central API available to all modules:

- `DF.version`: Script version from GM_info
- `DF.modules`: Map of registered module definitions
- `DF.site`: Immutable site info (id, name, host, origin, isDeepFlood, isNodeSeek)
- `DF.getSiteUrl(path)`: Helper to construct absolute URLs for the current site
- `DF.registerModule(def)`: Called by modules to register themselves
- `DF.init()`: Initializes all enabled modules by calling their `init()` methods

### Module Structure

Each module lives in `modules/<moduleId>/` with:
- `index.js`: IIFE that defines and registers the module
- `README.md`: Module documentation
- Optional `style.css`: Loaded via `GM_addStyle` in the module

Module template:
```javascript
(function() {
    'use strict';
    const ModuleName = {
        id: 'moduleId',           // Must match directory name
        name: 'Display Name',
        description: 'Description',
        settings: {
            items: [],            // Config items for settings panel
            handleChange(id, value, utils) {}
        },
        init() {
            // Initialization logic
        }
    };
    window.DFRegisterModule(ModuleName);
})();
```

### Storage Convention

All GM storage keys use `df_` prefix (not `ns_`) to avoid conflicts with the original NSaide script. Common patterns:
- Module state: `df_signin_status`, `df_signin_last_date`
- Settings: `df_settings_autojump_enabled`
- Cache: `df_module_cache_${moduleId}`, `df_config_cache`

## Development Commands

### Syntax Checking
```bash
node --check main.js
node --check modules/<moduleId>/index.js
```

### Linting (requires setup)
```bash
npm install --save-dev eslint
npx eslint main.js modules/**/*.js --max-warnings=0
```

### Testing
No automated tests. Manual testing workflow:
1. Import `main.js` into Tampermonkey
2. Navigate to DeepFlood or NodeSeek
3. Open browser console and filter for `[DF助手]` logs
4. Clear Tampermonkey storage to force cache refresh: `GM_deleteValue(key)`

## Adding a New Module

1. Create directory: `modules/<newModuleId>/`
2. Create `modules/<newModuleId>/index.js` following the module template
3. Add entry to `modules/config.json`:
   ```json
   {
       "name": "Module Name",
       "id": "newModuleId",
       "url": "https://raw.githubusercontent.com/zen1zi/NSDF_Plus/main/modules/newModuleId/index.js"
   }
   ```
4. Ensure module ID matches directory name and config.json entry
5. Push to GitHub to make the module available via remote loading

## Site Compatibility

When a module needs site-specific behavior:

```javascript
if (window.DF.site.isDeepFlood) {
    // DeepFlood-specific code
} else if (window.DF.site.isNodeSeek) {
    // NodeSeek-specific code
}

// Or use helper to build site-appropriate URLs
const apiUrl = window.DF.getSiteUrl('/api/endpoint');
```

## Key Modules

- **settings**: Provides unified settings panel UI for all modules
- **autoSignIn**: Daily check-in automation with random/fixed timing modes
- **userCard**: Enhances user profile cards
- **editorEnhance**: Improves post editor functionality
- **contentPreview**: Adds content preview capabilities
- **autoPage**: Automatic pagination/infinite scroll

## Coding Standards

- Use `'use strict';` in all IIFEs
- Single quotes for strings
- 4-space indentation
- Console logs: Always prefix with `[DF助手]` for filtering
- Storage keys: Use `const` with `SCREAMING_SNAKE_CASE` for GM storage key names
- All storage keys must start with `df_` prefix

## Publishing

Before releasing:
1. Update `@version` in `main.js` userscript header
2. Update `"version"` in `modules/config.json`
3. Ensure `CONFIG_URL` in `main.js` points to correct GitHub raw URL
4. Test module loading by clearing cache in Tampermonkey storage
5. Verify all modules load without console errors on both DeepFlood and NodeSeek
