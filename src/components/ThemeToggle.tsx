'use client'

import { Moon, Sun, Monitor, Leaf, TreePine, Wheat, LandPlot, Sparkles, LineChart, CloudSun, Gamepad, Diamond, Gem } from 'lucide-react' // Import Gem icon
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
        <div className="h-8 w-8 rounded-md border border-input bg-card animate-pulse" />
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('soft')
    } else if (theme === 'soft') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('dark-2')
    } else if (theme === 'dark-2') {
      setTheme('forest')
    } else if (theme === 'forest') {
      setTheme('harvest')
    } else if (theme === 'harvest') {
      setTheme('deepForest')
    } else if (theme === 'deepForest') {
      setTheme('earthyDark')
    } else if (theme === 'earthyDark') {
      setTheme('finDark')
    } else if (theme === 'finDark') {
      setTheme('freshLight')
    } else if (theme === 'freshLight') {
      setTheme('playful')
    } else if (theme === 'playful') {
      setTheme('luxProfessional') // This was the previous dark lux theme
    } else if (theme === 'luxProfessional') { // Now after dark lux, go to light lux
      setTheme('luxProfessionalLight')
    }
    else {
      setTheme('light') // Cycles back to light after luxProfessionalLight
    }
  }

  const getIcon = () => {
    if (theme === 'soft') {
      return <Leaf className="h-4 w-4" />
    } else if (theme === 'dark') {
      return <Sun className="h-4 w-4" />
    } else if (theme === 'dark-2') {
      return <Monitor className="h-4 w-4" />
    } else if (theme === 'forest') {
      return <TreePine className="h-4 w-4" />
    } else if (theme === 'harvest') {
      return <Wheat className="h-4 w-4" />
    } else if (theme === 'deepForest') {
      return <LandPlot className="h-4 w-4" />
    } else if (theme === 'earthyDark') {
      return <Sparkles className="h-4 w-4" />
    } else if (theme === 'finDark') {
      return <LineChart className="h-4 w-4" />
    } else if (theme === 'freshLight') {
      return <CloudSun className="h-4 w-4" />
    } else if (theme === 'playful') {
      return <Gamepad className="h-4 w-4" />
    } else if (theme === 'luxProfessional') {
      return <Diamond className="h-4 w-4" />
    } else if (theme === 'luxProfessionalLight') { // Icon for luxProfessionalLight theme
      return <Gem className="h-4 w-4" /> // Using Gem for light professional/lavish theme
    }
    else {
      return <Moon className="h-4 w-4" />
    }
  }

  const getTooltipText = () => {
    if (theme === 'soft') {
      return 'Soft theme'
    } else if (theme === 'dark') {
      return 'Dark theme'
    } else if (theme === 'dark-2') {
      return 'Dark Code theme'
    } else if (theme === 'forest') {
      return 'Forest theme'
    } else if (theme === 'harvest') {
      return 'Harvest theme'
    } else if (theme === 'deepForest') {
      return 'Deep Forest theme'
    } else if (theme === 'earthyDark') {
      return 'Earthy Dark theme'
    } else if (theme === 'finDark') {
      return 'Finance Dark theme'
    } else if (theme === 'freshLight') {
      return 'Fresh Light theme'
    } else if (theme === 'playful') {
      return 'Playful theme'
    } else if (theme === 'luxProfessional') {
      return 'Professional Luxury Dark theme'
    } else if (theme === 'luxProfessionalLight') { // Tooltip for luxProfessionalLight theme
      return 'Professional Luxury Light theme'
    }
    else {
      return 'Light theme'
    }
  }

  return (
      <button
          onClick={cycleTheme}
          title={getTooltipText()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-button-secondary bg-button-secondary:hover h-8 w-8 text-button-secondary"
      >
        {getIcon()}
        <span className="sr-only">{getTooltipText()}</span>
      </button>
  )
}