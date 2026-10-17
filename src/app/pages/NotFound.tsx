import { Link } from 'react-router-dom'
import { ScrollPage } from '../Shell'

export function NotFound() {
  return (
    <ScrollPage>
      <h1 className="font-display text-3xl font-bold">Nothing here</h1>
      <p className="mt-3 text-ink-muted">That page does not exist (yet).</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-primary underline underline-offset-4">
        Back to the filaments
      </Link>
    </ScrollPage>
  )
}
