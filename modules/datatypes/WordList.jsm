/**
 * @fileoverview This module contains the WordList data object 
 * Exports a single symbol, WordList which must be imported into the 
 * namespace of the importing class.
 *
 * @version $Id: alpheios-browser-utils.jsm 2138 2009-10-05 11:50:59Z BridgetAlmas $
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

const EXPORTED_SYMBOLS = ['WordList'];

Components.utils.import("resource://alpheios/alpheios-browser-utils.jsm");
Components.utils.import("resource://alpheios/datatypes/DataType.jsm");

/**
 * @class WordList
 * @extends DataType 
 */
WordList= function(a_file, a_charset)
{
    DataType.call(this,a_file,a_charset);
}

/**
 * @ignore
 */
WordList.prototype = new DataType();


/**
 * WordList datatype's file type extension
 * @static
 */
WordList.s_fileSpec = '.json';

/**
 * get the default data contents
 * @TODO replace this very naive implementation of wordlist type
 */
WordList.prototype.getDefault = function()
{
 
    var list = {
        d_forms: {},
        d_entries: {},
    };    
    return list;
}

/**
 * Update an entry for a lemma in the word list, adding it if it doesn't exist
 * @param {Window} a_window the parent window
 * @param {String} a_lang the language code for the lemma
 * @param {String} a_lemma the lemma 
 * @param {String} a_ptr the lexicon pointer                     
 * @param {Boolean} a_learned true if the form is to be flagged as learned otherwise false
 * @param {Boolean} a_force true to force the learned state to false, otherwise false to 
 *                          take lookup threshold into account                                                 
 * @returns the updated Entry
 * @type Object 
 */
WordList.prototype.updateLemmaEntry = function(a_window,a_lang,a_lemma,a_ptr,a_learned,a_force)
{   
    var entry = this.getEntry(a_lemma) || this.addEntry(a_lemma,a_lang);
    // check to see if we already have the lexicon pointer for
    // this lemma listed in the entry
    
    if (a_ptr) 
    {
        var has_ptr = false;
        for (var j=0; j< entry.lexicon_ptrs.length; j++)
        {
            if (entry.lexicon_ptrs[j] == a_ptr)
            {
                has_ptr = true;
            }
        }
        // lexicon pointer isn't in the entry, so add it
        if (! has_ptr)
        {
            entry.lexicon_ptrs.push(a_ptr);
        }
    }
    if (a_learned)
    {            
        entry.learned = true;            
    }        
    else if (a_force) 
    {
        entry.learned = false;
    }
                                                      
    if (a_force)
    {
        // notify any observers that the wordlist has changed
        this.observeSetter(a_window);
    }
    return entry;
}
/**
 * Update an entry for a form in the word list, adding it if it doesn't exist
 * @param {Window} a_window the parent window
 * @param {String} a_lang the language code for the form
 * @param {String} a_form the specific form 
 * @param {String} a_lemma the lemmas for the form
 * @param {String} a_lexicon_ptr the lexicon pointer for the lemma                     
 * @param {Boolean} a_learned true if the form is to be flagged as learned otherwise false
 * @param {Boolean} a_force true to force the learned state to false, otherwise false to 
 *                          take lookup threshold into account 
 */
WordList.prototype.updateFormEntry = function(a_window,a_lang,a_form,a_lemma,a_lexicon_ptr,a_learned,a_force)
{   
    var threshold = BrowserUtils.getPref("user.wordlist.lookup.threshold");
    var list = this.d_dataObj;  
        
    // make sure the form and lemma are in the list index
    this.updateIndexEntry(a_form,a_lemma,a_lang);
            
    var entry = this.updateLemmaEntry(a_window,a_lang,a_lemma,a_lexicon_ptr,false,false);
                            
    // add the form to the entry if it isn't already there        
    if (!entry.forms[a_form])
    {
        entry.forms[a_form] = {lookups: 0, learned: false};
    }
    if (a_learned)
    {            
        entry.forms[a_form].learned = true;
            
        // the form is learned, so reset the lookup counter
        entry.forms[a_form].lookups = 0;            
    }        
    else {
        if (! a_force) 
        {
            // the request is a lookup so increment the lookup counter
            entry.forms[a_form].lookups++;

            // make sure the lookup count is over the configured 
            // threshold before flagging as unlearned
            if (entry.forms[a_form].lookups > threshold)
            {
                entry.forms[a_form].learned = false;
            }
        }
        else
        {
            // the request is to remove the word from the list of
            // known words. don't increment the lookup counter,
            // but flag is unlearned
            entry.forms[a_form].learned = false;
        }
    }                                       
             
    // notify any observers that the wordlist has changed
    this.observeSetter(a_window);
};

/**
 * Gthe learned state of a specific form 
 * @param {String} a_form the form
 * @param {String} a_lemma the lemma if known, otherwise null
 * @returns the learned state (true or false) of the supplied form
 *          if the lemma was not supplied, and the form occurs in multiple lemmas
 *          then returns false if false for any of the lemmas
 * @type Boolean
 */
WordList.prototype.checkForm = function(a_form,a_lemma)
{
    var learned = false;
    var entries = [];
    if (a_lemma) 
    {
        var entry = this.getEntry(a_lemma);
        if (entry)
        {
            entries.push(entry);
        }
           
    }
    else
    {
        entries = this.getEntriesForForm(a_form);
    }
    for (var i=0; i<entries.length; i++)
    {
        if (entries[i].forms[a_form])
        {
            if (! entries[i].forms[a_form].learned)
            {
                learned = false;
                // if any entry has the form as unlearned, then 
                // that overiddes the state of the form in any other entries
                break;
            }
            else 
            {
                learned = true;
                // but continue to check the next entry
            }
        }        
        
    }
    BrowserUtils.debug("Checking for " + a_form + ": " + learned);
    return learned;
};

/**
 * Get the wordlist index entries for a form
 * @param {String} a_form the form
 * @returns the list of entries
 * @type Array
 */
WordList.prototype.getEntriesForForm = function(a_form)
{
  
    var list = [];
    var index = this.d_dataObj.d_forms[a_form];
    for (var key in index)
    {            
        var entry = this.getEntry(key);
        if (entry)
        {
            list.push(entry);
        }    
    }
    return list;

}

/**
 * Add or update an wordlist index entry for a form and lemma
 * @param {String} a_form the form
 * @param {String} a_lemma the lemma
 * @param {String} a_lang the language code 
 */
WordList.prototype.updateIndexEntry = function(a_form,a_lemma,a_lang)
{
    if (! this.d_dataObj.d_forms[a_form])
    {
        this.d_dataObj.d_forms[a_form] = {};
    }
    if (! this.d_dataObj.d_forms[a_form][a_lemma])
    {      
        this.d_dataObj.d_forms[a_form][a_lemma] = a_lang;
    }
}

/**
 * Get the wordlist entry for a lemma
 * @param {String} a_lemma the lemma
 * @returns the wordlist entry
 * @type Object
 */
WordList.prototype.getEntry = function(a_lemma)
{
    return this.d_dataObj.d_entries[a_lemma]; 
}

/**
 * add a new entry to the wordlist
 * @param {String} a_lemma the entry key (lemma)
 * @param {String} a_lang the language code
 * @returns the new entry object
 * @type Object
 */
WordList.prototype.addEntry = function(a_lemma,a_lang)
{
    var entry = 
    {
        learned: false,
        lang: a_lang,
        lookups: 0,
        lexicon_ptrs: [],
        forms: {}                
    }         
    this.d_dataObj.d_entries[a_lemma] = entry;
    return entry;
}

/**
 * get the wordlist as a TEI formated XML document  
 */
WordList.prototype.asXML = function(a_learned)
{
    // return a TEI-formated XML document for the wordlist
    var recent_win = BrowserUtils.getMostRecentWindow("navigator:browser");
        
    var template =         
        '<TEI xmlns="http://www.tei-c.org/ns/1.0"' +
        '    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
        '    xsi:schemaLocation="http://www.tei-c.org/ns/1.0 http://www.tei-c.org/release/xml/tei/custom/schema/xsd/tei_dictionaries.xsd">' +
        '<teiHeader><fileDesc>' + 
        '<titleStmt><title>Alpheios Word List</title></titleStmt>'  + 
        '<publicationStmt><date>' + (new Date()).toString() + '</date></publicationStmt>' + 
        '<sourceDesc><p>Alpheios</p></sourceDesc>' +
        '</fileDesc></teiHeader>' + 
        '<text><body></body></text></TEI>';
    var doc = (new recent_win.DOMParser()).parseFromString(template,"text/xml");
    var body = doc.getElementsByTagName("body")[0];
    for (var key in this.d_dataObj.d_entries)
    {       
        var entry = this.d_dataObj.d_entries[key];
        var entryNode = doc.createElementNS("http://www.tei-c.org/ns/1.0","entry");;
        var lemma = doc.createElementNS("http://www.tei-c.org/ns/1.0","form");
        lemma.setAttribute("type","lemma");
        lemma.setAttribute("lang",entry.lang);
        lemma.appendChild(doc.createTextNode(key));
        if (entry.learned)
        {
            lemma.setAttribute("rend","learned");
        }
        entryNode.appendChild(lemma);
        for (var form in entry.forms)
        {
            var formNode = doc.createElementNS("http://www.tei-c.org/ns/1.0","form");
            formNode.setAttribute("type","inflection");
            formNode.setAttribute("lang",entry.lang);
            if (entry.forms[form].learned)
            {
                formNode.setAttribute("rend","learned");
            }
            formNode.appendChild(doc.createTextNode(form));
            entryNode.appendChild(formNode);
        }
        for (var i=0; i<entry.lexicon_ptrs.length; i++)
        {            
            var ptr = doc.createElementNS("http://www.tei-c.org/ns/1.0","ptr");
            ptr.setAttribute("target",entry.lexicon_ptrs[i]);
            entryNode.appendChild(ptr);            
        }
        body.appendChild(entryNode)
    }
    return doc;
};