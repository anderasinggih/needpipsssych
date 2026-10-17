"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: TranslationKey, fallback?: string) => string
  isIndonesian: boolean
  isEnglish: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LANGUAGE_STORAGE_KEY = "needpips_user_language"

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth()
  const [language, setLanguageState] = useState<Language>("en")

  // Sync initial language preference
  useEffect(() => {
    try {
      if (user?.language) {
        setLanguageState(user.language)
        localStorage.setItem(LANGUAGE_STORAGE_KEY, user.language)
      } else {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
        if (saved === "en" || saved === "id") {
          setLanguageState(saved)
        }
      }
    } catch (_) {}
  }, [user?.language])

  const setLanguage = useCallback(
    async (newLang: Language) => {
      setLanguageState(newLang)
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
      } catch (_) {}

      // If user is authenticated, persist to user profile in Supabase database
      if (user) {
        updateProfile({ language: newLang })
      }
    },
    [user, updateProfile]
  )

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const langDict = translations[language]
      if (langDict && key in langDict) {
        return (langDict as Record<string, string>)[key]
      }
      const defaultDict = translations.en
      if (defaultDict && key in defaultDict) {
        return (defaultDict as Record<string, string>)[key]
      }
      return fallback || key
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isIndonesian: language === "id",
        isEnglish: language === "en",
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export const useTranslation = useLanguage
