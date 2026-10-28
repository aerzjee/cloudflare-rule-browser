export interface TranslationDictionary {
  common: {
    cancel: string
    save: string
    saving: string
    saved: string
    close: string
    done: string
    delete: string
    clear: string
    copied: string
    refresh: string
    loading: string
    actions: string
    error: string
    account: string
    zone: string
    all: string
  }
  landing: {
    title: string
    titleHighlight: string
    subtitle: string
    emailLabel: string
    emailPlaceholder: string
    tokenLabel: string
    tokenPlaceholder: string
    tokenDetected: (type: string) => string
    tokenAutoDetect: string
    showToken: string
    hideToken: string
    accountLevelOnly: string
    accountLevelOnlyDesc: string
    connectButton: string
    emailRequired: string
    emailInvalid: string
    tokenRequired: string
    tokenMin: string
    footerEncrypted: string
    footerProxy: string
    footerCsp: string
    footerZeroData: string
    advancedProxy: string
    proxyUrlLabel: string
    proxyUrlPlaceholder: string
    proxyUrlHelper: string
    proxyUrlGitHubNotice: string
    resetProxy: string
    rememberSessionLabel: string
    rememberSessionDesc: string
    sessionExpiredInactivity: string
    verifying: string
  }
  navbar: {
    title: string
    subtitle: string
    proxyStatus: string
    secureCsp: string
    accountLevel: string
    allZones: string
    settingsTooltip: string
    settingsTooltipWithRefresh: (interval: string, mode: string) => string
    changelogTooltip: string
    logout: string
    toggleTheme: string
    light: string
    dark: string
    language: string
    versionBadgeTitle: (version: string, commit: string) => string
  }
  autoRefresh: {
    auto: string
    syncing: string
    lastRefresh: (time: string) => string
    mode: (mode: string) => string
    never: string
    nextIn: (seconds: number) => string
    openConfig: string
    quickSync: string
    fullSync: string
  }
  dashboard: {
    badgeAccount: string
    badgeZones: string
    heroTitle: string
    heroTitleHighlight: string
    heroDescription: string
    statTotal: string
    statTotalDesc: string
    statBlock: string
    statBlockDesc: string
    statAllow: string
    statAllowDesc: string
    statChallenge: string
    statChallengeDesc: string
    rulesUnit: string
  }
  table: {
    searchPlaceholder: string
    clearSearch: string
    filterModeAria: string
    allModes: string
    filterScopeAria: string
    allScopes: string
    accountOnly: string
    zoneOnly: string
    deleteSelected: (count: number) => string
    foundRules: (filtered: number, total: number) => string
    selectedCount: (count: number) => string
    clearFilters: string
    colScope: string
    colTargetValue: string
    colMode: string
    colNotes: string
    colCreated: string
    colActions: string
    entireAccount: string
    cloudflareZone: string
    emptyTitle: string
    emptyDesc: string
    page: string
    of: string
    rowsPerPage: string
    firstPage: string
    prevPage: string
    nextPage: string
    lastPage: string
    deleteRule: string
    copyValue: string
  }
  noteEditor: {
    placeholder: string
    saveTooltip: string
    cancelTooltip: string
    clickToEdit: string
    addNote: string
    maxChars: string
    saveError: string
  }
  modeDropdown: {
    clickToChange: string
    saving: string
    saved: string
    custom: string
    modes: {
      block: { label: string; desc: string }
      managed_challenge: { label: string; desc: string }
      js_challenge: { label: string; desc: string }
      challenge: { label: string; desc: string }
      whitelist: { label: string; desc: string }
    }
  }
  bulk: {
    regionLabel: string
    ruleSelected: (count: number) => string
    deselect: string
    delete: (count: number) => string
  }
  deleteModal: {
    titleSingle: string
    titleBulk: (count: number) => string
    subtitle: string
    warningSingle: string
    warningBulk: (count: number) => string
    targetLabel: string
    scopeLabel: string
    ruleIdLabel: string
    progressLabel: (current: number, total: number, success: number, failed: number) => string
    completedAll: (count: number) => string
    completedPartial: (success: number, failed: number) => string
    confirmDelete: string
    confirmDeleteBulk: (count: number) => string
    deleting: string
    errorsHeading: string
    errorAccountMissing: string
    errorZoneMissing: string
  }
  settings: {
    title: string
    subtitle: string
    languageTitle: string
    languageDesc: string
    concurrencyTitle: string
    threads: (count: number) => string
    optimum: string
    concurrencyInfo: string
    autoRefreshTitle: string
    active: string
    intervalDisabled: string
    interval30s: string
    interval1m: string
    interval5m: string
    interval10m: string
    refreshModeTitle: string
    deltaTitle: string
    deltaDesc: string
    fullTitle: string
    fullDesc: string
    restoreDefaults: string
    done: string
    save: string
    cancel: string
    hasUnsaved: string
    proxyTitle: string
    proxyDesc: string
    inactivityTitle: string
    inactivityDesc: string
    inactivityDisabled: string
    inactivity15m: string
    inactivity30m: string
    inactivity60m: string
  }
  profile: {
    signedInAs: string
    accessScope: string
    theme: string
    light: string
    dark: string
    language: string
    settings: string
    logout: string
    authTypeBearer: string
    authTypeKey: string
    menuAria: string
  }
  rateLimit: {
    badge: string
    apiQuota: string
    requestsRemaining: (remaining: number, limit: number) => string
    resetIn: (seconds: number) => string
    tooltipTitle: string
    window5m: string
  }
  changelog: {
    title: string
    subtitle: (total: number, releases: number, commit: string) => string
    all: (count: number) => string
    unreleased: string
    generatedFromGit: string
    copyCommit: string
    copied: string
  }
  api: {
    initAccounts: string
    noAccounts: string
    fetchingAccountRules: string
    fetchingAccountRulesPage: (page: number, total: number) => string
    accountRulesFetched: (count: number) => string
    initZones: string
    noZonesAccountFallback: string
    zonesFetched: (count: number) => string
    startingZonesFetch: (zones: number, concurrency: number) => string
    zoneRulesProgress: (completed: number, total: number, rules: number) => string
    allZonesCompleted: (rules: number) => string
    rulesLoadedIndexedDb: (count: number) => string
    initFetch: string
    forcedRefresh: string
    rulesLoaded: (count: number) => string
    fetchError: string
  }
}

export const translations: Record<'en' | 'pl', TranslationDictionary> = {
  en: {
    common: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved',
      close: 'Close',
      done: 'Done',
      delete: 'Delete',
      clear: 'Clear',
      copied: 'Copied',
      refresh: 'Refresh',
      loading: 'Loading...',
      actions: 'Actions',
      error: 'Error',
      account: 'Account',
      zone: 'Zone',
      all: 'All',
    },
    landing: {
      title: 'Cloudflare',
      titleHighlight: 'Rule Browser',
      subtitle:
        'Connect to your Cloudflare account to inspect and manage WAF, Firewall, and Cache access rules.',
      emailLabel: 'Cloudflare Account Email',
      emailPlaceholder: 'user@example.com',
      tokenLabel: 'API Token / Global API Key',
      tokenPlaceholder: 'Paste Bearer token or Global API Key...',
      tokenDetected: (type) =>
        `Detected type: ${type === 'bearer' ? 'Bearer API Token' : 'Global API Key'}`,
      tokenAutoDetect: 'Automatically detecting key type',
      showToken: 'Show token',
      hideToken: 'Hide token',
      accountLevelOnly: 'Account Level Only',
      accountLevelOnlyDesc:
        'Fetch only account-level rules without querying individual zones',
      connectButton: 'Connect to Cloudflare',
      emailRequired: 'Email address is required',
      emailInvalid: 'Please enter a valid email address',
      tokenRequired: 'API Token or Global Key is required',
      tokenMin: 'Token must have at least 6 characters',
      footerEncrypted: 'Token encrypted in localStorage',
      footerProxy: 'Secure Proxy: /api/cf',
      footerCsp: 'Strict CSP compliance',
      footerZeroData: 'Zero telemetry, direct API proxy',
      advancedProxy: 'Advanced / Proxy Endpoint',
      proxyUrlLabel: 'CORS Proxy Endpoint',
      proxyUrlPlaceholder: 'https://cf-proxy.yourdomain.workers.dev/api/cf',
      proxyUrlHelper: 'Relative path (/api/cf for Hono/Docker) or external HTTPS Cloudflare Worker / Hono URL',
      proxyUrlGitHubNotice:
        'GitHub Pages is a static host. Provide an external CORS proxy endpoint (e.g. Cloudflare Worker or Hono micro-server) to connect to Cloudflare API.',
      resetProxy: 'Reset to default (/api/cf)',
      rememberSessionLabel: 'Remember session on this device',
      rememberSessionDesc:
        'When disabled, credentials are stored in volatile memory and destroyed upon closing the browser tab.',
      sessionExpiredInactivity:
        'Session expired due to inactivity. For your security, credentials and cached rules were cleared.',
      verifying: 'Verifying credentials...',
    },
    navbar: {
      title: 'Cloudflare Rule Browser',
      subtitle: 'WAF, Page Shield, Firewall & Cache Rules Inspector',
      proxyStatus: 'Proxy: /api/cf',
      secureCsp: 'Secure CSP',
      accountLevel: 'Account Level',
      allZones: 'All Zones',
      settingsTooltip: 'Application Settings',
      settingsTooltipWithRefresh: (interval, mode) =>
        `Settings (Auto-Refresh: every ${interval}, mode: ${mode})`,
      changelogTooltip: 'View changelog',
      logout: 'Log out',
      toggleTheme: 'Toggle theme',
      light: 'Light',
      dark: 'Dark',
      language: 'Language',
      versionBadgeTitle: (version, commit) =>
        `Version: ${version}, Commit: ${commit}`,
    },
    autoRefresh: {
      auto: 'Auto:',
      syncing: 'Sync...',
      lastRefresh: (time) => `Last refresh: ${time}`,
      mode: (mode) => `Mode: ${mode}`,
      never: 'None (awaiting sync)',
      nextIn: (seconds) => `Next in: ${seconds}s`,
      openConfig: 'Click to open configuration',
      quickSync: 'Quick 1st Page (Delta)',
      fullSync: 'Full Sync',
    },
    dashboard: {
      badgeAccount: 'Account Level Mode',
      badgeZones: 'All Zones Mode',
      heroTitle: 'Cloudflare',
      heroTitleHighlight: 'Access Rules',
      heroDescription:
        'Inspect, filter, and manage Cloudflare IP Access Rules across your account and zones.',
      statTotal: 'Total Rules',
      statTotalDesc: 'Active in Cloudflare WAF',
      statBlock: 'Block Rules',
      statBlockDesc: 'Traffic denied at edge',
      statAllow: 'Allow / Whitelist',
      statAllowDesc: 'Bypass security checks',
      statChallenge: 'Challenges',
      statChallengeDesc: 'Managed & JS Challenges',
      rulesUnit: 'rules',
    },
    table: {
      searchPlaceholder: 'Search by IP, domain, note...',
      clearSearch: 'Clear search',
      filterModeAria: 'Filter by action mode',
      allModes: 'All actions',
      filterScopeAria: 'Filter by scope',
      allScopes: 'All scopes',
      accountOnly: 'Account rules only',
      zoneOnly: 'Zone rules only',
      deleteSelected: (count) => `Delete selected (${count})`,
      foundRules: (filtered, total) =>
        filtered === total
          ? `Found: ${filtered} rules`
          : `Found: ${filtered} rules (of ${total} total)`,
      selectedCount: (count) => `Selected: ${count}`,
      clearFilters: 'Clear filters',
      colScope: 'Domain / Scope',
      colTargetValue: 'Target / Value',
      colMode: 'Action / Mode',
      colNotes: 'Notes',
      colCreated: 'Created On',
      colActions: 'Actions',
      entireAccount: 'Entire Account',
      cloudflareZone: 'Cloudflare Zone',
      emptyTitle: 'No rules found',
      emptyDesc: 'Try adjusting your search criteria or filters.',
      page: 'Page',
      of: 'of',
      rowsPerPage: 'Rows per page:',
      firstPage: 'First page',
      prevPage: 'Previous page',
      nextPage: 'Next page',
      lastPage: 'Last page',
      deleteRule: 'Delete rule',
      copyValue: 'Copy value',
    },
    noteEditor: {
      placeholder: 'Enter note (max 500 chars)...',
      saveTooltip: 'Save note (Enter)',
      cancelTooltip: 'Cancel (Esc)',
      clickToEdit: 'Click to add / edit note',
      addNote: 'Add a note...',
      maxChars: 'Note cannot exceed 500 characters.',
      saveError: 'Error saving note.',
    },
    modeDropdown: {
      clickToChange: 'Click to change rule action (inline edit)',
      saving: 'Saving...',
      saved: 'Saved',
      custom: 'Custom mode',
      modes: {
        block: {
          label: 'Block',
          desc: 'Block all matching traffic',
        },
        managed_challenge: {
          label: 'Managed Challenge',
          desc: 'Cloudflare managed challenge',
        },
        js_challenge: {
          label: 'JS Challenge',
          desc: 'Invisible JavaScript test',
        },
        challenge: {
          label: 'Legacy CAPTCHA',
          desc: 'Interactive CAPTCHA challenge',
        },
        whitelist: {
          label: 'Allow / Whitelist',
          desc: 'Allow access without challenge',
        },
      },
    },
    bulk: {
      regionLabel: 'Bulk action bar',
      ruleSelected: (count) => (count === 1 ? 'rule selected' : 'rules selected'),
      deselect: 'Deselect',
      delete: (count) => `Delete (${count})`,
    },
    deleteModal: {
      titleSingle: 'Delete access rule',
      titleBulk: (count) => `Delete ${count} selected rules`,
      subtitle: 'Confirm deletion in Cloudflare',
      warningSingle:
        'Are you sure you want to permanently delete this rule from Cloudflare? This action cannot be undone.',
      warningBulk: (count) =>
        `Are you sure you want to delete ${count} selected rules? Deletions will run with concurrency control.`,
      targetLabel: 'Target / Value',
      scopeLabel: 'Scope',
      ruleIdLabel: 'Rule ID',
      progressLabel: (current, total, success, failed) =>
        `Deleting rules: ${current} / ${total} (Success: ${success}, Errors: ${failed})...`,
      completedAll: (count) => `All ${count} rules deleted successfully.`,
      completedPartial: (success, failed) =>
        `Completed with errors: ${success} deleted, ${failed} failed.`,
      confirmDelete: 'Delete rule',
      confirmDeleteBulk: (count) => `Delete ${count} rules`,
      deleting: 'Deleting...',
      errorsHeading: 'Errors during deletion:',
      errorAccountMissing: 'Missing accountId for account rule',
      errorZoneMissing: 'Missing zoneId for zone rule',
    },
    settings: {
      title: 'Application Settings',
      subtitle:
        'Customize language, performance, threads, and synchronization',
      languageTitle: 'Language / Język',
      languageDesc: 'Choose interface language (English or Polish)',
      concurrencyTitle: 'API Concurrency',
      threads: (count) => `Threads: ${count}`,
      optimum: 'optimal',
      concurrencyInfo:
        'Value 2 is default and optimal for Cloudflare API rate limits (1200 req / 5 min). Higher values speed up large accounts but may trigger HTTP 429.',
      autoRefreshTitle: 'Auto-Refresh',
      active: 'Active',
      intervalDisabled: 'Disabled',
      interval30s: '30 sec.',
      interval1m: '1 min.',
      interval5m: '5 min.',
      interval10m: '10 min.',
      refreshModeTitle: 'Refresh Mode',
      deltaTitle: 'Quick 1st Page (Delta)',
      deltaDesc:
        'Delta Sync – fetches only 1st page (100 newest rules). Fast, saves API rate limits.',
      fullTitle: 'Full Sync',
      fullDesc:
        'Full Sync – re-fetches all pages for all zones and accounts.',
      restoreDefaults: 'Restore defaults',
      done: 'Done',
      save: 'Save',
      cancel: 'Cancel',
      hasUnsaved: 'Unsaved changes',
      proxyTitle: 'CORS Proxy Endpoint',
      proxyDesc:
        'Reverse proxy URL (/api/cf for Hono/Docker or external HTTPS Cloudflare Worker URL)',
      inactivityTitle: 'Inactivity Auto-Logout (Auto-Lock)',
      inactivityDesc:
        'Automatically purge stored credentials and cached data after user inactivity.',
      inactivityDisabled: 'Disabled',
      inactivity15m: '15 min.',
      inactivity30m: '30 min. (Recommended)',
      inactivity60m: '60 min.',
    },
    profile: {
      signedInAs: 'Signed in as',
      accessScope: 'Access Scope',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      language: 'Language',
      settings: 'Settings',
      logout: 'Log out',
      authTypeBearer: 'API Token',
      authTypeKey: 'Global Key',
      menuAria: 'User account and preferences menu',
    },
    rateLimit: {
      badge: 'API',
      apiQuota: 'API Quota',
      requestsRemaining: (remaining, limit) => `${remaining} / ${limit} requests remaining`,
      resetIn: (seconds) => `Reset in: ${seconds}s`,
      tooltipTitle: 'Cloudflare API Rate Limit',
      window5m: '5 min window',
    },
    changelog: {
      title: 'Changelog',
      subtitle: (total, releases, commit) =>
        `Recorded ${total} changes in ${releases} release(s) • commit: ${commit}`,
      all: (count) => `All (${count})`,
      unreleased: '(Recent commits on HEAD)',
      generatedFromGit: 'Generated automatically from Git history',
      copyCommit: 'Copy commit hash',
      copied: 'Copied',
    },
    api: {
      initAccounts: 'Fetching Cloudflare accounts...',
      noAccounts: 'No Cloudflare accounts available for current token.',
      fetchingAccountRules: 'Fetching account rules...',
      fetchingAccountRulesPage: (page, total) =>
        `Fetching account rules (page ${page} of ${total})...`,
      accountRulesFetched: (count) => `Fetched ${count} account rules.`,
      initZones: 'Fetching domains list...',
      noZonesAccountFallback: 'No domains found. Fetching account-level rules...',
      zonesFetched: (count) => `Fetched ${count} rules.`,
      startingZonesFetch: (zones, concurrency) =>
        `Starting rule fetch for ${zones} domains (concurrency: ${concurrency})...`,
      zoneRulesProgress: (completed, total, rules) =>
        `Fetched rules for ${completed} of ${total} domains (${rules} rules)...`,
      allZonesCompleted: (rules) =>
        `Completed fetching rules for all domains (${rules} rules).`,
      rulesLoadedIndexedDb: (count) =>
        `Loaded ${count} rules from IndexedDB cache.`,
      initFetch: 'Initializing Cloudflare rule fetch...',
      forcedRefresh: 'Forced refresh from Cloudflare API...',
      rulesLoaded: (count) => `Loaded ${count} rules.`,
      fetchError: 'Error while fetching rules',
    },
  },
  pl: {
    common: {
      cancel: 'Anuluj',
      save: 'Zapisz',
      saving: 'Zapisywanie...',
      saved: 'Zapisano',
      close: 'Zamknij',
      done: 'Gotowe',
      delete: 'Usuń',
      clear: 'Wyczyść',
      copied: 'Skopiowano',
      refresh: 'Odśwież',
      loading: 'Ładowanie...',
      actions: 'Akcje',
      error: 'Błąd',
      account: 'Konto',
      zone: 'Strefa',
      all: 'Wszystkie',
    },
    landing: {
      title: 'Cloudflare',
      titleHighlight: 'Rule Browser',
      subtitle:
        'Połącz się ze swoim kontem Cloudflare, aby przeglądać i zarządzać regułami WAF, Firewall i Cache.',
      emailLabel: 'E-mail konta Cloudflare',
      emailPlaceholder: 'user@example.com',
      tokenLabel: 'API Token / Global API Key',
      tokenPlaceholder: 'Wklej token Bearer lub Global API Key...',
      tokenDetected: (type) =>
        `Wykryty typ: ${type === 'bearer' ? 'Bearer API Token' : 'Global API Key'}`,
      tokenAutoDetect: 'Automatycznie wykrywamy typ klucza',
      showToken: 'Pokaż token',
      hideToken: 'Ukryj token',
      accountLevelOnly: 'Account Level Only',
      accountLevelOnlyDesc:
        'Pobieraj tylko zasoby na poziomie konta (bez listowania poszczególnych stref)',
      connectButton: 'Połącz z Cloudflare',
      emailRequired: 'Adres e-mail jest wymagany',
      emailInvalid: 'Podaj prawidłowy adres e-mail',
      tokenRequired: 'Token / klucz API jest wymagany',
      tokenMin: 'Token musi mieć co najmniej 6 znaków',
      footerEncrypted: 'Token szyfrowany w localStorage',
      footerProxy: 'Bezpieczne Proxy: /api/cf',
      footerCsp: 'Restrykcyjne CSP',
      footerZeroData: 'Zero danych wysyłanych na serwer',
      advancedProxy: 'Zaawansowane / Endpoint Proxy',
      proxyUrlLabel: 'Punkt końcowy Proxy CORS',
      proxyUrlPlaceholder: 'https://cf-proxy.twojadomena.workers.dev/api/cf',
      proxyUrlHelper: 'Ścieżka relatywna (/api/cf dla Hono/Docker) lub zewnętrzny adres HTTPS Cloudflare Worker / Hono',
      proxyUrlGitHubNotice:
        'GitHub Pages serwuje pliki statyczne. Do połączenia z Cloudflare API wymagany jest zewnętrzny endpoint proxy CORS (np. darmowy Cloudflare Worker lub serwer Hono).',
      resetProxy: 'Przywróć domyślne (/api/cf)',
      rememberSessionLabel: 'Zapamiętaj sesję na tym urządzeniu',
      rememberSessionDesc:
        'Gdy opcja jest wyłączona, token przechowywany jest wyłącznie w pamięci ulotnej i niszczony po zamknięciu karty przeglądarki.',
      sessionExpiredInactivity:
        'Sesja wygasła z powodu bezczynności. Dla Twojego bezpieczeństwa poświadczenia oraz reguły z pamięci podręcznej zostały usunięte.',
      verifying: 'Weryfikacja poświadczeń...',
    },
    navbar: {
      title: 'Cloudflare Rule Browser',
      subtitle: 'WAF, Page Shield, Firewall & Cache Rules Inspector',
      proxyStatus: 'Proxy: /api/cf',
      secureCsp: 'Bezpieczne CSP',
      accountLevel: 'Poziom konta',
      allZones: 'Wszystkie domeny',
      settingsTooltip: 'Konfiguracja aplikacji',
      settingsTooltipWithRefresh: (interval, mode) =>
        `Ustawienia (Auto-Refresh: co ${interval}, tryb: ${mode})`,
      changelogTooltip: 'Zobacz historię zmian (Changelog)',
      logout: 'Wyloguj',
      toggleTheme: 'Przełącz motyw',
      light: 'Jasny',
      dark: 'Ciemny',
      language: 'Język',
      versionBadgeTitle: (version, commit) =>
        `Wersja: ${version}, Commit: ${commit}`,
    },
    autoRefresh: {
      auto: 'Auto:',
      syncing: 'Sync...',
      lastRefresh: (time) => `Ostatnie odświeżenie: ${time}`,
      mode: (mode) => `Tryb: ${mode}`,
      never: 'Brak (oczekiwanie)',
      nextIn: (seconds) => `Następne za: ${seconds}s`,
      openConfig: 'Kliknij, aby zmienić konfigurację',
      quickSync: 'Quick 1st Page (Delta)',
      fullSync: 'Pełna synchronizacja',
    },
    dashboard: {
      badgeAccount: 'Tryb poziomu konta (Account Level)',
      badgeZones: 'Tryb wszystkich domen (All Zones)',
      heroTitle: 'Cloudflare',
      heroTitleHighlight: 'Access Rules',
      heroDescription:
        'Przeglądaj, filtruj i zarządzaj regułami IP Access Rules Cloudflare dla konta i domen.',
      statTotal: 'Wszystkie reguły',
      statTotalDesc: 'Aktywne w Cloudflare WAF',
      statBlock: 'Blokady (Block)',
      statBlockDesc: 'Ruch odrzucany na brzegu',
      statAllow: 'Dozwolone (Allow)',
      statAllowDesc: 'Dostęp bez weryfikacji',
      statChallenge: 'Testy (Challenge)',
      statChallengeDesc: 'Managed & JS Challenges',
      rulesUnit: 'reguł',
    },
    table: {
      searchPlaceholder: 'Szukaj po IP, domenie, notatce...',
      clearSearch: 'Wyczyść wyszukiwanie',
      filterModeAria: 'Filtruj wg trybu akcji',
      allModes: 'Wszystkie akcje',
      filterScopeAria: 'Filtruj wg zakresu',
      allScopes: 'Wszystkie zakresy',
      accountOnly: 'Tylko reguły konta',
      zoneOnly: 'Tylko reguły stref',
      deleteSelected: (count) => `Usuń zaznaczone (${count})`,
      foundRules: (filtered, total) =>
        filtered === total
          ? `Znaleziono: ${filtered} reguł`
          : `Znaleziono: ${filtered} reguł (z łącznie ${total})`,
      selectedCount: (count) => `Zaznaczono ${count}`,
      clearFilters: 'Wyczyść filtry',
      colScope: 'Domena / Zakres',
      colTargetValue: 'Target / Wartość',
      colMode: 'Akcja / Tryb',
      colNotes: 'Notatki',
      colCreated: 'Data utworzenia',
      colActions: 'Akcje',
      entireAccount: 'Całe konto',
      cloudflareZone: 'Strefa Cloudflare',
      emptyTitle: 'Brak reguł',
      emptyDesc: 'Spróbuj zmienić kryteria wyszukiwania lub filtry.',
      page: 'Strona',
      of: 'z',
      rowsPerPage: 'Wierszy na stronę:',
      firstPage: 'Pierwsza strona',
      prevPage: 'Poprzednia strona',
      nextPage: 'Następna strona',
      lastPage: 'Ostatnia strona',
      deleteRule: 'Usuń regułę',
      copyValue: 'Kopiuj wartość',
    },
    noteEditor: {
      placeholder: 'Wpisz notatkę (max 500 znaków)...',
      saveTooltip: 'Zapisz notatkę (Enter)',
      cancelTooltip: 'Anuluj (Esc)',
      clickToEdit: 'Kliknij, aby dodać / edytować notatkę',
      addNote: 'Dodaj notatkę...',
      maxChars: 'Notatka może zawierać maksymalnie 500 znaków.',
      saveError: 'Błąd podczas zapisu notatki.',
    },
    modeDropdown: {
      clickToChange: 'Kliknij, aby zmienić akcję reguły (inline edit)',
      saving: 'Zapisywanie...',
      saved: 'Zapisano',
      custom: 'Tryb niestandardowy',
      modes: {
        block: {
          label: 'Block',
          desc: 'Całkowita blokada ruchu',
        },
        managed_challenge: {
          label: 'Managed Challenge',
          desc: 'Inteligentny test Cloudflare',
        },
        js_challenge: {
          label: 'JS Challenge',
          desc: 'Niewidoczny test JavaScript',
        },
        challenge: {
          label: 'Legacy CAPTCHA',
          desc: 'Interaktywny test CAPTCHA',
        },
        whitelist: {
          label: 'Allow / Whitelist',
          desc: 'Biała lista (dostęp bez kontroli)',
        },
      },
    },
    bulk: {
      regionLabel: 'Pasek akcji masowych',
      ruleSelected: (count) =>
        count === 1
          ? 'zaznaczona reguła'
          : count < 5
          ? 'zaznaczone reguły'
          : 'zaznaczonych reguł',
      deselect: 'Odznacz',
      delete: (count) => `Usuń (${count})`,
    },
    deleteModal: {
      titleSingle: 'Usuń regułę dostępu',
      titleBulk: (count) => `Usuń ${count} zaznaczonych reguł`,
      subtitle: 'Potwierdź operację usunięcia w Cloudflare',
      warningSingle:
        'Czy na pewno chcesz trwale usunąć tę regułę z Cloudflare? Ta operacja jest nieodwracalna.',
      warningBulk: (count) =>
        `Czy na pewno chcesz usunąć ${count} zaznaczonych reguł? Usunięcia zostaną wykonane z limitem współbieżności.`,
      targetLabel: 'Target / Wartość',
      scopeLabel: 'Zakres',
      ruleIdLabel: 'ID reguły',
      progressLabel: (current, total, success, failed) =>
        `Usuwanie reguł: ${current} / ${total} (Sukces: ${success}, Błędy: ${failed})...`,
      completedAll: (count) =>
        `Wszystkie ${count} reguły zostały pomyślnie usunięte.`,
      completedPartial: (success, failed) =>
        `Zakończono z błędami: ${success} usunięto, ${failed} niepowodzeń.`,
      confirmDelete: 'Usuń regułę',
      confirmDeleteBulk: (count) => `Usuń ${count} reguł`,
      deleting: 'Usuwanie...',
      errorsHeading: 'Błędy podczas usuwania:',
      errorAccountMissing: 'Brak wymaganego accountId dla reguły konta',
      errorZoneMissing: 'Brak wymaganego zoneId dla reguły strefy',
    },
    settings: {
      title: 'Konfiguracja aplikacji',
      subtitle:
        'Dostosuj język, wydajność, wątki oraz synchronizację z Cloudflare API',
      languageTitle: 'Język / Language',
      languageDesc: 'Wybierz język interfejsu (angielski lub polski)',
      concurrencyTitle: 'Wielowątkowość API (Concurrency)',
      threads: (count) => `Wątki: ${count}`,
      optimum: 'optimum',
      concurrencyInfo:
        'Wartość 2 jest domyślna i optymalna pod kątem limitów Cloudflare API (1200 zapytań / 5 min). Wyższe wartości przyspieszają pobieranie setek domen, lecz mogą skutkować kodem HTTP 429.',
      autoRefreshTitle: 'Cykliczne odświeżanie (Auto-Refresh)',
      active: 'Aktywne',
      intervalDisabled: 'Wyłączone',
      interval30s: '30 sek.',
      interval1m: '1 min.',
      interval5m: '5 min.',
      interval10m: '10 min.',
      refreshModeTitle: 'Tryb odświeżania',
      deltaTitle: 'Quick 1st Page (Delta)',
      deltaDesc:
        'Delta Sync – pobiera tylko 1. stronę (100 najnowszych). Szybkie, oszczędza limity API.',
      fullTitle: 'Full Sync (Pełne)',
      fullDesc:
        'Full Sync – pobiera ponownie wszystkie strony reguł dla wszystkich stref i kont.',
      restoreDefaults: 'Przywróć domyślne',
      done: 'Gotowe',
      save: 'Zapisz',
      cancel: 'Anuluj',
      hasUnsaved: 'Niezapisane zmiany',
      proxyTitle: 'Punkt końcowy Proxy CORS',
      proxyDesc:
        'Adres URL proxy CORS (/api/cf dla Hono/Docker lub zewnętrzny HTTPS Cloudflare Worker)',
      inactivityTitle: 'Automatyczne wylogowanie (Auto-Lock)',
      inactivityDesc:
        'Automatycznie usuwa poświadczenia i reguły z pamięci podręcznej po okresie bezczynności.',
      inactivityDisabled: 'Wyłączone',
      inactivity15m: '15 min.',
      inactivity30m: '30 min. (Zalecane)',
      inactivity60m: '60 min.',
    },
    profile: {
      signedInAs: 'Zalogowano jako',
      accessScope: 'Zakres dostępu',
      theme: 'Motyw',
      light: 'Jasny',
      dark: 'Ciemny',
      language: 'Język',
      settings: 'Ustawienia',
      logout: 'Wyloguj',
      authTypeBearer: 'API Token',
      authTypeKey: 'Globalny klucz',
      menuAria: 'Menu konta użytkownika i preferencji',
    },
    rateLimit: {
      badge: 'API',
      apiQuota: 'Limit API',
      requestsRemaining: (remaining, limit) => `Pozostało ${remaining} z ${limit} zapytań`,
      resetIn: (seconds) => `Reset za: ${seconds}s`,
      tooltipTitle: 'Limit zapytań Cloudflare API',
      window5m: 'okno 5 min',
    },
    changelog: {
      title: 'Historia zmian (Changelog)',
      subtitle: (total, releases, commit) =>
        `Zarejestrowano ${total} zmian w ${releases} wydaniach • commit: ${commit}`,
      all: (count) => `Wszystkie (${count})`,
      unreleased: '(Ostatnie commity na HEAD)',
      generatedFromGit: 'Wygenerowano automatycznie z historii Git',
      copyCommit: 'Kopiuj hash commita',
      copied: 'Skopiowano',
    },
    api: {
      initAccounts: 'Pobieranie listy kont Cloudflare...',
      noAccounts: 'Brak dostępnych kont Cloudflare dla bieżącego tokenu.',
      fetchingAccountRules: 'Pobieranie reguł dla konta...',
      fetchingAccountRulesPage: (page, total) =>
        `Pobieranie reguł konta (strona ${page} z ${total})...`,
      accountRulesFetched: (count) => `Pobrano ${count} reguł konta.`,
      initZones: 'Pobieranie listy domen...',
      noZonesAccountFallback: 'Brak domen. Pobieranie reguł poziomu konta...',
      zonesFetched: (count) => `Pobrano ${count} reguł.`,
      startingZonesFetch: (zones, concurrency) =>
        `Rozpoczynanie pobierania reguł dla ${zones} domen (współbieżność: ${concurrency})...`,
      zoneRulesProgress: (completed, total, rules) =>
        `Pobrano reguły dla ${completed} z ${total} domen (${rules} reguł)...`,
      allZonesCompleted: (rules) =>
        `Ukończono pobieranie reguł dla wszystkich domen (${rules} reguł).`,
      rulesLoadedIndexedDb: (count) =>
        `Wczytano ${count} reguł z pamięci IndexedDB.`,
      initFetch: 'Inicjalizacja pobierania reguł Cloudflare...',
      forcedRefresh: 'Wymuszone odświeżanie z Cloudflare API...',
      rulesLoaded: (count) => `Załadowano ${count} reguł.`,
      fetchError: 'Błąd podczas pobierania reguł',
    },
  },
}
