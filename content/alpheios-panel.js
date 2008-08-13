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
    this.parent_box = Alph.$(this.panel_elem).parent("vbox")[0];
    this.notifier = Alph.$(this.panel_elem).attr("notifier");
    
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
    // default status for all panels is hidden
    return this.hide();
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
    // get the default state for the current browser if:
    // 1. panel hasn't been toggled yet, or
    // 2. panel was previously auto-hidden,

    if ( typeof panel_state.status == "undefined" ||
         panel_state.status == Alph.Panel.STATUS_AUTOHIDE)
    {
        status = this.reset_to_default(a_bro);
    }
    // otherwise if it's enabled, show
    else if (panel_state.status == Alph.Panel.STATUS_SHOW)
    {
        status = this.show();
    }
    // or hide
    else
    {
        status = this.hide();
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
    // uncollapse parent box and parent's sibling splitter
    // update notifier
    if (a_status == Alph.Panel.STATUS_SHOW)
    {
        Alph.$(this.parent_box).attr("collapsed",false);
        Alph.$(parent_splitter).attr("collapsed",false);
        Alph.$(notifier).attr("checked", "true");
    }
    else
    {
        Alph.$(this.parent_box).attr("collapsed",true);
        Alph.$(parent_splitter).attr("collapsed",true);       
        Alph.$(notifier).attr("checked", "false");
    }
    // update the browser state object to reflect the current
    // panel status
    var bro = Alph.main.getCurrentBrowser();
    var panel_state = this.get_browser_state(bro);
    panel_state.status = a_status;
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
  var status = Alph.$(this.parent_box).attr("collapsed");
  if (status == "true")
  {
    this.update_status(this.show());
  }
  else
  { 
    this.update_status(this.hide());
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