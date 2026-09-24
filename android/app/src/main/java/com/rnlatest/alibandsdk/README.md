# AliBandSDK – Android native module (placeholder)

Kotlin Turbo Module that wraps the vendor bracelet SDKs (H Band / Veepoo, E500)
and exposes methods + events to JS through `src/services/WearableService`
(`HBandAdapter`, `E500Adapter`).

Status: waiting for the vendor SDKs (`.aar` / `.jar`) from the client.

- Put SDK binaries in `android/app/libs/` – they are git-ignored, **never commit them** (NDA).
- Keep all vendor-specific code inside this package; the rest of the app only uses `WearableAdapter`.
