/**
 * @fileoverview This file contains the Alph.Translation class derivation of the 
 * Alph.Panel. Representation of the translation panel.
 * 
 * @version $Id: alpheios-trans.js 798 2008-06-20 20:42:04Z BridgetAlmas $
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
 * @class The Alph.Translation class is the representation of the translation
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Translation = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};
    
/**
 * @ignore
 */
Alph.Translation.prototype = new Alph.Panel();

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#reset_to_default}
 * @param {Browser} a_bro the current browser
 * @return the new panel status
 * @type int
 */
Alph.Translation.prototype.reset_to_default = function(a_bro)
{
    var notifier = Alph.$("#" + this.notifier);
    if (Alph.$("#" + this.notifier).attr("disabled") == "false" )
    {
        return this.show();
    }
    else
    {
        // flag the panel as being auto-hidden vs. user-hidden
        return this.hide(true);
    }
};

/**
 * Translation panel specific implementation of 
 * {@link Alph.Panel#show}
 * @return the new panel status
 * @type int
 */

Alph.Translation.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    //TODO - eventually should be able to pick the translation url
    // up from the user's preferences for the basic reader
    var trans_url = Alph.$("#alph-trans-url",bro.contentDocument);
    if (trans_url.length >0)
    {
        Alph.util.log("loading translation from " + Alph.$(trans_url).attr("url"));
        var browser_box = this.panel_elem;
        var trans_doc = 
            Alph.$("browser",browser_box).get(0).contentDocument;
        Alph.$.ajax(
            {
                type: "GET",
                url: Alph.$(trans_url).attr("url"),
                dataType: 'html', 
                error: function(req,textStatus,errorThrown)
                {
                    Alph.$("body",trans_doc)
                        .html(textStatus || errorThrown);
                },
                success: function(data, textStatus) 
                {
                    Alph.$("body",trans_doc).html(data);
                } 
            }   
        );
        return Alph.Panel.STATUS_SHOW;
   }
   else
   {
        return Alph.Panel.STATUS_AUTOHIDE;
   }
};