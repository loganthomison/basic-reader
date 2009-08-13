/**
 * @fileoverview This file contains the Alph.Util class with the 
 * Alpheios utility functions which are not specific to the Mozilla framework
 *
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

// initialize the namespace
if (typeof Alph == "undefined") {
    Alph = {};
}

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm",Alph);
Components.utils.import("resource://alpheios/alpheios-convert.jsm",Alph);
Components.utils.import("resource://alpheios/alpheios-datafile.jsm",Alph);

// load the jQuery library in the scope of the Alph object
// and call jQuery.noConflict(extreme) to revert control of the
// $ and jQuery to whichever library first implemented it (to
// avoid stepping on the toes of any other extensions).
// See http://docs.jquery.com/Core/jQuery.noConflict#extreme
// Note, we may run into problems if we want to use any jQuery plugins,
// in which case it might be sufficient to skip the extreme flag
Alph.BrowserUtils.loadJavascript("chrome://alpheios/content/jquery-1.2.6-alph.js",Alph);
Alph.$ = jQuery.noConflict(true);    

/**
 * Alph.Util contains the Alpheios utility functions
 * @singleton
 */
Alph.Util = {

    ALPHEIOS_URLS:
    {
        main: 'http://alpheios.net',
        help:  'http://alpheios.net/content/release-notes',
        support: 'mailto:support@alpheios.net',
        content: 'http://alpheios.net/content/',
    },
    XUL_NS: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        
    makeXUL: function(a_tag,a_id,a_keys,a_values)
    {
        var xul = document.createElementNS(this.XUL_NS,a_tag);
        xul.setAttribute('id',a_id);
        a_keys.forEach(
            function(a_key,a_i)
            {
                xul.setAttribute(a_key,a_values[a_i]);        
            }
        );
        return xul;
    },
    
    makePref: function(a_id,a_name,a_type)
    {
        return this.makeXUL(
            'preference',a_id,['name','type'],[a_name,a_type]);  
    },
    
    
    /**
     * Open a link to the alpheios site
     * @param {Window} a_window the parent window from which to launch the link
     * @param {String} a_loc site location
     */
    openAlpheiosLink: function(a_window,a_loc)
    {
        var url = this.ALPHEIOS_URLS[a_loc];
        // if we don't have a specific location defined,
        // then default to adding the location to the 
        // main content url
        if (typeof url != 'string')
        {
            url = this.ALPHEIOS_URLS.content + a_loc; 
        }
        Alph.BrowserUtils.openNewTab(a_window,url);
    },
    
    /**
     * launch the user's email application and prepare feedback email headers
     */
    sendFeedback: function()
    {
        Alph.BrowserUtils.sendFeedback(window,Alph.Util.ALPHEIOS_URLS.support);
    },
    
    /**
     * Scroll a document so that supplied element is visible
     * if the element is above the fold, the document will scroll just until
     * it is in view at the top, and if the element is below the fold,
     * the document will scroll just until it is in view at the bottom
     * @param {Element} a_el the element which should be in view
     */
    scrollToElement: function(a_el)
    {
        var top = a_el.offsetTop;
        var left = a_el.offsetLeft;
        var width = a_el.offsetWidth;
        var height = a_el.offsetHeight;

        while(a_el.offsetParent) {
            a_el = a_el.offsetParent;
            top += a_el.offsetTop;
            left += a_el.offsetLeft;
        }

        var move_x = 0;
        var move_y = 0;
        if (left < a_el.ownerDocument.defaultView.pageXOffset)
        {
            move_x = left - a_el.ownerDocument.defaultView.pageXOffset;
        }
        else if ((left + width) > 
                 (a_el.ownerDocument.defaultView.pageXOffset + 
                  a_el.ownerDocument.defaultView.innerWidth)
                )
        {
            move_x = (left + width) - 
                 (a_el.ownerDocument.defaultView.pageXOffset + 
                  a_el.ownerDocument.defaultView.innerWidth);
        }
        
        if (top < a_el.ownerDocument.defaultView.pageYOffset)
        {
            move_y = top - a_el.ownerDocument.defaultView.pageYOffset;
        } 
        else if ( (top >= a_el.ownerDocument.defaultView.pageYOffset) &&
                  ((top + height) > 
                   (a_el.ownerDocument.defaultView.pageYOffset +
                    a_el.ownerDocument.defaultView.innerHeight)
                  )
                )
        {
            move_y = 
                (top + height) - 
                (a_el.ownerDocument.defaultView.pageYOffset +
                 a_el.ownerDocument.defaultView.innerHeight);
        }
        if (move_x != 0 || move_y != 0)
        {
            a_el.ownerDocument.defaultView.scrollBy(move_x,move_y);
        }
    },
    
    /** 
     * check to see if the supplied element is in view
     * @param {Element} a_el the element
     * @return true if in view, otherwise false
     * @type Boolean
     */
    inViewPort: function(a_el) {
        var top = a_el.offsetTop;
        var left = a_el.offsetLeft;
        var width = a_el.offsetWidth;
        var height = a_el.offsetHeight;

        while(a_el.offsetParent) {
            a_el = a_el.offsetParent;
            top += a_el.offsetTop;
            left += a_el.offsetLeft;
        }

        return (
            top >= a_el.ownerDocument.defaultView.pageYOffset &&
            left >= a_el.ownerDocument.defaultView.pageXOffset &&
            (top + height) <= (a_el.ownerDocument.defaultView.pageYOffset + 
                a_el.ownerDocument.defaultView.innerHeight) &&
            (left + width) <= (a_el.ownerDocument.defaultView.pageXOffset + 
                a_el.ownerDocument.defaultView.innerWidth)
        );
    },
    
    /**
     * check to see if the supplied element is 'below the fold'
     * of the viewport 
     * @param {Element} a_el the element
     * @return the # of pixels out of view
     * @type Boolean
     */
    belowTheFold: function(a_el) {
        var top = a_el.offsetTop;
        var height = a_el.offsetHeight;

        while(a_el.offsetParent) {
            a_el = a_el.offsetParent;
            top += a_el.offsetTop;
        }

        return(
            (top + height) - (a_el.ownerDocument.defaultView.pageYOffset + 
                a_el.ownerDocument.defaultView.innerHeight));
    },
    
    /**
     * check to see if the supplied element is 'right of screen'
     * of the viewport 
     * @param {Element} a_el the element
     * @return the # of pixels out of view
     * @type int
     */
    rightOfScreen: function(a_el) {
        var left = a_el.offsetLeft;
        var width = a_el.offsetWidth;

        while(a_el.offsetParent) {
            a_el = a_el.offsetParent;
            left += a_el.offsetLeft;
        }

        return(
            (left + width) - (a_el.ownerDocument.defaultView.pageXOffset + 
                a_el.ownerDocument.defaultView.innerWidth));
    },
    
    /**
     * Check to see if a url is a local url
     * @param {String} a_url the url string
     * @return true if its a localhost or chrome url otherwise false
     * @type Boolean
     */
    isLocalUrl: function(a_url)
    {
        return (
            a_url.match(/^http:\/\/(localhost|127\.0\.0\.1)/) || 
            a_url.match(/^chrome:/));
    },
    
    /**
     * get xslt processor
     * @param {String} a_ext_name the name of the extension
     * @param {String} a_filename the name of the xslt file to import
     * @return a new XSLTProcessor object with the named stylesheet imported from the xslt directory of the extension 
     * @type XSLTProcessor
     */
     getXsltProcessor: function(a_ext,a_filename)
    {
        var xsltProcessor = new XSLTProcessor();
        
        // first try to load and import using a chrome url
        try
        {
            var chrome_url = 'chrome://'+ a_ext + '/content/xslt/' + a_filename;
            var xmlDoc = document.implementation.createDocument("", "", null);
            xmlDoc.async = false;
            Alph.BrowserUtils.debug("Loading xslt at " + chrome_url);
            xmlDoc.load(chrome_url);
            xsltProcessor.importStylesheet(xmlDoc);
        }
        catch(a_e)
        {
          // if that fails, try loading directly from the filesystem using XMLHttpRequest   
          // see https://bugzilla.mozilla.org/show_bug.cgi?id=422502
            try
            {
                var pkg_path = Alph.BrowserUtils.getExtensionBasePath(a_ext);
                pkg_path.append('xslt');
                pkg_path.append(a_filename);
                var path_url = 'file:///' + pkg_path.path;
                Alph.BrowserUtils.debug("XHR Loading xslt at " + path_url);
                var p = new XMLHttpRequest();      
                p.open("GET", path_url, false);
                p.send(null);
                xsltProcessor.importStylesheet(p.responseXML);
            }
            catch(a_ee)
            {
                // if that fails, we're out of luck
                Alph.BrowserUtils.debug("Unable to load stylesheet " + a_filename + " in " + a_ext + " : " + a_e + "," + a_ee);
            }
        }
        return xsltProcessor;
    }
};
