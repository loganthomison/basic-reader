/**
 * @fileoverview This file contains temporary code to handle various aspects
 * of the pedagogical reader prototype
 * @version $Id: alpheios-prototype.js 907 2008-09-25 18:20:42Z BridgetAlmas $
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
 * @singleton
 */
Alph.pproto = {

    /**
     * Add CSS and Javascript handlers to the source and parallel text 
     * displays to provide prototype functionality
     * @param {Document} a_doc the contentDocument for the target panel/window
     * @param {String} a_type identifies the target display type 
     *                (one of @link Alph.Translation.INTERLINEAR_TARGET_SRC or
     *                 @link Alph.Translation.INTERLINEAR_TARGET_TRANS)
     */
    setup_display: function(a_doc,a_type)
    {
        // add the pedagogical text stylesheet
        var ped_text_css = "chrome://alpheios/skin/alph-ped-text.css";
        // only add the stylesheet if it's not already there
        if (Alph.$("link[href='"+ ped_text_css + "']",a_doc).length == 0)
        {
            var css = document.createElementNS(
                "http://www.w3.org/1999/xhtml","link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            css.setAttribute("href", ped_text_css);
            css.setAttribute("id", "alph-ped-text-css");
            Alph.$("head",a_doc).append(css);
        }
        
        // add the mouseover handlers for the parallel alignment
        Alph.$(".alph-proto-word",a_doc).mouseover(  
            function(e) { Alph.pproto.toggle_alignment(e,this,a_type)}
        );
        
        Alph.$(".alph-proto-word",a_doc).mouseout( 
            function(e) { Alph.pproto.toggle_alignment(e,this,a_type) }
        );
        
        // add a checkbox to control the interlinear translation in the source
        // text display
        Alph.$("#alph-text-links",a_doc).append(
            '<div id="alpheios-enable-interlinear">' +
            '<input type="checkbox" id="alpheios-interlinear-toggle"/>' +
            '<span>' +
            document.getElementById("alpheios-strings")
                        .getString("alph-enable-interlinear") +
            '</span>'
        );
        // update the checked state of the interlinear toggle in the source text
        // document with the state of real control from the XUL
        Alph.$("#alpheios-interlinear-toggle",a_doc).attr("checked",
            Alph.$("#alpheios-trans-opt-inter-src").attr('checked') == "true" ? true : null);
            
        Alph.$("#alpheios-interlinear-toggle",a_doc).click(
            function(e)
            {
                // keep the state of the XUL control and the document
                // control in sync
                var checked = Alph.$(this).attr('checked');
                Alph.$("#alpheios-trans-opt-inter-src").attr('checked',checked);
                Alph.Translation.toggle_interlinear('src',e);
            }
        );
    },
    
    /**
     * toggle the state of the target and parallel aligned text
     * @param {Event} the event which triggered the action
     * @param {Element} the target element
     * @param {String} type of target text 
     *                (one of @link Alph.Translation.INTERLINEAR_TARGET_SRC or
     *                 @link Alph.Translation.INTERLINEAR_TARGET_TRANS)
     */
    toggle_alignment: function(a_event,a_elem,a_type)
    {
        // toggle the selector class for the source text
        Alph.$(a_elem).toggleClass('alph-highlight-source');
        
        // toggle the selection of the parallel aligned text
        try {
            var panel_obj = Alph.main.panels['alph-trans-panel'];
            panel_obj.toggle_parallel_alignment(a_elem,a_type);
        }
        catch(a_e)
        {
            Alph.util.log("Error toggling alignment: " + a_e);
        }
    },
    
    /**
     * Enable the interlinear alignment
     * @param {Document} a_target the target document for the interlinear translation
     * @param {Document} a_source the source of the interlinear translation
     *                   
     */
    enable_interlinear: function(a_target,a_source)
    {    
        if ( Alph.$("p.alph-proto-sentence",a_target).length == 0 ||
             Alph.$("p.alph-proto-sentence",a_source).length == 0 )
        {
            // If we don't have interlinear markup in both the source
            // and parallel text, just disable the interlinear option and return
            // TODO we shouldn't assume that if interlinear is available one way
            // it is also available the other way 
            Alph.util.log("Disable interlinear");
            Alph.$("#alph-trans-inter-trans-status").attr("disabled",true);
        }
        else
        {
            Alph.$("#alph-trans-inter-trans-status").attr("disabled",false);
        }
    },
    
    /**
     * Add the parallel aligned text interlinearly to the source display
     * @param {Document} a_target the target document for the interlinear translation
     * @param {Document} a_source the source document for the interlinear translation 
     */
    add_interlinear: function(a_target,a_source)
    {

        // only do this once per document
        {
            if (Alph.$(".alph-proto-iltrans",a_target).length > 0)
            {
                return;
            }
        }
        
        // wrap a div around each source sord so that the aligned text can
        // be floated under it
        Alph.$(".alph-proto-word",a_target).wrap("<div class='alph-word-wrap'></div>");
        
        // add the aligned text to each source word
        Alph.$("p.alph-proto-sentence",a_target).each(
            function()
            {
                Alph.$(".alph-proto-word",this).each(
                    function()
                    {
                        //var offset_left = 1 - Alph.$(this).position().left;
                        var offset_left = "0";
                        var offset_top = Alph.$(this).height();
                        if (Alph.$(this).attr("ref"))
                        {
                            var my_ids = Alph.$(this).attr("ref").split(/\s/);
                            for (var i=0; i<my_ids.length; i++) {
                               if (my_ids[i]) { 
                                   var elem = Alph.$("p.alph-proto-sentence span.alph-proto-word[id='" 
                                    + my_ids[i] + "']",a_source);
                                   if (elem.length == 0) {
                                        continue;
                                   }
                                   var id_copy = Alph.$(Alph.$(elem)[0]).clone().appendTo(Alph.$(this).parent(".alph-word-wrap"));
                                   Alph.$(id_copy).attr("id", "il-" + my_ids[i]);
                                   Alph.$(id_copy).addClass("alph-proto-iltrans");
                                   Alph.$(id_copy).removeClass("alph-proto-word");
                                   Alph.$(id_copy).css("top",offset_top);
                                   
                               }
                            }
                        }
    
                    }
                );
            }
        );
        // resize the source display to account for the new elements
        Alph.pproto.resize_interlinear(a_target);
    },
    
    /**
     * Resize the source text display, adding line breaks where needed
     * @param {Document} a_doc the contentDocument for the source text
     */
    resize_interlinear: function(a_doc)
    {
        Alph.$("br.alph-proto-spacer",a_doc).remove();
        Alph.$("p.alph-proto-sentence",a_doc).each(
            function()
            {
                var p_width = Alph.$(this).innerWidth();
                var accum_width = 0;
                Alph.$("div.alph-word-wrap", this).each(
                    function(a_i)
                    {
                        var trans_width = 0;
                        Alph.$(this).children('.alph-proto-iltrans').each(
                            function()
                            {
                                trans_width = trans_width + Alph.$(this).outerWidth(true);
                            }
                        );
                        var src_width = 0;
                        Alph.$(this).children('.alph-proto-word').each(
                            function()
                            {
                                src_width = src_width + Alph.$(this).outerWidth(true);
                            }
                        );

                        // set the width of the containing block to the larger of the width
                        // of the source word or of the interlinear translation
                        // explicit width on the floated block is necessary to prevent
                        // the browser from making it wider than it needs to be
                        var max_width = src_width > trans_width ? src_width : trans_width;
                        
                        Alph.$(this).css("width",max_width);
                        accum_width = accum_width + max_width;
                        
                        if (accum_width > (p_width - 50)) {
                            
                            Alph.$(this).before("<br class='alph-proto-spacer' clear='all'/>");
                            accum_width = max_width;
                        }
    
                    }
              );    
            }
        );
    }
};