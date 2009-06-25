/**
 * @fileoverview This file contains the definition of the Alph namespace
 * and the Alph.main class. 
 * The Alph.main class is the main controller for 
 * the Alpheios functionality.
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
          
/**
 * @singleton
 */
Alph.main =
{
    
    /** 
     * flag for main menu update status
     */
    mm_languages_updated: false,
    
    // id of this extension
    // TODO we can probably remove this now
    extensionGUID: "{4816253c-3208-49d8-9557-0745a5508299}",
        
    /**
     * milliseconds to delay after starting the mhttpd daemon
     * @private
     * @type int
     */
    daemonCheckDelay: 500,

    /**
     * default language for the extension, @see #set_languages
     * @private
     * @type String 
     */
    defaultLanguage: '',
    
    /**
     * holds the Alph.panel objects (keyed by panel id)
     * @private
     * @type Object 
     */
    panels: { },

    /**
     * holds the Event types
     */
    events: 
        {
            SHOW_TRANS: 100,
            HIDE_POPUP: 200,
            REMOVE_POPUP: 300,
            SHOW_DICT: 400,
            UPDATE_PREF: 500,
            LOAD_DICT_WINDOW: 600,
            LOAD_TREE_WINDOW: 700,
            UPDATE_XLATE_TRIGGER: 800
        },

    /**
     * holds the levels
     */
    levels: 
    {
        LEARNER: 'learner',
        READER: 'reader',
    },
    
    /**
     * flag to indicate if the languages were successfully set
     */
    has_languages: false,
    
    /**
     * Initialize function for the class. Adds the onLoad event listener to the window
     * and calls the {@link Alph.util#init} method
     */
    init: function()
    {
        window.addEventListener("load", this.onLoad, false);

        Alph.util.init();
       
    },

    /**
     * Window onLoad handler for the Alpheios extension.
     * Sets up the shortkut keys for the menu items, and
     * registers the onUnLoad , tab select and tab close 
     * event listeners.
     */
    onLoad: function()
    {
        // register the uninstaller for the installed Alpheios packages
        Alph.Uninstaller.register_observer(
            Alph.$.map(Alph.util.getAlpheiosPackages(),function(a){return a.id}));
        // register an upgrade observer for this package ---
        // if we're upgrading the basic libraries, we need to make sure to kill the 
        // mhttpd daemon before the browser restarts. Bug 308.
        Alph.Upgrader.register_observer(
            [{id: Alph.main.extensionGUID, 
              callback: Alph.main.killLocalDaemon
             }
            ]);

        window.addEventListener("unload", function(e) { Alph.main.onUnLoad(e); },false);
        gBrowser
            .addEventListener("DOMContentLoaded", function(event) { Alph.main.first_load(event) }, false);
        gBrowser.addProgressListener(Alph.main.loc_listener,
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
            var keychar = Alph.util.getPref("keys." + name);
            var mod = Alph.util.getPref("keymodifiers." + name);
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
                .addEventListener("select", Alph.main.onTabSelect, false);
        gBrowser.mTabContainer
                .addEventListener("TabClose", function(e) { Alph.main.onTabClose(e); }, false);
        
        Alph.main.toggle_toolbar(); 
        Alph.main.has_languages = Alph.main.set_languages();
        // register any new auto-enable sites
        Alph.site.register_sites();
        Alph.main.show_update_help();
    },
     

    /**
     * Unload handler for the window. Iteraters through the open tabs and 
     * calls the tab close handler, then removes the remaining window event listeners.
     * @param {Event} a_event The unload Event
     */
    onUnLoad: function(a_event)
    {
        Alph.util.log("Unloading window");
 
        // iterate through the open tabs calling onTabClose on each
        // to make sure to cleanup the resources used by that tab
        // if the extension wasn't explicitly disabled
        var num = gBrowser.browsers.length;
        for (var i = 0; i < num; i++) {
            var bro = gBrowser.getBrowserAtIndex(i);
            try {
                Alph.util.log("Closing tab " + bro.currentURI.spec);
                this.onTabClose(a_event,bro);
            } catch(e) {
                Alph.util.log(e);
            }
        }
        gBrowser.mTabContainer
            .removeEventListener("select", this.onTabSelect, false);
        gBrowser.mTabContainer
            .removeEventListener("TabClose", this.onTabClose, false);
        gBrowser.removeProgressListener(Alph.main.loc_listener);
        
        Alph.util.shutdown();    
    },

    /**
     * TabSelect event handler for the window. 
     */
    onTabSelect: function()
    {
        Alph.main.toggleMenuText();
        Alph.main.reset_state();
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
        Alph.util.log("in onTabClose");
        if (typeof a_bro == "undefined")
        {
            // get the browser associated with the tab
            // event if one wasn't explicitly sent in arguments
            a_bro = a_event.target.linkedBrowser;
        }
        Alph.main.inlineDisable(a_bro);   
    },

    /**
     * Toggle the enabled/disabled status of the extension. Use for user-initiated actions.
     * @param {Browser} a_bro the Browser object (optional - current browser used if not supplied)
     * @param {String} a_lang the language to use (optional - default language used if not supplied)
     */
    alph_inlineToggle: function(a_bro,a_lang)
    {
        // Thunderbird has no tabs, so we need to use the window instead of
        // the current browser container
        if (typeof a_bro == "undefined")
        {
            a_bro = this.getCurrentBrowser();
        }
        if (this.is_enabled(a_bro))
        {
                this.inlineDisable(a_bro);
        }
        else 
        {
            this._enable(a_bro,a_lang);
        }
        this.get_state_obj(a_bro).set_var("toggled_by",Alph.State.USER_ACTION);
        this.onTabSelect();
        
    },
    
    /**
     * Automatically enables the extension for a browser window
     * @param {Browser} a_bro the Browser window
     * @param {String} a_lang the language to use
     */
    autoToggle: function(a_bro,a_lang)
    {
        if (this.is_enabled(a_bro))
        {
            this.inlineDisable(a_bro);
        }
        else {
            this._enable(a_bro,a_lang);
        }
        this.get_state_obj().set_var("toggled_by",Alph.State.SYS_ACTION);
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
    _enable: function(a_bro,a_lang)
    {        
        this.mouseButtons = 0;
        
        a_bro.addEventListener("keydown", this.onKeyDown, true);
        this.get_state_obj(a_bro).set_var("enabled",true);
        if (! this.has_languages)
        {
            var err_msg = 
                document.getElementById("alpheios-strings")
                        .getString("alph-error-nolanguages");
            alert(err_msg);
            this.inlineDisable(a_bro);
            return;
        }
        if (a_lang == null)
        {
            // TODO - pick up language from source text
            a_lang = this.defaultLanguage;
        }
        
        // flag select language not to call onTabSelect
        // because it will be called later by the calling toggle method
        this.select_language(a_lang,false);
        
        // if local service
        if (this.useLocalDaemon())
        {
            this.getLocalDaemonPid(
                this.on_mhttpd_start,
                this.start_mhttpd);   
        }
        
    },

    /**
     * Disables the extension for the browser window
     * @param a_bro the current browser
     */
    inlineDisable: function(a_bro)
    {
        // just return without doing anything if we're already disabled
        if ( ! this.is_enabled(a_bro))
        {
            return;
        }
        var old_trigger = this.removeXlateTrigger(a_bro);
        a_bro.removeEventListener("keydown", this.onKeyDown, true);

        Alph.xlate.removePopup(a_bro);

        this.cleanup(a_bro);
        
        this.get_state_obj(a_bro).set_disabled();
                
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
        Alph.xlate.closeSecondaryWindows(a_bro);

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
        var lang_list = Alph.Languages.get_lang_list();
        for (var i=0; i<lang_list.length; i++)
        {
            if (Alph.Languages.get_lang_tool(lang_list[i]).getusemhttpd())
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
        return 'http://' + Alph.util.getPref("mhttpd.host");
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
        return Alph.util.getPref("mhttpd.port");
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
                url: Alph.main.getLocalDaemonHost() + ":" + Alph.main.getLocalDaemonPort() + "/mypid",
                //timeout: Alph.util.getPref("url.lexicon.timeout"), TODO - mhttpd timeout
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
        var detach_url =  Alph.main.getLocalDaemonHost() + ":"  + Alph.main.getLocalDaemonPort() + "/detach";        
        
        // Add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // as happens when the browser is issuing the onTabClose event for multiple tabs
        // in a window when the when the window is closed.
        // Using POST would also prevent caching but mhttpd doesn't support POSTS
        var rand_num = Math.floor(Math.random()* 100000000)
        detach_url = detach_url + "?_r=" + rand_num;
        Alph.util.log("detach daemon at " + detach_url);
        
        Alph.$.ajax(
            {
                type: "GET",   
                async: true, 
                dataType: "text",
                cache: false,
                url: detach_url,
                error: 
                    function(req,text,error) 
                    {
                        Alph.util.log("Error detaching Daemon : " + error);
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
        var kill_url =  Alph.main.getLocalDaemonHost() + ":"  + Alph.main.getLocalDaemonPort() + "/kill";        
        
        // Add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // as happens when the browser is issuing the onTabClose event for multiple tabs
        // in a window when the when the window is closed.
        // Using POST would also prevent caching but mhttpd doesn't support POSTS
        var rand_num = Math.floor(Math.random()* 100000000)
        kill_url = detach_url + "?_r=" + rand_num;
        Alph.util.log("kill daemon at " + detach_url);
        
        Alph.$.ajax(
            {
                type: "GET",   
                async: true, 
                dataType: "text",
                cache: false,
                url: kill_url,
                error: 
                    function(req,text,error) 
                    {
                        Alph.util.log("Error killing daemon : " + error);
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
     * to the {@link Alph.xlate#doMouseMoveOverText} method. 
     * @param {Event} a_event - the browser event
     * @return true to allow event propogation if the handler is diabled.
     * @type Boolean
     */
    doXlateText: function(a_event)
    {
        // TODO should we disable the double click handler if the
        // the selected text was a link?
        //if (this.xlateTrigger == 'dblclick' && a_event.srcElement.tagName == "A") {
        //    return true;
        //}

        Alph.xlate.doMouseMoveOverText(a_event);
    },

    /**
     * Handler for the key down event.  Hands off to the assigned handler
     * handler for the key in the current {@link Alph.LanguageTool} instance.
     * shift (keyCode==16) : hands the event off to {@link Alph.LanguageTool#shiftHandler}. 
     * ctrl (keyCode==17) : sets flag to temporarily disable the mousemove handler
     * @param {Event} a_event the key press event
     * @return true to allow event propogation
     * @type Boolean
     */
    onKeyDown: function(a_event)
    {
        // shift key handler
        // only effective while the mouseover popup is visible
        if (a_event.keyCode == 16)
        {
            // don't respond to the shift key if we're not actively looking at 
            // or working on a selected word
            if (Alph.xlate.popupVisible() || Alph.interactive.query_visible())
            {
                // make a copy of the current popup element and use that in case the user
                // moves the mouse before the target handler finishes initializing
                var popup = Alph.$("#alph-text", content.document).clone();    
                Alph.main.getLanguageTool().shiftHandler(a_event,popup);
            }
        }
        // return true to allow event propogation if needed
        return true;
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
        if (! this.is_enabled(this.getCurrentBrowser()))
        {
            cmenu_text =
                Alph.$("#alpheios-strings").get(0)
                    .getString("alph-inline-enable-cm");
            tmenu_text =
                Alph.$("#alpheios-strings").get(0)
                    .getString("alph-inline-enable-tm");
            
            status_text = 
                Alph.$("#alpheios-strings").get(0)
                    .getString("alph-tools-status-disabled");
            // TODO - we ought to preserve the user's last
            //        language selection rather than resetting  
            menu_lang = this.defaultLanguage;
            
        }
        else
        {
            cmenu_text =
                Alph.$("#alpheios-strings").get(0)
                    .getString("alph-inline-disable-cm");
            tmenu_text =
                Alph.$("#alpheios-strings").get(0)
                    .getString("alph-inline-disable-tm");
            menu_lang = this.get_state_obj().get_var("current_language");
            status_text = 
                "[" +
                Alph.$("#alpheios-lang-popup-tm menuitem[value='"+menu_lang+"']").attr("label")
                + "]";
        }
        Alph.$("#alpheios-toggle-cm").attr("label",cmenu_text);
        Alph.$("#alpheios-toggle-tm").attr("label",tmenu_text);
        Alph.$("#alpheios-toggle-mm").attr("label",tmenu_text);
        Alph.$("#alpheios-toolbar-status-text").attr("value",status_text);
        this.set_tb_hints();
        
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
        this.update_tools_menu();
    },

    /**
     * Callback executed when the extension is enabled to initialize its use of
     * the local mhttpd daemon. Calls the attach command to increment the 
     * reference count held in the daemon.
     * @private
     * @param daemon_response the response to the /mypid request issued to the daemon. 
     */
    on_mhttpd_start: function(daemon_response)
    {
        var daemonPid = daemon_response.replace(/^\s+|\s+$/g, "");
        Alph.util.log("Daemon Pid: " + daemonPid);
        
        var attach_url = Alph.main.getLocalDaemonHost() + ":"  + Alph.main.getLocalDaemonPort() + "/attach";
        
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
                //timeout: Alph.util.getPref("url.lexicon.timeout"), TODO - mhttpd timeout
                success: 
                    function() { Alph.util.log("Daemon attached at " + attach_url); },
                error:
                    function(req, status, error ) 
                    { 
                        Alph.util.log("Daemon failed to attach: " + 
                            status || error); 
                    } 
            }
        );
                
    },
    
    /**
     * Callback executed if the attempt to start the local mhttpd daemon fails.
     * @private
     * @param {XMLHttpRequest} req the /mypid request to the daemon
     * @text {String} the text of the response (if any)
     * @error the error code (if any)
     */
    alert_mhttpd_failure: function(req,text,error)
    {
        Alph.util.log("Unable to verify daemon start: " + error || text);
        var err_msg = 
                document.getElementById("alpheios-strings")
                        .getString("alph-error-mhttpd-failure");
        alert(err_msg);
    },

    /**
     * Starts the local mhttpd daemon. (Executed as a callback upon failure to 
     * retrieve the pid from the local daemon)
     * @private
     * @param {XMLHttpRequest} req the /mypid request to the daemon
     * @text {String} the text of the response (if any)
     * @error the error code (if any)
     */
    start_mhttpd: function(req,text,error) 
    {
        Alph.util.log("start daemon");
        var cc = Components.classes;
        var ci = Components.interfaces;

        var daemon = 
            Alph.util.getPlatformFile(['mhttpd','mhttpd'],false,null,true);

        if (daemon == null)
        {
            alert(Alph.$("#alpheios-strings").get(0)
                .getString("alph-error-mhttpd-notfound"));
            return;
                    
        }
        
        
        // iterate through the supported languages concatonating their mhttpd.conf files
        var mhttpd_conf_lines = [];
        
        var lang_list = Alph.Languages.get_lang_list();
        for (var i=0; i<lang_list.length; i++)
        {
            var lang = lang_list[i]; 
            if (Alph.Languages.get_lang_tool(lang).getusemhttpd())
            {
                var chromepkg = 
                    Alph.Languages.get_lang_tool(lang).getchromepkg();
                Alph.util.log("setting up mhttpd for " + chromepkg);
                var chrome_path = 
                    Alph.util.getExtensionBasePath(chromepkg);
                
                chrome_path.append("mhttpd.conf");
                Alph.util.log("Reading file at " + chrome_path.path);
                // open an input stream from file
                var istream = cc["@mozilla.org/network/file-input-stream;1"]
                              .createInstance(Components.interfaces.nsIFileInputStream);
                istream.init(chrome_path, 0x01, 0444, 0);
                istream.QueryInterface(ci.nsILineInputStream);

                // read lines into array
                var line = {}, hasmore;
                do {
                    hasmore = istream.readLine(line);
                    Alph.util.log("Read " + line.value);
                    var values = line.value.split(/\|/);
                    
                    var exe_info = values[1].split(/,/);
                    // translate the exe file path
                    var exe_file = 
                        Alph.util.getPlatformFile(exe_info,false,chromepkg,true);
                    if (exe_file == null)
                    {
                        Alph.util.log(
                            "Unable to find file at " + 
                            values[1] + " for package" + chromepkg);
                    }
                    else
                    {
                        values[1] = exe_file.path;

                        // put the values back together
                        mhttpd_conf_lines.push(values.join('|'));
                    }
                } while(hasmore);
                istream.close();
            }
        }

        var keywords = Alph.util.getPref("mhttpd.keywords") || "";
        var config = daemon.parent.clone();
        config.append("mhttpd.conf");    
        // write config file
        var foStream =
            cc["@mozilla.org/network/file-output-stream;1"]
                .createInstance(ci.nsIFileOutputStream);
        foStream.init(config, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
        //TODO figure out why setting verbose keyword here fails
        var line = "port=" + Alph.main.getLocalDaemonPort() 
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
                Alph.main.getLocalDaemonPid(
                    Alph.main.on_mhttpd_start,
                    Alph.main.alert_mhttpd_failure)
            },Alph.main.daemonCheckDelay);
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
    set_languages: function()
    {

        var languages_set = false;

        var language_count = 0;
        // discover supported languages
        Alph.$("#alpheios-lang-popup-tm menuitem").each(
            function(i)
            {
                //var lang = Alph.$(this).attr("value");
                var lang = this.value;
                Alph.util.log("Language menuitem: " + lang);
                if (lang != null && lang != '' )
                {
                    if (typeof Alph.LanguageToolSet[lang] == "undefined")
                    {
                        // if a derived class for this language isn't defined,
                        //  instantiate an instance of the base class
                        Alph.Languages.add_lang_tool(lang,new Alph.LanguageTool(lang));
                    }
                    else if (Alph.LanguageToolSet[lang].implementsAlphLanguageTool)
                    {
                        // if we have a derived class for this language,
                        // instantiate an instance of the derived class
                        Alph.Languages.add_lang_tool(lang,new Alph.LanguageToolSet[lang](lang));
                    }   
                    language_count++;
                }
                else
                {
                    Alph.util.log("Language value undefined for " + this.label);
                    Alph.$(this).attr("hidden","true");
                }
            }
         );
         
         // if we have don't have at least one language, show the 'none' item
         // in the menu and return false to disable the extension
         if (language_count==0)
         {
            Alph.$("#alpheios-tm-lang-none").attr("hidden","false");
            Alph.$("#alpheios-cm-lang-none").attr("hidden","false"); 
         }
         else
         { 
            // set the default language from preferences if possible
            var pref_lang = Alph.util.getPref("default_language");
            if (pref_lang != null && pref_lang != '' &&
                Alph.Languages.has_lang(pref_lang))
            {
                Alph.main.defaultLanguage = pref_lang;
            }
            // no preferences so just use the first language in the 
            // menu as the default
            else
            {
                             
             Alph.main.defaultLanguage = 
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
     * {@link Alph.main#alph_inlineToggle} to enable it for the selected
     * language.
     * @private
     * @param {String} a_lang the selected language
     * @param {boolean} a_direct flag to indicate whether the method is being
     *                  called directly via a menu action or from the 
     *                  {@link Alph.main#_enable} method
     * TODO eventually language should be automatically determined
     * from the language of the source text if possible
     */
    select_language: function(a_lang,a_direct) {
        // enable alpheios if it isn't already
        var bro = this.getCurrentBrowser();
        if ( ! this.is_enabled(bro))
        {   
            return this.alph_inlineToggle(bro,a_lang);
        }
        if (! Alph.Languages.has_lang(a_lang))
        {
            //TODO handle error more fully?
            alert("Alpheios language " + a_lang + "is not available");
        }
        else
        {
            var old_lang_tool = this.getLanguageTool();
            
            // set the new language but hold onto a copy of the old language
            // tool for use in clearing out the browser
            this.get_state_obj(bro).set_var("current_language",a_lang);
            
            var lang_tool = this.getLanguageTool();
            
            // remove the popoup and stylesheets 
            // from the prior language, if any
            Alph.xlate.removePopup(bro,old_lang_tool);
            
            
            // update the popup trigger if necessary
            this.setXlateTrigger(bro,lang_tool.getpopuptrigger());
             
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
        if (this.is_enabled(a_bro))
        {
            lang_tool = 
                Alph.Languages.get_lang_tool(this.get_state_obj(a_bro).get_var("current_language"));
        }
        return lang_tool;
    },
    
    /**
     * Set the hints to be displayed on the FF toolbar
     */
    set_tb_hints: function()
    {
        var bro = this.getCurrentBrowser();
        // if the tools are enabled, add the trigger hint to the ff toolbar, otherwise remove it
        if (this.is_enabled(bro))
        {
            var mode = this.get_state_obj(bro).get_var("level");
            var hint_prop = 'alph-trigger-hint-'+this.getXlateTrigger(bro) + '-'+mode;
            var lang_tool = this.getLanguageTool(bro);
            var lang = lang_tool.get_language_string();
            var hint = lang_tool.get_string_or_default(hint_prop,[lang]);
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
        // first, remove the old one, if any
        var old_trigger = this.removeXlateTrigger(a_bro);
        
        a_bro.addEventListener(a_trigger, this.doXlateText, false);
        this.get_state_obj(a_bro).set_var("xlate_trigger",a_trigger);
        this.set_tb_hints();
        this.broadcast_ui_event(Alph.main.events.UPDATE_XLATE_TRIGGER,
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
        return this.get_state_obj(a_bro).get_var("xlate_trigger");
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
     * Update the Languages menu items
     */
    update_main_menu_languages: function()
    {
        // just return if we've already done this once
        if (this.mm_languages_updated)
        {
            return;
        }
        var main_menu = Alph.$("#alpheios-lang-popup-mm").get(0);
        // iterate through the toolbar menu items
        // adding them to the main menu
        
        Alph.$("#alpheios-lang-popup-tm menuitem").each(
            function(i)
            {
                var lang = this.value;
                Alph.util.log("Adding menuitem for: " + lang);
                Alph.$(this).clone(true).appendTo(main_menu);
            }
        );
        this.mm_languages_updated = true; 
    },
    
    /**
     * Lookup a user-provided word
     * @param {Event} a_event the event that triggered th elookup
     */
    do_tb_lookup: function(a_event)
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
        if (! this.is_enabled(bro))
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
        Alph.main.panels['alph-morph-panel'].open();
        var doc_array = [];
        Alph.$(".alph-lexicon-output").each(
            function() 
            {
                var doc = Alph.$(this).get(0).contentDocument
                lang_tool.addStyleSheet(doc);
                Alph.$("#alph-window",doc).css("display","block");
                doc_array.push(doc);
            }
        );
        
        lang_tool.lexiconLookup(
            target,
            function(data)
            {
                Alph.xlate.showTranslation(data,target,doc_array,lang_tool);
            },
            function(a_msg)
            {   
                Alph.xlate.translationError(a_msg,doc_array,lang_tool);
            }
        );
    },
    
    /**
     * Toggle the state of a panel
     * @param {Event} a_event the event that triggered the action
     * @param {String} a_panel_id the name of the target panel 
     */
    toggle_panel: function(a_event,a_panel_id)
    {
        var panel = this.panels[a_panel_id];
        if (typeof panel != "undefined")
        {
            return panel.toggle();
        }
    },
    
    /**
     * Update the tools (View) menu for the current browser and language
     * (call by the popupshowing handler for the menu)
     */
    update_tools_menu: function()
    {
        var lang_tool = Alph.main.getLanguageTool();
        var bro = this.getCurrentBrowser();
        
        // check the language-specific feature notifiers
        Alph.$("broadcaster.alpheios-language-notifier").each(
            function()
            {
                var id = Alph.$(this).attr("id");
                var disabled = true;
                // enable only if Alpheios is enabled
                // and the language supports the feature
                if (Alph.main.is_enabled(bro) && lang_tool.getFeature(id) )
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
        
        var current_language = this.get_state_obj().get_var("current_language");
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
                if (Alph.main.is_enabled(bro))
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
    execute_lang_command: function(a_event)
    {
        
        var lang_tool = Alph.main.getLanguageTool();
        
        var cmd_id = a_event.target.getAttribute("id");
        if (cmd_id == null || typeof cmd_id == 'undefined')
        {
            return;
        }
        Alph.util.log("Executing " + cmd_id);
        if (lang_tool && lang_tool.getCmd(cmd_id))
        {
            lang_tool[(lang_tool.getCmd(cmd_id))](a_event);
        }
        
    },
    
    /** 
     * Broadcast a UI event to the panels
     * @param a_event_type the type of event (per Alph.main.events)
     * @param a_event_data optional data object associated with the event
     * TODO replace this with the Observes JS Module when FF3 is min supported
     */
    broadcast_ui_event: function(a_event,a_event_data)
    {
        var bro = this.getCurrentBrowser();
        // Update the panels
        Alph.$("alpheiosPanel").each(
            function()
            {
                var panel_id = Alph.$(this).attr("id");
                try 
                {
                    var panel_obj = Alph.main.panels[panel_id];
                    Alph.util.log("Observing ui event " + a_event + " for panel " + panel_id); 
                    panel_obj.observe_ui_event(bro,a_event,a_event_data);    
                } 
                catch (e)
                {   
                    Alph.util.log("Error observing ui event for panel " + panel_id + ":" + e);
                }
            }
        );
        // Update the site
        Alph.site.observe_ui_event(bro,a_event,a_event_data);
        
    },
    
    
    /** 
     * Event handler called when a document is loaded into the browser (i.e. response
     * to the DOMContentLoaded event
     * @param {Event} a_event the load event
     */
    first_load: function(a_event)
    {
        var doc = a_event.target;
        var requested_mode = doc.baseURIObject.path.match(/alpheios_mode=([^&;#]+)/);
        if (requested_mode &&
            Alph.$("meta[name=_alpheios-doc-id]",doc).length == 0)
        {
                
            var a_mode = requested_mode[1]
            var id = Alph.XFRState.new_state_request('reqlevel',a_mode,true);
            Alph.$("head",doc)
                .append('<meta ' +
                    'name="_alpheios-doc-id" ' +
                    'content="' +
                    id +
                    '"></meta>');
        }
        Alph.main.insert_metadata(a_event);
    },
    
    /**
     * Insert metadata elements identifying the Alpheios extensions into the browser
     * content document
     * @param {Event} a_event the load event
     */
    insert_metadata: function(a_event)
    {
        var doc = a_event.target;
        // add a metadata elements to the page for each installed Alpheios extension
        // so that the page can check for the their presense
        if (Alph.$("meta[name=_alpheios-installed-version]",doc).length == 0)
        {
            var pkg_list = Alph.util.getAlpheiosPackages();
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
    reset_state: function(a_window)
    {        
        
        // NOTE - when a link is opened in a new tab, currentBrowser in 
        // that case is the browser linked from ...
        var bro = Alph.main.getCurrentBrowser();
        
        var ped_site = 
            Alph.site.is_ped_site(bro.contentDocument);
        var auto_lang = null;
        
        var cur_lang = this.get_state_obj(bro).get_var("current_language");
        if (ped_site)
        {     
            // retrieve the language from the html element of the content document
            auto_lang = bro.contentDocument.documentElement.getAttribute("xml:lang")
                            || bro.contentDocument.documentElement.getAttribute("lang");
            
            // for backwards compatibility, 
            // if the document itself doesn't specify the language, then check the 
            // translation url div
            if (auto_lang == null)
            {
                auto_lang = Alph.$("#alph-trans-url",bro.contentDocument).attr("src_lang");
            }
        }
        else
        {
            auto_lang=Alph.site.is_basic_site(Alph.util.IO_SVC.newURI(bro.contentDocument.location,null,null));
        }   
        
        auto_lang = Alph.Languages.map_language(auto_lang);
        
        if (auto_lang && Alph.Languages.has_lang(auto_lang)) 
        {
            
            // if we support this language and site automatically setup the extension for it
            // if Alpheios is not enabled, auto-enable it
            if (! this.is_enabled(bro))
            {
                Alph.util.log("Auto-enabling alpheios for " + auto_lang);
                this.autoToggle(bro,auto_lang);
                return;
            }
            // if alpheios is enabled set to the right language for the prototype
            else if (this.is_enabled(bro) && cur_lang != auto_lang)
            {
                Alph.util.log("Auto-switching alpheios to " + auto_lang);
                Alph.main.select_language(auto_lang,true);
                // select_language calls onTabSelect which will re-call reset_state
                return;  
            }
            // enable the ff toolbar 
            // TODO - we may only want to enable this for basic sites
            this.toggle_toolbar(true);
            // if we're not on an enhanced site
            // and make sure the mode is set to READER
            if (! ped_site)
            {
                this.set_mode(bro,Alph.main.levels.READER);
            }
            // if we're on an enhanced site,  
            // reset the mode to whatever the default is
            else
            {   
                this.set_mode(bro);
            }
       
        }
        // if we're not on a supported site but were and the system automatically enabled 
        // the extension, then disable it again
        else if (this.is_enabled(bro) && ! this.toggled_by_user(bro))
        {
            this.autoToggle(bro);
            // reset the toolbar status
            this.toggle_toolbar();
            // show the leaving site popup, unless we're returning to the alpheios site
            try
            {
                var new_host = bro.contentDocument.location.host;
                if (! new_host.match(/alpheios\.(net|org)/))
                {
                    this.show_leaving_site();
                }
            }
            catch(a_e){}
            return;
        }
        else if (this.is_enabled(bro))
        {
            // if we're on a basic site, and the extension is enabled,
            // the set the mode to READER
            this.set_mode(bro,Alph.main.levels.READER);
        }
        else
        {
            //reset the toolbar status
            this.toggle_toolbar();
        }
        
        if (ped_site)
        {
            // these functions should only be called after Alpheios has been auto-toggled
            // on because otherwise they get done twice via the send call to reset_state
            // from Alph.main.onTabSelect

            // inject the pedagogical site with the alpheios-specific elements
            Alph.site.setup_page(bro.contentDocument,
                Alph.Translation.INTERLINEAR_TARGET_SRC);
        }
        
        // notify the auto-enable observers
        Alph.$("broadcaster.alpheios-auto-enable-notifier").each(
            function()
            {
                if (auto_lang && Alph.main.is_enabled(bro))
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
            Alph.site.update_site_tool_status(bro.contentDocument);
            // if we're in quiz mode, and the popup is still showing for a
            // previous selection, clear it because the alignment click handler
            // needs to be reset
            if (Alph.interactive.enabled() && Alph.xlate.popupVisible(bro))
            {
                Alph.xlate.removePopup(bro);
            }
        }    
            
          
        // Update the panels
        Alph.$("alpheiosPanel").each(
            function()
            {
                var panel_id = Alph.$(this).attr("id");
                try 
                {
                    var panel_obj = Alph.main.panels[panel_id];
                    panel_obj.reset_state(bro);    
                } 
                catch (e)
                {   
                    Alph.util.log("Unable to reset state for panel " + panel_id + ":" + e);
                }
            }
        );
        
    },
    
    /**
     * Initialization method called by the constructor for the alpheiosPanel binding. 
     * Aggregates Alph.Panel objects for each panel element in the Alph.main.panels
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
            this.panels[panel_id] = panel_obj;    
        } 
        catch(exception)
        {
            Alph.util.log("Error instantiating " +
                panel_id + " with " + panel_class + ":" + exception);
        }
        
    },
    
    /**
     * Get the Alpheios state object for the selected browser
     * @param {Browser} a_bro the browser object
     * @return {Alph.State} the Alpheios State object
     */
    get_state_obj: function(a_bro)
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
    is_enabled: function(a_bro)
    {
        return this.get_state_obj(a_bro).get_var("enabled");
    },
    
    /**
     * Shortcut method to see if the Alpheios extension status
     * for the selected browser was last toggled by an overt User action 
     * (Not yet in use)
     * @param {Browser} a_bro the Browser object
     * @return true if user initiated otherwise false
     * @type boolean 
     */
    toggled_by_user: function(a_bro)
    {
        var by_user = 
            this.get_state_obj(a_bro).get_var("toggled_by") == Alph.State.USER_ACTION;
        return by_user;
         
    },
    
    /**
     * toggle the ff toolbar
     * @param {Boolean} a_on true if toolbar should be turned on, false if not 
     */
    toggle_toolbar: function(a_on)
    {
        if (typeof a_on == "undefined")
        {
            a_on = false;
            try {
                a_on = Alph.util.getPref("enable.toolbar");
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
                Alph.main.enable_tb_lookup();
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
    enable_tb_lookup: function()
    {
        if (Alph.util.getPref("toolbar.lookup"))
        {
            Alph.$("#alpheios-lookup-enabled").attr("hidden",false);
        }
        else
        {
            Alph.$("#alpheios-lookup-enabled").attr("hidden",true);
        }
    },
    
    /**
     * open the leaving site dialog
     */
    show_leaving_site: function()
    {
        window.openDialog(
            'chrome://alpheios/content/site/leaving-site.xul', 
            'alpheios-leaving-dialog', 
            'titlebar=yes,toolbar=yes,resizable=yes,scrollbars=yes,chrome=yes,centerscreen=yes,dialog=yes,dependent=yes'
        );   
    },
    /**
     * open the about dialog
     */
    show_about: function()
    {
        window.openDialog(
            'chrome://alpheios/content/about.xul', 
            'alpheios-about-dialog', 
            'titlebar=yes,toolbar=yes,resizable=yes,scrollbars=yes,chrome=yes,centerscreen=yes,dialog=yes,dependent=yes'
        );
    },
    
    /**
     * open the help window
     */
    show_help: function()
    {
        window.open(
            'http://dev.alpheios.net:8008/site/content/alpheios-user-guide',
            'alpheios-help'
        );  
    },
    
    /**
     * open the options dialog
     */
    show_options: function()
    {
        window.openDialog(
            'chrome://alpheios/content/alpheios-prefs.xul', 
            'alpheios-options-dialog', 
            'titlebar=yes,toolbar=yes,resizable=yes,scrollbars=yes,chrome=yes,centerscreen=yes,dialog=yes,dependent=yes'
        );
    },

    /**
     * set the mode variable for the browser. 
     * @param a_bro the subject browser
     * @param {String} a_mode the new mode (optional - if not supplied will
     *                        be retrieved from the document metadata
     */
    set_mode: function(a_bro,a_mode)
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
                var uri_mode = Alph.XFRState.get_state_value(doc_id,'reqlevel');
                if (uri_mode == requested_mode[1])
                {
                    a_mode = requested_mode[1];
                }
            }
            else if (requested_mode)
            {
                Alph.XFRState.get_state_value(doc_id,'reqlevel')
            }
        }
        if (typeof a_mode != "undefined")
        {
            this.get_state_obj(a_bro).set_var("level",a_mode);
            
            // update the trigger - hardcoded to dblclick for quiz mode
            var trigger = a_mode == 
                this.levels.LEARNER ? 'dblclick' 
                                    : this.getLanguageTool(a_bro).getpopuptrigger();
            this.setXlateTrigger(a_bro,trigger);
            // clear out any popup
            Alph.xlate.removePopup(a_bro);    
        }
        var new_mode = this.get_state_obj(a_bro).get_var("level");
        
        // update the site toolbar
        Alph.site.set_current_mode(a_bro.contentDocument,new_mode);
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
    get_mode: function(a_bro)
    {
     
        if (! a_bro)
        {
            a_bro = this.getCurrentBrowser();
        }
        return this.get_state_obj(a_bro).get_var("level");
    },
    
    /**
     * Implementation of nsIWebProgressListener which listens for 
     * changes to the url in the location bar, and if the the url changes
     * calls reset state upon the subsequent page load
     * @see https://developer.mozilla.org/en/Code_snippets/Progress_Listeners  
     */
    loc_listener:
    {
        // keep track of the last URL loaded in this window
        last_url_base : '',
        // flag to indicate whether or not we should handle the load state change
        handle_load: false,
        // flag to indicate if it's a refresh or reload of the last page
        handle_refresh: false,
        
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
           // otherwise we end up calling reset_state much too often because
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
                if (this.handle_refresh)
                {
                    this.handle_refresh = false;
                    Alph.util.log("Handling refresh for " + this.last_url_base);
                    var bro = Alph.main.getCurrentBrowser();
                    var doc = bro.contentDocument;
                    Alph.main.insert_metadata({target: doc});
                    if (Alph.site.is_ped_site(doc))
                    {
                        // update the site functionality and toolbar
                        Alph.site.setup_page(doc,Alph.Translation.INTERLINEAR_TARGET_SRC);
                        var mode = Alph.main.get_state_obj(bro).get_var("level");
                        Alph.site.set_current_mode(doc,mode);
                        // check to see if we need to refresh the state of any panels
                        
                        Alph.$("alpheiosPanel").each(
                            function()
                            {
                                var panel_id = Alph.$(this).attr("id");
                                try 
                                {
                                    var panel_obj = Alph.main.panels[panel_id];
                                    panel_obj.handle_refresh(bro);    
                                } 
                                catch (e)
                                {   
                                    Alph.util.log("Unable to refresh state for panel " + panel_id + ":" + e);
                                }
                            }
                        );
                    }
                }
                else if(this.handle_load) 
                {
                    this.handle_load = false;
                    Alph.util.log("Handling load for " + this.last_url_base);
                    Alph.main.reset_state(aWebProgress.DOMWindow);
                }
           }
           return 0;
        },

        onLocationChange: function(aProgress, aRequest, aURI)
        {
           // This fires when the location bar changes; i.e load event is confirmed
           // or when the user switches tabs. If you use myListener for more than one tab/window,
           // use aProgress.DOMWindow to obtain the tab/window which triggered the change.
           // Alph.util.log("caught location change : " + aURI.spec);
           var new_url_base= aURI.spec.match(/([^#|\?]+)[#|\?]?/)[1]
           if (new_url_base == this.last_url_base)
           {
            this.handle_refresh = true;
           }
           else
           {
            this.handle_load = true;
           }
           this.last_url_base = new_url_base;          
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
    show_update_help: function()
    {
        var firstrun = [];
        var alph_pkgs = Alph.util.getAlpheiosPackages();
        alph_pkgs.forEach(
            function(a_pkg)
            {
                try
                {
                    var last_install_ver = Alph.util.getPref('firstrun.'+ a_pkg.id);
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
            Alph.util.open_alpheios_link('release-notes');
            firstrun.forEach(
                function(a_pkg)
                {
                    Alph.util.setPref('firstrun.'+a_pkg.id,a_pkg.version);
                }
            );
        }

    },
    
};

Alph.main.init();


