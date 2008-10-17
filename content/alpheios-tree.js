/**
 * @fileoverview This file contains the Alph.Tree derivation of the Alph.Panel class. 
 * Representation of the Treeology panel.
 * 
 * @version $Id: alpheios-Tree.js 798 2008-06-20 20:42:04Z BridgetAlmas $
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
 * @class The Alph.Tree class is the representation of the Treeology
 * panel.
 * @constructor
 * @param {alpheiosPanel} a_panel DOM object bound to the alpheiosPanel tag
 * @see Alph.Panel
 */
Alph.Tree = function(a_panel)
{
    Alph.Panel.call(this,a_panel);
};
    
/**
 * @ignore
 */
Alph.Tree.prototype = new Alph.Panel();


/**
 * Tree panel specific implementation of 
 * {@link Alph.Panel#show}
 * @return the new panel status
 * @type int
 */
Alph.Tree.prototype.show = function()
{
    var panel_obj = this;
    var bro = Alph.main.getCurrentBrowser();
    var treeDoc;
    if (this.panel_window == null)
    {
        treeDoc = Alph.$("browser",this.panel_elem).get(0).contentDocument;
    }
    else
    {
        treeDoc = this.panel_window.Alph.$("#" + this.panel_id + " browser").get(0).contentDocument;
    }
    
    var sentence  = Alph.$(".alph-proto-sentence",bro.contentDocument);
    if (sentence.length == 0)
    {
        Alph.$("#alph-panel-body-template",treeDoc)
            .addClass("error").text("No dependency tree information available for this text.")    
    }
    else
    {
        Alph.$("#alph-panel-body-template",treeDoc).html("");
        Alph.$(sentence).each(
            function(a_i) 
            {
                // TODO get the real display
                Alph.$("#alph-panel-body-template",treeDoc).append('<div class="alph-tree-display" id="alph-tree-' 
                             + a_i + '">...Coming Soon...this will be the tree display for:</div>');
                var text = "";
                Alph.$(".alph-proto-word",this).each(
                    function() {
                        text = text + Alph.$(this).text() + ' ';
                    }
                );
                Alph.$("#alph-tree-" + a_i,treeDoc).append('<div class="alph-tree-caption">' + text + '</div>');                
            }
        ); 
    }
    return Alph.Panel.STATUS_SHOW;
};

/**
 * Tree panel specific implementation of 
 * {@link Alph.Panel#get_detach_chrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Tree.prototype.get_detach_chrome = function()
{
    return 'chrome://alpheios/content/alpheios-tree-window.xul';   
}

