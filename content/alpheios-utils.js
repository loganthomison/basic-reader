/**
 * @fileoverview This file contains the Alph.util class with the 
 * Alpheios utility functions
 *
 * @version $Id $
 * 
 * Copyright 2008 Cantus Foundation
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

// Make sure the Alph namespace is defined
if (typeof Alph == "undefined") {
    Alph = {};
    // load the jQuery library in the scope of the Alph object
    // and call jQuery.noConflict(extreme) to revert control of the
    // $ and jQuery to whichever library first implemented it (to
    // avoid stepping on the toes of any other extensions).
    // See http://docs.jquery.com/Core/jQuery.noConflict#extreme
    // Note, we may run into problems if we want to use any jQuery plugins,
    // in which case it might be sufficient to skip the extreme flag
    Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader)
          .loadSubScript("chrome://alpheios/content/jquery-1.2.6-alph.js", Alph);
    Alph.$ = jQuery.noConflict(true);
    
}

/**
 * Alph.util contains the Alpheios utility functions
 * @singleton
 */
Alph.util = {

    ALPHEIOS_URLS:
    {
        main: 'http://alpheios.net',
        help:  'http://alpheios.net/content/firefox-extensions',
        support: 'mailto:support@alpheios.net'
    },
    XUL_NS: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
    
    /**
     * Initializes the Alph.util class, by setting up the member
     * variables which hold references to various XPCOM components/services.
     * Also adds an Observer on the extensions.alpheios preferences branch.
     */
    init: function() {
        this.ALPH_PREFS = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.alpheios.");
        this.ALPH_PREFS.QueryInterface(Components.interfaces.nsIPrefBranch2);
        this.ALPH_PREFS.addObserver("", this, false);
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
     * Cleans up resources held by Alph.util. Removes the Observer on preferences.
     */
    shutdown: function()
    {
        this.ALPH_PREFS.removeObserver("", this);

    },
    
    /**
     * Holds nsILocalFile objects for the local directory of each 
     * Alpheios extension (the main alpheios
     * extension as well as the language-specific dependent extensions)
     * @type Object
     * @private
     */
    extension_base_paths: {},
    
    /**
     * Observes changes to the preferences in the extensions.alpheios branch
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
        // try to determine if this is a language-specific setting
        else
        {
            var first_branch = a_name.match(/^(.*?)\./);
            if (first_branch != null && 
                Alph.Languages.has_lang(first_branch[1]))
            {
                a_lang = first_branch[1];
            }
        }
        if (a_name.search(/popuptrigger$/) != -1)
        {
            // iterate through the open browsers
            // updating to the trigger if alpheios 
            // is enabled and the current language is
            // named in the preference 
            var num = gBrowser.browsers.length;
            for (var i = 0; i < num; i++) {
                var bro = gBrowser.getBrowserAtIndex(i);
                if (Alph.main.is_enabled(bro) && 
                    a_name.indexOf(Alph.main.get_state_obj(bro).get_var("current_language")) == 0)
                {
                    Alph.main.setXlateTrigger(bro,a_value);
                }
            }
        }     
        else if (a_name.search(/toolbar.lookup$/) != -1)
        {
            Alph.main.enable_tb_lookup();
        }
        if (typeof a_lang != 'undefined')
        {
            Alph.Languages.get_lang_tool(a_lang).observe_pref_change(a_name,a_value);
        }
        Alph.main.broadcast_ui_event(
            Alph.main.events.UPDATE_PREF,
                { name: a_name,
                  value: a_value });
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
     * Only logs the message if the extensions.alpheios.debug 
     * preference is enabled
     * @param {String} a_msg the message to be logged
     */
    log: function(a_msg) {
        var isDebug = this.getPref("debug");
        if (! isDebug ) {
            return;
        }
        this.CONS_SVC.logStringMessage('alpheios:' + a_msg);
    },
    
    /**
     * Get a preference from the extensions.alpheios branch
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
        var type = this.ALPH_PREFS.getPrefType(name);
        if (type == Components.interfaces.nsIPrefBranch.PREF_STRING)
            return this.ALPH_PREFS.getCharPref(name);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_INT)
            return this.ALPH_PREFS.getIntPref(name);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_BOOL)
            return this.ALPH_PREFS.getBoolPref(name);
    },
    
    /**
     * Gets a language specific preference or the default alpheios preference 
     * if the language specific preference is not defined.
     * @param {String} a_name the preference name
     * @param {String} a_lang the language
     * @return the preference from the language, or if not defined, the default 
     * from the alpheios package. (one of int, string or boolean)
     */
    getPrefOrDefault: function(a_name, a_lang)
    {
        return this.getPref(a_name,a_lang)
            || this.getPref(a_name);
    },
    
    /**
     * Set a preference in the extensions.alpheios branch
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
        
        var type = this.ALPH_PREFS.getPrefType(a_name);
        
        // if we don't know the type, try to determine it
        if ( type == 0 )
        {
            switch(typeof a_value)
            {
                case 'string': 
                {
                    type = Components.interfaces.nsIPrefBranch.PREF_STRING;
                    break;
                }
                case 'number':
                {
                    type = Components.interfaces.nsIPrefBranch.PREF_INT;
                    break;
                }
                case 'boolean':
                {
                    type = Components.interfaces.nsIPrefBranch.PREF_BOOL;
                    break;
                }
                default:
                {
                    // leave it as invalid if we can't determine it
                }
            }
        }
        
        if (type == Components.interfaces.nsIPrefBranch.PREF_STRING)
            this.ALPH_PREFS.setCharPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_INT)
            this.ALPH_PREFS.setIntPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_BOOL)
            this.ALPH_PREFS.setBoolPref(a_name, a_value);
        else
            this.log("Invalid preference type for " + a_name)
            // fall through behavior is to not set the pref if we don't know what type it is
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
        var available_paths = [];
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
                           available_paths.push(dir);
                    }
                }
            }
            else
            {
                Alph.util.log("Not a directory: " + base_file_dir.path);
            }
        }
        catch(e)
        {
            Alph.util.log("Error reading " + base_file_dir.path + ":" + e);
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
            for (var j=0; j< available_paths.length; j++)
            {
                // check for full match on the requested path, 
                // or else a path that begins with the requested path
                var avail_path = available_paths[j].path;
                var avail_path_obj = available_paths[j];
                try {
                    if ( avail_path_obj &&
                         (avail_path_obj.equals(preferred_path) ||
                         avail_path.indexOf(preferred_path.path) == 0) )
                    {
                        file = avail_path_obj;
                        // stop at the first match
                        break;
                    }
                }
                catch(a_e)
                {
                    Alph.util.log("Error checking path " + avail_path + ":",a_e);
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
                Alph.util.log("Found requested file at " + file.path);
                // set the the file to be executable
                file.permissions = 0755;
                Alph.util.log("Permissions "  + file.permissions);
                return file;
            }
    
        }
        
        // if we got here, we couldn't find the file
        // report the last path used
        Alph.util.log("File not found: " + a_base_path + " " + a_filename);
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
            // default is the main alpheios pkg
            a_ext_pkg = 'alpheios';
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
            Alph.util.log("Converted chrome url: " + pkg_path);
            // remove the chrome dir and everything after it 
            pkg_path = pkg_path.substring(0,pkg_path.indexOf('/chrome'));
            // remove the jar prefix
            pkg_path = pkg_path.replace(/^jar:/,'');
            Alph.util.log("Cleaned chrome url: " + pkg_path);
            base_path.initWithFile(this.PROT_HANDLER.getFileFromURLSpec(pkg_path));
            this.extension_base_paths[a_ext_pkg] = base_path;
                
        }
        return this.extension_base_paths[a_ext_pkg].clone();
    },
    
    makeXUL: function(a_tag,a_id,a_keys,a_values)
    {
        var xul = document.createElementNS(this.XUL_NS,a_tag);
        xul.setAttribute('id',a_id);
        a_keys.forEach(
            function(a_key,a_i)
            {
                xul.setAttribute(a_key,a_values[a_i]);        
            }
        );
        return xul;
    },
    
    makePref: function(a_id,a_name,a_type)
    {
        return this.makeXUL(
            'preference',a_id,['name','type'],[a_name,a_type]);  
    },
    
    /**
     * Get the id and version for any installed extensions which include
     * 'Alpheios' in their name
     * @return list of nsIUpdateItems for the matched extensions
     * @type Array
     */
    getAlpheiosPackages: function()
    {
        var alph_pkgs = [];
        try
        {
            var extensionManager = 
                Components.classes["@mozilla.org/extensions/manager;1"]
                    .getService(Components.interfaces.nsIExtensionManager);
            var ext_list = extensionManager.getItemList(
                Components.interfaces.nsIUpdateItem.TYPE_EXTENSION,{},{});
                        
            ext_list.forEach(
                function(a_item)
                {
                    if (a_item.name.match(/Alpheios/))
                    {
                        alph_pkgs.push(a_item);
                    }
                }
            );
        }
        catch(a_e)
        {
            this.log("Error retrieving installed extensions:" + a_e);
        }
        return alph_pkgs;
    },
    
    /**
     * Open a link to the alpheios site
     * @param {String} a_loc site location
     */
    open_alpheios_link: function(a_loc)
    {
        this.open_new_tab(this.ALPHEIOS_URLS[a_loc]);    
    },
    
    /**
     * Open a new tab and select it
     * @param {String} a_url the url to open
     */
    open_new_tab: function(a_url)
    {
        gBrowser.selectedTab = gBrowser.addTab(a_url);
    },

    /**
     * launch the user's email application and prepare feedback email headers
     */
    send_feedback: function()
    {
        var subject =
            Alph.$("#alpheios-strings").get(0).getString('alph-feedback-subject');
        var win = window.open(
            this.ALPHEIOS_URLS.support +
            '?subject=' + subject);          
        win && win.open && !win.closed && win.close(); 
    }
};
