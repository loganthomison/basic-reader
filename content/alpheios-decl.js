/**
 * @fileoverview Handler for the Alpheios Declension Table window
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
Alph.decl = {
    
    /**
     * onLoad handler for the window
     */
    onLoad: function() {
        var link_target = window.arguments[0];
        
        var primary_case = 'noun'; //TODO - from prefs?
        var casetypes = [];
        for (var casetype in link_target.suffixes)
        {
            if (link_target.suffixes[casetype].length > 0)
            {
                casetypes.push(casetype);
                if (casetype == primary_case && 
                    typeof link_target.showcase == "undefined")
                {
                        link_target.showcase = casetype;
                }
                
            }
        }

        document.getElementById("alph-decl-browser")
            .addEventListener(
                "DOMContentLoaded",
                function() 
                {
                    var tbl = $('#declension-table',this.contentDocument);
                    Alph.decl.showCols(tbl,link_target,casetypes);
                    Alph.decl.resize_window(this.contentDocument);
                },
                true
                );
                
        var decl_browser = $("#alph-decl-browser");
        
        // if we don't have the primary case, just use the first one we found
        if (typeof link_target.showcase == 'undefined')
        {
            link_target.showcase = casetypes[0]
        }
        var url =
            'chrome://' +
            window.opener.Alph.main.getLanguageTool().getchromepkg() + 
            '/content/declensions/' + 
            "alph-decl-" + link_target.showcase + ".html";
        $(decl_browser).attr("src",url);
        
                
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
     * @param {Array} a_casetypes the list of case types relevant to the source object 
     */
    showCols: function(a_tbl,a_link_target, a_casetypes) {
        
        var topdoc = window.content.document || window.document;
        var showcase = a_link_target.showcase;
        this.init_table(a_tbl);
        
        var suffix_map = {};
        var suffix_list = jQuery.map(a_link_target.suffixes[showcase],function(n){
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
        
        suffix_list = 'case-endings: ' + suffix_list.join(", ");

        // show the word we're working with
        $("caption",a_tbl).html(a_link_target.word + " (" + suffix_list + ")");

        // for each ending in the table, highlight it if there's a matching suffix
        // in the link source
        if ( a_link_target.suffixes[showcase] != null 
             && a_link_target.suffixes[showcase].length > 0 ) {
            var col_parents = [];
            $("span.ending",a_tbl).each( function(i) {
                for (var j=0; j<a_link_target.suffixes[showcase].length; j++ ) {                    
                    if (Alph.decl.decode($(this).text()) == 
                        jQuery.trim($(a_link_target.suffixes[showcase][j]).text()) ) {
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
            //Alph.util.log(a_link_target.word + ": col_parents: " + col_parents.join(","));
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
                Alph.decl.expand_table(a_tbl,topdoc);
            }
            else 
            {
                $("#expand-table-link",topdoc).css("display","inline");
                $("#expand-table-link",topdoc).click( function(e) {
                    Alph.decl.expand_table(a_tbl,topdoc);
                    return false;
                });
            }
        } 
        // if we didn't have any suffixes, just display the whole table
        // with nothing highlighted
        else {
            Alph.decl.expand_table(a_tbl,topdoc);            
        }
        
        // add links for the other relevant cases
        for (var i=0; i<a_casetypes.length; i++)
        {
            if (a_casetypes[i] != a_link_target.showcase)
            {
                var link =
                   topdoc.createElementNS("http://www.w3.org/1999/xhtml",
                                        "a");
                    link.setAttribute("href","#" + a_casetypes[i]);
                    link.setAttribute("class","alph-decl-table-link");
                    link.setAttribute("alph-case-link",a_casetypes[i]);
                    link.innerHTML = 
                        document
                            .getElementById("alpheios-strings")
                            .getFormattedString(
                                "alph-decl-table-link", 
                                [a_casetypes[i]]);

                $("#links",topdoc).append(link);
            }
        }
        $(".alph-decl-table-link",topdoc).click(
            function(e) {
                var showcase = $(this).attr("alph-case-link");
                window.opener.Alph.main.getLanguageTool().showDeclensionTable(e,showcase);
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
        Alph.decl.resize_window(topdoc);
    },
    
    /**
     * Resizes the window to fit its contents.
     * @private
     * @param {Document} the window content document
     */
    resize_window: function(topdoc) {
        // resize the window 
        var y = 
            $("#declension-table",topdoc).get(0).offsetHeight +
            $("#page-header",topdoc).get(0).offsetHeight + 
            50;
                    
        // add a little room to the right of the table 
        var x = $("#declension-table",topdoc).get(0).offsetWidth + 50;
                    
        if (x > window.availWidth) {
            x=availWidth
        }
        if (y > window.availHeight) {
            y = window.availHeight;
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
        str = str.replace(/&#257;/g, 'a');
        str = str.replace(/\u0101/g, 'a');
        str = str.replace(/&#275;/g, 'e');
        str = str.replace(/\u0113/g, 'e');
        str = str.replace(/&#299;/g, 'i');
        str = str.replace(/\u012b/g, 'i');
        str = str.replace(/&#333;/g, 'o');
        str = str.replace(/\u014d/g, 'o');
        str = str.replace(/&#363;/g, 'u');
        str = str.replace(/\u016b/g, 'u');
        str = str.replace(/_|-/g, '');
        str = str.replace(/_|-/g, '');
        str = str.replace(/&nbsp;/g, '***');
        // TODO - specifically handle &nbsp; vs -/_
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
                
                window.opener.Alph.main.getLanguageTool().showDeclensionTable(a_e);
            }
        }
        // return true to allow event propogation if needed
        return true;
    }
    
    
};