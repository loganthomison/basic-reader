/**
 * @fileoverview This file contains the definition of the Alph namespace
 * and the Alph.main class. 
 * The Alph.main class is the main controller for 
 * the Alpheios functionality.
 * @version $Id$
 * 
 * Copyright 2008 Cantus Foundation
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

// initialize the Alph namespace
if (typeof Alph == "undefined")
{
    Alph = {};
}

/**
 * @singleton
 */
Alph.main =
{
    
    /** 
     * flag for main menu update status
     */
    mm_languages_updated: false,
    
    /**
     * flag for the status of the ctrl key
     * @private
     * @type Boolean 
     */
    ctrlDown: false,

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
        
        window.addEventListener("unload", function(e) { Alph.main.onUnLoad(e); },false);
        
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
        Alph.util.shutdown();    
    },

    /**
     * TabSelect event handler for the window. 
     */
    onTabSelect: function()
    {
        Alph.main.toggleMenuText();
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
     * Toggle the enabled/disabled status of the extension.
     */
    alph_inlineToggle: function()
    {
        // Thunderbird has no tabs, so we need to use the window instead of
        // the current browser container
        var bro = this.getCurrentBrowser();
        if (bro.alpheios)
        {
                this.inlineDisable(bro);
        }
        else 
        {
            this.inlineEnable(bro);
        }

        this.onTabSelect();
    },

    /**
     * Enables the extension for a browser window
     * @param a_bro the current browser 
     * @param {String} a_lang the language to set as current 
     *                 (optional, if not specified a default
     *                  will be used)
     */
    inlineEnable: function(a_bro,a_lang)
    {        
        this.mouseButtons = 0;

        a_bro.addEventListener("keydown", this.onKeyDown, true);
        a_bro.addEventListener("keyup", this.onKeyUp, true);
        a_bro.alpheios = { windows: {}, };
        if (! this.set_languages())
        {
            var err_msg = 
                document.getElementById("alpheios-strings")
                        .getString("alph-error-nolanguages");
            alert(err_msg)
            this.inlineDisable(a_bro)
            return;
        }
        if (a_lang == null)
        {
            // TODO - pick up language from source text
            a_lang = this.defaultLanguage;
        }
        this.select_language(a_lang);
        
        this.setXlateTrigger(a_bro,this.getLanguageTool().getpopuptrigger());
        
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
        if (! a_bro.alpheios)
        {
            return;
        }
        this.removeXlateTrigger(a_bro);
        a_bro.removeEventListener("keydown", this.onKeyDown, true);
        a_bro.removeEventListener("keyup", this.onKeyUp, true);

        Alph.xlate.removePopup(a_bro);

        this.cleanup(a_bro);
        
        delete a_bro.alpheios;
        // TODO - clear Alph.Languages?
        
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
        for (var lang in Alph.Languages)
        {
            if (Alph.Languages[lang].getusemhttpd())
            {
                return true;
            }
        }
        
        // if we get here, none of our languages uses the local mhttpd
        return false;
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
        $.ajax(
            {
                type: "GET",
                async: true,
                dataType: "text",
                cache: false,
                url: "http://localhost:" + Alph.main.getLocalDaemonPort() + "/mypid",
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
        var detach_url =  "http://localhost:" + Alph.main.getLocalDaemonPort() + "/detach";        
        
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
        
        $.ajax(
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

        // disable the mousemove handler if the ctrl key
        // is currently pressed
        // (i.e. to enable mouse movement into the popup to click a link)
        if ( Alph.main.getXlateTrigger() == 'mousemove' && Alph.main.ctrlDown) {
            return true;
        }

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
            Alph.main.getLanguageTool().shiftHandler(a_event);
        }
        else if (a_event.keyCode == 17) {
            Alph.main.ctrlDown = true;
        }
        // return true to allow event propogation if needed
        return true;
    },

    /**
     * Handler for the KeyUp event
     * @param {Event} a_event the keyup event
     */
    onKeyUp: function(a_event)
    {
        // reset the status of the ctrlDown flag
        // to reenable the mousemove handler
        if (a_event.keyCode == 17)
        {
            Alph.main.ctrlDown = false;
        }
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
        if (typeof this.getCurrentBrowser().alpheios == "undefined")
        {
            cmenu_text =
                $("#alpheios-strings").get(0)
                    .getString("alph-inline-enable-cm");
            tmenu_text =
                $("#alpheios-strings").get(0)
                    .getString("alph-inline-enable-tm");
            
            // TODO - we ought to preserve the user's last
            //        language selection rather than resetting  
            menu_lang = this.defaultLanguage;
        }
        else
        {
            cmenu_text =
                $("#alpheios-strings").get(0)
                    .getString("alph-inline-disable-cm");
            tmenu_text =
                $("#alpheios-strings").get(0)
                    .getString("alph-inline-disable-tm");

            menu_lang = this.getCurrentBrowser().alpheios.current_language;
        }
        $("#alpheios-toggle-cm").attr("label",cmenu_text);
        $("#alpheios-toggle-tm").attr("label",tmenu_text);
        $("#alpheios-toggle-mm").attr("label",tmenu_text);
        
        // uncheck the previously checked language
        $("#alpheios-lang-popup-tm menuitem[checked='true']")
            .attr("checked","false");
        $("#alpheios-lang-popup-cm menuitem[checked='true']")
            .attr("checked","false");
        $("#alpheios-lang-popup-mm menuitem[checked='true']")
            .attr("checked","false");
        // check the current language
        $("#alpheios-lang-popup-tm menuitem[value='"+menu_lang+"']")
            .attr("checked","true");
        $("#alpheios-lang-popup-cm menuitem[value='"+menu_lang+"']")
            .attr("checked","true");
        $("#alpheios-lang-popup-mm menuitem[value='"+menu_lang+"']")
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
        
        var attach_url = "http://localhost:" + Alph.main.getLocalDaemonPort() + "/attach";
        
        // add a random number to the url to prevent the browser from
        // caching multiple simultaneous requests -- jquery appends a _=<timestamp>
        // parameter when cache is set to false, but this doesn't prevent
        // the caching when multiple requests come in at exactly the same time
        // (unlikley on an attach, but do anyway just to be sure)
        var rand_num = Math.floor(Math.random()* 100000000)
        attach_url = attach_url + "?_r=" + rand_num;
        
        $.ajax(
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
            alert($("#alpheios-strings").get(0)
                .getString("alph-error-mhttpd-notfound"));
            return;
                    
        }
        
        
        // iterate through the supported languages concatonating their mhttpd.conf files
        var mhttpd_conf_lines = [];
        
        for (var lang in Alph.Languages)
        {
            if (Alph.Languages[lang].getusemhttpd())
            {
                var chromepkg = 
                    Alph.Languages[lang].getchromepkg();
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
        $("#alpheios-lang-popup-tm menuitem").each(
            function(i)
            {
                //var lang = $(this).attr("value");
                var lang = this.value;
                Alph.util.log("Language menuitem: " + lang);
                if (lang != null && lang != '' )
                {
                    if (typeof Alph.LanguageToolSet[lang] == "undefined")
                    {
                        // if a derived class for this language isn't defined,
                        //  instantiate an instance of the base class
                        Alph.Languages[lang] = new Alph.LanguageTool(lang)
                    }
                    else if (Alph.LanguageToolSet[lang].implementsAlphLanguageTool)
                    {
                        // if we have a derived class for this language,
                        // instantiate an instance of the derived class
                        Alph.Languages[lang] = new Alph.LanguageToolSet[lang](lang);
                    }
                    language_count++;
                }
                else
                {
                    Alph.util.log("Language value undefined for " + this.label);
                    $(this).attr("hidden","true");
                }
            }
         );
         
         // if we have don't have at least one language, show the 'none' item
         // in the menu and return false to disable the extension
         if (language_count==0)
         {
            $("#alpheios-tm-lang-none").attr("hidden","false");
            $("#alpheios-cm-lang-none").attr("hidden","false"); 
         }
         else
         { 
            // set the default language from preferences if possible
            var pref_lang = Alph.util.getPref("default_language");
            if (pref_lang != null && pref_lang != '' &&
                typeof Alph.Languages[pref_lang] != "undefined")
            {
                Alph.main.defaultLanguage = pref_lang;
            }
            // no preferences so just use the first language in the 
            // menu as the default
            else
            {
                             
             Alph.main.defaultLanguage = 
                $("#alpheios-lang-popup-tm menuitem:visible").get(0).value;
            }
            // successfully setup the Alph.Languages object, so return true 
            languages_set = true;
         }
         return languages_set;
    },
    
    /**
     * Set the current language in use by the browser window.
     * If the extension isn't already enabled, redirects to 
     * {@link Alph.main#inlineEnable} to enable it for the selected
     * language.
     * @private
     * @param {String} a_lang the selected language
     * TODO eventually language should be automatically determined
     * from the language of the source text if possible
     */
    select_language: function(a_lang) {
        // enable alpheios if it isn't already
        var bro = this.getCurrentBrowser();
        if (! bro.alpheios)
        {   
            return this.inlineEnable(bro,a_lang);
        }
        if (typeof Alph.Languages[a_lang] == "undefined")
        {
            //TODO handle error more fully?
            alert("Alpheios language " + a_lang + "is not available");
        }
        else
        {
            // remove the popoup and stylesheets 
            // from the prior language, if any
            Alph.xlate.removePopup(bro);
 
            bro.alpheios.current_language = a_lang;
            
            // update the popup trigger if necessary
            this.setXlateTrigger(bro,this.getLanguageTool().getpopuptrigger());

            // call onTabSelect to update the menu to show
            // which language is current
            this.onTabSelect();
            
        
        }
    },
    
    /**
     * Get the Alph.LanguageTool instance for the current language.
     * @return the Alph.LanguageTool instance for the current language
     *         or undefined if the language isn't set or the extension 
     *         isn't enabled
     * @type Alph.LanguageTool
     */
    getLanguageTool: function()
    {
        var bro = this.getCurrentBrowser();
        var lang_tool;
        if (bro.alpheios)
        {
            lang_tool = Alph.Languages[bro.alpheios.current_language];
        }
        return lang_tool;
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
        this.removeXlateTrigger(a_bro);
        
        a_bro.addEventListener(a_trigger, this.doXlateText, false);
        a_bro.alpheios.xlate_trigger = a_trigger;

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
        if (a_bro.alpheios)
        {
            return a_bro.alpheios.xlate_trigger;
        }
    },
    
    /**
     * Remove the popup trigger event listener from the browser
     * @private
     * @param a_bro the subject browser  
     */
    removeXlateTrigger: function(a_bro)
    {
        var trigger = this.getXlateTrigger(a_bro);
        if (typeof trigger != "undefined")
        {
           a_bro.removeEventListener(trigger,this.doXlateText,false);
        }
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
        var main_menu = $("#alpheios-lang-popup-mm").get(0);
        // iterate through the toolbar menu items
        // adding them to the main menu
        
        $("#alpheios-lang-popup-tm menuitem").each(
            function(i)
            {
                var lang = this.value;
                Alph.util.log("Adding menuitem for: " + lang);
                $(this).clone(true).appendTo(main_menu);
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
        if (a_event.keyCode != 13)
        {
            return;
        }
        var word = ($("#alpheios-lookup-text").get(0)).value;
        
        if (word.length == 0)
        {
            return;
        }
        
        // make sure Alpheios is enabled
        var bro = this.getCurrentBrowser();
        if (! bro.alpheios)
        {
            this.inlineEnable(bro);
            this.onTabSelect();
        }
     
        var target= new Alph.SourceSelection();
        target.setWord(word);
        target.setWordStart(0);
        target.setWordEnd(word.length -1);
        target.setContext(word);
        target.setContextPos(0);
        
        var topdoc = $("#alph-morph-body").get(0).contentDocument;
        this.getLanguageTool().lexiconLookup(
            target,
            function(data)
            {
                $("#alph-window",topdoc).css("display","block");
                Alph.xlate.showTranslation(data,target,topdoc);
            },
            function(a_msg)
            {   
                Alph.xlate.translationError(a_msg,topdoc);
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
        if (a_event.explicitOriginalTarget.hasAttribute("checked")== true)
        {
            $("#"+a_panel_id).attr("collapsed",false);
            $("#"+a_panel_id+"-splitter").attr("collapsed",false);
             // enable Alpheios if it isn't already so that the panel is useful
            var bro = this.getCurrentBrowser();
            if (! bro.alpheios)
            {
                this.inlineEnable(bro);
                this.onTabSelect();
            }
            // update the status of any commands used  by the panel
            this.update_tools_menu();
        }
        else
        {
            $("#"+a_panel_id).attr("collapsed",true);
            $("#"+a_panel_id+"-splitter").attr("collapsed",true);
           
        }
    },
    
    /**
     * Update the tools menu for the current language
     */
    update_tools_menu: function()
    {
        var lang_tool = Alph.main.getLanguageTool();
        var bro = this.getCurrentBrowser();
        $("command.alpheios-language-specific-cmd").each(
            function()
            {
                var cmd_id = $(this).attr("id");
                // disable the tools if Alpheios isn't enabled
                if (! bro.alpheios)
                {
                    $("#"+cmd_id).attr("disabled",true);
                }
                else
                {
                    if (lang_tool.getCmd(cmd_id))
                    {
                        $("#"+cmd_id).attr("disabled",false);
                    }
                    else
                    {
                        $("#"+cmd_id).attr("disabled",true);
                    }
                }
            }
        );             
    },
    
    /**
     * Execute a tools menu command - delegate to the current
     * language tool. 
     * @param {Event} a_event the command event
     */
    execute_tools_command: function(a_event)
    {
        
        var lang_tool = Alph.main.getLanguageTool();
        var cmd_id = a_event.target.getAttribute("id");
        Alph.util.log("Executing " + cmd_id);
        if (lang_tool && lang_tool.getCmd(cmd_id))
        {
            lang_tool[(lang_tool.getCmd(cmd_id))]();
        }
        
    }
};

Alph.main.init();


