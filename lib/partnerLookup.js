export function buildPartnerRefNameMap(partners) {
  const map = new Map();
  for (const partner of partners || []) {
    if (partner.partnerRef) {
      map.set(partner.partnerRef, partner.name || partner.partnerRef);
    }
  }
  return map;
}

export function resolvePartnerDisplayName(partnerRef, map) {
  if (!partnerRef) return "N/A";
  return map?.get(partnerRef) || partnerRef;
}
