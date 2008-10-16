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
     */
    setup_display: function(a_doc)
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
        Alph.$(".alph-proto-word",a_doc).mouseover( Alph.pproto.toggle_alignment );
        Alph.$(".alph-proto-word",a_doc).mouseout( Alph.pproto.toggle_alignment );
        
        // cancel mousemove over next/previous links - to kill the Alpheios popup
        // TODO - need to do this more general for ped reader interface elements
        Alph.$("#alph-proto-nextprev",a_doc).mousemove( function() { return false; } );
                  
    },
    
    /**
     * toggle the state of the source and parallel aligned text
     */
    toggle_alignment: function()
    {
        // toggle the selector class for the source text
        Alph.$(this).toggleClass('alph-highlight-source');
        
        // toggle the selection of the parallel aligned text
        try {
            var panel_obj = Alph.main.panels['alph-trans-panel'];
            panel_obj.toggle_parallel_alignment(this);
        }
        catch(a_e)
        {
            Alph.util.log("Error toggling alignment: " + a_e);
        }
    },
    
    
    /**
     * Add the parallel aligned text interlinearly to the source display
     * @param {Document} a_src the contentDocument for the source window
     * @param {Document} a_parallel the contentDocument for 
     *                   the parallel translation panel
     */
    add_interlinear: function(a_src,a_parallel)
    {
        
        if ( Alph.$("p.alph-proto-sentence",a_src).length == 0 ||
             Alph.$("p.alph-proto-sentence",a_parallel).length == 0 )
        {
            // If we don't have interlinear markup in both the source
            // and parallel text, just disable the interlinear option and return
            Alph.util.log("Disable interlinear");
            Alph.$("#alpheios-trans-opt-inter").attr("disabled",true);
            return;    
        }
        
        Alph.$("#alpheios-trans-opt-inter").attr("disabled",false);
        // wrap a div around each source sord so that the aligned text can
        // be floated under it
        Alph.$(".alph-proto-word",a_src).wrap("<div class='alph-word-wrap'></div>");
        
        // add the aligned text to each source word
        Alph.$("p.alph-proto-sentence",a_src).each(
            function()
            {
                Alph.$(".alph-proto-word",this).each(
                    function()
                    {
                        var offset_left = 1 - Alph.$(this).position().left;
                        var offset_left = "0";
                        var offset_top = Alph.$(this).height();
                        var my_ids = Alph.$(this).attr("ref").split(/\s/);
                        for (var i=0; i<my_ids.length; i++) {
                           if (my_ids[i]) { 
                               var elem = Alph.$("p.alph-proto-sentence span.alph-proto-word[id='" 
                                + my_ids[i] + "']",a_parallel);
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
                );
            }
        );
        // resize the source display to account for the new elements
        Alph.pproto.resize_interlinear(a_src);
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
                        accum_width = accum_width + Alph.$(this).outerWidth(true);
                        
                        if (accum_width > (p_width)) {
                            
                            Alph.$(this).before("<br class='alph-proto-spacer' clear='all'/>");
                            accum_width = Alph.$(this).outerWidth(true);
                        }
    
                    }
              );    
            }
        );
    }
};