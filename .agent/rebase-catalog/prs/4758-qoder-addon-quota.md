# PR #4758 — fix(qoder): surface add-on (free-credit promo) quota in the quota tracker
- **Author:** Wnghao, **Merged:** 2026-10-15 (v0.5.104), **Files:** 3
- `getQoderUsage()` only read userQuota + orgResourcePackage — addOnQuota (free-credit grants) was invisible. CN + intl endpoints both return addOnQuota block.
- Fix: parse addOnQuota as third quotas.addOn bucket (total/used/remaining/unit/detailUrl). Split expiresAt handling — user/org get account-level sentinel (9999-12-31 → neverExpires:true); addOn gets no reset date (points at detailUrl instead).
- QuotaTable.js: append unit, render Never expires, turn detailUrl rows into See details ↗ links.
- Relevance: **LOW** — our branch likely doesn't touch Qoder quota. Pure additive.
