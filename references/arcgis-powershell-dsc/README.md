# ArcGIS PowerShell DSC 5.0.1

This folder vendors the official **ArcGIS PowerShell Desired State Configuration (DSC)** resource module (version **5.0.1**) as a zip archive.

## What it is for

- **Server-side deployment automation** for **ArcGIS Enterprise** components on Windows (e.g. Server, Portal, Data Store, Web Adaptor) using PowerShell DSC.
- Use it when you need a **repeatable, scripted install** of ArcGIS Enterprise in your environment for **hosting map services, feature layers, and geodata** that other apps (including field tools) can consume via REST.

## What it is *not*

- It is **not** a JavaScript/React mapping SDK. The Roofing Pro Vite app continues to use **Mapbox** for interactive maps in the browser.
- It does **not** run inside the Expo or Vite apps; it runs on **Windows Server** (or similar) where you deploy ArcGIS.

## Using the archive

1. Unzip `arcgis-powershell-dsc-5.0.1.zip` on a machine where you install ArcGIS Enterprise.
2. Follow **Esri’s current documentation** for ArcGIS Enterprise and PowerShell DSC (module names and prerequisites change over time).
3. Point your organization’s **portal / feature service URLs** at the services you publish after deployment if you later wire the app to ArcGIS REST endpoints.

## Version

- Bundled file: `arcgis-powershell-dsc-5.0.1.zip`
- Source: Esri ArcGIS PowerShell DSC distribution (verify checksums with Esri if required for compliance).
