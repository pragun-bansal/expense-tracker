// // 'use client'
// //
// // import { Moon, Sun, Monitor, Leaf, TreePine, Wheat, LandPlot, Sparkles, LineChart, CloudSun, Gamepad, Diamond, Gem } from 'lucide-react' // Import Gem icon
// // import { useTheme } from 'next-themes'
// // import { useEffect, useState } from 'react'
// //
// // export function ThemeToggle() {
// //   const [mounted, setMounted] = useState(false)
// //   const { theme, setTheme, resolvedTheme } = useTheme()
// //
// //   useEffect(() => {
// //     setMounted(true)
// //   }, [])
// //
// //   if (!mounted) {
// //     return (
// //         <div className="h-8 w-8 rounded-md border border-input bg-card animate-pulse" />
// //     )
// //   }
// //
// //   const cycleTheme = () => {
// //     if (theme === 'light') {
// //       setTheme('soft')
// //     } else if (theme === 'soft') {
// //       setTheme('dark')
// //     } else if (theme === 'dark') {
// //       setTheme('dark-2')
// //     } else if (theme === 'dark-2') {
// //       setTheme('forest')
// //     } else if (theme === 'forest') {
// //       setTheme('harvest')
// //     } else if (theme === 'harvest') {
// //       setTheme('deepForest')
// //     } else if (theme === 'deepForest') {
// //       setTheme('earthyDark')
// //     } else if (theme === 'earthyDark') {
// //       setTheme('finDark')
// //     } else if (theme === 'finDark') {
// //       setTheme('freshLight')
// //     } else if (theme === 'freshLight') {
// //       setTheme('playful')
// //     } else if (theme === 'playful') {
// //       setTheme('luxProfessional') // This was the previous dark lux theme
// //     } else if (theme === 'luxProfessional') { // Now after dark lux, go to light lux
// //       setTheme('luxProfessionalLight')
// //     }
// //     else {
// //       setTheme('light') // Cycles back to light after luxProfessionalLight
// //     }
// //   }
// //
// //   const getIcon = () => {
// //     if (theme === 'soft') {
// //       return <Leaf className="h-4 w-4" />
// //     } else if (theme === 'dark') {
// //       return <Sun className="h-4 w-4" />
// //     } else if (theme === 'dark-2') {
// //       return <Monitor className="h-4 w-4" />
// //     } else if (theme === 'forest') {
// //       return <TreePine className="h-4 w-4" />
// //     } else if (theme === 'harvest') {
// //       return <Wheat className="h-4 w-4" />
// //     } else if (theme === 'deepForest') {
// //       return <LandPlot className="h-4 w-4" />
// //     } else if (theme === 'earthyDark') {
// //       return <Sparkles className="h-4 w-4" />
// //     } else if (theme === 'finDark') {
// //       return <LineChart className="h-4 w-4" />
// //     } else if (theme === 'freshLight') {
// //       return <CloudSun className="h-4 w-4" />
// //     } else if (theme === 'playful') {
// //       return <Gamepad className="h-4 w-4" />
// //     } else if (theme === 'luxProfessional') {
// //       return <Diamond className="h-4 w-4" />
// //     } else if (theme === 'luxProfessionalLight') { // Icon for luxProfessionalLight theme
// //       return <Gem className="h-4 w-4" /> // Using Gem for light professional/lavish theme
// //     }
// //     else {
// //       return <Moon className="h-4 w-4" />
// //     }
// //   }
// //
// //   const getTooltipText = () => {
// //     if (theme === 'soft') {
// //       return 'Soft theme'
// //     } else if (theme === 'dark') {
// //       return 'Dark theme'
// //     } else if (theme === 'dark-2') {
// //       return 'Dark Code theme'
// //     } else if (theme === 'forest') {
// //       return 'Forest theme'
// //     } else if (theme === 'harvest') {
// //       return 'Harvest theme'
// //     } else if (theme === 'deepForest') {
// //       return 'Deep Forest theme'
// //     } else if (theme === 'earthyDark') {
// //       return 'Earthy Dark theme'
// //     } else if (theme === 'finDark') {
// //       return 'Finance Dark theme'
// //     } else if (theme === 'freshLight') {
// //       return 'Fresh Light theme'
// //     } else if (theme === 'playful') {
// //       return 'Playful theme'
// //     } else if (theme === 'luxProfessional') {
// //       return 'Professional Luxury Dark theme'
// //     } else if (theme === 'luxProfessionalLight') { // Tooltip for luxProfessionalLight theme
// //       return 'Professional Luxury Light theme'
// //     }
// //     else {
// //       return 'Light theme'
// //     }
// //   }
// //
// //   return (
// //       <button
// //           onClick={cycleTheme}
// //           title={getTooltipText()}
// //           className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-button-secondary bg-button-secondary:hover h-8 w-8 text-button-secondary"
// //       >
// //         {getIcon()}
// //         <span className="sr-only">{getTooltipText()}</span>
// //       </button>
// //   )
// // }
// 'use client'
//
// import { useState, useEffect } from 'react'
// import { useTheme } from 'next-themes'
// import { Moon, Sun, Monitor, Leaf, TreePine, Wheat, LandPlot, Sparkles, LineChart, CloudSun, Gamepad, Diamond, Gem, ChevronDown, Check } from 'lucide-react'
//
// // Define a mapping of themes to their icons, tooltip text, and an array of RGB color swatches
// const themesConfig = [
//   {
//     name: 'light',
//     icon: <Moon className="h-4 w-4" />,
//     tooltip: 'Light theme',
//     colorSwatches: [
//       '249 250 251', // bg-gray-50
//       '17 24 39',    // text-gray-900
//       '37 99 235',   // bg-blue-600
//       '22 163 74',   // text-green-600
//     ],
//   },
//   {
//     name: 'soft',
//     icon: <Leaf className="h-4 w-4" />,
//     tooltip: 'Soft theme',
//     colorSwatches: [
//       '238 239 224', // soft cream
//       '55 65 61',    // darker teal
//       '209 216 190', // soft sage
//       '129 154 145', // sage
//     ],
//   },
//   {
//     name: 'dark',
//     icon: <Sun className="h-4 w-4" />,
//     tooltip: 'Dark theme',
//     colorSwatches: [
//       '17 24 39',    // dark:bg-gray-900
//       '243 244 246', // dark:text-gray-100
//       '37 99 235',   // dark:bg-blue-600
//       '74 222 128',  // dark:text-green-400
//     ],
//   },
//   {
//     name: 'dark-2',
//     icon: <Monitor className="h-4 w-4" />,
//     tooltip: 'Dark Code theme',
//     colorSwatches: [
//       '26 26 26',    // Deep charcoal black
//       '255 255 255', // Pure white
//       '76 208 225',  // Cyan
//       '76 179 79',   // Vibrant green
//     ],
//   },
//   {
//     name: 'forest',
//     icon: <TreePine className="h-4 w-4" />,
//     tooltip: 'Forest theme',
//     colorSwatches: [
//       '47 82 73',    // #2F5249 - Dark green
//       '255 255 255', // White
//       '67 112 87',   // #437057 - Slightly lighter green
//       '151 176 103', // #97B067 - Muted green
//     ],
//   },
//   {
//     name: 'harvest',
//     icon: <Wheat className="h-4 w-4" />,
//     tooltip: 'Harvest theme',
//     colorSwatches: [
//       '245 236 213', // #F5ECD5 - Light, warm background
//       '98 111 71',   // #626F47 - Darker muted green
//       '240 187 120', // #F0BB78 - Warm orange/brown
//       '164 180 101', // #A4B465 - Muted yellow-green
//     ],
//   },
//   {
//     name: 'deepForest',
//     icon: <LandPlot className="h-4 w-4" />,
//     tooltip: 'Deep Forest theme',
//     colorSwatches: [
//       '24 35 15',    // #18230F - Very dark green, almost black
//       '255 255 255', // White
//       '31 125 83',   // #1F7D53 - Vibrant green
//       '39 57 28',    // #27391C - Slightly lighter dark green
//     ],
//   },
//   {
//     name: 'earthyDark',
//     icon: <Sparkles className="h-4 w-4" />,
//     tooltip: 'Earthy Dark theme',
//     colorSwatches: [
//       '24 28 20',    // #181C14 - Very dark, earthy green-gray
//       '236 223 204', // #ECDFCC - Light, warm off-white
//       '60 61 55',    // #3C3D37 - Muted dark gray-green
//       '105 117 101', // #697565 - Lighter muted green
//     ],
//   },
//   {
//     name: 'finDark',
//     icon: <LineChart className="h-4 w-4" />,
//     tooltip: 'Finance Dark theme',
//     colorSwatches: [
//       '17 25 34',    // #111922 - Dark Teal-Blue
//       '236 240 241', // #ECF0F1 - Light Gray
//       '52 152 219',  // #3498DB - Bright Blue
//       '39 174 96',   // #27AE60 - Emerald Green
//     ],
//   },
//   {
//     name: 'freshLight',
//     icon: <CloudSun className="h-4 w-4" />,
//     tooltip: 'Fresh Light theme',
//     colorSwatches: [
//       '245 247 250', // #F5F7FA - Very light gray
//       '36 41 46',    // #24292E - Deep dark gray
//       '39 125 161',  // #277DA1 - Refreshing Blue-Green
//       '255 255 255', // Pure white sidebar/card
//     ],
//   },
//   {
//     name: 'playful',
//     icon: <Gamepad className="h-4 w-4" />,
//     tooltip: 'Playful theme',
//     colorSwatches: [
//       '240 248 255', // #F0F8FF - Alice Blue
//       '50 50 50',    // Soft dark gray
//       '100 149 237', // #6495ED - Cornflower Blue
//       '255 105 180', // #FF69B4 - Hot Pink
//     ],
//   },
//   {
//     name: 'luxProfessional',
//     icon: <Diamond className="h-4 w-4" />,
//     tooltip: 'Professional Luxury Dark theme',
//     colorSwatches: [
//       '26 26 31',    // #1A1A1F - Very deep charcoal
//       '220 220 220', // Soft off-white
//       '199 178 120', // #C7B278 - Muted Gold
//       '34 34 39',    // #222227 - Deep charcoal sidebar
//     ],
//   },
//   {
//     name: 'luxProfessionalLight',
//     icon: <Gem className="h-4 w-4" />,
//     tooltip: 'Professional Luxury Light theme',
//     colorSwatches: [
//       '247 247 247', // #F7F7F7 - Very light gray
//       '40 40 45',    // #28282D - Deep, muted dark gray
//       '110 80 160',  // #6E50A0 - Deep, muted plum
//       '255 255 255', // Pure white sidebar/card
//     ],
//   },
// ];
//
// export function ThemeToggle() {
//   const [mounted, setMounted] = useState(false);
//   const [isOpen, setIsOpen] = useState(false); // State to control menu visibility
//   const { theme, setTheme } = useTheme();
//
//   useEffect(() => {
//     setMounted(true);
//   }, []);
//
//   // Close menu when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       // Check if the click is outside the button and the dropdown menu
//       if (isOpen && !event.target.closest('.theme-toggle-container')) {
//         setIsOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isOpen]);
//
//   if (!mounted) {
//     return (
//         <div className="h-8 w-8 rounded-md border border-input bg-card animate-pulse" />
//     );
//   }
//
//   const currentThemeConfig = themesConfig.find((config) => config.name === theme) || themesConfig[0];
//
//   return (
//       <div className="relative theme-toggle-container">
//         {/* Current Theme Display / Menu Toggle Button */}
//         <button
//             onClick={() => setIsOpen(!isOpen)}
//             title={`Current Theme: ${currentThemeConfig.tooltip}`}
//             className="inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-button-secondary bg-button-secondary:hover h-8 px-3 text-button-secondary min-w-[120px]"
//         >
//           <div className="flex items-center gap-2">
//             {currentThemeConfig.icon}
//             <span className="hidden sm:inline">{currentThemeConfig.tooltip.replace(' theme', '')}</span>
//           </div>
//           <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
//         </button>
//
//         {/* Dropdown Menu */}
//         {isOpen && (
//             <div className="absolute top-full right-0 mt-2 w-60 sm:w-72 bg-card border border-card rounded-md shadow-lg z-50 py-1">
//               {themesConfig.map((config) => (
//                   <button
//                       key={config.name}
//                       onClick={() => {
//                         setTheme(config.name);
//                         setIsOpen(false); // Close menu after selection
//                       }}
//                       className={`flex items-center w-full px-3 py-2 text-sm text-page hover:bg-sidebar-nav-hover ${
//                           theme === config.name ? 'bg-sidebar-nav-active text-sidebar-nav-active' : ''
//                       }`}
//                   >
//                     <div className="flex rounded-md overflow-hidden mr-2 border border-gray-300">
//                       {config.colorSwatches.map((color, index) => (
//                           <div
//                               key={index}
//                               className="w-4 h-4" // Adjust size as needed
//                               style={{ backgroundColor: `rgb(${color})` }}
//                           ></div>
//                       ))}
//                     </div>
//                     <span className="flex-grow text-left">{config.tooltip}</span>
//                     {theme === config.name && (
//                         <Check className="h-4 w-4 ml-auto" />
//                     )}
//                   </button>
//               ))}
//             </div>
//         )}
//       </div>
//   );
// }
'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor, Leaf, TreePine, Wheat, LandPlot, Sparkles, LineChart, CloudSun, Gamepad, Diamond, Gem, ChevronDown, Check } from 'lucide-react'

// Define a mapping of themes to their icons, tooltip text, and an array of RGB color swatches
const themesConfig = [
  {
    name: 'light',
    icon: <Moon className="h-4 w-4" />,
    tooltip: 'Light theme',
    colorSwatches: [
      '249 250 251', // --page-background
      '17 24 39',    // --page-foreground
      '37 99 235',   // --button-primary-bg
      '22 163 74',   // --button-success-bg
    ],
  },
  {
    name: 'soft',
    icon: <Leaf className="h-4 w-4" />,
    tooltip: 'Soft theme',
    colorSwatches: [
      '238 239 224', // --page-background
      '55 65 61',    // --page-foreground
      '209 216 190', // --sidebar-background
      '129 154 145', // --button-primary-bg
    ],
  },
  {
    name: 'dark',
    icon: <Sun className="h-4 w-4" />,
    tooltip: 'Dark theme',
    colorSwatches: [
      '17 24 39',    // --page-background
      '243 244 246', // --page-foreground
      '37 99 235',   // --button-primary-bg
      '74 222 128',  // --icon-success
    ],
  },
  {
    name: 'dark-2',
    icon: <Monitor className="h-4 w-4" />,
    tooltip: 'Dark Code theme',
    colorSwatches: [
      '26 26 26',    // --page-background
      '255 255 255', // --page-foreground
      '76 208 225',  // --button-primary-bg (cyan)
      '76 179 79',   // --button-success-bg (vibrant green)
    ],
  },
  {
    name: 'forest',
    icon: <TreePine className="h-4 w-4" />,
    tooltip: 'Forest theme',
    colorSwatches: [
      '47 82 73',    // --page-background (#2F5249)
      '255 255 255', // --page-foreground (White)
      '67 112 87',   // --sidebar-background (#437057)
      '151 176 103', // --button-primary-bg (#97B067)
    ],
  },
  {
    name: 'harvest',
    icon: <Wheat className="h-4 w-4" />,
    tooltip: 'Harvest theme',
    colorSwatches: [
      '245 236 213', // --page-background (#F5ECD5)
      '98 111 71',   // --page-foreground (#626F47)
      '240 187 120', // --sidebar-background (#F0BB78)
      '164 180 101', // --sidebar-border (#A4B465)
    ],
  },
  {
    name: 'deepForest',
    icon: <LandPlot className="h-4 w-4" />,
    tooltip: 'Deep Forest theme',
    colorSwatches: [
      '24 35 15',    // --page-background (#18230F)
      '255 255 255', // --page-foreground (White)
      '39 57 28',    // --sidebar-background (#27391C)
      '31 125 83',   // --button-primary-bg (#1F7D53)
    ],
  },
  {
    name: 'earthyDark',
    icon: <Sparkles className="h-4 w-4" />,
    tooltip: 'Earthy Dark theme',
    colorSwatches: [
      '24 28 20',    // --page-background (#181C14)
      '236 223 204', // --page-foreground (#ECDFCC)
      '60 61 55',    // --sidebar-background (#3C3D37)
      '105 117 101', // --button-primary-bg (#697565)
    ],
  },
  {
    name: 'finDark',
    icon: <LineChart className="h-4 w-4" />,
    tooltip: 'Finance Dark theme',
    colorSwatches: [
      '17 25 34',    // --page-background (#111922)
      '236 240 241', // --page-foreground (#ECF0F1)
      '52 152 219',  // --button-primary-bg (#3498DB)
      '39 174 96',   // --button-success-bg (#27AE60)
    ],
  },
  {
    name: 'freshLight',
    icon: <CloudSun className="h-4 w-4" />,
    tooltip: 'Fresh Light theme',
    colorSwatches: [
      '245 247 250', // --page-background (#F5F7FA)
      '36 41 46',    // --page-foreground (#24292E)
      '255 255 255', // --sidebar-background (Pure white)
      '39 125 161',  // --button-primary-bg (#277DA1)
    ],
  },
  {
    name: 'playful',
    icon: <Gamepad className="h-4 w-4" />,
    tooltip: 'Playful theme',
    colorSwatches: [
      '240 248 255', // --page-background (#F0F8FF)
      '50 50 50',    // --page-foreground (Soft dark gray)
      '100 149 237', // --button-primary-bg (#6495ED)
      '255 105 180', // --button-secondary-bg (Hot Pink)
    ],
  },
  {
    name: 'luxProfessional',
    icon: <Diamond className="h-4 w-4" />,
    tooltip: 'Professional Luxury Dark theme',
    colorSwatches: [
      '26 26 31',    // --page-background (#1A1A1F)
      '220 220 220', // --page-foreground (Soft off-white)
      '34 34 39',    // --sidebar-background (#222227)
      '199 178 120', // --button-primary-bg (Muted Gold)
    ],
  },
  {
    name: 'luxProfessionalLight',
    icon: <Gem className="h-4 w-4" />,
    tooltip: 'Professional Luxury Light theme',
    colorSwatches: [
      '247 247 247', // --page-background (#F7F7F7)
      '40 40 45',    // --page-foreground (#28282D)
      '255 255 255', // --sidebar-background (Pure white)
      '110 80 160',  // --button-primary-bg (Deep muted plum)
    ],
  },
];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // State to control menu visibility
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.theme-toggle-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
        <div className="h-8 w-8 rounded-md border border-input bg-card animate-pulse" />
    );
  }

  const currentThemeConfig = themesConfig.find((config) => config.name === theme) || themesConfig[0];

  return (
      <div className="relative float-right mr-4 top-4 theme-toggle-container">
        {/* Current Theme Display / Menu Toggle Button */}
        <button
            onClick={() => setIsOpen(!isOpen)}
            title={`Current Theme: ${currentThemeConfig.tooltip}`}
            className="inline-flex items-center justify-between gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-button-secondary bg-button-secondary:hover h-8 px-3 text-button-secondary min-w-[120px]"
        >
          <div className="flex items-center gap-2">
            {currentThemeConfig.icon}
            <span className="hidden sm:inline">{currentThemeConfig.tooltip.replace(' theme', '')}</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-60 sm:w-72 bg-card border border-card rounded-md shadow-lg z-50 py-1">
              {themesConfig.map((config) => (
                  <button
                      key={config.name}
                      onClick={() => {
                        setTheme(config.name);
                        setIsOpen(false); // Close menu after selection
                      }}
                      className={`flex items-center w-full px-3 py-2 text-sm text-page hover:bg-sidebar-nav-hover ${
                          theme === config.name ? 'bg-sidebar-nav-active text-sidebar-nav-active' : ''
                      }`}
                  >
                    <div className="flex rounded-md overflow-hidden mr-2 border border-gray-300">
                      {config.colorSwatches.map((color, index) => (
                          <div
                              key={index}
                              className="w-4 h-4" // Adjust size as needed
                              style={{ backgroundColor: `rgb(${color})` }}
                          ></div>
                      ))}
                    </div>
                    <span className="flex-grow text-left">{config.tooltip}</span>
                    {theme === config.name && (
                        <Check className="h-4 w-4 ml-auto" />
                    )}
                  </button>
              ))}
            </div>
        )}
      </div>
  );
}