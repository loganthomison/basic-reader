/*
 * Javascript functions for Tei Formatted Grammar Documents
 * $Id: alpheios-tei-grammar.js 806 2008-06-23 19:21:22Z BridgetAlmas $
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
 
// initialize the Alph namespace
if (typeof Alph == "undefined") {
    Alph = {};
}
 

Alph.tei_grammar = {

    /**
     * onLoad 
     * load handler for the grammar window
     * @param {String} a_index name of the grammar index file
     */
    onLoad: function(a_index) {
        var toc_doc = $("#alph-grammar-toc").get(0).contentDocument;
        var content_browser = $("#alph-grammar-content");
        
        // Add a handler to main grammar content browser window 
        // which adds a click handler to the links in the grammar
        // content document whenever a new document is loaded
        document.getElementById("alph-grammar-content")
            .addEventListener(
                "DOMContentLoaded",
                function() 
                {
                    $("a",this.contentDocument)
                        .click(Alph.tei_grammar.contentClickHandler);
                },
                true
                );

        // check the window arguments
        var params;
        if (typeof window.arguments != "undefined")
        {
            params=window.arguments[0];   

            // add a callback to the parameters object
            // which can be called by the opener code 
            // to reload the window with new arguments
            if (typeof params.update_args_callback == 'undefined')
            {
                params.update_args_callback =
                    function(a_args)
                        {
                            Alph.tei_grammar.set_start_href(a_args,a_index);
                        }
            }
            this.set_start_href(params,a_index);            
        }
        
        // hide the header in the toc
        $("div.stdheader",toc_doc).css("display","none");
            
        // Add a click handler to the links in the toc: they set the 
        // src of the alph-grammar-content iframe
        $("a.toc",toc_doc).click(Alph.tei_grammar.tocClickHandler);
    

        // add the toggle widgets
        $("li.toc:has(li)",toc_doc).prepend("<div class='toc-widget toc-closed'/>");
        
        // hide the subcontents of the toc headings and only show toc_0 by default
        $("li.toc",toc_doc).css("display","none");
        $("li.toc:has(a.toc_0)",toc_doc).css("display","block");
        
        // Add a click handler to the toc widgets
        $("div.toc-widget",toc_doc).click(Alph.tei_grammar.tocheadClickHandler);

        // if a callback function was passed in in the window
        // arguments, execute it
        if (params && typeof params.callback == 'function') {
            params.callback();
        }
    },
    
    /**
     * tocClickHandler
     * Click handler for links in the toc frame. Set the src
     * of the alph-grammar-content browser.
     * @param {Event} a_event the triggering click event
     */
    tocClickHandler: function(a_event)
    {
        var toc_doc = $("#alph-grammar-toc").get(0).contentDocument;
        var href = $(this).attr("href");
        $("#alph-grammar-content").attr("src",
                
                Alph.tei_grammar.get_base_url() + href 
            );
        $('.highlighted',toc_doc).removeClass('highlighted');
        $(this).addClass('highlighted');
        return false;
    },

    /**
     * tocheadClickHandler
     * Click handler for the toc headings. hides/shows the 
     * items below that heading
     * @param {Event} a_event the triggering click event
     */
    tocheadClickHandler: function(a_event)
    {
        // hide/show the child toc li items
        var sib_uls = $(this).siblings("ul");
        var sib_lis = $(">li",sib_uls);
        if ($(sib_lis).css('display') == 'block') 
        {
            $(sib_lis).css("display", "none")
            $(this).removeClass("toc-open");
            $(this).addClass("toc-closed");
        }
        else
        {
            $(sib_lis).css("display", "block")
            $(this).removeClass("toc-closed");
            $(this).addClass("toc-open");
        }
        
        // prevent event propagation
        return false;
      
    },
    
    /**
     * contentClickHandler
     * Click handler for links within the content. 
     * Default behavior allows the links to behave normally.
     * @param {Event} a_event the triggering click event
     */
    contentClickHandler: function(a_event)
    {
        return true;
    },
            
    /**
     * set_start_href - set the location for the content window
     * @param {Object} a_params object containing a target_href property 
     *                          which specifies the name of the target location in the 
     *                          grammar (according to the Alpheios morphological markup)
     * @param {String} a_index name of the index file which contains the mapping of 
     *                         the context supplied in the target_href to actual location
     *                         in the grammar 
     */
    set_start_href: function(a_params,a_index)
     {
        // pick up the original target href for the grammar from the
        // window arguments
        // otherwise set it to the preface
        // and reset the contents of the grammar content browser
        var start_href = 
                a_params != null && a_params.target_href ? 
                a_params.target_href  : 
                'preface';
        
        var start_href_target = window.opener.Alph.linking.find_link_target(start_href,a_index);
        if (typeof start_href_target != "undefined")
        {
            $("#alph-grammar-content").attr("src", 
                Alph.tei_grammar.get_base_url() + start_href_target
            );
        }
     },
     
     /**
      * get the base url for the current grammar
      * @return the url for the current grammar
      * @type {String}
      */
     get_base_url: function()
     {
        //TODO - eventually need to support multiple grammars per language
        var url = 
            'chrome://' 
                + window.opener.Alph.main.getLanguageTool().getchromepkg() 
                + '/content/grammar/';
        return url;
     }
}


