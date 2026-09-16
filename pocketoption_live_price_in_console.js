// ==UserScript==
// @name         Pocket Option - Selected Market Live Monitor FIXED
// @namespace    PO-Live-Monitor
// @version      5.0
// @match        https://pocketoption.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log(
        '%c[PO LIVE] Selected Market Monitor v5 STARTED',
        'color:orange;font-weight:bold;'
    );

    const NativeWebSocket = window.WebSocket;

    let selectedAsset = null;
    const lastTick = {};

    // ==================================================
    // Convert:
    // AUD/CHF OTC -> AUDCHF_otc
    // EUR/USD OTC -> EURUSD_otc
    // ==================================================

    function normalizeAsset(text) {

        if (!text) return null;

        text = text
            .replace(/\s+/g, ' ')
            .trim();

        const match = text.match(
            /\b([A-Z]{3})\s*\/\s*([A-Z]{3})\s*(OTC)?\b/i
        );

        if (!match) return null;

        const base = match[1].toUpperCase();
        const quote = match[2].toUpperCase();

        const suffix = match[3]
            ? '_otc'
            : '';

        return base + quote + suffix;
    }

    // ==================================================
    // Detect currently selected market
    // ==================================================

    function detectSelectedAsset() {

        const elements = document.querySelectorAll(
            'button, a, div, span'
        );

        const candidates = [];

        for (const el of elements) {

            if (!el.offsetParent) continue;

            const text = (
                el.innerText ||
                el.textContent ||
                ''
            )
                .replace(/\s+/g, ' ')
                .trim();

            if (!text) continue;

            if (text.length > 40) continue;

            const asset = normalizeAsset(text);

            if (!asset) continue;

            candidates.push({
                asset,
                text,
                el
            });
        }

        if (!candidates.length) {
            return null;
        }

        // Prefer the shortest matching text.
        candidates.sort(
            (a, b) =>
                a.text.length - b.text.length
        );

        return candidates[0].asset;
    }

    // ==================================================
    // Monitor market selection
    // ==================================================

    function updateSelectedAsset() {

        const detected =
            detectSelectedAsset();

        if (!detected) return;

        if (detected !== selectedAsset) {

            selectedAsset = detected;

            console.log(
                `%c[PO MARKET] SELECTED MARKET: ${selectedAsset}`,
                'color:#00ffff;font-weight:bold;'
            );

            // Reset tick timing for new market
            delete lastTick[selectedAsset];
        }
    }

    setInterval(
        updateSelectedAsset,
        500
    );

    setTimeout(
        updateSelectedAsset,
        1500
    );

    // ==================================================
    // UTC time with milliseconds
    // ==================================================

    function getUTC(timestamp) {

        const d =
            new Date(timestamp * 1000);

        return (
            d.getUTCFullYear() + '-' +
            String(
                d.getUTCMonth() + 1
            ).padStart(2, '0') + '-' +
            String(
                d.getUTCDate()
            ).padStart(2, '0') + ' ' +

            String(
                d.getUTCHours()
            ).padStart(2, '0') + ':' +

            String(
                d.getUTCMinutes()
            ).padStart(2, '0') + ':' +

            String(
                d.getUTCSeconds()
            ).padStart(2, '0') + '.' +

            String(
                d.getUTCMilliseconds()
            ).padStart(3, '0') +

            ' UTC'
        );
    }

    // ==================================================
    // Process incoming message
    // ==================================================

    function processText(text) {

        if (
            !text ||
            typeof text !== 'string'
        ) {
            return;
        }

        const match = text.match(
            /\[\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]\]/
        );

        if (!match) return;

        const symbol =
            match[1];

        const timestamp =
            Number(match[2]);

        const price =
            Number(match[3]);

        if (
            !Number.isFinite(timestamp) ||
            !Number.isFinite(price)
        ) {
            return;
        }

        // ==================================================
        // IMPORTANT:
        // Ignore all markets except selected market
        // ==================================================

        if (!selectedAsset) {
            return;
        }

        if (symbol !== selectedAsset) {
            return;
        }

        const utcTime =
            getUTC(timestamp);

        const previous =
            lastTick[symbol];

        // First tick
        if (!previous) {

            lastTick[symbol] = {
                timestamp,
                price
            };

            console.log(
                `%c[PO TICK FIRST] ${symbol} | UTC: ${utcTime} | PRICE: ${price}`,
                'color:yellow;font-weight:bold;'
            );

            return;
        }

        // Time difference
        const intervalMs =
            (timestamp -
             previous.timestamp) * 1000;

        // Price difference
        const priceChange =
            price -
            previous.price;

        const sign =
            priceChange > 0
                ? '+'
                : '';

        console.log(
            `%c[PO TICK] ${symbol} | UTC: ${utcTime} | PRICE: ${price} | INTERVAL: ${intervalMs.toFixed(0)} ms | CHANGE: ${sign}${priceChange.toFixed(8)}`,
            'color:#00ff00;font-weight:bold;'
        );

        lastTick[symbol] = {
            timestamp,
            price
        };
    }

    // ==================================================
    // Process WebSocket data
    // ==================================================

    async function processMessage(data) {

        if (typeof data === 'string') {

            processText(data);

            return;
        }

        if (data instanceof ArrayBuffer) {

            try {

                const text =
                    new TextDecoder().decode(data);

                processText(text);

            } catch (e) {}

            return;
        }

        if (data instanceof Blob) {

            try {

                const buffer =
                    await data.arrayBuffer();

                const text =
                    new TextDecoder().decode(buffer);

                processText(text);

            } catch (e) {}
        }
    }

    // ==================================================
    // Hook WebSocket
    // ==================================================

    function hookWebSocket(ws) {

        ws.addEventListener(
            'message',
            function (event) {

                processMessage(
                    event.data
                );
            }
        );

        console.log(
            '%c[PO LIVE] WebSocket hooked:',
            'color:cyan;',
            ws.url
        );
    }

    // ==================================================
    // Proxy WebSocket
    //
    // This preserves native WebSocket properties
    // such as CONNECTING / OPEN / CLOSED.
    // ==================================================

    const PatchedWebSocket =
        new Proxy(
            NativeWebSocket,
            {
                construct(
                    target,
                    args
                ) {

                    const ws =
                        Reflect.construct(
                            target,
                            args,
                            target
                        );

                    hookWebSocket(ws);

                    return ws;
                }
            }
        );

    window.WebSocket =
        PatchedWebSocket;

})();
