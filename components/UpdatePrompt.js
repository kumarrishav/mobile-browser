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
 * The Original Code is Update Prompt.
 *
 * The Initial Developer of the Original Code is Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Mark Finkle <mfinkle@mozilla.com>
 *   Alex Pakhotin <alexp@mozilla.com>
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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");


XPCOMUtils.defineLazyGetter(this, "gUpdateBundle", function aus_gUpdateBundle() {
  return Services.strings.createBundle("chrome://mozapps/locale/update/updates.properties");
});

XPCOMUtils.defineLazyGetter(this, "gBrandBundle", function aus_gBrandBundle() {
  return Services.strings.createBundle("chrome://branding/locale/brand.properties");
});

function getPref(func, preference, defaultValue) {
  try {
    return Services.prefs[func](preference);
  } catch (e) {}
  return defaultValue;
}

// -----------------------------------------------------------------------
// Update Prompt
// -----------------------------------------------------------------------

function UpdatePrompt() { }

UpdatePrompt.prototype = {
  classID: Components.ID("{88b3eb21-d072-4e3b-886d-f89d8c49fe59}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIUpdatePrompt]),

  get _enabled() {
    return !getPref("getBoolPref", "app.update.silent", false);
  },

  _showNotification: function UP__showNotif(aUpdate, aTitle, aText, aImageUrl, aMode) {
    let observer = {
      updatePrompt: this,
      observe: function (aSubject, aTopic, aData) {
        switch (aTopic) {
          case "alertclickcallback":
            this.updatePrompt._handleUpdate(aUpdate, aMode);
            break;
        }
      }
    };

    let notifier = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
    notifier.showAlertNotification(aImageUrl, aTitle, aText, true, "", observer, "update-app");
  },

  _handleUpdate: function UP__handleUpdate(aUpdate, aMode) {
    if (aMode == "available") {
      let window = Services.wm.getMostRecentWindow("navigator:browser");
      let title = gUpdateBundle.GetStringFromName("updatesfound_" + aUpdate.type + ".title");
      let brandName = gBrandBundle.GetStringFromName("brandShortName");

      // Unconditionally use the "major" type here as for now it is always a new version
      // without additional description required for a minor update message
      let message = gUpdateBundle.formatStringFromName("intro_major", [brandName, aUpdate.displayVersion], 2);
      let button0 = gUpdateBundle.GetStringFromName("updateButton_major");
      let button1 = gUpdateBundle.GetStringFromName("askLaterButton");
      let prompt = Services.prompt;
      let flags = prompt.BUTTON_POS_0 * prompt.BUTTON_TITLE_IS_STRING + prompt.BUTTON_POS_1 * prompt.BUTTON_TITLE_IS_STRING;

      let download = (prompt.confirmEx(window, title, message, flags, button0, button1, null, null, {value: false}) == 0);
      if (download) {
        // Start downloading the update in the background
        let aus = Cc["@mozilla.org/updates/update-service;1"].getService(Ci.nsIApplicationUpdateService);
        aus.downloadUpdate(aUpdate, true);
      }
    } else if(aMode == "downloaded") {
      // Notify all windows that an application quit has been requested
      let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);
      Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");

      // If nothing aborted, restart the app
      if (cancelQuit.data == false) {
        let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup);
        appStartup.quit(Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit);
      }
    }
  },

  checkForUpdates: function UP_checkForUpdates() {
    // NOT IMPL
  },

  showUpdateAvailable: function UP_showUpdateAvailable(aUpdate) {
    if (!this._enabled)
      return;

    let stringsPrefix = "updateAvailable_" + aUpdate.type + ".";
    let title = gUpdateBundle.formatStringFromName(stringsPrefix + "title", [aUpdate.name], 1);
    let text = gUpdateBundle.GetStringFromName(stringsPrefix + "text");
    let imageUrl = "";
    this._showNotification(aUpdate, title, text, imageUrl, "available");
  },

  showUpdateDownloaded: function UP_showUpdateDownloaded(aUpdate, aBackground) {
    if (!this._enabled)
      return;

    let stringsPrefix = "updateDownloaded_" + aUpdate.type + ".";
    let title = gUpdateBundle.formatStringFromName(stringsPrefix + "title", [aUpdate.name], 1);
    let text = gUpdateBundle.GetStringFromName(stringsPrefix + "text");
    let imageUrl = "";
    this._showNotification(aUpdate, title, text, imageUrl, "downloaded");
  },

  showUpdateInstalled: function UP_showUpdateInstalled() {
    if (!this._enabled || !getPref("getBoolPref", "app.update.showInstalledUI", false))
      return;

    let title = gBrandBundle.GetStringFromName("brandShortName");
    let text = gUpdateBundle.GetStringFromName("installSuccess");
    let imageUrl = "";
    this._showNotification(aUpdate, title, text, imageUrl, "installed");
  },

  showUpdateError: function UP_showUpdateError(aUpdate) {
    if (!this._enabled)
      return;

    if (aUpdate.state == "failed") {
      var title = gBrandBundle.GetStringFromName("brandShortName");
      let text = gUpdateBundle.GetStringFromName("updaterIOErrorTitle");
      let imageUrl = "";
      this._showNotification(aUpdate, title, text, imageUrl, "error");
    }
  },

  showUpdateHistory: function UP_showUpdateHistory(aParent) {
    // NOT IMPL
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([UpdatePrompt]);