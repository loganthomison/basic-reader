/**
 * @fileoverview Handler for the Alpheios Inflection Table window
 * @version $Id $
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

/**
 * @singleton
 */
Alph.infl = {
         /**
     * An XSLT Processor for the xml verb conjugation data
     * @private
     * @type XSLTProcessor
     */
    xsltProcessor: null,

    /**
     * Transforms xml text adhering to the alpheios verb conj schema to html
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
            window.opener.Alph.util.log("Transformation time: " + (end-start));

        }
        catch (e)
        {
            window.opener.Alph.util.log(e);
        }
        return inflHTML;
    },

    
    /**
     * onLoad handler for the window
     */
    onLoad: function() {
        var link_target = window.arguments[0];

        
        var pofs_set = [];
        for (var pofs in link_target.suffixes)
        {
            if (link_target.suffixes[pofs].length > 0 || pofs == link_target.showpofs)
            {
                pofs_set.push(pofs);
                
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
        
        document.getElementById("alph-infl-browser")
            .addEventListener(
                "DOMContentLoaded",
                function() 
                {

                    if (link_target.xml_url && link_target.xslt_url)
                    {
                        var infl_html = Alph.infl.transform(link_target);
                        var infl_node = 
                            this.contentDocument.importNode(infl_html.getElementById("alph-infl-table"),true);
                        $("body",this.contentDocument).append(infl_node)
                        
                    }
                    $(".loading",this.contentDocument).hide();
                    var tbl = $('#alph-infl-table',this.contentDocument);
                    Alph.infl.showCols(tbl,link_target,pofs_set);
                    Alph.infl.resize_window(this.contentDocument);
                },
                true
                );
                
        var infl_browser = $("#alph-infl-browser");
        
        var base_pofs = (link_target.showpofs.split(/_/))[0];
        
        var url =
            'chrome://' +
            window.opener.Alph.main.getLanguageTool().getchromepkg() + 
            '/content/inflections/alph-infl-' + base_pofs + '.html';
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
            $("#sortorder",topdoc).val(a_link_target.order);
            $("#reorder",topdoc).css("display","block");
        }
        
        // add handler for the reorder links
        $("#sortorder",topdoc).change(
            function(e)
            {
                $(".loading",topdoc).show();
                var showorder = $(":selected", this).val();
                window.opener.Alph.main.getLanguageTool().handleInflections(e,'verb', { order: showorder } );
            }
        );
        
        //show the words for this inflection type
        var wordlist = "";
        for (var word in a_link_target.words[showpofs])
        {
            wordlist = wordlist + word + ", ";
        }
        wordlist = wordlist.replace(/\,\s$/,'');
        
        $("caption",a_tbl).html( wordlist + " (" + suffix_list + ")");

        // replace the table header text
        var str = document.getElementById("alph-infl-strings");
    
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
                    window.opener.Alph.util.log("Couldn't find string for " + $text);   
                }
            }
        );
        var end = (new Date()).getTime();
        window.opener.Alph.util.log("Translation time: " + (end-start));

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
                var lang_tool = window.opener.Alph.main.getLanguageTool();
                if (lang_tool)
                {
                    $("span.ending",a_tbl).each( function(i) {          
                        for (var j=0; j<a_link_target.suffixes[showpofs].length; j++ ) {
                            var ending_text = lang_tool.convertString($(this).text());
                            ending_text = Alph.infl.decode(ending_text);
                            
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
                Alph.infl.expand_table(a_tbl,topdoc);
            }
            else 
            {
                $("#expand-table-link",topdoc).css("display","inline");
                $("#expand-table-link",topdoc).click( function(e) {
                    Alph.infl.expand_table(a_tbl,topdoc);
                    return false;
                });
            }
        } 
        else {
            Alph.infl.expand_table(a_tbl,topdoc);            
        }
        end = (new Date()).getTime();
        window.opener.Alph.util.log("Display time: " + (end-start));
        // if we didn't have any suffixes, just display the whole table
        // with nothing highlighted
        
        // add links for the other relevant inflections
        if (a_pofs_set.length > 1) {
            for (var i=0; i<a_pofs_set.length; i++)
            {
                // if a part of speech is broken down further,
                // format will be <primary pofs>_<secondary info>
                // e.g. verb_suppine, etc.
                var parts = a_pofs_set[i].split(/_/);
                var linktype;
                var linkname;
                if (parts.length >1)
                { 
                    linktype = parts[0];
                    linkname = parts[0] + '(' + parts[1] + ')';
                }
                else {
                    linktype = a_pofs_set[i];
                    linkname = a_pofs_set[i];
                }
    
                var link =
                   topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "option");
                    link.setAttribute("value",a_pofs_set[i]);
                    link.innerHTML =  
                        document
                            .getElementById("alph-infl-strings")
                            .getFormattedString(
                                "alph-infl-link-"+linktype, 
                                [linkname]);
                if (a_pofs_set[i] == a_link_target.showpofs)
                {
                    link.setAttribute("selected",true);
                }
    
                $("#infl-links-select",topdoc).append(link);
            }
        }
        
        
        // TODO - dedupe? See congestaque
        if (a_link_target.links)
        {
            for (i=0; i<a_link_target.links.length; i++)
            {
                var parts = a_link_target.links[i].split(/_/);
                var linktype;
                var linkname;
                if (parts.length >1)
                { 
                    linktype = parts[0];
                    linkname = parts[0] + '(' + parts[1] + ')';
                }
                else {
                    linktype = a_link_target.links[i];
                    linkname = a_link_target.links[i];
                }
                
                var link =
                   topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "option");
                    link.setAttribute("value",a_link_target.links[i]);
                    link.innerHTML =  
                        document
                            .getElementById("alph-infl-strings")
                            .getFormattedString(
                                "alph-infl-link-"+linktype, 
                                [linkname]);

                $("#infl-links-select",topdoc).append(link);
            }
        }

        if ($("select#infl-links-select option",topdoc).length > 1)
        {
            var label = document
                .getElementById("alph-infl-strings")
                .getString("alph-infl-links-label"); 
            $("#infl-links-label",topdoc).text(label);
            $("#infl-links",topdoc).css("display","block");
        }
        $("#infl-links-select",topdoc).change(
            function(e) {
                $(".loading",topdoc).show();
                var showpofs = $(":selected",this).val();
                window.opener.Alph.util.log("Switching to " + showpofs);
                window.opener.Alph.main.getLanguageTool().handleInflections(e,showpofs,null,a_link_target.source_node);
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
        Alph.infl.resize_window(topdoc);
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     * @param {Document} the window content document
     */
    resize_window: function(topdoc) {
        // resize the window 
        var y = 
            $("#alph-infl-table",topdoc).get(0).offsetHeight +
            $("#page-header",topdoc).get(0).offsetHeight + 
            50;
                    
        // add a little room to the right of the table 
            

        var x = $("#alph-infl-table",topdoc).get(0).offsetWidth + 75;
                    
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
            if (window.opener.Alph.xlate.popupVisible()) {
                
                window.opener.Alph.main.getLanguageTool().handleInflections(a_e);
            }
        }
        // return true to allow event propogation if needed
        return true;
    }
    
};