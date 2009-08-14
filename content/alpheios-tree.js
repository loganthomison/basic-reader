/**
 * @fileoverview This file contains the Alph.Tree derivation of the Alph.Panel class.
 * Representation of the Treeology panel.
 *
 * @version $Id$
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
 * {@link Alph.Panel#getDetachChrome}
 * @return the chrome url as a string
 * @type String
 */
Alph.Tree.prototype.getDetachChrome = function()
{
    return Alph.BrowserUtils.getContentUrl() + '/alpheios-tree-window.xul';
};

/**
 * Tree panel specific implementation of
 * {@link Alph.Panel.#init}
 */
Alph.Tree.prototype.init = function()
{
    // add the popup trigger handler to the tree browser
    var trigger = Alph.main.getLanguageTool().getpopuptrigger();
    Alph.$("browser",this.d_panelElem).get(0).
        addEventListener(trigger, Alph.main.doXlateText, false);
};

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
    var treeDoc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;

    // clear out the prior tree and any error
    Alph.$("#tree-error", treeDoc).empty();
    Alph.$("#tree-hint", treeDoc).empty();
    Alph.$("#dependency-tree", treeDoc).empty();
    
    // reset the language-specific stylesheet
    Alph.$("link.alpheios-language-css",treeDoc).remove();
    var lang_tool = Alph.main.getLanguageTool(bro);
    lang_tool.addStyleSheet(treeDoc);

    var svgError = "";

    var treebankUrl = Alph.Site.getTreebankDiagramUrl(bro.contentDocument);

    var tbrefs;
    var sentence;
    var word;
    if (! treebankUrl)
    {
        Alph.$("#tree-error",treeDoc).html(Alph.main.getString("alph-error-tree-notree")
        );
        this.updatePanelWindow({},'alph-tree-body');
    }
    else if (! Alph.Xlate.popupVisible() && ! Alph.Interactive.queryVisible())
    {
        // Just add the default message to the display
        Alph.$("#tree-error",treeDoc).html(Alph.main.getString("alph-info-tree-select"));
        this.updatePanelWindow({},'alph-tree-body');
    }
    else
    {
        try
        {
            var last_elem = Alph.main.getStateObj(bro).getVar("lastElem");
            tbrefs = Alph.$(last_elem).attr("tbrefs");
            // if the selected element doesn't have a tbrefs attribute,
            // look for the first parent element that does
            if (!tbrefs)
                tbrefs = Alph.$(last_elem).parents('[tbrefs]').attr("tbrefs");
            if (!tbrefs)
                tbrefs = Alph.$(last_elem).attr("tbref");
            if (!tbrefs)
                tbrefs = Alph.$(last_elem).parents('[tbref]').attr("tbref");
            if (tbrefs)
                tbrefs = tbrefs.split(' ');
            var parts = tbrefs[0].split(/-/);
            sentence = parts[0];
            word = parts[1];
        }
        catch(a_e)
        {
            Alph.main.s_logger.error("Error identifying sentence and id: " + a_e);
        }

        //var sentence  = Alph.$(".alph-proto-sentence",bro.contentDocument);
        //var sentence  = Alph.$(".l",bro.contentDocument);
        if (! sentence )
        {
            // Just add the default message to the display
            Alph.$("#tree-error",treeDoc).html(Alph.main.getString("alph-error-tree-notree"));
            this.updatePanelWindow({},'alph-tree-body');
        }
        else
        {
            treebankUrl = treebankUrl.replace(/SENTENCE/, sentence);
            treebankUrl = treebankUrl.replace(/WORD/, word);
            Alph.$.ajax(
                {
                    type: "GET",
                    url: treebankUrl,
                    timeout: Alph.BrowserUtils.getPref("url.treebank.timeout") || 5000,
                    dataType: 'xml',
                    error: function(req,textStatus,errorThrown)
                    {
                        Alph.$("#tree-error",treeDoc).html(
                            Alph.main.getString("alph-error-tree-notree")
                        );
                        Alph.main.s_logger.error("Error retrieving treebank diagram: "
                            + textStatus ||errorThrown);
                        panel_obj.updatePanelWindow({},'alph-tree-body');
                    },
                    success: function(data, textStatus)
                    {
                        Alph.Tree.updateHint(panel_obj,bro,lang_tool,false);
                        panel_obj.parseTree(data, tbrefs);
                        panel_obj.updatePanelWindow({},'alph-tree-body');
                    }
                }
            );
        }
    }

    return Alph.Panel.STATUS_SHOW;
};


/**
 * Tree specific implementation of
 * {@link Alph.Panel.observeUIEvent}
 * @param {Browser} a_bro the current browser
 * @param a_event_type the event type (one of @link Alph.Constants.events)
 * @param a_event_data optional event data object
 */
Alph.Tree.prototype.observeUIEvent = function(a_bro,a_event_type,a_event_data)
{
    // listen for the window and the xlate trigger change events
    if (a_event_type == Alph.Constants.EVENTS.UPDATE_XLATE_TRIGGER)
    {
        Alph.main.s_logger.debug("Tree panel handling event " + a_event_type);
        var new_trigger = a_event_data.new_trigger;
        var old_trigger = a_event_data.old_trigger;
        var pw_bro = null;
        if (this.windowOpen())
        {
            pw_bro =
                this.d_panelWindow
                    .Alph.$("#" + this.d_panelId + " browser")
                    .get(0);
        }

        if (old_trigger)
        {
            Alph.$("browser",this.d_panelElem).get(0).
                removeEventListener(old_trigger, Alph.main.doXlateText,false);
            if (pw_bro)
            {
                pw_bro.removeEventListener(old_trigger, Alph.main.doXlateText,false);
            }
        }
        Alph.$("browser",this.d_panelElem).get(0).
            addEventListener(new_trigger, Alph.main.doXlateText,false);
        if (pw_bro)
        {
            pw_bro.addEventListener(new_trigger, Alph.main.doXlateText,false);
        }
        Alph.Tree.updateHint(this,a_bro,Alph.main.getLanguageTool(a_bro),true);
    }
    else if (a_event_type == Alph.Constants.EVENTS.LOAD_TREE_WINDOW)
    {
        this.open();
        var trigger = Alph.main.getXlateTrigger();
        this.d_panelWindow
            .Alph.$("#" + this.d_panelId + " browser")
            .get(0)
            .addEventListener(trigger, Alph.main.doXlateText,false);
    }
    
    return;
};


/**
 * Parse and display SVG-encoded tree
 * @param a_svgXML SVG representation of the tree
 * @param {Array} a_ids ids of initial words in the tree
 */
Alph.Tree.prototype.parseTree = function(a_svgXML, a_ids)
{
    var marginLeft = 10;
    var marginTop = 0;
    var fontSize = 20;
    var treeDoc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;
    try
    {
        Alph.$("#dependency-tree", treeDoc).
            html(a_svgXML.firstChild.childNodes);
        var svgXML = Alph.$("#dependency-tree", treeDoc).get(0);
        var treeSize =
                Alph.Tree.positionTree(
                    Alph.$(svgXML).children("g:first").children("g:first"),
                    fontSize)[0];
        var maxWidth = treeSize[0];
        var keySize = Alph.Tree.positionKey(treeDoc, fontSize);
        if (keySize[0] > maxWidth)
            maxWidth = keySize[0];
        var textSize = Alph.Tree.positionText(treeDoc, maxWidth, fontSize);
        Alph.Tree.positionAll(treeDoc,
                               treeSize,
                               textSize,
                               keySize,
                               fontSize);
        //Alph.main.s_logger.debug("SVG: " + XMLSerializer().serializeToString(svgXML));
        Alph.Tree.highlightFirst(treeDoc, a_ids);
        Alph.Tree.highlightWord(treeDoc, a_ids[0]);
        Alph.Tree.scrollToFocus(treeDoc);
//        Alph.main.s_logger.debug("SVG: " + XMLSerializer().serializeToString(svgXML));

        // jQuery doesn't seem to support retrieving svg nodes by class
        // or attribute, so just get by tag name and retrieve the attribute
        // directly using the javascript getAttribute function to filter for
        // the nodes we want

        // for each text element
        Alph.$("text",treeDoc).each(
        function()
        {
            var thisNode = Alph.$(this);
            var className = this.getAttribute('class');
            if (className)
                className = className.split(' ')[0];

            // if this is a text word
            if (className == 'text-word')
            {
                // turn on highlighting for the word
                var tbrefid = this.getAttribute('tbref');
                thisNode.bind(
                    'mouseenter',
                    function()
                    {
                        Alph.Tree.highlightWord(this.ownerDocument, tbrefid);
                    }
                );
            }
            // if this is a label
            else if (className == 'node-label')
            {
                // highlight the word while hovering
                var id = thisNode.parent().get(0).getAttribute('id');
                thisNode.hover(
                    function()
                    {
                        Alph.Tree.highlightWord(this.ownerDocument, id);
                    },
                    function()
                    {
                        Alph.Tree.highlightWord(this.ownerDocument, null);
                    }
                );
            }
        });
        // for each group
        Alph.$("g",treeDoc).each(
        function()
        {
            var thisNode = Alph.$(this);

            // if this is container of text words
            if (this.getAttribute('class') == 'text')
            {
                // turn off highlighting when we leave
                thisNode.bind(
                    'mouseleave',
                    function()
                    {
                        Alph.Tree.highlightWord(this.ownerDocument, null);
                    }
                );
            }
        });

    }
    catch(e)
    {
        Alph.main.s_logger.error(e);
    }


};

/**
 * Update a browser in the detached panel window with the current
 * state of that browser the real (attached) panel
 * @param {Object} a_panel_state the panel state object
 * @param {String} a_browser_id the id of the browser to update
 * @param {String} a_browser_index the index of the browser to update
 */
Alph.Tree.prototype.updatePanelWindow = function(a_panel_state,a_browser_id,a_browser_index)
{
    // make sure to update the detached window document too...
    if (this.windowOpen())
    {
        var treeDoc = Alph.$("browser",this.d_panelElem).get(0).contentDocument;
        try
        {
            var pw_bro =
                this.d_panelWindow
                    .Alph.$("#" + this.d_panelId + " browser#"+a_browser_id)
                    .get(0);
            if (pw_bro)
            {
                var window_doc = pw_bro.contentDocument;
                var panel_tree = Alph.$("#dependency-tree", treeDoc).get(0);
                var panel_error = Alph.$("#tree-error",treeDoc).html();
                var panel_hint = Alph.$("#tree-hint",treeDoc).html();
                Alph.$("#tree-error",window_doc).html(panel_error);
                Alph.$("#tree-hint",window_doc).html(panel_hint);
                Alph.$("#dependency-tree", window_doc).empty();
                Alph.$("link.alpheios-lang-css",window_doc).remove();
                Alph.$("head",window_doc).append(Alph.$("link.alpheios-lang-css",treeDoc).clone());
                Alph.$("#dependency-tree", window_doc)
                    .html(Alph.$(panel_tree).children().clone(true));
                Alph.$("#dependency-tree", window_doc)
                    .get(0).setAttribute("width",panel_tree.getAttribute("width"));
                Alph.$("#dependency-tree", window_doc)
                    .get(0).setAttribute("height",panel_tree.getAttribute("height"));

                // resize the panel window according to the dimensions of the svg diagram
                try
                {
                    var w = parseInt(panel_tree.getAttribute("width"));
                    var h = parseInt(panel_tree.getAttribute("height"));
                    this.resizePanelWindow(w,h);
                    Alph.Tree.scrollToFocus(window_doc);
                }
                catch(a_e)
                {
                    Alph.main.s_logger.error("Error parsing window size: " + a_e);
                }

                this.d_panelWindow.focus();
            }
         } catch(a_e)
         {
            // if the window opens but isn't fully loaded yet, we may get
            // an error trying to retrieve the browser document using the Alph.$ call
         }
    }
};

/**
 * Recursively position elements of (sub-)tree
 *
 * @param a_container SVG group containing tree
 * @param {int} a_fontSize size of font in pixels
 * @return size of tree, center line of root element, and width of root node
 * @type Array
 */
Alph.Tree.positionTree = function(a_container, a_fontSize)
{
    // get various pieces of tree
    // childNodes contains arc labels followed by subtrees
    var rectNode = a_container.children("rect");
    var textNode = a_container.children("text:first");
    var arcLineNodes = a_container.children("line");
    var childNodes = a_container.children("g");
    var numChildren = arcLineNodes.size();
    if (childNodes.size() != 2 * numChildren)
    {
        Alph.main.s_logger.error("Bad tree count: " + numChildren +
                      "/" + childNodes.size());
    }

    // calculate size of tree
    var textHeight = (5 * a_fontSize) / 4;
    var childSeparation = a_fontSize;
    var textWidth = textNode.get(0).getComputedTextLength();
    textWidth += (textWidth > 0) ? a_fontSize : 0;
    var childStart = Array();
    var childCenter = Array();
    var childReturn = Array();
    var size = Array(0, 0);
    childNodes.each(
    function(i)
    {
        // skip labels
        if (i < numChildren)
            return;

        // get size, center, and root width of child
        var thisReturn = Alph.Tree.positionTree(Alph.$(this), a_fontSize);
        var thisSize = thisReturn[0];
        childReturn.push(thisReturn);

        // adjust center for offset, save start of child
        childCenter.push(size[0] + thisReturn[1]);
        childStart.push(size[0]);

        // adjust total width and max height
        size[0] += thisSize[0] + childSeparation;
        if (thisSize[1] > size[1])
            size[1] = thisSize[1];
    });
    // remove separation at right end
    if (size[0] > 0)
        size[0] -= childSeparation;

    // tighten up spacing of subtrees with root only
    var adjust = 0;
    var treeEdge = 0;
    size[0] = 0;
    for (var i = 0; i < numChildren; ++i)
    {
        // adjust positions
        childStart[i] -= adjust;
        childCenter[i] -= adjust;

        // if this subtree has root node only
        // it's a candidate to tighten up
        var ic = i + numChildren;
        if (childNodes.eq(ic).children("g").size() == 0)
        {
            // can we move closer to preceding subtree?
            if ((i > 0) && (childNodes.eq(ic - 1).children("g").size() > 0))
            {
                // difference between right edge of preceding subtree and
                // right edge of preceding root
                var newAdjust =
                    (childStart[i - 1] + childReturn[i - 1][0][0]) -
                    (childCenter[i - 1] + childReturn[i - 1][2] / 2);
                if (newAdjust > 0)
                {
                    childStart[i] -= newAdjust;
                    childCenter[i] -= newAdjust;
                    adjust += newAdjust;
                }
            }
            // can we move closer to following subtree?
            if ((i + 1 < numChildren) &&
                (childNodes.eq(ic + 1).children("g").size() > 0))
            {
                // difference between left edge of following root and
                // left edge of following subtree
                var newAdjust = (childCenter[i+1] - childReturn[i+1][2] / 2) -
                                 childStart[i+1];
                if (newAdjust > 0)
                    adjust += newAdjust;

                // if following tree would overlap preceding
                // make sure we don't
                if (childStart[i + 1] - adjust < treeEdge)
                    adjust -= treeEdge - (childStart[i + 1] - adjust);
            }
        }

        // update total width
        var edge = childStart[i] + childReturn[i][0][0] + childSeparation;
        if (edge > size[0])
            size[0] = edge;
        if ((childNodes.eq(ic).children("g").size() > 0) && (edge > treeEdge))
            treeEdge = edge;
    }

    // position subtrees, arcs, and arc labels
    // center pt is midway between midpoints of first and last child
    // xExcess is amount needed to center if this label is wider than children
    var xCenter = 0;
    if (childCenter.length > 0)
        xCenter = (childCenter[0] + childCenter[childCenter.length - 1]) / 2;
    var xExcess = ((textWidth > size[0]) ? (textWidth - size[0]) : 0) / 2;
    xCenter += xExcess;
    var y1 = textHeight;
    var y2 = y1 + a_fontSize * 3;
    size[0] += 2 * xExcess;
    size[1] += y2;
    for (var i = 0; i < numChildren; ++i)
    {
        childNodes.get(i + numChildren).
            setAttribute(
                "transform",
                "translate(" + (xExcess + childStart[i]) + "," + y2 + ")");
        var arc = arcLineNodes.get(i);
        var x2 = xExcess + childCenter[i];
        arc.setAttribute("x1", xCenter);
        arc.setAttribute("y1", y1);
        arc.setAttribute("x2", x2);
        arc.setAttribute("y2", y2);
        var labelGroup = childNodes.eq(i);
        var label = labelGroup.children("text:first").get(0);
        var width = label.getComputedTextLength();
        var xl = (2 * x2 + xCenter)/3;
        if (x2 <= xCenter)
        {
            xl -= (x2 == xCenter) ? 2 : 1;
            label.setAttribute("text-anchor", "end");
        }
        else
        {
            xl += 1;
            label.setAttribute("text-anchor", "start");
            if (xl + width > size[0])
                size[0] = xl + width;
        }
        var yl = (y1 + 2 * y2) / 3;
        label.setAttribute("x", xl);
        label.setAttribute("y", yl);

        // set up help text for arc label
        var dyl = 3 * a_fontSize / 4;
        Alph.$('text', Alph.$(labelGroup)).each(
        function(i)
        {
            // skip first text child, which is arc label itself
            if (i > 0)
            {
                this.setAttribute("text-anchor", "start");
                this.setAttribute("x", (x2 <= xCenter) ? xl - width : xl);
                if (this.getAttribute("class") == "arc-label-help-up")
                    this.setAttribute("y", yl - dyl);
                else
                    this.setAttribute("y", yl + dyl);
            }
        });
    }

    // position text and rectangle
    textNode.each(
        function()
        {
            this.setAttribute("y", a_fontSize);
            this.setAttribute("x", xCenter);
        }
    );
    rectNode.each(
        function()
        {
            this.setAttribute("x", xCenter - textWidth / 2);
            this.setAttribute("y", 0);
            this.setAttribute("width", textWidth);
            this.setAttribute("height", textHeight);
        }
    )

    return Array(size, xCenter, textWidth);
};

/**
 * Position text words:
 *
 * The text words are placed underneath the tree itself, wrapping
 * at the width of the tree (except if the tree is narrow, wrapping
 * at 300 pixels).
 *
 * The height and width including the text are set as the values for
 * the parent svg element.
 *
 * @param a_doc the document
 * @param {int} a_width width of tree
 * @param {int} a_fontSize size of font in pixels
 * @return size of text
 * @type Array
 */
Alph.Tree.positionText = function(a_doc, a_width, a_fontSize)
{
    // if no words, just return empty size
    var words = Alph.$("#dependency-tree", a_doc).children("g").next().children("text");
    var rects = Alph.$("#dependency-tree", a_doc).children("g").next().children("rect");
    if (words.size() == 0)
        return Array(0, 0);

    // 300 = minimum width allowed for text to avoid excessive wrapping
    var width = (a_width > 300) ? a_width : 300;
    var textHeight = (5 * a_fontSize) / 4;
    var x = 0;
    var y = textHeight;

    // for each word
    for (var i = 0; i < words.size(); ++i)
    {
        var word = words.get(i);
        var rect = rects.get(i);

        // if word goes past end of line
        var wlen = word.getComputedTextLength();
        if (x + wlen > width)
        {
            // if not first word in line, wrap
            if (x > 0)
            {
                x = 0;
                y += textHeight;
            }
            // if first word, widen line
            else
            {
                width = x + wlen;
            }
        }

        // position word and bounding rectangle
        word.setAttribute("x", x);
        word.setAttribute("y", y);
        rect.setAttribute("x", x);
        rect.setAttribute("y", (y - a_fontSize));
        rect.setAttribute("width", wlen);
        rect.setAttribute("height", textHeight);

        // advance in line
        x += wlen;
    }

    return Array(width, y + textHeight - a_fontSize);
};

/**
 * Position key elements:
 *
 * The keys and definitions are each arranged vertically.
 * The definitions are placed to the right of the keys.
 *
 * @param a_doc the document
 * @param {int} a_fontSize size of font in pixels
 * @return size of key
 * @type Array
 */
Alph.Tree.positionKey = function(a_doc, a_fontSize)
{
    // find parts of key
    var keyGrp;
    var rects;
    var texts;
    var bound;
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        if (this.getAttribute("class") == "key")
        {
            keyGrp = thisNode.children("g");
            rects = thisNode.children("g").children("rect");
            texts = thisNode.children("g").children("text");
            bound = thisNode.children("rect");
        }
    });

    // find width of keys
    var width = 0;
    for (var i = 0; i < texts.size(); ++i)
    {
        var thisWidth = texts.get(i).getComputedTextLength();
        if (thisWidth > width)
            width = thisWidth;
    }

    // position entries
    width += 2 * a_fontSize;
    var y = 0;
    var textHeight = (5 * a_fontSize) / 4;
    for (var i = 0; i < texts.size(); ++i)
    {
        // position highlighting rectangle
        var thisRect = rects.get(i);
        thisRect.setAttribute("x", 0);
        thisRect.setAttribute("y", y);
        thisRect.setAttribute("width", width);
        thisRect.setAttribute("height", textHeight);

        // position text
        var thisText = texts.get(i);
        thisText.setAttribute("x", a_fontSize);
        thisText.setAttribute("y", y + a_fontSize);
        y += textHeight;
    }
    width += 2 * a_fontSize;
    y += 2 * a_fontSize;

    // position group and set bounding box
    keyGrp.each(
        function()
        {
            this.setAttribute("transform",
                "translate(" + a_fontSize + "," + a_fontSize + ")");
        }
    );

    bound.each(
        function()
        {
            this.setAttribute("x", 0);
            this.setAttribute("y", 0);
            this.setAttribute("width", width);
            this.setAttribute("height", y);

        }
    );

    return Array(width, y);
};

/**
 * Position pieces
 *
 * @param a_doc the document
 * @param {Array} a_treeSize width and height of tree
 * @param {Array} a_textSize width and height of text
 * @param {Array} a_keySize width and height of key
 * @param {int} a_fontSize size of font in pixels
 */
Alph.Tree.positionAll =
function(a_doc, a_treeSize, a_textSize, a_keySize, a_fontSize)
{
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        var thisClass = this.getAttribute("class");
        if (thisClass)
            thisClass = thisClass.split(' ')[0];
        var thisTransform = "";
        if (thisClass == "text")
        {
            // position text at top 
            thisTransform = "translate(0)";
        }
        else if (thisClass == "tree")
        {
            // position tree below text
            thisTransform =
                "translate(" + a_fontSize + "," + a_textSize[1] + ")";
        }
        else if (thisClass == "key")
        {
            // position key below tree, slightly indented
            thisTransform =
                "translate(" + a_fontSize + "," +
                               (a_textSize[1] +
                                a_treeSize[1]) + ")";
        }
        this.setAttribute("transform", thisTransform);
    });

    // set width and height
    var width = a_textSize[0];
    if (a_fontSize + a_treeSize[0] > width)
        width = a_fontSize + a_treeSize[0];
    if (a_fontSize + a_keySize[0] > width)
        width = a_fontSize + a_keySize[0];
    var height = a_textSize[1] + a_treeSize[1] + a_keySize[1];
    Alph.$("#dependency-tree", a_doc).get(0).setAttribute("width", width);
    Alph.$("#dependency-tree", a_doc).get(0).setAttribute("height", height);
};

/**
 * Highlight a word in the tree:
 *
 *  The word and its surrounding lines and nodes
 *  are left with normal coloring.  The remainder
 *  of the tree is grayed out.
 *
 *  If no id or a bad id is specified, the entire tree is
 *  ungrayed.
 *
 * @param a_doc the document
 * @param {String} a_id id of word in tree
 */
//
//  Note: jquery seems not to work well with selectors requiring
//  testing of attribute values.  Hence, the expressions below
//  are sometimes a bit contorted.  The assumption is made
//  that the text element of class "node-label" immediately precedes the
//  group element of class "arc-label", and that the top-level group of class
//  "tree" immediately precedes the group of class "text".
//
Alph.Tree.highlightWord = function(a_doc, a_id)
{
    // find node of interest
    var focusNode = Alph.$("#" + a_id, a_doc);

    // if no id or bad id
    if (focusNode.size() == 0)
    {
        Alph.$("#dependency-tree", a_doc).children("g").each(
        function()
        {
            var thisNode = Alph.$(this);
            if (this.getAttribute("class") != "key")
            {
                // display everything normally
                thisNode.find("text").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
                thisNode.find("line").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
                thisNode.find("rect").each(
                    function()
                    {
                        this.setAttribute("showme", "normal");
                    }
                );
            }
        });
        return;
    }

    focusNode.get(0).setAttribute("focus-node",true);
    // gray everything out in tree
    Alph.$("#dependency-tree", a_doc).children("g").each(
    function()
    {
        var thisNode = Alph.$(this);
        var thisClass = this.getAttribute("class");
        if (thisClass == "tree")
        {
            thisNode.find("text").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );
        }
        if (thisClass != "key")
        {
            thisNode.find("line").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );

            thisNode.find("rect").each(
                function()
                {
                    this.setAttribute("showme", "grayed");
                }
            );
        }
    });

    // display this node and things connected to it with focus:
    //   text node itself and label on line to dependent words
    //   rectangle around node
    //   lines to dependent words
    focusNode.children("g").children("text").each(
        function()
        {
            if (this.getAttribute("class") == "arc-label-text")
                this.setAttribute("showme", "focus-child");
        }
    );
    focusNode.children("text:first").each(
        function()
        {
            this.setAttribute("showme", "focus");
        }
    );
    focusNode.children("rect").each(
        function()
        {
            this.setAttribute("showme", "focus");
        }
    );
    focusNode.children("line").each(
        function()
        {
            this.setAttribute("showme", "focus-child");
        }
    );
    //   descendant words at all levels
    //   line to descendant words
    var descendants = focusNode.find("g");
    descendants.children("rect").each(
        function(){
            this.setAttribute("showme", "focus-descendant");
        }
    );
    descendants.children("line").each(
        function()
        {
            this.setAttribute("showme", "focus-descendant");
        }
    )
    descendants.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-descendant");
    });
    //   dependent words (immediate children)
    //   (do this after descendants since these are subset of descendants)
    var children = focusNode.children("g");
    children.children("rect").each(
        function()
        {
            this.setAttribute("showme", "focus-child");
        }
    );
    children.children("text").each(
    function()
    {
        if (this.getAttribute("class") == "node-label")
            this.setAttribute("showme", "focus-child");
    });
    //   label on parent word
    //   line and label from parent word
    if (focusNode.parent().get(0).getAttribute("class") == "tree-node")
    {
        focusNode.parent().children("text:first").get(0).
                           setAttribute("showme", "focus-parent");

        focusNode.parent().children("rect").each(
        function()
        {
            this.setAttribute("showme", "focus-parent");
        });
        focusNode.parent().children("line").each(
        function()
        {
            this.setAttribute("showme", "focus-parent");
        });
        focusNode.parent().children("g").children("text").each(
        function()
        {
            if (this.getAttribute("class") == "arc-label-text")
                this.setAttribute("showme", "focus-parent");
        });
    }

    // set highlights on text words
    Alph.Tree.highlightTextWord(a_doc, a_id, "focus");
    Alph.Tree.highlightTextWord(a_doc,
                                  focusNode.parent().get(0).getAttribute("id"),
                                  "focus-parent");
    descendants.each(
    function()
    {
        Alph.Tree.highlightTextWord(a_doc,
                                      this.getAttribute("id"),
                                      "focus-descendant");
    });
    children.each(
    function()
    {
        Alph.Tree.highlightTextWord(a_doc,
                                      this.getAttribute("id"),
                                      "focus-child");
    });
};

/**
 * Highlight a text word below the tree
 * @param a_doc the document
 * @param {String} a_id id of word (tbref attribute on text word)
 * @param {String} a_focus value to set showme attribute to
 */
Alph.Tree.highlightTextWord = function(a_doc, a_id, a_focus)
{
    // do nothing if no id specified
    if ((a_id == null) || (a_id.length == 0))
        return;

    Alph.$("rect", a_doc).each(
    function()
    {
        if (this.getAttribute('tbref') == a_id)
        {
            this.setAttribute("showme", a_focus);
        }
    });
};

/**
 * Highlight initial word in the tree
 *
 * @param a_doc the document
 * @param {Array} a_ids ids of words in tree
 */
Alph.Tree.highlightFirst = function(a_doc, a_ids)
{
    // for each id
    for (i in a_ids)
    {
        var id = a_ids[i];

        // find node of interest
        var focusNode = Alph.$("#" + id, a_doc);

        // if no id or bad id
        if (focusNode.size() == 0)
            return;

        // set attribute in tree
        focusNode.children("text:first").each(
            function() { this.setAttribute("first", "yes"); });
        focusNode.children("rect").each(
            function() { this.setAttribute("first", "yes"); });

        // set attribute in text
        Alph.$("rect", a_doc).each(
        function()
        {
            if (this.getAttribute('tbref') == id)
                this.setAttribute("first", "yes");
        });
    }
};

Alph.Tree.preOpenCheck = function()
{
    if (! Alph.Xlate.popupVisible() && ! Alph.Interactive.queryVisible())
    {
        var trigger = Alph.main.getXlateTrigger(Alph.main.getCurrentBrowser());
        var hint_prop = 'alph-tree-trigger-hint-'+ trigger;
        var lang_tool = Alph.main.getLanguageTool();
        var lang = lang_tool.getLanguageString();
        var hint = lang_tool.getStringOrDefault(hint_prop,[lang]);
        alert(hint);
        return false;
    }
    else
    {
        Alph.main.d_panels['alph-tree-panel'].open()
    }
};

/**
 * update the hint at the top of the tree diagram
 * @param {Panel} a_panel_obj the panel object
 * @param {Browser} a_bro the current browser
 * @param {Alph.LanguageTool} a_lang_tool the current language tool
 * @param {Boolean} a_update_window flag to indicate whether the panel window should be updated too 
 */
Alph.Tree.updateHint = function(a_panel_obj,a_bro,a_lang_tool,a_update_window)
{
    var treeDoc = Alph.$("browser",a_panel_obj.d_panelElem).get(0).contentDocument;
    var trigger = Alph.main.getXlateTrigger(a_bro);
    var mode = Alph.main.getStateObj(a_bro).getVar("level");
    var tree_hint = a_lang_tool.getStringOrDefault('alph-tree-hint',[]);
    var trigger_hint_prop = 'alph-trigger-hint-'+ trigger + '-'+mode;
    var lang = a_lang_tool.getLanguageString();
    var trigger_hint = a_lang_tool.getStringOrDefault(trigger_hint_prop,[lang]);
    Alph.$("#tree-hint",treeDoc).html(tree_hint + trigger_hint);
    if (a_update_window)
    {
        a_panel_obj.updatePanelWindow({},'alph-tree-body');
    }
}
    
    /**
     * Scroll a document so that focus node is visible
     * @param {Document} a_document the document containing the SVG diagram
     */
Alph.Tree.scrollToFocus= function(a_doc)
{
    var focus_node = Alph.$("g[focus-node]",a_doc).get(0);
    if (! focus_node)
    {
        return;
    }
    var top = 0;
    var left = 0;
    var width = 0;
    var height = 0;
    Alph.$(focus_node).parents("g").andSelf().each(
        function()
        {
            
            var transform = this.getAttribute("transform");
            if (transform)
            {
                var coords = transform.match(/translate\(([\d|\.]+),\s*([\d|\.]+)\)/);
                if (coords)
                {
                    try {
                        
                        left = left + parseInt(coords[1]);
                        top = top + parseInt(coords[2]);
                    }
                    catch (a_e)
                    {
                        Alph.main.s_logger.error("Invalid coordinates: " + a_e);
                    }
                }
            }
        }
    );
    Alph.$(focus_node).children().each(
        function()
        {
            try {
                var w = parseInt(this.getAttribute("width"));
                var h = parseInt(this.getAttribute("height"));
                if (w > width)
                {
                    width = w;
                }
                if (h > height)
                {
                    height = h;
                }
            }
            catch (a_e){}
        }
    );
    var move_x = 0;
    var move_y = 0;
    if (left < a_doc.defaultView.pageXOffset)
    {
        move_x = left - a_doc.defaultView.pageXOffset;
    }
    else if ((left + width) > 
             (a_doc.defaultView.pageXOffset + 
              a_doc.defaultView.innerWidth)
            )
    {
        move_x = (left + width) - 
             (a_doc.defaultView.pageXOffset + 
              a_doc.defaultView.innerWidth);
    }
    
    if (top < a_doc.defaultView.pageYOffset)
    {
        move_y = top - a_doc.defaultView.pageYOffset;
    } 
    else if ( (top >= a_doc.defaultView.pageYOffset) &&
              ((top + height) > 
               (a_doc.defaultView.pageYOffset +
                a_doc.defaultView.innerHeight)
              )
            )
    {
        move_y = 
            (top + height) - 
            (a_doc.defaultView.pageYOffset +
             a_doc.defaultView.innerHeight);
    }
    if (move_x != 0 || move_y != 0)
    {
        // we ought to be able to scroll by only the required amount to show the focus element
        // but the calculation appears to be off, and I'm not sure why. Scrolling directly
        // to the coordinates of the element does seem to bring it into focus fairly
        // reliably.
        a_doc.defaultView.scrollTo(left,top);
    }
};
