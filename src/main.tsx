// Entry point. Deliberately tiny: on a warm cache, redirect before React or
// Firebase are even downloaded. Only load the full app if that didn't happen.

import { tryFastRedirect } from './lib/fastRedirect'

if (!tryFastRedirect()) {
  import('./bootstrap')
}
