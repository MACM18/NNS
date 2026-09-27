export type ServiceType = "FTTH" | "DATA" | "PEO_TV";

export function classifyService(dp: string | null | undefined, telephoneNo: string | null | undefined): ServiceType {
  if (/^peo[\s-]*tv$/i.test((dp || "").trim())) return "PEO_TV";
  if (/[a-z]/i.test(telephoneNo || "")) return "DATA";
  return "FTTH";
}

export function serviceDescription(serviceType: ServiceType, minLength?: number, maxLength?: number | null): string {
  if (serviceType === "PEO_TV") return "Peo TV / IPTV - Second visit";
  const range = maxLength == null ? `${minLength}+` : `${minLength}-${maxLength}`;
  return `${serviceType === "DATA" ? "DATA" : "FTTH"} - DW length (${range})`;
}

export const OPTIONAL_ITEM_RATES = {
  POLE_56: 700,
  POLE_67: 800,
  POLE_8: 900,
  HIGH_RISE: 3800,
} as const;

export type OptionalItemCode = keyof typeof OPTIONAL_ITEM_RATES;

export const OPTIONAL_ITEM_DESCRIPTIONS: Record<OptionalItemCode, string> = {
  POLE_56: "5.6m Pole Installation",
  POLE_67: "6.7m Pole Installation",
  POLE_8: "8m Pole Installation",
  HIGH_RISE: "FTTH - High Rise Building (Configuration only)",
};

export type OptionalItemInput = Partial<Record<OptionalItemCode, number | { quantity: number; unitRate?: number }>>;
