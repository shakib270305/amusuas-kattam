// ==UserScript==
// @name         PocketOption Shift Click Timer
// @namespace    pocketoption-shift-timer-final
// @version      16.0
// @match        https://pocketoption.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =====================================================
    // IMPORTANT:
    // সব পুরোনো version-এর common kill switch
    // =====================================================

    window.__PO_TIMER_STOPPED__ = false;


    // =====================================================
    // VARIABLES
    // =====================================================

    let minusInterval = null;
    let popupWatcher = null;

    let active = false;

    let lastShiftClick = 0;


    // =====================================================
    // VISIBLE
    // =====================================================

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


    // =====================================================
    // STOP EVERYTHING
    // =====================================================

    function STOP_ALL(reason) {

        active = false;

        window.__PO_TIMER_STOPPED__ = true;


        if (minusInterval !== null) {

            clearInterval(minusInterval);
            minusInterval = null;
        }


        if (popupWatcher !== null) {

            clearInterval(popupWatcher);
            popupWatcher = null;
        }


        console.log(
            '[PO Timer] ====================================='
        );

        console.log(
            '[PO Timer] 🛑 ALL AUTOMATION STOPPED'
        );

        console.log(
            '[PO Timer] Reason:',
            reason
        );

        console.log(
            '[PO Timer] NO MORE MINUS CLICKS'
        );

        console.log(
            '[PO Timer] ====================================='
        );
    }


    // =====================================================
    // FIND TOP-LEFT TIMER
    // =====================================================

    function findTopLeftTimer() {

        const timers = [
            ...document.querySelectorAll(
                '.block--expiration-inputs .control__value'
            )
        ].filter(isVisible);


        if (!timers.length)
            return null;


        const candidates = timers.filter(function (el) {

            const r = el.getBoundingClientRect();

            return (
                r.left < window.innerWidth / 2 &&
                r.top < window.innerHeight / 2
            );
        });


        if (!candidates.length)
            return null;


        candidates.sort(function (a, b) {

            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();


            if (
                Math.abs(ra.top - rb.top) > 20
            ) {
                return ra.top - rb.top;
            }


            return ra.left - rb.left;
        });


        return candidates[0];
    }


    // =====================================================
    // TIMER TARGET
    // =====================================================

    function getTimerTarget(timer) {

        if (!timer)
            return null;


        const inner =
            timer.querySelector('.value__val');


        if (
            inner &&
            isVisible(inner)
        ) {
            return inner;
        }


        return timer;
    }


    // =====================================================
    // OPEN TIMER
    // =====================================================

    function openTimer(el) {

        if (!el)
            return false;


        try {

            const r =
                el.getBoundingClientRect();


            const options = {

                bubbles: true,
                cancelable: true,
                view: window,

                button: 0,

                clientX:
                    r.left + r.width / 2,

                clientY:
                    r.top + r.height / 2
            };


            el.dispatchEvent(
                new MouseEvent(
                    'mouseover',
                    options
                )
            );


            el.dispatchEvent(
                new MouseEvent(
                    'mousedown',
                    {
                        ...options,
                        buttons: 1
                    }
                )
            );


            el.dispatchEvent(
                new MouseEvent(
                    'mouseup',
                    {
                        ...options,
                        buttons: 0
                    }
                )
            );


            el.dispatchEvent(
                new MouseEvent(
                    'click',
                    {
                        ...options,
                        buttons: 0
                    }
                )
            );


            return true;

        } catch (e) {

            console.log(
                '[PO Timer] Timer open error:',
                e
            );

            return false;
        }
    }


    // =====================================================
    // FIND SECONDS MINUS
    // =====================================================

    function findSecondsMinus() {

        const buttons = [
            ...document.querySelectorAll(
                '.trading-panel-modal .btn-minus'
            )
        ].filter(isVisible);


        if (buttons.length < 3)
            return null;


        return buttons[2];
    }


    // =====================================================
    // READ INITIAL TIMER
    // =====================================================

    function readInitialTime() {

        const timer =
            findTopLeftTimer();


        if (!timer)
            return null;


        /*
         * Timer-এর text:
         *
         * 00:01:00
         *
         * অথবা
         *
         * 01:00
         */


        const text =
            (
                timer.innerText ||
                timer.textContent ||
                ''
            )
            .trim()
            .replace(/\s+/g, ' ');


        console.log(
            '[PO Timer] Initial timer text:',
            text
        );


        let match =
            text.match(
                /(\d{1,2})\s*:\s*(\d{1,2})\s*:\s*(\d{1,2})/
            );


        if (match) {

            const h =
                parseInt(match[1], 10);

            const m =
                parseInt(match[2], 10);

            const s =
                parseInt(match[3], 10);


            return (
                h * 3600 +
                m * 60 +
                s
            );
        }


        match =
            text.match(
                /(\d{1,2})\s*:\s*(\d{1,2})/
            );


        if (match) {

            const m =
                parseInt(match[1], 10);

            const s =
                parseInt(match[2], 10);


            return (
                m * 60 +
                s
            );
        }


        return null;
    }


    // =====================================================
    // MINUS ONCE
    // =====================================================

    function minusOnce() {

        /*
         * সবচেয়ে গুরুত্বপূর্ণ safety check
         */

        if (!active)
            return;


        if (window.__PO_TIMER_STOPPED__)
            return;


        /*
         * আমরা নিজের click count রাখছি।
         *
         * Initial duration যদি 60 sec হয়,
         * target = 3 sec।
         *
         * প্রয়োজনীয় minus:
         *
         * 60 - 3 = 57
         */

        if (
            minusOnce.remainingClicks <= 0
        ) {

            STOP_ALL(
                '3-second limit reached'
            );

            return;
        }


        const button =
            findSecondsMinus();


        if (!button) {

            console.log(
                '[PO Timer] Minus button not found.'
            );

            return;
        }


        /*
         * ONE click only
         */

        button.click();


        minusOnce.remainingClicks--;


        console.log(
            '[PO Timer] ONE MINUS CLICK | Remaining clicks:',
            minusOnce.remainingClicks
        );


        /*
         * যদি এই click-এর পর আর কোনো minus
         * দরকার না হয়, এখানেই সব বন্ধ।
         */

        if (
            minusOnce.remainingClicks <= 0
        ) {

            STOP_ALL(
                'timer reduced to 3 seconds'
            );
        }
    }


    minusOnce.remainingClicks = 0;


    // =====================================================
    // START AUTOMATION
    // =====================================================

    function startAutomation() {

        /*
         * আগের সব internal timer বন্ধ
         */

        if (minusInterval !== null) {

            clearInterval(
                minusInterval
            );

            minusInterval = null;
        }


        if (popupWatcher !== null) {

            clearInterval(
                popupWatcher
            );

            popupWatcher = null;
        }


        window.__PO_TIMER_STOPPED__ = false;

        active = true;


        console.log(
            '[PO Timer] ==============================='
        );

        console.log(
            '[PO Timer] START'
        );


        // =================================================
        // READ CURRENT TIMER
        // =================================================

        const initialTime =
            readInitialTime();


        if (
            initialTime === null ||
            initialTime <= 3
        ) {

            STOP_ALL(
                'initial timer is already <= 3 seconds'
            );

            return;
        }


        /*
         * ================================================
         * HARD TARGET = 3 SECONDS
         * ================================================
         */

        minusOnce.remainingClicks =
            initialTime - 3;


        console.log(
            '[PO Timer] Initial seconds:',
            initialTime
        );

        console.log(
            '[PO Timer] Minus clicks required:',
            minusOnce.remainingClicks
        );

        console.log(
            '[PO Timer] Target = 3 seconds'
        );


        // =================================================
        // FIND TIMER
        // =================================================

        const timer =
            findTopLeftTimer();


        if (!timer) {

            STOP_ALL(
                'top-left timer not found'
            );

            return;
        }


        const target =
            getTimerTarget(timer);


        // =================================================
        // OPEN TIMER
        // =================================================

        openTimer(target);


        console.log(
            '[PO Timer] Top-left timer opened.'
        );


        // =================================================
        // WAIT FOR POPUP
        // =================================================

        let attempts = 0;


        popupWatcher =
            setInterval(function () {

                if (!active) {

                    clearInterval(
                        popupWatcher
                    );

                    popupWatcher = null;

                    return;
                }


                attempts++;


                const minus =
                    findSecondsMinus();


                if (minus) {

                    clearInterval(
                        popupWatcher
                    );

                    popupWatcher = null;


                    console.log(
                        '[PO Timer] POPUP OPENED'
                    );


                    /*
                     * First click
                     */

                    minusOnce();


                    /*
                     * এরপর প্রতি 1 sec-এ
                     * exactly ONE click.
                     */

                    if (active) {

                        minusInterval =
                            setInterval(
                                function () {

                                    minusOnce();

                                },
                                1000
                            );
                    }


                    return;
                }


                // Retry

                if (attempts === 10) {

                    if (active) {
                        openTimer(target);
                    }
                }


                if (attempts === 20) {

                    if (active) {
                        openTimer(target);
                    }
                }


                if (attempts >= 40) {

                    STOP_ALL(
                        'popup not found'
                    );
                }


            }, 100);
    }


    // =====================================================
    // SHIFT + LEFT CLICK
    // =====================================================

    window.addEventListener(
        'pointerdown',
        function (event) {

            if (
                event.button !== 0
            ) {
                return;
            }


            if (
                !event.shiftKey
            ) {
                return;
            }


            const now =
                Date.now();


            if (
                now - lastShiftClick <
                600
            ) {
                return;
            }


            lastShiftClick = now;


            console.log(
                '[PO Timer] SHIFT + LEFT CLICK'
            );


            startAutomation();

        },
        true
    );


    // =====================================================
    // LOADED
    // =====================================================

    console.log(
        '[PO Timer] ====================================='
    );

    console.log(
        '[PO Timer] FINAL v16.0 LOADED'
    );

    console.log(
        '[PO Timer] TARGET = 00:00:03'
    );

    console.log(
        '[PO Timer] AT 3 SECONDS = ALL OFF'
    );

    console.log(
        '[PO Timer] ====================================='
    );

})();
