import { buildDestinationUrl, type ResolvableLink } from './resolve'

/** UI links open redirects at their destination; groups open their tree page. */
export function linkHref(link: ResolvableLink): string {
  return link.kind === 'tree' || link.kind === 'alias' ? `/${link.keyword}` : buildDestinationUrl(link.url, '')
}
