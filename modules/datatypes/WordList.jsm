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

//TODO these need to be configurable
const THRESHOLD_FORM = 5;
const THRESHOLD_LEMMA = 10;

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
 * static constant - known words index
 * @constant
 */
WordList.prototype.KNOWN = 'KNOWN';

/**
 * static constant - unknown words index
 * @constant
 */
WordList.prototype.UNKNOWN = 'UNKNOWN';

/**
 * get the default data contents
 * @TODO replace this very naive implementation of wordlist type
 */
WordList.prototype.getDefault = function()
{
 
    var list = { };
    list[this.UNKNOWN] = { d_forms: {}, d_lemmas: {} };
    list[this.KNOWN] = { d_forms: {}, d_lemmas: {} };
    return list;
}


/**
 * Add a new word to the word list
 * @param {Window} a_window the parent window
 * @param {String} a_word the word 
 * @param {Array} a_lemmas list of possible lemmas for the word
 * @param {String} a_list the sublist to add it to ({@link WordList.KNOWN} or {@link WordList.UNKNOWN})
 * @return true if the word is added to the list, otherwise false
 *         (returns false if the word is already on the list)
 * @type Boolean        
 */
WordList.prototype.addWord = function(a_window,a_word,a_lemmas,a_list)
{
    var known = this.KNOWN;
    var unknown = this.UNKNOWN;
    
    this.observeSetter(a_window);
    var list = this.d_dataObj[a_list];
    var added = false;
    if (! list.d_forms[a_word])
    {
        list.d_forms[a_word]= { lookups: 0,
                                lemmas: {},
                                contexts: [] 
                              };
        added = true;
    }
    var lookups = list.d_forms[a_word].lookups++;
    if (a_list == unknown && lookups >= THRESHOLD_FORM && this.d_dataObj[known].d_forms[a_word])
    {
        delete this.d_dataObj[known].d_forms[a_word];
    }
    else if (a_list == known && this.d_dataObj[unknown].d_forms[a_word])
    {
        delete this.d_dataObj[unknown].d_forms[a_word];
    }
    
    for (var i=0; i<a_lemmas.length; i++)
    {
        var a_lemma = a_lemmas[i];
        var lemma_lookups = list.d_lemmas[a_lemma]++;
        list.d_forms[a_word].lemmas[a_lemma]++;
        if (a_list == unknown && lemma_lookups >= THRESHOLD_LEMMA 
            && this.d_dataObj[known].d_lemmas[a_lemma]) 
        {
            delete this.d_dataObj[known].d_lemmas[a_lemma];
        }
        else if (a_list == known && this.d_dataObj[unknown].d_lemmas[a_lemma])
        {
            delete this.d_dataObj[unknown].d_lemmas[a_lemma];
        }
   }        
   return added;
};

/**
 * Check one of the sublists in the WordList Data object for 
 * the supplied word
 * @param {String} the sublist id
 * @param {String} a_word the word to check for
 * @returns true if the word is in the list, otherwise false
 * @type Boolean
 */
WordList.prototype.hasForm = function(a_list,a_word)
{
    var has_form = this.d_dataObj[a_list].d_forms[a_word];
    return (has_form ? true : false);
};

