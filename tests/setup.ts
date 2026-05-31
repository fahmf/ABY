// Preload: daftarkan happy-dom secara global agar tes komponen React
// punya document/window. Dipasang via bunfig.toml [test].preload.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
