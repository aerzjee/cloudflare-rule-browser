import { useSettingsStore, type AppLanguage } from '../store/useSettingsStore'
import { translations, type TranslationDictionary } from './translations'

export function useTranslation(): {
  t: TranslationDictionary
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
} {
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const t = translations[language] || translations.en

  return { t, language, setLanguage }
}

export function getTranslations(lang?: AppLanguage): TranslationDictionary {
  const currentLang = lang || useSettingsStore.getState().language || 'en'
  return translations[currentLang] || translations.en
}
