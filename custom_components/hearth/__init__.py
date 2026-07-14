"""Hearth: smart heating system integration."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
    async_remove_panel,
)
from aiohttp import web
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

VERSION = json.loads((Path(__file__).parent / "manifest.json").read_text())["version"]
from .const import DOMAIN
from .coordinator import HearthCoordinator
from .services import async_setup_services, async_unload_services
from .store import HearthStore
from .websocket_api import async_register_websocket_api

PLATFORMS = ["sensor", "binary_sensor"]

_LOGGER = logging.getLogger(__name__)

_ALLOWED_FRONTEND_FILES = {"hearth-panel.js", "hearth-card.js", "hearth-cards.js"}


class FrontendRedirectView(HomeAssistantView):
    """Dev-mode redirect that busts browser cache using file mtime."""

    url = "/api/hearth/frontend/{filename}"
    name = "api:hearth:frontend"
    requires_auth = False

    def __init__(self, dist_path: Path) -> None:
        self._dist_path = dist_path

    async def get(self, request: web.Request, filename: str) -> web.Response:
        if filename not in _ALLOWED_FRONTEND_FILES:
            return web.Response(status=404)
        js_file = self._dist_path / filename
        if not js_file.exists():
            return web.Response(status=404)
        mtime = int(js_file.stat().st_mtime)
        return web.Response(
            status=302,
            headers={
                "Location": f"/hearth/frontend/{filename}?v={mtime}",
                "Cache-Control": "no-store",
            },
        )


type HearthConfigEntry = ConfigEntry


async def async_setup_entry(hass: HomeAssistant, entry: HearthConfigEntry) -> bool:
    """Set up Hearth from a config entry."""
    store = HearthStore(hass)
    await store.async_load()

    coordinator = HearthCoordinator(hass, store, entry)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN] = {
        "store": store,
        "coordinator": coordinator,
        "entry": entry,
    }

    await coordinator.async_start()
    await async_setup_services(hass)
    async_register_websocket_api(hass)

    # Forward sensor platform setup
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register frontend static path + panel (remove panel first in case of reload)
    dist_path = Path(__file__).parent / "frontend" / "dist"
    if dist_path.is_dir():
        await hass.http.async_register_static_paths(
            [StaticPathConfig("/hearth/frontend", str(dist_path), cache_headers=False)]
        )

        dev_mode = (Path(__file__).parent / ".dev").exists()
        if dev_mode:
            hass.http.register_view(FrontendRedirectView(dist_path))
            panel_url = "/api/hearth/frontend/hearth-panel.js"
            card_url = "/api/hearth/frontend/hearth-card.js"
            cards_url = "/api/hearth/frontend/hearth-cards.js"
            _LOGGER.info("Hearth dev mode: using redirect URLs for cache busting")
        else:
            panel_url = f"/hearth/frontend/hearth-panel.js?v={VERSION}"
            card_url = f"/hearth/frontend/hearth-card.js?v={VERSION}"
            cards_url = f"/hearth/frontend/hearth-cards.js?v={VERSION}"

        # Sidebar panel
        async_remove_panel(hass, "hearth")
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Hearth",
            sidebar_icon="mdi:radiator",
            frontend_url_path="hearth",
            require_admin=False,
            config={
                "_panel_custom": {
                    "name": "hearth-panel",
                    "embed_iframe": False,
                    "trust_external": False,
                    "module_url": panel_url,
                }
            },
        )

        # Lovelace cards - auto-loaded on all dashboards
        add_extra_js_url(hass, card_url)
        add_extra_js_url(hass, cards_url)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: HearthConfigEntry) -> bool:
    """Unload a config entry."""
    await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    data = hass.data.pop(DOMAIN, None)
    if data:
        coordinator: HearthCoordinator = data["coordinator"]
        await coordinator.async_stop()
        await async_unload_services(hass)
    async_remove_panel(hass, "hearth")

    return True
