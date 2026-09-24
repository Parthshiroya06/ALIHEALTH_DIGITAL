# AliBandSDK – iOS native module (placeholder)

Swift Turbo Module that wraps the vendor bracelet SDKs (H Band / Veepoo, E500)
and exposes methods + events to JS through `src/services/WearableService`
(`HBandAdapter`, `E500Adapter`).

Status: waiting for the vendor SDKs (`.framework` / `.xcframework`) from the client.

- Put SDK binaries in `ios/AliBandSDK/Frameworks/` – they are git-ignored, **never commit them** (NDA).
- Keep all vendor-specific code inside this folder; the rest of the app only uses `WearableAdapter`.
