/**
 * @fileoverview This module contains the BrowserUtils and BrowserSvc objects
 * which contain code and services specific to the Mozilla platform. 
 * Exports a single symbol, BrowserUtils which must be imported into the 
 * namespace of the importing class.
 *
 * @version $Id$
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
  
const EXPORTED_SYMBOLS = ['BrowserUtils'];

/**
 * Module scoped constants
 */
const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

/** 
 * File Permissions
 */
const PERMS_FILE = 0644;
const PERMS_DIRECTORY = 0755;
    
/**
 * File Modes
 */
const RDONLY  = 0x01;
const WRONLY = 0x02;
const RDWR = 0x04;
const CREATE = 0x08;
const APPEND = 0x10;
const TRUNCATE = 0x20;

CU.import("resource://alpheios/ext/log4moz.js");

/**
 * @class Alpheios Browser-Specific Utility functions
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
     * Get a filename preference from the extensions.alpheios branch
     * @param {String} a_name the preference
     * @param {String} a_lang the language branch (optional)
     * @return the path to the file as an string
     */
    getLocalFilePref: function(a_name,a_lang)
    {
        var lookup_name = a_name;
        if (typeof a_lang != 'undefined' && a_lang != null)
        {
            lookup_name = a_lang + '.' + a_name;
        }
         
        var prefSvc = BrowserSvc.getSvc('AlphPrefs');
        var path = null;
        try {
            var file = prefSvc.getComplexValue(lookup_name,CI.nsILocalFile);
            path = file.path;
        } catch(a_e)
        {
            this.s_logger.debug(a_name + " not defined as a valid file path: " + a_e);
        }
        return path;
    },
    
    /**
     * Set a filename preference in the extensions.alpheios branch
     * @param {String} a_pref the preference
     * @param {String} a_path the file path, or nsIFile object
     * @param {String} a_lang the language branch (optional)
     */
    setLocalFilePref: function(a_name,a_pathOrFile,a_lang)
    {
        var lookup_name = a_name;
        if (typeof a_lang != 'undefined' && a_lang != null)
        {
            lookup_name = a_lang + '.' + a_name;
        }
         
        var prefSvc = BrowserSvc.getSvc('AlphPrefs');
        try {
            var file = this.getLocalFile(a_pathOrFile);
            prefSvc.setComplexValue(lookup_name,CI.nsILocalFile,file);
        } catch(a_e)
        {
            this.s_logger.debug(a_pathOrFile + " not storable as a valid file path :" + a_e);
        }
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
     * Reset a user preference in the extensions.alpheios branch
     * @param {String} a_name the name of the preference
     * @param {String} a_lang the language branch (optional)
     */
    resetPref: function(a_name, a_lang)
    {
        if (typeof a_lang != 'undefined')
        {
            a_name = a_lang + '.' + a_name;
        }
        try 
        {   
            BrowserSvc.getSvc('AlphPrefs').clearUserPref(a_name);
        }
        catch(a_e)
        {
            this.s_logger.debug("Unable to clear user value from " + a_name + ":" + a_e);
        }
    },
    
    /**
     * Clear all the preferences in the extensions.alpheios branch
     */
    clearPrefs: function()
    {
        BrowserSvc.getSvc('AlphPrefs').deleteBranch('');
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
        
        var bro = a_window.gBrowser.getBrowserForDocument(a_doc);
        if (! bro && a_doc.defaultView.frameElement)
        {
            bro = a_window.gBrowser.getBrowserForDocument(a_doc.defaultView.frameElement.ownerDocument);
        }
        return bro;
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
        var bro = this.browserForDoc(a_window,a_doc);
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
     * execute a test on a local file
     * @param {String} a_path the path to the file
     * @param {String} a_test the optional test (supported values are 
     *                 '<', '>' or '<>'). if not specified test is exists
     * @return test result (true or false)
     * @type Boolean  
     */
    testLocalFile: function(a_path,a_test)
    {   
        var file = this.getLocalFile(a_path);
        var result = false;
        switch (a_test)
        {
            case '>':
            {
                // file is writeable if it exists and is writeable
                // OR if it doesn't exist but parent path is writeable
                result = 
                    (file.exists() && file.isWritable()) ||
                    (!file.exists() && file.parent.isWritable());
                break;
            }
            case '<':
            {
                result = file.exists() && file.isReadable();
                break;
            }
            case '<>':
            {
                result = file.exists() && file.isWritable() && file.isReadable();
                break;
            }
            default :
            {
                result = file.exists();
                break;
            }
        }
        return result;
    },
    
    /**
     * Copy a local file to a new location
     * @param a_srcPathOrFile the path to the src file (as a String or nsIFile object)
     * @param a_toPathOrFile the file name for the new src file 
     *                      (as a String, or as an nsIFile object. if a String, the parent directory
     *                      of the src file will be used)
     * @param {Boolean{ a_ovewrrite flag to request overrwrite if target file exists
     */
    copyLocalFile: function(a_srcPathOrFile,a_toPathOrFile,a_overrwrite)
    {
        var srcFile = this.getLocalFile((a_srcPathOrFile));
        if (! srcFile.exists())
        {
            this.s_logger.debug("Source file at " + srcFile.path + " doesn't exist. Nothing to copy");
            return;
        }
        // if the target file argument is a file, then use the full path
        // otherwise, it's a file name and use the parent directory
        var toFile = "";
        var parentDir = null;
        var newpath= null;
        if (a_toPathOrFile instanceof CI.nsIFile)
        {
            toFile = a_toPathOrFile.leafName;
            parentDir = a_toPathOrFile.parent;
            newpath = a_toPathOrFile;
        }
        else
        {
            toFile = a_toPathOrFile;
            parentDir = srcFile.parent;
            var newpath = parentDir.clone();
            newpath.append(toFile);
        }
        if (newpath.exists())
        {
            try 
            {
                if (a_overrwrite)
                {
                    newpath.remove(false);
                    
                }
                else
                {
                     throw "Cannot copy to " + newpath.path + ": file exists"; 
                }
            }
            catch(a_e)
            {
                this.s_logger.error(a_e);
            }
        }
        try
        {
            srcFile.copyTo(parentDir,toFile);
        }
        catch(a_e)
        {
            this.s_logger.error(a_e);
        }
    },
    
    /**
     * read a local file
     * @param a_pathOrFile the local file path or nsIFile object
     * @param String a_charset optional charset for the file (defaults to UTF-8)
     */
    readLocalFile: function(a_pathOrFile,a_charset)
    {
        var ret = "";
        if (!a_charset)
        {
            a_charset = "UTF-8";
        }
        try
        {
            var file = this.getLocalFile(a_pathOrFile);
            if (!file.exists())
            {
                throw "Cannot open file for reading, file does not exist";
            }
            var fis = CC["@mozilla.org/network/file-input-stream;1"].
                createInstance(CI.nsIFileInputStream);
            fis.init(file, RDONLY, 0444, 0);
            var stream = CC["@mozilla.org/intl/converter-input-stream;1"].
                createInstance(CI.nsIConverterInputStream);
            stream.init(fis, "UTF-8", 4096,
                      CI.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
    
            
            var str = {};
            while (stream.readString(4096, str) != 0) {
                ret += str.value;
            }
            stream.close();
        }
        catch(a_e)
        {
            this.s_logger.warn("Unable to read file at " + a_path + ": " + a_e);
        }
        return ret;  
    },
    
    /**
     * write a local file
     * @param a_pathOrFile the local file path or nsIFile object
     * @param String a_data the data to write to the file
     * @param String a_charset optional charset for the file (defaults to UTF-8)
     */
    writeLocalFile: function(a_pathOrFile,a_data,a_charset)
    {
        if (!a_charset)
        {
            a_charset = "UTF-8";
        }
        try
        {
            var file = this.getLocalFile(a_pathOrFile);
            
            var fos = CC["@mozilla.org/network/file-output-stream;1"].
              createInstance(CI.nsIFileOutputStream);
            fos.init(file, 
                WRONLY | CREATE | TRUNCATE, 
                PERMS_FILE, 
                0);
            var stream = CC["@mozilla.org/intl/converter-output-stream;1"]
                .createInstance(CI.nsIConverterOutputStream);
            stream.init(fos, a_charset, 4096, 0x0000);
            stream.writeString(a_data);
            stream.close();
        } 
        catch(a_e)
        {
            this.s_logger.warn("Unable to write file at " + a_pathOrFile + ":" + a_e);
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
     * @param {String} a_lang the language (optional, if not supplied,
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
     * @param {String} a_lang the language (optional, if not supplied,
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
     * @param {String} a_lang the language (optional, if not supplied,
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
    /**
     * get xslt processor
     * @param {String} a_filename the name of the xslt file to import
     * @param {String} a_lang optional language-specific indicator
     * @returns a new XSLTProcessor object with the named stylesheet imported from the xslt directory of the extension 
     * @type XSLTProcessor
     */
     getXsltProcessor: function(a_filename,a_lang)
    {
        // module code doesn't have access to the browser window object under the global 
        // scope .. need to get a recent window to have access to browser window methods
        var recent_win = this.getMostRecentWindow();
        var xsltProcessor = new recent_win.XSLTProcessor();
        
        // first try to load and import using a chrome url
        try
        {
            var xslt_url = this.getContentUrl(a_lang) + '/xslt/' + a_filename;
            var xmlDoc = recent_win.document.implementation.createDocument("", "", null);
            xmlDoc.async = false;
            this.debug("Loading xslt at " + xslt_url);
            xmlDoc.load(xslt_url);
            xsltProcessor.importStylesheet(xmlDoc);
        }
        catch(a_e)
        {
          // if that fails, try loading directly from the filesystem using XMLHttpRequest   
          // see https://bugzilla.mozilla.org/show_bug.cgi?id=422502
            try
            {
                var pkg_path = this.getExtensionBasePath(this.getPkgName(a_lang));
                pkg_path.append('xslt');
                pkg_path.append(a_filename);
                var path_url = 'file:///' + pkg_path.path;
                this.debug("XHR Loading xslt at " + path_url);
                var p = new recent_win.XMLHttpRequest();      
                p.open("GET", path_url, false);
                p.send(null);
                xsltProcessor.importStylesheet(p.responseXML);
            }
            catch(a_ee)
            {
                // if that fails, we're out of luck
                this.debug("Unable to load stylesheet " + a_filename + " for " + a_lang + " : " + a_e + "," + a_ee);
            }
        }
        return xsltProcessor;
    },
    
    /**
     * get the most recent browser window from the nsIWindowMediator service
     * @param {String} a_type the window type (optional)
     * @return the most recent browser window
     * @type Window
     */
    getMostRecentWindow: function(a_type)
    {
        if (typeof a_type == "undefined")
        {
            a_type = null;
        }
        return BrowserSvc.getSvc('WinMediator').getMostRecentWindow(a_type);
    },
    
    /**
     * get a list of data files under an alpheios user directory
     * @param {String} a_sub sub directory path
     * @param {Boolean} a_create flag to create the data directory if it doesn't exist 
     * @return the directory contents as an Array of Arrays of [filename,fullpath]
     * @type Array
     */
    listDataFiles: function(a_sub,a_create)
    {
        var prof_dir = this.getDataDir(a_sub,a_create);
        var entries = [];
        var iter = prof_dir.directoryEntries;
        while (iter.hasMoreElements())
        {
            var file = iter.getNext().QueryInterface(CI.nsILocalFile);
            if (file && file.isFile())
            {
                entries.push([file.leafName,file.path]);
            }
        }
        return entries;
    },

    /**
     * get the path to a data directory
     * @param a_sub subdirectory under the data directory (optional)
     * @param a_create create directory it if it doesn't exist (optional)
     * @return the data directory
     * @type nsIFile
     */
    getDataDir: function(a_sub,a_create)
    { 
        var prof_dir = this.getSvc("DirSvc").get("ProfD", CI.nsIFile);
        prof_dir.append("alpheios");
        if (a_sub)
        {
            var pathParts = a_sub.split("/");
            for (var i = 0; i < pathParts.length; i++)
            {
                prof_dir.append(pathParts[i]);
            }
        }
        if (!prof_dir.exists() && a_create) 
        {
            prof_dir.create(CI.nsIFile.DIRECTORY_TYPE, PERMS_DIRECTORY);
            //TODO handle create error
        }
        return prof_dir;
    },
    
    /**
     * remove the alpheios user data directory from the filesystem
     * @param a_sub optional subdirectory if only a subdirectory to be removed
     */
    removeDataDir: function(a_sub)
    {
        var prof_dir = this.getDataDir(a_sub);        
        if( prof_dir.exists() ) 
        {   
           prof_dir.remove(true);
        }
    },
    
    /**
     * Zip a data directory
     * @param {String} a_zipPathOrFile target path (or nsIZipFile) of the zip file
     * @param {nsIFile} a_srcDir optional source directory for the zip
     *                  if not specified defaults to the default "alpheios" directory
     *                  under the FF profile
     * @throws Error upon failure
     */
    zipDataDir: function(a_zipPathOrFile,a_srcDir)
    {
        var errors = [];
        if (! a_srcDir)
        {
            a_srcDir = this.getDataDir(null,true);
        }

        var installed = [];
        var pkg_list = this.getAlpheiosPackages();
        pkg_list.forEach(
            function(a_item)
            {
                installed.push(a_item.id + ':' + a_item.version); 
            }
        );
        
        // add or overwrite to the version file in the directory
        var version_file = a_srcDir.clone();
        version_file.append("app_version.txt");
        this.writeLocalFile(version_file,installed.join(","));
        var zipFile = this.getLocalFile(a_zipPathOrFile);    
        var zipW =  CC["@mozilla.org/zipwriter;1"].createInstance(CI.nsIZipWriter);
        zipW.open(zipFile, RDWR | CREATE | TRUNCATE);
        
        // recurse through the files and subdirectories in the user data directory
        var iter = a_srcDir.directoryEntries;
        while (iter.hasMoreElements())
        {
            var entry = iter.getNext().QueryInterface(CI.nsILocalFile);
            try 
            {
                this.recurseFile(
                   entry,
                   null,
                   function(a_file,a_path)
                   {
                       if (a_file && a_file.isDirectory())
                       {
                           zipW.addEntryDirectory(a_path,a_file.lastModifiedTime,false);
                       } else if (a_file && a_file.isFile())
                       {
                           zipW.addEntryFile(a_path, 
                            CI.nsIZipWriter.COMPRESSION_DEFAULT, a_file, false);
                       }
                    });
            } catch(a_err)
            {
                this.s_logger.error("Error writing zip file at " + a_zipPathOrFile + ":" + a_err);
                errors.push(a_err);
            }
        }
        zipW.close();
        if (errors.length > 0)
        {
            throw errors.join(",");
        }
            
    },
    
    /**
     * Recursively examin a file or directory, performing callback it and each subdirectory and its files
     * @param {nsIFile} a_fileOrDir nsIFile of type NORMAL_FILE_TYP or DIRECTORY_TYPE
     * @param {String} a_parentPath the unix-style parent path for the file 
     * @param {Function} a_callback callback to execute on each file 
     *                             (takes the current file and path as arguments) 
     */
    recurseFile: function(a_fileOrDir, a_parentPath, a_callback)
    {
        var path = a_parentPath ? a_parentPath + "/" + a_fileOrDir.leafName
                                   : a_fileOrDir.leafName;
        if (a_fileOrDir && a_fileOrDir.isDirectory())
        {
            a_callback(a_fileOrDir,path);
            var next_iter = a_fileOrDir.directoryEntries;
            while (next_iter.hasMoreElements())
            {
                var next_file = next_iter.getNext().QueryInterface(CI.nsILocalFile);
                this.recurseFile(next_file,path,a_callback)       
            }
        }
        else if (a_fileOrDir && a_fileOrDir.isFile())
        {
            a_callback(a_fileOrDir,path);
        }
    },    
        
    
    /**
     * Unzip a user data package
     * @param String a_zipPathOrFile the zip file path (or nsIFile)
     * @param Boolean a_overwrite flag to allow files in targetDir to be overwritten
     * @param String a_targetDir the target directory for the extraction
     *               (optional if not specified defaults to the alpheios data directory)
     * @throws Error upon failure 
     */
    extractZipData: function(a_zipPathOrFile,a_overwrite,a_targetDir)
    {
        var errors = [];
        if (! a_targetDir)
        {
            a_targetDir = this.getDataDir(null,true);
        }
        var zipReader = CC["@mozilla.org/libjar/zip-reader;1"].createInstance(CI.nsIZipReader);
        var zipFile = this.getLocalFile(a_zipPathOrFile);
        zipReader.open(zipFile);
        try {
            zipReader.test(null);
            // create directories first
            var entries = zipReader.findEntries("*/");
            while (entries.hasMore()) {
                var entryName = entries.getNext();
                var target = this.getZipEntryFile(entryName,a_targetDir);
                if (!target.exists()) {
                    try {
                        target.create(CI.nsILocalFile.DIRECTORY_TYPE, PERMS_DIRECTORY);
                    }
                    catch (a_e) {
                        this.s_logger.error("failed to create target directory from zip at " +
                            target.path + ":" + a_e);
                        errors.push(a_e);
                    }
                }
            }
            entries = zipReader.findEntries(null);
            while (entries.hasMore()) {
                var entryName = entries.getNext();
                target = this.getZipEntryFile(entryName,a_targetDir);
                // if the file already exists and we haven't been flagged to overwrite files
                // or the file is a directory, just continue to the next file
                if (target.exists() && (! a_overwrite || target.isDirectory()))
                {
                    continue;
                }
                try {
                    if (target.exists())
                    { 
                        target.remove(false);
                    }
                    target.create(CI.nsILocalFile.NORMAL_FILE_TYPE, PERMS_FILE);
                }
                catch (a_e) {
                    this.s_logger.error("failed to create target file from zip at " +
                        target.path + ": " + a_e);
                    errors.push(a_e);
                }
                zipReader.extract(entryName, target);
            }
        } catch(a_e)
        {
            this.s_logger.error("invalid zip at " + a_zipPathOrFile + ": " + a_e);
            errors.push(a_e);
        }
        zipReader.close();
        if (errors.length > 0)
        {
            throw errors.join(',');
        }
        
    },

    /**
     * get an entry in a zip file as an nsIFile
     * @param {String} a_path the path in the zip
     * @param {nsIFile} a_targetDir the parent extraction directory
     * @returns the zip entry as an nsIFile object
     */
    getZipEntryFile: function(a_path,a_targetDir) {
        var itemLocation = a_targetDir.clone();
        var parts = a_path.split("/");
        for (var i = 0; i < parts.length; ++i)
        {
            itemLocation.append(parts[i]);
        }
        return itemLocation;
    },
    
    /**
     * get an nsILocalFile object given a path or a file
     * @param a_pathOrFile (a String path or an nsIFile)
     * @returns the file object
     * @type nsILocalFile
     */
    getLocalFile: function(a_pathOrFile)
    {
        var file;
        if (a_pathOrFile instanceof CI.nsIFile)
        {
            file = a_pathOrFile;
        }
        else 
        {
            file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
            file.initWithPath(a_pathOrFile);
        }
        return file;
    },
    
    /**
     * the leaf name for a local file object
     * @param a_pathOrFile (a String path or an nsIFile)
     * @returns the leaf name for the file
     * @type String
     */
    getLocalFileName: function(a_pathOrFile)
    {
        var file = this.getLocalFile(a_pathOrFile);
        return file.leafName;        
    },
    
    /**
     * Present dialog for selecting a directory/folder
     * @param {Window} a_window the parent window
     * @param {Event} a_event the initiating event
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {Function} a_callback callback function called upon folder select or cancel
     *                   callback args are the window, the event, the return code and the file 
     * @param {Object} a_ctx the 'this' object for the callback 
     * @param {String} a_defaultDir the default directory for the dialog (optional)
     * @returns the return value from the callback function
     */
    doDirectoryPicker: function(a_window, a_event, a_title, a_callback, a_ctx, a_defaultDir)
    {
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title; 
        var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
        fp.init(a_window, title, CI.nsIFilePicker.modeGetFolder);       
        if (a_defaultDir)
        {
            fp.displayDirectory = a_defaultDir;
        }
        var rv = fp.show();
        var rc = (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace);
        return a_callback.call(a_ctx,a_window,a_event,rc,fp.file);
    },
    
    /**
     * Present dialog for selecting a file
     * @param {Window} a_window the parent window
     * @param {Event} a_event the initiating event
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {Function} a_callback callback function called upon file select or cancel
     *                   callback args are the window, the event, the return code and the file path
     * @param {Object} a_ctx the 'this' object for the callback 
     * @param {String} a_defaultExt the default extension filter string for the dialog e.g. *.zip (optional)
     * @param {String} a_defaultFile the default file path for the dialog (optional)
     * @param {Boolean} a_save true to display save as dialog
     * @returns the return value from the callback function 
     */
    doFilePicker: function(a_window,a_event,a_title, a_callback,a_ctx,a_defaultExt,a_defaultFile,a_save)
    {
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title; 
        var fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
        fp.init(a_window, title, a_save ? CI.nsIFilePicker.modeSave : CI.nsIFilePicker.modeOpen);
        var displayDir = null;
        if (a_defaultFile)
        {
            fp.defaultString  = a_defaultFile;
            try 
            {
                var defaultDir = this.getLocalFile(a_defaultFile).parent;
                if (defaultDir && defaultDir.isDirectory())
                {
                    displayDir = defaultDir;
                }
            } catch (a_e) {
                // fall through to default
            };
        }
        // default to the desktop if a default file path hasn't been provided
        if (displayDir == null)
        {
            displayDir = BrowserSvc.getSvc('DirSvc').get("Desk", Components.interfaces.nsIFile);
        }       
        fp.displayDirectory = displayDir;
        this.debug(("display dir set to ") + fp.displayDirectory.path);
        if (a_defaultExt)
        {
            fp.appendFilter(a_defaultExt,a_defaultExt);
        }
        else
        {
            fp.appendFilters(fp.filterAll);    
        }
        var rv = fp.show();
        var rc = (rv == CI.nsIFilePicker.returnOK || rv == CI.nsIFilePicker.returnReplace);
        return a_callback.call(a_ctx,a_window,a_event,rc,fp.file ? fp.file.path : null);
    },
    
    /** 
     * display an alert dialog
     * @param {Window} a_window the parent window
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {String} a_text the text contents for the dialog
     */
    doAlert: function(a_window,a_title,a_text)
    {
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title;
        var text = this.getString(bundle,a_text) || a_text;
        BrowserSvc.getSvc("Prompts").alert(a_window,title,text);
    },

    /** 
     * display a confirmation dialog
     * @param {Window} a_window the parent window
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {String} a_text the text contents for the dialog
     * @returns the result from the confirmation dialog 
     *          (true if the user selected Ok, false if they selected Cancel)
     */
    doConfirm: function(a_window,a_title,a_text)
    {
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title;
        var text = this.getString(bundle,a_text) || a_text;
        var result = BrowserSvc.getSvc("Prompts").confirm(a_window,title,text);
        return result;
    },
    
    /**
     * display a confirmation dialog with an OK, Cancel and 1 extra button
     * @param {Window} a_window the parent window
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {String} a_text the text contents for the dialog
     * @param {String} a_extra the title for the extra button (string or key into properties)
     * @param {int} a_default the default button (1 for OK, 1 for Cancel, 2 for the extra button)
     * @returns the index of the pressed button (0 for OK, 1 for Cancel or Close, 2 for the extra button)
     * @type int
     */
    doConfirmPlusOpt: function(a_window, a_title, a_text, a_extra, a_default)
    {
        var prompts = BrowserSvc.getSvc("Prompts");
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title;
        var text = this.getString(bundle,a_text) || a_text;
        var extra = this.getString(bundle,a_extra) || a_extra;
        var flags = 
            prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_OK +
            prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL  +
            prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;
            // This value of flags will create 3 buttons. The first will be "OK", the
            // second will "Cancel" and the third will be the value of extra
            var button = 
                prompts.confirmEx(a_window, title, text, flags, "", "", extra, null, {value:false});
    },
    
    /**
     * display a selection list dialog
     * @param {Window} a_window the parent window
     * @param {String} a_title the title for the dialog (string or key into properties)
     * @param {String} a_text the text contents for the dialog (string or key into properties)
     * @param {Array} a_select the list of strings for the select list
     * @returns the index of the selected item or -1 if the user chose cancel
     * @type int
     */
    doSelect: function(a_window,a_title,a_text,a_select)
    {
        var prompts = BrowserSvc.getSvc("Prompts");
        var bundle = a_window.document.getElementById('alpheios-strings');
        var title = this.getString(bundle,a_title) || a_title;
        var text = this.getString(bundle,a_text) || a_text;
        var selected = {};
        var rc = -1;
        if (prompts.select(a_window, title, text, a_select.length, a_select, selected))
        {
            rc = selected.value;
        }
        return rc;
    },
            
    /**
     * add a status message to a browser element
     * @param {Window} a_window the browser window
     * @param {String} a_elem_id the browser element id
     * @param {String} a_message the message string (or key into properties)
     */
    setStatus: function(a_window,a_elem_id,a_message)
    {
        var elem = a_window.document.getElementById(a_elem_id);
        if (elem)
        {
            var bundle = a_window.document.getElementById('alpheios-strings');
            var msg = this.getString(bundle,a_message) || a_message;
            elem.value = msg;
        }
    },
    
    /**
     * clear a status message in a browser element
     * @param {Window} a_window the browser window
     * @param {String} a_elem_id the browser element id
     */
    clearStatus: function(a_window,a_elem_id)
    {
        var elem = a_window.document.getElementById(a_elem_id);
        if (elem)
        {
            elem.value = "";
        }
    },
    
    /**
     * Iterate through the open browser windows, executing a callback
     * in the context of each window. 
     * @param {Function} a_callback callback function. Should accept the browser
     *                              as a parameter and return a Boolean     *                              
     * @returns the return value for the callback (true if it returned true in any browser, 
     *                                          false only if it returned false in all browsers)
     * @type Boolean
     */
    checkBrowsers: function(a_callback)
    {
        var wm = this.getSvc('WinMediator');
        var enumerator = wm.getEnumerator("navigator:browser");
            
        var cb_return = false;
        // iterate through the open browser windows, executing callback in context
        // of each window        
        while(enumerator.hasMoreElements()) {  
            var win = enumerator.getNext();
            var w_gBrowser = win.gBrowser;
            var num = w_gBrowser.browsers.length;
            for (var i = 0; i < num; i++) {
                var bro = w_gBrowser.getBrowserAtIndex(i);
                if (a_callback.call(win,bro))
                {
                    cb_return = true;                            
                    break;
                }
            }
        }
        return cb_return;
                    
    }
         
};

/**
 * @class Browser Services
 * @private  
 */
BrowserSvc = {
    
    /**
     * supported services
     * @private
     */
    d_svcs: 
    {
        UnicodeConverter: ['@mozilla.org/intl/scriptableunicodeconverter','nsIScriptableUnicodeConverter'],
        ChromeReg: ["@mozilla.org/chrome/chrome-registry;1",'nsIChromeRegistry'],
        IO: ["@mozilla.org/network/io-service;1",'nsIIOService'],
        Console: ["@mozilla.org/consoleservice;1",'nsIConsoleService'],
        Protocol: ["@mozilla.org/network/protocol;1?name=file",'nsIFileProtocolHandler'],
        ExtMgr: ["@mozilla.org/extensions/manager;1",'nsIExtensionManager'],
        InputStream: ["@mozilla.org/scriptableinputstream;1",'nsIScriptableInputStream'],
        WinMediator: ["@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator"],
        DirSvc: ["@mozilla.org/file/directory_service;1","nsIProperties"],
        Prompts: ["@mozilla.org/embedcomp/prompt-service;1","nsIPromptService"]
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
            

