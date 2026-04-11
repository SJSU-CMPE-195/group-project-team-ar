# Lens Studio Crash Troubleshooting

## Issue
Lens Studio (v5.15.4), running on iOS based on Toey’s observation, crashed during the "Loading Project" stage. This was most likely caused by unstable or corrupted project assets.

## Solution
To resolve the issue:

1. Clear Lens Studio and system cache.
2. Clone the last known working version of the project from GitHub.
3. Reopen the project in Lens Studio.

## Notes
This approach helped restore the project to a stable state and avoided issues caused by corrupted local project files.

## Reference
[Troubleshooting Lens Studio](https://developers.snap.com/lens-studio/lens-studio-workflow/advanced/troubleshooting-lens-studio#clearing-cache-on-mac)
