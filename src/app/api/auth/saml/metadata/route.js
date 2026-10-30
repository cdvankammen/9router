import { getSettings } from "@/lib/localDb";
import { generateSamlMetadata, getSamlBaseUrl } from "@/lib/auth/saml";

export async function GET(request) {
  try {
    const settings = await getSettings();
    // SECURITY (Finding #331): use getSamlBaseUrl (which respects BASE_URL /
    // NEXT_PUBLIC_BASE_URL) instead of `new URL(request.url).origin`. The raw
    // URL.origin on a HOSTNAME=0.0.0.0 deployment produces
    // `http://0.0.0.0:20128/api/auth/saml/acs` in the published metadata,
    // which is unreachable from any network and discloses the bind address.
    // Aligning with start/acs routes so a single helper governs all SAML URLs.
    const origin = getSamlBaseUrl(request, settings);
    const metadataXml = generateSamlMetadata(origin, settings);

    return new Response(metadataXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response(`<?xml version="1.0"?><Error>${error.message || "Failed to generate metadata"}</Error>`, {
      status: 500,
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
}
