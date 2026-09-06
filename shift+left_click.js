// ==UserScript==
// @name         PocketOption Shift Click Timer Auto Minus
// @namespace    pocketoption-auto-timer
// @version      11.0
// @match        https://pocketoption.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let popupWatcher = null;
    let lastTrigger = 0;


    // ==========================================
    // VISIBLE CHECK
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
    // TIMER CLICK
    // ==========================================

    function clickTimer(el) {

        if (!el) return false;

        try {

            const r = el.getBoundingClientRect();

            const options = {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0,
                buttons: 1,
                clientX: r.left + r.width / 2,
                clientY: r.top + r.height / 2
            };

            el.dispatchEvent(
                new MouseEvent('pointerover', options)
            );

            el.dispatchEvent(
                new MouseEvent('mouseover', options)
            );

            el.dispatchEvent(
                new MouseEvent('pointerdown', options)
            );

            el.dispatchEvent(
                new MouseEvent('mousedown', options)
            );

            el.dispatchEvent(
                new MouseEvent('pointerup', {
                    ...options,
                    buttons: 0
                })
            );

            el.dispatchEvent(
                new MouseEvent('mouseup', {
                    ...options,
                    buttons: 0
                })
            );

            el.dispatchEvent(
                new MouseEvent('click', {
                    ...options,
                    buttons: 0
                })
            );

            return true;

        } catch (error) {

            console.log(
                '[PO Timer] Timer click error:',
                error
            );

            return false;
        }
    }


    // ==========================================
    // MINUS CLICK
    // ==========================================

    function clickMinus(el) {

        if (!el) return false;

        try {

            // IMPORTANT:
            // শুধু একবার click হবে।
            // কোনো interval নেই।

            el.click();

            return true;

        } catch (error) {

            console.log(
                '[PO Timer] Minus click error:',
                error
            );

            return false;
        }
    }


    // ==========================================
    // FIND TOP-LEFT TIMER
    // ==========================================

    function findTopLeftTimer() {

        const timers = [
            ...document.querySelectorAll(
                '.block--expiration-inputs .control__value'
            )
        ].filter(isVisible);


        console.log(
            '[PO Timer] Timers found:',
            timers.length
        );


        if (!timers.length) {
            return null;
        }


        const topLeftTimers = timers.filter(function (el) {

            const r = el.getBoundingClientRect();

            return (
                r.left < window.innerWidth / 2 &&
                r.top < window.innerHeight / 2
            );
        });


        console.log(
            '[PO Timer] Top-left timers:',
            topLeftTimers.length
        );


        if (!topLeftTimers.length) {
            return null;
        }


        topLeftTimers.sort(function (a, b) {

            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();

            if (Math.abs(ra.top - rb.top) > 20) {
                return ra.top - rb.top;
            }

            return ra.left - rb.left;
        });


        return topLeftTimers[0];
    }


    // ==========================================
    // TIMER CLICK TARGET
    // ==========================================

    function getTimerTarget(timer) {

        if (!timer) return null;


        const value = timer.querySelector(
            '.value__val'
        );


        if (value && isVisible(value)) {

            return value;
        }


        return timer;
    }


    // ==========================================
    // FIND SECONDS MINUS
    // ==========================================

    function findSecondsMinus() {

        const buttons = [
            ...document.querySelectorAll(
                '.trading-panel-modal .btn-minus'
            )
        ].filter(isVisible);


        console.log(
            '[PO Timer] Visible minus buttons:',
            buttons.length
        );


        /*
         * Popup:
         *
         *       +      +      +
         *      00     06     31
         *       -      -      -
         *
         * 1st = hours
         * 2nd = minutes
         * 3rd = seconds
         */

        if (buttons.length >= 3) {

            return buttons[2];
        }


        return null;
    }


    // ==========================================
    // START
    // ==========================================

    function startAutomation() {

        console.log(
            '[PO Timer] ==========================='
        );

        console.log(
            '[PO Timer] START'
        );


        // পুরোনো popup watcher থাকলে বন্ধ

        if (popupWatcher !== null) {

            clearInterval(popupWatcher);
            popupWatcher = null;
        }


        // ======================================
        // FIND TOP-LEFT TIMER
        // ======================================

        const timer = findTopLeftTimer();


        if (!timer) {

            console.log(
                '[PO Timer] Top-left timer not found.'
            );

            return;
        }


        const target =
            getTimerTarget(timer);


        if (!target) {

            console.log(
                '[PO Timer] Timer target not found.'
            );

            return;
        }


        // ======================================
        // CLICK TOP-LEFT TIMER
        // ======================================

        console.log(
            '[PO Timer] Clicking top-left timer...'
        );


        clickTimer(target);


        console.log(
            '[PO Timer] Timer clicked.'
        );


        // ======================================
        // WAIT FOR POPUP
        // ======================================

        let attempts = 0;


        popupWatcher = setInterval(function () {

            attempts++;


            const minus =
                findSecondsMinus();


            if (minus) {

                clearInterval(popupWatcher);
                popupWatcher = null;


                console.log(
                    '[PO Timer] EXPIRATION POPUP OPENED.'
                );


                // ==================================
                // ONLY ONE MINUS CLICK
                // ==================================

                clickMinus(minus);


                console.log(
                    '[PO Timer] ONE SECOND REMOVED.'
                );


                console.log(
                    '[PO Timer] DONE.'
                );


                /*
                 * এখানেই শেষ।
                 *
                 * কোনো setInterval নেই।
                 *
                 * এখন Pocket Option-এর নিজের
                 * countdown চলবে:
                 *
                 * 06:30
                 * 06:29
                 * 06:28
                 * 06:27
                 * ...
                 */

                return;
            }


            // ==================================
            // RETRY TIMER CLICK
            // ==================================

            if (attempts === 10) {

                console.log(
                    '[PO Timer] Retrying timer click...'
                );

                clickTimer(target);
            }


            if (attempts === 20) {

                console.log(
                    '[PO Timer] Second timer retry...'
                );

                clickTimer(target);
            }


            // ==================================
            // TIMEOUT
            // ==================================

            if (attempts >= 40) {

                clearInterval(popupWatcher);
                popupWatcher = null;


                console.log(
                    '[PO Timer] Popup was not found.'
                );
            }


        }, 100);
    }


    // ==========================================
    // SHIFT + LEFT CLICK
    // ==========================================

    window.addEventListener(
        'pointerdown',
        function (event) {

            // শুধু left click

            if (event.button !== 0) {
                return;
            }


            // Shift ছাড়া কিছু করবে না

            if (!event.shiftKey) {
                return;
            }


            const now = Date.now();


            // একই click-এর duplicate আটকানো

            if (now - lastTrigger < 500) {
                return;
            }


            lastTrigger = now;


            console.log(
                '[PO Timer] SHIFT + LEFT CLICK DETECTED'
            );


            // Start

            startAutomation();

        },
        true
    );


    // ==========================================
    // LOADED
    // ==========================================

    console.log(
        '[PO Timer] ==========================='
    );

    console.log(
        '[PO Timer] v11.0 LOADED'
    );

    console.log(
        '[PO Timer] SHIFT + LEFT CLICK = START'
    );

    console.log(
        '[PO Timer] TARGET = TOP-LEFT TIMER'
    );

    console.log(
        '[PO Timer] ONLY ONE MINUS CLICK'
    );

    console.log(
        '[PO Timer] ==========================='
    );

})();
