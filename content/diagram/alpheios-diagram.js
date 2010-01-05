/**
 * @fileoverview Javascript functions for Diagram window
 * $Id: alpheios-diagram.js 2307 2009-12-03 18:40:30Z BridgetAlmas $
 * 
 * Copyright 2008-2009 Cantus Foundation
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
  * @class Diagram window
  */
Alph.Diagram = {};

/**
 * Static logger for the diagram class
 */
Alph.Diagram.s_logger = Alph.BrowserUtils.getLogger('Alpheios.Diagram');
        
/**
 * load handler for the Diagram window
 */
Alph.Diagram.load = function()
{
    var params = typeof window.arguments != "undefined" ? 
                    window.arguments[0] : {};
    
                        
    var browser = document.getElementById("alpheios-diagram-content");
    browser.setAttribute('src',params.url);
    // resize the window to fit the tree
    browser.addEventListener(
        "DOMContentLoaded",
        function() 
        {
            // listen for the AlpheiosTreeResized event
            // and resize the window accordingly
            // would be better to use SVGResize but it's not yet supported for
            // embedded SVG
            this.contentDocument.addEventListener(
                'AlpheiosTreeResized',
                function()
                {                   
                    try
                    {
                         // update the title of the window to the title of the tree document
                        document.documentElement.setAttribute('title',this.title);
                        var tree = this.getElementById("dependency-tree");
                        var w = parseInt(tree.getAttribute("width"));
                        var h = parseInt(tree.getAttribute("height"));
                        Alph.Util.resizeWindow(window,w,h);
                    }
                    catch (a_e) { Alph.Diagram.s_logger.warn(a_e)}
                },
                false
            );
                                  
            // add the trigger hint
            var trigger = params.lang_tool.getPopupTrigger();
            if (trigger)
            {
                var parent_browser = 
                    Alph.BrowserUtils.browserForDoc(window.opener,params.src_doc);
                window.opener.Alph.Site
                        .addTriggerHint(parent_browser,this.contentDocument,trigger,params.lang_tool);
            }

        },true);
    if (params.proxied_event && params.proxied_handler)
    {
        Alph.Util.addProxiedEvent(window,browser,params.proxied_event);    
    }
    
                
    // if a callback function was passed in in the window
    // arguments, execute it
    if (typeof params.callback == 'function') {
        params.callback();
    }

}