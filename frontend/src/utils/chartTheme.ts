import { useEffect, useState } from 'react'

export interface ChartThemeTokens {
  grid: string
  tick: string
  track: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  primary: string
  secondary: string
  accent: string
  success: string
  warning: string
}

const LIGHT_CHART_TOKENS: ChartThemeTokens = {
  grid: 'rgba(17, 19, 24, 0.08)',
  tick: '#8D96A5',
  track: '#E6E9EE',
  tooltipBg: '#FFFFFF',
  tooltipBorder: 'rgba(17, 19, 24, 0.12)',
  tooltipText: '#111318',
  primary: '#1677A8',
  secondary: '#3E63DD',
  accent: '#111318',
  success: '#30A46C',
  warning: '#F5A524',
}

const DARK_CHART_TOKENS: ChartThemeTokens = {
  grid: 'rgba(244, 245, 247, 0.08)',
  tick: '#6E7787',
  track: '#262A34',
  tooltipBg: '#1B1E25',
  tooltipBorder: 'rgba(244, 245, 247, 0.12)',
  tooltipText: '#F4F5F7',
  primary: '#4AA8D8',
  secondary: '#3E63DD',
  accent: '#F4F5F7',
  success: '#30A46C',
  warning: '#F5A524',
}

export function useChartTheme(): ChartThemeTokens {
  const [tokens, setTokens] = useState<ChartThemeTokens>(() => {
    if (typeof document !== 'undefined') {
      const theme = document.documentElement.getAttribute('data-theme')
      return theme === 'dark' ? DARK_CHART_TOKENS : LIGHT_CHART_TOKENS
    }
    return LIGHT_CHART_TOKENS
  })

  useEffect(() => {
    const updateTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setTokens(theme === 'dark' ? DARK_CHART_TOKENS : LIGHT_CHART_TOKENS)
    }

    updateTheme()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme()
        }
      }
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [])

  return tokens
}
