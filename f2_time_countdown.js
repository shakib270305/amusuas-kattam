// ==UserScript==
// @name         PocketOption Top-Left Timer Auto Minus
// @namespace    pocketoption-auto-timer
// @version      3.0
// @match        https://pocketoption.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let running = false;
    let intervalId = null;

    // ==========================================
    // DOM click — physical mouse নড়বে না
    // ==========================================
    function clickElement(el) {
        if (!el) return false;

        el.click();
        return true;
    }

    // ==========================================
    // Visible element
    // ==========================================
    function isVisible(el) {
        if (!el) return false;

        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);

        return (
            r.width > 0 &&
            r.height > 0 &&
            s.display !== 'none' &&
            s.visibility !== 'hidden'
        );
    }

    // ==========================================
    // TOP-LEFT TIMER
    // ==========================================
    function findTopLeftTimer() {

        /*
         * Exact structure discovered from your page:
         *
         * .block--expiration-inputs
         *      └── .control__value
         *              └── .value__val
         */

        const timers = [
            ...document.querySelectorAll(
                '.block--expiration-inputs .control__value'
            )
        ].filter(isVisible);

        if (!timers.length)
            return null;

        /*
         * Multiple charts থাকতে পারে।
         * Top-left chart-এর timer বেছে নিচ্ছি।
         */
        const candidates = timers.filter(el => {
            const r = el.getBoundingClientRect();

            return (
                r.left < window.innerWidth / 2 &&
                r.top < window.innerHeight / 2
            );
        });

        if (!candidates.length)
            return null;

        candidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();

            if (Math.abs(ra.top - rb.top) > 20)
                return ra.top - rb.top;

            return ra.left - rb.left;
        });

        return candidates[0];
    }

    // ==========================================
    // SECONDS MINUS
    // ==========================================
    function findSecondsMinus() {

        /*
         * Popup-এর preset structure:
         *
         * S3   S15   S30
         * M1   M3    M5
         * M30  H1    H4
         *
         * এবং উপরের row-তে:
         *
         *    +    +    +
         *   00   05   24
         *    -    -    -
         *
         * .btn-minus-এর 3rd element = seconds minus
         */

        const minusButtons = [
            ...document.querySelectorAll(
                '.trading-panel-modal .btn-minus'
            )
        ].filter(isVisible);

        if (minusButtons.length >= 3)
            return minusButtons[2];

        return null;
    }

    // ==========================================
    // ONE SECOND MINUS
    // ==========================================
    function minusOneSecond() {

        if (!running)
            return;

        const button = findSecondsMinus();

        if (!button) {
            console.warn(
                '[PO AutoTimer] Seconds minus not found.'
            );
            return;
        }

        clickElement(button);
    }

    // ==========================================
    // START
    // ==========================================
    function start() {

        if (running)
            return;

        const timer = findTopLeftTimer();

        if (!timer) {
            console.warn(
                '[PO AutoTimer] Top-left timer not found.'
            );
            return;
        }

        running = true;

        console.log(
            '[PO AutoTimer] ON'
        );

        // --------------------------------------
        // STEP 1
        // Click TOP-LEFT timer
        // --------------------------------------

        clickElement(timer);

        // --------------------------------------
        // STEP 2
        // Wait for popup to appear
        // --------------------------------------

        let attempts = 0;

        const waitForPopup = setInterval(() => {

            if (!running) {
                clearInterval(waitForPopup);
                return;
            }

            attempts++;

            const minus = findSecondsMinus();

            if (minus) {

                clearInterval(waitForPopup);

                console.log(
                    '[PO AutoTimer] Popup detected.'
                );

                // First minus click
                clickElement(minus);

                console.log(
                    '[PO AutoTimer] Seconds minus started.'
                );

                // ----------------------------------
                // STEP 3
                // Every 1 second
                // ----------------------------------

                intervalId = setInterval(() => {
                    minusOneSecond();
                }, 1000);
            }

            // Don't search forever
            if (attempts >= 20) {

                clearInterval(waitForPopup);

                console.warn(
                    '[PO AutoTimer] Popup detected but seconds minus was not found.'
                );
            }

        }, 100);
    }

    // ==========================================
    // STOP
    // ==========================================
    function stop() {

        running = false;

        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }

        console.log(
            '[PO AutoTimer] OFF'
        );
    }

    // ==========================================
    // F2
    // ==========================================
    window.addEventListener(
        'keydown',
        function (event) {

            if (event.key !== 'F2')
                return;

            event.preventDefault();
            event.stopImmediatePropagation();

            if (running) {
                stop();
            } else {
                start();
            }

        },
        true
    );

    console.log(
        '[PO AutoTimer] v3.0 loaded — F2 = ON/OFF'
    );

})();
