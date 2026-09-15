// ==UserScript==
// @name         Pocket Option - Raw Live Price Monitor
// @namespace    PO-Live-Monitor
// @version      1.0
// @match        https://pocketoption.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('%c[PO LIVE] WebSocket monitor starting...', 'color: orange; font-weight:bold;');

    const NativeWebSocket = window.WebSocket;

    function processText(text) {
        if (!text || typeof text !== 'string') return;

        // We are looking for messages like:
        // [["AUDCAD_otc",1789053243.076,1.02745]]

        const match = text.match(
            /\[\[\s*"([^"]+)"\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]\]/
        );

        if (!match) return;

        const symbol = match[1];
        const timestamp = Number(match[2]);
        const price = Number(match[3]);

        if (!Number.isFinite(price)) return;

        console.log(
            `%c[PO TICK] ${symbol} | ${timestamp} | PRICE = ${price}`,
            'color: lime; font-weight:bold;'
        );
    }

    async function processMessage(data) {

        // Normal text WebSocket message
        if (typeof data === 'string') {
            processText(data);
            return;
        }

        // ArrayBuffer
        if (data instanceof ArrayBuffer) {
            try {
                const text = new TextDecoder().decode(data);
                processText(text);
            } catch (e) {}
            return;
        }

        // Blob
        if (data instanceof Blob) {
            try {
                const buffer = await data.arrayBuffer();
                const text = new TextDecoder().decode(buffer);
                processText(text);
            } catch (e) {}
        }
    }

    function hookWebSocket(ws) {

        ws.addEventListener('message', function (event) {
            processMessage(event.data);
        });

        console.log(
            '%c[PO LIVE] WebSocket hooked:',
            'color:cyan;',
            ws.url
        );
    }

    function PatchedWebSocket(...args) {

        const ws = new NativeWebSocket(...args);

        hookWebSocket(ws);

        return ws;
    }

    PatchedWebSocket.prototype = NativeWebSocket.prototype;

    Object.setPrototypeOf(
        PatchedWebSocket,
        NativeWebSocket
    );

    // Preserve WebSocket constants
    PatchedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = NativeWebSocket.OPEN;
    PatchedWebSocket.CLOSING = NativeWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = NativeWebSocket.CLOSED;

    window.WebSocket = PatchedWebSocket;

})();
