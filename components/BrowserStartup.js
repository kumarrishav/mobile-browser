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
 * The Original Code is Fennec Browser Startup component.
 *
 * The Initial Developer of the Original Code is Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Gavin Sharp <gavin@gavinsharp.com>
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
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function BrowserStartup() {
  this._init();
}
BrowserStartup.prototype = {
  // for XPCOM
  classDescription: "Mobile Browser Glue Service",
  classID:          Components.ID("{1d542abc-c88b-4636-a4ef-075b49806317}"),
  contractID:       "@mozilla.org/mobile/browserstartup;1",

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver, Ci.nsISupportsWeakReference]),

  // get this contractID registered for certain categories via XPCOMUtils
  _xpcom_categories: [
    // make BrowserStartup a startup observer
    { category: "app-startup", service: true }
  ],

  _xpcom_factory: BrowserStartupServiceFactory,

  _init: function () {
    this._observerService = Cc['@mozilla.org/observer-service;1'].
                            getService(Ci.nsIObserverService);
    this._observerService.addObserver(this, "places-init-complete", false);
  },

  _initDefaultBookmarks: function () {
    // We must instantiate the history service since it will tell us if we
    // need to import or restore bookmarks due to first-run, corruption or
    // forced migration (due to a major schema change).
    let histsvc = Cc["@mozilla.org/browser/nav-history-service;1"].
                  getService(Ci.nsINavHistoryService);

    // If the database is corrupt or has been newly created we should
    // import bookmarks.
    let databaseStatus = histsvc.databaseStatus;
    let importBookmarks = databaseStatus == histsvc.DATABASE_STATUS_CREATE ||
                          databaseStatus == histsvc.DATABASE_STATUS_CORRUPT;

    if (!importBookmarks)
      return;

    Cu.import("resource://gre/modules/utils.js");

    // Get bookmarks.html file location
    let dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);

    let bookmarksFile = dirService.get("profDef", Ci.nsILocalFile);
    bookmarksFile.append("bookmarks.json");
    if (bookmarksFile.exists()) {
      // import the file
      try {
        PlacesUtils.restoreBookmarksFromJSONFile(bookmarksFile);
      } catch (err) {
        // Report the error, but ignore it.
        Cu.reportError("bookmarks.json file could be corrupt. " + err);
      }
    } else
      Cu.reportError("Unable to find default bookmarks.json file.");
  },

  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "places-init-complete":
        this._initDefaultBookmarks();
        this._observerService.removeObserver(this, "places-init-complete");
        break;
    }
  }
};

// Custom factory object to ensure that we're a singleton
const BrowserStartupServiceFactory = {
  _instance: null,
  createInstance: function (outer, iid) {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return this._instance || (this._instance = new BrowserGlue());
  }
};

function NSGetModule(compMgr, fileSpec)
  XPCOMUtils.generateModule([BrowserStartup]);
