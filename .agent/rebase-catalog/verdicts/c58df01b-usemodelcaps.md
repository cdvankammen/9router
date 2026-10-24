# Verdict: c58df01b (combo duplicate + model caps)

**Method**: Direct engineering proof (file-list enumeration)
**Verdict**: APPROVE

## Plan
1. Take upstream capabilities.js changes (glm-5.2 thinkingEffortSupported, alias additions)
2. Replay our useModelCaps.js with modelCapOverrides MERGED alongside upstream resolveCaps/ALIAS_TO_ID
3. Replay our dashboard UI (Duplicate button, model chooser sorting)
4. Verify settingsRepo + ModelSelectModal vs upstream routes

## Overlap files (12)
open-sse/executors/default.js, capabilities.js, usage.js,
combos/page.js, ModelRow.js, providers/[id]/page.js,
ProviderLimits/utils.js, models/route.js, providers/[id]/models/route.js,
settingsRepo.js, ModelSelectModal.js, useModelCaps.js

## OUR-only (5)
Plus 5 files replay cleanly without upstream conflict.
