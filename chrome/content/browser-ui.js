/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Mobile Browser.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Mark Finkle <mfinkle@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const TOOLBARSTATE_LOADING        = 1;
const TOOLBARSTATE_LOADED         = 2;
const TOOLBARSTATE_INDETERMINATE  = 3;

const PANELMODE_NONE              = 0;
const PANELMODE_URLVIEW           = 1;
const PANELMODE_URLEDIT           = 2;
const PANELMODE_BOOKMARK          = 3;
const PANELMODE_BOOKMARKLIST      = 4;
const PANELMODE_SIDEBAR           = 5;
const PANELMODE_TABLIST           = 6;
const PANELMODE_FULL              = 7;

var BrowserUI = {
  _panel : null,
  _caption : null,
  _edit : null,
  _throbber : null,
  _autocompleteNavbuttons : null,
  _favicon : null,
  _faviconAdded : false,

  _titleChanged : function(aEvent) {
    if (aEvent.target != getBrowser().contentDocument)
      return;

    this._caption.value = aEvent.target.title;
  },

  _linkAdded : function(aEvent) {
    var link = aEvent.originalTarget;
    if (!link || !link.ownerDocument || !link.href)
      return;

    var rel = link.rel && link.rel.toLowerCase();
    var rels = rel.split(/\s+/);
    if (rels.indexOf("icon") != -1) {
      this._throbber.setAttribute("src", "");
      this._setIcon(link.href);
    }
  },

  _setIcon : function(aURI) {
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var faviconURI = ios.newURI(aURI, null, null);
    if (faviconURI.schemeIs("javascript"))
      return;

    var fis = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);
    if (fis.isFailedFavicon(faviconURI))
      faviconURI = ios.newURI("chrome://browser/skin/images/default-favicon.png", null, null);
    fis.setAndLoadFaviconForPage(getBrowser().currentURI, faviconURI, true);
    this._favicon.setAttribute("src", faviconURI.spec);
    this._faviconAdded = true;
  },

  _getBookmarks : function(aFolders) {
    var items = [];

    var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
    var options = hs.getNewQueryOptions();
    //options.resultType = options.RESULTS_AS_URI;
    var query = hs.getNewQuery();
    query.setFolders(aFolders, 1);
    var result = hs.executeQuery(query, options);
    var rootNode = result.root;
    rootNode.containerOpen = true;
    var cc = rootNode.childCount;
    for (var i=0; i<cc; ++i) {
      var node = rootNode.getChild(i);
      items.push(node);
    }
    rootNode.containerOpen = false;

    return items;
  },

  _getHistory : function(aCount) {
    var items = [];

    var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
    var options = hs.getNewQueryOptions();
    options.queryType = options.QUERY_TYPE_HISTORY;
    //options.sortingMode = options.SORT_BY_VISITCOUNT_DESCENDING;
    options.maxResults = aCount;
    //options.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_URI;
    var query = hs.getNewQuery();
    var result = hs.executeQuery(query, options);
    var rootNode = result.root;
    rootNode.containerOpen = true;
    var cc = rootNode.childCount;
    for (var i=0; i<cc; ++i) {
      var node = rootNode.getChild(i);
      items.push(node);
    }
    rootNode.containerOpen = false;

    return items;
  },

  init : function() {
    this._caption = document.getElementById("urlbar-caption");
    this._caption.addEventListener("click", this, false);
    this._edit = document.getElementById("urlbar-edit");
    this._edit.addEventListener("blur", this, false);
    this._edit.addEventListener("keypress", this, true);
    this._edit.addEventListener("input", this, false);
    this._throbber = document.getElementById("urlbar-throbber");
    this._favicon = document.getElementById("urlbar-favicon");
    this._favicon.addEventListener("error", this, false);
    this._autocompleteNavbuttons = document.getElementById("autocomplete_navbuttons");

    getBrowser().addEventListener("DOMTitleChanged", this, true);
    getBrowser().addEventListener("DOMLinkAdded", this, true);

    Shortcuts.restore();
    Shortcuts.test();

    Browser.content.addEventListener("overpan", this, false);
    Browser.content.addEventListener("pan", this, true);
  },

  update : function(aState) {
    if (aState == TOOLBARSTATE_INDETERMINATE) {
      this._faviconAdded = false;
      aState = TOOLBARSTATE_LOADED;
      this.setURI();
    }

    var toolbar = document.getElementById("toolbar-main");
    if (aState == TOOLBARSTATE_LOADING) {
      this.show(PANELMODE_URLVIEW);

      toolbar.setAttribute("mode", "loading");
      this._throbber.setAttribute("src", "chrome://browser/skin/images/throbber.gif");
      this._favicon.setAttribute("src", "");
      this._faviconAdded = false;
    }
    else if (aState == TOOLBARSTATE_LOADED) {
      toolbar.setAttribute("mode", "view");
      this._throbber.setAttribute("src", "");
      if (this._faviconAdded == false) {
        var faviconURI = getBrowser().currentURI.prePath + "/favicon.ico";
        this._setIcon(faviconURI);
      }
    }
  },

  /* Set the location to the current content */
  setURI : function() {
    var browser = Browser.currentBrowser;
    var back = document.getElementById("cmd_back");
    var forward = document.getElementById("cmd_forward");

    back.setAttribute("disabled", !browser.canGoBack);
    forward.setAttribute("disabled", !browser.canGoForward);

    // Check for a bookmarked page
    var star = document.getElementById("tool-star");
    var bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
    var bookmarks = bms.getBookmarkIdsForURI(browser.currentURI, {});
    if (bookmarks.length > 0) {
      star.setAttribute("starred", "true");
    }
    else {
      star.removeAttribute("starred");
    }

    var uri = browser.currentURI;

    if (!this._URIFixup)
      this._URIFixup = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup);

    try {
      uri = this._URIFixup.createExposableURI(uri);
    } catch (ex) {}

    var urlString = uri.spec;
    if (urlString == "about:blank") {
      urlString = "";
      this.show(PANELMODE_URLEDIT);
    }

    this._caption.value = urlString;
    this._edit.value = urlString;
  },

  goToURI : function(aURI) {
    this._edit.reallyClosePopup();

    if (!aURI)
      aURI = this._edit.value;

    var flags = Ci.nsIWebNavigation.LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP;
    getBrowser().loadURIWithFlags(aURI, flags, null, null);
    this.show(PANELMODE_URLVIEW);
  },

  search : function() {
    var queryURI = "http://www.google.com/search?q=" + this._edit.value + "&hl=en&lr=&btnG=Search";
    getBrowser().loadURI(queryURI, null, null, false);

    this.show(PANELMODE_URLVIEW);
  },

  sizeAutocompletePopup : function () {
    var rect = document.getElementById("browser-container").getBoundingClientRect();
    var toolbar = document.getElementById("toolbar-main");
    var popup = document.getElementById("popup_autocomplete");
    popup.height = rect.bottom - rect.top - toolbar.boxObject.height;
  },

  openDefaultHistory : function () {
    if (!this._edit.value) {
      this._autocompleteNavbuttons.hidden = true;
      this._edit.showHistoryPopup();
    }
  },

  doButtonSearch : function(button)
  {
    if (!("engine" in button) || !button.engine)
      return;

    var urlbar = this._edit;
    urlbar.open = false;
    var value = urlbar.value;
    if (!value)
      return;

    var submission = button.engine.getSubmission(value, null);
    getBrowser().loadURI(submission.uri.spec, null, submission.postData, false);
  },

  engines : null,
  updateSearchEngines : function () {
    if (this.engines)
      return;

    // XXXndeakin remove the try-catch once the search service is properly built
    try {
      var searchService = Cc["@mozilla.org/browser/search-service;1"].
                          getService(Ci.nsIBrowserSearchService);
    } catch (ex) {
      this.engines = [ ];
      return;
    }

    var engines = searchService.getVisibleEngines({ });
    this.engines = engines;
    const kXULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var container = this._autocompleteNavbuttons;
    for (var e = 0; e < engines.length; e++) {
      var button = document.createElementNS(kXULNS, "toolbarbutton");
      var engine = engines[e];
      button.id = engine.name;
      button.setAttribute("label", engine.name);
      if (engine.iconURI)
        button.setAttribute("image", engine.iconURI.spec);
      container.insertBefore(button, container.firstChild);
      button.engine = engine;
    }
  },

  mode : PANELMODE_NONE,
  show : function(aMode) {
    if (this.mode == aMode)
      return;
    this.mode = aMode;

    var toolbar = document.getElementById("toolbar-main");
    var bookmark = document.getElementById("bookmark-container");
    var urllist = document.getElementById("urllist-container");
    var sidebar = document.getElementById("browser-controls");
    var tablist = document.getElementById("tab-list-container");
    var container = document.getElementById("browser-container");

    // Make sure the UI elements are sized correctly since the window size can change
    sidebar.left = toolbar.width = container.boxObject.width;
    sidebar.height = tablist.height = container.boxObject.height - toolbar.boxObject.height;

    if (aMode == PANELMODE_URLVIEW || aMode == PANELMODE_SIDEBAR ||
        aMode == PANELMODE_TABLIST || aMode == PANELMODE_FULL)
    {
      toolbar.setAttribute("mode", "view");
      toolbar.top = 0;

      this._edit.hidden = true;
      this._edit.reallyClosePopup();
      this._caption.hidden = false;
      bookmark.hidden = true;
      urllist.hidden = true;

      let sidebarTo = toolbar.boxObject.width;
      let tablistTo = -tablist.boxObject.width;
      if (aMode == PANELMODE_SIDEBAR || aMode == PANELMODE_FULL)
        sidebarTo -= sidebar.boxObject.width;
      if (aMode == PANELMODE_TABLIST || aMode == PANELMODE_FULL)
        tablistTo = 0;
      sidebar.left = sidebarTo;
      tablist.left = tablistTo;
    }
    else if (aMode == PANELMODE_URLEDIT) {
      toolbar.setAttribute("mode", "edit");
      toolbar.top = 0;
      this._caption.hidden = true;
      this._edit.hidden = false;
      this._edit.focus();

      bookmark.hidden = true;
      urllist.hidden = true;
      sidebar.left = toolbar.boxObject.width;
      tablist.left = -tablist.boxObject.width;
    }
    else if (aMode == PANELMODE_BOOKMARK) {
      toolbar.top = 0;
      toolbar.setAttribute("mode", "view");
      this._edit.hidden = true;
      this._edit.reallyClosePopup();
      this._caption.hidden = false;

      urllist.hidden = true;
      sidebar.left = toolbar.boxObject.width;
      tablist.left = -tablist.boxObject.width;

      bookmark.hidden = false;
      bookmark.width = container.boxObject.width;
    }
    else if (aMode == PANELMODE_BOOKMARKLIST) {
      toolbar.top = 0;
      toolbar.setAttribute("mode", "view");
      this._edit.hidden = true;
      this._edit.reallyClosePopup();
      this._caption.hidden = false;

      bookmark.hidden = true;
      sidebar.left = toolbar.boxObject.width;
      tablist.left = -tablist.boxObject.width;

      urllist.hidden = false;
      urllist.width = container.boxObject.width;
      urllist.height = container.boxObject.height - toolbar.boxObject.height;
    }
    else if (aMode == PANELMODE_NONE) {
      toolbar.top = -toolbar.boxObject.height;
      sidebar.left = toolbar.boxObject.width;
      tablist.left = -tablist.boxObject.width;

      this._edit.reallyClosePopup();
      urllist.hidden = true;
      bookmark.hidden = true;
    }
  },

  _showPlaces : function(aItems) {
    var list = document.getElementById("urllist-items");
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var fis = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);

    for (var i=0; i<aItems.length; i++) {
      let node = aItems[i];
      let listItem = document.createElement("richlistitem");
      listItem.setAttribute("class", "urllist-item");

      let box = document.createElement("vbox");
      box.setAttribute("pack", "center");
      let image = document.createElement("image");
      image.setAttribute("class", "urllist-image");
      let icon = node.icon ? node.icon.spec : fis.getFaviconImageForPage(ios.newURI(node.uri, null, null)).spec
      image.setAttribute("src", icon);
      box.appendChild(image);
      listItem.appendChild(box);

      let label = document.createElement("label");
      label.setAttribute("class", "urllist-text");
      label.setAttribute("value", node.title);
      label.setAttribute("flex", "1");
      label.setAttribute("crop", "end");
      listItem.appendChild(label);
      list.appendChild(listItem);
      listItem.addEventListener("click", function() { BrowserUI.goToURI(node.uri); }, true);
    }

    list.focus();
  },

  showHistory : function() {
    this._showPlaces(this._getHistory(6));
  },

  showBookmarks : function () {
    this.show(PANELMODE_BOOKMARKLIST);

    var bms = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
    this._showPlaces(this._getBookmarks([bms.bookmarksMenuFolder]));
  },

  newTab : function() {
    Browser.content.newTab(true);
    this.show(PANELMODE_URLEDIT);
  },

  selectTab : function(aTab) {
    Browser.content.selectTab(aTab);
    this.show(PANELMODE_NONE);
  },

  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      // Browser events
      case "DOMTitleChanged":
        this._titleChanged(aEvent);
        break;
      case "DOMLinkAdded":
        this._linkAdded(aEvent);
        break;
      // URL textbox events
      case "click":
        this.show(PANELMODE_URLEDIT);
        this.openDefaultHistory();
        break;
      case "input":
        if (this._edit.value) {
          this.updateSearchEngines();
          this._autocompleteNavbuttons.hidden = false;
        }
        break;
      case "keypress":
        if (aEvent.keyCode == aEvent.DOM_VK_ESCAPE) {
          this._edit.reallyClosePopup();
          this.show(PANELMODE_URLVIEW);
        }
        break;
      // Favicon events
      case "error":
        this._favicon.setAttribute("src", "chrome://browser/skin/images/default-favicon.png");
        break;
      case "pan": {
        // Default to hide the controls when user pans
        let mode = PANELMODE_NONE;
        // Open the urlbar controls if browser is at top of content
        if (Browser.content.scrollY == 0)
          mode = PANELMODE_URLVIEW

        this.show(mode);
        break;
      }
      case "overpan":
        // Open the sidebar controls if we get a right side overpan
        if (aEvent.detail == 2)
          this.show(PANELMODE_SIDEBAR);
        // Close the sidebar controls if we get a left side overpan
        else if (aEvent.detail == 1)
          this.show(PANELMODE_TABLIST);
        break;
    }
  },

  supportsCommand : function(cmd) {
    var isSupported = false;
    switch (cmd) {
      case "cmd_back":
      case "cmd_forward":
      case "cmd_reload":
      case "cmd_stop":
      case "cmd_search":
      case "cmd_go":
      case "cmd_star":
      case "cmd_bookmarks":
      case "cmd_shortcuts":
      case "cmd_menu":
      case "cmd_newTab":
      case "cmd_closeTab":
        isSupported = true;
        break;
      default:
        isSupported = false;
        break;
    }
    return isSupported;
  },

  isCommandEnabled : function(cmd) {
    return true;
  },

  doCommand : function(cmd) {
    var browser = getBrowser();
    switch (cmd) {
      case "cmd_back":
        browser.goBack();
        break;
      case "cmd_forward":
        browser.goForward();
        break;
      case "cmd_reload":
        browser.reload();
        break;
      case "cmd_stop":
        browser.stop();
        break;
      case "cmd_search":
        this.search();
        break;
      case "cmd_go":
        this.goToURI();
        break;
      case "cmd_star":
      {
        var bookmarkURI = browser.currentURI;
        var bookmarkTitle = browser.contentDocument.title;

        var bookmarks = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
        if (bookmarks.getBookmarkIdsForURI(bookmarkURI, {}).length == 0) {
          var bookmarkId = bookmarks.insertBookmark(bookmarks.bookmarksMenuFolder, bookmarkURI, bookmarks.DEFAULT_INDEX, bookmarkTitle);
          document.getElementById("tool-star").setAttribute("starred", "true");

          var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
          var favicon = document.getElementById("urlbar-favicon");
          var faviconURI = ios.newURI(favicon.src, null, null);

          var fis = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);
          fis.setAndLoadFaviconForPage(bookmarkURI, faviconURI, true);

          this.show(PANELMODE_NONE);
        }
        else {
          this.show(PANELMODE_BOOKMARK);
          BookmarkHelper.edit(bookmarkURI);
        }
        break;
      }
      case "cmd_bookmarks":
        this.showBookmarks();
        break;
      case "cmd_shortcuts":
        this.show(PANELMODE_NONE);
        Shortcuts.edit();
        break;
      case "cmd_menu":
        if (this.mode == PANELMODE_FULL)
          this.show(PANELMODE_NONE);
        else
          this.show(PANELMODE_FULL);
        break;
      case "cmd_newTab":
        this.newTab();
        break;
      case "cmd_closeTab":
        Browser.content.removeTab(Browser.content.browser);
    }
  }
};

var BookmarkHelper = {
  _item : null,
  _uri : null,
  _bmksvc : null,
  _tagsvc : null,

  _getTagsArrayFromTagField : function() {
    // we don't require the leading space (after each comma)
    var tags = document.getElementById("bookmark-tags").value.split(",");
    for (var i=0; i<tags.length; i++) {
      // remove trailing and leading spaces
      tags[i] = tags[i].replace(/^\s+/, "").replace(/\s+$/, "");

      // remove empty entries from the array.
      if (tags[i] == "") {
        tags.splice(i, 1);
        i--;
      }
    }
    return tags;
  },

  edit : function(aURI) {
    this._bmksvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
    this._tagsvc = Cc["@mozilla.org/browser/tagging-service;1"].getService(Ci.nsITaggingService);

    this._uri = aURI;
    var bookmarkIDs = this._bmksvc.getBookmarkIdsForURI(this._uri, {});
    if (bookmarkIDs.length > 0) {
      this._item = bookmarkIDs[0];
      document.getElementById("bookmark-name").value = this._bmksvc.getItemTitle(this._item);
      var currentTags = this._tagsvc.getTagsForURI(this._uri, {});
      document.getElementById("bookmark-tags").value = currentTags.join(", ");
    }

    window.addEventListener("keypress", this, true);
  },

  remove : function() {
    if (this._item) {
      this._bmksvc.removeItem(this._item);
      document.getElementById("tool-star").removeAttribute("starred");
    }
    this.close();
  },

  save : function() {
    if (this._item) {
      // Update the name
      this._bmksvc.setItemTitle(this._item, document.getElementById("bookmark-name").value);

      // Update the tags
      var tags = this._getTagsArrayFromTagField();
      var currentTags = this._tagsvc.getTagsForURI(this._uri, {});
      if (tags.length > 0 || currentTags.length > 0) {
        var tagsToRemove = [];
        var tagsToAdd = [];
        var i;
        for (i=0; i<currentTags.length; i++) {
          if (tags.indexOf(currentTags[i]) == -1)
            tagsToRemove.push(currentTags[i]);
        }
        for (i=0; i<tags.length; i++) {
          if (currentTags.indexOf(tags[i]) == -1)
            tagsToAdd.push(tags[i]);
        }

        if (tagsToAdd.length > 0)
          this._tagsvc.tagURI(this._uri, tagsToAdd);
        if (tagsToRemove.length > 0)
          this._tagsvc.untagURI(this._uri, tagsToRemove);
      }

    }
    this.close();
  },

  close : function() {
    window.removeEventListener("keypress", this, true);
    this._item = null;
    BrowserUI.show(PANELMODE_NONE);
  },

  handleEvent: function (aEvent) {
    switch (aEvent.type) {
      case "keypress":
        if (aEvent.keyCode == aEvent.DOM_VK_ESCAPE)
          this.close();
        break;
    }
  }
};
