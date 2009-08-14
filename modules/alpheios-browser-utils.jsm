/**
 * @fileoverview This file contains the BrowserUtils and BrowserSvc objects
 * which contain code and services specific to the Mozilla platform
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
 
 /**
 * This module exports a single symbol, BrowserUtils.
 * This object should be imported into the namespace of the importing class
 */
const EXPORTED_SYMBOLS = ['BrowserUtils'];

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://alpheios/ext/log4moz.js");

/**
 * Alpheios Browser-Specific Utility functions
 * @singleton
 */
BrowserUtils = {
    
    
    /**
     * Holds nsILocalFile objects for the local directory of each 
     * Alpheios extension (the main alpheios
     * extension as well as the language-specific dependent extensions)
     * @type Object
     * @private
     */
    d_extensionBasePaths: {},
    
    /**
     * main logger for the BrowserUtils object
     * @type Log4Moz.Logger
     * @static
     */
    s_logger: Log4Moz.repository.getLogger('Alpheios.BrowserUtils'), 
    
    
    /**
     * Get a logger under the requested name
     * @param {String} a_name logger name
     * @return the logger
     * @type Log4Moz.Logger 
     */
    getLogger: function(a_name)
    {
        return Log4Moz.repository.getLogger(a_name);
    },
    
    /**
     * set the log level for the applications
     * for now, only supporting this being set at the root logger level not
     * individually per log type
     */
    setLogLevel: function(a_level)
    {
        Log4Moz.repository.rootLogger.level = Log4Moz.Level[a_level];    
    },
    
    /**
     * General method for logging a debugging message to the javascript console,
     * using the root logger
     * @param {String} a_msg the message to be logged
     */
    debug: function(a_msg) {
        this.s_logger.debug(a_msg);
    },
    
    /**
     * Get a preference from the extensions.alpheios branch
     * @param {String} a_name the preference
     * @param {String} a_lang the language branch (optional)
     * @return the preference (one of int, string or boolean, or undefined)
     */
    getPref: function(a_name,a_lang)
    {
        var lookup_name = a_name;
        if (typeof a_lang != 'undefined' && a_lang != null)
        {
            lookup_name = a_lang + '.' + a_name;
        }
         
        var prefSvc = BrowserSvc.getSvc('AlphPrefs');
        var type = prefSvc.getPrefType(lookup_name);

        // if the preference isn't defined and we were asked for a 
        // a language specific preference, look to see if a default
        // has been defined
        if (type == CI.nsIPrefBranch.PREF_INVALID && typeof a_lang != 'undefined' && a_lang != null)
        {
            lookup_name = a_name; 
            type = prefSvc.getPrefType(lookup_name);
        }
        var ret_value;        
        if (type == CI.nsIPrefBranch.PREF_STRING)
            ret_value = prefSvc.getCharPref(lookup_name);
        else if (type == CI.nsIPrefBranch.PREF_INT)
            ret_value = prefSvc.getIntPref(lookup_name);
        else if (type == CI.nsIPrefBranch.PREF_BOOL)
            ret_value = prefSvc.getBoolPref(lookup_name);
        return ret_value;
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
        
        var type = BrowserSvc.getSvc('AlphPrefs').getPrefType(a_name);
        
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
            BrowserSvc.getSvc('AlphPrefs').setCharPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_INT)
            BrowserSvc.getSvc('AlphPrefs').setIntPref(a_name, a_value);
        else if (type == Components.interfaces.nsIPrefBranch.PREF_BOOL)
            BrowserSvc.getSvc('AlphPrefs').setBoolPref(a_name, a_value);
        else
            this.s_logger.error("Invalid preference type for " + a_name + "(" + type + ":" + typeof a_value + ")")
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
            CC["@mozilla.org/xre/app-info;1"].getService(CI.nsIXULRuntime);
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
                        .QueryInterface(CI.nsILocalFile);
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
                this.s_logger.error("Not a directory: " + base_file_dir.path);
            }
        }
        catch(e)
        {
            this.s_logger.error("Error reading " + base_file_dir.path + ":" + e);
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
                    this.s_logger.error("Error checking path " + avail_path + ":",a_e);
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
                this.s_logger.debug("Found requested file at " + file.path);
                // set the the file to be executable
                file.permissions = 0755;
                this.s_logger.debug("Permissions "  + file.permissions);
                return file;
            }
    
        }
        
        // if we got here, we couldn't find the file
        // report the last path used
        this.s_logger.error("File not found: " + a_base_path + " " + a_filename);
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
        
        if (typeof this.d_extensionBasePaths[a_ext_pkg] == "undefined")
        {
            // build file for base path
            var base_path = 
                CC["@mozilla.org/file/local;1"]
                    .createInstance(CI.nsILocalFile);

            // translate the chrome url to a file
            var url =
                BrowserSvc.getSvc('IO').newURI("chrome://" + a_ext_pkg + "/content/","UTF-8",null);
            var pkg_path = BrowserSvc.getSvc("ChromeReg").convertChromeURL(url).spec;
            this.s_logger.debug("Converted chrome url: " + pkg_path);
            // remove the chrome dir and everything after it 
            pkg_path = pkg_path.substring(0,pkg_path.indexOf('/chrome'));
            // remove the jar prefix
            pkg_path = pkg_path.replace(/^jar:/,'');
            this.s_logger.debug("Cleaned chrome url: " + pkg_path);
            base_path.initWithFile(BrowserSvc.getSvc('Protocol').getFileFromURLSpec(pkg_path));
            this.d_extensionBasePaths[a_ext_pkg] = base_path;
                
        }
        return this.d_extensionBasePaths[a_ext_pkg].clone();
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
            var ext_list = BrowserSvc.getSvc('ExtMgr').getItemList(
                CI.nsIUpdateItem.TYPE_EXTENSION,{},{});
                        
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
            this.s_logger.error("Error retrieving installed extensions:" + a_e);
        }
        return alph_pkgs;
    },

    /**
     * launch the user's email application and prepare feedback email headers
     */
    loadUri: function(a_url)
    {
        var uriToOpen = BrowserSvc.getSvc('IO').newURI(a_url, null, null);
        CC['@mozilla.org/uriloader/external-protocol-service;1']
            .getService(CI.nsIExternalProtocolService)
            .loadURI(uriToOpen, null);
    },
    
    
    /**
     * get the browser owner of a document
     * @param {Window} a_window the parent chrome window
     * @param {Document} a_doc the document
     * @return the browser
     * @type Browser
     */
    browserForDoc: function(a_window,a_doc)
    {
        return a_window.gBrowser.getBrowserForDocument(a_doc);
    },
    
    /**
     * make the browser owner of a document the current browser tab
     * @param {Window} a_window the parent chrome window
     * @param {Document} a_doc the document
     * @return true if the browser could be found and selected otherwise false
     * @type Boolean
     */
    selectBrowserForDoc:function(a_window,a_doc)
    {
        var bro = a_window.gBrowser.getBrowserForDocument(a_doc);
        var num = a_window.gBrowser.browsers.length;
        var succeeded = false;
        for (var i = 0; i < num; i++) {
            var b = a_window.gBrowser.getBrowserAtIndex(i);
            try {
                if (b == bro)
                {
                    a_window.gBrowser.tabContainer.selectedIndex = i;
                    succeeded = true;
                    break;
                }
            } catch(e) {
                this.s_logger.error("Error switch browser tab: " + e);
            }
        }
        return succeeded;
    },
    
    /**
     * Open a new tab and select it
     * @param {Window} a_window the parent window
     * @param {String} a_url the url to open
     */
    openNewTab: function(a_window,a_url)
    {
        a_window.gBrowser.selectedTab = a_window.gBrowser.addTab(a_url);
    },
    
    /**
     * load a javascript file
     * @param {String} a_url the url of the file
     * @param {Object} a_object the object to which the javascript is scoped
     */
    loadJavascript: function(a_url,a_obj)
    {
        CC["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(CI.mozIJSSubScriptLoader)
          .loadSubScript(a_url,a_obj);
    },
    
    /**
     * import a Javascript module
     * @param {String} a_url the url of the module
     * @param {Object} a_objec the object to which the resource is scoped
     */
    importResource: function(a_url,a_obj)
    {
        CU.import(a_url,a_obj);
    },
    
    /**
     * read a file from the file system
     * @param {String} a_uri the location of the file
     * @param {String} a_charset optional target character set to convert the file to
     * @return the file contents
     * @type String
     */
    readFile: function(a_uri,a_charset)
    {
        this.s_logger.debug("Reading file from file system: " + a_uri);
        var input_stream = BrowserSvc.getSvc('InputStream');
        var channel = BrowserSvc.getSvc('IO').newChannel(a_uri,null,null);
        var input = channel.open();
        input_stream.init(input);
        var buffer = input_stream.read(input.available());
        input_stream.close();
        input.close();
        if (typeof a_charset != "undefined" && a_charset != null)
        {
            var conv = BrowserSvc.getSvc('UnicodeConverter');
            conv.charset = a_charset;
            return conv.ConvertToUnicode(buffer);
        }
        else
        {
            return buffer;
        }        
    },
    
    /**
     * open a chrome dialog
     * @param {Window} a_window parent window
     * @param {String} a_url the chrome url
     * @param {String} a_title the dialgo title
     * @param {Object} a_features dialog features
     * @return the dialog object
     * @type Window
     */
    openDialog: function(a_window,a_url,a_title,a_features)
    {
         // default features
        var features =
        {
                titlebar: "yes",
                toolbar: "yes",
                chrome: "yes",
                dialog: "yes",
                resizable: "yes",
                dependent: "yes",
                scrollbars: "yes",
                centerscreen: "yes"
        };
        // override features from args
        if (typeof a_features != "undefined")
        {   
            for (var prop in a_features)
            {
                features[prop] = a_features[prop];
            }
        }
        var feature_list = [];
        for (var prop in features)
        {
            feature_list.push(prop + "=" + features[prop]);
        }

        return a_window.openDialog(
                    a_url, 
                    a_title, 
                    feature_list);   
    },
    
    /**
     * launch the user's email application and prepare feedback email headers
     */
    sendFeedback: function(a_window,a_url)
    {
        var bundle = a_window.document.getElementById('alpheios-strings');
        var subject = this.getString(bundle,'alph-feedback-subject');
        var body = '\n\n' + this.getString(bundle,'alph-installed-versions') + '\n';
        var pkgs = this.getAlpheiosPackages();
        pkgs.forEach(
            function(a_pkg)
            {
                body = body + a_pkg.name + ': ' + a_pkg.version + '\n';
            }
        );
        subject=encodeURIComponent(subject);
        body= encodeURIComponent(body);     
        var url = a_url + '?subject=' + subject + '&body=' + body;
        this.loadUri(url);
    },

    
    /**
     * Get a string from a StringBundle
     * @param {StringBundle} the StringBundle element
     * @param {String} a_name the name of the string
     * @param {Array} a_replace optional array of replacement values
     * @return the string (if not found, then an empty string)
     */
    getString: function(a_bundle,a_name,a_replace)
    {
        
        var str_value = "";
        try
        {
             if (typeof a_replace == "undefined")
             {
                str_value = a_bundle.getString(a_name);
             }
             else
             {
                str_value = a_bundle.getFormattedString(a_name,a_replace)
             }
        }
        catch(a_e)
        {
            str_value = "";
        }
        return str_value;
    },
    
    /**
     * Get a browser service from the BrowserSvc object
     * @param {String} a_svc_name the name of the services (must be in the member _svcs object)
     * @return the requested service
     * @throws an error if the requested service hasn't been predefined 
     */
    getSvc: function(a_name)
    {
        return BrowserSvc.getSvc(a_name);        
    },
    
    /**
     * Get the name of an installed package
     * @param {String} a_lang the language (optional, if not supplied the base
     *                 library package name is returned)
     * @return the package name
     * @type String
     */
    getPkgName: function(a_lang)
    {
        return this.getPref("chromepkg",a_lang) || 'alpheios';   
    },
    
    /**
     * Get the base url for an installed package
     * @param {String) a_lang the language (optional, if not supplied,
     *                        the base library url is returned)
     * @return the base package url
     * @type String     
     */
    getPkgUrl: function(a_lang)
    {
        var protocol = 'chrome://';
        return protocol + this.getPkgName(a_lang);
    },

    /**
     * Get the url of the content directory of an installed package
     * @param {String) a_lang the language (optional, if not supplied,
     *                        the base library url is returned)
     * @return the package content url
     * @type String     
     */
    getContentUrl: function(a_lang)
    {
        return this.getPkgUrl(a_lang) + '/content';
    },
    
    /**
     * Get the url of the style directory of an installed package
     * @param {String) a_lang the language (optional, if not supplied,
     *                        the base library url is returned)
     * @return the package style url
     * @type String     
     */
    getStyleUrl: function(a_lang)
    {
        return this.getPkgUrl(a_lang) + '/skin';
    },
    
     /**
     * Check to see if a url is for a browser resource
     * @param {String} a_url the url string
     * @return true if its a chrome or resource url otherwise false
     * @type Boolean
     */
    isBrowserUrl: function(a_url)
    {
        return a_url.match(/^(chrome|resource):/);
    },
};

BrowserSvc = {
    
    d_svcs: 
    {
        UnicodeConverter: ['@mozilla.org/intl/scriptableunicodeconverter','nsIScriptableUnicodeConverter'],
        ChromeReg: ["@mozilla.org/chrome/chrome-registry;1",'nsIChromeRegistry'],
        IO: ["@mozilla.org/network/io-service;1",'nsIIOService'],
        Console: ["@mozilla.org/consoleservice;1",'nsIConsoleService'],
        Protocol: ["@mozilla.org/network/protocol;1?name=file",'nsIFileProtocolHandler'],
        ExtMgr: ["@mozilla.org/extensions/manager;1",'nsIExtensionManager'],
        InputStream: ["@mozilla.org/scriptableinputstream;1",'nsIScriptableInputStream'] 
    },
     
    /**
     * Initialization code for the Svcs object 
     */
    init: function() {
        this.AlphPrefs = 
            CC["@mozilla.org/preferences-service;1"]
                    .getService(CI.nsIPrefService)
                    .getBranch("extensions.alpheios.");
        this.AlphPrefs.QueryInterface(CI.nsIPrefBranch2);

        // initialize the Log4Moz service
        let formatter = new Log4Moz.BasicFormatter();
        let root = Log4Moz.repository.rootLogger;
        let capp = new Log4Moz.ConsoleAppender(formatter);
        root.addAppender(capp);
    },
    
    /**
     * Lazy get for a service (create reference on first request)
     * @param {String} a_svc_name the name of the services (must be in the member _svcs object)
     * @return the requested service
     * @throws an error if the requested service hasn't been predefined in the d_svcs object
     */
    getSvc: function(a_svc_name)
    {
        if (typeof this[a_svc_name] == "undefined")
        {
            if (typeof this.d_svcs[a_svc_name] == "undefined")
            {
                throw new Error("Service " + a_svc_name + " has not been defined"); 
            }
            else
            {
                var cl = this.d_svcs[a_svc_name][0];
                var iface = this.d_svcs[a_svc_name][1];
                //CC["@mozilla.org/consoleservice;1"]
                //    .getService(CI.nsIConsoleService)
                //    .logStringMessage("Loading Service " + a_svc_name + "," + cl + "," + iface);
                this[a_svc_name] = CC[cl].getService(CI[iface]);
            }
        }
        return this[a_svc_name];
    }

};
BrowserSvc.init();
            

