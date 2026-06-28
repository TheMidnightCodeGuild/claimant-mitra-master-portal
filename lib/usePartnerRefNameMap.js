import { usePartnerMapContext } from "./PartnerMapContext";

/** @deprecated Use usePartnerMapContext directly; kept for existing imports. */
export default function usePartnerRefNameMap() {
  return usePartnerMapContext();
}
