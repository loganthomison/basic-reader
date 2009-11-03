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
 
    return { d_forms: [], d_lemmas: [] };
}

WordList.prototype.addForm = function(a_window,a_word)
{
    this.observeSetter(a_window);
    this.d_dataObj.d_forms.push(a_word);
}

WordList.prototype.addLemma = function(a_window,a_lemma)
{
    this.observeSetter(a_window);
    this.d_dataObj.d_lemmas.push(a_lemma);
}

