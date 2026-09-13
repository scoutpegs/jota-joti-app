        const API_URL = "https://script.google.com/macros/s/AKfycbwa3R5odIbwsPRQHHSedx4mbwRrsAE3tWLcfZX1d4Nq_QNBBDozp2TFX1jfq1eSCLwP/exec";

        /* ==========================================================
           COMBINED PORTAL CONFIGURATION
           ========================================================== */

        const SIGNUP_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeBhtFuVNzjqtAFOeluNfiA1hFPr1JXXfSx9xZcnivSV1fiUw/viewform?usp=header";
        const EVENT_START_ISO = "2026-10-16T00:00:00+08:00";
        const EVENT_START_MS = new Date(EVENT_START_ISO).getTime();
        const FINAL_DAY_MS = EVENT_START_MS - (24 * 60 * 60 * 1000);
        const INSTALLED_KEY = "jota_installed";
        const AUTH_SESSION_KEY = 'jotajoti_auth_session_v3';
        const AUTH_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
        let dashboardView = 'login';
        let activeCategoryKey = '';
        let dashboardHandoffComplete = false;
        let lastDashboardBuildSignature = '';
        let backgroundRefreshInFlight = false;
        let rememberedSessionLoaded = false;
        let embedLoadToken = 0;
        let currentEmbeddedSite = null;

        let preLoginMode = false;
        let deferredInstallPrompt = null;
        let countdownInterval = null;
        let greetingInterval = null;
        let initialRouteApplied = false;


        let currentPin = "";
        let sessionUser = null;
        let dashboardData = null;


        function getGreeting() {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) return "Good morning";
            if (hour >= 12 && hour < 17) return "Good afternoon";
            if (hour >= 17 && hour < 21) return "Good evening";
            return "Welcome";
        }

        function updateDashboardGreeting() {
            const name = (sessionUser && sessionUser.Name) ? sessionUser.Name : "Scout";
            document.getElementById("dash-greeting-line").innerText = getGreeting().toUpperCase();
            document.getElementById("dash-greeting-name").innerText = name;
        }

        const SAVED_PIN_KEY = 'jotajoti_saved_pin';
        let lastAttemptedPin = '';

        window.addEventListener('DOMContentLoaded', () => {
            initializeCombinedPortal();
        });

        function initializeCombinedPortal() {
            resetLoginForm();
            initializePWA();
            registerAppServiceWorker();
            startGreetingClock();

            const restored = restoreRememberedSessionInstantly();

            if (isFinalDayOrLater()) {
                dashboardHandoffComplete = true;
                setDashboardView(restored ? 'categories' : 'login');
                openDashboardMode({source:'startup', preserveView:true, animate:false});
                if (restored) {
                    showSessionRefreshLoader('Refreshing your dashboard…');
                    refreshRememberedSession({keepOnFailure:true});
                } else {
                    restoreSavedSessionForDashboard();
                }
            } else {
                showTimerMode();
                startCountdown();
                if (restored) {
                    updatePortalGreeting();
                    showSessionRefreshLoader('Checking your saved account…');
                    refreshRememberedSession({keepOnFailure:true});
                } else {
                    restoreSavedSessionForTimer();
                }
            }

            window.setTimeout(() => checkPortalConnection(true), 4200);
        }

        function setDashboardView(view) { dashboardView = view; }

        function stopCountdown() {
            if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
        }

        function showSessionRefreshLoader(message) {
            const el = document.getElementById('session-refresh-loader');
            const text = document.getElementById('session-refresh-text');
            if (!el) return;
            if (text) text.innerText = message || 'Updating your dashboard…';
            el.classList.add('visible');
            el.setAttribute('aria-hidden','false');
        }

        function hideSessionRefreshLoader() {
            const el = document.getElementById('session-refresh-loader');
            if (!el) return;
            el.classList.remove('visible');
            el.setAttribute('aria-hidden','true');
        }

        // ---- Testing helper: skip the countdown on this device ----
        // This is deliberately NOT a short, guessable word like "preview" or
        // "test" — a link using this exact parameter is generated for you on
        // the private /admin page (so scouts/parents browsing normally will
        // never stumble onto it by trying obvious URLs). Visiting a link with
        // this parameter set to "1" jumps straight past the countdown into
        // the normal dashboard/login flow on that device, and remembers that
        // choice (localStorage) so it keeps working without the parameter on
        // future visits. Visiting with the parameter set to "0" turns it back
        // off. With NO parameter at all (the normal case for every visitor),
        // the countdown always shows as usual.
        const SKIP_COUNTDOWN_PARAM = 'jjscoutpreview2026';
        const SKIP_COUNTDOWN_KEY = 'jota_skip_countdown_preview';
        (function initSkipCountdownPreview() {
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.has(SKIP_COUNTDOWN_PARAM)) {
                    if (params.get(SKIP_COUNTDOWN_PARAM) === '0') localStorage.removeItem(SKIP_COUNTDOWN_KEY);
                    else localStorage.setItem(SKIP_COUNTDOWN_KEY, '1');
                }
            } catch (e) { /* localStorage unavailable — ignore */ }
        })();
        function isPreviewModeActive() {
            try { return localStorage.getItem(SKIP_COUNTDOWN_KEY) === '1'; } catch (e) { return false; }
        }

        function isFinalDayOrLater() {
            return isPreviewModeActive() || Date.now() >= FINAL_DAY_MS;
        }

        function isEventLive() {
            return Date.now() >= EVENT_START_MS;
        }

        function showTimerMode() {
            preLoginMode = false;
            if (isFinalDayOrLater()) { openDashboardMode({source:'timer-blocked', preserveView:true}); return; }
            setDashboardView('login');
            activeCategoryKey = '';
            document.getElementById('portal-page-wrap').style.display = 'block';
            document.getElementById('dashboard-page-wrap').style.display = 'none';
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'none';
            document.getElementById('submenu-screen').style.display = 'none';
            updateTopNavigation();
            updatePortalGreeting();
        }

        function openPreLogin() {
            if (isFinalDayOrLater()) { openDashboardMode({source:'prelogin-blocked', preserveView:true}); return; }
            preLoginMode = true;
            setDashboardView('login');
            document.getElementById('portal-page-wrap').style.display = 'none';
            document.getElementById('dashboard-page-wrap').style.display = 'block';
            document.getElementById('login-screen').style.display = 'block';
            document.getElementById('dashboard-screen').style.display = 'none';
            document.getElementById('submenu-screen').style.display = 'none';
            document.getElementById('prelogin-note').style.display = 'block';
            document.getElementById('back-to-timer-button').style.display = 'block';
            document.getElementById('signup-button').style.display = 'block';
            checkConnection();
            updateTopNavigation();
        }

        function returnToTimer() {
            if (isFinalDayOrLater()) { openDashboardMode({source:'return-blocked', preserveView:true}); return; }
            showTimerMode();
        }

        function openDashboardMode(options = {}) {
            const preserveView = options.preserveView !== false;
            preLoginMode = false;
            dashboardHandoffComplete = true;
            stopCountdown();
            document.getElementById('portal-page-wrap').style.display = 'none';
            document.getElementById('dashboard-page-wrap').style.display = 'block';
            document.getElementById('prelogin-note').style.display = 'none';
            document.getElementById('back-to-timer-button').style.display = 'none';

            if (sessionUser) {
                if (!preserveView || dashboardView === 'login') setDashboardView('categories');
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('dashboard-screen').style.display = dashboardView === 'categories' ? 'block' : 'none';
                document.getElementById('submenu-screen').style.display = dashboardView === 'submenu' ? 'block' : 'none';
                if (dashboardData) buildDashboard({preserveView:true});
                else if (dashboardView === 'categories') {
                    document.getElementById('category-grid').innerHTML = skeletonGridHTML(6);
                }
                ensureDashboardScreenOnly();
                updateDashboardGreeting();
            } else {
                setDashboardView('login');
                activeCategoryKey = '';
                document.getElementById('login-screen').style.display = 'block';
                document.getElementById('dashboard-screen').style.display = 'none';
                document.getElementById('submenu-screen').style.display = 'none';
            }
            updateTopNavigation();
            if (options.animate !== false) {
                const target = dashboardView === 'submenu' ? document.getElementById('submenu-screen') : document.getElementById('dashboard-screen');
                animateScreenIn(target);
            }
        }

        function ensureDashboardScreenOnly() {
            const login=document.getElementById('login-screen');
            const dash=document.getElementById('dashboard-screen');
            const sub=document.getElementById('submenu-screen');
            if (!login||!dash||!sub) return;
            login.style.display=dashboardView==='login'?'block':'none';
            dash.style.display=dashboardView==='categories'?'block':'none';
            sub.style.display=dashboardView==='submenu'?'block':'none';
        }

        function animateScreenIn(el) {
            if (!el) return;
            el.classList.remove('screen-enter');
            void el.offsetWidth;
            el.classList.add('screen-enter');
        }

        function updateTopNavigation() {
            const loginButton = document.getElementById('top-login-button');
            const accountButton = document.getElementById('top-account-button');
            if (!loginButton || !accountButton) return;
            if (sessionUser) { loginButton.style.display='none'; accountButton.style.display='block'; return; }
            accountButton.style.display='none'; loginButton.style.display='block';
            if (isFinalDayOrLater()) { loginButton.innerText='LOGIN'; loginButton.classList.remove('back-button'); loginButton.onclick=()=>openDashboardMode({source:'nav-login'}); return; }
            if (preLoginMode) { loginButton.innerText='BACK TO TIMER'; loginButton.classList.add('back-button'); loginButton.onclick=returnToTimer; }
            else { loginButton.innerText='LOGIN'; loginButton.classList.remove('back-button'); loginButton.onclick=openPreLogin; }
        }

        function updatePortalGreeting() {
            const card = document.getElementById('portal-greeting');

            if (!card) return;

            if (!sessionUser) {
                card.classList.remove('visible');
                return;
            }

            card.classList.add('visible');
            document.getElementById('portal-greeting-line').innerText = getGreeting().toUpperCase();
            document.getElementById('portal-greeting-name').innerText = sessionUser.Name || 'Scout';
            document.getElementById('portal-status').style.display = 'block';
            document.getElementById('portal-status').innerText =
                isFinalDayOrLater()
                    ? 'Your account is active and the dashboard is now the main page.'
                    : 'Your account is remembered on this device. The countdown remains the main page until the final 24 hours.';
        }

        function openSignupForm() {
            window.open(SIGNUP_FORM_URL, '_blank', 'noopener,noreferrer');
        }

        function startGreetingClock() {
            if (greetingInterval) clearInterval(greetingInterval);
            greetingInterval = setInterval(() => {
                updatePortalGreeting();
                if (sessionUser) updateDashboardGreeting();
            }, 60000);
        }

        function updateCountdown() {
            if (dashboardHandoffComplete || isFinalDayOrLater()) {
                const banner=document.getElementById('final-day-banner');
                if (banner) { banner.style.display='block'; banner.innerText=isEventLive()?'JOTA-JOTI is live! The dashboard is active.':'The final 24 hours have started. The dashboard is now active.'; }
                if (!dashboardHandoffComplete) { dashboardHandoffComplete=true; openDashboardMode({source:'countdown-handoff',preserveView:true}); }
                stopCountdown();
                return;
            }
            const remaining=Math.max(0,EVENT_START_MS-Date.now());
            const totalSeconds=Math.floor(remaining/1000);
            document.getElementById('days').innerText=String(Math.floor(totalSeconds/86400)).padStart(2,'0');
            document.getElementById('hours').innerText=String(Math.floor((totalSeconds%86400)/3600)).padStart(2,'0');
            document.getElementById('mins').innerText=String(Math.floor((totalSeconds%3600)/60)).padStart(2,'0');
            document.getElementById('secs').innerText=String(totalSeconds%60).padStart(2,'0');
            const banner=document.getElementById('final-day-banner');
            if (banner) banner.style.display='none';
        }

        function startCountdown() {
            stopCountdown();
            if (isFinalDayOrLater()) { dashboardHandoffComplete=true; openDashboardMode({source:'countdown-start-blocked',preserveView:true}); return; }
            updateCountdown();
            countdownInterval=setInterval(updateCountdown,1000);
        }

        function restoreRememberedSessionInstantly() {
            const pin=localStorage.getItem(SAVED_PIN_KEY);
            const raw=localStorage.getItem(AUTH_SESSION_KEY);
            if (!pin || !/^\d{4}$/.test(pin) || !raw) return false;
            try {
                const saved=JSON.parse(raw);
                if (!saved || saved.pin!==pin || !saved.user) return false;
                if (saved.savedAt && Date.now()-Number(saved.savedAt)>AUTH_SESSION_MAX_AGE_MS) return false;
                sessionUser=saved.user; rememberedSessionLoaded=true;
                document.getElementById('forget-btn').style.display='block';
                updatePortalGreeting(); updateTopNavigation();
                return true;
            } catch (_) { return false; }
        }

        function saveRememberedSession(pin,user) {
            try { localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify({pin,user,savedAt:Date.now()})); } catch (_) {}
        }

        function clearRememberedSession() { localStorage.removeItem(AUTH_SESSION_KEY); rememberedSessionLoaded=false; }

        function restoreSavedSessionForTimer() {
            const savedPin=localStorage.getItem(SAVED_PIN_KEY);
            if (!savedPin || !/^\d{4}$/.test(savedPin)) return;
            document.getElementById('forget-btn').style.display='block';
            refreshRememberedSession({keepOnFailure:true});
        }

        function restoreSavedSessionForDashboard() {
            if (restoreRememberedSessionInstantly()) { refreshRememberedSession({keepOnFailure:true}); return; }
            const savedPin=localStorage.getItem(SAVED_PIN_KEY);
            if (!savedPin || !/^\d{4}$/.test(savedPin)) { document.getElementById('forget-btn').style.display='none'; return; }
            refreshRememberedSession({keepOnFailure:false});
        }

        async function refreshRememberedSession(options={}) {
            if (backgroundRefreshInFlight) return;
            const pin=localStorage.getItem(SAVED_PIN_KEY);
            if (!pin || !/^\d{4}$/.test(pin)) return;
            backgroundRefreshInFlight=true;
            try {
                const response=await fetch(`${API_URL}?action=login&pin=${encodeURIComponent(pin)}&_=${Date.now()}`,{cache:'no-store'});
                const data=await response.json();
                if (!data || !data.success || !data.user) {
                    clearRememberedSession(); localStorage.removeItem(SAVED_PIN_KEY);
                    sessionUser=null; dashboardData=null; setDashboardView('login'); updateTopNavigation();
                    if (isFinalDayOrLater()) openDashboardMode({source:'invalid-session',preserveView:false});
                    return;
                }
                sessionUser=data.user;
                dashboardData={categories:Array.isArray(data.categories)?data.categories:[],links:Array.isArray(data.links)?data.links:[],logos:Array.isArray(data.logos)?data.logos:[]};
                saveRememberedSession(pin,sessionUser);
                updatePortalGreeting(); updateTopNavigation();
                if (isFinalDayOrLater()) {
                    if (dashboardView==='login') dashboardView='categories';
                    buildDashboard({force:true,reason:'remembered-refresh'}); ensureDashboardScreenOnly();
                }
            } catch (_) {
            } finally { backgroundRefreshInFlight=false; hideSessionRefreshLoader(); }
        }

        function checkPortalConnection(silent=false) {
            const dot=document.getElementById('portal-network-dot'); const text=document.getElementById('portal-network-text');
            if (!dot||!text) return;
            fetch(`${API_URL}?action=health&_=${Date.now()}`,{cache:'no-store'}).then(r=>r.json()).then(data=>{
                if(data&&data.success){dot.className='portal-network-dot ok';text.innerText=silent?'Ready':'Dashboard service connected';}
                else{dot.className='portal-network-dot bad';text.innerText=silent?'Service check unavailable':'Dashboard service reported a problem';}
            }).catch(()=>{dot.className='portal-network-dot bad';text.innerText=silent?'Offline (using saved account)':'Dashboard service is currently unreachable';});
        }


        let installPollTimer = null;

        function isRunningStandalone() {
            return (
                window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true
            );
        }

        /* ---------- Small inline SVG symbols used in the install steps ---------- */
        /* No emoji anywhere: these are plain vector line-icons. */
        const ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2c84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><rect x="4" y="11" width="16" height="10" rx="2"/></svg>';
        const ICON_DOTS_V = '<svg viewBox="0 0 24 24" fill="#5a2c84"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
        const ICON_DOTS_H = '<svg viewBox="0 0 24 24" fill="#5a2c84"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
        const ICON_LINES = '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2c84" stroke-width="2" stroke-linecap="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';
        const ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2c84" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
        const ICON_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2c84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg>';
        const ICON_TAP = '<svg viewBox="0 0 24 24" fill="none" stroke="#5a2c84" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/></svg>';

        function stepHTML(icon, html) {
            return '<div class="install-step">'
                + '<div class="install-step-icon">' + icon + '</div>'
                + '<div class="install-step-text">' + html + '</div>'
                + '</div>';
        }

        function detectDevice() {
            const ua = navigator.userAgent;
            const iPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
            const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isIPhone = /iPhone|iPod/i.test(ua);
            const isIOS = isIPad || isIPhone;
            const isIOSChrome = isIOS && /CriOS/i.test(ua);
            const isIOSFirefox = isIOS && /FxiOS/i.test(ua);
            const isIOSSafari = isIOS && !isIOSChrome && !isIOSFirefox;

            const isAndroid = /Android/i.test(ua);
            const isSamsung = isAndroid && /SamsungBrowser/i.test(ua);
            const isEdgeA = isAndroid && /EdgA/i.test(ua);
            const isFirefoxA = isAndroid && /Firefox/i.test(ua) && !isSamsung;
            const isChromeA = isAndroid && /Chrome/i.test(ua) && !isSamsung && !isEdgeA && !isFirefoxA;

            return { isIPad, isIPhone, isIOS, isIOSChrome, isIOSFirefox, isIOSSafari,
                      isAndroid, isSamsung, isEdgeA, isFirefoxA, isChromeA };
        }

        function renderIOSSteps(d) {
            const shareLocation = d.isIPad ? 'top toolbar, near the address bar' : 'bottom toolbar';
            let html = '<div class="install-heading">' + (d.isIPad ? 'iPad' : 'iPhone') + ' \u2014 Safari</div>';
            html += '<ul class="install-steps">';
            html += stepHTML(ICON_SHARE, 'Tap the <strong>Share</strong> icon in the ' + shareLocation + '.');
            html += stepHTML(ICON_PLUS, 'Scroll the share menu and tap <strong>Add to Home Screen</strong>.');
            html += stepHTML(ICON_TAP, 'Tap <strong>Add</strong> in the top-right corner to confirm.');
            html += stepHTML(ICON_HOME, 'Open the new <strong>JOTA-JOTI</strong> icon from your Home Screen.');
            html += '</ul>';
            if (!d.isIOSSafari) {
                html += '<div class="install-browser-warning">You\'re not in Safari right now. Open this page in Safari to add it \u2014 Chrome and Firefox on iPhone/iPad can\'t add apps to the Home Screen.</div>';
            }
            return html;
        }

        function renderAndroidSteps(d) {
            let menuIcon = ICON_DOTS_V;
            let menuName = 'the menu';
            let menuLocation = 'top-right corner';
            let browserLabel = 'Chrome';

            if (d.isSamsung) {
                menuIcon = ICON_LINES;
                menuName = 'the menu';
                menuLocation = 'bottom-right corner';
                browserLabel = 'Samsung Internet';
            } else if (d.isFirefoxA) {
                menuIcon = ICON_DOTS_V;
                menuLocation = 'bottom-right corner';
                browserLabel = 'Firefox';
            } else if (d.isEdgeA) {
                menuLocation = 'bottom toolbar';
                browserLabel = 'Edge';
            }

            let html = '<div class="install-heading">Android \u2014 ' + browserLabel + '</div>';
            html += '<ul class="install-steps">';
            html += stepHTML(menuIcon, 'Tap ' + menuName + ' in the ' + menuLocation + '.');
            html += stepHTML(ICON_PLUS, 'Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.');
            html += stepHTML(ICON_TAP, 'Confirm when prompted.');
            html += stepHTML(ICON_HOME, 'Open the new <strong>JOTA-JOTI</strong> icon from your Home Screen.');
            html += '</ul>';
            return html;
        }

        function initializePWA() {
            if (isRunningStandalone()) {
                localStorage.setItem(INSTALLED_KEY, 'true');
                hideInstallOverlay();
                return;
            }

            const isIPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || isIPadDesktopMode;
            if (!isMobile) return; // desktop keeps working normally in a browser tab

            showInstallOverlay();
        }

        function showInstallOverlay() {
            document.getElementById('mobile-install-overlay').style.display = 'flex';

            const d = detectDevice();
            const iosBox = document.getElementById('ios-install-instructions');
            const androidBox = document.getElementById('android-install-instructions');

            if (d.isAndroid) {
                iosBox.style.display = 'none';
                androidBox.style.display = 'block';
                androidBox.innerHTML = renderAndroidSteps(d);
            } else {
                androidBox.style.display = 'none';
                iosBox.style.display = 'block';
                iosBox.innerHTML = renderIOSSteps(d);
            }

            document.getElementById('install-native-btn').style.display = deferredInstallPrompt ? 'block' : 'none';

            if (!installPollTimer) {
                installPollTimer = setInterval(() => {
                    if (isRunningStandalone()) {
                        localStorage.setItem(INSTALLED_KEY, 'true');
                        hideInstallOverlay();
                    }
                }, 1500);
            }
        }

        function hideInstallOverlay() {
            document.getElementById('mobile-install-overlay').style.display = 'none';
            if (installPollTimer) {
                clearInterval(installPollTimer);
                installPollTimer = null;
            }
        }

        function recheckInstall() {
            if (isRunningStandalone()) {
                localStorage.setItem(INSTALLED_KEY, 'true');
                hideInstallOverlay();
            } else {
                const box = document.querySelector('.mobile-install-box p');
                if (box) {
                    box.style.color = '#c0392b';
                    setTimeout(() => { box.style.color = ''; }, 1600);
                }
            }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') initializePWA();
        });
        window.addEventListener('focus', initializePWA);
        window.addEventListener('pageshow', initializePWA);

        window.addEventListener('appinstalled', () => {
            localStorage.setItem(INSTALLED_KEY, 'true');
            hideInstallOverlay();
        });

        window.addEventListener('beforeinstallprompt', event => {
            event.preventDefault();
            deferredInstallPrompt = event;
            const btn = document.getElementById('install-native-btn');
            if (btn && document.getElementById('mobile-install-overlay').style.display === 'flex') {
                btn.style.display = 'block';
            }
        });

        function installPWA() {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.finally(() => {
                deferredInstallPrompt = null;
            });
        }



        async function checkConnection() {
            const dot = document.getElementById('status-dot');
            const text = document.getElementById('status-text');
            try {
                const response = await fetch(`${API_URL}?action=health&_=${Date.now()}`, { cache: 'no-store' });
                const data = await response.json();
                if (data && data.success) {
                    dot.className = 'status-dot status-ok';
                    text.innerText = 'Connected';
                } else {
                    dot.className = 'status-dot status-bad';
                    text.innerText = 'Connected, but the server reported a problem';
                }
            } catch (error) {
                dot.className = 'status-dot status-bad';
                text.innerText = 'Can\'t reach the server, check the deployment URL';
            }
        }

        function addPin(num) {
            hideLoginError();
            if (currentPin.length >= 4) return;
            currentPin += String(num);
            updatePinDisplay();
            if (currentPin.length === 4) {
                setTimeout(() => submitLogin(), 150);
            }
        }

        function clearPin() {
            hideLoginError();
            currentPin = currentPin.slice(0, -1);
            updatePinDisplay();
        }

        function updatePinDisplay() {
            const display = document.getElementById('pin-display');
            const value = String(currentPin || '').slice(0, 4);
            display.innerHTML = Array.from({ length: 4 }, (_, index) => {
                const filled = index < value.length;
                const digit = filled ? escapeHtml(value[index]) : '—';
                return `<span class="pin-slot${filled ? ' is-filled' : ''}" aria-hidden="true">${digit}</span>`;
            }).join('');
            display.setAttribute('aria-label', value.length ? `${value.length} of 4 PIN digits entered` : 'Four digit PIN');
            display.classList.remove('pin-pulse');
            void display.offsetWidth;
            display.classList.add('pin-pulse');
        }

        function focusPinKey(key) {
            const target = document.querySelector(`#login-screen .num-btn[data-key="${CSS.escape(String(key))}"]`);
            if (!target) return;
            target.classList.remove('is-keyboard-focus');
            void target.offsetWidth;
            target.classList.add('is-keyboard-focus');
            window.setTimeout(() => target.classList.remove('is-keyboard-focus'), 170);
        }

        function handlePinKeyboardInput(event) {
            const login = document.getElementById('login-screen');
            if (!login || getComputedStyle(login).display === 'none') return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (/^[0-9]$/.test(event.key)) {
                event.preventDefault();
                login.classList.add('keyboard-active');
                focusPinKey(event.key);
                addPin(Number(event.key));
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                login.classList.add('keyboard-active');
                focusPinKey('Backspace');
                clearPin();
                return;
            }

            if (event.key === 'Escape') {
                clearPin();
            }
        }

        function handlePinPaste(event) {
            const login = document.getElementById('login-screen');
            if (!login || getComputedStyle(login).display === 'none') return;
            const text = (event.clipboardData || window.clipboardData)?.getData('text') || '';
            const digits = text.replace(/\D/g, '').slice(0, 4);
            if (!digits) return;
            event.preventDefault();
            currentPin = digits;
            updatePinDisplay();
            if (digits.length === 4) setTimeout(() => submitLogin(), 150);
        }

        document.addEventListener('keydown', handlePinKeyboardInput);
        document.addEventListener('paste', handlePinPaste);

        function resetLoginForm() {
            currentPin = '';
            updatePinDisplay();
            hideLoginError();
            document.getElementById('retry-btn').style.display = 'none';
        }

        function hideLoginError() {
            document.getElementById("login-error").style.display = "none";
        }

        function showLoginError(message) {
            const box = document.getElementById("login-error");
            box.innerText = message;
            box.style.display = "block";
            box.classList.remove('shake');
            void box.offsetWidth;
            box.classList.add('shake');
        }

        function submitLogin() {
            if (currentPin.length !== 4) {
                showLoginError('Enter your 4-digit PIN first.');
                return;
            }
            fetchUserData(currentPin);
        }

        function retryLogin() {
            if (!lastAttemptedPin) return;
            fetchUserData(lastAttemptedPin);
        }

        function forgetSavedPin() {
            localStorage.removeItem(SAVED_PIN_KEY);
            localStorage.removeItem('jotajoti_saved_user');
            clearRememberedSession();
            document.getElementById('forget-btn').style.display = 'none';
            resetLoginForm();
            sessionUser = null;
            dashboardData = null;
            updatePortalGreeting();
            updateTopNavigation();
        }

        async function fetchUserData(pin, options) {
            options = options || {};
            lastAttemptedPin = pin;
            hideLoginError();
            document.getElementById('retry-btn').style.display = 'none';
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('welcome-name').innerText = pin === 'guest' ? `${getGreeting()}, Guest!` : 'Checking your details...';
            const loadingText=document.getElementById('welcome-loading-text');
            if (loadingText) loadingText.innerText=pin==='guest'?'Loading guest dashboard…':'Checking your account and loading dashboard…';
            const loader=document.getElementById('welcome-screen');
            loader.classList.remove('is-closing');
            loader.style.display='flex';

            try {
                const url = `${API_URL}?action=login&pin=${encodeURIComponent(pin)}&_=${Date.now()}`;
                const response = await fetch(url, { cache: 'no-store' });
                const data = await response.json();

                if (!data.success || !data.user) {
                    clearRememberedSession();
                    localStorage.removeItem(SAVED_PIN_KEY);
                    sessionUser = null;
                    dashboardData = null;
                    resetLoginForm();
                    loader.classList.add('is-closing');
                    window.setTimeout(()=>{ loader.style.display='none'; loader.classList.remove('is-closing'); },300);
                    document.getElementById('login-screen').style.display = 'block';
                    document.getElementById('dashboard-screen').style.display = 'none';
                    document.getElementById('submenu-screen').style.display = 'none';
                    document.getElementById('prelogin-note').style.display = isFinalDayOrLater() ? 'none' : 'block';
                    document.getElementById('back-to-timer-button').style.display = isFinalDayOrLater() ? 'none' : 'block';
                    document.getElementById('signup-button').style.display = 'block';
                    showLoginError(data.error || 'Invalid PIN.');
                    updateTopNavigation();
                    return;
                }

                sessionUser = data.user;
                dashboardData = {
                    categories: Array.isArray(data.categories) ? data.categories : [],
                    links: Array.isArray(data.links) ? data.links : [],
                    logos: Array.isArray(data.logos) ? data.logos : []
                };

                if (pin !== 'guest') {
                    localStorage.setItem(SAVED_PIN_KEY, pin);
                    saveRememberedSession(pin, sessionUser);
                }
            } catch (error) {
                resetLoginForm();
                const rememberedLoader=document.getElementById('welcome-screen');
                rememberedLoader.classList.add('is-closing');
                window.setTimeout(()=>{ rememberedLoader.style.display='none'; rememberedLoader.classList.remove('is-closing'); },360);
                if (rememberedSessionLoaded && sessionUser) {
                    updateTopNavigation(); updatePortalGreeting();
                    return;
                }
                document.getElementById('login-screen').style.display = 'block';
                document.getElementById('dashboard-screen').style.display = 'none';
                showLoginError('Could not reach the sign-in system. Check your connection and try again.');
                document.getElementById('retry-btn').style.display = 'block';
                if (!isFinalDayOrLater()) openPreLogin();
                return;
            }

            document.getElementById('welcome-name').innerText = `${getGreeting()}, ${sessionUser.Name || 'Scout'}!`;

            setTimeout(() => {
                const loader=document.getElementById('welcome-screen');
                loader.classList.add('is-closing');
                window.setTimeout(()=>{ loader.style.display='none'; loader.classList.remove('is-closing'); },300);

                updatePortalGreeting();
                updateTopNavigation();

                if (isFinalDayOrLater()) {
                    dashboardView='categories';
                    openDashboardMode({source:'login-success',preserveView:true,animate:true});
                    return;
                }

                showTimerMode();
                updatePortalGreeting();
            }, 500);
        }

        function logout() {
            sessionUser = null;
            dashboardData = null;
            initialRouteApplied = false;
            localStorage.removeItem(SAVED_PIN_KEY);
            localStorage.removeItem('jotajoti_saved_user');
            clearRememberedSession();
            document.getElementById('forget-btn').style.display = 'none';
            resetLoginForm();
            setRouteHash('#/', true);
            document.getElementById("dashboard-screen").style.display = "none";
            document.getElementById("submenu-screen").style.display = "none";

            updateTopNavigation();
            updatePortalGreeting();

            if (isFinalDayOrLater()) {
                openDashboardMode();
                document.getElementById("login-screen").style.display = "block";
                return;
            }

            returnToTimer();
        }

        function escapeAttribute(value) { return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

        function skeletonGridHTML(count) {
            let out = '';
            for (let i = 0; i < count; i++) {
                out += '<div class="card-btn skeleton-card" aria-hidden="true">'
                     + '<div class="skeleton-block skeleton-icon"></div>'
                     + '<div class="skeleton-block skeleton-line"></div>'
                     + '<div class="skeleton-block skeleton-badge"></div>'
                     + '</div>';
            }
            return out;
        }

        /* ---------- URL routing: gives every section its own address ---------- */

        function setRouteHash(hash, replace) {
            if (!hash) hash = '#/';
            if (location.hash === hash) return;
            if (replace) history.replaceState(null, '', hash);
            else history.pushState(null, '', hash);
            document.title = routeTitle(hash);
        }

        function routeTitle(hash) {
            const catMatch = hash.match(/^#\/category\/([^\/]+)/);
            const siteMatch = hash.match(/^#\/site\/([^\/]+)/);
            if (siteMatch && dashboardData) {
                const site = (dashboardData.links || []).find(l => String(l.LinkID) === decodeURIComponent(siteMatch[1]));
                if (site) return `${site.Title} · JOTA-JOTI`;
            }
            if (catMatch && dashboardData) {
                const cat = (dashboardData.categories || []).find(c => String(c.CategoryKey || '').toLowerCase() === decodeURIComponent(catMatch[1]).toLowerCase());
                if (cat) return `${cat.Title} · JOTA-JOTI`;
            }
            if (hash === '#/dashboard') return 'Dashboard · JOTA-JOTI';
            return 'JOTA-JOTI Dashboard';
        }

        function applyRouteFromHash() {
            if (!sessionUser || !dashboardData) return false;
            const hash = location.hash || '';
            const siteMatch = hash.match(/^#\/site\/([^\/]+)/);
            const catMatch = hash.match(/^#\/category\/([^\/]+)/);

            if (siteMatch) {
                const id = decodeURIComponent(siteMatch[1]);
                const site = (dashboardData.links || []).find(l => String(l.LinkID) === id);
                if (site) {
                    const cat = (dashboardData.categories || []).find(c => String(c.CategoryKey || '').toLowerCase() === String(site.CategoryKey || '').toLowerCase());
                    const catLinks = (dashboardData.links || []).filter(l => String(l.CategoryKey || '').toLowerCase() === String(site.CategoryKey || '').toLowerCase());
                    if (cat) openSubMenu(cat, catLinks, {skipHash: true});
                    openSite(site);
                    return true;
                }
            }
            if (catMatch) {
                const key = decodeURIComponent(catMatch[1]);
                const cat = (dashboardData.categories || []).find(c => String(c.CategoryKey || '').toLowerCase() === key.toLowerCase());
                if (cat) {
                    const catLinks = (dashboardData.links || []).filter(l => String(l.CategoryKey || '').toLowerCase() === key.toLowerCase());
                    openSubMenu(cat, catLinks);
                    return true;
                }
            }
            return false;
        }

        window.addEventListener('popstate', () => {
            if (!dashboardHandoffComplete && !isFinalDayOrLater()) return;
            if (!applyRouteFromHash()) showDashboard();
        });

        function buildDashboard(options={}) {
            if (!dashboardData) return;
            updateDashboardGreeting();
            const grid=document.getElementById('category-grid'); if(!grid) return;
            const categories=dashboardData.categories||[]; const links=dashboardData.links||[];
            const signature=JSON.stringify({categories,links});
            if(options.force!==true && signature===lastDashboardBuildSignature){ ensureDashboardScreenOnly(); return; }
            lastDashboardBuildSignature=signature; grid.innerHTML='';
            categories.forEach(cat=>{
                const catKey=String(cat.CategoryKey||'').toLowerCase();
                const catLinks=links.filter(link=>String(link.CategoryKey||'').toLowerCase()===catKey);
                const total=catLinks.length;
                const btn=document.createElement('button'); btn.className='card-btn'; btn.type='button'; btn.dataset.categoryKey=catKey;
                const badgeLabel=total===0?'Available':total+(total===1?' Option':' Options');
                btn.innerHTML=`<img class="card-icon" src="${escapeAttribute(cat.LogoURL||'https://img.icons8.com/color/96/folder.png')}" alt=""><div class="card-title">${escapeHtml(cat.Title)}</div><div class="badge">${badgeLabel}</div>`;
                addReactivePointer(btn);
                btn.addEventListener('click',e=>{
                    e.preventDefault();
                    if(total===1) openSite(catLinks[0]); else openSubMenu(cat,catLinks);
                });
                grid.appendChild(btn);
            });
            if(!categories.length) grid.innerHTML='<div class="empty-state">No categories available.</div>';
            ensureDashboardScreenOnly();

            if (!initialRouteApplied) {
                initialRouteApplied = true;
                if (!applyRouteFromHash() && dashboardView === 'categories') setRouteHash('#/dashboard', true);
            }
        }

        function addReactivePointer(btn) {
            btn.addEventListener('pointermove',e=>{ const r=btn.getBoundingClientRect(); btn.style.setProperty('--rx',((e.clientX-r.left)/r.width*100)+'%'); btn.style.setProperty('--ry',((e.clientY-r.top)/r.height*100)+'%'); });
            btn.addEventListener('pointerdown',()=>btn.classList.add('is-pressing'));
            btn.addEventListener('pointerup',()=>btn.classList.remove('is-pressing'));
            btn.addEventListener('pointercancel',()=>btn.classList.remove('is-pressing'));
        }

        function openSubMenu(category,links,options={}) {
            activeCategoryKey=String(category.CategoryKey||'').toLowerCase(); dashboardView='submenu';
            if (!options.skipHash) setRouteHash('#/category/' + encodeURIComponent(activeCategoryKey));
            document.getElementById('submenu-title').innerText=category.Title||'Select Option';
            const subGrid=document.getElementById('submenu-grid'); subGrid.innerHTML='';
            (links||[]).forEach(item=>{
                const btn=document.createElement('button'); btn.className='card-btn'; btn.type='button';
                let html=`<img class="card-icon" src="${escapeAttribute(item.LogoURL||category.LogoURL||'https://img.icons8.com/color/96/link.png')}" alt=""><div class="card-title">${escapeHtml(item.Title)}</div>`;
                const badgeLabel=accessBadgeLabel(item); if(badgeLabel) html+=`<div class="badge">${badgeLabel}</div>`;
                btn.innerHTML=html; addReactivePointer(btn); btn.addEventListener('click',e=>{e.preventDefault();openSite(item);}); subGrid.appendChild(btn);
            });
            if(!links||!links.length) subGrid.innerHTML='<div class="empty-state">No links in this category yet.</div>';
            document.getElementById('login-screen').style.display='none'; document.getElementById('dashboard-screen').style.display='none'; document.getElementById('submenu-screen').style.display='block';
            animateScreenIn(document.getElementById('submenu-screen'));
        }

        function showDashboard() {
            dashboardView='categories'; activeCategoryKey='';
            document.getElementById('submenu-screen').style.display='none'; document.getElementById('dashboard-screen').style.display='block'; document.getElementById('login-screen').style.display='none';
            animateScreenIn(document.getElementById('dashboard-screen'));
            setRouteHash('#/dashboard');
        }

        // Access scale: 0 = open, 1 = saved account covers it, 3 = needs own login.
        function toAccessLevel(rawValue) {
            if (rawValue === undefined || rawValue === null) return 0;
            if (typeof rawValue === 'boolean') return rawValue ? 1 : 0;
            const text = String(rawValue).trim().toLowerCase();
            if (text === '') return 0;
            if (text === '3') return 3;
            if (text === '1') return 1;
            if (text === '0') return 0;
            if (text === 'true' || text === 'yes' || text === 'active') return 1;
            if (text === 'false' || text === 'no') return 0;
            const parsed = parseInt(text, 10);
            return (parsed === 1 || parsed === 3) ? parsed : 0;
        }

        function deriveLoginLevel(site) {
            if (site.RequiresLogin !== undefined && String(site.RequiresLogin).trim() !== '') {
                return toAccessLevel(site.RequiresLogin);
            }
            if (site.AccessType !== undefined && String(site.AccessType).trim() !== '') {
                return toAccessLevel(site.AccessType);
            }
            if (site.ReqUser !== undefined) {
                return toAccessLevel(site.ReqUser) ? 1 : 0;
            }
            return 0;
        }

        function deriveEmailLevel(site) {
            if (site.RequiresEmail !== undefined && String(site.RequiresEmail).trim() !== '') {
                return toAccessLevel(site.RequiresEmail);
            }
            if (site.AccessType !== undefined && String(site.AccessType).trim() !== '') {
                return toAccessLevel(site.AccessType) === 3 ? 3 : 0;
            }
            if (site.ReqEmail !== undefined) {
                return toAccessLevel(site.ReqEmail) ? 1 : 0;
            }
            return 0;
        }

        // Rows without a real URL contain inline HTML instead.
        function isRawHtml(value) {
            const text = String(value || '').trim();
            if (!text) return false;
            return !/^https?:\/\//i.test(text);
        }

        function canEmbed(site) {
            if (isRawHtml(site && site.URL)) return true;
            return site && site.CanEmbed === true;
        }

        function resolveUserEmail() {
            if (!sessionUser) return '';
            return sessionUser.Email || '';
        }

        function accessBadgeLabel(site) {
            const loginLevel = deriveLoginLevel(site);
            const emailLevel = deriveEmailLevel(site);
            if (loginLevel === 3 || emailLevel === 3) return "External Site";
            if (loginLevel === 1 || emailLevel === 1) return "Needs Login";
            if (canEmbed(site)) return "Interactive";
            return null;
        }

        function openSite(site) {
            const loginLevel = deriveLoginLevel(site);
            const emailLevel = deriveEmailLevel(site);
            const embedded = canEmbed(site);

            if (loginLevel === 0 && emailLevel === 0) {
                launchSite(site, embedded);
            } else {
                showAccessPopup(site, embedded, loginLevel, emailLevel);
            }
        }

        function launchSite(site, embedded) {
            const raw = String(site.URL || '').trim();
            if (!raw) {
                alert('This link has no URL (or HTML) set in the sheet, so it can\'t be opened yet.');
                return;
            }
            if (embedded || isRawHtml(raw)) {
                openEmbeddedSite(site);
            } else {
                window.open(raw, "_blank", "noopener,noreferrer");
            }
        }

        function showAccessPopup(site, embedded, loginLevel, emailLevel) {
            const needsOwnSomething = loginLevel === 3 || emailLevel === 3;
            document.getElementById("sheet-title").innerText = needsOwnSomething ? "Before You Continue" : "Your Login Details";

            const body = document.getElementById("sheet-body");
            body.innerHTML = "";

            const intro = document.createElement("div");
            intro.className = "activity-desc";
            intro.innerText = needsOwnSomething
                ? `${site.Title} is an external site. Check what you need below before you head over.`
                : `${site.Title} needs a login. Tap to copy your details, then continue.`;
            body.appendChild(intro);

            if (loginLevel === 1) {
                if (sessionUser && sessionUser.Username) body.appendChild(createCopyRow("Username", sessionUser.Username));
                if (sessionUser && sessionUser.Password) body.appendChild(createCopyRow("Password", sessionUser.Password));
                const loginEmail = resolveUserEmail();
                if (loginEmail) body.appendChild(createCopyRow("Email", loginEmail));
                if (!(sessionUser && (sessionUser.Username || sessionUser.Password || loginEmail))) {
                    body.appendChild(createInfoNote("No saved account details found, ask a leader.", "own"));
                }
            }
            if (emailLevel === 1 && loginLevel !== 1) {
                const email = resolveUserEmail();
                if (email) {
                    body.appendChild(createCopyRow("Email", email));
                } else {
                    body.appendChild(createInfoNote("No saved email found on this account, ask a leader.", "own"));
                }
            }

            if (loginLevel === 3) {
                body.appendChild(createInfoNote("This site needs its own account. You may already have one, or you may need to sign up (and it might need to be bought).", "own"));
            }
            if (emailLevel === 3) {
                body.appendChild(createInfoNote("This site needs your own email address, not the one saved here.", "own"));
            }

            const row = document.createElement("div");
            row.className = "btn-row";

            const continueBtn = document.createElement("button");
            continueBtn.className = "activity-open-btn";
            continueBtn.type = "button";
            continueBtn.innerText = "Take me to the site";
            continueBtn.setAttribute('aria-label', `Take me to ${site.Title || 'the site'}`);
            continueBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                launchSite(site, embedded);
                closeSheet({reason: 'continue'});
            };
            row.appendChild(continueBtn);

            if (needsOwnSomething) {
                const cancelBtn = document.createElement("button");
                cancelBtn.className = "activity-open-btn btn-secondary";
                cancelBtn.type = "button";
                cancelBtn.innerText = "Not Now";
                cancelBtn.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeSheet({reason: 'cancel'});
                };
                row.appendChild(cancelBtn);
            }

            body.appendChild(row);
            openSheet();
        }

        function createInfoNote(text, kind) {
            const note = document.createElement("div");
            note.className = "access-note " + (kind === "own" ? "access-note-own" : "access-note-ours");
            note.innerText = text;
            return note;
        }

        function showEmbedLoading(message='Opening site', detail='Loading the content from the dashboard…') {
            const loading=document.getElementById('embed-loading'); const frame=document.getElementById('embed-frame'); const status=document.getElementById('embed-loading-status'); const dot=document.getElementById('embed-live-dot');
            if(loading){ loading.classList.remove('hidden'); loading.querySelector('.embed-loading-title').innerText=message; loading.querySelector('.embed-loading-subtitle').innerText=detail; }
            if(frame) frame.classList.remove('loaded'); if(status) status.innerText='Loading…'; if(dot) dot.classList.remove('ready');
        }

        function finishEmbedLoading(token) {
            if(token!==embedLoadToken) return;
            const loading=document.getElementById('embed-loading'); const frame=document.getElementById('embed-frame'); const status=document.getElementById('embed-loading-status'); const dot=document.getElementById('embed-live-dot');
            if(frame) frame.classList.add('loaded'); if(loading) loading.classList.add('hidden'); if(status) status.innerText='Ready'; if(dot) dot.classList.add('ready');
        }

        function openEmbeddedSite(site) {
            const screen=document.getElementById('embed-screen'); const frame=document.getElementById('embed-frame');
            const title=document.getElementById('embed-title'); const raw=String(site.URL||'').trim();
            const token=++embedLoadToken;
            currentEmbeddedSite = site;
            title.innerText=site.Title||'Site';
            if (site.LinkID) setRouteHash('#/site/' + encodeURIComponent(site.LinkID));
            showEmbedLoading(isRawHtml(raw)?'Rendering HTML':'Opening site', isRawHtml(raw)?'Building the page from the HTML saved in the dashboard…':'Waiting for the embedded page to become ready…');
            const externalBtn=document.getElementById('embed-external-btn');
            if(externalBtn) externalBtn.style.display=(raw && !isRawHtml(raw) ? 'block' : 'none');
            frame.removeAttribute('srcdoc'); frame.src='about:blank';
            frame.onload=()=>finishEmbedLoading(token);
            screen.classList.remove('closing'); screen.style.display='flex';
            requestAnimationFrame(()=>screen.classList.add('visible'));

            if(isRawHtml(raw)){
                const wrapped = /<html[\s>]|<!doctype/i.test(raw)
                    ? raw
                    : '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;min-height:100%;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif}*{box-sizing:border-box}</style></head><body>' + raw + '</body></html>';
                requestAnimationFrame(()=>{ frame.removeAttribute('src'); frame.srcdoc=wrapped; });
            } else { frame.removeAttribute('srcdoc'); frame.src=raw; }
            window.setTimeout(()=>{
                if(token!==embedLoadToken) return;
                const loading=document.getElementById('embed-loading');
                if(loading && !loading.classList.contains('hidden')){
                    const status=document.getElementById('embed-loading-status');
                    const subtitle=loading.querySelector('.embed-loading-subtitle');
                    if(status) status.innerText='Still loading';
                    if(subtitle) subtitle.innerText='The site is taking longer than usual. The page may still continue loading below.';
                }
            },10000);
        }

        function closeEmbeddedSite() {
            const screen=document.getElementById('embed-screen'); const frame=document.getElementById('embed-frame');
            ++embedLoadToken; screen.classList.remove('visible'); screen.classList.add('closing');
            window.setTimeout(()=>{ screen.style.display='none'; screen.classList.remove('closing'); frame.removeAttribute('srcdoc'); frame.src='about:blank'; currentEmbeddedSite=null; },300);
            setRouteHash(activeCategoryKey ? '#/category/' + encodeURIComponent(activeCategoryKey) : '#/dashboard');
        }

        function openEmbeddedExternally() {
            const raw=String(currentEmbeddedSite?.URL||'').trim();
            if(!raw || isRawHtml(raw)) return;
            window.open(raw,'_blank','noopener,noreferrer');
        }

        let sheetCloseTimer = null;

        function openSheet() {
            const overlay = document.getElementById("sheet-overlay");
            const popup = document.getElementById("sheet-popup");
            if (!overlay || !popup) return;

            if (sheetCloseTimer) {
                clearTimeout(sheetCloseTimer);
                sheetCloseTimer = null;
            }

            overlay.style.display = 'block';
            overlay.classList.add('popup-active');
            overlay.style.opacity = '0';

            popup.classList.remove('popup-closing');
            popup.classList.add('popup-open');
            popup.style.bottom = '0';

            void popup.offsetWidth;
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                popup.classList.remove('popup-opening');
                void popup.offsetWidth;
                popup.classList.add('popup-opening');
            });
        }

        function closeSheet(options = {}) {
            const overlay = document.getElementById("sheet-overlay");
            const popup = document.getElementById("sheet-popup");
            if (!overlay || !popup) return;

            if (sheetCloseTimer) {
                clearTimeout(sheetCloseTimer);
                sheetCloseTimer = null;
            }

            overlay.style.opacity = '0';
            overlay.classList.remove('popup-active');
            popup.classList.remove('popup-opening');
            popup.classList.remove('popup-open');
            popup.classList.add('popup-closing');
            popup.style.bottom = '-100%';

            sheetCloseTimer = window.setTimeout(() => {
                overlay.style.display = 'none';
                popup.classList.remove('popup-closing');
                sheetCloseTimer = null;
            }, 340);
        }

        document.getElementById('sheet-overlay')?.addEventListener('click', event => {
            if (event.target === event.currentTarget) {
                closeSheet({reason: 'outside'});
            }
        });

        document.getElementById('sheet-popup')?.addEventListener('click', event => {
            event.stopPropagation();
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const popup = document.getElementById('sheet-popup');
                if (popup && popup.classList.contains('popup-open')) closeSheet({reason: 'escape'});
            }
        });

        function createCopyRow(label, value) {
            const row = document.createElement("div");
            row.className = "copy-row";
            row.innerHTML = `<div><span class="copy-label">${label}</span><span class="copy-val">${escapeHtml(value)}</span></div>
                             <div class="copy-icon">COPY</div>`;
            row.onclick = async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(value);
                    } else {
                        const helper = document.createElement('textarea');
                        helper.value = value;
                        helper.style.position = 'fixed';
                        helper.style.opacity = '0';
                        document.body.appendChild(helper);
                        helper.focus();
                        helper.select();
                        document.execCommand('copy');
                        helper.remove();
                    }
                    const icon = row.querySelector('.copy-icon');
                    row.classList.add('copied');
                    icon.innerText = "COPIED!"; icon.style.background = "#4caf50"; icon.style.color = "white";
                    setTimeout(() => {
                        icon.innerText = "COPY"; icon.style.background = "var(--scout-light-purple)"; icon.style.color = "var(--scout-purple)";
                        row.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    const icon = row.querySelector('.copy-icon');
                    icon.innerText = "SELECT";
                    setTimeout(() => { icon.innerText = "COPY"; }, 1500);
                }
            };
            return row;
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }


        function getCombinedPortalState() {
            return {
                now: new Date().toISOString(),
                eventStart: new Date(EVENT_START_MS).toISOString(),
                finalDayStart: new Date(FINAL_DAY_MS).toISOString(),
                finalDay: isFinalDayOrLater(),
                eventLive: isEventLive(),
                preLoginMode: preLoginMode,
                hasUser: !!sessionUser,
                userName: sessionUser ? (sessionUser.Name || 'Scout') : '',
                dashboardDataLoaded: !!dashboardData,
                categoriesLoaded: !!(dashboardData && dashboardData.categories),
                linksLoaded: !!(dashboardData && dashboardData.links),
                logosLoaded: !!(dashboardData && dashboardData.logos)
            };
        }

        window.getCombinedPortalState = getCombinedPortalState;

        function forcePortalRefresh() {
            updateCountdown();
            updatePortalGreeting();
            updateTopNavigation();
            checkPortalConnection();
            if (isFinalDayOrLater()) {
                openDashboardMode();
            }
        }

        window.forcePortalRefresh = forcePortalRefresh;

        window.addEventListener('pageshow', () => {
            if(isFinalDayOrLater()){ dashboardHandoffComplete=true; openDashboardMode({source:'pageshow',preserveView:true,animate:false}); }
            else if(!preLoginMode){ showTimerMode(); startCountdown(); }
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                if(!isFinalDayOrLater()&&!dashboardHandoffComplete) updateCountdown();
                checkPortalConnection(true);
            }
        });

        window.addEventListener('online', () => {
            checkPortalConnection();
            if (isFinalDayOrLater()) {
                checkConnection();
            }
        });

        window.addEventListener('offline', () => {
            const dot = document.getElementById('portal-network-dot');
            const text = document.getElementById('portal-network-text');
            if (dot) dot.className = 'portal-network-dot bad';
            if (text) text.innerText = 'Device is offline';
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && preLoginMode && !isFinalDayOrLater()) {
                returnToTimer();
            }
        });



        function forceReturnToTimerIfStillPreEvent() {
            if (!isFinalDayOrLater() && !preLoginMode) {
                showTimerMode();
            }
        }


        function registerAppServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
                if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
                reg.addEventListener('updatefound',()=>{ const worker=reg.installing; if(!worker)return; worker.addEventListener('statechange',()=>{ if(worker.state==='installed'&&navigator.serviceWorker.controller) worker.postMessage({type:'SKIP_WAITING'}); }); });
            }).catch(()=>{});
        }

        function getDashboardUiState() { return {dashboardView,activeCategoryKey,dashboardHandoffComplete,countdownRunning:!!countdownInterval,hasUser:!!sessionUser,dataLoaded:!!dashboardData,submenuVisible:document.getElementById('submenu-screen')?.style.display==='block',dashboardVisible:document.getElementById('dashboard-screen')?.style.display==='block'}; }
        window.getDashboardUiState=getDashboardUiState;
        function assertDashboardUiStable() { const before=getDashboardUiState(); updateCountdown(); updateCountdown(); updateCountdown(); const after=getDashboardUiState(); return {stable:before.dashboardView===after.dashboardView&&before.activeCategoryKey===after.activeCategoryKey&&before.submenuVisible===after.submenuVisible,before,after}; }
        window.assertDashboardUiStable=assertDashboardUiStable;

        window.addEventListener('load', registerAppServiceWorker);
