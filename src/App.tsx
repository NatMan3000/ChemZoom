import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './app/Shell'
import { HomePage } from './app/pages/HomePage'
import { SourcesPage } from './app/pages/SourcesPage'
import { NotFound } from './app/pages/NotFound'

// The 3D pages load as their own chunk so the home and sources pages open fast.
const MaterialPage = lazy(() => import('./app/pages/MaterialPage'))
const ComparePage = lazy(() => import('./app/pages/ComparePage'))
const BasicsPage = lazy(() => import('./app/pages/BasicsPage'))
const SimHostPage = lazy(() => import('./app/pages/SimHostPage'))

export default function App() {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/m/:id" element={<MaterialPage />} />
          <Route path="/m/:id/sim/:simId" element={<SimHostPage />} />
          <Route path="/m/:id/:step" element={<MaterialPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/basics" element={<BasicsPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

function Loading() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center text-ink-muted" role="status">
      Loading the 3D stage
    </div>
  )
}
