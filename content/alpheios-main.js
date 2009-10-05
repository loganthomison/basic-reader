/**
 * @fileoverview This file contains the definition of the Alph.Main class. 
 * The Alph.Main class is the main controller for the Alpheios functionality.
 * @version $Id$
 * 
 * Copyright 2008-2009 Cantus Foundation
 * http://alpheios.net
 * 
 * Based upon PeraPera-Kun
 * A modded version of Rikai-Chan by Justin Kovalchuk
 * Original Author: Jonathan Zarate
 * Copyright (C) 2005-2006 
 * http://www.polarcloud.com/
 * 
 * Based on rikaiXUL 0.4 by Todd Rudick
 * http://rikaixul.mozdev.org/
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
 
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-constants.jsm",Alph);
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-xfer-state.jsm",Alph);
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-site-permissions.jsm",Alph);
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-pkgmgr-observer.jsm",Alph);
Alph.BrowserUtils.importResource("resource://alpheios/alpheios-langtool-factory.jsm",Alph);

/**
 * @class Alpheios application controller
 */
Alph.Main =
{
    
    /**
     *id of this extension
     * TODO we can probably remove this now
     */
    d_extensionGUID: "{4816253c-3208-49d8-9557-0745a5508299}",
        
    /**
     * milliseconds to delay after starting the mhttpd daemon
     * @private
     * @type int
     */
    d_daemonCheckDelay: 500,

    /**
     * default language for the extension, @see #setLanguages
     * @private
     * @type String 
     */
    d_defaultLanguage: '',
    
    /**
     * holds the Alph.panel objects (keyed by panel id)
     * @private
     * @type Object 
     */
    d_panels: { },

    /**
     * flag to indicate if the languages were successfully set
     */
    d_hasLanguages: false,

    /**
     * observer object for preference changes
     */
    d_prefsObserver:     
    {
        observe: function(a_subject, a_topic, a_data)
        {
            if (a_topic != "nsPref:changed") {
                return;
            }
            var name = a_data;
            var value = Alph.BrowserUtils.getPref(name);
            Alph.Main.updatePref(name, value);
        }
    },
    
    /**
     * main string bundle for the application (initialized on load)
     * @private
     */
    d_stringBundle: null,
    
    /**
     * main logger for the application
     * @type Log4Moz.Logger
     * @static
     */
    s_logger: Alph.BrowserUtils.getLogger('Alpheios.Main'), 
    
    /**
     * Initialize function for the class. Adds the onLoad event listener to the window
     * add adds a preferences observer on the alpheios preferences
     */
    init: function()
    { 
        window.addEventListener("load", this.onLoad, false);
        Alph.BrowserUtils.getSvc('AlphPrefs').addObserver("", this.d_prefsObserver,false);
        Alph.BrowserUtils.setLogLevel(Alph.BrowserUtils.getPref('log.logger.level'));
    },

    /**
     * Window onLoad handler for the Alpheios extension.
     * Sets up the shortkut keys for the menu items, and
     * registers the onUnLoad , tab select and tab close 
     * event listeners.
     */
    onLoad: function()
    {
        Alph.Main.d_stringBundle = Alph.$("#alpheios-strings").get(0);
        // Register an uninstaller to clear all alpheios preferences
        // when the Basic Libraries package is uninstalled. This includes
        // any language-specific preferences.  
        // TODO eventually we may want to ask the user if it's okay and
        // give them a chance to export/backup their preferences first 
        Alph.PkgMgr.registerObserver(
            Alph.PkgMgr.TYPE_UNINSTALL,
            [{id: Alph.Main.d_extensionGUID, 
                callback: Alph.BrowserUtils.clearPrefs
             }
            ]);
        // Add an observer to make sure the mhttpd daemon is killed whenever the 
        // Firefox application quits (all windows, not just a single window)
        Alph.PkgMgr.registerObserver(
            Alph.PkgMgr.TYPE_QUIT,
            [{id: Alph.Main.d_extensionGUID, 
              callback: Alph.Main.killLocalDaemon
             }
            ]);
        Alph.PkgMgr.start();
        window.addEventListener("unload", function(e) { Alph.Main.onUnLoad(e); },false);
        gBrowser
            .addEventListener("DOMContentLoaded", function(event) { Alph.Main.firstLoad(event) }, false);
        gBrowser.addProgressListener(Alph.Main.d_locListener,
            Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);        
            
        var mks = document.getElementById("mainKeyset");

        // note: setting keys seem to only work during startup
        /* TODO
         * 1) do we want to make the accelarators and short cut keys
         * configurable in the preferences dialgo as peraperakun does?
         */

        var names = ["toggle"];

        for (var i = 0; i<names.length; i++)
        {
            var name = names[i];
            var keychar = Alph.BrowserUtils.getPref("keys." + name);
            var mod = Alph.BrowserUtils.getPref("keymodifiers." + name);
            if (keychar.length > 0)
            {
                var key = document.createElementNS(
                        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "key");
                key.setAttribute("id", "alpheios-" + name + "-key");
                key.setAttribute("key", (keychar.length > 1) ? "" : keychar);
                key.setAttribute("keycode", (keychar.length > 1) ? ("VK_" + keychar) : "");
                key.setAttribute("modifiers", mod);
                key.setAttribute("command", "alpheios-" + name + "-cmd");
                mks.appendChild(key);
            }
        }

        gBrowser.mTabContainer
                .addEventListener("select", Alph.Main.onTabSelect, false);
        gBrowser.mTabContainer
                .addEventListener("TabClose", function(e) { Alph.Main.onTabClose(e); }, false);
        
        Alph.Main.toggleToolbar(); 
        Alph.Main.d_hasLanguages = Alph.Main.setLanguages();
        // register any new auto-enable sites
        Alph.Site.registerSites();
        Alph.Main.showUpdateHelp();
    },
     

    /**
     * Unload handler for the window. Iteraters through the open tabs and 
     * calls the tab close handler, then removes the remaining window event listeners.
     * @param {Event} a_event The unload Event
     */
    onUnLoad: function(a_event)
    {
        Alph.Main.s_logger.debug("Unloading window");
 
        // iterate through the open tabs calling onTabClose on each
        // to make sure to cleanup the resources used by that tab
        // if the extension wasn't explicitly disabled
        var num = gBrowser.browsers.length;
        for (var i = 0; i < num; i++) {
            var bro = gBrowser.getBrowserAtIndex(i);
            try {
                Alph.Main.s_logger.debug("Closing tab " + bro.currentURI.spec);
                this.onTabClose(a_event,bro);
            } catch(e) {
                Alph.Main.s_logger.error(e);
            }
        }
        gBrowser.mTabContainer
            .removeEventListener("select", this.onTabSelect, false);
        gBrowser.mTabContainer
            .removeEventListener("TabClose", this.onTabClose, false);
        gBrowser.removeProgressListener(Alph.Main.d_locListener);
        Alph.BrowserUtils.getSvc('AlphPrefs').removeObserver("", this.d_prefsObserver);
    },

    /**
     * TabSelect event handler for the window. 
     */
    onTabSelect: function()
    {
        Alph.Main.toggleMenuText();
        Alph.Main.resetState();
    },

    /**
     * TabClose event handler for the window. Disables the extension if the 
     * user didn't explicitly do so before closing the tab.
     * @param {Event} a_event The Tab Close event
     * @param a_bro the Browser to close (optional - if not specified will be
     *              picked up from the Tab Close event)
     */
    onTabClose: function(a_event,a_bro)
    {
        Alph.Main.s_logger.debug("in onTabClose");
        if (typeof a_bro == "undefined")
        {
            // get the browser associated with the tab
            // event if one wasn't explicitly sent in arguments
            a_bro = a_event.target.linkedBrowser;
        }
        Alph.Main.inlineDisable(a_bro);   
    },

    /**
     * Toggle the enabled/disabled status of the extension. Use for user-initiated actions.
     * @param {Browser} a_bro the Browser object (optional - current browser used if not supplied)
     * @param {String} a_lang the language to use (optional - default language used if not supplied)
     */
    alphInlineToggle: function(a_bro,a_lang)
    {
        // Thunderbird has no tabs, so we need to use the window instead of
        // the current browser container
        if (typeof a_bro == "undefined")
        {
            a_bro = this.getCurrentBrowser();
        }
        if (this.isEnabled(a_bro))
        {
                this.inlineDisable(a_bro);
        }
        else 
        {
            this.enable(a_bro,a_lang);
        }
        this.getStateObj(a_bro).setVar("toggled_by",Alph.State.USER_ACTION);
        this.onTabSelect();
        
    },
    
    /**
     * Automatically enables the extension for a browser window
     * @param {Browser} a_bro the Browser window
     * @param {String} a_lang the language to use
     */
    autoToggle: function(a_bro,a_lang)
    {
        if (this.isEnabled(a_bro))
        {
            this.inlineDisable(a_bro);
        }
        else {
            this.enable(a_bro,a_lang);
        }
        this.getStateObj().setVar("toggled_by",Alph.State.SYS_ACTION);
        this.onTabSelect();
    },

    /**
     * Enables the extension for a browser window. 
     * @private  
     * @param a_bro the current browser 
     * @param {String} a_lang the language to set as current 
     *                 (optional, if not specified a default
     *                  will be used)
     */
    enable: function(a_bro,a_lang)
    {        
        
        this.getStateObj(a_bro).setVar("enabled",true);
        if (! this.d_hasLanguages)
        {
            var err_msg = this.getString("alph-error-nolanguages");
            alert(err_msg);
            this.inlineDisable(a_bro);
            return;
        }
        if (a_lang == null)
        {
            // TODO - pick up language from source text
            a_lang = this.d_defaultLanguage;
        }
        
        // flag select language not to call onTabSelect
        // because it will be called later by the calling toggle method
        this.selectLanguage(a_lang,false);
        
        // if local service
        if (this.useLocalDaemon())
        {
            this.getLocalDaemonPid(
                this.onMhttpdStart,
                this.startMhttpd);   
        }
        
    },

    /**
     * Disables the extension for the browser window
     * @param a_bro the current browser
     */
    inlineDisable: function(a_bro)
    {
        // just return without doing anything if we're already disabled
        if ( ! this.isEnabled(a_bro))
        {
            return;
        }
        var old_trigger = this.removeXlateTrigger(a_bro);

        Alph.Xlate.removePopup(a_bro);

        this.cleanup(a_bro);
        
        this.getStateObj(a_bro).setDisabled();
                
    },

    /**
     * browser cleanup functions
     * @private
     * @param a_bro the browser to cleanup
     */
    cleanup: function(a_bro)
    {
        // close any windows we opened
        // TODO - do we need to avoid closing any 2ndary windows
        // other tabs or windows may be using?
        Alph.Xlate.closeSecondaryWindows(a_bro);

        // detach local service
        if (this.useLocalDaemon())
        {
            // detach daemon
            this.detachLocalDaemon();
        }
        
    },

    /**
     * Checks to see whether the local mhttpd daemon should be
     * enabled for the extension. Checks for installation of individual
     * Alpheios language extensions which are configured to use mhttpd.
     * @private
     * @return true if any language extension configured to use mhttpd is found
     *         otherwise false
     * @type Boolean
     */
    useLocalDaemon: function()
    {
        // if any one of our languages use the local daemon
        // return true
        var lang_list = Alph.Languages.getLangList();
        for (var i=0; i<lang_list.length; i++)
        {
            if (Alph.Languages.getLangTool(lang_list[i]).getUseMhttpd())
            {
                return true;
            }
        }
        
        // if we get here, none of our languages uses the local mhttpd
        return false;
    },

    /**
     * Get the host on which to run the local mhttpd daemon 
     * from preferences (should be localhost, but some environments
     * may require something different)
     * @private
     * @return the host
     * @type string
     */
    getLocalDaemonHost: function()
    {
        return 'http://' + Alph.BrowserUtils.getPref("mhttpd.host");
    },

    /**
     * Get the port number on which to run the local mhttpd daemon 
     * from preferences.
     * @private
     * @return the port number
     * @type int
     */
    getLocalDaemonPort: function()
    {
        return Alph.BrowserUtils.getPref("mhttpd.port");
    },

    /**
     * Get the PID of the local mhttpd daemon process.
     * @private
     * @return the PID
     * @type int
     */
    getLocalDaemonPid: function(a_onsuccess,a_onerror)
    {
        Alph.$.ajax(
            {
                type: "GET",
                async: true,
                dataType: "text",
                cache: false,
                url: Alph.Main.getLocalDaemonHost() + ":" + Alph.Main.getLocalDaemonPort() + "/mypid",
                //timeout: Alph.BrowserUtils.getPref("url.lexicon.timeout"), TODO - mhttpd timeout
                success: 
                    a_onsuccess,
                error:
                    a_onerror,
            }
        );
    },

    /**
     * Detach from the local httpd daemon process.
     * @private
     */
    detachLocalDaemon: function()
    {
        var detach_url =  Alph.Main.getLocalDaemonHost() + ":"  + Alph.Main.getLocalDaemonPort() + "/detach";        
        
        // Add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // as happens when the browser is issuing the onTabClose event for multiple tabs
        // in a window when the when the window is closed.
        // Using POST would also prevent caching but mhttpd doesn't support POSTS
        var rand_num = Math.floor(Math.random()* 100000000)
        detach_url = detach_url + "?_r=" + rand_num;
        Alph.Main.s_logger.info("detach daemon at " + detach_url);
        
        Alph.$.ajax(
            {
                type: "GET",   
                async: true, 
                dataType: "text",
                cache: false,
                url: detach_url,
                error: 
                    function(a_req,a_text,a_error) 
                    {
                        Alph.Main.s_logger.error("Error detaching Daemon : " + a_error);
                    }
            }
        );
        
    },
    
     /**
     * Kill the local httpd daemon process.
     * @private
     */
    killLocalDaemon: function()
    {
        var kill_url =  Alph.Main.getLocalDaemonHost() + ":"  + Alph.Main.getLocalDaemonPort() + "/kill";        
        
        // Add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // as happens when the browser is issuing the onTabClose event for multiple tabs
        // in a window when the when the window is closed.
        // Using POST would also prevent caching but mhttpd doesn't support POSTS
        var rand_num = Math.floor(Math.random()* 100000000)
        kill_url = detach_url + "?_r=" + rand_num;
        Alph.Main.s_logger.info("kill daemon at " + detach_url);
        
        Alph.$.ajax(
            {
                type: "GET",   
                async: true, 
                dataType: "text",
                cache: false,
                url: kill_url,
                error: 
                    function(a_req,a_text,error) 
                    {
                        Alph.Main.s_logger.error("Error killing daemon : " + error);
                    }
            }
        );
        
    },


    /**
     * Get the current browser window
     * @return the browser
     */
    getCurrentBrowser: function()
    {
        // TODO at some point we might implement tbird support
        //if (this.is_tbird) {
        //    var b = document.getElementById("messagepane");
        //    if (b) return b;
        //    return document.getElementById("content-frame");    // compose
        //}
        return gBrowser.mCurrentBrowser;
        
    },
    
    /**
     * Handler for the popup trigger event. Hands the event off
     * to the {@link Alph.Xlate#doMouseMoveOverText} method. 
     * @param {Event} a_event - the browser event
     * @return true to allow event propogation if the handler is diabled.
     * @type Boolean
     */
    doXlateText: function(a_event)
    {
        // forward the event to Alph.Xlate.doMouseMoveOverText
        Alph.Xlate.doMouseMoveOverText(a_event);
    },

    /**
     * Toggle the text of the browser menu items for extension to 
     * correspond to the current status for the browser.
     * @private
     */
    toggleMenuText: function()
    {
        var cmenu_text = '';
        var tmenu_text = '';
        var menu_lang = '';
        var status_text = '';
        if (! this.isEnabled(this.getCurrentBrowser()))
        {
            cmenu_text = this.getString("alph-inline-enable-cm");
            tmenu_text = this.getString("alph-inline-enable-tm");
            
            status_text = this.getString("alph-tools-status-disabled");
            // TODO - we ought to preserve the user's last
            //        language selection rather than resetting  
            menu_lang = this.d_defaultLanguage;
            
        }
        else
        {
            cmenu_text = this.getString("alph-inline-disable-cm");
            tmenu_text = this.getString("alph-inline-disable-tm");
            menu_lang = this.getStateObj().getVar("current_language");
            status_text = 
                "[" +
                Alph.$("#alpheios-lang-popup-tm menuitem[value='"+menu_lang+"']").attr("label")
                + "]";
        }
        Alph.$("#alpheios-toggle-cm").attr("label",cmenu_text);
        Alph.$("#alpheios-toggle-tm").attr("label",tmenu_text);
        Alph.$("#alpheios-toggle-mm").attr("label",tmenu_text);
        Alph.$("#alpheios-toolbar-status-text").attr("value",status_text);
        this.setTbHints();
        
        // uncheck the previously checked language
        Alph.$("#alpheios-lang-popup-tm menuitem[checked='true']")
            .attr("checked","false");
        Alph.$("#alpheios-lang-popup-cm menuitem[checked='true']")
            .attr("checked","false");
        Alph.$("#alpheios-lang-popup-mm menuitem[checked='true']")
            .attr("checked","false");
        // check the current language
        Alph.$("#alpheios-lang-popup-tm menuitem[value='"+menu_lang+"']")
            .attr("checked","true");
        Alph.$("#alpheios-lang-popup-cm menuitem[value='"+menu_lang+"']")
            .attr("checked","true");
        Alph.$("#alpheios-lang-popup-mm menuitem[value='"+menu_lang+"']")
            .attr("checked","true");
            
        //update the state of the commands for the panel
        this.updateToolsMenu();
    },

    /**
     * Callback executed when the extension is enabled to initialize its use of
     * the local mhttpd daemon. Calls the attach command to increment the 
     * reference count held in the daemon.
     * @private
     * @param a_daemon_response the response to the /mypid request issued to the daemon. 
     */
    onMhttpdStart: function(a_daemon_response)
    {
        var daemonPid = a_daemon_response.replace(/^\s+|\s+$/g, "");
        Alph.Main.s_logger.info("Daemon Pid: " + daemonPid);
        
        var attach_url = Alph.Main.getLocalDaemonHost() + ":"  + Alph.Main.getLocalDaemonPort() + "/attach";
        
        // add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // (unlikley on an attach, but do anyway just to be sure)
        var rand_num = Math.floor(Math.random()* 100000000)
        attach_url = attach_url + "?_r=" + rand_num;
        
        Alph.$.ajax(
            {
                type: "GET",
                async: true,
                dataType: "text",
                cache: false,
                url: attach_url,
                //timeout: Alph.BrowserUtils.getPref("url.lexicon.timeout"), TODO - mhttpd timeout
                success: 
                    function() { Alph.Main.s_logger.info("Daemon attached at " + attach_url); },
                error:
                    function(a_req, a_status, a_error ) 
                    { 
                        Alph.Main.s_logger.fatal("Daemon failed to attach: " + 
                            a_status || a_error); 
                    } 
            }
        );
                
    },
    
    /**
     * Callback executed if the attempt to start the local mhttpd daemon fails.
     * @private
     * @param {XMLHttpRequest} a_req the /mypid request to the daemon
     * @text {String} a_text the text of the response (if any)
     * @error a_error the error code (if any)
     */
    alertMhttpdFailure: function(a_req,a_text,a_error)
    {
        Alph.Main.s_logger.fatal("Unable to verify daemon start: " + a_error || a_text);
        var err_msg = Alph.Main.getString("alph-error-mhttpd-failure");
        alert(err_msg);
    },

    /**
     * Starts the local mhttpd daemon. (Executed as a callback upon failure to 
     * retrieve the pid from the local daemon)
     * @private
     * @param {XMLHttpRequest} a_req the /mypid request to the daemon
     * @text {String} a_text the text of the response (if any)
     * @error a_error the error code (if any)
     */
    startMhttpd: function(a_req,a_text,a_error) 
    {
        Alph.Main.s_logger.info("start daemon");
        var cc = Components.classes;
        var ci = Components.interfaces;

        var daemon = 
            Alph.BrowserUtils.getPlatformFile(['mhttpd','mhttpd'],false,null,true);

        if (daemon == null)
        {
            alert(Alph.Main.getString("alph-error-mhttpd-notfound"));
            return;
                    
        }
        
        
        // iterate through the supported languages concatonating their mhttpd.conf files
        var mhttpd_conf_lines = [];
        
        var lang_list = Alph.Languages.getLangList();
        for (var i=0; i<lang_list.length; i++)
        {
            var lang = lang_list[i]; 
            if (Alph.Languages.getLangTool(lang).getUseMhttpd())
            {
             var pkg = 
                    Alph.BrowserUtils.getPkgName(lang);
                Alph.Main.readMhttpdConf(pkg,mhttpd_conf_lines);
             }
        }
        // add the basic conf
        Alph.Main.readMhttpdConf('alpheios',mhttpd_conf_lines);

        var keywords = Alph.BrowserUtils.getPref("mhttpd.keywords") || "";
        var config = daemon.parent.clone();
        config.append("mhttpd.conf");    
        // write config file
        var foStream =
            cc["@mozilla.org/network/file-output-stream;1"]
                .createInstance(ci.nsIFileOutputStream);
        foStream.init(config, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
        //TODO figure out why setting verbose keyword here fails
        var line = "port=" + Alph.Main.getLocalDaemonPort() 
            + " " + keywords + "\n"; 
        foStream.write(line, line.length);

        // add all the lines retrieved from the separate language 
        // extensions' mhttpd.conf files
        for (var i=0; i<mhttpd_conf_lines.length; i++)
        {
            line = mhttpd_conf_lines[i] + "\n";
            foStream.write(line, line.length);
        }
        foStream.close();

        var process =
            cc["@mozilla.org/process/util;1"]
                .createInstance(ci.nsIProcess);
        process.init(daemon);
        var args = ['mhttpd.conf'];
        process.run(false, args, args.length);
        setTimeout(
            function() {
                Alph.Main.getLocalDaemonPid(
                    Alph.Main.onMhttpdStart,
                    Alph.Main.alertMhttpdFailure)
            },Alph.Main.d_daemonCheckDelay);
    },
    
    /**
     * reads a mhttpd conf file
     * @param {String} a_pkg package name
     * @param {Array} a_lines the array of lines to which to append the file contents
     */
    readMhttpdConf: function(a_pkg,a_lines)
    {
        Alph.Main.s_logger.debug("setting up mhttpd for " + a_pkg);
        var chrome_path = 
            Alph.BrowserUtils.getExtensionBasePath(a_pkg);
        
        chrome_path.append("mhttpd.conf");
        Alph.Main.s_logger.debug("Reading file at " + chrome_path.path);
        // open an input stream from file
        var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Components.interfaces.nsIFileInputStream);
        istream.init(chrome_path, 0x01, 0444, 0);
        istream.QueryInterface(Components.interfaces.nsILineInputStream);

        // read lines into array
        var line = {}, hasmore;
        do {
            hasmore = istream.readLine(line);
            Alph.Main.s_logger.debug("Read " + line.value);
            var values = line.value.split(/\|/);
            
            var exe_info = values[1].split(/,/);
            // translate the exe file path
            var exe_file = 
                Alph.BrowserUtils.getPlatformFile(exe_info,false,a_pkg,true);
            if (exe_file == null)
            {
                Alph.Main.s_logger.error(
                    "Unable to find file at " + 
                    values[1] + " for package" + a_pkg);
            }
            else
            {
                values[1] = exe_file.path;

                // put the values back together
                a_lines.push(values.join('|'));
            }
        } while(hasmore);
        istream.close();
    },
    
    /**
     * Initializes the Alph.Languages object with instantiated instances of
     * {@link Alph.LanguageTool} (or derived class) for each valid language.
     * Iterates through the Alpheios Languages Toolbar menu item 
     * (alpheios-lang-popup-tm menuitem) to identify the languages to try.
     * @private
     * @return true if successful in instantiating at least one Alph.LanguageTool object
     *         other wise false.
     * @type Boolean
     */
    setLanguages: function()
    {

        var languages_set = false;
        
        var lang_list = Alph.LanguageToolFactory.getLangList();
        
        var language_count = lang_list.length;

        // if we have don't have at least one language, show the 'none' item
        // in the menu and return false to disable the extension
        if (language_count==0)
        {
            Alph.$("#alpheios-tm-lang-none").attr("hidden","false");
            Alph.$("#alpheios-mm-lang-none").attr("hidden","false");
            Alph.$("#alpheios-cm-lang-none").attr("hidden","false"); 
        }
        else
        {
            for (var i=0; i<lang_list.length; i++)
            {           
                var a_lang = lang_list[i];
                Alph.Languages.addLangTool(a_lang,Alph.LanguageToolFactory.createInstance(a_lang,Alph));
                
                // add menu items to the various language menus for this language
                var lang_string = this.getLanguageString(a_lang,a_lang+'.string');
                var menuitem = Alph.Util.makeXUL(
                    'menuitem',
                    'alpheios-tm-lang-'+a_lang,
                    ['label','value','type'],
                    [lang_string,a_lang,'checkbox']
                );
                Alph.$("#alpheios-lang-popup-tm").append(menuitem);
                Alph.$("#alpheios-lang-popup-mm").append(
                    Alph.$(menuitem).clone().attr('id','alpheios-cm-lang-'+a_lang));
                Alph.$("#alpheios-lang-popup-cm").append(
                    Alph.$(menuitem).clone().attr('id','alpheios-cm-lang-'+a_lang));
            }
         
            // set the default language from preferences if possible
            var pref_lang = Alph.BrowserUtils.getPref("default_language");
            if (pref_lang != null && pref_lang != '' &&
                Alph.Languages.hasLang(pref_lang))
            {
                Alph.Main.d_defaultLanguage = pref_lang;
            }
            // no preferences so just use the first language in the 
            // menu as the default
            else
            {         
                Alph.Main.d_defaultLanguage = 
                    Alph.$("#alpheios-lang-popup-tm menuitem:visible").get(0).value;
            }
            // successfully setup the Alph.Languages object, so return true 
            languages_set = true;
        }
        return languages_set;
    },
    
    /**
     * Set the current language in use by the browser window.
     * If the extension isn't already enabled, redirects to 
     * {@link Alph.Main#alphInlineToggle} to enable it for the selected
     * language.
     * @private
     * @param {String} a_lang the selected language
     * @param {boolean} a_direct flag to indicate whether the method is being
     *                  called directly via a menu action or from the 
     *                  {@link Alph.Main#enable} method
     * TODO eventually language should be automatically determined
     * from the language of the source text if possible
     */
    selectLanguage: function(a_lang,a_direct) {
        // enable alpheios if it isn't already
        var bro = this.getCurrentBrowser();
        if ( ! this.isEnabled(bro))
        {   
            return this.alphInlineToggle(bro,a_lang);
        }
        if (! Alph.Languages.hasLang(a_lang))
        {
            //TODO handle error more fully?
            alert("Alpheios language " + a_lang + "is not available");
        }
        else
        {
            var old_lang_tool = this.getLanguageTool();
            
            // set the new language but hold onto a copy of the old language
            // tool for use in clearing out the browser
            this.getStateObj(bro).setVar("current_language",a_lang);
            
            var lang_tool = this.getLanguageTool();
            
            // remove the popoup and stylesheets 
            // from the prior language, if any
            Alph.Xlate.removePopup(bro,old_lang_tool);
            
            
            // update the popup trigger if necessary
            this.setXlateTrigger(bro,lang_tool.getPopupTrigger());
             
            // if called directly, call onTabSelect to update the 
            // menu to show which language is current; if not this
            // should be handled by the calling method.
            if (a_direct)
            {
                this.onTabSelect();
            }
            
        
        }
    },
    
    /**
     * Get the Alph.LanguageTool instance for the current language.
     * @param {Browser} a_bro the browser from which to retrieve the language tool
     *                        (if not supplied, the current browser is used) 
     * @return the Alph.LanguageTool instance for the current language
     *         or undefined if the language isn't set or the extension 
     *         isn't enabled
     * @type Alph.LanguageTool
     */
    getLanguageTool: function(a_bro)
    {
        if (typeof a_bro == "undefined")
        {
            a_bro = this.getCurrentBrowser();
        }
        var lang_tool;
        if (this.isEnabled(a_bro))
        {
            lang_tool = 
                Alph.Languages.getLangTool(this.getStateObj(a_bro).getVar("current_language"));
        }
        return lang_tool;
    },
    
    /**
     * Set the hints to be displayed on the FF toolbar
     */
    setTbHints: function()
    {
        var bro = this.getCurrentBrowser();
        // if the tools are enabled, add the trigger hint to the ff toolbar, otherwise remove it
        if (this.isEnabled(bro))
        {
            var mode = this.getStateObj(bro).getVar("level");
            var hint_prop = 'alph-trigger-hint-'+this.getXlateTrigger(bro) + '-'+mode;
            var lang_tool = this.getLanguageTool(bro);
            var lang = lang_tool.getLanguageString();
            var hint = lang_tool.getStringOrDefault(hint_prop,[lang]);
            Alph.$("#alpheios-toolbar-hint").attr("value",hint);
        }
        else
        {
            Alph.$("#alpheios-toolbar-hint").attr("value",'');
        }
    
    },
    
    /**
     * set the popup trigger state variable and event listener 
     * for the browser. Can also be used to switch the browser 
     * from one trigger to another
     * @param a_bro the subject browser
     * @param {String} a_trigger the trigger event name
     */
    setXlateTrigger: function(a_bro, a_trigger)
    {
        // trigger is hard-coded to dble-click in quiz mode
        if (a_trigger == 'mousemove' && this.getStateObj(a_bro).getVar("level") == Alph.Constants.LEVELS.LEARNER)
        {
            alert(this.getString('alph-trigger-force-dbleclick'));
            return;
        }
        // first, remove the old one, if any
        var old_trigger = this.removeXlateTrigger(a_bro);
        
        a_bro.addEventListener(a_trigger, this.doXlateText, false);
        this.getStateObj(a_bro).setVar("xlate_trigger",a_trigger);
        this.setTbHints();
        this.broadcastUiEvent(Alph.Constants.EVENTS.UPDATE_XLATE_TRIGGER,
            {new_trigger: a_trigger,
             old_trigger: old_trigger
            }
        );
    },
    
    /**
     * Get the popup trigger name for the browser
     * @param a_bro the subject browser (if not supplied the current browser will be used)
     * @return the trigger name
     * @type String    
     */
    getXlateTrigger: function(a_bro)
    {
        if (! a_bro)
        {
            a_bro = this.getCurrentBrowser();
        }
        return this.getStateObj(a_bro).getVar("xlate_trigger");
    },
    
    /**
     * Remove the popup trigger event listener from the browser
     * @private
     * @param a_bro the subject browser  
     * @return the old trigger
     */
    removeXlateTrigger: function(a_bro)
    {
        var trigger = this.getXlateTrigger(a_bro);
        
        if (trigger != null && typeof trigger != "undefined")
        {
            a_bro.removeEventListener(trigger,this.doXlateText,false);
        }
        return trigger;
    },
        
    /**
     * Lookup a user-provided word
     * @param {Event} a_event the event that triggered th elookup
     */
    doTbLookup: function(a_event)
    {
        if (typeof a_event != "undefined" && a_event.keyCode != 13)
        {
            return;
        }
        var word = (Alph.$("#alpheios-lookup-text").get(0)).value;
        
        if (word.length == 0)
        {
            return;
        }
        
        // make sure Alpheios is enabled
        var bro = this.getCurrentBrowser();
        if (! this.isEnabled(bro))
        {
            return;
        }
        var lang_tool = this.getLanguageTool();
        var target= new Alph.SourceSelection();
        target.setWord(word);
        target.setWordStart(0);
        target.setWordEnd(word.length -1);
        target.setContext(word);
        target.setContextPos(0);
        
        lang_tool.handleConversion(target);
        var doc_array = [];
        Alph.Main.d_panels['alph-morph-panel'].getCurrentDoc().forEach(
            function(a_doc)
            {
                lang_tool.addStyleSheet(a_doc);
                Alph.$("#alph-window",a_doc).css("display","block");
                doc_array.push(a_doc);
            }
        );
        Alph.Main.d_panels['alph-dict-panel'].getCurrentDoc().forEach(
            function(a_doc)
            {
                lang_tool.addStyleSheet(a_doc);
                Alph.$("#alph-window",a_doc).css("display","block");
                doc_array.push(a_doc);
            }
        );
        Alph.Main.d_panels['alph-morph-panel'].open();

        lang_tool.lexiconLookup(
            target,
            function(data)
            {
                Alph.Xlate.showTranslation(data,target,doc_array,lang_tool);
            },
            function(a_msg)
            {   
                Alph.Xlate.translationError(a_msg,doc_array,lang_tool);
            }
        );
    },
    
    /**
     * Toggle the state of a panel
     * @param {Event} a_event the event that triggered the action
     * @param {String} a_panel_id the name of the target panel 
     */
    togglePanel: function(a_event,a_panel_id)
    {
        var panel = this.d_panels[a_panel_id];
        if (typeof panel != "undefined")
        {
            return panel.toggle();
        }
    },
    
    /**
     * Update the tools (View) menu for the current browser and language
     * (call by the popupshowing handler for the menu)
     */
    updateToolsMenu: function()
    {
        var lang_tool = Alph.Main.getLanguageTool();
        var bro = this.getCurrentBrowser();
        
        // check the language-specific feature notifiers
        Alph.$("broadcaster.alpheios-language-notifier").each(
            function()
            {
                var id = Alph.$(this).attr("id");
                var disabled = true;
                // enable only if Alpheios is enabled
                // and the language supports the feature
                if (Alph.Main.isEnabled(bro) && lang_tool.getFeature(id) )
                {
                    disabled = false;
                }
                Alph.$(this).attr("disabled",disabled);
                if (Alph.$(this).attr("hidden") != null)
                {
                    Alph.$(this).attr("hidden",disabled);
                }
            }
        );        
        
        var current_language = this.getStateObj().getVar("current_language");
        // check the language item-disabled notifiers
        Alph.$("broadcaster.alpheios-language-disabled-notifier").each(
            function()
            {
                var id = Alph.$(this).attr("id");
                var lang = id.match(/alph-lang-(\w+)/)[1];
                var lang_is_current = false;
                if (lang != null && lang == current_language)
                {
                    lang_is_current = true;
                }
                Alph.$(this).attr("disabled",! lang_is_current);
                // only set hidden if the hidden attribute was already set
                if (Alph.$(this).attr("hidden") != null)
                {
                    Alph.$(this).attr("hidden",! lang_is_current);
                }
            }
        );    
        
        // check the extension-status specific notifiers
        Alph.$("broadcaster.alpheios-enabled-notifier").each(
            function()
            {
                // enable if Alpheios is enabled
                if (Alph.Main.isEnabled(bro))
                {
                    Alph.$(this).attr("disabled",false);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",false);
                    }
                }
                else
                {
                    Alph.$(this).attr("disabled",true);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",true);
                    }
                }
            }
        );          
    },
    
    /**
     * Execute a language-specific command - delegate to the current
     * language tool. 
     * @param {Event} a_event the command event (as invoked by the oncommand
     *                attribute of a &lt;command&gt; XUL tag
     */
    executeLangCommand: function(a_event)
    {
        
        var lang_tool = Alph.Main.getLanguageTool();
        
        var cmd_id = a_event.target.getAttribute("id");
        if (cmd_id == null || typeof cmd_id == 'undefined')
        {
            return;
        }
        Alph.Main.s_logger.debug("Executing " + cmd_id);
        if (lang_tool && lang_tool.getCmd(cmd_id))
        {
            lang_tool[(lang_tool.getCmd(cmd_id))](a_event);
        }
        
    },
    
    /** 
     * Broadcast a UI event to the panels
     * @param a_event_type the type of event (per Alph.Constants.events)
     * @param a_event_data optional data object associated with the event
     * TODO replace this with the Observes JS Module when FF3 is min supported
     */
    broadcastUiEvent: function(a_event,a_event_data)
    {
        var bro = this.getCurrentBrowser();
        // Update the panels
        Alph.$("alpheiosPanel").each(
            function()
            {
                var panel_id = Alph.$(this).attr("id");
                try 
                {
                    var panel_obj = Alph.Main.d_panels[panel_id];
                    Alph.Main.s_logger.debug("Observing ui event " + a_event + " for panel " + panel_id); 
                    panel_obj.observeUIEvent(bro,a_event,a_event_data);    
                } 
                catch (e)
                {   
                    Alph.Main.s_logger.error("Error observing ui event for panel " + panel_id + ":" + e);
                }
            }
        );
        // Update the site
        Alph.Site.observeUIEvent(bro,a_event,a_event_data);
        
    },
    
    
    /** 
     * Event handler called when a document is loaded into the browser (i.e. response
     * to the DOMContentLoaded event
     * @param {Event} a_event the load event
     */
    firstLoad: function(a_event)
    {
        var doc = a_event.target;
        var requested_mode = doc.baseURIObject.path.match(/alpheios_mode=([^&;#]+)/);
        if (requested_mode &&
            Alph.$("meta[name=_alpheios-doc-id]",doc).length == 0)
        {
                
            var a_mode = requested_mode[1]
            var id = Alph.XFRState.newStateRequest('reqlevel',a_mode,true);
            Alph.$("head",doc)
                .append('<meta ' +
                    'name="_alpheios-doc-id" ' +
                    'content="' +
                    id +
                    '"></meta>');
        }
        Alph.Main.insertMetadata(a_event);
    },
    
    /**
     * Insert metadata elements identifying the Alpheios extensions into the browser
     * content document
     * @param {Event} a_event the load event
     */
    insertMetadata: function(a_event)
    {
        var doc = a_event.target;
        // add a metadata elements to the page for each installed Alpheios extension
        // so that the page can check for the their presense
        if (Alph.$("meta[name=_alpheios-installed-version]",doc).length == 0)
        {
            var pkg_list = Alph.BrowserUtils.getAlpheiosPackages();
            pkg_list.forEach(
                function(a_item)
                {
                    var content = a_item.id + ':' + a_item.version; 
                    Alph.$("head",doc)
                        .append('<meta ' +
                            'name="_alpheios-installed-version" ' +
                            'content="' +
                            content +
                            '"></meta>');
                }
            );
        }
    },
    
    /**
     * Resets the state element for the current browser.
     */
    resetState: function(a_window)
    {        
        
        // NOTE - when a link is opened in a new tab, currentBrowser in 
        // that case is the browser linked from ...
        var bro = Alph.Main.getCurrentBrowser();
        
        var ped_site = 
            Alph.Site.isPedSite(bro.contentDocument);
        var mixed_site = false;        
        var auto_lang = null;
        
        var cur_lang = this.getStateObj(bro).getVar("current_language");
        if (ped_site)
        {     
            auto_lang = ped_site;            
            this.s_logger.debug("Page language is " + auto_lang);
        }
        else if (mixed_site = Alph.Site.isMixedSite(bro.contentDocument))
        {
            auto_lang = mixed_site;
        }
        else
        {
            auto_lang=Alph.Site.isBasicSite(Alph.BrowserUtils.getSvc('IO').newURI(bro.contentDocument.location,null,null));
        }   
        
        auto_lang = Alph.Languages.mapLanguage(auto_lang);
        
        if (auto_lang && Alph.Languages.hasLang(auto_lang)) 
        {
            
            // if we support this language and site automatically setup the extension for it
            // if Alpheios is not enabled, auto-enable it
            if (! this.isEnabled(bro))
            {
                Alph.Main.s_logger.info("Auto-enabling alpheios for " + auto_lang);
                this.autoToggle(bro,auto_lang);
                return;
            }
            // if alpheios is enabled set to the right language for the prototype
            else if (this.isEnabled(bro) && cur_lang != auto_lang)
            {
                Alph.Main.s_logger.info("Auto-switching alpheios to " + auto_lang);
                Alph.Main.selectLanguage(auto_lang,true);
                // selectLanguage calls onTabSelect which will re-call resetState
                return;  
            }
            // enable the ff toolbar 
            // TODO - we may only want to enable this for basic sites
            this.toggleToolbar(true);
            // if we're not on an enhanced site
            // and make sure the mode is set to READER
            if (! ped_site)
            {
                this.setMode(bro,Alph.Constants.LEVELS.READER);
            }
            // if we're on an enhanced site,  
            // reset the mode to whatever the default is
            else
            {   
                this.setMode(bro);
            }
       
        }
        // if we're not on a supported site but were and the system automatically enabled 
        // the extension, then disable it again
        else if (this.isEnabled(bro) && ! this.toggledByUser(bro))
        {
            this.autoToggle(bro);
            // reset the toolbar status
            this.toggleToolbar();
            // show the leaving site popup, unless we're returning to the alpheios site
            try
            {
                var new_host = bro.contentDocument.location.host;
                if (! new_host.match(/alpheios\.(net|org)/))
                {
                    Alph.BrowserUtils.openDialog(
                        window,
                        Alph.BrowserUtils.getContentUrl() + '/dialogs/leaving-site.xul', 
                        'alpheios-leaving-dialog'); 
                }
            }
            catch(a_e){}
            return;
        }
        else if (this.isEnabled(bro))
        {
            // if we're on a basic site, and the extension is enabled,
            // the set the mode to READER
            this.setMode(bro,Alph.Constants.LEVELS.READER);
        }
        else
        {
            //reset the toolbar status
            this.toggleToolbar();
        }
        
    if ((ped_site || mixed_site) && this.isEnabled(bro))
        {
            // these functions should only be called after Alpheios has been auto-toggled
            // on because otherwise they get done twice via the send call to resetState
            // from Alph.Main.onTabSelect

            // inject the pedagogical site with the alpheios-specific elements
            Alph.Site.setupPage(bro.contentDocument,
                Alph.Translation.INTERLINEAR_TARGET_SRC);
            
            // if we're in quiz mode, and the popup is still showing for a
            // previous selection, clear it because the alignment click handler
            // needs to be reset
            if (Alph.Interactive.enabled() && Alph.Xlate.popupVisible(bro))
            {
                Alph.Xlate.hidePopup();
            }
        }
        
        // notify the auto-enable observers
        Alph.$("broadcaster.alpheios-auto-enable-notifier").each(
            function()
            {
                if (auto_lang && Alph.Main.isEnabled(bro))
                {
                    Alph.$(this).attr("disabled",true);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",true);
                    }
                }
                else
                {
                    Alph.$(this).attr("disabled",false);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",false);
                    }
                }
            }
            
        );
      
                
        // notify the pedagogical reader observers
        Alph.$("broadcaster.alpheios-pedagogical-notifier").each(
            function()
            {
                if (! ped_site)
                {
                    Alph.$(this).attr("disabled",true);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",true);
                    }
                }
                else
                {
                    Alph.$(this).attr("disabled",false);
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden",false);
                    }
                }
            }
            
        );
        
        // notify the basic reader observers
        Alph.$("broadcaster.alpheios-basic-notifier").each(
            function()
            {
                if (! ped_site)
                {
                    Alph.$(this).attr("disabled",false)
                    // only set hidden if the hidden attribute was already set
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden", false);
                    }
                }
                else
                {
                    Alph.$(this).attr("disabled",true);
                    // only set hidden if the hidden attribute was already set
                    if (Alph.$(this).attr("hidden") != null)
                    {
                        Alph.$(this).attr("hidden", true);
                    }
                }
            }
            
        );
        
        
        if (ped_site)
        {
            Alph.Site.updateSiteToolStatus(bro.contentDocument);
        }    
            
          
        // Update the panels
        Alph.$("alpheiosPanel").each(
            function()
            {
                var panel_id = Alph.$(this).attr("id");
                try 
                {
                    var panel_obj = Alph.Main.d_panels[panel_id];
                    panel_obj.resetState(bro);    
                } 
                catch (e)
                {   
                    Alph.Main.s_logger.error("Unable to reset state for panel " + panel_id + ":" + e);
                }
            }
        );
        
    },
    
    /**
     * Initialization method called by the constructor for the alpheiosPanel binding. 
     * Aggregates Alph.Panel objects for each panel element in the Alph.Main.d_panels
     * object.
     * @param {alpheiosPanel} a_panel the DOM object bound to the alpheiosPanel tag.
     */
    panelBound: function(a_panel)
    {
        var panel_id = Alph.$(a_panel).attr("id");
        var panel_class = Alph.$(a_panel).attr("paneltype");
        try 
        {
            var panel_obj = new Alph[panel_class](a_panel);
            this.d_panels[panel_id] = panel_obj;    
        } 
        catch(exception)
        {
            Alph.Main.s_logger.error("Error instantiating " +
                panel_id + " with " + panel_class + ":" + exception);
        }
        
    },
    
    /**
     * Get the Alpheios state object for the selected browser
     * @param {Browser} a_bro the browser object
     * @return {Alph.State} the Alpheios State object
     */
    getStateObj: function(a_bro)
    {
        // if a browser hasn't been supplied, just get the current one
        if (typeof a_bro == "undefined")
        {
            a_bro = this.getCurrentBrowser();
        }
        if (typeof a_bro.alpheios == "undefined")
        {
            a_bro.alpheios = new Alph.State();
        };
        return a_bro.alpheios;
    },
        
    /**
     * Shortcut method to see if the Alpheios extension has
     * been enabled for the selected browser
     * @param {Browser} a_bro the browser object
     * @returns true if enabled false if not
     * @type Boolean
     */
    isEnabled: function(a_bro)
    {
        return this.getStateObj(a_bro).getVar("enabled");
    },
    
    /**
     * Shortcut method to see if the Alpheios extension status
     * for the selected browser was last toggled by an overt User action 
     * (Not yet in use)
     * @param {Browser} a_bro the Browser object
     * @return true if user initiated otherwise false
     * @type boolean 
     */
    toggledByUser: function(a_bro)
    {
        var by_user = 
            this.getStateObj(a_bro).getVar("toggled_by") == Alph.State.USER_ACTION;
        return by_user;
         
    },
    
    /**
     * toggle the ff toolbar
     * @param {Boolean} a_on true if toolbar should be turned on, false if not 
     */
    toggleToolbar: function(a_on)
    {
        if (typeof a_on == "undefined")
        {
            a_on = false;
            try {
                a_on = Alph.BrowserUtils.getPref("enable.toolbar");
            }
            catch(a_e)
            {
                // the toolbar defaults to off
                a_on = false;
            }
        }
        if (a_on)
        {
            //only add the toolbar if it's not already there
            if (Alph.$('#alpheios-toolbar').length == 0)
            {
                var toolbar = Alph.$("#alpheios-toolbar-template").clone();
                Alph.$(toolbar).attr("id",'alpheios-toolbar');
                Alph.$(toolbar).attr("collapsed",false);
                Alph.$(toolbar).attr("hidden",false);
                Alph.$("#navigator-toolbox").append(toolbar);
                Alph.Main.enableTbLookup();
            }
        }
        else
        {
            Alph.$("#navigator-toolbox #alpheios-toolbar").remove();
        }
    },
   
    /**
     * enable or disable the toolbar lookup box per the preference
     */
    enableTbLookup: function()
    {
        if (Alph.BrowserUtils.getPref("toolbar.lookup"))
        {
            Alph.$("#alpheios-lookup-enabled").attr("hidden",false);
        }
        else
        {
            Alph.$("#alpheios-lookup-enabled").attr("hidden",true);
        }
    },

    /**
     * set the mode variable for the browser. 
     * @param a_bro the subject browser
     * @param {String} a_mode the new mode (optional - if not supplied will
     *                        be retrieved from the document metadata
     */
    setMode: function(a_bro,a_mode)
    {
        if (typeof a_bro == "undefined" || a_bro == null)
        {
            a_bro = this.getCurrentBrowser();   
        }
        
        // if we weren't explicity passed the mode, check to see
        // if it's present in the querystring for the page
        if (typeof a_mode == "undefined")
        {
            var requested_mode = a_bro.currentURI.path.match(/alpheios_mode=([^&;#]+)/);
            var doc_id = Alph.$("head meta[name=_alpheios-doc-id]",a_bro.contentDocument).attr("content");
            // if the mode is specified in the query string, and we haven't
            // already responded to the query string for this document once,
            // then set the mode according to the query string.
            // we don't want to do this more than once per document, because the user
            // can change the mode after it's loaded, and we don't want to reset it 
            // if the user switches to another tab or window after changing it.
            if (requested_mode && doc_id)
            {
                var uri_mode = Alph.XFRState.getStateValue(doc_id,'reqlevel');
                if (uri_mode == requested_mode[1])
                {
                    a_mode = requested_mode[1];
                }
            }
            else if (requested_mode)
            {
                Alph.XFRState.getStateValue(doc_id,'reqlevel')
            }
        }
        if (typeof a_mode != "undefined")
        {
            this.getStateObj(a_bro).setVar("level",a_mode);
            
            // update the trigger - hardcoded to dblclick for quiz mode
            var trigger = a_mode == 
                Alph.Constants.LEVELS.LEARNER ? 'dblclick' 
                                    : this.getLanguageTool(a_bro).getPopupTrigger();
            this.setXlateTrigger(a_bro,trigger);
            // clear out any popup
            Alph.Xlate.removePopup(a_bro);    
        }
        var new_mode = this.getStateObj(a_bro).getVar("level");
        
        // update the site toolbar
        Alph.Site.setCurrentMode(a_bro.contentDocument,new_mode);
        // make sure the ff toolbar button has the right state
        Alph.$("toolbarbutton[group=AlpheiosLevelGroup]").each(
            function() { this.setAttribute("checked",'false');}
        );
        Alph.$("#alpheios-level-button-"+new_mode).attr("checked",true);
        Alph.$("broadcaster.alpheios-level-disable-notifier").each(
            function()
            {
                
                var disabled = false;
                if (this.getAttribute("id").indexOf(new_mode) >= 0)
                {
                    disabled = true;
                }
                Alph.$(this).attr("disabled",disabled);
                if (Alph.$(this).attr("hidden") != null)
                {
                    Alph.$(this).attr("hidden",disabled);
                }
            }
        );
    },
    
       
    /**
     * get the mode variable for the browser
     * @param a_bro the subject browser
     */
    getMode: function(a_bro)
    {
     
        if (! a_bro)
        {
            a_bro = this.getCurrentBrowser();
        }
        return this.getStateObj(a_bro).getVar("level");
    },
    
    /**
     * Implementation of nsIWebProgressListener which listens for 
     * changes to the url in the location bar, and if the the url changes
     * calls reset state upon the subsequent page load
     * @see https://developer.mozilla.org/en/Code_snippets/Progress_Listeners  
     */
    d_locListener:
    {
        // keep track of the last URL loaded in this window
        d_lastUrlBase : '',
        // flag to indicate whether or not we should handle the load state change
        d_handleLoad: false,
        // flag to indicate if it's a refresh or reload of the last page
        d_handleRefresh: false,
        
        QueryInterface: function(aIID)
        {
            if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
                aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                aIID.equals(Components.interfaces.nsISupports))
              return this;
            throw Components.results.NS_NOINTERFACE;
        },
        
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus)
        {
           if(aFlag & Components.interfaces.nsIWebProgressListener.STATE_START)
           {
             // do nothing at load start
           }
           // only handle the load if flagged to by a change in the location bar url 
           // otherwise we end up calling resetState much too often because
           // the load state change handler is called with every ajax request
           if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP)
           {
                // if we're reloading the same page, or following a link
                // within the page, just refresh the alpheios site elements
                // but don't do the full state reset for the panels
                // note that if the user is opening a link to the same
                // page in a new tab, the call to getCurrentBrowser() will always return
                // the tab which is in focus and not the new tab.  This is okay
                // because the page in the new tab will be handled when the user
                // switches to it by the onTabSelect handler
                if (this.d_handleRefresh)
                {
                    this.d_handleRefresh = false;
                    Alph.Main.s_logger.debug("Handling refresh for " + this.d_lastUrlBase);
                    var bro = Alph.Main.getCurrentBrowser();
                    var doc = bro.contentDocument;
                    Alph.Main.insertMetadata({target: doc});
                    if ((Alph.Site.isPedSite(doc) || Alph.Site.isMixedSite(doc))
                        && Alph.Main.isEnabled(bro))
                    {
                        // update the site functionality and toolbar
                        Alph.Site.setupPage(doc,Alph.Translation.INTERLINEAR_TARGET_SRC);
                        var mode = Alph.Main.getStateObj(bro).getVar("level");
                        Alph.Site.setCurrentMode(doc,mode);
                        // check to see if we need to refresh the state of any panels
                        
                        Alph.$("alpheiosPanel").each(
                            function()
                            {
                                var panel_id = Alph.$(this).attr("id");
                                try 
                                {
                                    var panel_obj = Alph.Main.d_panels[panel_id];
                                    panel_obj.handleRefresh(bro);    
                                } 
                                catch (e)
                                {   
                                    Alph.Main.s_logger.error("Unable to refresh state for panel " + panel_id + ":" + e);
                                }
                            }
                        );
                    }
                }
                else if(this.d_handleLoad) 
                {
                    this.d_handleLoad = false;
                    Alph.Main.s_logger.debug("Handling load for " + this.d_lastUrlBase);
                    Alph.Main.resetState(aWebProgress.DOMWindow);
                }
           }
           return 0;
        },

        onLocationChange: function(aProgress, aRequest, aURI)
        {
           // This fires when the location bar changes; i.e load event is confirmed
           // or when the user switches tabs. If you use myListener for more than one tab/window,
           // use aProgress.DOMWindow to obtain the tab/window which triggered the change.
           var new_url_base= aURI.spec.match(/([^#]+)[#]?/)[1]
           if (new_url_base == this.d_lastUrlBase)
           {
            this.d_handleRefresh = true;
           }
           else
           {
            this.d_handleLoad = true;
           }
           this.d_lastUrlBase = new_url_base;          
        },
        
        onProgressChange: function() {},
        onStatusChange: function() {},
        onSecurityChange: function() {},
        onLinkIconAvailable: function() {}
    },
    
    /**
     * Iterate through the installed Alpheios packages and 
     * open a new tab with the release notes if any package has been updated 
     */
    showUpdateHelp: function()
    {
        var firstrun = [];
        var alph_pkgs = Alph.BrowserUtils.getAlpheiosPackages();
        alph_pkgs.forEach(
            function(a_pkg)
            {
                try
                {
                    var last_install_ver = Alph.BrowserUtils.getPref('firstrun.'+ a_pkg.id);
                    if (! last_install_ver || (last_install_ver != a_pkg.version))
                    {
                        firstrun.push(a_pkg);
                    }
                }
                catch (a_e)
                {
                    // if the preference isn't set, it's the first run
                    firstrun.push(a_pkg)
                }
            }
        );
                
        if (firstrun.length > 0)
        {
            // TODO should we open multiple release/package specific pages?
            Alph.Util.openAlpheiosLink(window,'release-notes');
            firstrun.forEach(
                function(a_pkg)
                {
                    Alph.BrowserUtils.setPref('firstrun.'+a_pkg.id,a_pkg.version);
                }
            );
        }

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
                Alph.Languages.hasLang(first_branch[1]))
            {
                a_lang = first_branch[1];
            }
        }
        if (a_name.match(/popuptrigger$/))
        {   
            // iterate through the open browsers
            // updating to the trigger if alpheios 
            // is enabled and the current language is
            // named in the preference 
            var num = gBrowser.browsers.length;
            for (var i = 0; i < num; i++) {
                var bro = gBrowser.getBrowserAtIndex(i);
                if (Alph.Main.isEnabled(bro) && 
                    a_name.indexOf(Alph.Main.getStateObj(bro).getVar("current_language")) == 0)
                {
                    Alph.Main.setXlateTrigger(bro,a_value);
                }
            }
        }            
        else if (a_name.match(/enable.toolbar$/))
        {
            Alph.Main.toggleToolbar(a_value);
        }
        else if (a_name.match(/toolbar.lookup$/))
        {
            Alph.Main.enableTbLookup();
        }
        else if (a_name.match(/logger.level/))
        {
            Alph.BrowserUtils.setLogLevel(a_value);
        }

        if (typeof a_lang != 'undefined')
        {
            Alph.Languages.getLangTool(a_lang).observePrefChange(a_name,a_value);
        }
        Alph.Main.broadcastUiEvent(
            Alph.Constants.EVENTS.UPDATE_PREF,
                { name: a_name,
                  value: a_value });
    },
    
    /**
     * Get a language specific application string
     * @param {String} a_lang the language key
     * @param {String} a_name the string name
     * @param {Array} a_replace optional array of replacement values
     * @return the string (empty string if not defined) 
     * @type String
     */
    getLanguageString: function(a_lang,a_name,a_replace)
    {
        var str = "";
        try { 
            str = Alph.LanguageToolFactory.getStringBundle(a_lang).get(a_name,a_replace); 
        }
        catch (a_e)
        {
            str = "";
        }
        return str;
    },

    /**
     * Get an application string
     * @param {String} a_name the string name
     * @param {Array} a_replace optional array of replacement values
     * @return the string (empty string if not defined) 
     * @type String
     */
    getString: function(a_name,a_replace)
    {
        return Alph.BrowserUtils.getString(this.d_stringBundle,a_name,a_replace);
    }
};

Alph.Main.init();


