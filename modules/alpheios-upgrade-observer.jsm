/**
 * @fileoverview This module is used for observing the upgrade of an Alpheios extension
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
var EXPORTED_SYMBOLS = ["Upgrader"];

/**
 * @singleton
 */
Upgrader =
{ 
    d_pkgids: null,
    d_upgrade: false,
    
    /**
     * observe an extension action request
     */
    observe : function(a_subject, a_topic, a_data) 
    {
        if (a_topic == "em-action-requested") 
        {
             Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService)
                      .logStringMessage("alpheios: Observing " + a_data);
            a_subject.QueryInterface(Components.interfaces.nsIUpdateItem);
            if (typeof this.d_pkgids[a_subject.id] != "undefined") 
            {
                if (a_data == "item-upgraded") 
                {
                    
                    this.d_upgrade = true;

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
            if (this.d_upgrade) 
            {
                this.d_pkgids.forEach(
                    function(a_pkg_callback)
                    {
                        a_pkg_callback();
                    }
                );
            }
            this.d_upgrade = false;
        }
    },
    
    /**
     * register a package to observe
     * @param {String} a_id the package id
     * @param {Function} a_callback callback function to execute upon update 
     */
    registerPkg : function(a_id,a_callback) 
    {
        // if this package isn't registered already, increase the number of 
        // packages registered
        if (typeof this.d_pkgids[a_id] == "undefined")
        {
            this.d_pkgids._size++;
        }
        this.d_pkgids[a_id] = a_callback;
    },
    
    /**
     * register the observer object
     * @param {Array} a_ids the list of Alpheios package ids
     */
    registerObserver : function(a_pkgs) 
    {
        var my_obj = this;
        // only register the observer once
        if (this.d_pkgids != null)
        {
            return;
        }
        this.d_pkgids = Array();
        this.d_pkgids._size = 0;
        a_pkgs.forEach(
            function(a_pkg)
            {
                my_obj.registerPkg(a_pkg.id, a_pkg.callback);
            }
        );
        Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService)
                      .logStringMessage('registering upgrade observer');
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