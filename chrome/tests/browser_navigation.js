var testURL_01 = "chrome://mochikit/content/browser/mobile/chrome/browser_blank_01.html";
var testURL_02 = "chrome://mochikit/content/browser/mobile/chrome/browser_blank_02.html";

// A queue to order the tests and a handle for each test
var gTests = [];
var gCurrentTest = null;

//------------------------------------------------------------------------------
// Entry point (must be named "test")
function test() {
  // The "runNextTest" approach is async, so we need to call "waitForExplicitFinish()"
  // We call "finish()" when the tests are finished
  waitForExplicitFinish();
  
  // Start the tests
  runNextTest();
}

//------------------------------------------------------------------------------
// Iterating tests by shifting test out one by one as runNextTest is called.
function runNextTest() {
  // Run the next test until all tests completed
  if (gTests.length > 0) {
    gCurrentTest = gTests.shift();
    info(gCurrentTest.desc);
    gCurrentTest.run();
  }
  else {
    // Cleanup. All tests are completed at this point
    try {
      // Add any cleanup code here
    }
    finally {
      // We must finialize the tests
      finish();
    }
  }
}

//------------------------------------------------------------------------------
// Case: Loading a page into the URLBar with VK_RETURN
gTests.push({
  desc: "Loading a page into the URLBar with VK_RETURN",
  _tab: null,

  run: function() {
    this._tab = Browser.addTab(testURL_01, true);

    // Wait for the tab to load, then do the test
    waitFor(gCurrentTest.onPageReady, function() { return gCurrentTest._tab._loading == false; });
  },
  
  onPageReady: function() {
    // Test the mode
    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "view", "URL Mode is set to 'view'");

    // Test back button state
    let back = document.getElementById("tool-back");
    is(back.disabled, !gCurrentTest._tab.browser.canGoBack, "Back button check");

    // Test forward button state
    let forward = document.getElementById("tool-forward");
    is(forward.disabled, !gCurrentTest._tab.browser.canGoForward, "Forward button check");

    // Focus the url edit
    let urlbarEditArea = document.getElementById("urlbar-editarea");
    EventUtils.synthesizeMouse(urlbarEditArea, urlbarEditArea.clientWidth / 2, urlbarEditArea.clientHeight / 2, {});

    // Wait for the awesomebar to load, then do the test
    window.addEventListener("popupshown", gCurrentTest.onFocusReady, false);
  },
  
  onFocusReady: function() {
    window.removeEventListener("popupshown", gCurrentTest.onFocusReady, false);

    // Test mode
    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "edit", "URL Mode is set to 'edit'");

    // Test back button state
    let back = document.getElementById("tool-back");
    is(back.disabled, !gCurrentTest._tab.browser.canGoBack, "Back button check");

    // Test forward button state
    let forward = document.getElementById("tool-forward");
    is(forward.disabled, !gCurrentTest._tab.browser.canGoForward, "Forward button check");

    // Check button states (url edit is focused)
    let go = document.getElementById("tool-go");
    let goStyle = window.getComputedStyle(go, null);
    is(goStyle.visibility, "visible", "GO is visible");

    let stop = document.getElementById("tool-stop");
    let stopStyle = window.getComputedStyle(stop, null);
    is(stopStyle.visibility, "collapse", "STOP is hidden");

    let reload = document.getElementById("tool-reload");
    let reloadStyle = window.getComputedStyle(reload, null);
    is(reloadStyle.visibility, "collapse", "RELOAD is hidden");

    // Send the string and press return
    EventUtils.synthesizeString(testURL_02, window);
    EventUtils.synthesizeKey("VK_RETURN", {}, window)

    // Wait for the tab to load, then do the test
    waitFor(gCurrentTest.onPageFinish, function() { return urlIcons.getAttribute("mode") == "view"; });
  },

  onPageFinish: function() {
    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "view", "URL Mode is set to 'view'");

    // Check button states (url edit is not focused)
    let go = document.getElementById("tool-go");
    let goStyle = window.getComputedStyle(go, null);
    is(goStyle.visibility, "collapse", "GO is hidden");

    let stop = document.getElementById("tool-stop");
    let stopStyle = window.getComputedStyle(stop, null);
    is(stopStyle.visibility, "collapse", "STOP is hidden");

    let reload = document.getElementById("tool-reload");
    let reloadStyle = window.getComputedStyle(reload, null);
    is(reloadStyle.visibility, "visible", "RELOAD is visible");

    let uri = gCurrentTest._tab.browser.currentURI.spec;
    is(uri, testURL_02, "URL Matches newly created Tab");

    // Go back in session
    gCurrentTest._tab.browser.goBack();

    // Wait for the tab to load, then do the test
    waitFor(gCurrentTest.onPageBack, function() { return urlIcons.getAttribute("mode") == "view"; });
  },

  onPageBack: function() {
    // Test back button state
    let back = document.getElementById("tool-back");
    is(back.disabled, !gCurrentTest._tab.browser.canGoBack, "Back button check");

    // Test forward button state
    let forward = document.getElementById("tool-forward");
    is(forward.disabled, !gCurrentTest._tab.browser.canGoForward, "Forward button check");

    Browser.closeTab(gCurrentTest._tab);
    
    runNextTest();
  }  
});

//------------------------------------------------------------------------------
// Case: Loading a page into the URLBar with GO button
gTests.push({
  desc: "Loading a page into the URLBar with GO button",
  _tab: null,

  run: function() {
    this._tab = Browser.addTab(testURL_01, true);

    // Wait for the tab to load, then do the test
    waitFor(gCurrentTest.onPageReady, function() { return gCurrentTest._tab._loading == false; });
  },
  
  onPageReady: function() {
    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "view", "URL Mode is set to 'view'");

    // Focus the url edit
    let urlbarEditArea = document.getElementById("urlbar-editarea");
    EventUtils.synthesizeMouse(urlbarEditArea, urlbarEditArea.clientWidth / 2, urlbarEditArea.clientHeight / 2, {});

    // Wait for the awesomebar to load, then do the test
    window.addEventListener("popupshown", gCurrentTest.onFocusReady, false);
  },
  
  onFocusReady: function() {
    window.removeEventListener("popupshown", gCurrentTest.onFocusReady, false);

    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "edit", "URL Mode is set to 'edit'");

    // Check button states (url edit is focused)
    let go = document.getElementById("tool-go");
    let goStyle = window.getComputedStyle(go, null);
    is(goStyle.visibility, "visible", "GO is visible");

    let stop = document.getElementById("tool-stop");
    let stopStyle = window.getComputedStyle(stop, null);
    is(stopStyle.visibility, "collapse", "STOP is hidden");

    let reload = document.getElementById("tool-reload");
    let reloadStyle = window.getComputedStyle(reload, null);
    is(reloadStyle.visibility, "collapse", "RELOAD is hidden");

    EventUtils.synthesizeString(testURL_02, window);
    EventUtils.synthesizeMouse(go, go.clientWidth / 2, go.clientHeight / 2, {});

    // Wait for the tab to load, then do the test
    waitFor(gCurrentTest.onPageFinish, function() { return urlIcons.getAttribute("mode") == "view"; });
  },

  onPageFinish: function() {
    let urlIcons = document.getElementById("urlbar-icons");
    is(urlIcons.getAttribute("mode"), "view", "URL Mode is set to 'view'");

    // Check button states (url edit is not focused)
    let go = document.getElementById("tool-go");
    let goStyle = window.getComputedStyle(go, null);
    is(goStyle.visibility, "collapse", "GO is hidden");

    let stop = document.getElementById("tool-stop");
    let stopStyle = window.getComputedStyle(stop, null);
    is(stopStyle.visibility, "collapse", "STOP is hidden");

    let reload = document.getElementById("tool-reload");
    let reloadStyle = window.getComputedStyle(reload, null);
    is(reloadStyle.visibility, "visible", "RELOAD is visible");

    let uri = gCurrentTest._tab.browser.currentURI.spec;
    is(uri, testURL_02, "URL Matches newly created Tab");

    Browser.closeTab(gCurrentTest._tab);
    
    runNextTest();
  }  
});
