export const EMAIL = 'tahzeebkhan.bscsf24@iba-suk.edu.pk'
export const GITHUB = 'https://github.com/tahzeeeeeb'

export const PAGES = [
  { id: 'home', label: 'Home', code: 'HOME' },
  { id: 'projects', label: 'Projects', code: 'PROJECTS' },
  { id: 'research', label: 'Research', code: 'RESEARCH' },
  { id: 'about', label: 'About', code: 'ABOUT' },
  { id: 'contact', label: 'Contact', code: 'RADIO' },
] as const

export type PageProps = { onGo: (i: number) => void }

export const pageHref =(i: number): string => (i === 0 ? '#/' : `#/${PAGES[i].id}`)
export const pageIndex = (id: string): number => PAGES.findIndex((p) => p.id === id)

export type Status = 'Built' | 'In progress' | 'Paused'
export type Category = 'F1 data' | 'Energy & IoT' | 'Web & SaaS' | 'Tools & apps'

export type Project = {
  id: string
  title: string
  category: Category
  status: Status
  summary: string
  notes: string[]
  stack: string[]
}

export const CATEGORIES: readonly ('All' | Category)[] = [
  'All',
  'F1 data',
  'Energy & IoT',
  'Web & SaaS',
  'Tools & apps',
]

export const PROJECTS: Project[] = [
  {
    id: 'track-dominance',
    title: 'Track Dominance Map',
    category: 'F1 data',
    status: 'Built',
    summary: 'Paints a circuit map by which driver was quickest through each stretch of track, straight from FastF1 session data.',
    notes: [
      'Loads timing and position data with FastF1 and aligns two drivers lap by lap.',
      'Splits the lap into mini-sectors and colours each by the faster driver.',
      'Part of a telemetry portfolio aimed at pit-wall and strategy engineers.',
    ],
    stack: ['Python', 'FastF1', 'Pandas', 'Matplotlib'],
  },
  {
    id: 'pace-isolation',
    title: 'Pace Isolation Engine',
    category: 'F1 data',
    status: 'Built',
    summary: 'Separates a driver’s underlying race pace from the noise around it, so stints can be compared fairly.',
    notes: [
      'Works on FastF1 lap data across a whole race.',
      'Filters out laps that do not reflect real pace before comparing drivers.',
      'Next step: more telemetry tools for the same pit-wall portfolio.',
    ],
    stack: ['Python', 'FastF1', 'Pandas', 'Matplotlib'],
  },
  {
    id: 'slab-guardian',
    title: 'Slab Guardian',
    category: 'Energy & IoT',
    status: 'In progress',
    summary: 'A hybrid smart-home energy system for Pakistan that watches your kWh against NEPRA billing slabs and steps in before you cross into a pricier tier.',
    notes: [
      'Branch-circuit metering at the main board with ESP32 and PZEM-004T sensors on CT clamps.',
      'Cheap ESP32 relay and IR nodes per room, plus a contactor node for the water pump and geyser.',
      'Feathers inverter ACs over IR and shifts pump runs to stay under the slab limit.',
      'Server-side automation with a NILM approach for monitoring. Heading for a National Incubation Center pitch.',
    ],
    stack: ['ESP32', 'PZEM-004T', 'FastAPI', 'PostgreSQL', 'TimescaleDB'],
  },
  {
    id: 'karbonomy',
    title: 'Karbonomy',
    category: 'Web & SaaS',
    status: 'In progress',
    summary: 'A multi-tenant carbon accounting platform that turns company activity data into Scope 1, 2 and 3 emissions and disclosure-ready reports.',
    notes: [
      'Emissions engine with DEFRA and EPA factor sources, unit and currency conversion.',
      'Bulk CSV import, approval workflows and reporting periods.',
      'Playwright end-to-end suite covering GHG Protocol, CDP, CSRD, ISSB and more.',
      'Runs on Supabase with an AWS EC2 and Nginx deployment.',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'Supabase', 'Playwright', 'AWS EC2'],
  },
  {
    id: 'file-agent',
    title: 'Command-line file agent',
    category: 'Tools & apps',
    status: 'In progress',
    summary: 'A small AI that lives in CMD and PowerShell, knows the folder layout across internal and external drives, and copies or moves files on request.',
    notes: [
      'Indexes the file structure of every connected drive.',
      'Built as a production project with proper software engineering practice.',
      'Will be published on GitHub.',
    ],
    stack: ['CLI', 'Windows', 'LLM'],
  },
  {
    id: 'classmode',
    title: 'ClassMode',
    category: 'Tools & apps',
    status: 'Paused',
    summary: 'An Android app that answers calls during class or exams with an “I’m in class” text instead of a plain missed call.',
    notes: [
      'SIM calls through a phone-state receiver, WhatsApp calls through a notification listener.',
      'Timetable-driven, with a separate exam mode.',
      'Paused until after mid-terms. Replies inside WhatsApp come next.',
    ],
    stack: ['Kotlin', 'Android'],
  },
  {
    id: 'hfm-ibiza',
    title: 'HFM Ibiza',
    category: 'Web & SaaS',
    status: 'Built',
    summary: 'A web app for a house music radio station with an animated artist reveal.',
    notes: [
      'Letter-by-letter staggered reveal with smoke effects in an amber and dark theme.',
      'Delivered as a single self-contained HTML file for the client.',
    ],
    stack: ['HTML', 'CSS', 'JavaScript'],
  },
]
