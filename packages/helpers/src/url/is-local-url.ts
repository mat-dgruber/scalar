/** Obviously local hostnames */
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']

/** Reserved and local TLDs */
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost', 'local', 'internal', 'lan', 'home', 'corp']

/**
 * Detect requests to localhost, private/intranet IP ranges (RFC 1918), or reserved TLDs
 */
export function isLocalUrl(url: string) {
  try {
    const { hostname } = new URL(url)

    // Check if hostname is in the local hostnames list
    if (LOCAL_HOSTNAMES.includes(hostname)) {
      return true
    }

    // Check IPv4 private and loopback ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4Match) {
      const octet1 = Number(ipv4Match[1])
      const octet2 = Number(ipv4Match[2])

      // 10.0.0.0/8
      if (octet1 === 10) return true
      // 127.0.0.0/8
      if (octet1 === 127) return true
      // 169.254.0.0/16 (Link-local)
      if (octet1 === 169 && octet2 === 254) return true
      // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return true
      // 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) return true
    }

    // Check if hostname ends with a reserved or local TLD
    const tld = hostname.split('.').pop()?.toLowerCase()
    if (tld && RESERVED_TLDS.includes(tld)) {
      return true
    }

    return false
  } catch {
    // If it's not a valid URL, we can't use the proxy anyway,
    // but it also covers cases like relative URLs (e.g. `openapi.json`).
    return true
  }
}
