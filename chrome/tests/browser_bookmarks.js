/*
 * Bug 486490 - Fennec browser-chrome tests to verify correct implementation of chrome
 *              code in mobile/chrome/content in terms of integration with Places
 *              component, specifically for bookmark management.
 */

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
      PlacesUtils.bookmarks.removeFolderChildren(BookmarkList.panel.mobileRoot);
    }
    finally {
      // We must finialize the tests
      finish();
    }
  }
}

//------------------------------------------------------------------------------
// Case: Test adding a bookmark with the Star button
gTests.push({
  desc: "Test adding a bookmark with the Star button",
  _currentTab: null,

  run: function() {
    this._currentTab = Browser.addTab(testURL_01, true);

    // Need to wait until the page is loaded
    messageManager.addMessageListener("pageshow",
    function(aMessage) {
      if (gCurrentTest._currentTab.browser.currentURI.spec != "about:blank") {
        messageManager.removeMessageListener(aMessage.name, arguments.callee);
        gCurrentTest.onPageReady();
      }
    });
  },

  onPageReady: function() {
    let starbutton = document.getElementById("tool-star");
    starbutton.click();

    let bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_01));
    ok(bookmark != -1, testURL_01 + " should be added.");

    Browser.closeTab(gCurrentTest._currentTab);

    runNextTest();
  }
});

//------------------------------------------------------------------------------
// Case: Test clicking on a bookmark loads the web page
gTests.push({
  desc: "Test clicking on a bookmark loads the web page",
  _currentTab: null,

  run: function() {
    this._currentTab = Browser.addTab(testURL_01, true);

    // Need to wait until the page is loaded
    messageManager.addMessageListener("pageshow", function(aMessage) {
      if (gCurrentTest._currentTab.browser.currentURI.spec != "about:blank") {
        messageManager.removeMessageListener(aMessage.name, arguments.callee);
        gCurrentTest.onPageReady();
      }
    });
  },

  onPageReady: function() {
    // Open the bookmark list
    BrowserUI.doCommand("cmd_bookmarks");

    waitFor(gCurrentTest.onBookmarksReady, function() { return BrowserUI.activePanel == BookmarkList });
  },

  onBookmarksReady: function() {
    // Create a listener for the opening bookmark
    messageManager.addMessageListener("pageshow", function(aMessage) {
      messageManager.removeMessageListener(aMessage.name, arguments.callee);
      is(gCurrentTest._currentTab.browser.currentURI.spec, testURL_01, "Opened the right bookmark");

      Browser.closeTab(gCurrentTest._currentTab);

      runNextTest();
    });

    let bookmarkitem = document.getAnonymousElementByAttribute(BookmarkList.panel, "uri", testURL_01);
    isnot(bookmarkitem, null, "Found the bookmark");
    is(bookmarkitem.getAttribute("uri"), testURL_01, "Bookmark has the right URL via attribute");
    is(bookmarkitem.spec, testURL_01, "Bookmark has the right URL via property");

    EventUtils.synthesizeMouse(bookmarkitem, bookmarkitem.clientWidth / 2, bookmarkitem.clientHeight / 2, {});
  }
});

//------------------------------------------------------------------------------
// Case: Test editing URI of existing bookmark
gTests.push({
  desc: "Test editing URI of existing bookmark",

  run: function() {
    // Open the bookmark list
    BrowserUI.doCommand("cmd_bookmarks");

    // Go into edit mode
    let bookmark = BookmarkList.panel.items[0];
    bookmark.startEditing();

    waitFor(gCurrentTest.onBookmarksReady, function() { return bookmark.isEditing == true; });
  },

  onBookmarksReady: function() {
    let bookmarkitem = document.getAnonymousElementByAttribute(BookmarkList.panel, "uri", testURL_01);
    EventUtils.synthesizeMouse(bookmarkitem, bookmarkitem.clientWidth / 2, bookmarkitem.clientHeight / 2, {});

    let uritextbox = document.getAnonymousElementByAttribute(bookmarkitem, "anonid", "uri");
    uritextbox.value = testURL_02;

    let donebutton = document.getAnonymousElementByAttribute(bookmarkitem, "anonid", "done-button");
    donebutton.click();

    let bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_01));
    is(bookmark, -1, testURL_01 + " should no longer in bookmark");
    bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_02));
    isnot(bookmark, -1, testURL_02 + " is in bookmark");

    BrowserUI.activePanel = null;

    runNextTest();
  }
});

//------------------------------------------------------------------------------
// Case: Test editing title of existing bookmark
gTests.push({
  desc: "Test editing title of existing bookmark",

  run: function() {
    // Open the bookmark list
    BrowserUI.doCommand("cmd_bookmarks");

    // Go into edit mode
    let bookmark = BookmarkList.panel.items[0];
    bookmark.startEditing();

    waitFor(gCurrentTest.onBookmarksReady, function() { return bookmark.isEditing == true; });
  },

  onBookmarksReady: function() {
    let bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_02));
    is(PlacesUtils.bookmarks.getItemTitle(bookmark), "Browser Blank Page 01", "Title remains the same.");

    let bookmarkitem = document.getAnonymousElementByAttribute(BookmarkList.panel, "uri", testURL_02);
    EventUtils.synthesizeMouse(bookmarkitem, bookmarkitem.clientWidth / 2, bookmarkitem.clientHeight / 2, {});

    let titletextbox = document.getAnonymousElementByAttribute(bookmarkitem, "anonid", "name");
    let newtitle = "Changed Title";
    titletextbox.value = newtitle;

    let donebutton = document.getAnonymousElementByAttribute(bookmarkitem, "anonid", "done-button");
    donebutton.click();

    isnot(PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_02)), -1, testURL_02 + " is still in bookmark.");
    is(PlacesUtils.bookmarks.getItemTitle(bookmark), newtitle, "Title is changed.");

    BrowserUI.activePanel = null;

    runNextTest();
  }
});

//------------------------------------------------------------------------------
// Case: Test removing existing bookmark
gTests.push({
  desc: "Test removing existing bookmark",
  bookmarkitem: null,

  run: function() {
    // Open the bookmark list
    BrowserUI.doCommand("cmd_bookmarks");

    // Go into edit mode
    let bookmark = BookmarkList.panel.items[0];
    bookmark.startEditing();

    waitFor(gCurrentTest.onBookmarksReady, function() { return bookmark.isEditing == true; });
  },

  onBookmarksReady: function() {
    let bookmark = document.getAnonymousElementByAttribute(BookmarkList.panel, "uri", testURL_02);
    bookmark.remove();

    let bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_02));
    ok(bookmark == -1, testURL_02 + " should no longer in bookmark");
    bookmark = PlacesUtils.getMostRecentBookmarkForURI(makeURI(testURL_01));
    ok(bookmark == -1, testURL_01 + " should no longer in bookmark");

    BrowserUI.activePanel = null;

    runNextTest();
  }
});

//------------------------------------------------------------------------------
// Case: Test editing title of desktop folder
gTests.push({
  desc: "Test editing title of desktop folder",
  bmId: null,

  run: function() {
    // Add a bookmark to the desktop area so the desktop folder is displayed
    gCurrentTest.bmId = PlacesUtils.bookmarks
                                   .insertBookmark(PlacesUtils.unfiledBookmarksFolderId,
                                                   makeURI(testURL_02),
                                                   Ci.nsINavBookmarksService.DEFAULT_INDEX,
                                                   testURL_02);

    // Open the bookmark list
    BrowserUI.doCommand("cmd_bookmarks");

    // Go into edit mode
    let bookmarksPanel = BookmarkList.panel;
    let bookmark = bookmarksPanel.items[0];
    bookmark.startEditing();

    // Is the "desktop" folder showing?
    let first = bookmarksPanel._children.firstChild;
    is(first.itemId, bookmarksPanel._desktopFolderId, "Desktop folder is showing");

    // Is the "desktop" folder in edit mode?
    is(first.isEditing, false, "Desktop folder is not in edit mode");

    // Do not allow the "desktop" folder to be editable by tap
    EventUtils.synthesizeMouse(first, first.clientWidth / 2, first.clientHeight / 2, {});

    // A tap on the "desktop" folder _should_ open the folder, not put it into edit mode.
    // So we need to get the first item again.
    first = bookmarksPanel._children.firstChild;

    // It should not be the "desktop" folder
    isnot(first.itemId, bookmarksPanel._desktopFolderId, "Desktop folder is not showing after mouse click");

    // But it should be one of the other readonly bookmark roots
    isnot(bookmarksPanel._readOnlyFolders.indexOf(parseInt(first.itemId)), -1, "Desktop subfolder is showing after mouse click");

    BrowserUI.activePanel = null;
    PlacesUtils.bookmarks.removeItem(gCurrentTest.bmId);

    runNextTest();
  }
});
