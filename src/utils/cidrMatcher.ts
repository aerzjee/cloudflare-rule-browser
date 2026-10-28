/**
 * Utility functions for parsing IPv4/IPv6 addresses and performing CIDR subnet containment checks.
 * Uses BigInt for precise 32-bit (IPv4) and 128-bit (IPv6) bitwise arithmetic without external dependencies.
 */

/**
 * Validates a 4-octet IPv4 address (e.g. "192.168.1.1") and converts it to a 32-bit BigInt.
 * Returns null if the format or any octet (0..255) is invalid.
 */
export function parseIpv4ToBigInt(ip: string): bigint | null {
  if (!ip) return null
  const trimmed = ip.trim()
  if (!trimmed || trimmed.includes('/') || trimmed.includes(':')) return null

  const parts = trimmed.split('.')
  if (parts.length !== 4) return null

  let result = 0n
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const num = Number(part)
    if (num < 0 || num > 255) return null
    result = (result << 8n) | BigInt(num)
  }

  return result
}

/**
 * Validates an IPv6 address (supporting standard and compressed "::" notation)
 * and converts it to a 128-bit BigInt.
 * Returns null if the format is invalid.
 */
export function parseIpv6ToBigInt(ip: string): bigint | null {
  if (!ip) return null
  const trimmed = ip.trim()
  if (!trimmed || trimmed.includes('/') || !trimmed.includes(':')) return null

  // Ensure at most one "::" occurrence
  const doubleColonCount = (trimmed.match(/::/g) || []).length
  if (doubleColonCount > 1) return null

  let groups: string[] = []

  if (doubleColonCount === 1) {
    const [leftPart, rightPart] = trimmed.split('::')
    const left = leftPart ? leftPart.split(':') : []
    const right = rightPart ? rightPart.split(':') : []
    const totalPresent = left.length + right.length
    if (totalPresent > 7) return null
    const missing = 8 - totalPresent
    groups = [...left, ...Array<string>(missing).fill('0'), ...right]
  } else {
    groups = trimmed.split(':')
    if (groups.length !== 8) return null
  }

  if (groups.length !== 8) return null

  let result = 0n
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null
    result = (result << 16n) | BigInt(parseInt(group, 16))
  }

  return result
}

/**
 * Checks whether an input string is a valid standalone IPv4 or IPv6 address (without subnet mask).
 */
export function isIpAddress(input: string): boolean {
  if (!input) return false
  const trimmed = input.trim()
  return parseIpv4ToBigInt(trimmed) !== null || parseIpv6ToBigInt(trimmed) !== null
}

/**
 * Checks whether an IPv4 or IPv6 address falls within a specified CIDR subnet range.
 * Supports IPv4 (e.g. query: "185.220.101.47", cidr: "185.220.101.0/24")
 * and IPv6 (e.g. query: "2a01:4f8::1", cidr: "2a01:4f8::/32").
 * Returns false if families do not match, formats are invalid, or the IP is outside the range.
 */
export function isIpInCidr(queryIp: string, cidrRange: string): boolean {
  if (!queryIp || !cidrRange) return false
  const trimmedQuery = queryIp.trim()
  const trimmedCidr = cidrRange.trim()

  if (!trimmedCidr.includes('/')) return false

  const [rangeBase, prefixStr] = trimmedCidr.split('/')
  if (!rangeBase || prefixStr === undefined) return false

  if (!/^\d{1,3}$/.test(prefixStr)) return false
  const prefix = Number(prefixStr)

  // 1. IPv4 CIDR matching
  if (rangeBase.includes('.')) {
    if (prefix < 0 || prefix > 32) return false
    const ipBigInt = parseIpv4ToBigInt(trimmedQuery)
    if (ipBigInt === null) return false
    const rangeBigInt = parseIpv4ToBigInt(rangeBase)
    if (rangeBigInt === null) return false

    if (prefix === 0) return true
    const mask = ((1n << 32n) - 1n) ^ ((1n << BigInt(32 - prefix)) - 1n)
    return (ipBigInt & mask) === (rangeBigInt & mask)
  }

  // 2. IPv6 CIDR matching
  if (rangeBase.includes(':')) {
    if (prefix < 0 || prefix > 128) return false
    const ipBigInt = parseIpv6ToBigInt(trimmedQuery)
    if (ipBigInt === null) return false
    const rangeBigInt = parseIpv6ToBigInt(rangeBase)
    if (rangeBigInt === null) return false

    if (prefix === 0) return true
    const mask = ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - prefix)) - 1n)
    return (ipBigInt & mask) === (rangeBigInt & mask)
  }

  return false
}
