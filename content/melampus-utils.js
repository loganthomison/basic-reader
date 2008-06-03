/**
 * @fileoverview This file contains the MP.util class with the 
 * Melampus utility functions
 *
 * @version $Id $
 * 
 * Copyright 2008 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Melampus.
 * 
 * Melampus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Melampus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.

 */    

// Make sure the MP namespace is defined
if (typeof MP == "undefined") {
    MP = {};
}

/**
 * MP.util contains the Melampus utility functions
 * @singleton
 */
MP.util = {

    /**
     * Initializes the MP.util class, by setting up the member
     * variables which hold references to various XPCOM components/services.
     * Also adds an Observer on the extensions.melampus preferences branch.
     */
    init: function() {
        this.MP_PREFS = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.melampus.");
        this.MP_PREFS.QueryInterface(Components.interfaces.nsIPrefBranch2);
        this.MP_PREFS.addObserver("", this, false);
        this.CR_SVC = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                      .getService(Components.interfaces.nsIChromeRegistry);
        this.IO_SVC = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
        this.CONS_SVC = Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService);
        this.PROT_HANDLER = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                            .createInstance(Components.interfaces.nsIFileProtocolHandler);
         
    },

    /**
     * Cleans up resources held by MP.util. Removes the Observer on preferences.
     */
    shutdown: function()
    {
        this.MP_PREFS.removeObserver("", this);

    },
    
    /**
     * Holds nsILocalFile objects for the local directory of each 
     * Melampus extension (the main melampus
     * extension as well as the language-specific dependent extensions)
     * @type Object
     * @private
     */
    extension_base_paths: {},
    
    /**
     * Observes changes to the preferences in the extensions.melampus branch
     * @param {nsISupports} a_subject the nsIPrefBranch object
     * @param {String} a_topic the type of event
     * @param {String} a_data the name of the preference
     */
    observe: function(a_subject, a_topic, a_data)
    {
        if (a_topic != "nsPref:changed") {
            return;
        }
        var name = a_data;
        var value = this.getPref(name);
        this.updatePref(name, value);
    },

    /**
     * Called by the preferences observer upon change to a preference we're watching.
     * @param {String} a_name the name of the preference
     * @param {String} a_value the new value of the preference
     * @param {String} a_lang optional specification of the language
     *                 to which the preference applies.
     */
    updatePref: function(a_name, a_value, a_lang) {
        if (typeof a_lang != 'undefined')
        {
            a_name = a_lang + '.' + a_name;
        }
        if (a_name.search(/popuptrigger$/ != -1))
        {
            // iterate through the open browsers
            // updating to the trigger if melampus 
            // is enabled and the current language is
            // named in the preference 
            var num = gBrowser.browsers.length;
            for (var i = 0; i < num; i++) {
                var bro = gBrowser.getBrowserAtIndex(i);
                if (bro.melampus && 
                    a_name.indexOf(bro.melampus.current_language) == 0)
                {
                    MP.main.setXlateTrigger(bro,a_value);
                }
            }
        }        
    },

    /**
     * Helper function to get an XPCOM component class
     * @param {String} a_className the class name
     * @return the XPCOM component class
     */
    CC: function(a_className) 
    {
        return Components.classes[a_className];
    },

    /**
     * Helper function to get an XPCOM component interface
     * @param {String} a_ifaceName the interface name
     * @return the XPCOM interface
     */
    CI: function(a_ifaceName)
    {
        return Components.interfaces[a_ifaceName];
    },

    /**
     * Log a string message to the javascript console.
     * Only logs the message if the extensions.melampus.debug 
     * preference is enabled
     * @param {String} a_msg the message to be logged
     */
    log: function(a_msg) {
        var isDebug = this.getPref("debug");
        if (! isDebug ) {
            return;
        }
        this.CONS_SVC.logStringMessage('melampus:' + a_msg);
    },
    
    /**
     * Get a preference from the extensions.melampus branch
     * @param {String} a_lang the language branch (optional)
     * @return the preference (one of int, string or boolean)
     */
    getPref: function(name,a_lang)
    {

        if (typeof a_lang != 'undefined')
        {
            name = a_lang + '.' + name;
        }
        
        //TODO - handle missing prefs? 
        var type = this.MP_PREFS.getPrefType(name);
        if (type == Components.interfaces.nsIPrefBranch.PREF_STRING)
            return this.MP_PREFS.getCharPref(name);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_INT)
            return this.MP_PREFS.getIntPref(name);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_BOOL)
            return this.MP_PREFS.getBoolPref(name);
    },
    
    /**
     * Gets a language specific preference or the default melampus preference 
     * if the language specific preference is not defined.
     * @param {String} a_name the preference name
     * @param {String} a_lang the language
     * @return the preference from the language, or if not defined, the default 
     * from the melampus package. (one of int, string or boolean)
     */
    getPrefOrDefault: function(a_name, a_lang)
    {
        return this.getPref(a_name,a_lang)
            || this.getPref(a_name);
    },
    
    /**
     * Set a preference in the extensions.melampus branch
     * @param {String} a_name the name of the preference
     * @param {Object} a_value the value for the preference 
     *                 (one of int, string or boolean)
     * @param {String} a_lang the language branch (optional)
     */
    setPref: function(a_name, a_value, a_lang)
    {
        if (typeof a_lang != 'undefined')
        {
            a_name = a_lang + '.' + a_name;
        }
        
        var type = this.MP_PREFS.getPrefType(a_name);
        //TODO - handle missing prefs
        if (type == Components.interfaces.nsIPrefBranch.PREF_STRING)
            this.MP_PREFS.setCharPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_INT)
            this.MP_PREFS.setIntPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_BOOL)
            this.MP_PREFS.setBoolPref(a_name, a_value);
    },
    
    /**
     * Gets an nsILocalFile object from a platform-specific subdirectory
     * @param {Array} a_file_info a 2-item array:
     *                   [0] = base directory off of the main extension dir
     *                   [1] = the name of the file
     * @param {Boolean} a_exact_match_req boolean flag indicating whether an 
     *                         exact match on the os + xpcom abi is 
     *                         required (if not, it will return the next best match)
     * @param {String} a_ext_pkg the name of the base extension package to 
     *                           which the file belongs  
     * @param {Boolean} a_is_exe flag indicating whether or not the requested
     *                           file is an executable (if so, on WINNT os it will
     *                           append .exe when looking for the file)
     * @return an nsILocalFile object, or null if the file couldn't be found
     *         in an appropriate platform subdirectory
     * @type nsILocalFile 
     */
    getPlatformFile: function(a_file_info,
                              a_exact_match_req, 
                              a_ext_pkg,
                              a_is_exe)
    {
        var a_base_path= a_file_info[0];
        var a_filename = a_file_info[1];
        var runtime = 
            this.CC("@mozilla.org/xre/app-info;1")
            .getService(this.CI("nsIXULRuntime"));
        var os = runtime.OS;
        var abi = runtime.XPCOMABI.split(/-/);
        var arch = abi[0];
        var compiler = abi[1];
             
        var base_file_dir = this.getExtensionBasePath(a_ext_pkg);
        base_file_dir.append(a_base_path);
        base_file_dir.append("platform");
                
        // if we're looking for an executable, append .exe for the 
        // WINNT OS
        if (a_is_exe && os == 'WINNT')
        {
            a_filename = a_filename + '.exe';
        }
        
        // gather the list of possible paths to use under
        // the platform directory of the base path 
        // ... at a minimum the OS much match
        var available_paths = { };
        try 
        {
            if (base_file_dir.isDirectory() )
            {
                var file_iter = base_file_dir.directoryEntries;
                while (file_iter.hasMoreElements())
                {
                    var dir = 
                        file_iter.getNext()
                        .QueryInterface(this.CI("nsILocalFile"));
                    // if this is a directory for our os, keep it
                    // for potential use
                    if (dir.isDirectory() && dir.path.indexOf(os) != -1)
                    {
                           available_paths[dir.path] = dir;
                    }
                }
            }
            else
            {
                MP.util.log("Not a directory: " + base_file_dir.path);
            }
        }
        catch(e)
        {
            MP.util.log("Error reading " + base_file_dir.path + ":" + e);
            return null;
        }
        
        // an exact match is OS_XPCOMABI
        var preferred_path_order = [  
            os + "_" + runtime.XPCOMABI  // full ABI
        ]
        // if an exact match is not required, then we will also check
        // in this order:
        // OS_CPU_ARCH <match any compiler or none>
        // OS <match any XPCOM_ABI or none>
        if (! a_exact_match_req)
        {
            preferred_path_order.push(os + "_" + arch); // without compiler
            preferred_path_order.push(os); // OS only
        }
        var file;
        var i=0;
        while (typeof file == "undefined" && 
               i < preferred_path_order.length)
        {       
            var preferred_path;
            // add the base_path on to the preferred path
            (preferred_path = 
                base_file_dir.clone()).append(preferred_path_order[i])
            for (var avail_path in available_paths)
            {
                // check for full match on the requested path, 
                // or else a path that begins with the requested path
                if ( available_paths[avail_path].equals(preferred_path) ||
                     avail_path.indexOf(preferred_path.path) == 0 )
                {
                    file = available_paths[avail_path];
                    // stop at the first match
                    break;
                }
            }
            i++;
        }
        if (typeof file != "undefined")
        {
            file.append(a_filename);
            if (file.exists())
            {
                // if we found the file, return it
                MP.util.log("Found requested file at " + file.path);
                // set the the file to be executable
                file.permissions = 0755;
                MP.util.log("Permissions "  + file.permissions);
                return file;
            }
    
        }
        
        // if we got here, we couldn't find the file
        // report the last path used
        MP.util.log("File not found: " + a_base_path + " " + a_filename);
        return null;
    },

    /**
     * Returns a copy of the nsILocalFile object representing the 
     * extension's base path
     * @param {String} a_ext_pkg the package name for the extension
     * @return the nsILocalFile object representing the extension's base path
     * @type nsILocalFile  
     */
    getExtensionBasePath: function(a_ext_pkg)
    {
        if (typeof a_ext_pkg == 'undefined' || a_ext_pkg == null)
        {
            // default is the main melampus pkg
            a_ext_pkg = 'melampus';
        }
        
        if (typeof this.extension_base_paths[a_ext_pkg] == "undefined")
        {
            // build file for base path
            var base_path = 
                this.CC("@mozilla.org/file/local;1")
                    .createInstance(this.CI("nsILocalFile"));

            // translate the chrome url to a file
            var url =
                this.IO_SVC.newURI("chrome://" + a_ext_pkg + "/content/","UTF-8",null);
            var pkg_path = this.CR_SVC.convertChromeURL(url).spec;
            MP.util.log("Converted chrome url: " + pkg_path);
            // remove the chrome dir and everything after it 
            pkg_path = pkg_path.substring(0,pkg_path.indexOf('/chrome'));
            // remove the jar prefix
            pkg_path = pkg_path.replace(/^jar:/,'');
            MP.util.log("Cleaned chrome url: " + pkg_path);
            base_path.initWithFile(this.PROT_HANDLER.getFileFromURLSpec(pkg_path));
            this.extension_base_paths[a_ext_pkg] = base_path;
                
        }
        return this.extension_base_paths[a_ext_pkg].clone();
    },    
};