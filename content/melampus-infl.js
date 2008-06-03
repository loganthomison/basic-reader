/**
 * @fileoverview Handler for the Melampus Inflection Table window
 * @version $Id $
 * 
 * Copyright 2008 Cantus Foundation
 * http://alpheios.net
 * 
 * This file is part of Melampus.
 * 
 * Melampus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Melampus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// initialize the MP namespace
if (typeof MP == "undefined") {
    MP = {};
}

/**
 * @singleton
 */
MP.infl = {
         /**
     * An XSLT Processor for the xml verb conjugation data
     * @private
     * @type XSLTProcessor
     */
    xsltProcessor: null,

    /**
     * Transforms xml text adhering to the melampus verb conj schema to html
     * TODO transform stylesheet may need to be language specific
     * @private
     * @param {Node} a_target
     * @return an HTML Node containing the transformed text
     * @type Node
     */
    transform: function(a_target)
    {
        this.xsltProcessor = new XSLTProcessor();
        var p = new XMLHttpRequest();      
        p.open("GET", a_target.xslt_url, false);
        p.send(null);
        var xslRef = p.responseXML;
        this.xsltProcessor.importStylesheet(xslRef)
        
        p.open("GET",a_target.xml_url,false);
        p.send(null);
        var xmlRef = p.responseXML;
        
        var inflHTML = '';
        try
        {
            // add the xslt parameters
            for (var param in a_target.xslt_params)
            {
                this.xsltProcessor.setParameter("",param,a_target.xslt_params[param]);
            }
            var start = (new Date()).getTime();
            inflHTML = this.xsltProcessor.transformToDocument(xmlRef);
            var end = (new Date()).getTime();
            window.opener.MP.util.log("Transformation time: " + (end-start));

        }
        catch (e)
        {
            window.opener.MP.util.log(e);
        }
        return inflHTML;
    },

    
    /**
     * onLoad handler for the window
     */
    onLoad: function() {
        var link_target = window.arguments[0];

        
        var primary_pofs = 'verb'; //TODO - from prefs?
        var pofs_set = [];
        for (var pofs in link_target.suffixes)
        {
            if (link_target.suffixes[pofs].length > 0)
            {
                pofs_set.push(pofs);
                if (pofs  == primary_pofs && 
                    typeof link_target.showpofs == "undefined")
                {
                        link_target.showpofs = pofs;
                }
                
            }
        }
        
        var suffix_map = {};
        var suffix_list = jQuery.map(link_target.suffixes[link_target.showpofs],function(n){
            var ending = $(n).text();
            if (ending == '') {
                ending = '&lt;none&gt;'
            }
            // remove duplicates from the list of suffixes
            // for some reason the jQuery.unique function doesn't work
            if (suffix_map[ending]) 
            {
                return;
            }
            else 
            {
                suffix_map[ending] = true;
                return ending;
            } 
        });
        link_target.suffix_list = suffix_list.join(',');

                // if we don't have the primary case, just use the first one we found
        if (typeof link_target.showpofs == 'undefined')
        {
            link_target.showpofs = pofs_set[0]
        }
        
        document.getElementById("mp-infl-browser")
            .addEventListener(
                "DOMContentLoaded",
                function() 
                {

                    if (link_target.xml_url && link_target.xslt_url)
                    {
                        var infl_html = MP.infl.transform(link_target);
                        var infl_node = 
                            this.contentDocument.importNode(infl_html.getElementById("mp-infl-table"),true);
                        $("body",this.contentDocument).append(infl_node)
                        
                    }
                    $(".loading",this.contentDocument).hide();
                    var tbl = $('#mp-infl-table',this.contentDocument);
                    MP.infl.showCols(tbl,link_target,pofs_set);
                    MP.infl.resize_window(this.contentDocument);
                },
                true
                );
                
        var infl_browser = $("#mp-infl-browser");
        
        var base_pofs = (link_target.showpofs.split(/_/))[0];
        
        var url =
            'chrome://' +
            window.opener.MP.main.getLanguageTool().getchromepkg() + 
            '/content/inflections/mp-infl-' + base_pofs + '.html';
        $(infl_browser).attr("src",url);
        
    },
    
    /**
     * Initialize the mouseover highlighting for the table
     * which also sets the realIndex for each cell
     * @private
     * @param {HTMLElement} a_tbl the Table element
     */
    init_table: function(a_tbl) {
        $(a_tbl).tableHover({colClass: "highlight-hover",
                           rowClass: "highlight-hover",
                           headCols: true});
    },

    /**
     * Called by the onload event listener for the window contents.
     * Displays the columns whose case endings match the source word.
     * @param {HTMLElement} a_tbl the table element 
     * @param {Object} a_link_target the source object as supplied in the 
     *                 window arguments. Contains the source word, it's endings and the
     *                 requested case.
     * @param {Array} a_pofs_set the list of pofs relevant to the source object 
     */
    showCols: function(a_tbl,a_link_target, a_pofs_set) {
        
        var topdoc = window.content.document || window.document;
        var showpofs = a_link_target.showpofs;
        this.init_table(a_tbl);
       
        var suffix_list = 'Inflection endings: ' + a_link_target.suffix_list;

        // show the links to the other possible orders
        if (a_link_target.order)
        {
            $("#reorder",topdoc).css("display","block");
            $(".reorder-link",topdoc).each(
                function()
                {
                    if ($(this).attr("id") != a_link_target.order)
                    {
                        $(this).css("display","inline");
                    }
                    else
                    {
                        $(this).css("display","none");
                    }
                }
            );
        }
        //show the word we're working with
        $("caption",a_tbl).html(a_link_target.word + " (" + suffix_list + ")");

        // replace the table header text
        var str = document.getElementById("mp-infl-strings");
    
        var start = (new Date()).getTime();
        $(".header-text",topdoc).each(
            function()
            {
                var $text = jQuery.trim($(this).text());
                try 
                {
                    var $newtext = str.getString($text);
                    if ($newtext)
                    {
                        $(this).text($newtext);        
                    }
                } 
                catch(e)
                {
                    window.opener.MP.util.log("Couldn't find string for " + $text);   
                }
            }
        );
        var end = (new Date()).getTime();
        window.opener.MP.util.log("Translation time: " + (end-start));

        // for each ending in the table, highlight it if there's a matching suffix
        // in the link source
        start = end;

        if ( a_link_target.suffixes[showpofs] != null 
             && a_link_target.suffixes[showpofs].length > 0 ) {
            var col_parents = [];
            var pre_selected = $("span.selected",a_tbl);
            if (pre_selected.length > 0)
            {
                $(pre_selected).each( function(i) {
          
                    $(this).addClass("highlight-ending");
                    var td_parent = $(this).parent("td");
                    $(td_parent).addClass("highlight-ending");
    
                    // get the realIndex (column index) for each cell containing
                    // a matched ending, so that we can make all cells in this column
                    // visible
                    col_parents.push($(td_parent).get(0).realIndex);
                    
                });
            }
            else 
            {
                var lang_tool = window.opener.MP.main.getLanguageTool();
                if (lang_tool)
                {
                    $("span.ending",a_tbl).each( function(i) {          
                        for (var j=0; j<a_link_target.suffixes[showpofs].length; j++ ) {
                            var ending_text = lang_tool.convertString($(this).text());
                            ending_text = MP.infl.decode(ending_text);
                            
                            if (ending_text == 
                                jQuery.trim($(a_link_target.suffixes[showpofs][j]).text()) ) {
                                $(this).addClass("highlight-ending");
                                var td_parent = $(this).parent("td");
                                $(td_parent).addClass("highlight-ending");
        
                                // get the realIndex (column index) for each cell containing
                                // a matched ending, so that we can make all cells in this column
                                // visible
                                col_parents.push($(td_parent).get(0).realIndex);
                            }
                        }
                    });
                }
            }                        
            
            var col_parent_elements = $("col",a_tbl);
            var sib_cols = [];
            
            // iterate through the col elements with the same realIndex as those
            // of the matched cells, identifying the realIndexes of the 
            // sibling columns (i.e. columns in the same colgroup), so that we can 
            // display all columns in the column group.
            // ideally we wouldn't need to do this, and could just set visibility
            // at the colgroup level, but Firefox's handling of the visibility css
            // style on tables is very buggy
            for (var i=0; i<col_parents.length; i++) {
                var col_index = col_parents[i];
                var col_realIndex = $(col_parent_elements[col_index]).attr("realIndex"); 
                if (sib_cols.indexOf(col_realIndex) == -1) {
                    sib_cols.push(col_realIndex);
                }
                $(col_parent_elements[col_index]).siblings().each(function(){
                    var sib_index = $(this).attr("realIndex");
                    if (sib_cols.indexOf(sib_index) == -1) {
                        sib_cols.push(sib_index);
                    }
                });
            }
            
            // unhide all the cells in the colgroups to which the matched
            // endings belonged
            for (var i=0; i<sib_cols.length; i++) {
                $("td[realIndex='" + sib_cols[i] + "']",a_tbl).css("display","table-cell");
                $("th[realIndex='" + sib_cols[i] + "']",a_tbl).css("display","table-cell");
            }

            // if we couldn't find any of the suffixes in the table
            // just expand the whole thing
            if (sib_cols.length == 0)
            {
                MP.infl.expand_table(a_tbl,topdoc);
            }
            else 
            {
                $("#expand-table-link",topdoc).css("display","inline");
                $("#expand-table-link",topdoc).click( function(e) {
                    MP.infl.expand_table(a_tbl,topdoc);
                    return false;
                });
            }
        } 
        else {
            MP.infl.expand_table(a_tbl,topdoc);            
        }
        end = (new Date()).getTime();
        window.opener.MP.util.log("Display time: " + (end-start));
        // if we didn't have any suffixes, just display the whole table
        // with nothing highlighted

        
        // add links for the other relevant inflections
        for (var i=0; i<a_pofs_set.length; i++)
        {
            if (a_pofs_set[i] != a_link_target.showpofs)
            {
                var linkname = a_pofs_set[i].replace("_",':');
                
                var link =
                   topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "a");
                    link.setAttribute("href","#" + a_pofs_set[i]);
                    link.setAttribute("class","mp-infl-link");
                    link.setAttribute("mp-infl-link",a_pofs_set[i]);
                    link.innerHTML =  
                        document
                            .getElementById("mp-infl-strings")
                            .getFormattedString(
                                "mp-infl-link", 
                                [linkname]);

                $("#links",topdoc).append(link);
            }
        }
        $(".mp-infl-link",topdoc).click(
            function(e) {
                var showpofs = $(this).attr("mp-infl-link");
                window.opener.MP.main.getLanguageTool().handleInflections(e,showpofs);
            }
        );
        
        $(".reorder-link",topdoc).click(
            function(e)
            {
                var showorder = $(this).attr("id");
                $(".loading",topdoc).show();
                window.opener.MP.main.getLanguageTool().handleInflections(e,'verb', { order: showorder } );
            }
        );
        
        $(".footnote",a_tbl).click(
            function(e)
            {
                var text = $(this).next(".footnote-text");
                if (text.length > 0)
                {
                    $(text).toggleClass("footnote-visible");
                    return false;
                }
            }
        );
    },
    
    /**
     * Handler for the "Full Table" link to show all columns in the table.
     * @param {HTMLElement} a_tbl the table
     * @param {Document} the Document containing the table
     */
    expand_table: function(tbl,topdoc) {
        $("th",tbl).css("display","table-cell");
        $("td",tbl).css("display","table-cell");
        $("#expand-table-link",topdoc).css("display","none");
        MP.infl.resize_window(topdoc);
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     * @param {Document} the window content document
     */
    resize_window: function(topdoc) {
        // resize the window 
        var y = 
            $("#mp-infl-table",topdoc).get(0).offsetHeight +
            $("#page-header",topdoc).get(0).offsetHeight + 
            50;
                    
        // add a little room to the right of the table 
        var x = $("#mp-infl-table",topdoc).get(0).offsetWidth + 50;
                    
        if (x > window.screen.availWidth) {
            x = window.screen.availWidth - 20; // don't take up the entire screen
        }
        if (y > window.screen.availHeight) {
            y = window.screen.availHeight - 20; // don't take up the entire screen 
        }
        // TODO - need to reset screenX and screenY to original 
        // requested location
        window.resizeTo(x,y);
        
        
    },
    
        /**
     * Holds decoded unicode/entities
     * @type Object
     * @private
     */
    entities: { },
                    
    /**
     * Decodes unicode/html entities
     * @private
     * @param {String} str the string to decode
     * TODO - this should eventually move to a multi-purpose object
     * for handing encodings
     */
    decode: function(str) {
        
        // replace the &nbsp; before trimming the string
        str = str.replace(/\xA0/g, '***');
        
        str = jQuery.trim(str);
        // only decode each entity once
        if (this.entities[str]) {
            return this.entities[str];
        }
        str = str.replace(/_|-/g, '');
        str = str.replace(/_|-/g, '');
        str = str.replace(/&nbsp;/g, '***');
        return str;        
    },

        
    /**
     * Shift key handler for the window -- hands the event off to the
     * parent window. Only effective while the mouseover popup is visible.
     * @param {Event} a_e the the keydown event 
     */
    onKeyDown: function(a_e) {
        if (a_e.keyCode == 16) {
            if (window.opener.MP.xlate.popupVisible()) {
                
                window.opener.MP.main.getLanguageTool().handleInflections(a_e);
            }
        }
        // return true to allow event propogation if needed
        return true;
    }
    
    
};