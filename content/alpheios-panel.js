/**
 * @fileoverview Defines the Alph.Panel prototype
 * @version $Id: alpheios-panel.js 439 2008-03-27 00:26:41Z BridgetAlmas $
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
 * @class Alph.Panel defines the base class for Panel objects which represent
 * a usage of the alpheiosPanel tag in the interface.  This class is intended
 * as an abstract class, and is expected to be subclassed for all uses of the 
 * alpheiospanel tag. 
 * 
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 */
Alph.Panel = function(a_panel)
{
    this.panel_elem = a_panel;
    this.panel_id = Alph.$(a_panel).attr("id");
    this.parent_box = Alph.$(this.panel_elem).parent(".alph-panel")[0];
    this.section_parent = Alph.$(this.panel_elem).parents(".alph-panel-section");
    this.notifier = Alph.$(this.panel_elem).attr("notifier");
    this.panel_window = null;
    
};

/**
 * Public static class variable for panel status meaning the panel is shown.
 * @public
 * @type int
 */ 
Alph.Panel.STATUS_SHOW = 1;

/**
 * Public static class variable for panel status meaning the panel was hidden by 
 * the user.
 * @public
 * @type int
 */ 
Alph.Panel.STATUS_HIDE = 2;

/**
 * Public static class variable for panel status meaning the panel was automatically
 * hidden by the application.
 * @public
 * @type int
 */ 
Alph.Panel.STATUS_AUTOHIDE = 3;

/**
 * Intialization method which can be used for panel-specific initialization 
 * code.
 * @private
 */
Alph.Panel.prototype.init = function()
{
    // override in panel specific implementations
};

/**
 * Resets the panel state (open/closed) to the correct default
 * for the panel.
 * @return the new panel status (should be one of 
 *              Alph.Panel.STATUS_SHOW, Alph.Panel.STATUS_HIDE 
 *              Alph.Panel.STATUS_AUTOHIDE)
 * @type int
 */
Alph.Panel.prototype.reset_to_default = function()
{
    // if a preference is stored, use it
    var status_pref = this.get_status_pref_setting();
    var status = Alph.util.getPrefOrDefault(status_pref,
        Alph.main.get_state_obj().get_var("current_language"));
        
    if (typeof status != "undefined" && status == Alph.Panel.STATUS_SHOW)
    {
        return this.show();
    }
    else 
    {
        // default status for all panels is hidden
        return this.hide();
    }
}

/**
 * Resets the state of the panel to the last state set for the 
 * current browser (or to default if this is the first time called
 * for the browser session).
 * @param {Browser} a_bro browser object
 * @return the new panel status (should be one of 
 *              Alph.Panel.STATUS_SHOW, Alph.Panel.STATUS_HIDE 
 *              Alph.Panel.STATUS_AUTOHIDE)
 * @type int
 */
Alph.Panel.prototype.reset_state = function(a_bro)
{

    var panel_state = this.get_browser_state(a_bro);

    // update the panel contents for the current browser
    this.reset_contents(panel_state);
         
    var status;
    // just auto hide everything if alpheios is disabled
    if ( ! Alph.main.is_enabled(a_bro))
    {
        status = this.hide(true);
    }
    else
    {
        status = this.reset_to_default(a_bro);
    }
    this.update_status(status);
};

/**
 * Updates the interface to a new panel status and 
 * stores the new status to the panel state object
 * @private
 * @param {int} a_status the new panel status (should be one of 
 *              Alph.Panel.STATUS_SHOW, Alph.Panel.STATUS_HIDE 
 *              Alph.Panel.STATUS_AUTOHIDE)
 */
Alph.Panel.prototype.update_status = function(a_status)
{
 
    var parent_splitter = this.parent_box.previousSibling; 
    var notifier = Alph.$("#" + this.notifier);
    
    // update the browser state object to reflect the new
    // panel status
    // NOTE - do this before changing the state of the panels
    // so that any event handlers which need to know the new
    // state get the correct value from the state object
    var bro = Alph.main.getCurrentBrowser();
    var panel_state = this.get_browser_state(bro);
    panel_state.status = a_status;

    // uncollapse parent box and parent's sibling splitter
    // update notifier
    // but not if we're just detaching the panel (in which case
    // panel_window will be non null)
    if (a_status == Alph.Panel.STATUS_SHOW && this.panel_window == null)
    {
        Alph.$(this.parent_box).attr("collapsed",false);
        Alph.$(parent_splitter).attr("collapsed",false);
        Alph.$(notifier).attr("checked", "true");
        // make sure any section parents are also expanded
        Alph.$(this.section_parent).each(
            function() {
                Alph.$(this).attr("collapsed",false);
                var splitter = Alph.$(this).prev("splitter");
                if (splitter.length > 0)
                {
                    Alph.$(splitter).attr("collapsed",false);
                }

            }
        ); 
    
    }
    else
    {
        Alph.$(this.parent_box).attr("collapsed",true);
        Alph.$(parent_splitter).attr("collapsed",true);
        // collapse the containing parent panel sections only 
        // if all the panels in it are now collapsed

        Alph.$(this.section_parent).each(
            function() {
                var still_open = 0;   
                Alph.$(".alph-panel",this).each(
                    function() {
                        if (this.getAttribute("collapsed") == 'false')
                        {
                            still_open = still_open + 1;
                            
                        }
                    }
                ); 
                if (still_open == 0)
                {
                    Alph.$(this).attr("collapsed",true);
                    var splitter = Alph.$(this).prev("splitter");
                    if (splitter.length > 0)
                    {
                        Alph.$(splitter).attr("collapsed",true);
                    }
                }
            }
        ); 
             
        
        if (a_status == Alph.Panel.STATUS_HIDE)
        {
            // update the state of the checkbox only if we're hiding the panel
            // rather than detaching it (in which case we have STATUS_SHOW)
            Alph.$(notifier).attr("checked", "false");
            // if the panel is detached, close it 
            if (this.panel_window != null && ! this.panel_window.closed )
            {
                this.panel_window.close();
                this.panel_window = null;
                // TODO - need to figure out how we want to handle detached panels
                // across multiple tabs
            }
        }
    }
    
    // if we're responding to a user request, store the new
    // status as the default status for the panel
    if (a_status != Alph.Panel.STATUS_AUTOHIDE)
    {
        // only store language-specific status for now 
        // TODO support user override of global preferences ?
        // TODO support per url preferences ?
        var lang = Alph.main.get_state_obj(bro).get_var("current_language");
        if (lang != "")
        {
            Alph.util.setPref(this.get_status_pref_setting(),a_status,lang)
        }
    }
    
};

/**
 * Show (open) the panel.
 * @return {@link Alph.Panel#STATUS_SHOW} if the conditions were met
 * to show the panel. Otherwise {@link Alph.Panel#STATUS_AUTOHIDE}
 * @type int  
 */
Alph.Panel.prototype.show = function()
{   
    // default behavior is just to show the panel.
    // Override to add additional checks and 
    // panel initialization code.
    return Alph.Panel.STATUS_SHOW;
        
};

/**
 * Detach the panel (in the 'SHOW' state only)
 */
Alph.Panel.prototype.detach = function()
{   
    var chrome_url = this.get_detach_chrome();
    if (chrome_url == null)
    {
        alert("Detach not yet supported for this panel.");
        return;
    }
    try {
        this.panel_window = 
            Alph.xlate.openSecondaryWindow(
                this.panel_id,
                chrome_url
            );
    } catch(a_e) 
    {
        Alph.util.log("Error detaching panel: " + a_e);
    }
    this.update_status(Alph.Panel.STATUS_SHOW);
};


/**
 * Restore the panel to the current inline state
 */
Alph.Panel.prototype.restore = function()
{
    // Close the window if it's not already
    if (this.panel_window != null)
    {
        if (! this.panel_window.closed) 
        { 
            this.panel_window.close();
        }
        this.panel_window = null;          
    }
    
    var panel_state = this.get_browser_state(Alph.main.getCurrentBrowser());
    this.update_status(panel_state.status);
}

/**
 * Hide (close) the panel.
 * @param {Boolean} a_autoflag flag to indicate that the panel is being
 *                  hidden by the application rather than the user. If not
 *                  supplied, by the user is assumed.
 * @return {@link.Alph.Panel#AUTO_HIDE} or {@link Alph.Panel#STATUS_HIDE}
 *         (depending upon the value of the a_autoflag param) if the 
 *         conditions were met to show the panel. Otherwise should
 *         return the current panel status.
 */
Alph.Panel.prototype.hide = function(a_autoflag)
{
    // default behavior is just to remove the panel
    // Override to add additional checks and
    // panel cleanup code.
    // a_autoflag can be used to distinguish between
    // when the user hides the panel vs. when the app does
    if (a_autoflag != null && a_autoflag)
    {
        return Alph.Panel.STATUS_AUTOHIDE;
    }
    else 
    {
        return Alph.Panel.STATUS_HIDE;    
    }
    
};

/**
 * Toggle the state of the panel (hide if shown, and vice-versa)
 * @return the new panel status
 * @type int
 */
Alph.Panel.prototype.toggle = function()
{
    var bro = Alph.main.getCurrentBrowser();
    var panel_state = this.get_browser_state(bro);
    
    if (panel_state.status == Alph.Panel.STATUS_SHOW)
    {
        this.update_status(this.hide());
    }
    else
    { 
        this.update_status(this.show());
    }
};

/**
 * Method which can be used as a deconstructor for the panel.
 */
Alph.Panel.prototype.cleanup = function()
{
    // TODO - remove all references to this panel in any
    // of the tab browsers
};

/**
 * Method which can be used to reset the contents for the panel
 * when the panel state changes 
 * @param {Object} a_panel_state the current panel state object
 */
Alph.Panel.prototype.reset_contents = function(a_panel_state)
{
    // default does nothing  - override in panel-specific implementations
};

/**
 * Method which can be registered to observe changes to the overall UI
 * in the specific panel.
 * TODO - ultimately this should be redone using an Observer service -
 * may make sense to wait until we can use a JS module for this (with FF3)
 * @param {Browser} a_bro the current browser
 */
Alph.Panel.prototype.observe_ui_event = function(a_bro)
{
    // default does nothing - override in panel-specific implementations
};

/**
 * Get the panel state for the current browser object
 * @param {Browser} a_bro the current browser
 * @return the panel state object
 * @type Object
 */
Alph.Panel.prototype.get_browser_state = function(a_bro)
{
  var panel_state = Alph.main.get_state_obj(a_bro).get_var("panels");
  if (typeof panel_state[this.panel_id] == "undefined")
  {
    panel_state[this.panel_id] = {};
    // initialize the panel state
    this.init(panel_state[this.panel_id]);
  }
  return panel_state[this.panel_id];
};

/**
 * Get the name of the preferences setting for the panel status
 */
Alph.Panel.prototype.get_status_pref_setting = function()
{
    var status_pref = "panels." + this.panel_id + ".";
    // Pedagogical Site preferences are separate from Basic preferences
    // TODO - eventually we may want to support per-url preferences for all sites
    if (Alph.$("#alpheios-pedagogical-status").attr("disabled") == "true")
    {   
        status_pref = status_pref + "basic";
    }
    else
    {
        status_pref = status_pref + "pedagogical";
    }
    return status_pref; 
};

/**
 * Get the chrome url for the detached version of the panel
 * @return chrome url string
 * @type String
 */
Alph.Panel.prototype.get_detach_chrome = function()
{
    // default returns null
    return null;   
}
