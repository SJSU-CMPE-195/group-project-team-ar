## Lens Studio & Spectacles Setup Guide

### Prerequisites
- Spectacles Version: 24

### 1. Install Required Apps

- **Desktop**: Download [Lens Studio For Spectacles](https://ar.snap.com/spectacles?utm_campaign=LensStudio_PM_P0_RET&utm_content=LS_ProductPage&utm_medium=PAIDPLATFORM&utm_source=GooglePM&utm_term=Retargeting_LS_Downloaders)
- **Mobile**: Download Spectacles by Snap Inc.
  - [iOS](https://apps.apple.com/us/app/spectacles-by-snap-inc/id6502670261)
  - [Android](https://play.google.com/store/apps/details?id=com.snap.spectacles.app&hl=en_US&pli=1)
  - Ensure Spectacles firmware is up to date via the mobile app (Check Settings → Software Update)

### 2. Set up Spectacles
- Turn on Spectacles
- Connect Spectacles to the mobile app
- Connect Spectacles to the desktop app (Under `Preview Lens`)
  - **Wireless**: Ensure Spectacles and your computer are on the same WiFi network
  - **Wired**: Connect Spectacles to your computer using a USB-C cable


### 3. Clone the Repository

```bash
git clone https://github.com/SJSU-CMPE-195/group-project-team-ar.git
cd group-project-team-ar
```
- The Lens Studio project is located in: `src/lensstudio-basetemplate`

### 4. Open the Project in Lens Studio
1. Open Lens Studio
2. Click File → Open Project
3. Go to `src/lensstudio-basetemplate`
4. Select `lensstudio-baseproject.esproj`

### 5. Run the Project
1. Make sure Spectacles are connected
2. In Lens Studio, click `Preview Lens` → Choose `Spectacles`
3. Wait for the lens to load on the Spectacles

If setup is successful, you should see a 3D red panda rendered and moving in your Spectacles view.

### Reference
[Building Your First Spectacles Lens](https://developers.snap.com/spectacles/get-started/start-building/build-your-first-spectacles-lens-tutorial)
