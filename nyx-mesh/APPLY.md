# How to add nyx-mesh to the Nyx-new desktop repo

This is an additive overlay — it drops a self-contained `nyx-mesh/` folder into your Electron
repo and does not touch existing files. From your Codespace / machine on the Nyx-new repo:

    # from the repo root (e.g. /workspaces/Nyx-new)
    git pull
    unzip -o nyx-mesh.zip -d .          # creates ./nyx-mesh/
    cd nyx-mesh && npm install && cd ..
    git add -A
    git commit -m "Add nyx-mesh: on-device QVAC brain + Hyperswarm P2P + USD-tether wallet"
    git push

## Wire it into Electron (main process)
    import { createNyx } from "./nyx-mesh/src/index.js"
    const nyx = createNyx({ fixtures: [17588232, 17588302] })
    nyx.on("snapshot", ({ snapshot, source }) => mainWindow.webContents.send("nyx:snapshot", { snapshot, source }))
    await nyx.start()
Expose `nyx.analyze(...)` over IPC so the renderer can request verdicts on demand.

## Quick self-test (no Electron needed)
    cd nyx-mesh && npm install && npm run demo
