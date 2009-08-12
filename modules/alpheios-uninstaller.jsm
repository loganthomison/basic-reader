/**
 * @fileoverview This module is used for handing the uninstall of an Alpheios extension 
 * @version $Id: $
 * 
 * Copyright 2008-2009 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Alpheios.
 * 
 * Alpheios is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alpheios is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * This module exports a single symbol, PermissionMgr.
 * This object should be imported into the namespace of the importing class
 */
var EXPORTED_SYMBOLS = ["Uninstaller"];

/**
 * @singleton
 */
Uninstaller =
{ 
    d_pkgids: null,
    d_uninstall: false,
    
    /**
     * observe an extension action request
     */
    observe : function(a_subject, a_topic, a_data) 
    {
        if (a_topic == "em-action-requested") 
        {
            a_subject.QueryInterface(Components.interfaces.nsIUpdateItem);
            if (typeof this.d_pkgids[a_subject.id] != "undefined") 
            {
                if (a_data == "item-uninstalled") 
                {
                    this.unregisterPkg(a_subject.id);
                    this.d_uninstall = true;

                } else if (a_data == "item-cancel-action") 
                {
                    this.registerPkg(a_subject.id);
                    this.d_uninstall = false;
                }
            }        
        } 
        else if (a_topic == "quit-application-granted") 
        {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.alpheios.");
            prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
            // only clear the prefs if all the Alpheios packages are installed
            // TODO ideally we would clear the package specific prefs as each
            // package gets uninstalled 
            if (this.d_uninstall && this.d_pkgids._size <= 0) 
            {
                prefs.deleteBranch('');
                this.d_pkgids = null;
                this.unregisterObserver();
            }
        }
    },
    
    /**
     * register a package to observe
     * @param {String} a_id the package id
     */
    registerPkg : function(a_id) 
    {
        // if this package isn't registered already, increase the number of 
        // packages registered
        if (typeof this.d_pkgids[a_id] == "undefined")
        {
            this.d_pkgids._size++;
        }
        this.d_pkgids[a_id] = true;
    },
    
    /**
     * unregister a package from the list we're observing
     * @param {String} a_id the package id
     */
    unregisterPkg: function(a_id) 
    {
        // if we haven't already removed this package, delete it
        // and decerease the number of packages registered
        if (typeof this.d_pkgids[a_id] != "undefined")
        {
            delete this.d_pkgids[a_id];
            this.d_pkgids._size--;
        }
    },
    
    /**
     * register the observer object
     * @param {Array} a_ids the list of Alpheios package ids
     */
    registerObserver : function(a_ids) 
    {
        var my_obj = this;
        // only register the observer once
        if (this.d_pkgids != null)
        {
            return;
        }
        this.d_pkgids = Array();
        this.d_pkgids._size = 0;
        a_ids.forEach(
            function(a_id)
            {
                my_obj.registerPkg(a_id);
            }
        );
        Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService)
                      .logStringMessage('registering uninstall observer');
        var observerService =
            Components.classes["@mozilla.org/observer-service;1"].
            getService(Components.interfaces.nsIObserverService);

        observerService.addObserver(this, "em-action-requested", false);
        observerService.addObserver(this, "quit-application-granted", false);
    },

    /**
     * unregister the observer
     */
    unregisterObserver : function() 
    {
        var observerService =
            Components.classes["@mozilla.org/observer-service;1"].
            getService(Components.interfaces.nsIObserverService);

        observerService.removeObserver(this,"em-action-requested");
        observerService.removeObserver(this,"quit-application-granted");
    }
}